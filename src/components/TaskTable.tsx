import React, { useState, useCallback } from 'react';
import { X, User, Calendar, Clock, AlertCircle, CheckCircle, Info, FileText, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Using native Date methods instead of date-fns to avoid dependency issues
function formatDate(dateString: string, formatStr: string = 'MMM dd, yyyy hh:mm a') {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // A simple formatter that handles common formats
    const pad = (n: number) => n < 10 ? '0' + n : n;
    
    const formats: Record<string, string> = {
      'MMM dd, yyyy': `${date.toLocaleString('default', { month: 'short' })} ${pad(date.getDate())}, ${date.getFullYear()}`,
      'PPpp': `${date.toLocaleString('default', { month: 'short' })} ${pad(date.getDate())}, ${date.getFullYear()}, ${pad(date.getHours() % 12 || 12)}:${pad(date.getMinutes())} ${date.getHours() >= 12 ? 'PM' : 'AM'}`,
    };
    
    return formats[formatStr] || date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

export interface Task {
  _id: string;
  orderId: string;
  purchaseOrderId?: string;  // Added optional purchaseOrderId
  poId?: string;            // Added optional poId
  purchaseOrder?: {         // Added optional purchaseOrder object
    _id: string;
    number?: string;
    // Add other purchase order fields as needed
  };
  type: string;
  assignedTo: string | { name?: string; email?: string; _id?: string };
  details: string;
  status: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name?: string; email?: string; _id?: string };
  completedAt?: string;
  priority?: 'Low' | 'Medium' | 'High';
}

interface TaskTableProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete?: (taskId: string) => Promise<void>;
  currentUserId?: string;
  currentUserRole?: string;
  onSwitchToDO?: (orderId: string) => void;
  orderTasks?: Record<string, Task[]>;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-pink-100 text-pink-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
};


