import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { CircularProgress, PageHeader, Skeleton } from '../../components/shared/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/api/student/my-attendance').then(r => { setData(r.data); setLoading(false); });
  }, []);

  const overall = data.length === 0 ? 0
    : Math.round(data.reduce((s, c) => s + c.attendance_pct, 0) / data.length);

  const atRisk = data.filter(c => c.at_risk).length;

  const getColor = pct => pct >= 75 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="page-content">
      <PageHeader title={`Hi, ${user?.name?.split(' ')[0] || 'Student'}`} subtitle="Your attendance overview" />

      {/* Overall + at-risk banner */}
      <div className="grid-2 mb-32" style={{ gridTemplateColumns: '280px 1fr' }}>
        <motion.div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <CircularProgress value={overall} size={140} stroke={12} color={getColor(overall)}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800,
                  color: getColor(overall) }}>{overall}%</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall</div>
              </div>
            </CircularProgress>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Overall Attendance</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 6 }}>
            Across {data.length} courses
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>Course Summary</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={40} />)}
            </div>
          ) : data.map((c, i) => (
            <motion.div key={c.course_id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.course_name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: getColor(c.attendance_pct) }}>
                    {c.attendance_pct}%
                  </span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    style={{
                      background: getColor(c.attendance_pct),
                      boxShadow: `0 0 8px ${getColor(c.attendance_pct)}55`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.attendance_pct}%` }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
              {c.at_risk && (
                <span title="Below minimum attendance" style={{ color: 'var(--amber)', flexShrink: 0 }}>
                  <AlertTriangle size={16} />
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* At-risk warning */}
      {atRisk > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14 }}>
          <AlertTriangle size={20} color="var(--amber)" />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--amber)', fontSize: '0.875rem' }}>Low Attendance Warning</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 3 }}>
              You are below the minimum threshold in {atRisk} course{atRisk > 1 ? 's' : ''}. Attend upcoming classes.
            </div>
          </div>
        </motion.div>
      )}

      {/* Per-course detail cards */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>
        Course Details
      </div>
      {loading ? (
        <div className="grid-auto">{[1,2,3].map(i => <Skeleton key={i} h={200} r={16} />)}</div>
      ) : data.map((c, i) => (
        <motion.div key={c.course_id} className="card" style={{ marginBottom: 12 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className="flex items-center justify-between" style={{ cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === c.course_id ? null : c.course_id)}>
            <div className="flex items-center gap-12">
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: `${getColor(c.attendance_pct)}22`, border: `1px solid ${getColor(c.attendance_pct)}44` }}>
                <BookOpen size={18} color={getColor(c.attendance_pct)} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.course_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{c.course_code}</div>
              </div>
            </div>
            <div className="flex items-center gap-16">
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: getColor(c.attendance_pct) }}>
                  {c.attendance_pct}%
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                  Min: {c.min_required}%
                </div>
              </div>
              {c.at_risk
                ? <span className="badge badge-red"><AlertTriangle size={10} /> At Risk</span>
                : <span className="badge badge-green"><CheckCircle size={10} /> On Track</span>
              }
            </div>
          </div>

          {/* Expanded session list */}
          {expanded === c.course_id && c.sessions?.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: 6 }} />Session History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {c.sessions.map((s, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 12px', borderRadius: 8, background: 'var(--bg-3)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-2)' }}>{s.date}</span>
                    <span className={`badge ${s.status === 'present' ? 'badge-green' : 'badge-red'}`}>
                      {s.status}
                    </span>
                    {s.confidence && (
                      <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {(s.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {s.manual_override && <span className="badge badge-amber">Override</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
