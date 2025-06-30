import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';

export interface TaskFormValues {
  orderId: string;
  type: string;
  assignedTo: string;
  details: string;
  status: string;
  deadline: string;
}

interface TaskFormProps {
  orders: { _id: string; name?: string; orderNumber?: string }[];
  onSubmit: (values: TaskFormValues) => void;
  userRole?: string;
  selectedOrder?: string;
}

const typeOptions = ['Picking', 'Packing', 'Quality Check', 'Shipping'];
const statusOptions = ['Pending', 'In Progress', 'Completed'];

interface UserOption {
  _id: string;
  name?: string;
  email: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({ orders, onSubmit, userRole, selectedOrder }) => {
  const [form, setForm] = useState<TaskFormValues>({
    orderId: selectedOrder || orders[0]?._id || '',
    type: typeOptions[0],
    assignedTo: '',
    details: '',
    status: statusOptions[0],
    deadline: '',
  });
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    // Fetch users for assignment dropdown using apiRequest
    apiRequest('/api/users')
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          Array.isArray((data as { data: unknown }).data)
        ) {
          setUsers((data as { data: UserOption[] }).data);
        }
      })
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    // If selectedOrder changes, update form.orderId
    if (selectedOrder && selectedOrder !== form.orderId) {
      setForm(f => ({ ...f, orderId: selectedOrder }));
    }
    // eslint-disable-next-line
  }, [selectedOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm({ ...form, assignedTo: '', details: '', deadline: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="font-bold mb-2 text-lg">Create Task</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Order</label>
          <select
            name="orderId"
            value={form.orderId}
            onChange={handleChange}
            className="input-field w-full"
            required
          >
            {orders.map((order) => (
              <option key={order._id} value={order._id}>
                {order.name || order.orderNumber || `Order #${order._id.substring(order._id.length - 6)}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="input-field w-full"
            required
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Assigned To</label>
          <select
            name="assignedTo"
            value={form.assignedTo}
            onChange={handleChange}
            className="input-field w-full"
            required
          >
            <option value="">Select user</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.name || user.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Deadline</label>
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="input-field w-full"
            required
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Details</label>
          <input
            name="details"
            value={form.details}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary w-full md:w-auto">Create Task</button>
    </form>
  );
};
