import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export enum LogCategory {
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  STORAGE = 'STORAGE',
  CACHE = 'CACHE',
  NETWORK = 'NETWORK',
  PERFORMANCE = 'PERFORMANCE',
  PRAYER_TIMES = 'PRAYER_TIMES',
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  operation: string;
  message: string;
  data?: any;
  error?: any;
  duration?: number;
  metadata?: {
    userId?: string;
    deviceId?: string;
    platform?: string;
    version?: string;
    [key: string]: any;
  };
}

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: any;
}

class FirebaseLogger {
  private static instance: FirebaseLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private isEnabled = true;
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private listeners: Set<(log: LogEntry) => void> = new Set();

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): FirebaseLogger {
    if (!FirebaseLogger.instance) {
      FirebaseLogger.instance = new FirebaseLogger();
    }
    return FirebaseLogger.instance;
  }

  private async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('firebase_logger_settings');
      if (settings) {
        const { logLevel, isEnabled } = JSON.parse(settings);
        this.logLevel = logLevel ?? LogLevel.DEBUG;
        this.isEnabled = isEnabled ?? true;
      }
    } catch (error) {
      console.error('Error loading logger settings:', error);
    }
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem(
        'firebase_logger_settings',
        JSON.stringify({
          logLevel: this.logLevel,
          isEnabled: this.isEnabled,
        })
      );
    } catch (error) {
      console.error('Error saving logger settings:', error);
    }
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
    this.saveSettings();
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.saveSettings();
  }

  private shouldLog(level: LogLevel): boolean {
    return this.isEnabled && level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    operation: string,
    message: string,
    data?: any,
    error?: any,
    duration?: number
  ): LogEntry {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      operation,
      message,
      data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...error,
      } : undefined,
      duration,
      metadata: {
        platform: Platform.OS,
        version: String(Platform.Version),
      },
    };
  }

  private log(
    level: LogLevel,
    category: LogCategory,
    operation: string,
    message: string,
    data?: any,
    error?: any,
    duration?: number
  ) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.createLogEntry(
      level,
      category,
      operation,
      message,
      data,
      error,
      duration
    );

    // Add to logs array
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with color coding
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.CRITICAL]: '\x1b[35m', // Magenta
    };

    const resetColor = '\x1b[0m';
    const color = colors[level];
    const levelName = LogLevel[level];

    console.log(
      `${color}[${levelName}]${resetColor} [${category}] ${operation}: ${message}`,
      data || '',
      error || ''
    );

    // Notify listeners
    this.listeners.forEach(listener => listener(logEntry));

    // Store critical errors
    if (level >= LogLevel.ERROR) {
      this.storeError(logEntry);
    }
  }

  private async storeError(logEntry: LogEntry) {
    try {
      const errors = await AsyncStorage.getItem('firebase_logger_errors');
      const errorList = errors ? JSON.parse(errors) : [];
      errorList.push(logEntry);
      
      // Keep only last 100 errors
      if (errorList.length > 100) {
        errorList.shift();
      }
      
      await AsyncStorage.setItem('firebase_logger_errors', JSON.stringify(errorList));
    } catch (error) {
      console.error('Error storing error log:', error);
    }
  }

  // Public logging methods
  debug(category: LogCategory, operation: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, category, operation, message, data);
  }

  info(category: LogCategory, operation: string, message: string, data?: any) {
    this.log(LogLevel.INFO, category, operation, message, data);
  }

  warn(category: LogCategory, operation: string, message: string, data?: any) {
    this.log(LogLevel.WARN, category, operation, message, data);
  }

  error(category: LogCategory, operation: string, message: string, error?: any, data?: any) {
    this.log(LogLevel.ERROR, category, operation, message, data, error);
  }

  critical(category: LogCategory, operation: string, message: string, error?: any, data?: any) {
    this.log(LogLevel.CRITICAL, category, operation, message, data, error);
  }

  // Performance tracking
  startPerformanceTracking(operation: string, metadata?: any): string {
    const id = `${operation}-${Date.now()}`;
    this.performanceMetrics.set(id, {
      operation,
      startTime: Date.now(),
      success: false,
      metadata,
    });
    return id;
  }

  endPerformanceTracking(id: string, success: boolean = true, metadata?: any) {
    const metric = this.performanceMetrics.get(id);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.metadata = { ...metric.metadata, ...metadata };

      this.log(
        LogLevel.INFO,
        LogCategory.PERFORMANCE,
        metric.operation,
        `Operation completed in ${metric.duration}ms`,
        metric
      );

      this.performanceMetrics.delete(id);
    }
  }

  // Log management
  getLogs(filter?: {
    level?: LogLevel;
    category?: LogCategory;
    startDate?: Date;
    endDate?: Date;
    operation?: string;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(
          log => new Date(log.timestamp) >= filter.startDate!
        );
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(
          log => new Date(log.timestamp) <= filter.endDate!
        );
      }
      if (filter.operation) {
        filteredLogs = filteredLogs.filter(log =>
          log.operation.toLowerCase().includes(filter.operation!.toLowerCase())
        );
      }
    }

    return filteredLogs;
  }

  async getStoredErrors(): Promise<LogEntry[]> {
    try {
      const errors = await AsyncStorage.getItem('firebase_logger_errors');
      return errors ? JSON.parse(errors) : [];
    } catch (error) {
      console.error('Error getting stored errors:', error);
      return [];
    }
  }

  clearLogs() {
    this.logs = [];
  }

  async clearStoredErrors() {
    try {
      await AsyncStorage.removeItem('firebase_logger_errors');
    } catch (error) {
      console.error('Error clearing stored errors:', error);
    }
  }

  // Export logs
  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = [
        'ID',
        'Timestamp',
        'Level',
        'Category',
        'Operation',
        'Message',
        'Duration',
        'Error',
        'Data',
      ];
      
      const rows = logs.map(log => [
        log.id,
        log.timestamp,
        LogLevel[log.level],
        log.category,
        log.operation,
        log.message,
        log.duration || '',
        log.error ? JSON.stringify(log.error) : '',
        log.data ? JSON.stringify(log.data) : '',
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      return csv;
    }
  }

  // Real-time log monitoring
  subscribe(callback: (log: LogEntry) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Summary statistics
  getLogSummary() {
    const summary = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      errors: 0,
      warnings: 0,
      recentErrors: [] as LogEntry[],
    };

    this.logs.forEach(log => {
      // Count by level
      const levelName = LogLevel[log.level];
      summary.byLevel[levelName] = (summary.byLevel[levelName] || 0) + 1;

      // Count by category
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;

      // Count errors and warnings
      if (log.level >= LogLevel.ERROR) {
        summary.errors++;
        if (summary.recentErrors.length < 10) {
          summary.recentErrors.push(log);
        }
      } else if (log.level === LogLevel.WARN) {
        summary.warnings++;
      }
    });

    return summary;
  }
}

// Export singleton instance
export const firebaseLogger = FirebaseLogger.getInstance();

// Helper function for easy logging
export function logFirebaseOperation(
  category: LogCategory,
  operation: string,
  fn: () => Promise<any>
): Promise<any> {
  const perfId = firebaseLogger.startPerformanceTracking(operation);
  
  firebaseLogger.debug(category, operation, 'Starting operation');
  
  return fn()
    .then(result => {
      firebaseLogger.endPerformanceTracking(perfId, true);
      firebaseLogger.info(category, operation, 'Operation completed successfully', result);
      return result;
    })
    .catch(error => {
      firebaseLogger.endPerformanceTracking(perfId, false, { error: error.message });
      firebaseLogger.error(category, operation, 'Operation failed', error);
      throw error;
    });
}