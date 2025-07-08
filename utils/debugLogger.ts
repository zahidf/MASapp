/**
 * Enhanced Debug Logger for Production Debugging
 * Stores logs in memory and AsyncStorage for debugging Apple Sign-In and other issues
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
  deviceInfo?: {
    platform: string;
    osVersion: string;
    appVersion?: string;
  };
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Keep last 500 logs in memory
  private readonly LOG_STORAGE_KEY = '@debug_logs';
  private readonly SESSION_ID = Date.now().toString();
  private isEnabled = true; // Always enabled for debugging

  private constructor() {
    this.loadStoredLogs();
    this.log('INFO', 'SYSTEM', 'Debug Logger initialized', {
      sessionId: this.SESSION_ID,
      platform: Platform.OS,
      osVersion: Platform.Version,
    });
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private async loadStoredLogs() {
    try {
      const storedLogs = await AsyncStorage.getItem(this.LOG_STORAGE_KEY);
      if (storedLogs) {
        const parsed = JSON.parse(storedLogs);
        // Keep only logs from last 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.logs = parsed.filter((log: LogEntry) => 
          new Date(log.timestamp).getTime() > oneDayAgo
        );
      }
    } catch (error) {
      console.error('Failed to load stored logs:', error);
    }
  }

  private async persistLogs() {
    try {
      // Keep only recent logs to avoid storage bloat
      const recentLogs = this.logs.slice(-this.maxLogs);
      await AsyncStorage.setItem(this.LOG_STORAGE_KEY, JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  private getDeviceInfo() {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version?.toString() || 'Unknown',
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    };
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private createLogEntry(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      id: `${this.SESSION_ID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      deviceInfo: this.getDeviceInfo(),
    };

    if (data !== undefined) {
      try {
        // Sanitize sensitive data
        entry.data = this.sanitizeData(data);
      } catch (e) {
        entry.data = { error: 'Failed to serialize data', type: typeof data };
      }
    }

    if (error) {
      entry.stackTrace = error.stack || error.toString();
    }

    return entry;
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) return data;
    
    // Deep clone to avoid modifying original
    const cloned = JSON.parse(JSON.stringify(data));
    
    // Sanitize sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    
    const sanitize = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    };
    
    sanitize(cloned);
    return cloned;
  }

  log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    error?: Error
  ) {
    if (!this.isEnabled) return;

    const entry = this.createLogEntry(level, category, message, data, error);
    
    // Add to in-memory logs
    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in development
    if (__DEV__) {
      const consoleMessage = `[${entry.level}] [${category}] ${message}`;
      switch (level) {
        case 'ERROR':
        case 'CRITICAL':
          console.error(consoleMessage, data, error);
          break;
        case 'WARN':
          console.warn(consoleMessage, data);
          break;
        default:
          console.log(consoleMessage, data);
      }
    }

    // Persist critical logs immediately
    if (level === 'CRITICAL' || level === 'ERROR') {
      this.persistLogs();
    }
  }

  debug(category: string, message: string, data?: any) {
    this.log('DEBUG', category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.log('INFO', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('WARN', category, message, data);
  }

  error(category: string, message: string, error?: Error | any, data?: any) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log('ERROR', category, message, data, errorObj);
  }

  critical(category: string, message: string, error?: Error | any, data?: any) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log('CRITICAL', category, message, data, errorObj);
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs by category
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  // Get logs by level
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Get recent logs
  getRecentLogs(minutes: number = 5): LogEntry[] {
    const since = Date.now() - (minutes * 60 * 1000);
    return this.logs.filter(log => 
      new Date(log.timestamp).getTime() > since
    );
  }

  // Search logs
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.category.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
    );
  }

  // Clear all logs
  async clearLogs() {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(this.LOG_STORAGE_KEY);
      this.log('INFO', 'SYSTEM', 'Logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  // Export logs as formatted string
  exportLogs(format: 'json' | 'text' = 'text'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    return this.logs.map(log => {
      const lines = [
        `[${log.timestamp}] [${log.level}] [${log.category}]`,
        `Message: ${log.message}`,
      ];
      
      if (log.data) {
        lines.push(`Data: ${JSON.stringify(log.data, null, 2)}`);
      }
      
      if (log.stackTrace) {
        lines.push(`Stack: ${log.stackTrace}`);
      }
      
      lines.push('---');
      return lines.join('\n');
    }).join('\n\n');
  }

  // Get logs summary
  getLogsSummary() {
    const summary = {
      total: this.logs.length,
      byLevel: {} as Record<LogEntry['level'], number>,
      byCategory: {} as Record<string, number>,
      errors: this.logs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL'),
      sessionId: this.SESSION_ID,
    };

    // Count by level
    this.logs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
    });

    return summary;
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Convenience exports
export const logDebug = (category: string, message: string, data?: any) => 
  debugLogger.debug(category, message, data);

export const logInfo = (category: string, message: string, data?: any) => 
  debugLogger.info(category, message, data);

export const logWarn = (category: string, message: string, data?: any) => 
  debugLogger.warn(category, message, data);

export const logError = (category: string, message: string, error?: any, data?: any) => 
  debugLogger.error(category, message, error, data);

export const logCritical = (category: string, message: string, error?: any, data?: any) => 
  debugLogger.critical(category, message, error, data);