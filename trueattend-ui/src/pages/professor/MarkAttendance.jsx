import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, CheckCircle, XCircle, AlertTriangle,
  Users, Camera, Clock, Activity, ChevronRight
} from 'lucide-react';
import { PageHeader, Modal, Badge } from '../../components/shared/UI';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STEPS = ['Setup', 'Live Session', 'Summary'];

export default function MarkAttendance() {
  const { user } = useAuth();
  const { cameraFrames, sessionEvents } = useSocket();
  const [step, setStep] = useState(0);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [room, setRoom] = useState('');
  const [camIndex, setCamIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.get('/api/professor/my-courses').then(r => setCourses(r.data));
  }, []);

  useEffect(() => {
    if (sessionEvents && session && sessionEvents.session_id === session.session_id) {
      setSummary(sessionEvents);
      setShowSummary(true);
      clearAll();
    }
  }, [sessionEvents]);

  const clearAll = () => {
    clearInterval(timerRef.current);
    clearInterval(pollRef.current);
  };

  const startSession = async () => {
    if (!courseId) { toast.error('Select a course first'); return; }
    try {
      const { data } = await api.post('/api/attendance/session/start', {
        course_id: parseInt(courseId), camera_index: camIndex, room,
      });
      setSession(data);
      setStep(1);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.get(`/api/attendance/session/${data.session_id}/status`);
          setLiveStatus(s.data.live);
        } catch {}
      }, 3000);
      toast.success('Session started! Camera is active.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start session');
    }
  };

  const stopSession = async () => {
    if (!session) return;
    try {
      const { data } = await api.post(`/api/attendance/session/${session.session_id}/stop`);
      clearAll();
      setSummary(data);
      setStep(2);
      setShowSummary(true);
      toast.success('Session completed!');
    } catch (err) {
      toast.error('Failed to stop session');
    }
  };

  const formatTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const frame = cameraFrames[courseId];
  const selectedCourse = courses.find(c => c.course_id == courseId);

  return (
    <div className="page-content">
      <PageHeader title="Mark Attendance" subtitle="AI-powered face recognition attendance" />

      {/* Step Indicator */}
      <div className="step-indicator mb-32">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'todo'}`}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.72rem', color: i === step ? 'var(--blue)' : 'var(--text-3)',
                fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Setup */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="setup"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="card" style={{ maxWidth: 600 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>
              Configure Session
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                  <option value="">Select a course...</option>
                  {courses.map(c => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_name} ({c.course_code}) — {c.enrolled_count} students
                    </option>
                  ))}
                </select>
              </div>

              {courseId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
                    borderRadius: 10, padding: '12px 16px', fontSize: '0.82rem' }}>
                  <div style={{ color: 'var(--blue)', fontWeight: 700, marginBottom: 6 }}>Course Details</div>
                  <div style={{ color: 'var(--text-2)' }}>
                    {selectedCourse?.enrolled_count} students enrolled · {selectedCourse?.semester} semester
                  </div>
                </motion.div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Room</label>
                  <input className="form-input" placeholder="e.g. Lab 101"
                    value={room} onChange={e => setRoom(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Camera</label>
                  <select className="form-input" value={camIndex} onChange={e => setCamIndex(+e.target.value)}>
                    <option value={0}>Camera 0 (Default)</option>
                    <option value={1}>Camera 1</option>
                    <option value={2}>Camera 2</option>
                  </select>
                </div>
              </div>

              <motion.button className="btn btn-success btn-lg" onClick={startSession}
                disabled={!courseId} whileTap={{ scale: 0.98 }}
                style={{ justifyContent: 'center', marginTop: 8 }}>
                <Play size={18} /> Start Attendance Session
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Live */}
        {step === 1 && session && (
          <motion.div key="live"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="grid-2" style={{ alignItems: 'start' }}>
              {/* Camera feed */}
              <div className="camera-card">
                <div className="camera-viewport" style={{ minHeight: 300 }}>
                  {frame?.frame ? (
                    <img src={`data:image/jpeg;base64,${frame.frame}`} alt="live" />
                  ) : (
                    <div className="no-feed">
                      <Camera size={40} />
                      <div style={{ fontWeight: 600 }}>Camera Active</div>
                      <div style={{ fontSize: '0.78rem' }}>Analysing frames every 2 seconds</div>
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(34,211,107,0.9)', borderRadius: 8,
                    padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                  }}>
                    <span className="dot-pulse dot-green" style={{ width: 6, height: 6 }} />
                    LIVE
                  </div>
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'rgba(7,11,20,0.8)', borderRadius: 8,
                    padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)',
                    fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Clock size={12} /> {formatTime(elapsed)}
                  </div>
                </div>
                <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                  {[
                    { label: 'Detected', val: frame?.stats?.faces ?? '—', color: 'var(--teal)' },
                    { label: 'Identified', val: frame?.stats?.identified ?? liveStatus?.identified?.length ?? '—', color: 'var(--green)' },
                    { label: 'Unknown', val: frame?.stats?.unknown ?? liveStatus?.unknown_faces ?? '—', color: 'var(--red)' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: s.color }}>
                        {s.val}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Session info */}
                <div className="card">
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>
                    {session.course}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      ['Session ID', `#${session.session_id}`],
                      ['Enrolled', `${session.enrolled} students`],
                      ['Room', room || 'Not set'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-3)' }}>{label}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identified students */}
                {liveStatus?.identified?.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={15} color="var(--green)" /> Identified So Far
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <AnimatePresence>
                        {liveStatus.identified.map(sid => (
                          <motion.div key={sid}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8,
                              padding: '7px 10px', borderRadius: 8, background: 'rgba(34,211,107,0.08)',
                              border: '1px solid rgba(34,211,107,0.2)' }}>
                            <CheckCircle size={14} color="var(--green)" />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Student #{sid}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Stop button */}
                <motion.button className="btn btn-danger btn-lg" onClick={stopSession}
                  whileTap={{ scale: 0.98 }} style={{ justifyContent: 'center' }}>
                  <Square size={16} /> Stop & Finalise Session
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card" style={{ maxWidth: 500, textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(34,211,107,0.15)',
              border: '2px solid rgba(34,211,107,0.4)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px var(--green-glow)' }}>
              <CheckCircle size={40} color="var(--green)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
              Session Complete!
            </div>
            <div style={{ color: 'var(--text-2)', marginBottom: 32, fontSize: '0.9rem' }}>
              Attendance has been recorded successfully.
            </div>
            <motion.button className="btn btn-primary btn-lg" onClick={() => { setStep(0); setSession(null); setSummary(null); }}
              style={{ justifyContent: 'center', width: '100%' }} whileTap={{ scale: 0.98 }}>
              Start Another Session <ChevronRight size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <Modal open={showSummary} onClose={() => setShowSummary(false)} title="Session Summary">
        {summary && (
          <div>
            <div className="grid-3 mb-24" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                { label: 'Present', val: summary.present, color: 'var(--green)' },
                { label: 'Absent', val: summary.absent, color: 'var(--red)' },
                { label: 'Unknown Faces', val: summary.unknown, color: 'var(--amber)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: summary.headcount_ok ? 'rgba(34,211,107,0.08)' : 'rgba(240,74,107,0.08)',
              border: `1px solid ${summary.headcount_ok ? 'rgba(34,211,107,0.25)' : 'rgba(240,74,107,0.25)'}`,
              borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              {summary.headcount_ok
                ? <><CheckCircle size={16} color="var(--green)" />
                    <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.85rem' }}>Headcount verified successfully</span></>
                : <><AlertTriangle size={16} color="var(--red)" />
                    <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: '0.85rem' }}>Headcount mismatch detected</span></>
              }
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
              onClick={() => setShowSummary(false)}>
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
