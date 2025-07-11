import React, { useState, useEffect } from 'react';
import { X, User, Phone, Search } from 'lucide-react';
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
}

const DOForm: React.FC<DOFormProps> = ({ poId, onClose, onSuccess }) => {
  const navigate = useNavigate();
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
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DOInfo[]>([]);
  const [viewMode, setViewMode] = useState<'create' | 'view'>('create');

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
                 (responseData.order && (responseData.order.id || responseData.order.doId)) || null;
      
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

  const loadDO = (doInfo: DOInfo) => {
    setFormData(prev => ({
      ...prev,
      doNumber: doInfo.doNumber,
      doDate: doInfo.doDate.split('T')[0],
      supplierName: doInfo.supplierName,
      supplierNumber: doInfo.supplierNumber,
      supplierAddress: doInfo.supplierAddress || '',
      deliveryAddress: doInfo.deliveryAddress,
      deliveryDate: doInfo.deliveryDate.split('T')[0],
      // Keep existing notes if not provided in doInfo
      notes: doInfo.notes || prev.notes,
      // Use existing values as fallbacks
      terms: doInfo.paymentTerms || prev.terms,
      paymentTerms: doInfo.paymentTerms || prev.paymentTerms,
      shippingMethod: doInfo.shippingMethod || prev.shippingMethod
    }));
    setViewMode('view');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">
              {viewMode === 'create' ? 'Create' : 'View'} Delivery Order
            </h2>
            {viewMode === 'view' && (
              <button
                onClick={() => setViewMode('create')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Create New
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {viewMode === 'create' && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search DO by number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="border rounded px-3 py-1 pr-8 text-sm w-64"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Search className="w-4 h-4" />
                </button>
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => loadDO(item)}
                      >
                        <div className="font-medium">{item.doNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.doDate).toLocaleDateString()} • {item.supplierName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">DO Number *</label>
              <input
                type="text"
                name="doNumber"
                value={formData.doNumber}
                onChange={handleChange}
                className="input-field bg-gray-100"
                readOnly={viewMode === 'view'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">DO Date *</label>
              <input
                type="date"
                name="doDate"
                value={formData.doDate}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>
          
          {/* Supplier Information */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="w-5 h-5" />
              Supplier Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Supplier Name *</label>
                <input
                  type="text"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Contact Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="supplierNumber"
                    value={formData.supplierNumber}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="+1 (___) ___-____"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Supplier Address *</label>
                <input
                  type="text"
                  name="supplierAddress"
                  value={formData.supplierAddress}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Delivery Information */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">Delivery Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Shipping Method *</label>
                <select
                  name="shippingMethod"
                  value={formData.shippingMethod}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Overnight">Overnight</option>
                  <option value="Pickup">Customer Pickup</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Payment Terms *</label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="50% Advance">50% Advance</option>
                </select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Delivery Address *</label>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  className="input-field min-h-[80px]"
                  placeholder="Full delivery address with postal code"
                  required
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="input-field min-h-[80px]"
                  placeholder="Any special delivery instructions or requirements"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              * Required fields
            </div>
            <div className="flex items-center gap-3">
              {viewMode === 'view' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  View Mode
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {viewMode === 'view' ? 'Close' : 'Cancel'}
              </button>
              {viewMode === 'create' && (
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : 'Create Delivery Order'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DOForm;
