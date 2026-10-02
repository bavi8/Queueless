import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Users, Clock, ChevronRight, Trash2, Settings,
  Play, Pause, X, BarChart3, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'var(--secondary)', badge: 'badge-success' },
  paused: { label: 'Paused', color: 'var(--accent-warm)', badge: 'badge-warning' },
  closed: { label: 'Closed', color: 'var(--accent)', badge: 'badge-danger' },
};

function CreateQueueModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', avgServiceTime: 5, maxCapacity: 100 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Queue name is required');
    setLoading(true);
    try {
      const res = await axios.post('/api/queues', form);
      toast.success('Queue created!');
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create queue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card fade-in" style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3>Create New Queue</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Queue Name *</label>
            <input className="form-input" placeholder="e.g. OPD Consultation, Loan Inquiry" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="form-input" placeholder="Brief description of this queue's purpose" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Avg. Service Time (min)</label>
              <input className="form-input" type="number" min={1} max={120} value={form.avgServiceTime}
                onChange={e => setForm(f => ({ ...f, avgServiceTime: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input className="form-input" type="number" min={1} max={1000} value={form.maxCapacity}
                onChange={e => setForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Creating...' : <><Plus size={16} /> Create Queue</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { staff } = useAuth();
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const org = staff?.organization;

  useEffect(() => {
    if (!org) return;
    axios.get(`/api/queues/org/${org._id}`)
      .then(res => setQueues(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [org]);

  const handleDelete = async (queueId) => {
    if (!window.confirm('Delete this queue and all its entries?')) return;
    try {
      await axios.delete(`/api/queues/${queueId}`);
      setQueues(q => q.filter(x => x._id !== queueId));
      toast.success('Queue deleted');
    } catch {
      toast.error('Failed to delete queue');
    }
  };

  const handleToggleStatus = async (queue) => {
    const newStatus = queue.status === 'active' ? 'paused' : 'active';
    try {
      await axios.put(`/api/queues/${queue._id}`, { status: newStatus });
      setQueues(qs => qs.map(q => q._id === queue._id ? { ...q, status: newStatus } : q));
      toast.success(`Queue ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch {
      toast.error('Failed to update queue');
    }
  };

  const totalWaiting = queues.reduce((sum, q) => sum + (q.waitingCount || 0), 0);
  const activeQueues = queues.filter(q => q.status === 'active').length;

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="live-indicator mb-2" style={{ display: 'inline-flex' }}>
              <span className="dot dot-green dot-pulse" />
              Staff Dashboard
            </div>
            <h1 style={{ fontSize: '1.75rem' }}>{org?.name}</h1>
            <p className="text-muted mt-1">{org?.type ? org.type.charAt(0).toUpperCase() + org.type.slice(1) : ''} · Manage your queues</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Queue
          </button>
        </div>

        {/* Stats row */}
        <div className="grid-4 mb-6">
          {[
            { label: 'Total Queues', value: queues.length, icon: BarChart3, color: '#6c63ff' },
            { label: 'Active Queues', value: activeQueues, icon: Play, color: '#00d4aa' },
            { label: 'People Waiting', value: totalWaiting, icon: Users, color: '#ffd166' },
            { label: 'Avg. Service Time', value: queues.length ? Math.round(queues.reduce((s, q) => s + q.avgServiceTime, 0) / queues.length) + ' min' : '—', icon: Clock, color: '#ff9f43' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="text-sm text-muted">{stat.label}</span>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={stat.color} />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Share link */}
        {org && (
          <div className="card mb-6" style={{ background: 'var(--gradient-card)', borderColor: 'rgba(108,99,255,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🔗 Public Queue Page</div>
                <div className="text-sm text-muted">Share this link with your visitors so they can join your queues</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  background: 'var(--bg-surface)', padding: '8px 14px',
                  borderRadius: 8, fontSize: '0.8rem', color: 'var(--primary-light)',
                  border: '1px solid var(--border)',
                }}>
                  {window.location.origin}/org/{org.slug}
                </code>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/org/${org.slug}`);
                  toast.success('Link copied!');
                }}>
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Queues list */}
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16, color: 'var(--text-secondary)' }}>YOUR QUEUES</h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
          </div>
        ) : queues.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No queues yet</div>
            <p>Create your first queue and start managing visitors.</p>
            <button className="btn btn-primary mt-4" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create First Queue
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {queues.map(queue => {
              const sc = STATUS_CONFIG[queue.status] || STATUS_CONFIG.active;
              return (
                <div key={queue._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{queue.name}</h3>
                      <span className={`badge ${sc.badge}`}>{sc.label}</span>
                    </div>
                    {queue.description && <p className="text-sm text-muted mb-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{queue.description}</p>}
                    <div style={{ display: 'flex', gap: 20 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Users size={13} /> {queue.waitingCount || 0} waiting
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Clock size={13} /> ~{queue.avgServiceTime} min avg
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className={`btn btn-sm ${queue.status === 'active' ? 'btn-warning' : 'btn-secondary'}`}
                      onClick={() => handleToggleStatus(queue)}
                      title={queue.status === 'active' ? 'Pause queue' : 'Activate queue'}
                    >
                      {queue.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
                    </button>
                    <Link to={`/staff/queue/${queue._id}`} className="btn btn-primary btn-sm">
                      Manage <ChevronRight size={14} />
                    </Link>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(queue._id)} title="Delete queue">
                      <Trash2 size={15} color="var(--accent)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateQueueModal
          onClose={() => setShowCreate(false)}
          onCreated={(q) => setQueues(qs => [...qs, { ...q, waitingCount: 0 }])}
        />
      )}
    </div>
  );
}
