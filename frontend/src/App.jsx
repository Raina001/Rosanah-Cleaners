import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './utils/api';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Board from './pages/Board';
import Delivery from './pages/Delivery';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import More from './pages/More';
import BulkMessage from './pages/BulkMessage';
import WhatsappInbox from './pages/WhatsappInbox';
import ActivityLog from './pages/ActivityLog';
import InstallApp from './pages/InstallApp';
import Review from './pages/Review';
import Reviews from './pages/Reviews';
import Setup from './pages/Setup';
import ResetPassword from './pages/ResetPassword';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PageHeader({ title }) {
  return (
    <div className="page-header">
      <span className="header-logo">Rosanah</span>
      <h2>{title}</h2>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [setupComplete, setSetupComplete] = useState(null);

  useEffect(() => {
    api.get('/auth/setup-status')
      .then(data => setSetupComplete(data.setup_complete))
      .catch(() => setSetupComplete(true));
  }, []);

  // Check for public routes first (no setup/login needed)
  if (window.location.pathname.startsWith('/review') || window.location.pathname.startsWith('/reset-password')) {
    return (
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (loading || setupComplete === null) {
    return (
      <div className="loading-screen">
        <div style={{ color: 'var(--pink)', display: 'flex', justifyContent: 'center' }}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="48" height="48"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25V21m0 0H3.75A2.25 2.25 0 011.5 18.75V7.5A2.25 2.25 0 013.75 5.25h16.5A2.25 2.25 0 0122.5 7.5v11.25A2.25 2.25 0 0120.25 21H15.75m-9 0h9" /></svg></div>
        <div className="logo">Rosanah Cleaners</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!setupComplete && !user) {
    return <Setup />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Routes>
        <Route path="/review" element={<Review />} />

        <Route path="/" element={
          <PrivateRoute>
            <PageHeader title="Dashboard" />
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/new-order" element={
          <PrivateRoute roles={['admin', 'reception']}>
            <PageHeader title="New Order" />
            <NewOrder />
          </PrivateRoute>
        } />

        <Route path="/board" element={
          <PrivateRoute>
            <PageHeader title="Operations Board" />
            <Board />
          </PrivateRoute>
        } />

        <Route path="/delivery" element={
          <PrivateRoute roles={['admin', 'driver']}>
            <Delivery />
          </PrivateRoute>
        } />

        <Route path="/orders" element={
          <PrivateRoute roles={['admin', 'reception']}>
            <PageHeader title="All Orders" />
            <Orders />
          </PrivateRoute>
        } />

        <Route path="/orders/:id" element={
          <PrivateRoute>
            <OrderDetail />
          </PrivateRoute>
        } />

        <Route path="/customers" element={
          <PrivateRoute roles={['admin', 'reception']}>
            <PageHeader title="Customers" />
            <Customers />
          </PrivateRoute>
        } />

        <Route path="/customers/:id" element={
          <PrivateRoute roles={['admin', 'reception']}>
            <CustomerDetail />
          </PrivateRoute>
        } />

        <Route path="/reports" element={
          <PrivateRoute roles={['admin']}>
            <PageHeader title="Reports" />
            <Reports />
          </PrivateRoute>
        } />

        <Route path="/reviews" element={
          <PrivateRoute roles={['admin']}>
            <PageHeader title="Customer Reviews" />
            <Reviews />
          </PrivateRoute>
        } />

        <Route path="/settings" element={
          <PrivateRoute>
            <PageHeader title="Settings" />
            <Settings />
          </PrivateRoute>
        } />

        <Route path="/more" element={
          <PrivateRoute>
            <PageHeader title="More" />
            <More />
          </PrivateRoute>
        } />

        <Route path="/install" element={
          <PrivateRoute>
            <PageHeader title="Install App" />
            <InstallApp />
          </PrivateRoute>
        } />

        <Route path="/activity" element={
          <PrivateRoute roles={['admin']}>
            <PageHeader title="Activity Log" />
            <ActivityLog />
          </PrivateRoute>
        } />

        <Route path="/bulk-message" element={<PrivateRoute roles={["admin"]}><PageHeader title="Bulk Message" /><BulkMessage /></PrivateRoute>} />

        <Route path="/whatsapp-inbox" element={
          <PrivateRoute roles={['admin', 'reception']}>
            <PageHeader title="WhatsApp Inbox" />
            <WhatsappInbox />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
