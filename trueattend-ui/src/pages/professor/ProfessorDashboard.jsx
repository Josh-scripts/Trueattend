import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, CheckSquare, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, Skeleton } from '../../components/shared/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/professor/my-courses').then(r => { setCourses(r.data); setLoading(false); });
  }, []);

  const totalStudents = courses.reduce((s, c) => s + c.enrolled_count, 0);

  return (
    <div className="page-content">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Professor'}`}
        subtitle="Manage your classes and track attendance"
      />

      <div className="grid-3 mb-32">
        <StatCard icon={BookOpen} value={courses.length} label="My Courses" color="var(--teal)" delay={0} />
        <StatCard icon={Users} value={totalStudents} label="Total Students" color="var(--blue)" delay={0.08} />
        <StatCard icon={TrendingUp} value="—" label="Avg Attendance" color="var(--green)" delay={0.16} sub="Run sessions to see data" />
      </div>

      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>
        Your Courses
      </div>

      {loading ? (
        <div className="grid-auto">{[1,2,3].map(i => <Skeleton key={i} h={160} r={16} />)}</div>
      ) : (
        <div className="grid-auto">
          {courses.map((c, i) => (
            <motion.div key={c.course_id} className="card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{ cursor: 'pointer' }}
              whileHover={{ y: -3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--teal)22, var(--blue)22)',
                  border: '1px solid var(--teal)33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BookOpen size={20} color="var(--teal)" />
                </div>
                <span className="badge badge-teal">{c.semester}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{c.course_name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
                {c.course_code}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-2)' }}><Users size={13} style={{ display: 'inline', marginRight: 4 }} />{c.enrolled_count} students</span>
              </div>
              <div className="section-divider" />
              <motion.button className="btn btn-teal w-full btn-sm"
                onClick={() => navigate('/professor/mark')}
                style={{ justifyContent: 'center' }}
                whileTap={{ scale: 0.97 }}>
                <CheckSquare size={14} /> Mark Attendance
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
