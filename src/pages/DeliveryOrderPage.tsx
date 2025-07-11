import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import DeliveryOrderForm from '../components/DeliveryOrderForm';
import type { DOFormData } from '../components/DeliveryOrderForm';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';

interface Task {
  _id: string;
  orderId: string;
  purchaseOrderId?: string;
  poId?: string;
  type: string;
  status: string;
  details: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  purchaseOrder?: {
    _id: string;
    number: string;
    supplier?: {
      name: string;
      address: string;
      contact: string;
      phone?: string;
      email?: string;
    };
    items?: Array<{
      productId: string;
      name: string;
      description?: string;
      quantity: number;
      unit: string;
      price: number;
    }>;
    deliveryAddress?: string;
  };
}

const DeliveryOrderPage: React.FC = () => {
  const { taskId, poId } = useParams<{ taskId: string; poId: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) return;
      
      try {
        const data = await apiRequest<Task>(`/api/tasks/${taskId}`);
        setTask(data);
      } catch (err) {
        console.error('Failed to fetch task:', err);
        setError('Failed to load task details');
        toast.error('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleSubmit = async (formData: DOFormData) => {
    if (!taskId || !poId) {
      throw new Error('Missing task or purchase order information');
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        taskId,
        purchaseOrderId: poId,
        status: 'Pending',
        createdBy: user?._id,
        items: formData.items.map((item: { productId: string; productName: string; quantity: number; unit: string; price: number }) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          unit: item.unit,
          price: Number(item.price)
        }))
      };

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE_URL}/api/purchase-orders/${poId}/do`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create delivery order');
      }

      await response.json();
      toast.success('Delivery Order created successfully!');
      navigate(`/tasks/${taskId}`);
    } catch (err) {
      console.error('Error creating delivery order:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create delivery order';
      setError(errorMessage);
      throw err; // Re-throw to let the form handle the error
    } finally {
      setLoading(false);
    }
  };

  const getInitialData = () => {
    if (!task?.purchaseOrder) return {};
    
    return {
      supplier: task.purchaseOrder.supplier ? {
        name: task.purchaseOrder.supplier.name || '',
        address: task.purchaseOrder.supplier.address || '',
        contact: task.purchaseOrder.supplier.contact || '',
        phone: task.purchaseOrder.supplier.phone || '',
        email: task.purchaseOrder.supplier.email || ''
      } : undefined,
      items: task.purchaseOrder.items?.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        productId: item.productId,
        productName: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        unitPrice: item.price,
        price: item.price // For backward compatibility
      })) || [],
      deliveryAddress: task.purchaseOrder.deliveryAddress || ''
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Back
          </button>
        </div>
      );
    }

    if (!task) {
      return (
        <div className="p-6">
          <p>Task not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Back
          </button>
        </div>
      );
    }

    const initialData = getInitialData();
    
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Create Delivery Order</h1>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <DeliveryOrderForm 
              taskId={taskId || ''} 
              poId={poId || ''} 
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => navigate(-1)}
            />
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default DeliveryOrderPage;
