import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UserManagementPage from './pages/UserManagementPage';
import ProductManagementPage from './pages/ProductManagementPage';
import CustomerManagementPage from './pages/CustomerManagementPage';
import POManagementPage from './pages/POManagementPage';
import TaskManagementPage from './pages/TaskManagementPage';
import RoleManagementPage from './pages/RoleManagementPage';
import UserProfilePage from './pages/UserProfilePage';
import LogViewerPage from './pages/LogViewerPage';
import DeliveryOrderPage from './pages/DeliveryOrderPage';
import ViewDOPage from './pages/ViewDOPage';

// This component handles the protected routes and layout
const AppContent = () => {
  const { user, loading, logout: handleLogout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Dashboard />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/users"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <UserManagementPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/products"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ProductManagementPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/customers"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CustomerManagementPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/orders"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <POManagementPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/tasks"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <TaskManagementPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/roles"
            element={
              user && user.role === 'superadmin' ? (
                <Layout user={user} onLogout={handleLogout}>
                  <RoleManagementPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <UserProfilePage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/logs"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <LogViewerPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/delivery-orders"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <DeliveryOrderPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/delivery-orders/:doId"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ViewDOPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/delivery-order/:taskId/:poId"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <DeliveryOrderPage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

// Main App component that wraps everything with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
