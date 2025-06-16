import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Video, Calendar, Download, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const navigate = useNavigate();

  // Empty data for new users
  const earningsData = [
    { name: 'Jan', earnings: 0, sales: 0 },
    { name: 'Feb', earnings: 0, sales: 0 },
    { name: 'Mar', earnings: 0, sales: 0 },
    { name: 'Apr', earnings: 0, sales: 0 },
    { name: 'May', earnings: 0, sales: 0 },
    { name: 'Jun', earnings: 0, sales: 0 },
  ];

  const contentPerformance = [
    { name: 'No Content Yet', value: 100, count: 0 },
  ];

  const topContent: any[] = [];

  const stats = [
    {
      name: 'Total Earnings',
      value: '$0.00',
      change: 'Start creating content!',
      trend: 'up',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'This Month',
      value: '$0.00',
      change: 'No sales yet',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Total Views',
      value: '0',
      change: 'Upload content to get views',
      trend: 'up',
      icon: Users,
      color: 'from-purple-500 to-violet-500',
    },
    {
      name: 'Content Sales',
      value: '0',
      change: 'No content uploaded',
      trend: 'up',
      icon: Video,
      color: 'from-pink-500 to-rose-500',
    },
  ];

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your performance and earnings</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-white/80 backdrop-blur-xl border border-white rounded-xl px-4 py-2 shadow-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      <div className="text-center py-16">
        <div className="max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart className="w-12 h-12 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No analytics data yet</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Start creating and selling content to see your analytics data here. 
            You'll be able to track earnings, views, sales, and much more!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={() => navigate('/content')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Content</span>
            </button>
            <button 
              onClick={() => navigate('/media')}
              className="border border-purple-300 text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
            >
              Upload Media Files
            </button>
          </div>

          {/* Preview of what analytics will look like */}
          <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 What you'll see here once you start:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">Earnings Tracking</p>
                <p className="text-gray-600">Daily, weekly, monthly revenue</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-medium text-gray-900">Audience Insights</p>
                <p className="text-gray-600">Views, engagement, demographics</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
                <p className="font-medium text-gray-900">Content Performance</p>
                <p className="text-gray-600">Top performing content, conversion rates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};