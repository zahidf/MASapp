import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Share,
  Alert,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import {
  firebaseLogger,
  LogLevel,
  LogCategory,
} from '@/utils/firebaseLogger';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  searchText?: string;
  startDate?: Date;
  endDate?: Date;
}

export function FirebaseDebugDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [filter, setFilter] = useState<LogFilter>({});
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Subscribe to real-time log updates
  useEffect(() => {
    const unsubscribe = firebaseLogger.subscribe((newLog) => {
      setLogs((prevLogs) => [newLog, ...prevLogs]);
      updateSummary();
    });

    // Initial load
    loadLogs();
    updateSummary();

    return unsubscribe;
  }, []);

  const loadLogs = useCallback(() => {
    const filteredLogs = firebaseLogger.getLogs({
      level: filter.level,
      category: filter.category,
      startDate: filter.startDate,
      endDate: filter.endDate,
      operation: filter.searchText,
    });
    setLogs(filteredLogs.reverse()); // Show newest first
  }, [filter]);

  const updateSummary = useCallback(() => {
    setSummary(firebaseLogger.getLogSummary());
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLogs();
    updateSummary();
    setRefreshing(false);
  }, [loadLogs, updateSummary]);

  const exportLogs = async (format: 'json' | 'csv') => {
    try {
      const logData = await firebaseLogger.exportLogs(format);
      const fileName = `firebase_logs_${new Date().getTime()}.${format}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, logData);

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: format === 'json' ? 'application/json' : 'text/csv',
            dialogTitle: 'Export Firebase Logs',
          });
        } else {
          // Fallback to Share API
          await Share.share({
            message: logData,
            title: fileName,
          });
        }
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export logs');
      console.error('Export error:', error);
    }
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            firebaseLogger.clearLogs();
            setLogs([]);
            updateSummary();
          },
        },
      ]
    );
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return '#6B7280';
      case LogLevel.INFO:
        return '#10B981';
      case LogLevel.WARN:
        return '#F59E0B';
      case LogLevel.ERROR:
        return '#EF4444';
      case LogLevel.CRITICAL:
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const renderLogItem = (log: any) => (
    <TouchableOpacity
      key={log.id}
      style={styles.logItem}
      onPress={() => {
        setSelectedLog(log);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.logHeader}>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(log.level) }]}>
          <Text style={styles.levelText}>{LogLevel[log.level]}</Text>
        </View>
        <Text style={styles.categoryText}>{log.category}</Text>
        <Text style={styles.timestampText}>
          {new Date(log.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.operationText}>{log.operation}</Text>
      <Text style={styles.messageText} numberOfLines={2}>
        {log.message}
      </Text>
      {log.duration && (
        <Text style={styles.durationText}>Duration: {log.duration}ms</Text>
      )}
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Log Details</ThemedText>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {selectedLog && (
            <ScrollView style={styles.modalBody}>
              <DetailRow label="ID" value={selectedLog.id} />
              <DetailRow label="Timestamp" value={selectedLog.timestamp} />
              <DetailRow label="Level" value={LogLevel[selectedLog.level]} />
              <DetailRow label="Category" value={selectedLog.category} />
              <DetailRow label="Operation" value={selectedLog.operation} />
              <DetailRow label="Message" value={selectedLog.message} />
              {selectedLog.duration && (
                <DetailRow label="Duration" value={`${selectedLog.duration}ms`} />
              )}
              {selectedLog.data && (
                <DetailRow
                  label="Data"
                  value={JSON.stringify(selectedLog.data, null, 2)}
                  isCode
                />
              )}
              {selectedLog.error && (
                <DetailRow
                  label="Error"
                  value={JSON.stringify(selectedLog.error, null, 2)}
                  isCode
                />
              )}
              {selectedLog.metadata && (
                <DetailRow
                  label="Metadata"
                  value={JSON.stringify(selectedLog.metadata, null, 2)}
                  isCode
                />
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const DetailRow = ({ 
    label, 
    value, 
    isCode = false 
  }: { 
    label: string; 
    value: string; 
    isCode?: boolean;
  }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={[styles.detailValue, isCode && styles.codeText]}>
        {value}
      </Text>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <ThemedText style={styles.sectionTitle}>Summary</ThemedText>
        <View style={styles.summaryGrid}>
          <SummaryCard title="Total Logs" value={summary.total || 0} />
          <SummaryCard 
            title="Errors" 
            value={summary.errors || 0} 
            color="#EF4444" 
          />
          <SummaryCard 
            title="Warnings" 
            value={summary.warnings || 0} 
            color="#F59E0B" 
          />
        </View>
      </View>

      {/* Actions Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => exportLogs('json')}
        >
          <MaterialIcons name="file-download" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={clearLogs}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      <ScrollView
        style={styles.logsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color="#9CA3AF" />
            <ThemedText style={styles.emptyText}>No logs found</ThemedText>
          </View>
        ) : (
          logs.map(renderLogItem)
        )}
      </ScrollView>

      {renderDetailModal()}
    </ThemedView>
  );
}

const SummaryCard = ({ 
  title, 
  value, 
  color 
}: { 
  title: string; 
  value: number; 
  color?: string;
}) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryCardTitle}>{title}</Text>
    <Text style={[styles.summaryCardValue, color && { color }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryCardTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  logsContainer: {
    flex: 1,
  },
  logItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  timestampText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  operationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: '#4B5563',
  },
  durationText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    fontSize: 12,
  },
});