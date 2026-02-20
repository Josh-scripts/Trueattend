import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Video, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { StatCard, PageHeader, Badge, TableWrap, Skeleton } from '../../components/shared/UI';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';

const HOUR_DATA = [
  { t: '8am', sessions: 2 }, { t: '9am', sessions: 5 }, { t: '10am', sessions: 8 },
  { t: '11am', sessions: 6 }, { t: '12pm', sessions: 3 }, { t: '1pm', sessions: 4 },
  { t: '2pm', sessions: 9 }, { t: '3pm', sessions: 7 }, { t: '4pm', sessions: 5 },
  { t: '5pm', sessions: 2 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--blue)', fontWeight: 700 }}>{payload[0].value} sessions</div>
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { alerts: liveAlerts } = useSocket();

  useEffect(() => {
    Promise.all([api.get('/api/admin/dashboard'), api.get('/api/admin/alerts?unresolved=true')])
      .then(([s, a]) => { setStats(s.data); setAlerts(a.data.slice(0, 8)); })
      .finally(() => setLoading(false));
  }, [liveAlerts]);

  const CARDS = stats ? [
    { icon: Users,         value: stats.total_students,  label: 'Students',        color: 'var(--blue)',  delay: 0 },
    { icon: BookOpen,      value: stats.total_professors, label: 'Professors',      color: 'var(--teal)',  delay: 0.08 },
    { icon: Video,         value: stats.active_sessions,  label: 'Active Sessions', color: 'var(--green)', delay: 0.16,
      sub: stats.active_sessions > 0 ? '🟢 Sessions running now' : 'No active sessions' },
    { icon: AlertTriangle, value: stats.unresolved_alerts, label: 'Active Alerts',  color: 'var(--red)',   delay: 0.24,
      sub: stats.sessions_today + ' sessions today' },
  ] : [];

  const ALERT_TYPE_LABELS = {
    unknown_face: 'Unknown Face', proxy_attempt: 'Proxy Attempt',
    headcount_mismatch: 'Headcount Mismatch', liveness_fail: 'Liveness Fail', excess_person: 'Excess Person',
  };

  const resolve = async id => {
    await api.put(`/api/attendance/alert/${id}/resolve`);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Command Center"
        subtitle="Real-time overview of all attendance operations"
        action={
          <div className="live-badge">
            <span className="dot-pulse dot-green" />
            Live
          </div>
        }
      />

      {/* Stats */}
      <div className="grid-4 mb-32">
        {loading ? [0,1,2,3].map(i => (
          <div key={i} className="card">
            <Skeleton h={48} r={12} style={{ marginBottom: 16 }} />
            <Skeleton h={36} w="60%" style={{ marginBottom: 8 }} />
            <Skeleton h={14} w="80%" />
          </div>
        )) : CARDS.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid-2 mb-32">
        {/* Sessions chart */}
        <motion.div className="card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-20">
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>Sessions Today</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Hourly breakdown</div>
            </div>
            <div className="badge badge-blue"><TrendingUp size={11} /> +12% vs yesterday</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={HOUR_DATA}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sessions" stroke="var(--blue)" fill="url(#blueGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Alert breakdown bar */}
        <motion.div className="card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
          <div className="flex items-center justify-between mb-20">
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>Alert Types</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>This week</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Unknown', count: 14 }, { name: 'Headcount', count: 6 },
              { name: 'Liveness', count: 3 }, { name: 'Proxy', count: 1 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
                  <div style={{ color: 'var(--red)', fontWeight: 700 }}>{label}: {payload[0].value}</div>
                </div>
              ) : null} />
              <Bar dataKey="count" fill="var(--red)" radius={[6,6,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Alerts */}
      <motion.div className="card"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <div className="flex items-center justify-between mb-20">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Unresolved Alerts
          </div>
          {alerts.length > 0 && (
            <span className="badge badge-red">{alerts.length} pending</span>
          )}
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} h={50} />)}
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
            <CheckCircle size={36} style={{ margin: '0 auto 12px', color: 'var(--green)' }} />
            <div style={{ fontWeight: 600 }}>All clear! No unresolved alerts.</div>
          </div>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>Type</th><th>Message</th><th>Session</th><th>Time</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <motion.tr key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <td><Badge type={a.type}>{ALERT_TYPE_LABELS[a.type] || a.type}</Badge></td>
                  <td className="td-primary" style={{ maxWidth: 300 }}>{a.message}</td>
                  <td><span className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>#{a.session_id}</span></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    {new Date(a.created_at).toLocaleTimeString()}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => resolve(a.id)}>
                      <CheckCircle size={13} /> Resolve
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </motion.div>
    </div>
  );
}
