import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Hospital, Building2, Scissors, GraduationCap, Landmark, Search,
  Users, Clock, ChevronRight, Zap, Shield, Bell, ArrowRight
} from 'lucide-react';

const ORG_TYPE_CONFIG = {
  hospital: { icon: Hospital, color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', label: 'Hospital' },
  bank: { icon: Building2, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)', label: 'Bank' },
  salon: { icon: Scissors, color: '#ffd166', bg: 'rgba(255,209,102,0.1)', label: 'Salon' },
  college: { icon: GraduationCap, color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', label: 'College' },
  government: { icon: Landmark, color: '#ff9f43', bg: 'rgba(255,159,67,0.1)', label: 'Govt Office' },
  other: { icon: Building2, color: '#9ea3c0', bg: 'rgba(158,163,192,0.1)', label: 'Organization' },
};

const features = [
  { icon: Zap, title: 'Join Instantly', desc: 'No token, no paper slips. Just enter your name and join any queue from your phone.', color: '#6c63ff' },
  { icon: Clock, title: 'Live ETA', desc: 'Real-time estimated waiting time updates as the queue moves forward.', color: '#00d4aa' },
  { icon: Bell, title: 'Smart Notifications', desc: "Get notified when it's almost your turn so you can stay relaxed nearby.", color: '#ffd166' },
  { icon: Shield, title: 'No App Needed', desc: 'Works in any browser. No downloads, no registration for users.', color: '#ff6b6b' },
];

export default function HomePage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get('/api/organizations')
      .then(res => setOrgs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orgs.filter(org => {
    const matchSearch = org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || org.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 700 }}>
            <div className="live-indicator mb-4" style={{ display: 'inline-flex' }}>
              <span className="dot dot-green dot-pulse" />
              Real-time queue management
            </div>
            <h1 style={{ marginBottom: 20 }}>
              Skip the Wait,{' '}
              <span className="text-gradient">Not the Service</span>
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.7 }}>
              Join any queue virtually — hospitals, banks, salons & more.
              Track your live position, get notified when it's your turn, and stay free until called.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href="#explore" className="btn btn-primary btn-lg">
                <Search size={18} />
                Explore Queues
              </a>
              <Link to="/staff/register" className="btn btn-ghost btn-lg">
                Register Your Organization
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Stats */}
            <div style={{
              display: 'flex', gap: 40, marginTop: 56,
              padding: '24px 0', borderTop: '1px solid var(--border)'
            }}>
              {[
                { val: orgs.length || '—', label: 'Organizations' },
                { val: '100%', label: 'Real-time' },
                { val: '0', label: 'Tokens Required' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }} className="text-gradient">{s.val}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual element */}
        <div style={{
          position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)',
          display: 'grid', gap: 12, opacity: 0.7,
        }} className="hidden-mobile">
          {['Aisha M.', 'Raj K.', 'Sara L.', 'Priya N.'].map((name, i) => (
            <div key={i} style={{
              padding: '12px 20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 12,
              transform: `translateX(${i % 2 === 0 ? 0 : 30}px)`,
              animation: `fadeIn ${0.5 + i * 0.15}s ease`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `hsl(${i * 60 + 240}, 70%, 60%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'white',
              }}>
                {name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Position #{i + 1} · ~{(i + 1) * 5} min
                </div>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === 0 ? '#00d4aa' : '#6c63ff',
                marginLeft: 'auto',
              }} />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────── */}
      <section style={{ padding: '80px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div className="text-center mb-6">
            <h2>How QueueLess Works</h2>
            <p className="text-muted mt-2">A frictionless waiting experience for everyone</p>
          </div>
          <div className="grid-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: `${f.color}18`,
                    border: `1px solid ${f.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Icon size={24} color={f.color} />
                  </div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{f.title}</h3>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Explore Orgs ──────────────────────────────────────── */}
      <section id="explore" style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <h2>Available Organizations</h2>
              <p className="text-muted mt-2">Join a live queue instantly — no registration needed</p>
            </div>
            <Link to="/staff/register" className="btn btn-ghost btn-sm">
              Add Yours <ChevronRight size={15} />
            </Link>
          </div>

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 40 }}
                placeholder="Search organizations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['all', 'hospital', 'bank', 'salon', 'college', 'government'].map(type => (
                <button
                  key={type}
                  className={`btn btn-sm ${filter === type ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(type)}
                >
                  {type === 'all' ? 'All' : ORG_TYPE_CONFIG[type]?.label || type}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">No organizations found</div>
              <p>Try a different search or be the first to register your organization!</p>
              <Link to="/staff/register" className="btn btn-primary mt-4">
                Register Organization
              </Link>
            </div>
          ) : (
            <div className="grid-3">
              {filtered.map(org => {
                const cfg = ORG_TYPE_CONFIG[org.type] || ORG_TYPE_CONFIG.other;
                const Icon = cfg.icon;
                return (
                  <Link key={org._id} to={`/org/${org.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                        <div className="org-type-icon" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                          <Icon size={22} color={cfg.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '1rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {org.name}
                          </h3>
                          <span className="badge badge-neutral">{cfg.label}</span>
                        </div>
                      </div>
                      {org.description && (
                        <p className="text-sm text-muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
                          {org.description.slice(0, 80)}{org.description.length > 80 ? '...' : ''}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <Users size={13} />
                          {org.activeQueues || 0} active queue{org.activeQueues !== 1 ? 's' : ''}
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: cfg.color, fontSize: '0.8rem', fontWeight: 600 }}>
                          Join Queue <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
