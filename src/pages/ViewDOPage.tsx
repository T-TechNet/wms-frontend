import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface DOInfo {
  id: string;
  doNumber: string;
  doDate: string;
  supplierName: string;
  supplierNumber: string;
  supplierAddress: string;
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

const ViewDOPage: React.FC = () => {
  const { doId } = useParams<{ doId: string }>();
  const navigate = useNavigate();
  const [doInfo, setDoInfo] = useState<DOInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDO = async () => {
      try {
        const data = await apiRequest<DOInfo>(`/api/delivery-orders/${doId}`);
        setDoInfo(data);
      } catch (error) {
        console.error('Error fetching DO:', error);
        toast.error('Failed to load delivery order');
      } finally {
        setIsLoading(false);
      }
    };

    if (doId) {
      fetchDO();
    }
  }, [doId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!doInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-semibold mb-4">Delivery Order Not Found</h2>
        <p className="text-gray-600 mb-6">The requested delivery order could not be found.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Orders
        </button>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Delivery Order: {doInfo.doNumber}</h1>
            <p className="text-gray-600">
              Created: {new Date(doInfo.createdAt).toLocaleDateString()}
              {doInfo.status && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  doInfo.status === 'completed' ? 'bg-green-100 text-green-800' :
                  doInfo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {doInfo.status.charAt(0).toUpperCase() + doInfo.status.slice(1)}
                </span>
              )}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Print
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Delivery Order Information
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Supplier Details</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {doInfo.supplierName}</p>
                <p><span className="font-medium">Contact:</span> {doInfo.supplierNumber}</p>
                <p><span className="font-medium">Address:</span> {doInfo.supplierAddress}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Delivery Details</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">DO Number:</span> {doInfo.doNumber}</p>
                <p><span className="font-medium">DO Date:</span> {new Date(doInfo.doDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Delivery Date:</span> {new Date(doInfo.deliveryDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Shipping Method:</span> {doInfo.shippingMethod}</p>
                <p><span className="font-medium">Payment Terms:</span> {doInfo.paymentTerms}</p>
              </div>
            </div>
          </div>

          {doInfo.deliveryAddress && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
              <p className="text-sm text-gray-700 whitespace-pre-line">{doInfo.deliveryAddress}</p>
            </div>
          )}

          {doInfo.notes && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-line">{doInfo.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Items
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doInfo.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                  Total Amount
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  ${doInfo.totalAmount?.toFixed(2) || '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewDOPage;
