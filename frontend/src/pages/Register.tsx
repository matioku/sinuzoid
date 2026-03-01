import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { PasswordInput } from '../components/ui';
import SinuzoidLogo from '../assets/logos/logo_sinuzoid-cyan.svg?react';
import { FiUser, FiMail, FiCheck } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const validate = () => {
    if (!formData.username.trim()) return 'Username is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(formData.password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(formData.password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(formData.password)) return 'Password must contain a number';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setIsLoading(true);
    setError(null);
    try {
      await register(formData.username, formData.email, formData.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }} className="scale-in">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <FiCheck size={28} style={{ color: '#30d158' }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Account created!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SinuzoidLogo style={{ width: 48, height: 48, color: 'var(--accent)', marginBottom: 16 }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Create account</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Join Sinuzoid and start streaming</p>
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px' }}>
          <form onSubmit={handleSubmit}>
            {[
              { name: 'username', label: 'Username', type: 'text', placeholder: 'yourname', icon: <FiUser size={14} />, autoComplete: 'username' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', icon: <FiMail size={14} />, autoComplete: 'email' },
            ].map(field => (
              <div key={field.name} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>{field.label}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>{field.icon}</span>
                  <input className="sz-input" name={field.name} type={field.type} placeholder={field.placeholder}
                    value={(formData as any)[field.name]} onChange={handleChange} style={{ paddingLeft: 36, width: '100%' }}
                    required autoComplete={field.autoComplete} />
                </div>
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Password</label>
              <PasswordInput name="password" placeholder="Min 8 chars, upper, lower, number" value={formData.password} onChange={handleChange} disabled={isLoading} autoComplete="new-password" required />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Confirm password</label>
              <PasswordInput name="confirmPassword" placeholder="Repeat your password" value={formData.confirmPassword} onChange={handleChange} disabled={isLoading} autoComplete="new-password" required />
            </div>

            {error && <div style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff453a', marginBottom: 16 }}>{error}</div>}

            <button type="submit" className="sz-btn sz-btn-primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center', padding: '11px 0' }}>
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-tertiary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
