import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Shield, BookOpen, User, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 'admin',     label: 'Admin',     icon: Shield,   hint: 'Full system access' },
  { id: 'professor', label: 'Professor', icon: BookOpen, hint: 'Manage classes'     },
  { id: 'student',   label: 'Student',   icon: User,     hint: 'View attendance'    },
];

const DEMO = {
  admin:     { email: 'admin@trueattend.app',      password: 'Admin@1234' },
  professor: { email: 'prof.smith@trueattend.app', password: 'Prof@1234' },
  student:   { email: 'student1@trueattend.app',   password: 'CS2021001' },
};

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const fillDemo = () => {
    const d = DEMO[role];
    setEmail(d.email);
    setPassword(d.password);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch {
      toast.error('Invalid credentials. Try the demo fill button.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(3)].map((_, i) => (
          <motion.div key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              filter: 'blur(80px)',
              opacity: 0.08,
              background: ['var(--blue)', 'var(--teal)', 'var(--purple)'][i],
              width: [500, 400, 350][i],
              height: [500, 400, 350][i],
            }}
            animate={{
              x: [0, 60, -40, 0], y: [0, -80, 40, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{ duration: [14, 18, 22][i], repeat: Infinity, ease: 'easeInOut', delay: i * 3 }}
            initial={{ left: ['10%', '60%', '30%'][i], top: ['20%', '60%', '40%'][i] }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>
        <motion.div className="login-card"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        >
          {/* Logo */}
          <div className="login-logo">
            <motion.div className="login-logo-icon"
              animate={{ boxShadow: ['0 0 30px var(--blue-glow)', '0 0 60px var(--teal-glow)', '0 0 30px var(--blue-glow)'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <GraduationCap size={36} color="#fff" />
            </motion.div>
            <h1>TrueAttend</h1>
            <p>Proxy-Free · AI-Powered · Trustworthy</p>
          </div>

          {/* Role selector */}
          <div className="role-selector">
            {ROLES.map(r => {
              const Icon = r.icon;
              return (
                <motion.button key={r.id}
                  className={`role-btn ${role === r.id ? 'active' : ''}`}
                  onClick={() => setRole(r.id)}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={20} />
                  {r.label}
                  <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 400 }}>{r.hint}</span>
                </motion.button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-16">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="Enter your email"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="form-group mb-24">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ paddingRight: 44 }} />
                <button type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button className="btn btn-primary w-full btn-lg" type="submit"
              disabled={loading} whileTap={{ scale: 0.98 }}
              style={{ justifyContent: 'center', marginBottom: 12 }}>
              {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing In...</> : 'Sign In'}
            </motion.button>

            <button type="button" className="btn btn-ghost w-full btn-sm"
              onClick={fillDemo} style={{ justifyContent: 'center' }}>
              Fill demo credentials ({role})
            </button>
          </form>

          <div style={{ marginTop: 28, padding: '16px', background: 'var(--bg-3)', borderRadius: 10,
            border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>Demo Accounts</div>
            {Object.entries(DEMO).map(([r, d]) => (
              <div key={r} style={{ marginBottom: 3 }}>
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{r}:</span> {d.email} / {d.password}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
