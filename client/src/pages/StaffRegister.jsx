import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Mail, Lock, User, Building2, Zap, ArrowRight,
  Hospital, Scissors, GraduationCap, Landmark, MapPin, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ORG_TYPES = [
  { value: 'hospital', label: 'Hospital / Clinic', icon: Hospital, color: '#ff6b6b' },
  { value: 'bank', label: 'Bank / Finance', icon: Building2, color: '#6c63ff' },
  { value: 'salon', label: 'Salon / Spa', icon: Scissors, color: '#ffd166' },
  { value: 'college', label: 'College / School', icon: GraduationCap, color: '#00d4aa' },
  { value: 'government', label: 'Government Office', icon: Landmark, color: '#ff9f43' },
  { value: 'other', label: 'Other', icon: Building2, color: '#9ea3c0' },
];

export default function StaffRegister() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    orgType: '',
    orgDescription: '',
    orgAddress: '',
  });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleNext = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.orgName || !form.orgType) return toast.error('Please fill all required fields');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', form);
      login(res.data.token, res.data.staff);
      toast.success('Organization registered successfully!');
      navigate('/staff/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div className="text-center mb-6">
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--gradient-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Zap size={26} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>Register Organization</h1>
          <p className="text-muted text-sm">Set up QueueLess for your organization in minutes</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: step >= s ? 'var(--gradient-primary)' : 'var(--bg-glass)',
                border: `2px solid ${step >= s ? 'var(--primary)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700,
                color: step >= s ? 'white' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
              }}>
                {s}
              </div>
              <span style={{ fontSize: '0.8rem', color: step >= s ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? 'Account' : 'Organization'}
              </span>
              {s < 2 && <div style={{ width: 40, height: 1, background: step > s ? 'var(--primary)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <div className="card fade-in">
          {step === 1 ? (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h3 style={{ marginBottom: 4 }}>Your Account</h3>
              <p className="text-sm text-muted mb-2">Create your staff administrator account</p>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ paddingLeft: 40 }} placeholder="Dr. Aisha Khan" value={form.name} onChange={update('name')} required autoFocus />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ paddingLeft: 40 }} type="email" placeholder="admin@hospital.com" value={form.email} onChange={update('email')} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ paddingLeft: 40 }} type="password" placeholder="Min. 6 characters" value={form.password} onChange={update('password')} required minLength={6} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ padding: '14px', marginTop: 4 }}>
                Continue <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h3 style={{ marginBottom: 4 }}>Your Organization</h3>
              <p className="text-sm text-muted mb-2">Tell us about your organization</p>

              <div className="form-group">
                <label className="form-label">Organization Name *</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ paddingLeft: 40 }} placeholder="City General Hospital" value={form.orgName} onChange={update('orgName')} required autoFocus />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Organization Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {ORG_TYPES.map((t) => {
                    const Icon = t.icon;
                    const selected = form.orgType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, orgType: t.value }))}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 10,
                          border: `2px solid ${selected ? t.color : 'var(--border)'}`,
                          background: selected ? `${t.color}15` : 'var(--bg-surface)',
                          color: selected ? t.color : 'var(--text-secondary)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          fontSize: '0.7rem', fontWeight: 600,
                        }}
                      >
                        <Icon size={18} />
                        {t.label.split('/')[0].trim()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                  <textarea
                    className="form-input"
                    style={{ paddingLeft: 40, minHeight: 72, resize: 'vertical' }}
                    placeholder="Brief description of services offered..."
                    value={form.orgDescription}
                    onChange={update('orgDescription')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address (optional)</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ paddingLeft: 40 }} placeholder="123 Main St, City" value={form.orgAddress} onChange={update('orgAddress')} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  Back
                </button>
                <button type="submit" className="btn btn-secondary" style={{ flex: 2, padding: '14px' }} disabled={loading}>
                  {loading
                    ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Creating...</>
                    : <>Create Organization <ArrowRight size={16} /></>
                  }
                </button>
              </div>
            </form>
          )}

          <div className="divider" />
          <p className="text-center text-sm text-muted">
            Already registered?{' '}
            <Link to="/staff/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
