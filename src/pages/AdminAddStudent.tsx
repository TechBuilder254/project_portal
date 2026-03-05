import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AdminAddStudentProps {
  adminId: string;
}

interface StudentRow {
  profile: Profile;
  supervisorName: string | null;
}

const AdminAddStudent: React.FC<AdminAddStudentProps> = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filterText, setFilterText] = useState('');

  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState('');
  const [newStudentCourseMode, setNewStudentCourseMode] = useState<'select' | 'custom'>(
    'select'
  );

  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setError(null);

      const [
        { data: coursesData, error: coursesError },
        { data: profileData, error: profileError },
        { data: assignData, error: assignError }
      ] = await Promise.all([
        supabase.from('courses').select('name').order('name'),
        supabase.from('profiles').select('*'),
        supabase.from('supervisor_assignments').select('*')
      ]);

      if (coursesError || profileError || assignError) {
        setError(
          coursesError?.message ??
            profileError?.message ??
            assignError?.message ??
            'Failed to load data'
        );
        return;
      }

      setCourseOptions(
        ((coursesData as { name: string }[]) ?? []).map((c) => c.name).sort()
      );

      const allProfiles = (profileData as Profile[]) ?? [];
      const studentProfiles = allProfiles.filter((p) => p.role === 'student');
      const supervisorProfiles = allProfiles.filter((p) => p.role === 'supervisor');

      const supervisorIndex: Record<string, Profile> = {};
      supervisorProfiles.forEach((s) => {
        supervisorIndex[s.id] = s;
      });

      const assignmentsArr = (assignData as any[]) ?? [];
      const supervisorByStudent: Record<string, string | null> = {};
      assignmentsArr.forEach((a) => {
        const sup = supervisorIndex[a.supervisor_id as string];
        if (a.student_id) {
          supervisorByStudent[a.student_id as string] = sup ? sup.name : null;
        }
      });

      const rows: StudentRow[] = studentProfiles.map((p) => ({
        profile: p,
        supervisorName: supervisorByStudent[p.id] ?? null
      }));

      setStudents(rows);
    };

    void loadData();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newStudentName || !newStudentEmail || !newStudentPassword) {
      setError('Name, email and password are required for a new student.');
      return;
    }

    const chosenCourse =
      newStudentCourseMode === 'select' ? newStudentCourse : newStudentCourse;

    const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: newStudentEmail,
        password: newStudentPassword,
        name: newStudentName,
        role: 'student',
        course: chosenCourse
      }
    });

    if (fnError || !data?.profile) {
      setError(fnError?.message ?? 'Failed to create user');
      return;
    }

    // Keep course options in sync
    if (
      newStudentCourse &&
      !courseOptions.some((c) => c.toLowerCase() === newStudentCourse.toLowerCase())
    ) {
      setCourseOptions((prev) => [...prev, newStudentCourse]);
    }

    const createdProfile = data.profile as Profile;

    setStudents((prev) => [
      ...prev,
      { profile: createdProfile, supervisorName: null }
    ]);

    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPassword('');
    setNewStudentCourse('');
    setNewStudentCourseMode('select');
  };

  const filteredStudents = students.filter((row) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    const p = row.profile;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q) ||
      (row.supervisorName ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-title-section">
            <h1 className="admin-title">Students</h1>
            <p className="admin-subtitle">
              View all students, see their course and assigned supervisor, and add new accounts.
            </p>
          </div>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => setShowModal(true)}
          >
            <span>+</span>
            <span>Add Student</span>
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
            <span>👥</span>
            <span>All Students</span>
          </h2>
          <input
            className="admin-search-input-modern"
            placeholder="Search by name, email, course, supervisor..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div className="admin-table-modern">
          <div className="admin-table-header-modern">
            <div className="admin-table-cell-modern">#</div>
            <div className="admin-table-cell-modern">Name</div>
            <div className="admin-table-cell-modern">Email</div>
            <div className="admin-table-cell-modern">Course</div>
            <div className="admin-table-cell-modern">Supervisor</div>
          </div>
          <div className="admin-table-body-modern">
            {filteredStudents.map((row, index) => (
              <div key={row.profile.id} className="admin-table-row-modern">
                <div className="admin-table-cell-modern">{index + 1}</div>
                <div className="admin-table-cell-modern">
                  <div className="list-title">{row.profile.name}</div>
                </div>
                <div className="admin-table-cell-modern">
                  <span className="list-meta">{row.profile.email ?? 'no email'}</span>
                </div>
                <div className="admin-table-cell-modern">
                  <span className="list-meta">
                    {row.profile.department ?? 'No course set'}
                  </span>
                </div>
                <div className="admin-table-cell-modern">
                  <span className="list-meta">
                    {row.supervisorName ?? 'Not assigned'}
                  </span>
                </div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">🔍</div>
                <p className="admin-empty-text">No students match this filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add New Student</h2>
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
            <form onSubmit={handleCreateStudent} className="admin-form-modern">
              <div className="admin-form-group-modern">
                <label className="admin-form-label-modern">
                  <span>👤</span>
                  <span>Full Name</span>
                </label>
                <input
                  className="admin-form-input-modern"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  required
                  placeholder="Enter student's full name"
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
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  required
                  placeholder="Enter student's email"
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
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
              </div>

              <div className="admin-form-group-modern">
                <label className="admin-form-label-modern">
                  <span>🎓</span>
                  <span>Course / Programme</span>
                </label>
                {newStudentCourseMode === 'select' ? (
                  <select
                    className="admin-form-select-modern"
                    value={newStudentCourse}
                    onChange={(e) => setNewStudentCourse(e.target.value)}
                  >
                    <option value="">Select course</option>
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
                    placeholder="Type course name"
                    value={newStudentCourse}
                    onChange={(e) => setNewStudentCourse(e.target.value)}
                  />
                )}
              </div>

              {newStudentCourseMode === 'select' && newStudentCourse === '__other' && (
                <button
                  type="button"
                  className="admin-action-btn"
                  onClick={() => {
                    setNewStudentCourseMode('custom');
                    setNewStudentCourse('');
                  }}
                >
                  Enter Custom Course Name
                </button>
              )}

              <button type="submit" className="admin-form-button-modern">
                Save Student Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAddStudent;



