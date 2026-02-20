import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Send } from 'lucide-react';
import { PageHeader, Badge, TableWrap, EmptyState, Modal } from '../../components/shared/UI';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ course_id: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [l, c] = await Promise.all([api.get('/api/student/leave-requests'), api.get('/api/student/my-attendance')]);
    setLeaves(l.data);
    setCourses(c.data.map(d => ({ id: d.course_id, name: d.course_name })));
  };
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/api/student/leave-request', { ...form, course_id: parseInt(form.course_id) });
      toast.success('Leave request submitted');
      setShowModal(false);
      setForm({ course_id: '', reason: '' });
      load();
    } catch { toast.error('Failed to submit request'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Leave Requests"
        subtitle="Submit and track your absence requests"
        action={<button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New Request</button>}
      />

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {leaves.length === 0 ? (
          <EmptyState icon={FileText} title="No leave requests" subtitle="Submit a request if you missed or will miss a class" />
        ) : (
          <TableWrap>
            <thead><tr><th>Course</th><th>Reason</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              {leaves.map((l, i) => (
                <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td className="td-primary">{l.course}</td>
                  <td style={{ maxWidth: 280, fontSize: '0.82rem', color: 'var(--text-2)' }}>{l.reason}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td><Badge type={l.status}>{l.status}</Badge></td>
                </motion.tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </motion.div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Leave Request">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Course</label>
            <select className="form-input" required value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})}>
              <option value="">Select course...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-input" rows={4} required placeholder="Explain your reason for absence..."
              value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
              style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
              <Send size={14} /> {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
