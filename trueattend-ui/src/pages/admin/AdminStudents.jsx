import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, CheckCircle, XCircle, Camera } from 'lucide-react';
import { PageHeader, Modal, TableWrap, EmptyState, Skeleton } from '../../components/shared/UI';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', student_id: '', batch: '', phone: '', department_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, d] = await Promise.all([api.get('/api/admin/students'), api.get('/api/admin/departments')]);
    setStudents(s.data); setDepartments(d.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = students.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search)) &&
    (!deptFilter || s.department_id == deptFilter)
  );

  const create = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/api/admin/students', form);
      toast.success('Student created successfully');
      setShowModal(false);
      setForm({ name: '', email: '', student_id: '', batch: '', phone: '', department_id: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Student Registry"
        subtitle={`${students.length} students registered`}
        action={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Student
          </button>
        }
      />

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={15} />
            <input className="form-input" placeholder="Search by name or roll no..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 180 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-3)' }}>
            {filtered.length} results
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={50} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No students found" subtitle="Try adjusting your filters" />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Roll No</th><th>Batch</th>
                <th>Face Registered</th><th>Samples</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr key={s.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-8">
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'linear-gradient(135deg, var(--blue)22, var(--teal)22)',
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--blue)',
                        flexShrink: 0,
                      }}>
                        {s.name[0]}
                      </div>
                      <div>
                        <div className="td-primary">{s.name}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-mono" style={{ fontSize: '0.82rem', color: 'var(--teal)' }}>{s.student_id}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{s.batch || '—'}</td>
                  <td>
                    {s.face_registered
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontSize: '0.82rem', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Registered
                        </span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)', fontSize: '0.82rem' }}>
                          <XCircle size={14} /> Pending
                        </span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={13} color="var(--text-3)" />
                      <span style={{ fontSize: '0.82rem', color: s.face_samples > 0 ? 'var(--teal)' : 'var(--text-3)' }}>
                        {s.face_samples || 0}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.face_registered ? 'badge-green' : 'badge-amber'}`}>
                      {s.face_registered ? 'Active' : 'Incomplete'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </motion.div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Register New Student">
        <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Arjun Mehta" required
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="student@college.edu" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input className="form-input" placeholder="CS2021001" required
                value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Batch</label>
              <input className="form-input" placeholder="2021-2025"
                value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="+91 9999000000"
                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-3)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-3)' }}>
            Default password will be the roll number. Student must change it on first login.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
              {saving ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
