import React, { useState, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiRequest } from '../api';

export interface DOFormData {
  doNumber: string;
  poNumber: string;
  deliveryDate: string;
  deliveryAddress: string;
  notes: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    price: number;
  }>;
}

export interface DOFormData {
  doNumber: string;
  poNumber: string;
  deliveryDate: string;
  deliveryAddress: string;
  notes: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    price: number;
  }>;
}

interface DeliveryOrderFormProps {
  taskId: string;
  poId: string;
  initialData?: {
    supplier?: {
      name: string;
      address: string;
      contact: string;
      phone: string;
      email: string;
    };
    items?: Array<{
      id: string;
      productId: string;
      productName: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
    deliveryAddress?: string;
  };
  onSubmit: (formData: DOFormData) => Promise<void>;
  onCancel?: () => void;
}

export interface DOItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const DeliveryOrderForm: FC<DeliveryOrderFormProps> = ({
  taskId, 
  poId, 
  initialData = {}, 
  onSubmit, 
  onCancel 
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state with items pre-filled from PO and made read-only
  const [formData, setFormData] = useState<DOFormData>(() => {
    // If we have initial items from PO, use them and make them read-only
    if (initialData.items && initialData.items.length > 0) {
      return {
        doNumber: `DO-${new Date().getTime().toString().slice(-6)}`,
        poNumber: poId ? `PO-${String(poId).slice(-6).toUpperCase()}` : '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deliveryAddress: initialData.deliveryAddress || '',
        deliveryContact: '',
        deliveryPhone: '',
        paymentTerms: 'Net 30',
        shippingMethod: 'Standard',
        notes: '',
        supplier: {
          name: initialData.supplier?.name || '',
          address: initialData.supplier?.address || '',
          contact: initialData.supplier?.contact || '',
          phone: initialData.supplier?.phone || '',
          email: initialData.supplier?.email || ''
        },
        // Items from PO are pre-filled and will be read-only
        items: initialData.items.map(item => ({
          id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: item.productId || '',
          productName: item.productName || item.name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          unitPrice: item.unitPrice || item.price || 0,
          price: item.unitPrice || item.price || 0 // For backward compatibility
        }))
      };
    }
    
    // If no items from PO, show an error state
    console.error('No items found in purchase order');
    return {
      doNumber: `DO-${new Date().getTime().toString().slice(-6)}`,
      poNumber: poId ? `PO-${String(poId).slice(-6).toUpperCase()}` : '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliveryAddress: '',
      deliveryContact: '',
      deliveryPhone: '',
      paymentTerms: 'Net 30',
      shippingMethod: 'Standard',
      notes: 'No items found in the purchase order',
      supplier: {
        name: '',
        address: '',
        contact: '',
        phone: '',
        email: ''
      },
      items: []
    };
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof DOItem, value: string | number) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: '',
          productName: '',
          description: '',
          quantity: 1,
          unit: 'pcs',
          unitPrice: 0,
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.deliveryAddress) {
        throw new Error('Delivery address is required');
      }

      // Prepare the data to send
      const dataToSend = {
        ...formData,
        taskId,
        purchaseOrderId: poId,
        status: 'draft',
        items: formData.items.map(item => ({
          ...item,
          // For backward compatibility
          price: item.unitPrice,
          total: item.quantity * item.unitPrice
        }))
      };

      const response = await apiRequest('/api/delivery-orders', {
        method: 'POST',
        data: dataToSend
      });

      toast.success('Delivery order created successfully');
      if (onSubmit) {
        onSubmit(response.data);
      } else {
        navigate('/delivery-orders');
      }
    } catch (err) {
      console.error('Error creating delivery order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create delivery order');
      toast.error('Failed to create delivery order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create Delivery Order</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Delivery Order</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DO Number</label>
              <input
                type="text"
                name="doNumber"
                value={formData.doNumber}
                className="w-full p-2 border rounded bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Purchase Order</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
              <input
                type="text"
                name="poNumber"
                value={formData.poNumber}
                className="w-full p-2 border rounded bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input
                type="text"
                name="supplier.name"
                value={formData.supplier.name}
                onChange={(e) => {
                  const { value } = e.target;
                  setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, name: value }
                  }));
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Delivery Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Method</label>
                <select
                  name="shippingMethod"
                  value={formData.shippingMethod}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Overnight">Overnight</option>
                  <option value="Pickup">Pickup</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <h3 className="text-lg font-medium mb-4">Supplier Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="supplier.contact"
                value={formData.supplier.contact}
                onChange={(e) => {
                  const { value } = e.target;
                  setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, contact: value }
                  }));
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="supplier.phone"
                value={formData.supplier.phone}
                onChange={(e) => {
                  const { value } = e.target;
                  setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, phone: value }
                  }));
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="supplier.email"
                value={formData.supplier.email}
                onChange={(e) => {
                  const { value } = e.target;
                  setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, email: value }
                  }));
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="supplier.address"
                value={formData.supplier.address}
                onChange={(e) => {
                  const { value } = e.target;
                  setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, address: value }
                  }));
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
          <h3 className="text-lg font-medium mb-4">Delivery Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
              <textarea
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleInputChange}
                rows={2}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="deliveryContact"
                value={formData.deliveryContact}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                name="deliveryPhone"
                value={formData.deliveryPhone}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Order Items</h3>
            <span className="text-sm text-gray-500">
              {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} (from Purchase Order)
            </span>
          </div>
          
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 border rounded bg-white">
                <div className="col-span-4">
                  <input
                    type="text"
                    value={item.productName}
                    readOnly
                    className="w-full p-2 border rounded bg-gray-100"
                    required
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={item.description}
                    readOnly
                    className="w-full p-2 border rounded bg-gray-100"
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-100"
                      required
                    />
                    <select
                      value={item.unit}
                      disabled
                      className="p-2 border rounded bg-gray-100"
                    >
                      <option value={item.unit}>{item.unit}</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    readOnly
                    className="w-full p-2 border rounded bg-gray-100"
                    required
                  />
                </div>
                <div className="col-span-1"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex justify-end">
            <div className="text-right">
              <div className="font-medium">Total Quantity:</div>
              <div className="text-lg font-semibold">
                {formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            All amounts in USD
          </div>
          <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel || (() => navigate(-1))}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Delivery Order'}
          </button>
        </div>
        </div>
      </form>
    </div>
  );
};

export default DeliveryOrderForm;
