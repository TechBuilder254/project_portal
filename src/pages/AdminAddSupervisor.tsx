import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AdminAddSupervisorProps {
  adminId: string;
}

const AdminAddSupervisor: React.FC<AdminAddSupervisorProps> = () => {
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [filterText, setFilterText] = useState('');

  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newCourseMode, setNewCourseMode] = useState<'select' | 'custom'>('select');

  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setError(null);

      const [{ data: coursesData, error: coursesError }, { data: profileData, error: profileError }] =
        await Promise.all([
          supabase.from('courses').select('name').order('name'),
          supabase.from('profiles').select('*')
        ]);

      if (coursesError || profileError) {
        setError(
          coursesError?.message ??
            profileError?.message ??
            'Failed to load data'
        );
        return;
      }

      setCourseOptions(
        ((coursesData as { name: string }[]) ?? []).map((c) => c.name).sort()
      );

      const allProfiles = (profileData as Profile[]) ?? [];
      const supervisorProfiles = allProfiles.filter((p) => p.role === 'supervisor');
      setSupervisors(supervisorProfiles);
    };

    void loadData();
  }, []);

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newName || !newEmail || !newPassword) {
      setError('Name, email and password are required for a new supervisor.');
      return;
    }

    const chosenCourse = newCourseMode === 'select' ? newCourse : newCourse;

    const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: newEmail,
        password: newPassword,
        name: newName,
        role: 'supervisor',
        course: chosenCourse
      }
    });

    if (fnError || !data?.profile) {
      setError(fnError?.message ?? 'Failed to create supervisor');
      return;
    }

    if (
      newCourse &&
      !courseOptions.some((c) => c.toLowerCase() === newCourse.toLowerCase())
    ) {
      setCourseOptions((prev) => [...prev, newCourse]);
    }

    const createdProfile = data.profile as Profile;
    setSupervisors((prev) => [...prev, createdProfile]);

    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewCourse('');
    setNewCourseMode('select');
    setShowModal(false);
  };

  const filteredSupervisors = supervisors.filter((p) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-title-section">
            <h1 className="admin-title">Supervisors</h1>
            <p className="admin-subtitle">
              View all supervisors, their departments or courses, and add new supervisors.
            </p>
          </div>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => setShowModal(true)}
          >
            <span>+</span>
            <span>Add Supervisor</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-message-modern admin-message-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="admin-card-modern">
        <div className="admin-card-header-modern">
          <h2 className="admin-card-title-modern">
            <span>🎓</span>
            <span>All Supervisors</span>
          </h2>
          <input
            className="admin-search-input-modern"
            placeholder="Search by name, email, course..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div className="admin-table-modern">
          <div className="admin-table-header-modern">
            <div className="admin-table-cell-modern">#</div>
            <div className="admin-table-cell-modern">Name</div>
            <div className="admin-table-cell-modern">Email</div>
            <div className="admin-table-cell-modern">Course / Department</div>
            <div className="admin-table-cell-modern">Role</div>
          </div>
          <div className="admin-table-body-modern">
            {filteredSupervisors.map((p, index) => (
              <div key={p.id} className="admin-table-row-modern">
                <div className="admin-table-cell-modern">{index + 1}</div>
                <div className="admin-table-cell-modern">
                  <div className="list-title">{p.name}</div>
                </div>
                <div className="admin-table-cell-modern">
                  <span className="list-meta">{p.email ?? 'no email'}</span>
                </div>
                <div className="admin-table-cell-modern">
                  <span className="list-meta">{p.department ?? 'Not set'}</span>
                </div>
                <div className="admin-table-cell-modern">
                  <span className="list-meta">{p.role}</span>
                </div>
              </div>
            ))}
            {filteredSupervisors.length === 0 && (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">🔍</div>
                <p className="admin-empty-text">No supervisors match this filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add New Supervisor</h2>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
            <p className="card-subtitle">
              This creates both the Supabase Auth account and the profile in one step.
            </p>
            <form onSubmit={handleCreateSupervisor} className="admin-form-modern">
              <div className="admin-form-group-modern">
                <label className="admin-form-label-modern">
                  <span>👤</span>
                  <span>Full Name</span>
                </label>
                <input
                  className="admin-form-input-modern"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Enter supervisor's full name"
                />
              </div>

              <div className="admin-form-group-modern">
                <label className="admin-form-label-modern">
                  <span>📧</span>
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  className="admin-form-input-modern"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="Enter supervisor's email"
                />
              </div>

              <div className="admin-form-group-modern">
                <label className="admin-form-label-modern">
                  <span>🔒</span>
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  className="admin-form-input-modern"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
              </div>

              <div className="admin-form-group-modern">
                <label className="admin-form-label-modern">
                  <span>🎓</span>
                  <span>Course / Department</span>
                </label>
                {newCourseMode === 'select' ? (
                  <select
                    className="admin-form-select-modern"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                  >
                    <option value="">Select course / department</option>
                    {courseOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__other">Other (type new)</option>
                  </select>
                ) : (
                  <input
                    className="admin-form-input-modern"
                    placeholder="Type course / department name"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                  />
                )}
              </div>

              {newCourseMode === 'select' && newCourse === '__other' && (
                <button
                  type="button"
                  className="admin-action-btn"
                  onClick={() => {
                    setNewCourseMode('custom');
                    setNewCourse('');
                  }}
                >
                  Enter Custom Course / Department
                </button>
              )}

              <button type="submit" className="admin-form-button-modern">
                Save Supervisor Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAddSupervisor;




