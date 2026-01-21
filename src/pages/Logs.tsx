import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { getAuditLogs, subscribeToAuditLogs } from '../utils/firestore';
import Table from '../components/UI/Table';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { format } from 'date-fns';
import { RefreshCw, Filter, Download, Image } from 'lucide-react';
import { base64ToDataURL, downloadBase64File, Base64Data } from '../utils/base64Utils';
import toast from 'react-hot-toast';

interface FirebaseAuditLog extends ActivityLog {
  files?: {
    screenshot?: Base64Data;
  };
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<FirebaseAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResource, setFilterResource] = useState<string>('');
  const [isRealtime, setIsRealtime] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Base64Data | null>(null);

  useEffect(() => {
    if (isRealtime) {
      // Subscribe to real-time updates from Firebase
      const unsubscribe = subscribeToAuditLogs((fetchedLogs) => {
        const formattedLogs = fetchedLogs.map(log => ({
          _id: log.id,
          adminId: log.adminId,
          adminEmail: log.adminEmail,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details || {},
          timestamp: log.timestamp?.toDate?.() 
            ? log.timestamp.toDate().toISOString() 
            : log.createdAt?.toDate?.()
              ? log.createdAt.toDate().toISOString()
              : new Date().toISOString(),
          ipAddress: log.ipAddress,
          files: log.files,
        }));
        setLogs(formattedLogs);
        setLoading(false);
      }, 100);

      return () => unsubscribe();
    } else {
      fetchLogs();
    }
  }, [isRealtime]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters: any = { limit: 100 };
      if (filterAction) filters.action = filterAction;
      if (filterResource) filters.resource = filterResource;

      const fetchedLogs = await getAuditLogs(filters);
      const formattedLogs = fetchedLogs.map(log => ({
        _id: log.id,
        adminId: log.adminId,
        adminEmail: log.adminEmail,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details || {},
        timestamp: log.timestamp?.toDate?.() 
          ? log.timestamp.toDate().toISOString() 
          : log.createdAt?.toDate?.()
            ? log.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        ipAddress: log.ipAddress,
        files: log.files,
      }));
      setLogs(formattedLogs);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = () => {
    try {
      const exportData = logs.map(log => ({
        adminEmail: log.adminEmail,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: JSON.stringify(log.details),
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
      }));

      const csvContent = [
        ['Admin Email', 'Action', 'Resource', 'Resource ID', 'Details', 'Timestamp', 'IP Address'],
        ...exportData.map(row => [
          row.adminEmail,
          row.action,
          row.resource,
          row.resourceId || '',
          row.details,
          row.timestamp,
          row.ipAddress || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const handleViewScreenshot = (screenshot: Base64Data) => {
    setSelectedScreenshot(screenshot);
  };

  const handleDownloadScreenshot = (screenshot: Base64Data, logId: string) => {
    downloadBase64File(screenshot, `screenshot_${logId}`);
    toast.success('Screenshot downloaded');
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      case 'VIEW': return 'bg-yellow-100 text-yellow-800';
      case 'EXPORT': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'adminEmail',
      header: 'Admin',
      sortable: true,
      render: (log: FirebaseAuditLog) => (
        <span className="text-sm font-medium text-gray-900">{log.adminEmail}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log: FirebaseAuditLog) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
          {log.action}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (log: FirebaseAuditLog) => (
        <span className="text-sm text-gray-600">
          {log.resource} {log.resourceId && `(${log.resourceId.slice(-8)})`}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (log: FirebaseAuditLog) => (
        <div className="max-w-xs">
          {Object.entries(log.details || {}).slice(0, 3).map(([key, value]) => (
            <div key={key} className="text-xs text-gray-500">
              <span className="font-medium">{key}:</span> {String(value).slice(0, 50)}
            </div>
          ))}
          {Object.keys(log.details || {}).length > 3 && (
            <span className="text-xs text-blue-500">+{Object.keys(log.details).length - 3} more</span>
          )}
        </div>
      ),
    },
    {
      key: 'screenshot',
      header: 'Evidence',
      render: (log: FirebaseAuditLog) => (
        log.files?.screenshot ? (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleViewScreenshot(log.files!.screenshot!)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="View Screenshot"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDownloadScreenshot(log.files!.screenshot!, log._id)}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log: FirebaseAuditLog) => (
        <span className="text-sm font-mono text-gray-600">
          {log.ipAddress || 'N/A'}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log: FirebaseAuditLog) => (
        <div className="text-sm">
          <div>{format(new Date(log.timestamp), 'MMM dd, yyyy')}</div>
          <div className="text-gray-500">{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
        </div>
      ),
      sortable: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${isRealtime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {isRealtime ? '● Live' : '○ Static'}
          </span>
          <button
            onClick={() => setIsRealtime(!isRealtime)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isRealtime ? 'Disable Live' : 'Enable Live'}
          </button>
          <button
            onClick={handleExportLogs}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </button>
          {!isRealtime && (
            <button
              onClick={fetchLogs}
              className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="VIEW">View</option>
            <option value="EXPORT">Export</option>
          </select>
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Resources</option>
            <option value="USERS">Users</option>
            <option value="ITEMS">Items</option>
            <option value="STORIES">Stories</option>
            <option value="NOTIFICATIONS">Notifications</option>
            <option value="ACADEMIC_RESOURCES">Academic Resources</option>
          </select>
          <span className="text-sm text-gray-600">
            Total Entries: {logs.length}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            All administrative actions are logged here for audit and security purposes.
            Logs are stored in Firebase Firestore with real-time synchronization.
          </p>
        </div>
        <Table data={logs} columns={columns} />
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Screenshot Evidence</h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <img
              src={base64ToDataURL(selectedScreenshot)}
              alt="Screenshot Evidence"
              className="max-w-full h-auto rounded"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  downloadBase64File(selectedScreenshot, 'screenshot_evidence');
                  toast.success('Downloaded');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Download
              </button>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;