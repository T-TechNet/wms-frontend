import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PurchaseOrder {
  id: string;
  items: any[];
  createdBy: any;
  date: string;
  deliveryDate: string;
  notes?: string;
  status: 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
  doCreated?: boolean;
  invoiceUrl?: string;
}

export default function POManagementPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
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
  const [newTask, setNewTask] = useState({
    type: '',
    assignedTo: '',
    details: '',
    deadline: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}'));
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/purchase-orders');
      setOrders(Array.isArray(data) ? data.map((o: any) => ({ ...o, id: o._id })) : []);
    } catch {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if PO is cancelled or delivered
  const isInactive = (order: PurchaseOrder) => order.status === 'cancelled' || order.status === 'delivered';

  const showApiError = (err: any, fallback: string) => {
    if (err && err.data && err.data.message) toast.error(err.data.message);
    else if (err && err.message) toast.error(err.message);
    else toast.error(fallback);
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

  const handleCreateDO = async (id: string) => {
    try {
      await apiRequest(`/api/purchase-orders/${id}/do`, { method: 'PATCH' });
      toast.success('DO created');
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to create DO');
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
    if (!window.confirm('Are you sure you want to cancel this PO?')) return;
    try {
      await apiRequest(`/api/purchase-orders/${id}/cancel`, { method: 'PATCH' });
      toast.success('PO cancelled');
      fetchOrders();
    } catch (err: any) {
      showApiError(err, 'Failed to cancel PO');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiRequest('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(newPO),
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('PO created');
      setShowCreateModal(false);
      setNewPO({ customer: '', deliveryDate: '', items: [{ product: '', quantity: 1, price: 0 }], notes: '' });
      fetchOrders();
    } catch {
      toast.error('Failed to create PO');
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
                  {/* Approve: only for manager, pending, not cancelled/delivered */}
                  {currentUser?.role === 'manager' && order.status === 'pending' && !isInactive(order) && (
                    <button onClick={() => handleApprove(order.id)} className="btn-primary btn-xs">Approve</button>
                  )}
                  {/* Create Task: only for manager, processing, not cancelled/delivered */}
                  {currentUser?.role === 'manager' && order.status === 'processing' && !isInactive(order) && (
                    <button onClick={() => navigate(`/tasks?po=${order.id}`)} className="btn-primary btn-xs">Create Task</button>
                  )}
                  {/* Create DO: only for user, processing, not cancelled/delivered, DO not created */}
                  {currentUser?.role === 'user' && order.status === 'processing' && !order.doCreated && !isInactive(order) && (
                    <button onClick={() => handleCreateDO(order.id)} className="btn-primary btn-xs">Create DO</button>
                  )}
                  {/* Mark as Shipping: only for user, processing, DO created, not cancelled/delivered */}
                  {currentUser?.role === 'user' && order.status === 'processing' && order.doCreated && !isInactive(order) && (
                    <button onClick={() => handleAdvance(order.id, 'shipping')} className="btn-primary btn-xs">Mark as Shipping</button>
                  )}
                  {/* Mark as Delivered: only for user, shipping, not cancelled/delivered */}
                  {currentUser?.role === 'user' && order.status === 'shipping' && !isInactive(order) && (
                    <button onClick={() => handleAdvance(order.id, 'delivered')} className="btn-primary btn-xs">Mark as Delivered</button>
                  )}
                  {/* Generate Invoice: only for manager, delivered, not cancelled, invoice not generated */}
                  {currentUser?.role === 'manager' && order.status === 'delivered' && !order.invoiceUrl && (
                    <button onClick={() => handleGenerateInvoice(order.id)} className="btn-primary btn-xs">Generate Invoice</button>
                  )}
                  {/* Cancel: only for manager, pending/processing, not delivered/cancelled */}
                  {currentUser?.role === 'manager' && (order.status === 'pending' || order.status === 'processing') && !isInactive(order) && (
                    <button onClick={() => handleCancel(order.id)} className="btn-danger btn-xs">Cancel</button>
                  )}
                  {/* Show status if cancelled */}
                  {order.status === 'cancelled' && <span className="text-red-500 font-semibold">Cancelled</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
