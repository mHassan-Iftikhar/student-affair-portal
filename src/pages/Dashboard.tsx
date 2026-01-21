import React, { useState, useEffect } from 'react';
import { Users, Package, AlertTriangle, BookOpen, TrendingUp, Activity, Clock } from 'lucide-react';
import { DashboardStats } from '../types';
import api from '../utils/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats', {
        headers: { 'X-Silent-Error': 'true' }
      });
      setStats(response.data);
    } catch (error) {
      // Silently handle errors - backend may not be running
      console.log('Backend not available');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Active Items',
      value: stats?.activeItems || 0,
      icon: Package,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Pending Reports',
      value: stats?.pendingReports || 0,
      icon: AlertTriangle,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      change: '-3%',
      trend: 'down'
    },
    {
      title: 'Total Stories',
      value: stats?.totalStories || 0,
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      change: '+15%',
      trend: 'up'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{format(new Date(), 'MMM dd, yyyy - HH:mm')}</span>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={stat.title} 
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100 transform hover:-translate-y-1"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className={`${stat.bgColor} rounded-lg p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
              <div className={`flex items-center text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${
                  stat.trend === 'down' ? 'transform rotate-180' : ''
                }`} />
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <span className="text-sm text-gray-500">Last 24 hours</span>
          </div>
        </div>
        <div className="p-6">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div 
                  key={activity._id} 
                  className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:shadow-sm transition-all duration-200 border border-gray-100"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.action} on {activity.resource}
                    </p>
                    <p className="text-sm text-gray-500">
                      by {activity.adminEmail}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">Activity will appear here once actions are performed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;