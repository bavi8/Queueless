import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Phone, Users, Clock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Generate or retrieve a persistent guest ID
function getGuestId() {
  let id = localStorage.getItem('ql_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('ql_guest_id', id);
  }
  return id;
}

export default function QueueJoinPage() {
  const { queueId } = useParams();
  const navigate = useNavigate();

  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('ql_user_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('ql_user_phone') || '');

  useEffect(() => {
    const guestId = getGuestId();
    // First check if already in queue
    Promise.all([
      axios.get(`/api/queues/${queueId}`),
      axios.get(`/api/entries/status/${queueId}/${guestId}`).catch(() => null),
    ]).then(([queueRes, statusRes]) => {
      setQueue(queueRes.data);
      if (statusRes && statusRes.data) {
        // Already in queue — go to tracker
        navigate(`/queue/${queueId}/track`, { replace: true });
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [queueId, navigate]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');

    setSubmitting(true);
    const guestId = getGuestId();
    localStorage.setItem('ql_user_name', name);
    localStorage.setItem('ql_user_phone', phone);

    try {
      await axios.post('/api/entries/join', { queueId, name: name.trim(), phone: phone.trim(), guestId });
      toast.success('You\'ve joined the queue!');
      navigate(`/queue/${queueId}/track`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join queue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  );

  if (!queue) return (
    <div className="page container empty-state">
      <div className="empty-state-icon">❌</div>
      <div className="empty-state-title">Queue not found</div>
    </div>
  );

  return (
    <div className="page" style={{ background: 'var(--bg-base)' }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm mb-6" style={{ display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back
        </button>

        {/* Queue info card */}
        <div className="card mb-6" style={{ background: 'var(--gradient-card)', textAlign: 'center', padding: '32px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(108,99,255,0.15)',
            border: '1px solid rgba(108,99,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Users size={28} color="var(--primary)" />
          </div>
          <h2 style={{ marginBottom: 6 }}>{queue.name}</h2>
          {queue.description && <p className="text-muted text-sm mb-4">{queue.description}</p>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>
                {queue.waitingCount}
              </div>
              <div className="text-xs text-muted">People Waiting</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--secondary)' }}>
                ~{queue.waitingCount * (queue.avgServiceTime || 5)}
              </div>
              <div className="text-xs text-muted">Minutes Est.</div>
            </div>
          </div>

          {queue.status !== 'active' && (
            <div className="badge badge-danger" style={{ marginTop: 16, display: 'inline-flex' }}>
              Queue is {queue.status}
            </div>
          )}
        </div>

        {/* Join form */}
        {queue.status === 'active' ? (
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Join this Queue</h3>
            <p className="text-sm text-muted mb-6">No token needed. Just enter your name.</p>

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Your Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }} />
                  <input
                    id="join-name"
                    className="form-input"
                    style={{ paddingLeft: 40 }}
                    placeholder="Enter your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (optional)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }} />
                  <input
                    id="join-phone"
                    className="form-input"
                    style={{ paddingLeft: 40 }}
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    type="tel"
                  />
                </div>
              </div>

              {/* Info */}
              <div style={{
                padding: '14px 16px',
                background: 'rgba(108,99,255,0.08)',
                borderRadius: 10,
                border: '1px solid rgba(108,99,255,0.2)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <Clock size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
                  You can leave the physical waiting area after joining. You'll be notified on this device when your turn is near.
                </div>
              </div>

              <button
                id="btn-join-queue"
                type="submit"
                className="btn btn-primary btn-full"
                style={{ padding: '14px', fontSize: '1rem' }}
                disabled={submitting}
              >
                {submitting ? (
                  <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Joining...</>
                ) : (
                  <><CheckCircle size={18} /> Join Queue Now <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="card text-center">
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🚫</div>
            <h3>Queue is {queue.status}</h3>
            <p className="text-muted mt-2">Please check back later or contact the organization.</p>
          </div>
        )}
      </div>
    </div>
  );
}
