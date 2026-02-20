import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

/* ── Modal ──────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, large }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div className={`modal ${large ? 'modal-lg' : ''}`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="modal-header">
              <div className="modal-title">{title}</div>
              <button className="modal-close" onClick={onClose}><X size={16} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── StatCard ───────────────────────────────────────── */
export function StatCard({ icon: Icon, value, label, sub, color = 'var(--blue)', delay = 0 }) {
  return (
    <motion.div className="stat-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
    >
      <div className="stat-icon" style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
        <Icon size={22} color={color} />
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${color}18, transparent 70%)`,
        borderRadius: '0 var(--radius-lg) 0 0', pointerEvents: 'none',
      }} />
    </motion.div>
  );
}

/* ── Circular Progress ──────────────────────────────── */
export function CircularProgress({ value, size = 120, stroke = 10, color = 'var(--blue)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="circ-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <motion.circle
          className="ring-fill"
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={stroke} stroke={color}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="circ-progress-label">{children}</div>
    </div>
  );
}

/* ── Alert Toasts ───────────────────────────────────── */
const ALERT_ICONS = {
  unknown_face:       { icon: AlertTriangle, color: 'var(--red)' },
  proxy_attempt:      { icon: AlertTriangle, color: 'var(--red)' },
  headcount_mismatch: { icon: AlertTriangle, color: 'var(--amber)' },
  liveness_fail:      { icon: Info,          color: 'var(--amber)' },
  excess_person:      { icon: AlertTriangle, color: 'var(--red)' },
};

export function AlertToasts() {
  const { alerts, dismissAlert } = useSocket();

  return (
    <div className="notif-panel">
      <AnimatePresence>
        {alerts.slice(0, 5).map(a => {
          const cfg = ALERT_ICONS[a.type] || { icon: Info, color: 'var(--blue)' };
          const Icon = cfg.icon;
          return (
            <motion.div key={a.id}
              className="notif-toast"
              style={{ borderLeftColor: cfg.color, pointerEvents: 'all' }}
              initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              onClick={() => dismissAlert(a.id)}
            >
              <div className="flex items-center gap-8 mb-8">
                <Icon size={15} style={{ color: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {a.type?.replace(/_/g, ' ')}
                </span>
                <X size={12} style={{ marginLeft: 'auto', color: 'var(--text-3)', cursor: 'pointer' }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{a.message}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 6 }}>Session #{a.session_id} · Click to dismiss</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ── Page Header ────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <motion.div className="page-header"
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="glow-line" style={{ marginTop: 20 }} />
    </motion.div>
  );
}

/* ── Badge ──────────────────────────────────────────── */
export function Badge({ type, children }) {
  const map = {
    present: 'badge-green', absent: 'badge-red', late: 'badge-amber',
    pending: 'badge-amber', approved: 'badge-green', rejected: 'badge-red',
    unknown_face: 'badge-red', proxy_attempt: 'badge-red',
    headcount_mismatch: 'badge-amber', liveness_fail: 'badge-amber',
    active: 'badge-green', completed: 'badge-blue',
  };
  return <span className={`badge ${map[type] || 'badge-gray'}`}>{children}</span>;
}

/* ── Empty State ────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ padding: '60px 24px', textAlign: 'center' }}
    >
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--surface)',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 20px' }}>
        <Icon size={30} color="var(--text-3)" />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
        {title}
      </div>
      {subtitle && <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{subtitle}</div>}
    </motion.div>
  );
}

/* ── Skeleton ────────────────────────────────────────── */
export function Skeleton({ h = 20, w = '100%', r = 8, style }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

/* ── Table Wrapper ──────────────────────────────────── */
export function TableWrap({ children }) {
  return (
    <div className="overflow-table">
      <table className="data-table">{children}</table>
    </div>
  );
}
