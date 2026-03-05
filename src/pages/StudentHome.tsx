import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Submission } from '../types';

interface StudentHomeProps {
  studentId: string;
}

const StudentHome: React.FC<StudentHomeProps> = ({ studentId }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      setSubmissions((data as Submission[]) ?? []);
      setLoading(false);
    };

    void load();
  }, [studentId]);

  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const changesCount = submissions.filter(
    (s) => s.status === 'changes_requested'
  ).length;
  const approvedCount = submissions.filter((s) => s.status === 'reviewed').length;
  const latest = submissions[0] ?? null;

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Student Dashboard</h1>
          <p className="admin-subtitle">
            High-level view of your project progress and supervision activity.
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px' 
      }}>
        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>💡</span>
              <span>Next Step</span>
            </h2>
          </div>
          <p style={{ 
            fontSize: '15px', 
            color: '#e5e7eb', 
            lineHeight: '1.7', 
            marginBottom: '16px' 
          }}>
            Go to <strong style={{ color: '#60a5fa' }}>My submissions</strong> to upload a new chapter or revision for your supervisor.
          </p>
          <div className="profile-hint-modern">
            💡 Tip: Use clear titles like &quot;Chapter 2 – Literature review (2nd draft)&quot; so your supervisor can quickly see what changed.
          </div>
        </div>

        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>📋</span>
              <span>Latest Activity</span>
            </h2>
          </div>
          {loading && (
            <p className="muted">Loading your history…</p>
          )}
          {!loading && !latest ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">📭</div>
              <p className="admin-empty-text">No activity yet. Start by uploading your first file.</p>
            </div>
          ) : !loading && latest && (
            <div className="admin-list-item-modern">
              <div className="list-title">{latest.title}</div>
              <div className="list-meta">
                📅 Submitted on {new Date(latest.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
              </div>
              {latest.description && (
                <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px', marginBottom: 0, lineHeight: '1.6' }}>
                  {latest.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentHome;


