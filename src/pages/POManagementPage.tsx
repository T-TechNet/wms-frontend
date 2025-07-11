import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { X, Package, User, Calendar, FileText, AlertCircle, CheckCircle, Truck, Eye } from 'lucide-react';
import DOForm from '../components/DOForm';

interface PurchaseOrder {
  id: string;
  items: any[];
  createdBy: any;
  date: string;
  deliveryDate: string;
  notes?: string;
  status: 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'Yes';
  doCreated?: boolean;
  doId?: string;  // Add DO ID field
  invoiceUrl?: string;
}

export default function POManagementPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  
  // Log when orders change
  useEffect(() => {
    console.log('Orders updated:', orders);
  }, [orders]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newPO, setNewPO] = useState({
    customer: '',
    deliveryDate: '',
    items: [{ product: '', quantity: 1, price: 0 }],
    notes: ''
  });
  const [creating, setCreating] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskPOId, setTaskPOId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder & { doId?: string } | null>(null);
  const [showDOForm, setShowDOForm] = useState(false);
  const [currentPOId, setCurrentPOId] = useState<string | null>(null);
  const [currentDOData, setCurrentDOData] = useState<any>(null);
  const [isLoadingDO, setIsLoadingDO] = useState(false);
  
  // Debug effect for modal state
  useEffect(() => {
    console.log('Modal State:', { showDOForm, currentPOId, isLoadingDO, hasDOData: !!currentDOData });
  }, [showDOForm, currentPOId, isLoadingDO, currentDOData]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderTasks, setOrderTasks] = useState<Record<string, any[]>>({});
  const [newTask, setNewTask] = useState({
    type: '',
    assignedTo: '',
    details: '',
    deadline: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}'));
  }, []);

  useEffect(() => {
    console.log('Selected order changed:', selectedOrder);
  }, [selectedOrder]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [ordersData, tasksData] = await Promise.all([
        apiRequest('/api/purchase-orders'),
        apiRequest('/api/tasks')
      ]);
      
      // Map orders to ensure consistent ID handling
      const formattedOrders = Array.isArray(ordersData) 
        ? ordersData.map((order: any) => ({
            ...order,
            id: order._id || order.id, // Handle both _id and id
            _id: order._id || order.id // Ensure _id is always set
          }))
        : [];
      
      // Group tasks by order ID
      const tasksByOrder: Record<string, any[]> = {};
      if (Array.isArray(tasksData)) {
        tasksData.forEach((task: any) => {
          const orderId = task.orderId;
          if (orderId) {
            if (!tasksByOrder[orderId]) {
              tasksByOrder[orderId] = [];
            }
            tasksByOrder[orderId].push(task);
          }
        });
      }
      
      setOrderTasks(tasksByOrder);
      setOrders(formattedOrders);
    } catch (err) {
      console.error('Error fetching data:', err);
      showApiError(err, 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
  
  const areAllTasksCompleted = (orderId: string) => {
    const tasks = orderTasks[orderId] || [];
    console.log(`Tasks for order ${orderId}:`, tasks);
    if (tasks.length === 0) {
      console.log('No tasks found for order', orderId);
      return false;
    }
    const allCompleted = tasks.every((task: any) => task.status === 'Completed');
    console.log(`All tasks completed for order ${orderId}:`, allCompleted);
    return allCompleted;
  };

  // Helper to check if PO is cancelled or delivered
  const isInactive = (order: PurchaseOrder) => order.status === 'cancelled' || order.status === 'delivered';

  const viewOrderDetails = async (order: PurchaseOrder) => {
    try {
      // If order has doCreated but no doId, try to fetch it
      if (order.doCreated && !order.doId) {
        const data = await apiRequest<{id: string}[]>(`/api/delivery-orders?poId=${order.id}`);
        if (data && data.length > 0) {
          order = { ...order, doId: data[0].id };
        }
      }
      setSelectedOrder(order);
      setShowOrderDetails(true);
    } catch (error) {
      console.error('Error fetching DO ID:', error);
      toast.error('Failed to load delivery order information');
      setSelectedOrder(order);
      setShowOrderDetails(true);
    }
  };

  // Helper function to show API errors
  const showApiError = (error: unknown, fallback: string) => {
    let errorMessage = fallback;
    
    if (error && typeof error === 'object') {
      // Handle Axios error format
      if ('response' in error && error.response && typeof error.response === 'object') {
        const responseData = (error.response as { data?: { message?: string } }).data;
        if (responseData?.message) {
          errorMessage = responseData.message;
        }
      } 
      // Handle standard Error objects
      else if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
    }
    
    toast.error(errorMessage);
    console.error('API Error:', error);
  };

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/api/purchase-orders/${id}/approve`, { method: 'PATCH' });
      toast.success('PO approved');
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to approve PO');
    }
  };

  const handleCreateDO = (id: string) => {
    setCurrentPOId(id);
    setShowDOForm(true);
  };

  interface DOResponseData {
    order?: {
      _id?: string;
      id?: string;
      doId?: string;
    };
    _id?: string;
    id?: string;
    doId?: string;
    redirectUrl?: string;
  }

  interface DOResponseData {
    order?: {
      _id?: string;
      id?: string;
      doId?: string;
    };
    _id?: string;
    id?: string;
    doId?: string;
    redirectUrl?: string;
  }

  const handleDOSuccess = (doId?: string | null, responseData?: unknown) => {
    console.log('handleDOSuccess called with:', { doId, responseData });
    console.log('currentPOId:', currentPOId);
    
    if (!currentPOId) {
      console.error('No currentPOId found when handling DO success');
      toast.error('Error: No purchase order selected');
      return;
    }
    
    // Safely parse the response data
    let parsedData: DOResponseData = {};
    try {
      // If responseData is a string, parse it as JSON
      if (typeof responseData === 'string') {
        parsedData = JSON.parse(responseData) as DOResponseData;
      } else if (typeof responseData === 'object' && responseData !== null) {
        // If it's already an object, use it directly
        parsedData = responseData as DOResponseData;
      }
    } catch (error) {
      console.error('Error parsing response data:', error);
    }
    
    // Extract DO ID from response data if not provided directly
    const resolvedDoId = doId || 
                        parsedData?.order?._id || // MongoDB uses _id
                        parsedData?.order?.id || 
                        parsedData?.order?.doId ||
                        parsedData?._id || // Check for _id at root level
                        parsedData?.id ||
                        parsedData?.doId;
    
    if (!resolvedDoId) {
      console.error('No DO ID found in response or parameters:', { doId, parsedData });
      toast.error('Error: Could not create delivery order - missing ID');
      return;
    }
    
    // Update the orders list with the new DO information
    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === currentPOId) {
          return { 
            ...order, 
            doCreated: true, 
            doId: resolvedDoId 
          };
        }
        return order;
      });
    });
    
    // Also update the selected order if it's the current one
    if (selectedOrder?.id === currentPOId) {
      setSelectedOrder(prev => ({
        ...prev!,
        doCreated: true,
        doId: resolvedDoId
      }));
    }
    
    toast.success('Delivery Order created successfully');
    setShowDOForm(false);
    setCurrentPOId(null);
    setCurrentDOData(null);
    
    // Handle redirect if needed
    if (parsedData.redirectUrl) {
      console.log('Navigating to:', parsedData.redirectUrl);
      navigate(parsedData.redirectUrl);
    }
  };

  const handleAdvance = async (id: string, next: 'shipping' | 'delivered') => {
    try {
      await apiRequest(`/api/purchase-orders/${id}/advance`, { method: 'PATCH', body: JSON.stringify({ next }) });
      toast.success('PO status updated');
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to advance PO status');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Are you sure you want to mark this order as completed? This action cannot be undone.')) {
      return;
    }
    try {
      await apiRequest(`/api/purchase-orders/${id}/complete`, { method: 'PATCH' });
      toast.success('Order marked as completed');
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to complete order');
    }
  };

  const handleGenerateInvoice = async (id: string) => {
    try {
      const res = await apiRequest(`/api/purchase-orders/${id}/invoice`, { method: 'PATCH' }) as { invoiceUrl?: string };
      toast.success('Invoice generated');
      fetchOrders();
      if (res.invoiceUrl) window.open(res.invoiceUrl, '_blank');
    } catch (err: any) {
      showApiError(err, 'Failed to generate invoice');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiRequest(`/api/purchase-orders/${id}`, { method: 'DELETE' });
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to delete order');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Check user role first
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const allowedRoles = ['superadmin', 'admin', 'manager', 'purchaser'];
      
      if (!user.role || !allowedRoles.includes(user.role)) {
        console.log('Current user role:', user.role);
        console.log('Allowed roles:', allowedRoles);
        throw new Error('Your account does not have permission to create purchase orders. Please contact your administrator.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch('http://localhost:8080/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPO),
        credentials: 'include'
      });

      // Handle non-success responses
      if (!response.ok) {
        let errorMessage = 'Failed to create purchase order. ';
        
        // Try to parse error response
        try {
          const errorData = await response.json();
          errorMessage += errorData.message || `Status: ${response.status}`;
        } catch (e) {
          // If response is not JSON, get text
          const text = await response.text();
          // Check if it's an HTML error page
          if (text.includes('User does not have permission')) {
            errorMessage = 'Your account does not have permission to create purchase orders. Please contact your administrator.';
          } else {
            errorMessage += `Server responded with: ${text.substring(0, 100)}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // If we get here, the request was successful
      const responseData = await response.json();
      
      toast.success('PO created successfully');
      setShowCreateModal(false);
      setNewPO({ customer: '', deliveryDate: '', items: [{ product: '', quantity: 1, price: 0 }], notes: '' });
      fetchOrders();
    } catch (error: any) {
      console.error('Error creating PO:', error);
      let errorMessage = 'Failed to create PO. ';
      
      if (error.message.includes('Unexpected token')) {
        errorMessage += 'The server returned an unexpected response. Please try again or contact support.';
      } else {
        errorMessage += error.message || 'Please check your credentials and try again.';
      }
      
      toast.error(errorMessage);
      
      if (error.message?.includes('401') || error.message?.includes('token')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setCreating(false);
    }
  };

  // Helper to open the Create PO modal and fetch customers/products
  const openCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const [cust, prod] = await Promise.all([
        apiRequest('/api/customers'),
        apiRequest('/api/products')
      ]);
      setCustomers(Array.isArray(cust) ? cust : []);
      setProducts(Array.isArray(prod) ? prod : []);
    } catch {
      toast.error('Failed to load customers/products');
    }
  };


  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPOId) return;
    try {
      await apiRequest(`/api/purchase-orders/${taskPOId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(newTask),
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Task created');
      setShowTaskModal(false);
      setTaskPOId(null);
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to create task');
    }
  };

  return (
    <div className="space-y-6">
      {/* DO Form Modal */}
      {showDOForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            console.log('Modal background clicked');
            setShowDOForm(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingDO ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Loading delivery order data...</p>
                <p className="text-sm text-gray-500 mt-2">PO ID: {currentPOId}</p>
              </div>
            ) : currentPOId ? (
              <>
                {console.log('Rendering DOForm with props:', { 
                  poId: currentPOId, 
                  hasDoData: !!currentDOData,
                  doDataKeys: currentDOData ? Object.keys(currentDOData) : [] 
                })}
                <DOForm 
                  key={`do-form-${currentPOId}-${currentDOData?.id || 'new'}`}
                  poId={currentPOId} 
                  doData={currentDOData}
                  onClose={() => {
                    console.log('Closing DO form');
                    setShowDOForm(false);
                    setCurrentPOId(null);
                    setCurrentDOData(null);
                    setIsLoadingDO(false);
                  }} 
                  onSuccess={(doId, responseData) => {
                    console.log('DO form submitted successfully', { doId, responseData });
                    handleDOSuccess(doId, responseData);
                    setShowDOForm(false);
                    setCurrentPOId(null);
                    setCurrentDOData(null);
                    setIsLoadingDO(false);
                  }}
                />
              </>
            ) : (
              <div className="p-8 text-center">
                <p className="text-red-500">Error: Missing purchase order ID</p>
                <button 
                  onClick={() => setShowDOForm(false)}
                  className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Purchase Orders</h2>
        <button className="btn-primary" onClick={openCreateModal}>+ Create PO</button>
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form onSubmit={handleCreatePO} className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold mb-2">Create Purchase Order</h3>
            <label className="block mb-2">Customer
              <select className="input input-bordered w-full" required value={newPO.customer} onChange={e => setNewPO({ ...newPO, customer: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name || c.email || c._id}</option>)}
              </select>
            </label>
            <label className="block mb-2">Delivery Date
              <input type="date" className="input input-bordered w-full" required value={newPO.deliveryDate} onChange={e => setNewPO({ ...newPO, deliveryDate: e.target.value })} />
            </label>
            <div>
              <label className="block mb-1">Items</label>
              {newPO.items.map((item, idx) => (
                <div key={idx} className="flex space-x-2 mb-2 items-center">
                  <select className="input input-bordered flex-1" required value={item.product} onChange={e => {
                    const productId = e.target.value;
                    const product = products.find((p: any) => p._id === productId);
                    const items = [...newPO.items];
                    items[idx].product = productId;
                    items[idx].price = product ? product.price : 0;
                    setNewPO({ ...newPO, items });
                  }}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                  <input type="number" min={1} className="input input-bordered w-20" required value={item.quantity} onChange={e => {
                    const items = [...newPO.items];
                    items[idx].quantity = Number(e.target.value);
                    setNewPO({ ...newPO, items });
                  }} />
                  <span className="w-20 text-right">{item.price ? `$${item.price}` : '--'}</span>
                  {newPO.items.length > 1 && (
                    <button type="button" className="btn btn-xs btn-error" onClick={() => {
                      setNewPO({ ...newPO, items: newPO.items.filter((_, i) => i !== idx) });
                    }}>Remove</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-xs btn-secondary" onClick={() => setNewPO({ ...newPO, items: [...newPO.items, { product: '', quantity: 1, price: 0 }] })}>+ Add Item</button>
            </div>
            <label className="block mb-2">Comment/Notes
              <textarea className="input input-bordered w-full" value={newPO.notes} onChange={e => setNewPO({ ...newPO, notes: e.target.value })} />
            </label>
            <div className="flex justify-end space-x-2">
              <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create PO'}</button>
            </div>
          </form>
        </div>
      )}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form onSubmit={handleCreateTask} className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold mb-2">Create Task for PO</h3>
            <label className="block mb-2">Type
              <select className="input input-bordered w-full" required value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })}>
                <option value="">Select type</option>
                <option value="Picking">Picking</option>
                <option value="Packing">Packing</option>
                <option value="Quality Check">Quality Check</option>
                <option value="Shipping">Shipping</option>
              </select>
            </label>
            <label className="block mb-2">Assigned To
              <input className="input input-bordered w-full" required value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} placeholder="Assignee name or email" />
            </label>
            <label className="block mb-2">Details
              <textarea className="input input-bordered w-full" required value={newTask.details} onChange={e => setNewTask({ ...newTask, details: e.target.value })} />
            </label>
            <label className="block mb-2">Deadline
              <input type="date" className="input input-bordered w-full" required value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} />
            </label>
            <div className="flex justify-end space-x-2">
              <button type="button" className="btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create Task</button>
            </div>
          </form>
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Delivery Date</th>
              <th className="px-4 py-2 text-left">DO</th>
              <th className="px-4 py-2 text-left">Invoice</th>
              <th className="px-4 py-2 text-left">Actions</th>
              <th className="px-4 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr key={order.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                <td className="px-4 py-2 font-mono">{order.id.slice(-6)}</td>
                <td className="px-4 py-2 capitalize">{order.status}</td>
                <td className="px-4 py-2">{order.deliveryDate ? dayjs(order.deliveryDate).format('YYYY-MM-DD') : '--'}</td>
                <td className="px-4 py-2">{order.doCreated ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">{order.invoiceUrl ? <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a> : '--'}</td>
                <td className="px-4 py-2 space-x-2">
                  {/* Approve: for manager/superadmin, pending, not cancelled/delivered */}
                  {(currentUser?.role === 'manager' || currentUser?.role === 'superadmin') && order.status === 'pending' && !isInactive(order) && (
                    <button onClick={() => handleApprove(order.id)} className="btn-primary btn-xs">Approve</button>
                  )}
                  {/* Create Task: for manager/superadmin, processing, not cancelled/delivered */}
                  {(currentUser?.role === 'manager' || currentUser?.role === 'superadmin') && order.status === 'processing' && !isInactive(order) && (
                    <button onClick={() => navigate(`/tasks?po=${order.id}`)} className="btn-primary btn-xs">Create Task</button>
                  )}
                  {/* Create/Switch DO: for user, processing, not cancelled/delivered */}
                  {currentUser?.role === 'user' && order.status === 'processing' && !isInactive(order) && (
                    <>
                      {order.doCreated ? (
                        <>
                          <button 
                            onClick={() => navigate(`/delivery-orders/${order.doId}`)}
                            className="btn-primary btn-xs whitespace-nowrap flex items-center gap-1"
                            title="View Delivery Order"
                          >
                            <Eye className="w-3 h-3" />
                            View DO
                          </button>
                          <button 
                            onClick={() => handleCreateDO(order.id)}
                            className="btn-warning btn-xs whitespace-nowrap"
                          >
                            Switch to DO
                          </button>
                        </>
                      ) : areAllTasksCompleted(order.id) ? (
                        <button 
                          onClick={() => handleCreateDO(order.id)}
                          className="btn-warning btn-xs whitespace-nowrap bg-yellow-500 hover:bg-yellow-600"
                        >
                          Create DO
                        </button>
                      ) : (
                        <div className="dropdown dropdown-hover">
                          <div tabIndex={0} role="button" className="btn btn-primary btn-xs">
                            Actions <ChevronDown className="w-3 h-3 ml-1" />
                          </div>
                          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li><button onClick={() => handleCreateDO(order.id)}>Create DO</button></li>
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {/* Mark as Shipping: for user, processing, DO created, not cancelled/delivered */}
                  {currentUser?.role === 'user' && order.status === 'processing' && order.doCreated && !isInactive(order) && (
                    <button onClick={() => handleAdvance(order.id, 'shipping')} className="btn-primary btn-xs">Mark as Shipping</button>
                  )}
                  {/* Mark as Delivered: for user, shipping, not cancelled/delivered */}
                  {currentUser?.role === 'user' && order.status === 'shipping' && !isInactive(order) && (
                    <button onClick={() => handleAdvance(order.id, 'delivered')} className="btn-primary btn-xs">Mark as Delivered</button>
                  )}
                  {/* Complete and Switch/View DO: for user, delivered, not cancelled */}
                  {console.log('Rendering order:', order.id, 'status:', order.status, 'doCreated:', order.doCreated, 'isInactive:', isInactive(order), 'user role:', currentUser?.role)}
                  {currentUser?.role === 'user' && order.status === 'delivered' && !isInactive(order) && (
                    <div className="flex flex-wrap gap-2">
                      {/* Complete button */}
                      <button 
                        onClick={() => handleComplete(order.id)} 
                        className="btn-success btn-xs whitespace-nowrap"
                      >
                        Complete
                      </button>
                      
                      {/* View DO button */}
                      {order.doCreated && order.doId ? (
                        <div className="relative z-50">
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              console.log('View DO button clicked for order:', order.id);
                              
                              // Set loading state and show form
                              setIsLoadingDO(true);
                              setShowDOForm(true);
                              setCurrentPOId(order.id);
                              
                              try {
                                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
                                console.log(`Fetching DO data for ID: ${order.doId}`);
                                
                                const response = await fetch(`${API_BASE_URL}/api/delivery-orders/${order.doId}`, {
                                  method: 'GET',
                                  headers: { 
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                  }
                                });
                                
                                console.log('DO fetch response status:', response.status);
                                
                                if (!response.ok) {
                                  const errorText = await response.text();
                                  console.error('Failed to fetch DO:', response.status, response.statusText, errorText);
                                  throw new Error(`Failed to load delivery order: ${response.status} ${response.statusText}`);
                                }
                                
                                const doData = await response.json();
                                console.log('Fetched DO data:', doData);
                                
                                // Ensure we have the expected data structure
                                const formattedData = {
                                  ...doData,
                                  // Ensure items array is properly formatted
                                  items: Array.isArray(doData.items) ? doData.items : [],
                                  // Map any other fields that might have different names
                                  doNumber: doData.doNumber || doData.do_number || '',
                                  doDate: doData.doDate || doData.do_date || doData.createdAt,
                                  supplierName: doData.supplierName || doData.supplier_name || '',
                                  supplierNumber: doData.supplierNumber || doData.supplier_number || '',
                                  deliveryAddress: doData.deliveryAddress || doData.delivery_address || ''
                                };
                                
                                console.log('Formatted DO data:', formattedData);
                                setCurrentDOData(formattedData);
                              } catch (error) {
                                console.error('Error fetching DO:', error);
                                toast.error(error instanceof Error ? error.message : 'Error loading delivery order');
                                setShowDOForm(false);
                              } finally {
                                setIsLoadingDO(false);
                              }
                            }}
                            className="btn btn-primary btn-xs flex items-center gap-1"
                            title="View Delivery Order"
                          >
                            <Eye className="w-3 h-3" />
                            View DO
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {!order.doCreated ? 'DO not created' : 'DO ID missing'}
                        </div>
                      )}
                      
                      {/* Switch to DO button - show if DO is created */}
                      {order.doCreated && (
                        <button 
                          onClick={async (e) => {
                            console.log('Switch to DO clicked for order:', order.id);
                            e.stopPropagation();
                            try {
                              console.log('Calling handleCreateDO for order:', order.id);
                              await handleCreateDO(order.id);
                              console.log('handleCreateDO completed for order:', order.id);
                            } catch (error) {
                              console.error('Error in handleCreateDO:', error);
                            }
                          }}
                          className="btn-warning btn-xs whitespace-nowrap bg-yellow-500 hover:bg-yellow-600"
                        >
                          Switch to DO
                        </button>
                      )}
                    </div>
                  )}
                  {/* Generate Invoice: for manager/superadmin, delivered, not cancelled, invoice not generated */}
                  {(currentUser?.role === 'manager' || currentUser?.role === 'superadmin') && order.status === 'delivered' && !order.invoiceUrl && (
                    <button onClick={() => handleGenerateInvoice(order.id)} className="btn-primary btn-xs">Generate Invoice</button>
                  )}
                  {/* Cancel: for manager/superadmin, pending/processing, not delivered/cancelled */}
                  {(currentUser?.role === 'manager' || currentUser?.role === 'superadmin') && (order.status === 'pending' || order.status === 'processing') && !isInactive(order) && (
                    <button onClick={() => handleCancel(order.id)} className="btn-danger btn-xs">Cancel</button>
                  )}
                  {/* Show status if cancelled */}
                  {order.status === 'cancelled' && <span className="text-red-500 font-semibold">Cancelled</span>}
                </td>
                <td className="px-4 py-2">
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDetails(true);
                    }}
                    className="btn btn-ghost btn-xs"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order #{selectedOrder.id.slice(-6)}
              </h2>
              <button 
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Order Information
                  </h3>
                  <div className="pl-6 space-y-1">
                    <p><span className="text-gray-500">Status:</span> 
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedOrder.status}
                      </span>
                    </p>
                    <p><span className="text-gray-500">Created:</span> {dayjs(selectedOrder.date).format('YYYY-MM-DD HH:mm')}</p>
                    <p><span className="text-gray-500">Created By:</span> {selectedOrder.createdBy?.name || 'System'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Delivery Information
                  </h3>
                  <div className="pl-6 space-y-1">
                    <p><span className="text-gray-500">Delivery Date:</span> {selectedOrder.deliveryDate ? dayjs(selectedOrder.deliveryDate).format('YYYY-MM-DD') : 'Not set'}</p>
                    <div className="flex items-center">
                      <span className="text-gray-500">DO Created:</span> 
                      {(selectedOrder.doCreated || selectedOrder.status === 'Yes') ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                          <span className="text-xs text-gray-500 ml-1">
                            Yes (ID: {selectedOrder.doId || 'N/A'})
                          </span>
                        </>
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500 ml-2" />
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {(selectedOrder.doCreated || selectedOrder.status === 'Yes') && selectedOrder.doId && (
                        <div className="w-full">
                          <button
                            onClick={async () => {
                              try {
                                setShowOrderDetails(false);
                                setCurrentPOId(selectedOrder.id);
                                
                                // Fetch the DO details
                                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
                                const response = await fetch(`${API_BASE_URL}/api/delivery-orders/${selectedOrder.doId}`, {
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  }
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Failed to fetch delivery order');
                                }
                                
                                const doData = await response.json();
                                
                                // Store the DO data in state
                                setCurrentDOData(doData);
                                
                                // Open the DO form in view mode
                                setShowDOForm(true);
                                
                              } catch (error) {
                                console.error('Error loading delivery order:', error);
                                toast.error('Failed to load delivery order');
                                setShowOrderDetails(true);
                              }
                            }}
                            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md border border-blue-200 flex items-center justify-center gap-2 transition-colors duration-200"
                          >
                            <Truck className="w-5 h-5" />
                            <span>View Delivery Order</span>
                            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              DO #{selectedOrder.doId.slice(-6).toUpperCase()}
                            </span>
                          </button>
                          <p className="mt-1 text-xs text-gray-500 text-center">
                            Click to view full delivery order details
                          </p>
                        </div>
                      )}
                      {selectedOrder.invoiceUrl && (
                        <a 
                          href={selectedOrder.invoiceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          View Invoice
                        </a>
                      )}
                      {selectedOrder.doCreated && (
                        <button
                          onClick={() => {
                            setShowOrderDetails(false);
                            if (selectedOrder.doId) {
                              navigate(`/delivery-orders/${selectedOrder.doId}`);
                            } else {
                              toast.error('Delivery Order ID not found');
                            }
                          }}
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                          disabled={!selectedOrder.doId}
                        >
                          <Eye className="w-4 h-4" />
                          View Delivery Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Order Items
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <div className="font-medium">{item.product?.name || `Item ${index + 1}`}</div>
                            {item.product?.description && (
                              <div className="text-xs text-gray-500">{item.product.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">${item.price?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            ${(item.quantity * (item.price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Total:</td>
                        <td className="px-4 py-2 text-right font-bold">
                          ${selectedOrder.items?.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Order Notes
                  </h3>
                  <div className="mt-6 border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedOrder.notes || 'No notes available'}</p>
              </div>
              
              {/* Debug Section - Can be removed in production */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">Debug Information</h3>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify({
                    orderId: selectedOrder.id,
                    doCreated: selectedOrder.doCreated,
                    doId: selectedOrder.doId,
                    hasViewDOButton: selectedOrder.doCreated && selectedOrder.doId
                  }, null, 2)}
                </pre>
              </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end space-x-3">
              <button 
                onClick={() => setShowOrderDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
