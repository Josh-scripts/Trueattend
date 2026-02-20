import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, Loader, RotateCcw, Zap, Shield, Eye } from 'lucide-react';
import { PageHeader, CircularProgress } from '../../components/shared/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const REQUIRED = 5;
const TIPS = [
  'Look directly at the camera',
  'Ensure good, even lighting',
  'Remove sunglasses or hat',
  'Keep a neutral expression',
  'Move slightly between captures for variety',
];

export default function RegisterFace() {
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const [captures, setCaptures] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(user?.face_registered);
  const [countdown, setCountdown] = useState(null);

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (!img) return;
    setCaptures(prev => [...prev, img].slice(0, 10));
    toast.success('Photo captured!', { icon: '📸', duration: 1200 });
  }, []);

  const autoCapture = () => {
    let count = 3;
    setCountdown(count);
    const t = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(t);
        setCountdown(null);
        capture();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const submit = async () => {
    if (captures.length < REQUIRED) {
      toast.error(`Capture at least ${REQUIRED} photos`);
      return;
    }
    setUploading(true);
    try {
      const frames_b64 = captures.map(img => img.split(',')[1]);
      await api.post('/api/student/register-face', { frames_b64 });
      setDone(true);
      toast.success('Face registered successfully!');
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="page-content">
        <PageHeader title="Face Registration" subtitle="Your biometric data for AI-powered attendance" />
        <motion.div className="card" style={{ maxWidth: 500, padding: '48px 32px', textAlign: 'center' }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div
            animate={{ boxShadow: ['0 0 30px var(--green-glow)', '0 0 60px var(--green-glow)', '0 0 30px var(--green-glow)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 100, height: 100, borderRadius: 28, background: 'rgba(34,211,107,0.15)',
              border: '2px solid rgba(34,211,107,0.4)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 28px' }}>
            <CheckCircle size={48} color="var(--green)" />
          </motion.div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>
            Face Registered!
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.7 }}>
            Your face has been registered successfully. The AI will now recognise you automatically during attendance sessions.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,211,107,0.08)',
            border: '1px solid rgba(34,211,107,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-2)' }}>
            <Shield size={16} color="var(--green)" />
            Your biometric data is stored securely and only used for attendance.
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => { setDone(false); setCaptures([]); }}>
            <RotateCcw size={13} /> Re-register
          </button>
        </motion.div>
      </div>
    );
  }

  const progress = Math.min((captures.length / REQUIRED) * 100, 100);

  return (
    <div className="page-content">
      <PageHeader title="Register Your Face" subtitle="We need 5-10 clear photos for accurate recognition" />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Webcam */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="camera-card" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                style={{ width: '100%', display: 'block', borderRadius: '20px 20px 0 0' }}
                mirrored
              />
              {/* Face guide overlay */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{
                  width: '55%', aspectRatio: '3/4',
                  border: `2px dashed ${captures.length >= REQUIRED ? 'var(--green)' : 'rgba(79,142,247,0.6)'}`,
                  borderRadius: '60% 60% 50% 50%',
                  boxShadow: `0 0 0 9999px rgba(7,11,20,0.3)`,
                }} />
              </div>
              {/* Countdown overlay */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: 'rgba(7,11,20,0.6)', fontSize: '5rem',
                      fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--blue)' }}>
                    {countdown}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Progress badge */}
              <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(7,11,20,0.8)',
                borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                <Eye size={13} color={captures.length >= REQUIRED ? 'var(--green)' : 'var(--blue)'} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: captures.length >= REQUIRED ? 'var(--green)' : 'var(--text)' }}>
                  {captures.length}/{REQUIRED}
                </span>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <div className="progress-bar" style={{ marginBottom: 16 }}>
                <motion.div className="progress-fill progress-blue" style={{ width: `${progress}%` }}
                  animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="btn btn-primary" onClick={capture}>
                  <Camera size={15} /> Capture
                </button>
                <button className="btn btn-ghost" onClick={autoCapture} disabled={countdown !== null}>
                  <Zap size={15} /> Auto (3s)
                </button>
              </div>
            </div>
          </div>

          {/* Captured thumbnails */}
          {captures.length > 0 && (
            <div className="card">
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>
                Captured Photos ({captures.length})
              </div>
              <div className="capture-strip">
                <AnimatePresence>
                  {captures.map((img, i) => (
                    <motion.img key={i} src={img} className="capture-thumb" alt={`capture-${i}`}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.1 }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right panel */}
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          {/* Instructions */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>
              📋 Photo Tips
            </div>
            {TIPS.map((tip, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(79,142,247,0.15)',
                  border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, fontSize: '0.65rem', fontWeight: 800, color: 'var(--blue)' }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{tip}</span>
              </motion.div>
            ))}
          </div>

          {/* Progress */}
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <CircularProgress value={progress} size={120} stroke={10}
                color={captures.length >= REQUIRED ? 'var(--green)' : 'var(--blue)'}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
                    color: captures.length >= REQUIRED ? 'var(--green)' : 'var(--blue)' }}>
                    {captures.length}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>/ {REQUIRED}</div>
                </div>
              </CircularProgress>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 16 }}>
              {captures.length < REQUIRED
                ? `Capture ${REQUIRED - captures.length} more photo${REQUIRED - captures.length > 1 ? 's' : ''}`
                : 'Ready to register! You can capture more for better accuracy.'}
            </div>

            <motion.button className="btn btn-success btn-lg w-full" onClick={submit}
              disabled={captures.length < REQUIRED || uploading}
              whileTap={{ scale: 0.98 }} style={{ justifyContent: 'center' }}>
              {uploading
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Registering...</>
                : <><CheckCircle size={16} /> Register Face</>}
            </motion.button>

            {captures.length > 0 && (
              <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 8 }}
                onClick={() => setCaptures([])}>
                <RotateCcw size={13} /> Reset Photos
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
