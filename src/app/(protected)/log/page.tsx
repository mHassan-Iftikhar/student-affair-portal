'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import Table from '../../../components/UI/Table';
import { getAuditLogs } from '../../../utils/firestore';

interface AuditLogRow {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

const formatTimestamp = (value: any): string => {
  if (!value) return '—';
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM dd, yyyy HH:mm');
};

const AuditLogPage: React.FC = () => {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    setRefreshing(true);
    try {
      const logs = await getAuditLogs({ limit: 100 });
      const mapped = logs.map((log: any) => ({
        id: log.id || log._id || crypto.randomUUID(),
        timestamp: formatTimestamp(log.timestamp || log.createdAt),
        adminEmail: log.adminEmail || 'Unknown',
        action: log.action || 'UNKNOWN',
        resource: log.resource || 'UNKNOWN',
        resourceId: log.resourceId || '—',
        details: log.details ? JSON.stringify(log.details) : '—',
      }));
      setRows(mapped);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const columns = useMemo(() => [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'adminEmail', header: 'Admin Email' },
    { key: 'action', header: 'Action' },
    { key: 'resource', header: 'Resource' },
    { key: 'resourceId', header: 'Resource ID' },
    {
      key: 'details',
      header: 'Details',
      render: (item: AuditLogRow) => (
        <span className="block max-w-md truncate" title={item.details}>
          {item.details}
        </span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-gray-600 mt-1">Recent administrative actions</p>
          </div>
        </div>
        <button
          onClick={loadLogs}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4">
          <Table data={rows} columns={columns} />
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
