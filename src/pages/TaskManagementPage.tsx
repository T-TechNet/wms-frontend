import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import { TaskForm } from '../components/TaskForm';
import DOForm from '../components/DOForm';
import type { TaskFormValues } from '../components/TaskForm';
import { TaskTable } from '../components/TaskTable';
import type { Task } from '../components/TaskTable';
import { useLocation } from 'react-router-dom';

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [orderTasks, setOrderTasks] = useState<Record<string, Task[]>>({});
  const location = useLocation();

  useEffect(() => {
    // Fetch user from backend
    apiRequest('/api/users/me')
      .then((data) => setCurrentUser(data || null))
      .catch(() => setCurrentUser(null));
    fetchOrders();
  }, []);

  useEffect(() => {
    // If ?po=... in URL, select that PO
    const params = new URLSearchParams(location.search);
    const poId = params.get('po');
    if (poId && orders.some(o => o._id === poId)) {
      setSelectedOrder(poId);
    } else if (orders.length > 0 && !selectedOrder) {
      setSelectedOrder(orders[0]._id);
    }
    // eslint-disable-next-line
  }, [orders, location.search]);

  useEffect(() => {
    if (showAllTasks) {
      fetchAllTasks();
    } else if (selectedOrder) {
      fetchTasks(selectedOrder);
    }
    // eslint-disable-next-line
  }, [showAllTasks, selectedOrder]);

  const fetchOrders = async () => {
    try {
      const data: any[] = await apiRequest('/api/purchase-orders');
      setOrders(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) setSelectedOrder(data[0]._id);
    } catch {
      toast.error('Failed to fetch purchase orders');
    }
  };

  const fetchTasks = async (orderId: string) => {
    setLoading(true);
    try {
      // Fetch tasks for the specific order
      const tasksData = await apiRequest(`/api/purchase-orders/${orderId}/tasks`);
      const tasks = Array.isArray(tasksData) ? tasksData : [];
      
      // Fetch all tasks to properly group them by order
      const allTasksResponse = await apiRequest('/api/tasks');
      const allTasks = Array.isArray(allTasksResponse) ? allTasksResponse : [];
      
      // Set tasks for the current view
      setTasks(tasks);
      
      // Group all tasks by orderId
      const tasksByOrder = allTasks.reduce((acc: Record<string, Task[]>, task: Task) => {
        if (!acc[task.orderId]) {
          acc[task.orderId] = [];
        }
        acc[task.orderId].push(task);
        return acc;
      }, {});
      
      setOrderTasks(tasksByOrder);
      
      // Debug logs
      console.log('Fetched tasks:', {
        currentOrderId: orderId,
        currentOrderTasks: tasks,
        allTasksByOrder: tasksByOrder,
        currentOrderTasksInGroup: tasksByOrder[orderId] || []
      });
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };
  
  const [showDOForm, setShowDOForm] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const handleOpenDOForm = (poId: string) => {
    setSelectedPoId(poId);
    setShowDOForm(true);
  };

  const handleCloseDOForm = () => {
    setShowDOForm(false);
    setSelectedPoId(null);
  };

  const handleDOSuccess = () => {
    // Refresh orders to update the UI
    fetchOrders();
    // Refresh tasks if needed
    if (selectedOrder) {
      fetchTasks(selectedOrder);
    }
  };

  const fetchAllTasks = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/tasks');
      const tasks = Array.isArray(data) ? data : [];
      
      // Set all tasks for the current view
      setTasks(tasks);
      
      // Group tasks by orderId for the orderTasks state
      const tasksByOrder = tasks.reduce((acc: Record<string, Task[]>, task: Task) => {
        if (!acc[task.orderId]) {
          acc[task.orderId] = [];
        }
        acc[task.orderId].push(task);
        return acc;
      }, {});
      
      setOrderTasks(tasksByOrder);
      
      // Log task information for debugging
      console.log('Fetched all tasks:', tasks);
      console.log('Tasks by order:', tasksByOrder);
      
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      setTasks([]);
      toast.error('Failed to fetch all tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      const newTask = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          purchaseOrderId: values.orderId,
        }),
      });
      setTasks((prev) => Array.isArray(prev) && newTask && typeof newTask === 'object' ? [...prev, newTask as Task] : prev);
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
      toast.success('Task status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      // Remove the deleted task from the tasks list
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      // Also update the orderTasks state if needed
      setOrderTasks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((orderId) => {
          updated[orderId] = updated[orderId].filter((t) => t._id !== taskId);
        });
        return updated;
      });
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error; // Re-throw to show error in the TaskRow component
    }
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <label className="font-medium mr-2">PO:</label>
          <select
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
            className="input-field"
            disabled={showAllTasks}
          >
            {orders.map((order) => (
              <option key={order._id} value={order._id}>
                {order._id.slice(-6)} | {order.status} | {order.deliveryDate?.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowAllTasks((prev) => !prev)}
        >
          {showAllTasks ? 'Show Tasks for Selected PO' : 'Show All Tasks'}
        </button>
      </div>
      {/* Only show TaskForm for non-user roles */}
      {currentUser?.role !== 'user' && (
        <TaskForm orders={orders} onSubmit={handleCreateTask} selectedOrder={selectedOrder} />
      )}
      <div className="mt-4">
        <TaskTable 
          tasks={tasks} 
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteTask}
          currentUserId={currentUser?._id}
          currentUserRole={currentUser?.role}
          onSwitchToDO={handleOpenDOForm}
          orderTasks={orderTasks}
        />
        
        {showDOForm && selectedPoId && (
          <DOForm 
            poId={selectedPoId} 
            onClose={handleCloseDOForm} 
            onSuccess={handleDOSuccess}
          />
        )}
      </div>
    </div>
  );
}