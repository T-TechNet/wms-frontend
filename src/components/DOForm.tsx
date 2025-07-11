import React, { useState, useEffect } from 'react';
import { X, User, Phone, Search, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';

interface DOInfo {
  id: string;
  doNumber: string;
  doDate: string;
  supplierName: string;
  supplierNumber: string;
  supplierAddress?: string;
  deliveryAddress: string;
  deliveryDate: string;
  status: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  shippingMethod: string;
  paymentTerms: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface DOFormProps {
  poId: string;
  onClose: () => void;
  onSuccess: (doId?: string | null, responseData?: any) => void;
  doData?: any; // Add this line to accept DO data
}

const DOForm: React.FC<DOFormProps> = ({ poId, onClose, onSuccess, doData }) => {
  // State declarations at the top
  const [formData, setFormData] = useState({
    doNumber: '',
    doDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierNumber: '',
    supplierAddress: '',
    deliveryAddress: '',
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    paymentTerms: 'Net 30',
    shippingMethod: 'Standard',
    items: [{
      productName: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      total: 0
    }],
    totalAmount: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DOInfo[]>([]);
  const [viewMode, setViewMode] = useState<'create' | 'view' | 'edit'>('create');
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  // Load DO data when component mounts or doData changes
  useEffect(() => {
    console.group('DOForm: doData effect');
    console.log('doData:', doData);
    
    try {
      const initializeForm = () => {
        try {
          if (doData) {
            console.log('Setting view mode to view and loading DO data');
            setViewMode('view');
            loadDO(doData);
          } else {
            console.log('No doData provided, setting view mode to create');
            setViewMode('create');
            // Reset form data when switching to create mode
            setFormData({
              doNumber: '',
              doDate: new Date().toISOString().split('T')[0],
              supplierName: '',
              supplierNumber: '',
              supplierAddress: '',
              deliveryAddress: '',
              deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: '',
              terms: '',
              paymentTerms: 'Net 30',
              shippingMethod: 'Standard',
              items: [{
                productName: '',
                quantity: 1,
                unit: 'pcs',
                unitPrice: 0,
                total: 0
              }],
              totalAmount: 0
            });
          }
        } catch (error) {
          console.error('Error initializing form:', error);
          setError('Failed to initialize form');
          toast.error('Failed to initialize form');
        }
      };
      
      initializeForm();
    } catch (err) {
      console.error('Error in DOForm effect:', err);
      setError('Failed to load delivery order data');
      toast.error('Failed to load delivery order');
    } finally {
      console.groupEnd();
    }
    
    return () => {
      console.log('DOForm: Cleaning up doData effect');
    };
  }, [doData]);

  // This effect is no longer needed as we handle the view mode in the first effect
  // Keeping this comment to show we intentionally removed the duplicate effect

  // Generate DO number based on timestamp
  useEffect(() => {
    const generateDONumber = () => {
      // Generate a unique DO number using current date and timestamp
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const newDONumber = `DO-${year}${month}${day}-${timestamp}`;
      
      setFormData(prev => ({
        ...prev,
        doNumber: newDONumber
      }));
    };

    generateDONumber();
  }, []);
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('Submitting form data:', formData);
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const requestBody = {
        ...formData,
        doDate: new Date(formData.doDate).toISOString(),
        deliveryDate: new Date(formData.deliveryDate).toISOString(),
        status: 'Pending',
        createdBy: localStorage.getItem('userId')
      };
      
      console.log('Sending request to:', `${API_BASE_URL}/api/purchase-orders/${poId}/do`);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/purchase-orders/${poId}/do`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create delivery order');
      }

      const responseData = await response.json();
      console.log('API Response:', responseData);
      
      // Log the full response for debugging
      console.log('Full API Response:', JSON.stringify(responseData, null, 2));
      
      // Try to extract the DO ID from different possible response structures
      const doId = responseData.id || responseData.doId || responseData.data?.id || 
                 (responseData.order && (responseData.order._id || responseData.order.id || responseData.order.doId)) || null;
      
      console.log('Extracted DO ID:', doId);
      console.log('Full response data:', JSON.stringify(responseData, null, 2));
      
      if (!doId) {
        console.warn('No DO ID found in response. Full response:', responseData);
        toast.error('Error: Could not create delivery order - missing ID in response');
        return;
      }
      
      // After successful creation, show success message
      toast.success('Delivery Order created successfully');
      
      // Pass both the DO ID and the full response data to the parent component
      console.log('Calling onSuccess with:', { doId, responseData });
      onSuccess(doId, responseData);
      
      // Close the modal
      console.log('Closing DO form');
      onClose();
      
      // If we have a redirect URL in the response, navigate to it
      if (responseData.redirectUrl) {
        console.log('Navigating to:', responseData.redirectUrl);
        navigate(responseData.redirectUrl);
      }
      
    } catch (error) {
      console.error('Error creating DO:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create delivery order';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await apiRequest<DOInfo[]>(`/api/delivery-orders/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response || []);
    } catch (error) {
      console.error('Error searching DOs:', error);
      toast.error('Failed to search delivery orders');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadDO = (doInfo: any) => {
    console.group('DOForm: loadDO');
    console.log('Raw DO data:', JSON.parse(JSON.stringify(doInfo)));
    
    if (!doInfo) {
      console.warn('No DO info provided to loadDO');
      console.groupEnd();
      return;
    }
    
    // Format dates if they exist
    const formatDate = (dateString: string, fieldName: string = 'unknown') => {
      if (!dateString) {
        console.log(`No date provided for ${fieldName}, using current date`);
        return new Date().toISOString().split('T')[0];
      }
      
      try {
        // Handle both ISO strings and YYYY-MM-DD formats
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for ${fieldName}: ${dateString}, using as-is`);
          return dateString.split('T')[0];
        }
        const formatted = date.toISOString().split('T')[0];
        console.log(`Formatted date ${fieldName}: ${dateString} -> ${formatted}`);
        return formatted;
      } catch (e) {
        console.error(`Error formatting date for ${fieldName}:`, e, 'dateString:', dateString);
        return new Date().toISOString().split('T')[0];
      }
    };

    // Ensure items array is properly formatted
    const formatItems = (items: any[]) => {
      if (!items || !Array.isArray(items)) {
        console.log('No valid items array found, using default item');
        return [{
          productName: '',
          quantity: 1,
          unit: 'pcs',
          unitPrice: 0,
          total: 0
        }];
      }
      
      return items.map(item => ({
        productName: item.productName || '',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'pcs',
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
      }));
    };

    const newFormData = {
      doNumber: doInfo.doNumber || `DO-${Date.now().toString().slice(-6)}`,
      doDate: formatDate(doInfo.doDate || doInfo.createdAt, 'doDate/createdAt'),
      supplierName: doInfo.supplierName || '',
      supplierNumber: doInfo.supplierNumber || '',
      supplierAddress: doInfo.supplierAddress || '',
      deliveryAddress: doInfo.deliveryAddress || '',
      deliveryDate: formatDate(doInfo.deliveryDate || doInfo.expectedDeliveryDate, 'deliveryDate'),
      notes: doInfo.notes || '',
      terms: doInfo.terms || doInfo.paymentTerms || 'Net 30',
      paymentTerms: doInfo.paymentTerms || 'Net 30',
      shippingMethod: doInfo.shippingMethod || 'Standard',
      items: formatItems(doInfo.items),
      totalAmount: doInfo.totalAmount || 0
    };

    console.log('New form data to be set:', newFormData);
    
    setFormData(prev => ({
      ...prev,
      ...newFormData
    }));
    
    console.groupEnd();
  };

  // Debug info for development
  const debugInfo = {
    viewMode,
    poId,
    hasDoData: !!doData,
    doData: doData,
    doDataKeys: doData ? Object.keys(doData) : [],
    formData,
    currentTime: new Date().toISOString(),
    isLoading: isSubmitting,
    error
  };
  
  // Log debug info in development
  if (import.meta.env.DEV) {
    console.log('DOForm debug info:', debugInfo);
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Delivery Order</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle adding a new item to the form
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { productName: '', quantity: 1, unit: 'pcs', unitPrice: 0, total: 0 }
      ]
    }));
  };

  // Handle removing an item from the form
  const removeItem = (index: number) => {
    if ((formData.items?.length || 0) <= 1) return; // Keep at least one item
    
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index) || []
    }));
  };

  // Handle changes to item fields
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate total if quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : (newItems[index]?.quantity || 1);
      const unitPrice = field === 'unitPrice' ? Number(value) : (newItems[index]?.unitPrice || 0);
      item.total = quantity * unitPrice;
    }
    
    newItems[index] = item;
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold">
            {viewMode === 'create' ? 'Create' : 'View'} Delivery Order
            {formData.doNumber && ` #${formData.doNumber}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DO Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DO Number *
                </label>
                <input
                  type="text"
                  name="doNumber"
                  value={formData.doNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  required
                />
              </div>
              
              {/* DO Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DO Date *
                </label>
                <input
                  type="date"
                  name="doDate"
                  value={formData.doDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  required
                />
              </div>
              
              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  required
                />
              </div>
              
              {/* Supplier Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Number
                </label>
                <input
                  type="text"
                  name="supplierNumber"
                  value={formData.supplierNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                />
              </div>
              
              {/* Supplier Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Address
                </label>
                <textarea
                  name="supplierAddress"
                  value={formData.supplierAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  rows={2}
                />
              </div>
              
              {/* Delivery Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  rows={2}
                  required
                />
              </div>
              
              {/* Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  required
                />
              </div>
              
              {/* Shipping Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Method *
                </label>
                <select
                  name="shippingMethod"
                  value={formData.shippingMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  required
                >
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Overnight">Overnight</option>
                  <option value="Pickup">Customer Pickup</option>
                </select>
              </div>
              
              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms *
                </label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  required
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
              
              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={viewMode === 'view'}
                  rows={3}
                />
              </div>
            </div>
            
            {/* Items Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Items</h3>
                {viewMode !== 'view' && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {formData.items?.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={viewMode === 'view'}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={viewMode === 'view'}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={viewMode === 'view'}
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="l">l</option>
                          <option value="m">m</option>
                          <option value="box">box</option>
                          <option value="set">set</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                            className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            disabled={viewMode === 'view'}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-end">
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                          <div className="px-3 py-2 bg-gray-50 rounded-md">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                        </div>
                        {viewMode !== 'view' && formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="ml-2 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                      <span className="text-sm text-gray-900">
                        ${formData.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 my-1"></div>
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-gray-900">Total:</span>
                      <span className="text-base font-semibold text-gray-900">
                        ${formData.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
            <div className="text-sm text-gray-500">
              * Required fields
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {viewMode === 'view' ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : viewMode === 'edit' ? 'Update Delivery Order' : 'Create Delivery Order'}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DOForm;
