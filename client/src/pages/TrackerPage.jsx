import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../lib/socket';
import { Clock, Users, LogOut, Bell, BellOff, AlertTriangle, CheckCircle2, Pause, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

function getGuestId() {
  return localStorage.getItem('ql_guest_id') || '';
}

const STATUS_MESSAGES = {
  waiting: { title: 'You\'re in the queue', emoji: '⏳', color: 'var(--primary)' },
  called: { title: 'It\'s your turn!', emoji: '🔔', color: 'var(--accent-warm)' },
  serving: { title: 'You\'re being served', emoji: '✅', color: 'var(--secondary)' },
  on_hold: { title: 'Position on hold', emoji: '⏸️', color: '#ff9f43' },
  completed: { title: 'Service completed', emoji: '🎉', color: 'var(--secondary)' },
  skipped: { title: 'You were skipped', emoji: '⚠️', color: 'var(--accent)' },
  left: { title: 'You left the queue', emoji: '👋', color: 'var(--text-muted)' },
};

export default function TrackerPage() {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const guestId = getGuestId();

  const [entry, setEntry] = useState(null);
  const [queue, setQueue] = useState(null);
  const [ahead, setAhead] = useState(0);
  const [eta, setEta] = useState(0);
  const [status, setStatus] = useState('waiting');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [showCalledBanner, setShowCalledBanner] = useState(false);
  const pulseRef = useRef(null);

  // Request browser notification permission
  const requestNotif = async () => {
    if (!('Notification' in window)) return toast.error('Notifications not supported');
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { setNotifEnabled(true); toast.success('Notifications enabled!'); }
    else toast.error('Notification permission denied');
  };

  const sendBrowserNotif = (title, body) => {
    if (notifEnabled && document.hidden) {
      new Notification(title, { body, icon: '/vite.svg' });
    }
  };

  useEffect(() => {
    if (!guestId) { navigate('/'); return; }

    // Initial load from REST
    const load = async () => {
      try {
        const [queueRes, statusRes] = await Promise.all([
          axios.get(`/api/queues/${queueId}`),
          axios.get(`/api/entries/status/${queueId}/${guestId}`).catch(() => null),
        ]);
        setQueue(queueRes.data);
        if (statusRes && statusRes.data) {
          setEntry(statusRes.data.entry);
          setAhead(statusRes.data.ahead);
          setEta(statusRes.data.eta);
          setStatus(statusRes.data.entry.status);
        } else {
          // Not in queue — go to join
          navigate(`/queue/${queueId}/join`, { replace: true });
        }
      } catch (err) {
        console.error(err);
        navigate(`/queue/${queueId}/join`, { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queueId, guestId, navigate]);

  useEffect(() => {
    if (!entry) return;

    // Join socket room
    socket.emit('user:join-queue-room', { queueId, guestId });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onPositionUpdate = (data) => {
      setAhead(data.ahead);
      setEta(data.eta);
      setStatus(data.status);

      // Flash animation
      if (pulseRef.current) {
        pulseRef.current.classList.add('bounce-in');
        setTimeout(() => pulseRef.current?.classList.remove('bounce-in'), 600);
      }

      if (data.ahead === 1) {
        sendBrowserNotif('Almost your turn!', 'You\'re next in line. Please make your way to the counter.');
        toast('You\'re almost up — just 1 person ahead! 🚀', { icon: '⚡', duration: 5000 });
      }
    };

    const onYourTurn = (data) => {
      setStatus('called');
      setAhead(0);
      setEta(0);
      setShowCalledBanner(true);
      sendBrowserNotif('It\'s your turn!', data.message || 'Please proceed to the counter now.');
      toast.success(data.message || 'It\'s your turn!', { duration: 10000 });
    };

    const onSkipped = () => {
      setStatus('skipped');
      toast.error('You were skipped. Please contact staff.', { duration: 8000 });
    };

    const onHold = () => {
      setStatus('on_hold');
      toast('Your position is temporarily on hold.', { icon: '⏸️', duration: 5000 });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('position:update', onPositionUpdate);
    socket.on('your-turn', onYourTurn);
    socket.on('entry:skipped', onSkipped);
    socket.on('entry:on-hold', onHold);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('position:update', onPositionUpdate);
      socket.off('your-turn', onYourTurn);
      socket.off('entry:skipped', onSkipped);
      socket.off('entry:on-hold', onHold);
    };
  }, [entry, queueId, guestId, notifEnabled]);

  const handleLeave = () => {
    if (!window.confirm('Are you sure you want to leave this queue?')) return;
    socket.emit('user:leave-queue', { entryId: entry._id, queueId, guestId });
    toast('Left the queue', { icon: '👋' });
    navigate('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="loading-spinner" />
    </div>
  );

  const sc = STATUS_MESSAGES[status] || STATUS_MESSAGES.waiting;
  const isCalled = status === 'called';
  const isCompleted = ['completed', 'skipped', 'left'].includes(status);
  const isActive = ['waiting', 'called', 'serving', 'on_hold'].includes(status);

  return (
    <div className="page" style={{ background: 'var(--bg-base)' }}>
      <div className="container" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm">
            <ArrowLeft size={15} /> Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`live-indicator`}>
              <span className={`dot ${connected ? 'dot-green dot-pulse' : 'dot-red'}`} />
              {connected ? 'Live' : 'Reconnecting...'}
            </div>
          </div>
        </div>

        {/* Called Banner */}
        {showCalledBanner && isCalled && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,209,102,0.15), rgba(255,107,107,0.1))',
            border: '1px solid rgba(255,209,102,0.4)',
            borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 24,
            animation: 'bounceIn 0.6s ease',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔔</div>
            <h2 style={{ color: 'var(--accent-warm)', marginBottom: 6 }}>It's Your Turn!</h2>
            <p className="text-muted">Please proceed to the service counter now.</p>
          </div>
        )}

        {/* Main status card */}
        <div className="card mb-6 text-center" style={{
          padding: '48px 32px',
          background: isCalled
            ? 'linear-gradient(135deg, rgba(255,209,102,0.08), rgba(255,107,107,0.05))'
            : 'var(--gradient-card)',
          borderColor: isCalled ? 'rgba(255,209,102,0.3)' : 'var(--border)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{sc.emoji}</div>
          <h2 style={{ color: sc.color, marginBottom: 16 }}>{sc.title}</h2>

          {isActive && status !== 'called' && (
            <div ref={pulseRef} className="position-ring" style={{ margin: '0 auto 24px' }}>
              <div className="position-number text-gradient">{ahead}</div>
              <div className="position-label">AHEAD OF YOU</div>
            </div>
          )}

          {status === 'waiting' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{ahead}</div>
                <div className="text-xs text-muted">People Ahead</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--secondary)' }}>~{eta}</div>
                <div className="text-xs text-muted">Minutes Left</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-warm)' }}>{entry?.position}</div>
                <div className="text-xs text-muted">Your Position</div>
              </div>
            </div>
          )}

          {entry && (
            <div style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: 'var(--bg-glass)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              marginTop: 16,
            }}>
              <span className="text-sm text-muted">Joined as </span>
              <span className="text-sm font-bold">{entry.name}</span>
            </div>
          )}
        </div>

        {/* Queue info */}
        {queue && (
          <div className="card mb-6">
            <h3 style={{ marginBottom: 12, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>QUEUE DETAILS</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{queue.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {queue.organization?.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Queue Status</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: queue.status === 'active' ? 'var(--secondary)' : 'var(--accent)' }}>
                  {queue.status?.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status timeline */}
        {status === 'waiting' && (
          <div className="card mb-6">
            <h3 style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>WHAT HAPPENS NEXT</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Waiting in virtual queue', done: true },
                { label: 'Notified when 1 person ahead', done: ahead <= 1 },
                { label: 'Called to proceed', done: false },
                { label: 'Service completed', done: false },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: step.done ? 'var(--secondary)' : 'var(--bg-glass)',
                    border: `2px solid ${step.done ? 'var(--secondary)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {step.done && <CheckCircle2 size={12} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: step.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!notifEnabled && isActive && (
            <button className="btn btn-ghost" onClick={requestNotif} style={{ justifyContent: 'center' }}>
              <Bell size={16} /> Enable Browser Notifications
            </button>
          )}

          {notifEnabled && (
            <div className="badge badge-success" style={{ justifyContent: 'center', padding: '10px' }}>
              <Bell size={14} /> Notifications Enabled
            </div>
          )}

          {isActive && (
            <button className="btn btn-danger" onClick={handleLeave}>
              <LogOut size={16} /> Leave Queue
            </button>
          )}

          {isCompleted && (
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Explore More Queues
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
