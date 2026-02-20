import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';
import { PageHeader, TableWrap, EmptyState, Skeleton } from '../../components/shared/UI';
import api from '../../utils/api';

export default function AdminReports() {
  const [report, setReport] = useState([]);
  const [courses, setCourses] = useState([]);
  const [depts, setDepts] = useState([]);
  const [filters, setFilters] = useState({ course_id: '', department_id: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.course_id) params.append('course_id', filters.course_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    const [r, c, d] = await Promise.all([
      api.get(`/api/admin/reports/attendance?${params}`),
      api.get('/api/admin/courses'),
      api.get('/api/admin/departments'),
    ]);
    setReport(r.data); setCourses(c.data); setDepts(d.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filters]);

  const atRisk = report.filter(r => r.at_risk).length;

  const exportCSV = () => {
    const header = 'Student,Course,Attendance %,At Risk,Min Required\n';
    const rows = report.map(r => `${r.student_name},${r.course},${r.attendance_pct},${r.at_risk},${r.min_required}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'attendance_report.csv'; a.click();
  };

  const getColor = pct => pct >= 75 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="page-content">
      <PageHeader
        title="Attendance Reports"
        subtitle="Detailed analytics across all students and courses"
        action={
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
        }
      />

      {atRisk > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(240,74,107,0.08)', border: '1px solid rgba(240,74,107,0.2)',
            borderRadius: 12, padding: '14px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} color="var(--red)" />
          <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            <strong style={{ color: 'var(--red)' }}>{atRisk} student{atRisk > 1 ? 's' : ''}</strong> below minimum attendance threshold
          </span>
        </motion.div>
      )}

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="filter-bar mb-20">
          <select className="form-input" style={{ width: 200 }} value={filters.department_id}
            onChange={e => setFilters({...filters, department_id: e.target.value})}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="form-input" style={{ width: 220 }} value={filters.course_id}
            onChange={e => setFilters({...filters, course_id: e.target.value})}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-3)' }}>
            {report.length} records
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={50} />)}
          </div>
        ) : report.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data available" subtitle="Enroll students and run sessions first" />
        ) : (
          <TableWrap>
            <thead>
              <tr><th>Student</th><th>Course</th><th>Attendance</th><th>Min Required</th><th>Status</th></tr>
            </thead>
            <tbody>
              {report.map((r, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="td-primary">{r.student_name}</td>
                  <td style={{ fontSize: '0.82rem' }}>{r.course}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, maxWidth: 100 }}>
                        <div className="progress-bar">
                          <div className={`progress-fill ${r.at_risk ? 'progress-red' : 'progress-green'}`}
                            style={{ width: `${r.attendance_pct}%` }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700,
                        color: getColor(r.attendance_pct), minWidth: 44 }}>
                        {r.attendance_pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{r.min_required}%</td>
                  <td>
                    {r.at_risk
                      ? <span className="badge badge-red"><AlertTriangle size={10} /> At Risk</span>
                      : <span className="badge badge-green">On Track</span>
                    }
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
