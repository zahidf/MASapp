import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { debugLogger, LogEntry } from '@/utils/debugLogger';

interface DebugLogViewerProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugLogViewer({ visible, onClose }: DebugLogViewerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogEntry['level'] | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadLogs();
    }
  }, [visible]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, selectedLevel, selectedCategory]);

  const loadLogs = () => {
    const allLogs = debugLogger.getLogs();
    setLogs(allLogs);
    
    // Extract unique categories
    const uniqueCategories = Array.from(new Set(allLogs.map(log => log.category)));
    setCategories(uniqueCategories);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadLogs();
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const filterLogs = () => {
    let filtered = [...logs];
    
    // Filter by level
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }
    
    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = debugLogger.searchLogs(searchQuery);
    }
    
    setFilteredLogs(filtered);
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyLog = async (log: LogEntry) => {
    const logText = formatLogForCopy(log);
    await Clipboard.setStringAsync(logText);
    Alert.alert('Copied', 'Log entry copied to clipboard');
  };

  const copyAllLogs = async () => {
    const allLogsText = debugLogger.exportLogs('text');
    await Clipboard.setStringAsync(allLogsText);
    Alert.alert('Copied', 'All logs copied to clipboard');
  };

  const shareLogs = async () => {
    try {
      const logsText = debugLogger.exportLogs('text');
      const summary = debugLogger.getLogsSummary();
      
      const shareContent = `Debug Logs - ${new Date().toISOString()}\n\n` +
        `Summary:\n` +
        `Total Logs: ${summary.total}\n` +
        `Errors: ${summary.errors.length}\n` +
        `Session ID: ${summary.sessionId}\n\n` +
        `--- LOGS ---\n\n${logsText}`;
      
      await Share.share({
        message: shareContent,
        title: 'MASapp Debug Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share logs');
    }
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await debugLogger.clearLogs();
            loadLogs();
          },
        },
      ]
    );
  };

  const formatLogForCopy = (log: LogEntry): string => {
    const lines = [
      `[${log.timestamp}]`,
      `Level: ${log.level}`,
      `Category: ${log.category}`,
      `Message: ${log.message}`,
    ];
    
    if (log.data) {
      lines.push(`Data: ${JSON.stringify(log.data, null, 2)}`);
    }
    
    if (log.stackTrace) {
      lines.push(`Stack Trace:\n${log.stackTrace}`);
    }
    
    return lines.join('\n');
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'DEBUG': return '#9E9E9E';
      case 'INFO': return '#2196F3';
      case 'WARN': return '#FF9800';
      case 'ERROR': return '#F44336';
      case 'CRITICAL': return '#D32F2F';
      default: return colors.text;
    }
  };

  const renderLogEntry = (log: LogEntry) => {
    const isExpanded = expandedLogs.has(log.id);
    const levelColor = getLevelColor(log.level);
    
    return (
      <TouchableOpacity
        key={log.id}
        style={[styles.logEntry, { backgroundColor: colors.surface }]}
        onPress={() => toggleLogExpansion(log.id)}
        onLongPress={() => copyLog(log)}
      >
        <View style={styles.logHeader}>
          <View style={styles.logMeta}>
            <Text style={[styles.logLevel, { color: levelColor }]}>
              {log.level}
            </Text>
            <Text style={[styles.logCategory, { color: colors.primary }]}>
              {log.category}
            </Text>
            <Text style={[styles.logTime, { color: `${colors.text}80` }]}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </Text>
          </View>
          <IconSymbol
            name={isExpanded ? 'chevron.up' : 'chevron.down'}
            size={16}
            color={`${colors.text}60`}
          />
        </View>
        
        <Text style={[styles.logMessage, { color: colors.text }]}>
          {log.message}
        </Text>
        
        {isExpanded && (
          <View style={styles.logDetails}>
            {log.data && (
              <View style={styles.logDataContainer}>
                <Text style={[styles.logDataLabel, { color: `${colors.text}80` }]}>
                  Data:
                </Text>
                <Text style={[styles.logData, { color: `${colors.text}90` }]}>
                  {JSON.stringify(log.data, null, 2)}
                </Text>
              </View>
            )}
            
            {log.stackTrace && (
              <View style={styles.logDataContainer}>
                <Text style={[styles.logDataLabel, { color: `${colors.text}80` }]}>
                  Stack Trace:
                </Text>
                <Text style={[styles.logStackTrace, { color: `${colors.text}70` }]}>
                  {log.stackTrace}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => copyLog(log)}
            >
              <IconSymbol name="doc.on.doc" size={14} color={colors.primary} />
              <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                Copy Log
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const summary = debugLogger.getLogsSummary();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <BlurView
          intensity={85}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Debug Logs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Summary */}
          <View style={styles.summary}>
            <Text style={[styles.summaryText, { color: `${colors.text}80` }]}>
              Total: {summary.total} | Errors: {summary.errors.length}
            </Text>
          </View>
        </BlurView>

        {/* Filters */}
        <View style={[styles.filters, { backgroundColor: colors.surface }]}>
          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
            <IconSymbol name="magnifyingglass" size={16} color={`${colors.text}60`} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search logs..."
              placeholderTextColor={`${colors.text}60`}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Level Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: selectedLevel === level 
                      ? colors.primary 
                      : colors.background,
                    borderColor: colors.primary
                  }
                ]}
                onPress={() => setSelectedLevel(level as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { 
                      color: selectedLevel === level 
                        ? '#FFFFFF' 
                        : colors.primary 
                    }
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Logs List */}
        <ScrollView
          style={styles.logsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLogs.length > 0 ? (
            filteredLogs.map(renderLogEntry)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text" size={48} color={`${colors.text}40`} />
              <Text style={[styles.emptyText, { color: `${colors.text}60` }]}>
                No logs found
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={[styles.actions, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={copyAllLogs}
          >
            <IconSymbol name="doc.on.doc" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Copy All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={shareLogs}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={clearLogs}
          >
            <IconSymbol name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  summary: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 12,
  },
  filters: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logsList: {
    flex: 1,
    padding: 16,
  },
  logEntry: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  logCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  logTime: {
    fontSize: 11,
  },
  logMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  logDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  logDataContainer: {
    marginBottom: 8,
  },
  logDataLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  logData: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 4,
  },
  logStackTrace: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(255,0,0,0.05)',
    padding: 8,
    borderRadius: 4,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    marginTop: 8,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});