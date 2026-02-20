import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Wifi, WifiOff, Eye, Users, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/shared/UI';
import { useSocket } from '../../context/SocketContext';

export default function AdminFeeds() {
  const { cameraFrames } = useSocket();
  const feeds = Object.values(cameraFrames);

  const MOCK_ROOMS = [
    { id: 0, room: 'Lab 101', course: 'Machine Learning', enrolled: 45 },
    { id: 1, room: 'Room 204', course: 'Data Structures', enrolled: 38 },
    { id: 2, room: 'Hall A',   course: 'Operating Systems', enrolled: 52 },
    { id: 3, room: 'Lab 302',  course: 'Computer Networks', enrolled: 30 },
  ];

  const getFrame = (courseId) => feeds.find(f => f.course_id === courseId);

  return (
    <div className="page-content">
      <PageHeader
        title="Live Camera Feeds"
        subtitle="Real-time classroom monitoring across all venues"
        action={<div className="live-badge"><span className="dot-pulse dot-green" />Live Monitoring</div>}
      />

      <div className="grid-2">
        {MOCK_ROOMS.map((room, i) => {
          const frame = getFrame(room.id);
          const stats = frame?.stats;
          return (
            <motion.div key={room.id} className="camera-card"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 260 }}>
              <div className="camera-viewport">
                {frame?.frame ? (
                  <img src={`data:image/jpeg;base64,${frame.frame}`} alt="live feed" />
                ) : (
                  <div className="no-feed">
                    <div style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 4,
                    }}>
                      <Camera size={28} color="var(--text-3)" />
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: '0.85rem' }}>
                      {room.course}
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      Awaiting session start
                    </div>
                  </div>
                )}

                {/* Overlay top bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  padding: '10px 14px',
                  background: 'linear-gradient(to bottom, rgba(7,11,20,0.85), transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%',
                      background: frame ? 'var(--green)' : 'var(--text-3)',
                      boxShadow: frame ? '0 0 8px var(--green)' : 'none',
                      animation: frame ? 'pulse-ring 1.5s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {frame ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                    {room.room}
                  </div>
                </div>

                {/* Alert overlay */}
                {stats?.unknown > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: 'rgba(240,74,107,0.9)', borderRadius: 8,
                      padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                    }}>
                    <AlertTriangle size={12} />
                    {stats.unknown} UNKNOWN FACE{stats.unknown > 1 ? 'S' : ''}
                  </motion.div>
                )}
              </div>

              {/* Footer stats */}
              <div className="camera-footer">
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    <Eye size={13} color="var(--teal)" />
                    <span style={{ color: 'var(--text-3)' }}>Detected:</span>
                    <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{stats?.faces ?? '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    <Users size={13} color="var(--green)" />
                    <span style={{ color: 'var(--text-3)' }}>ID'd:</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>{stats?.identified ?? '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    <AlertTriangle size={13} color="var(--red)" />
                    <span style={{ color: 'var(--text-3)' }}>Unknown:</span>
                    <span style={{ color: stats?.unknown > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: 700 }}>
                      {stats?.unknown ?? '—'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  {frame ? <Wifi size={13} color="var(--green)" /> : <WifiOff size={13} />}
                  {room.enrolled} enrolled
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
