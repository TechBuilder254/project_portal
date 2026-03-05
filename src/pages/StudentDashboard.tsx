import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Submission, Feedback } from '../types';
import SubmissionModal from '../components/SubmissionModal';

interface StudentDashboardProps {
  studentId: string;
}

type SubmissionWithFeedback = Submission & { feedback: Feedback[] };

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

const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchSubmissions = async () => {
    const { data, error: err } = await supabase
      .from('submissions')
      .select('*, feedback(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
      return;
    }

    setSubmissions(
      (data as unknown as (Submission & { feedback: Feedback[] })[]) ?? []
    );
  };

  useEffect(() => {
    void fetchSubmissions();
  }, []);

  const handleUpload = async (title: string, description: string, file: File) => {
    setLoading(true);
    setError(null);

    const path = `${studentId}/${Date.now()}-${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('submissions')
      .upload(path, file);

    if (storageError || !storageData) {
      setError(storageError?.message ?? 'Upload failed');
      setLoading(false);
      throw new Error(storageError?.message ?? 'Upload failed');
    }

    const { error: insertError } = await supabase.from('submissions').insert({
      student_id: studentId,
      title,
      description,
      file_url: storageData.path,
      status: 'pending'
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      throw new Error(insertError.message);
    }

    await fetchSubmissions();
    setLoading(false);
  };

  const getFilePublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const changesCount = submissions.filter(
    (s) => s.status === 'changes_requested'
  ).length;
  const approvedCount = submissions.filter((s) => s.status === 'reviewed').length;

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Student Dashboard</h1>
          <p className="admin-subtitle">
            Upload project work and track supervisor feedback in one place.
          </p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>📄</span>
            <span>Total Submissions</span>
          </div>
          <div className="admin-stat-value">{totalSubmissions}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>⏳</span>
            <span>Pending Review</span>
          </div>
          <div className="admin-stat-value">{pendingCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>🔄</span>
            <span>Changes Requested</span>
          </div>
          <div className="admin-stat-value">{changesCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>✅</span>
            <span>Approved / Reviewed</span>
          </div>
          <div className="admin-stat-value">{approvedCount}</div>
        </div>
      </div>

      <div className="admin-header-content" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          className="admin-action-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <span>📤</span>
          <span>Upload New Submission</span>
        </button>
      </div>

      <SubmissionModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUpload}
        isLoading={loading}
      />

      {error && (
        <div className="admin-message-modern admin-message-error" style={{ marginBottom: '24px' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="admin-card-modern">
        <div className="admin-card-header-modern">
          <h2 className="admin-card-title-modern">
            <span>📚</span>
            <span>Submission History</span>
          </h2>
        </div>

        {submissions.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📭</div>
            <p className="admin-empty-text">No submissions yet. Upload your first project file to get started.</p>
          </div>
        ) : (
          <div className="admin-list-modern">
            {submissions.map((s) => (
              <div 
                key={s.id} 
                className="admin-list-item-modern"
              >
                <div className="list-title">{s.title}</div>
                <div className="list-meta">
                  📅 {new Date(s.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: statusColor[s.status]?.includes('pending') ? '#fbbf2420' : statusColor[s.status]?.includes('reviewed') ? '#60a5fa20' : '#f8717120',
                  color: statusColor[s.status]?.includes('pending') ? '#fbbf24' : statusColor[s.status]?.includes('reviewed') ? '#60a5fa' : '#f87171'
                }}>
                  {statusLabel[s.status]}
                </div>
                {s.description && (
                  <p className="list-description" style={{ marginTop: '12px', marginBottom: '12px' }}>
                    {s.description}
                  </p>
                )}
                <a
                  href={getFilePublicUrl(s.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-action-btn"
                  style={{ display: 'inline-block', marginTop: '8px', textDecoration: 'none', fontSize: '14px', padding: '8px 16px' }}
                >
                  📎 Open File
                </a>
                {s.feedback && s.feedback.length > 0 && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(96, 165, 250, 0.1)',
                    border: '1px solid rgba(96, 165, 250, 0.2)'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#60a5fa',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      💬 Supervisor Feedback
                    </div>
                    {s.feedback.map((f) => {
                      const points = f.comment.split('\n').map((line) => line.trim()).filter(Boolean);
                      return (
                        <div key={f.id} style={{
                          marginBottom: '12px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid rgba(96, 165, 250, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            flexWrap: 'wrap'
                          }}>
                            <span className="badge badge-rating" style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}>
                              ⭐ {f.rating}/5
                            </span>
                            <span className="badge" style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}>
                              {f.action === 'approved' ? '✅ Approved' : '🔄 Revision requested'}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              color: '#94a3b8'
                            }}>
                              {new Date(f.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
                            </span>
                          </div>
                          {points.length > 1 ? (
                            <ul style={{
                              margin: 0,
                              paddingLeft: '20px',
                              color: '#cbd5e1',
                              fontSize: '13px',
                              lineHeight: '1.8'
                            }}>
                              {points.map((p, idx) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>{p}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{
                              margin: 0,
                              color: '#cbd5e1',
                              fontSize: '13px',
                              lineHeight: '1.8'
                            }}>
                              {f.comment}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;


