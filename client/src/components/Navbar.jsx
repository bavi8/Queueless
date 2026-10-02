import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { staff, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <span className="text-gradient">QueueLess</span>
        </Link>

        <div className="navbar-nav">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            Explore
          </Link>

          {staff ? (
            <>
              <Link
                to="/staff/dashboard"
                className={`nav-link ${location.pathname.startsWith('/staff/dashboard') ? 'active' : ''}`}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LayoutDashboard size={15} />
                  Dashboard
                </span>
              </Link>
              <div style={{
                padding: '6px 12px',
                background: 'rgba(108,99,255,0.1)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'var(--primary-light)',
              }}>
                {staff.name}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/staff/login" className="btn btn-ghost btn-sm">
                Staff Login
              </Link>
              <Link to="/staff/register" className="btn btn-primary btn-sm">
                Register Org
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
