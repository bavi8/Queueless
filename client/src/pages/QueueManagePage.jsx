import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../lib/socket';
import {
  ArrowLeft, ChevronRight, Users, Clock, Play, Pause,
  SkipForward, CheckCircle, Pause as PauseIcon, RefreshCw,
  PhoneCall, Zap, Bell, BarChart3, X, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const ENTRY_STATUS_CONFIG = {
  waiting:   { label: 'Waiting',   color: 'var(--primary)',     badge: 'badge-primary'  },
  called:    { label: 'Called',    color: 'var(--accent-warm)', badge: 'badge-warning'  },
  serving:   { label: 'Serving',   color: 'var(--secondary)',   badge: 'badge-success'  },
  on_hold:   { label: 'On Hold',   color: '#ff9f43',            badge: 'badge-orange'   },
  completed: { label: 'Done',      color: '#4caf50',            badge: 'badge-success'  },
  skipped:   { label: 'Skipped',   color: 'var(--accent)',      badge: 'badge-danger'   },
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function EntryCard({ entry, onAction, isCurrent }) {
  const sc = ENTRY_STATUS_CONFIG[entry.status] || ENTRY_STATUS_CONFIG.waiting;

  return (
    <div
      className={`queue-entry ${entry.status === 'called' ? 'is-called' : ''} ${entry.status === 'serving' ? 'is-serving' : ''} ${entry.status === 'on_hold' ? 'is-hold' : ''}`}
      style={{ animation: 'fadeIn 0.3s ease' }}
    >
      {/* Position badge */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: isCurrent ? 'var(--gradient-secondary)' : 'var(--bg-glass)',
        border: `2px solid ${isCurrent ? 'var(--secondary)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
        color: isCurrent ? 'white' : 'var(--text-secondary)',
      }}>
        {entry.position}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          <span className={`badge ${sc.badge}`} style={{ flexShrink: 0 }}>{sc.label}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Joined {timeAgo(entry.joinedAt)}
          {entry.calledAt && ` · Called ${timeAgo(entry.calledAt)}`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {entry.status === 'waiting' && (
          <>
            <button className="btn btn-ghost btn-icon btn-sm" title="Hold" onClick={() => onAction('hold', entry._id)}>
              <PauseIcon size={14} color="#ff9f43" />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" title="Skip" onClick={() => onAction('skip', entry._id)}>
              <SkipForward size={14} color="var(--accent)" />
            </button>
          </>
        )}
        {entry.status === 'called' && (
          <button className="btn btn-secondary btn-sm" onClick={() => onAction('start-serving', entry._id)}>
            <CheckCircle size={14} /> Start Serving
          </button>
        )}
        {entry.status === 'serving' && (
          <button className="btn btn-primary btn-sm" onClick={() => onAction('complete', entry._id)}>
            <CheckCircle size={14} /> Complete
          </button>
        )}
        {entry.status === 'on_hold' && (
          <button className="btn btn-ghost btn-sm" onClick={() => onAction('resume', entry._id)}>
            <RefreshCw size={14} /> Resume
          </button>
        )}
      </div>
    </div>
  );
}

export default function QueueManagePage() {
  const { queueId } = useParams();
  const navigate = useNavigate();

  const [queue, setQueue] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [callingNext, setCallingNext] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // active | history

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const [queueRes, entriesRes] = await Promise.all([
          axios.get(`/api/queues/${queueId}`),
          axios.get(`/api/queues/${queueId}/entries`),
        ]);
        setQueue(queueRes.data);
        setEntries(entriesRes.data);
      } catch (err) {
        toast.error('Failed to load queue');
        navigate('/staff/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queueId, navigate]);

  // Socket.IO setup
  useEffect(() => {
    socket.emit('staff:join-queue-room', { queueId });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onQueueUpdate = ({ queue: updatedQueue, entries: updatedEntries }) => {
      setQueue(updatedQueue);
      setEntries(updatedEntries);
    };

    const onStatusChanged = ({ status }) => {
      setQueue(q => ({ ...q, status }));
      toast(`Queue ${status}`, { icon: status === 'active' ? '▶️' : '⏸️' });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('queue:update', onQueueUpdate);
    socket.on('queue:status-changed', onStatusChanged);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:update', onQueueUpdate);
      socket.off('queue:status-changed', onStatusChanged);
    };
  }, [queueId]);

  const handleAction = useCallback((action, entryId) => {
    const eventMap = {
      'call-next':     () => socket.emit('staff:call-next',     { queueId }),
      'start-serving': () => socket.emit('staff:start-serving', { entryId, queueId }),
      'complete':      () => socket.emit('staff:complete',      { entryId, queueId }),
      'skip':          () => socket.emit('staff:skip',          { entryId, queueId }),
      'hold':          () => socket.emit('staff:hold',          { entryId, queueId }),
      'resume':        () => socket.emit('staff:resume',        { entryId, queueId }),
    };
    if (eventMap[action]) eventMap[action]();
  }, [queueId]);

  const handleCallNext = () => {
    setCallingNext(true);
    socket.emit('staff:call-next', { queueId });
    setTimeout(() => setCallingNext(false), 1500);
  };

  const handleToggleQueueStatus = () => {
    const newStatus = queue.status === 'active' ? 'paused' : 'active';
    socket.emit('staff:toggle-queue', { queueId, status: newStatus });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="loading-spinner" />
    </div>
  );

  if (!queue) return null;

  const activeEntries = entries.filter(e => ['waiting', 'called', 'serving', 'on_hold'].includes(e.status));
  const waitingEntries = entries.filter(e => e.status === 'waiting');
  const calledEntry = entries.find(e => e.status === 'called');
  const servingEntry = entries.find(e => e.status === 'serving');
  const currentEntry = servingEntry || calledEntry;

  const waitingCount = waitingEntries.length;
  const eta = waitingCount * (queue.avgServiceTime || 5);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Back + Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/staff/dashboard" className="btn btn-ghost btn-sm">
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>{queue.name}</h2>
              <div className="text-xs text-muted">{queue.organization?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="live-indicator">
              <span className={`dot ${connected ? 'dot-green dot-pulse' : 'dot-red'}`} />
              {connected ? 'Live' : 'Offline'}
            </div>
            <button
              className={`btn btn-sm ${queue.status === 'active' ? 'btn-warning' : 'btn-secondary'}`}
              onClick={handleToggleQueueStatus}
            >
              {queue.status === 'active' ? <><Pause size={14} /> Pause Queue</> : <><Play size={14} /> Resume Queue</>}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-6">
          {[
            { label: 'Waiting', value: waitingCount, color: '#6c63ff', icon: Users },
            { label: 'Est. Total Wait', value: `${eta}m`, color: '#ffd166', icon: Clock },
            { label: 'Now Serving', value: currentEntry ? '#' + currentEntry.position : '—', color: '#00d4aa', icon: PhoneCall },
            { label: 'Queue Status', value: queue.status?.toUpperCase(), color: queue.status === 'active' ? '#00d4aa' : '#ff9f43', icon: Zap },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                <Icon size={20} color={stat.color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-muted mt-1">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          {/* Queue list */}
          <div>
            {/* Call next CTA */}
            {queue.status === 'active' && !calledEntry && !servingEntry && (
              <button
                id="btn-call-next"
                className="btn btn-primary btn-full mb-4"
                style={{ padding: '16px', fontSize: '1rem', justifyContent: 'center' }}
                onClick={handleCallNext}
                disabled={callingNext || waitingCount === 0}
              >
                {callingNext ? (
                  <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Calling...</>
                ) : (
                  <><Bell size={18} /> Call Next Person</>
                )}
              </button>
            )}

            {/* Currently called banner */}
            {calledEntry && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,209,102,0.12), rgba(255,107,107,0.08))',
                border: '1px solid rgba(255,209,102,0.35)',
                borderRadius: 14, padding: '16px 20px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-warm)', marginBottom: 2 }}>
                    🔔 Currently Called: {calledEntry.name}
                  </div>
                  <div className="text-xs text-muted">Waiting for them to arrive at the counter</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleAction('start-serving', calledEntry._id)}>
                    <CheckCircle size={14} /> Serving
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAction('skip', calledEntry._id)}>
                    <SkipForward size={14} /> Skip
                  </button>
                </div>
              </div>
            )}

            {/* Currently serving banner */}
            {servingEntry && (
              <div style={{
                background: 'rgba(0,212,170,0.08)',
                border: '1px solid rgba(0,212,170,0.3)',
                borderRadius: 14, padding: '16px 20px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--secondary)', marginBottom: 2 }}>
                    ✅ Now Serving: {servingEntry.name}
                  </div>
                  <div className="text-xs text-muted">Active service in progress</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleAction('complete', servingEntry._id)}>
                  <CheckCircle size={14} /> Complete
                </button>
              </div>
            )}

            {/* Active entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeEntries.length === 0 ? (
                <div className="empty-state" style={{ padding: '48px 24px' }}>
                  <div className="empty-state-icon">🎉</div>
                  <div className="empty-state-title">Queue is empty!</div>
                  <p>No one is currently waiting.</p>
                </div>
              ) : (
                activeEntries.map(entry => (
                  <EntryCard
                    key={entry._id}
                    entry={entry}
                    onAction={handleAction}
                    isCurrent={entry._id === currentEntry?._id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick actions */}
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>QUICK ACTIONS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={handleCallNext}
                  disabled={callingNext || waitingCount === 0 || !!calledEntry || !!servingEntry}
                >
                  <Bell size={14} /> Call Next
                </button>
                <button
                  className={`btn btn-sm ${queue.status === 'active' ? 'btn-warning' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}
                  onClick={handleToggleQueueStatus}
                >
                  {queue.status === 'active' ? <><Pause size={14} /> Pause Queue</> : <><Play size={14} /> Resume Queue</>}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => {
                    if (window.confirm('Close this queue? No one will be able to join.')) {
                      socket.emit('staff:toggle-queue', { queueId, status: 'closed' });
                    }
                  }}
                >
                  <X size={14} /> Close Queue
                </button>
              </div>
            </div>

            {/* Queue info */}
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>QUEUE INFO</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Avg Service Time', value: `${queue.avgServiceTime} min` },
                  { label: 'Max Capacity', value: queue.maxCapacity },
                  { label: 'Total Waiting', value: waitingCount },
                  { label: 'Est. Queue Time', value: `~${eta} min` },
                ].map((info, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <span className="text-sm text-muted">{info.label}</span>
                    <span className="text-sm font-bold">{info.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share link */}
            <div className="card" style={{ background: 'var(--gradient-card)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>SHARE JOIN LINK</h3>
              <code style={{
                display: 'block', fontSize: '0.7rem', padding: '10px',
                background: 'var(--bg-surface)', borderRadius: 8,
                border: '1px solid var(--border)', color: 'var(--primary-light)',
                wordBreak: 'break-all', marginBottom: 8,
              }}>
                {window.location.origin}/queue/{queueId}/join
              </code>
              <button className="btn btn-ghost btn-sm btn-full" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/queue/${queueId}/join`);
                toast.success('Join link copied!');
              }}>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
