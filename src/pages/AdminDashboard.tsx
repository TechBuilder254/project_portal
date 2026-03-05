import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AdminDashboardProps {
  adminId: string;
}

interface AssignmentRow {
  id: string;
  student: Profile | null;
  supervisor: Profile | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [supervisorId, setSupervisorId] = useState('');
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalSupervisors: number;
    totalSubmissions: number;
    pendingSubmissions: number;
  }>({
    totalStudents: 0,
    totalSupervisors: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [savingUsers, setSavingUsers] = useState(false);

  const loadProfilesAndAssignments = async () => {
    setError(null);

    const [
      { data: profileData, error: profileError },
      { data: assignData, error: assignError },
      { data: subStats, error: subError }
    ] =
      await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('supervisor_assignments').select('*'),
        supabase
          .from('submissions')
          .select('id,status', { count: 'exact', head: false })
      ]);

    if (profileError || assignError || subError) {
      setError(
        profileError?.message ??
          assignError?.message ??
          subError?.message ??
          'Failed to load data'
      );
      return;
    }

    const profileList = (profileData as Profile[]) ?? [];
    setProfiles(profileList);

    const assignmentsRows: AssignmentRow[] =
      (assignData ?? []).map((a) => ({
        id: a.id,
        student: profileList.find((p) => p.id === a.student_id) ?? null,
        supervisor: profileList.find((p) => p.id === a.supervisor_id) ?? null
      })) ?? [];

    setAssignments(assignmentsRows);

    // Default selected student to the first in the list if none selected
    const firstStudent = profileList.find((p) => p.role === 'student');
    setSelectedStudentId((prev) => prev ?? firstStudent?.id ?? null);

    const submissionsArr = subStats ?? [];
    const totalSubmissions = submissionsArr.length;
    const pendingSubmissions = submissionsArr.filter(
      (s: { status: string }) => s.status === 'pending'
    ).length;

    setStats({
      totalStudents: profileList.filter((p) => p.role === 'student').length,
      totalSupervisors: profileList.filter((p) => p.role === 'supervisor').length,
      totalSubmissions,
      pendingSubmissions
    });
  };

  useEffect(() => {
    void loadProfilesAndAssignments();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !supervisorId) return;

    setLoadingAssign(true);
    setError(null);

    // Upsert: if this student already has an assignment, update it, otherwise insert
    const { data: existing, error: existingError } = await supabase
      .from('supervisor_assignments')
      .select('id')
      .eq('student_id', selectedStudentId)
      .maybeSingle();

    if (existingError) {
      setError(existingError.message);
      setLoadingAssign(false);
      return;
    }

    let writeError: string | null = null;

    if (existing?.id) {
      const { error } = await supabase
        .from('supervisor_assignments')
        .update({ supervisor_id: supervisorId })
        .eq('id', existing.id);
      if (error) writeError = error.message;
    } else {
      const { error } = await supabase.from('supervisor_assignments').insert({
        student_id: selectedStudentId,
        supervisor_id: supervisorId
      });
      if (error) writeError = error.message;
    }

    if (writeError) {
      setError(writeError);
      setLoadingAssign(false);
      return;
    }

    setSupervisorId('');
    await loadProfilesAndAssignments();
    setLoadingAssign(false);
  };

  const studentProfiles = profiles.filter((p) => p.role === 'student');
  const supervisorProfiles = profiles.filter((p) => p.role === 'supervisor');
  const selectedStudent =
    studentProfiles.find((s) => s.id === selectedStudentId) ?? studentProfiles[0] ?? null;

  const currentAssignment =
    assignments.find((a) => a.student?.id === selectedStudent?.id) ?? null;

  const assignmentHistory = assignments.filter(
    (a) => a.student?.id === selectedStudent?.id
  );

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Users & Assignments</h1>
          <p className="admin-subtitle">Browse students and manage who supervises who.</p>
        </div>
      </div>

      {error && (
        <div className="admin-message-modern admin-message-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>👥</span>
            <span>Students</span>
          </div>
          <div className="admin-stat-value">{stats.totalStudents}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>🎓</span>
            <span>Supervisors</span>
          </div>
          <div className="admin-stat-value">{stats.totalSupervisors}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>📄</span>
            <span>Submissions</span>
          </div>
          <div className="admin-stat-value">{stats.totalSubmissions}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>⏳</span>
            <span>Pending Reviews</span>
          </div>
          <div className="admin-stat-value">{stats.pendingSubmissions}</div>
        </div>
      </div>

      <div className="grid-two mt-lg">
        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>👥</span>
              <span>Students</span>
            </h2>
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
              {studentProfiles.map((s, index) => {
                const current = assignments.find((a) => a.student?.id === s.id);
                const isSelected = s.id === selectedStudent?.id;
                return (
                  <div
                    key={s.id}
                    className={`admin-table-row-modern ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setSupervisorId(current?.supervisor?.id ?? '');
                    }}
                  >
                    <div className="admin-table-cell-modern">{index + 1}</div>
                    <div className="admin-table-cell-modern">
                      <div className="list-title">{s.name}</div>
                    </div>
                    <div className="admin-table-cell-modern">
                      <span className="list-meta">{s.email ?? 'no email'}</span>
                    </div>
                    <div className="admin-table-cell-modern">
                      <span className="list-meta">{s.department ?? 'No course set'}</span>
                    </div>
                    <div className="admin-table-cell-modern">
                      <span className="list-meta">
                        {current?.supervisor?.name ?? 'Not assigned'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {studentProfiles.length === 0 && (
                <div className="admin-empty-state">
                  <div className="admin-empty-icon">👥</div>
                  <p className="admin-empty-text">No students found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>⚙️</span>
              <span>Student Details & Assignment</span>
            </h2>
          </div>
          {!selectedStudent ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">👆</div>
              <p className="admin-empty-text">Select a student on the left to manage.</p>
            </div>
          ) : (
            <>
              <div className="admin-list-item-modern" style={{ marginBottom: '24px' }}>
                <div className="list-title">
                  {selectedStudent.name}{' '}
                  <span className="list-meta">({selectedStudent.email})</span>
                </div>
                <div className="list-meta">
                  Course / programme: {selectedStudent.department ?? 'Not set'}
                </div>
              </div>

              <form onSubmit={handleAssign} className="admin-form-modern">
                <div className="admin-form-group-modern">
                  <label className="admin-form-label-modern">
                    <span>🎓</span>
                    <span>Supervisor</span>
                  </label>
                  <select
                    className="admin-form-select-modern"
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                  >
                    <option value="">Select supervisor</option>
                    {supervisorProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="admin-form-button-modern" disabled={loadingAssign}>
                  {loadingAssign ? 'Assigning…' : 'Assign / Change Supervisor'}
                </button>
              </form>

              <div style={{ marginTop: '24px' }}>
                <h3 className="admin-card-title-modern" style={{ fontSize: '16px', marginBottom: '16px' }}>
                  <span>📜</span>
                  <span>Assignment History</span>
                </h3>
                {assignmentHistory.length === 0 ? (
                  <div className="admin-empty-state">
                    <p className="admin-empty-text">No supervisors assigned yet for this student.</p>
                  </div>
                ) : (
                  <div className="admin-list-modern">
                    {assignmentHistory.map((a) => (
                      <div key={a.id} className="admin-list-item-modern">
                        <div className="list-title">
                          {a.student?.name ?? 'Unknown student'} →{' '}
                          {a.supervisor?.name ?? 'Unknown supervisor'}
                        </div>
                        <div className="list-meta">
                          {a.student?.email ?? ''} · {a.supervisor?.email ?? ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


