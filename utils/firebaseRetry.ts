/**
 * Firebase retry utility for production-grade error handling
 */

import { firebaseLogger, LogCategory } from './firebaseLogger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'auth/network-request-failed',
    'auth/timeout',
    'auth/internal-error',
    'database/disconnected',
    'database/network-error',
    'database/timeout',
    'storage/retry-limit-exceeded',
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
  ],
  onRetry: () => {},
};

/**
 * Determines if an error is retryable based on error code
 */
export const isRetryableError = (error: any, retryableErrors: string[]): boolean => {
  if (!error) return false;
  
  const errorCode = error.code || error.message || '';
  const errorString = errorCode.toLowerCase();
  
  return retryableErrors.some(retryableError => 
    errorString.includes(retryableError.toLowerCase())
  );
};

/**
 * Calculate delay for exponential backoff
 */
const calculateDelay = (
  attempt: number, 
  initialDelay: number, 
  maxDelay: number, 
  multiplier: number
): number => {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
  return Math.min(delay + jitter, maxDelay);
};

/**
 * Retry a Firebase operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      firebaseLogger.debug(
        LogCategory.NETWORK,
        'retryWithBackoff',
        `Attempting ${operationName} (attempt ${attempt}/${config.maxRetries})`
      );

      const result = await operation();
      
      if (attempt > 1) {
        firebaseLogger.info(
          LogCategory.NETWORK,
          'retryWithBackoff',
          `${operationName} succeeded after ${attempt} attempts`
        );
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      firebaseLogger.warn(
        LogCategory.NETWORK,
        'retryWithBackoff',
        `${operationName} failed (attempt ${attempt}/${config.maxRetries})`,
        error
      );

      // Check if we should retry
      if (attempt === config.maxRetries || !isRetryableError(error, config.retryableErrors)) {
        break;
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      firebaseLogger.debug(
        LogCategory.NETWORK,
        'retryWithBackoff',
        `Retrying ${operationName} after ${Math.round(delay)}ms`
      );

      // Call onRetry callback
      config.onRetry(error, attempt);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  firebaseLogger.error(
    LogCategory.NETWORK,
    'retryWithBackoff',
    `${operationName} failed after ${config.maxRetries} attempts`,
    lastError
  );

  throw lastError;
}

/**
 * Wrapper for Firebase operations that require authentication
 */
export async function retryWithAuth<T>(
  operation: () => Promise<T>,
  operationName: string,
  auth: any,
  options: RetryOptions = {}
): Promise<T> {
  const enhancedOptions = {
    ...options,
    retryableErrors: [
      ...(options.retryableErrors || DEFAULT_OPTIONS.retryableErrors),
      'auth/user-token-expired',
      'auth/invalid-user-token',
    ],
  };

  return retryWithBackoff(async () => {
    // Check if we need to refresh the token
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(true);
      } catch (tokenError) {
        firebaseLogger.warn(
          LogCategory.AUTH,
          'retryWithAuth',
          'Failed to refresh token',
          tokenError
        );
      }
    }

    return operation();
  }, operationName, enhancedOptions);
}

/**
 * Circuit breaker pattern for Firebase operations
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly halfOpenRequests: number = 3
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        throw new Error(`Circuit breaker is open for ${operationName}`);
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
        firebaseLogger.error(
          LogCategory.NETWORK,
          'CircuitBreaker',
          `Circuit breaker opened for ${operationName} after ${this.failures} failures`
        );
      }
      
      throw error;
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}