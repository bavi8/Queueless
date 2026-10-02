import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Hospital, Building2, Scissors, GraduationCap, Landmark,
  Users, Clock, ChevronRight, MapPin, ArrowLeft
} from 'lucide-react';

const ORG_TYPE_CONFIG = {
  hospital: { icon: Hospital, color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', label: 'Hospital' },
  bank: { icon: Building2, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)', label: 'Bank' },
  salon: { icon: Scissors, color: '#ffd166', bg: 'rgba(255,209,102,0.1)', label: 'Salon' },
  college: { icon: GraduationCap, color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', label: 'College' },
  government: { icon: Landmark, color: '#ff9f43', bg: 'rgba(255,159,67,0.1)', label: 'Govt Office' },
  other: { icon: Building2, color: '#9ea3c0', bg: 'rgba(158,163,192,0.1)', label: 'Organization' },
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'var(--secondary)', dot: 'dot-green' },
  paused: { label: 'Paused', color: 'var(--accent-warm)', dot: 'dot-yellow' },
  closed: { label: 'Closed', color: 'var(--accent)', dot: 'dot-red' },
};

export default function OrgPage() {
  const { slug } = useParams();
  const [org, setOrg] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const orgRes = await axios.get(`/api/organizations/${slug}`);
        setOrg(orgRes.data);
        const queueRes = await axios.get(`/api/queues/org/${orgRes.data._id}`);
        setQueues(queueRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  );

  if (!org) return (
    <div className="page container empty-state">
      <div className="empty-state-icon">🏢</div>
      <div className="empty-state-title">Organization not found</div>
      <Link to="/" className="btn btn-primary mt-4"><ArrowLeft size={16} /> Back to Home</Link>
    </div>
  );

  const cfg = ORG_TYPE_CONFIG[org.type] || ORG_TYPE_CONFIG.other;
  const Icon = cfg.icon;

  return (
    <div className="page">
      <div className="container">
        <Link to="/" className="btn btn-ghost btn-sm mb-6" style={{ display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back
        </Link>

        {/* Org Header */}
        <div className="card mb-6" style={{ background: 'var(--gradient-card)', borderColor: `${cfg.color}30` }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: cfg.bg, border: `2px solid ${cfg.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={32} color={cfg.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: '1.75rem' }}>{org.name}</h1>
                <span className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  {cfg.label}
                </span>
              </div>
              {org.description && <p className="text-muted mb-2">{org.description}</p>}
              {org.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <MapPin size={14} /> {org.address}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: cfg.color }}>{queues.filter(q => q.status === 'active').length}</div>
              <div className="text-sm text-muted">Active Queues</div>
            </div>
          </div>
        </div>

        {/* Queues */}
        <h2 style={{ marginBottom: 20 }}>Available Queues</h2>

        {queues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔇</div>
            <div className="empty-state-title">No queues available</div>
            <p>This organization hasn't set up any queues yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {queues.map(queue => {
              const sc = STATUS_CONFIG[queue.status] || STATUS_CONFIG.active;
              return (
                <div key={queue._id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  opacity: queue.status === 'closed' ? 0.6 : 1,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1.05rem' }}>{queue.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className={`dot ${sc.dot} dot-pulse`} />
                        <span style={{ fontSize: '0.75rem', color: sc.color, fontWeight: 600 }}>
                          {sc.label}
                        </span>
                      </div>
                    </div>
                    {queue.description && <p className="text-sm text-muted mb-2">{queue.description}</p>}
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Users size={13} /> {queue.waitingCount} waiting
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Clock size={13} /> ~{queue.avgServiceTime} min/person
                      </div>
                    </div>
                  </div>
                  <div>
                    {queue.status === 'closed' ? (
                      <span className="badge badge-danger">Closed</span>
                    ) : (
                      <Link to={`/queue/${queue._id}/join`} className="btn btn-primary">
                        Join Queue <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
