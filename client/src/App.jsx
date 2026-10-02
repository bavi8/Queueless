import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import OrgPage from './pages/OrgPage';
import QueueJoinPage from './pages/QueueJoinPage';
import TrackerPage from './pages/TrackerPage';
import StaffLogin from './pages/StaffLogin';
import StaffRegister from './pages/StaffRegister';
import StaffDashboard from './pages/StaffDashboard';
import QueueManagePage from './pages/QueueManagePage';

function ProtectedRoute({ children }) {
  const { staff, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="loading-spinner" />
    </div>
  );
  return staff ? children : <Navigate to="/staff/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/org/:slug" element={<OrgPage />} />
        <Route path="/queue/:queueId/join" element={<QueueJoinPage />} />
        <Route path="/queue/:queueId/track" element={<TrackerPage />} />

        {/* Staff auth */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff/register" element={<StaffRegister />} />

        {/* Staff protected */}
        <Route path="/staff/dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/queue/:queueId" element={<ProtectedRoute><QueueManagePage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
