import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalPOs?: number;
  totalRevenue?: number;
  totalCustomers?: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasksCount?: number;
}

interface StockData {
  id: number;
  productName: string;
  quantity: number;
  reorderLevel: number;
}

interface TaskData {
  id: number;
  title: string;
  status: string;
  priority: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [taskData, setTaskData] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, stockData, taskData] = await Promise.all([
        apiRequest<DashboardStats>('/api/dashboard/stats'),
        apiRequest<StockData[]>('/api/dashboard/stock'),
        apiRequest<TaskData[]>('/api/dashboard/tasks'),
      ]);
      setStats(statsData);
      setStockData(stockData);
      setTaskData(taskData);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const stockChartData = {
    labels: stockData.map(item => item.productName),
    datasets: [
      {
        label: 'Stock Level',
        data: stockData.map(item => item.quantity),
        backgroundColor: 'rgba(14, 165, 233, 0.5)',
        borderColor: 'rgb(14, 165, 233)',
        borderWidth: 1,
      },
    ],
  };

  const taskChartData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [
      {
        data: [
          stats?.pendingTasks ?? taskData.filter(t => t.status === 'pending').length,
          stats?.inProgressTasks ?? taskData.filter(t => t.status === 'in-progress').length,
          stats?.completedTasksCount ?? taskData.filter(t => t.status === 'completed').length,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(34, 197, 94, 0.5)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(234, 179, 8)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <h3 className="text-lg font-medium">Total Products</h3>
          <p className="text-3xl font-bold mt-2">{stats?.totalProducts}</p>
          <p className="text-sm mt-2 text-primary-100">
            {stats?.lowStockProducts} products low in stock
          </p>
        </div>
        {stats?.totalOrders !== undefined && (
          <div className="card bg-gradient-to-br from-secondary-500 to-secondary-600 text-white">
            <h3 className="text-lg font-medium">Total Orders</h3>
            <p className="text-3xl font-bold mt-2">{stats.totalOrders}</p>
          </div>
        )}
        {stats?.totalCustomers !== undefined && (
          <div className="card bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <h3 className="text-lg font-medium">Total Customers</h3>
            <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
          </div>
        )}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <h3 className="text-lg font-medium">Total POs</h3>
          <p className="text-3xl font-bold mt-2">{stats?.totalPOs}</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <h3 className="text-lg font-medium">Pending Tasks</h3>
          <p className="text-3xl font-bold mt-2">{stats?.pendingTasks}</p>
        </div>
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <h3 className="text-lg font-medium">In Progress Tasks</h3>
          <p className="text-3xl font-bold mt-2">{stats?.inProgressTasks}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <h3 className="text-lg font-medium">Completed Tasks</h3>
          <p className="text-3xl font-bold mt-2">{stats?.completedTasksCount}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Levels by Product</h3>
          <div className="h-80">
            <Bar
              data={stockChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Status Distribution</h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut
              data={taskChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Task Progress */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Task Progress</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {stats?.completedTasks} / {stats?.totalTasks} tasks completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full"
              style={{
                width: `${((stats?.completedTasks || 0) / (stats?.totalTasks || 1)) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
