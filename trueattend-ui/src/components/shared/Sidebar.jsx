import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, Video,
  Bell, BarChart3, CheckSquare, History, AlertTriangle,
  FileText, Camera, LogOut, ChevronRight, UserCheck
} from 'lucide-react';

const NAV = {
  admin: [
    { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/students', icon: Users,           label: 'Students' },
    { to: '/admin/professors',icon: UserCheck,      label: 'Professors' },
    { to: '/admin/courses',  icon: BookOpen,        label: 'Courses' },
    { to: '/admin/feeds',    icon: Video,           label: 'Live Feeds' },
    { to: '/admin/alerts',   icon: AlertTriangle,   label: 'Alerts' },
    { to: '/admin/reports',  icon: BarChart3,       label: 'Reports' },
  ],
  professor: [
    { to: '/professor',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/professor/courses',  icon: BookOpen,        label: 'My Courses' },
    { to: '/professor/mark',     icon: CheckSquare,     label: 'Mark Attendance' },
    { to: '/professor/history',  icon: History,         label: 'Session History' },
    { to: '/professor/alerts',   icon: AlertTriangle,   label: 'Alerts' },
  ],
  student: [
    { to: '/student',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/attendance',icon: BarChart3,       label: 'My Attendance' },
    { to: '/student/register-face', icon: Camera,      label: 'Register Face' },
    { to: '/student/leave',     icon: FileText,        label: 'Leave Requests' },
  ],
};

const ROLE_COLOR = { admin: 'var(--purple)', professor: 'var(--teal)', student: 'var(--blue)' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { alerts } = useSocket();
  if (!user) return null;

  const navItems = NAV[user.role] || [];
  const unread = alerts.filter(a => !a.dismissed).length;
  const roleColor = ROLE_COLOR[user.role];

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sidebar-w)',
        background: 'rgba(13,20,36,0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        zIndex: 100, padding: '0',
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-12">
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--blue), var(--teal))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--blue-glow)', flexShrink: 0,
          }}>
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              TrueAttend
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
              AI Attendance
            </div>
          </div>
        </div>
      </div>

      {/* User profile */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--surface)', borderRadius: 12, padding: '12px 14px',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${roleColor}22, ${roleColor}44)`,
            border: `2px solid ${roleColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: roleColor, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '0.95rem', flexShrink: 0,
          }}>
            {(user.name || user.email)[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', truncate: true,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || user.email}
            </div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: roleColor, fontWeight: 700 }}>
              {user.role}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase',
          letterSpacing: '0.12em', fontWeight: 700, padding: '0 8px', marginBottom: 8 }}>
          Navigation
        </div>
        {navItems.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${user.role}`}
            style={{ display: 'block', textDecoration: 'none', marginBottom: 3 }}
          >
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: isActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(79,142,247,0.25)' : '1px solid transparent',
                  color: isActive ? 'var(--blue)' : 'var(--text-2)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all var(--transition)',
                  cursor: 'pointer', position: 'relative',
                }}
                whileHover={{ x: 3 }}
              >
                <item.icon size={17} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.label === 'Alerts' && unread > 0 && (
                  <span style={{
                    background: 'var(--red)', color: '#fff', borderRadius: '20px',
                    padding: '1px 7px', fontSize: '0.68rem', fontWeight: 700,
                  }}>{unread}</span>
                )}
                {isActive && <ChevronRight size={14} />}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-ghost w-full" onClick={logout}
          style={{ justifyContent: 'flex-start', padding: '10px 16px', borderRadius: 10, gap: 10 }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </motion.aside>
  );
}
