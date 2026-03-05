import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Submission, Feedback, Profile } from '../types';
import FeedbackModal from '../components/FeedbackModal';

interface SupervisorDashboardProps {
  supervisorId: string;
}

interface StudentSummary extends Profile {
  latestSubmission?: Submission;
  pendingCount: number;
}

type SubmissionWithStudent = Submission & { student: Profile | null; feedback: Feedback[] };

const statusLabel: Record<Submission['status'], string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  changes_requested: 'Changes requested'
};

const statusColor: Record<Submission['status'], string> = {
  pending: 'badge badge-pending',
  reviewed: 'badge badge-reviewed',
  changes_requested: 'badge badge-changes'
};

const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ supervisorId }) => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithStudent | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'reviewed' | 'changes_requested'
  >('all');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);

    // Get assigned students
    const { data: assignments, error: assignError } = await supabase
      .from('supervisor_assignments')
      .select('student_id')
      .eq('supervisor_id', supervisorId);

    if (assignError) {
      setError(assignError.message);
      return;
    }

    const studentIds = (assignments ?? []).map((a) => a.student_id);
    if (studentIds.length === 0) {
      setStudents([]);
      setPendingSubmissions([]);
      return;
    }

    const [{ data: profiles, error: profileError }, { data: submissions, error: subError }] =
      await Promise.all([
        supabase.from('profiles').select('*').in('id', studentIds),
        supabase
          .from('submissions')
          .select('*, feedback(*)')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
      ]);

    if (profileError || subError) {
      setError(profileError?.message ?? subError?.message ?? 'Failed to load data');
      return;
    }

    const submissionsTyped = (submissions as unknown as (Submission & {
      feedback: Feedback[];
    })[]) ?? [];
    const profilesTyped = (profiles as Profile[]) ?? [];

    // Build student summaries
    const studentSummary: StudentSummary[] = profilesTyped.map((p) => {
      const studentSubs = submissionsTyped.filter((s) => s.student_id === p.id);
      const latestSubmission = studentSubs[0];
      const pendingCount = studentSubs.filter((s) => s.status === 'pending').length;
      return { ...p, latestSubmission, pendingCount };
    });

    setStudents(studentSummary);

    const all: SubmissionWithStudent[] = submissionsTyped.map((s) => ({
      ...s,
      student: profilesTyped.find((p) => p.id === s.student_id) ?? null
    }));

    setSubmissions(all);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSelectSubmission = (submission: SubmissionWithStudent) => {
    setSelectedSubmission(submission);
  };

  const handleSubmitFeedback = async (comment: string, rating: number, action: 'approved' | 'revise') => {
    if (!selectedSubmission) return;

    setLoading(true);
    setError(null);

    const { error: feedbackError } = await supabase.from('feedback').insert({
      submission_id: selectedSubmission.id,
      supervisor_id: supervisorId,
      comment,
      rating,
      action
    });

    if (feedbackError) {
      setError(feedbackError.message);
      setLoading(false);
      throw new Error(feedbackError.message);
    }

    // Update submission status
    const newStatus = action === 'approved' ? 'reviewed' : 'changes_requested';
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', selectedSubmission.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      throw new Error(updateError.message);
    }

    await loadData();
    // Reselect the same submission from refreshed data
    setSelectedSubmission(
      (prev) =>
        submissions.find((s) => s.id === (prev ?? selectedSubmission).id) ?? null
    );
    setLoading(false);
  };

  const getFilePublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const filteredSubmissions = submissions.filter((s) => {
    const byStudent = selectedStudentId === 'all' || s.student_id === selectedStudentId;
    const byStatus = statusFilter === 'all' || s.status === statusFilter;
    return byStudent && byStatus;
  });

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Supervisor Dashboard</h1>
          <p className="admin-subtitle">
            View assigned students, review their submissions, and record feedback.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-message-modern admin-message-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>👥</span>
              <span>Assigned Students</span>
            </h2>
          </div>
          {students.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">👥</div>
              <p className="admin-empty-text">No students assigned yet.</p>
            </div>
          ) : (
            <div className="admin-list-modern">
              <button
                type="button"
                className={`admin-list-item-modern${selectedStudentId === 'all' ? ' list-item-active' : ''}`}
                onClick={() => setSelectedStudentId('all')}
                style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
              >
                <div className="list-title">All Students</div>
                <div className="list-meta">
                  {students.length} students · {submissions.length} submissions
                </div>
              </button>
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`admin-list-item-modern${selectedStudentId === s.id ? ' list-item-active' : ''}`}
                  onClick={() => setSelectedStudentId(s.id)}
                  style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  <div className="list-title">{s.name}</div>
                  <div className="list-meta">{s.email}</div>
                  <div className="list-meta">
                    {s.department ?? 'No department'} · Pending:{' '}
                    <strong>{s.pendingCount}</strong>
                  </div>
                  {s.latestSubmission && (
                    <div className="muted small">
                      Latest: {s.latestSubmission.title} (
                      {new Date(s.latestSubmission.created_at).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })})
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>📎</span>
              <span>Submissions</span>
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`meetings-tab${statusFilter === 'all' ? ' active' : ''}`}
                onClick={() => setStatusFilter('all')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                All
              </button>
              <button
                type="button"
                className={`meetings-tab${statusFilter === 'pending' ? ' active' : ''}`}
                onClick={() => setStatusFilter('pending')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Pending
              </button>
              <button
                type="button"
                className={`meetings-tab${statusFilter === 'changes_requested' ? ' active' : ''}`}
                onClick={() => setStatusFilter('changes_requested')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Changes
              </button>
              <button
                type="button"
                className={`meetings-tab${statusFilter === 'reviewed' ? ' active' : ''}`}
                onClick={() => setStatusFilter('reviewed')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Reviewed
              </button>
            </div>
          </div>
          {filteredSubmissions.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">📎</div>
              <p className="admin-empty-text">No submissions match this filter.</p>
            </div>
          ) : (
            <div className="admin-list-modern">
              {filteredSubmissions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`admin-list-item-modern${selectedSubmission?.id === s.id ? ' list-item-active' : ''}`}
                  onClick={() => handleSelectSubmission(s)}
                  style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                <div className="list-title">{s.title}</div>
                <div className="list-meta">
                  {s.student?.name ?? 'Unknown student'} ·{' '}
                  {new Date(s.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '12px', 
                  color: statusColor[s.status]?.includes('orange') ? '#fbbf24' : statusColor[s.status]?.includes('blue') ? '#60a5fa' : statusColor[s.status]?.includes('red') ? '#f87171' : '#94a3b8',
                  fontWeight: '600',
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: `${statusColor[s.status]?.includes('orange') ? '#fbbf24' : statusColor[s.status]?.includes('blue') ? '#60a5fa' : statusColor[s.status]?.includes('red') ? '#f87171' : '#94a3b8'}20`
                }}>
                  {statusLabel[s.status]}
                </div>
                {s.description && (
                  <p className="list-description" style={{ marginTop: '8px', marginBottom: 0 }}>{s.description}</p>
                )}
              </button>
            ))}
            </div>
          )}
        </div>
      </div>

      {selectedSubmission && (
        <div className="admin-card-modern" style={{ marginTop: '32px' }}>
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>📝</span>
              <span>Review Submission</span>
            </h2>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => setSelectedSubmission(null)}
            >
              Close
            </button>
          </div>
          <div className="admin-list-item-modern">
            <div className="list-title">{selectedSubmission.title}</div>
            <div className="list-meta">
              Student: {selectedSubmission.student?.name ?? 'Unknown'} ·{' '}
              {new Date(selectedSubmission.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
            </div>
            {selectedSubmission.description && (
              <p className="list-description" style={{ marginTop: '12px', marginBottom: '16px' }}>{selectedSubmission.description}</p>
            )}
            <a
              href={getFilePublicUrl(selectedSubmission.file_url)}
              target="_blank"
              rel="noreferrer"
              className="admin-action-btn"
              style={{ display: 'inline-block', marginTop: '8px', textDecoration: 'none' }}
            >
              📄 Open File
            </a>

          {selectedSubmission.feedback && selectedSubmission.feedback.length > 0 && (
            <div className="feedback-block mt-md">
              <div className="feedback-title">Previous feedback</div>
              {selectedSubmission.feedback.map((f) => {
                const points = f.comment.split('\n').map((l) => l.trim()).filter(Boolean);
                return (
                  <div key={f.id} className="feedback-entry">
                    <div className="feedback-meta">
                      <span className="badge badge-rating">
                        Rating: {f.rating}/5
                      </span>
                      <span className="badge">
                        {f.action === 'approved' ? 'Approved' : 'Revision requested'}
                      </span>
                      <span className="list-meta">
                        {new Date(f.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
                      </span>
                    </div>
                    {points.length > 1 ? (
                      <ul className="bottom-list">
                        {points.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{f.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowFeedbackModal(true)}
            >
              Provide Feedback
            </button>
          </div>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleSubmitFeedback}
        submission={selectedSubmission}
        existingFeedback={selectedSubmission?.feedback || []}
        isLoading={loading}
      />
    </div>
  );
};

export default SupervisorDashboard;