interface TaskRowProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete?: (taskId: string) => Promise<void>;
  onViewDetails: (task: Task) => void;
  onSwitchToDO?: (orderId: string) => void;
  orderTasks?: Record<string, Task[]>;
  currentUserRole?: string;
  showSwitchButton?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ 
  task, 
  onStatusChange, 
  onDelete, 
  onViewDetails, 
  onSwitchToDO, 
  currentUserRole,
  showSwitchButton = false
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
    if (!confirmDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(task._id);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  
  // Determine the purchase order ID to use
  
  // Check if this task is completed

  const getAssignedToInfo = () => {
    if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      return {
        name: task.assignedTo.name || task.assignedTo.email?.split('@')[0] || 'Unassigned',
        email: task.assignedTo.email
      };
    }
    return { name: task.assignedTo || 'Unassigned', email: '' };
  };

  const assignedTo = getAssignedToInfo();
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'Completed';

  // Debug logs for button visibility
  const buttonShouldShow = true; // Temporarily force show for debugging
  console.log('TaskRow debug:', {
    taskId: task._id,
    status: task.status,
    orderId: task.orderId,
    purchaseOrderId: task.purchaseOrderId,
    poId: task.poId,
    showSwitchButton,
    hasOnSwitchToDO: !!onSwitchToDO,
    hasOrderId: !!task.orderId,
    buttonShouldShow,
    isCompleted: task.status === 'Completed',
    allTaskProps: Object.keys(task)
  });

  return (
    <tr key={task._id} className="border-b hover:bg-gray-50">
      <td className="px-2 py-3">{task.type}</td>
      <td className="px-2 py-3">
        <div className="font-medium">{assignedTo.name}</div>
        {assignedTo.email && <div className="text-xs text-gray-500">{assignedTo.email}</div>}
      </td>
      <td className="px-2 py-3">
        <div className="line-clamp-2">{task.details}</div>
      </td>
      <td className="px-2 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[task.status] || ''}`}>
          {task.status}
        </span>
      </td>
      <td className="px-2 py-3">
        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
          {isOverdue && <AlertCircle className="w-3 h-3" />}
          {formatDate(task.deadline)}
        </div>
      </td>
      <td className="px-2 py-3">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task._id, e.target.value)}
              className="input-field text-sm p-1 border rounded flex-1"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <button 
              onClick={() => onViewDetails(task)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 border rounded"
            >
              Details
            </button>
          </div>
          {/* Debug log for button visibility */}
          {(() => {
            console.log('Button visibility check:', {
              taskId: task._id,
              status: task.status,
              orderId: task.orderId,
              shouldShow: task.status === 'Completed' && !!task.orderId
            });
            return null;
          })()}
          {buttonShouldShow && onSwitchToDO && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Use purchaseOrderId, poId, or purchaseOrder._id, whichever is available
                const poId = task.purchaseOrderId || task.poId || task.purchaseOrder?._id;
                if (!poId) {
                  console.error('No purchase order ID found for task:', task);
                  toast.error('Cannot create DO: No purchase order ID found');
                  return;
                }
                onSwitchToDO(poId);
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium px-2 py-1 border border-green-200 rounded flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100"
              title="Switch to DO"
            >
              Switch to DO
            </button>
          )}
          {onDelete && (currentUserRole === 'superadmin' || currentUserRole === 'manager') && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 border border-red-200 rounded flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete Task"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const TaskDetailModal: React.FC<{ task: Task | null; onClose: () => void }> = ({ task, onClose }) => {
  if (!task) return null;

  const getAssignedToInfo = () => {
    if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      return {
        name: task.assignedTo.name || task.assignedTo.email?.split('@')[0] || 'Unassigned',
        email: task.assignedTo.email
      };
    }
    return { name: task.assignedTo || 'Unassigned', email: '' };
  };

  const assignedTo = getAssignedToInfo();
  const createdBy = task.createdBy ? (typeof task.createdBy === 'object' ? 
    (task.createdBy.name || task.createdBy.email || 'System') : 
    task.createdBy) : 'System';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Task Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Task Information
                </h3>
                <div className="mt-2 space-y-2 pl-6">
                  <p><span className="text-gray-500">Type:</span> {task.type}</p>
                  <p><span className="text-gray-500">Status:</span> 
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status] || ''}`}>
                      {task.status}
                    </span>
                  </p>
                  <p><span className="text-gray-500">Priority:</span> {task.priority || 'Not specified'}</p>
                  <p><span className="text-gray-500">Created:</span> {formatDate(task.createdAt, 'PPpp')}</p>
                  <p><span className="text-gray-500">Created By:</span> {createdBy}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assigned To
                </h3>
                <div className="mt-2 pl-6">
                  <p className="font-medium">{assignedTo.name}</p>
                  {assignedTo.email && <p className="text-sm text-gray-600">{assignedTo.email}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Timeline
                </h3>
                <div className="mt-2 space-y-2 pl-6">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Deadline:</span>{' '}
                    <span className={new Date(task.deadline) < new Date() ? 'text-red-600 font-medium' : ''}>
                      {formatDate(task.deadline, 'PPpp')}
                      {new Date(task.deadline) < new Date() && ' (Overdue)'}
                    </span>
                  </p>
                  {task.completedAt && (
                    <p className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-gray-500">Completed:</span>{' '}
                      {formatDate(task.completedAt, 'PPpp')}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Last Updated:</span>{' '}
                    {formatDate(task.updatedAt, 'PPpp')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Task Details
            </h3>
            <div className="mt-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="whitespace-pre-line">{task.details}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const TaskTable: React.FC<TaskTableProps> = ({ 
  tasks, 
  onStatusChange, 
  onDelete,
  currentUserId, 
  currentUserRole,
  onSwitchToDO,
  orderTasks = {}
}) => {
  console.log('TaskTable render:', {
    taskCount: tasks.length,
    hasOnSwitchToDO: !!onSwitchToDO,
    currentUserRole,
    sampleTask: tasks[0] ? {
      status: tasks[0].status,
      orderId: tasks[0].orderId,
      purchaseOrderId: tasks[0].purchaseOrderId,
      poId: tasks[0].poId
    } : 'No tasks'
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDOForm, setShowDOForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());

  // Handle opening the DO form
  const handleSwitchToDO = useCallback((orderId: string) => {
    console.log('Opening DO form for order:', orderId);
    setSelectedOrderId(orderId);
    setShowDOForm(true);
    console.log('showDOForm should now be true');
  }, []);

  // Handle DO form submission
  const handleDOSubmit = async (formData: any) => {
    try {
      // Here you would typically make an API call to create the DO
      console.log('Submitting DO form with data:', {
        orderId: selectedOrderId,
        ...formData
      });
      
      // Close the form after submission
      setShowDOForm(false);
      toast.success('Delivery Order created successfully');
    } catch (error) {
      console.error('Error creating DO:', error);
      toast.error('Failed to create Delivery Order');
    }
  };

  // Update recently completed tasks when status changes
  const handleStatusChangeWithTracking = async (taskId: string, newStatus: string) => {
    console.log('Status change - taskId:', taskId, 'newStatus:', newStatus);
    await onStatusChange(taskId, newStatus);
    if (newStatus === 'Completed') {
      console.log('Task completed, adding to recentlyCompleted');
      setRecentlyCompleted(prev => {
        const updated = new Set(prev);
        updated.add(taskId);
        console.log('Updated recentlyCompleted set:', Array.from(updated));
        return updated;
      });
    }
  };
  
  // Debug effect to track modal state
  React.useEffect(() => {
    console.log('Modal state - showDOForm:', showDOForm, 'selectedOrderId:', selectedOrderId);
  }, [showDOForm, selectedOrderId]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4">
        <h2 className="font-bold text-lg">Tasks</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Assigned To</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Deadline</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length > 0 ? (
              tasks
                .filter(task => {
                  // Show all tasks for superadmin and manager roles
                  if (currentUserRole === 'superadmin' || currentUserRole === 'manager') {
                    return true;
                  }
                  
                  // For other roles, only show tasks assigned to the current user
                  if (!currentUserId) return false;
                  
                  if (typeof task.assignedTo === 'string') {
                    return task.assignedTo === currentUserId;
                  } else if (task.assignedTo && typeof task.assignedTo === 'object') {
                    return task.assignedTo._id === currentUserId;
                  }
                  return false;
                })
                .map((task) => {
                  console.log('Rendering task row:', {
                    taskId: task._id,
                    orderId: task.orderId,
                    orderTasks: orderTasks[task.orderId] || []
                  });
                  return (
                    <TaskRow 
                      key={task._id} 
                      task={task} 
                      onStatusChange={handleStatusChangeWithTracking}
                      onViewDetails={setSelectedTask}
                      onDelete={onDelete}
                      onSwitchToDO={onSwitchToDO || handleSwitchToDO}
                      orderTasks={orderTasks}
                      currentUserRole={currentUserRole}
                      showSwitchButton={recentlyCompleted.has(task._id) || task.status === 'Completed'}
                    />
                  );
                })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No tasks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TaskDetailModal 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />
      
      {/* DO Form Modal */}
      {showDOForm && selectedOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Create Delivery Order
              </h3>
              <button 
                onClick={() => setShowDOForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const formValues = Object.fromEntries(formData.entries());
              handleDOSubmit(formValues);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    required
                    className="w-full p-2 border rounded"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full p-2 border rounded"
                    placeholder="Any special instructions..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDOForm(false)}
                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create DO
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
