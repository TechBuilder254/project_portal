import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Submission, Profile } from '../types';

interface SupervisorHomeProps {
  supervisorId: string;
}

const SupervisorHome: React.FC<SupervisorHomeProps> = ({ supervisorId }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'changes_requested'>('all');

  useEffect(() => {
    const load = async () => {
      const { data: assignments } = await supabase
        .from('supervisor_assignments')
        .select('student_id')
        .eq('supervisor_id', supervisorId);

      const studentIds = (assignments ?? []).map((a: { student_id: string }) => a.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        setSubmissions([]);
        return;
      }

      const [{ data: profiles }, { data: subs }] = await Promise.all([
        supabase.from('profiles').select('*').in('id', studentIds),
        supabase
          .from('submissions')
          .select('*')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
      ]);

      setStudents((profiles as Profile[]) ?? []);
      setSubmissions((subs as Submission[]) ?? []);
    };

    void load();
  }, [supervisorId]);

  // Calculate stats
  const totalStudents = students.length;
  const totalSubmissions = submissions.length;
  const pendingReviews = submissions.filter((s) => s.status === 'pending').length;
  const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length;
  const changesRequestedCount = submissions.filter((s) => s.status === 'changes_requested').length;
  
  // Calculate this week's submissions
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisWeekSubmissions = submissions.filter(
    (s) => new Date(s.created_at) >= thisWeekStart
  ).length;
  
  // Calculate average review time (mock for now - would need feedback timestamps)
  const averageReviewTime = totalSubmissions > 0 ? Math.round(totalSubmissions / 2) : 0;

  // Filter submissions based on search and status
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => 
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        students.find(st => st.id === s.student_id)?.name.toLowerCase().includes(query) ||
        students.find(st => st.id === s.student_id)?.email.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [submissions, statusFilter, searchQuery, students]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter((s) =>
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.department?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  return (
    <div className="page admin-page supervisor-dashboard">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Supervisor Dashboard</h1>
          <p className="admin-subtitle">
            Overview of your assigned students and recent submission activity.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="dashboard-search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search students, submissions, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Filter Tabs */}
      <div className="dashboard-filters">
        <button
          type="button"
          className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({totalSubmissions})
        </button>
        <button
          type="button"
          className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          Pending ({pendingReviews})
        </button>
        <button
          type="button"
          className={`filter-tab ${statusFilter === 'reviewed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('reviewed')}
        >
          Reviewed ({reviewedCount})
        </button>
        <button
          type="button"
          className={`filter-tab ${statusFilter === 'changes_requested' ? 'active' : ''}`}
          onClick={() => setStatusFilter('changes_requested')}
        >
          Changes ({changesRequestedCount})
        </button>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>👥</span>
            <span>Assigned Students</span>
          </div>
          <div className="admin-stat-value">{totalStudents}</div>
        </div>
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
            <span>Reviews Pending</span>
          </div>
          <div className="admin-stat-value">{pendingReviews}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>📅</span>
            <span>This Week</span>
          </div>
          <div className="admin-stat-value">{thisWeekSubmissions}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>⏱</span>
            <span>Avg. Review Time</span>
          </div>
          <div className="admin-stat-value">{averageReviewTime}h</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>👥</span>
              <span>Assigned Students</span>
            </h2>
            {students.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="admin-stat-value" style={{ fontSize: '14px', fontWeight: '600' }}>{filteredStudents.length}</span>
                <button
                  type="button"
                  className="admin-action-btn"
                  onClick={() => navigate('/supervisor/reviews')}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  View all →
                </button>
              </div>
            )}
          </div>
          {filteredStudents.length === 0 && students.length > 0 ? (
            <p className="muted">No students match your search.</p>
          ) : students.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">👥</div>
              <p className="admin-empty-text">No students assigned yet.</p>
            </div>
          ) : (
            <div className="admin-list-modern">
              {filteredStudents.map((s, index) => {
                const studentSubmissions = submissions.filter(sub => sub.student_id === s.id);
                const pendingCount = studentSubmissions.filter(sub => sub.status === 'pending').length;
                return (
                  <div
                    key={s.id}
                    className="admin-list-item-modern"
                    onClick={() => navigate('/supervisor/reviews')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate('/supervisor/reviews');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="list-title">{s.name}</div>
                    <div className="list-meta">
                      {s.email} · {s.department ?? 'No department'}
                    </div>
                    {pendingCount > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>
                        {pendingCount} pending review{pendingCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-card-modern">
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>📎</span>
              <span>Latest Submissions</span>
            </h2>
            {submissions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="admin-stat-value" style={{ fontSize: '14px', fontWeight: '600' }}>{filteredSubmissions.length}</span>
                <button
                  type="button"
                  className="admin-action-btn"
                  onClick={() => navigate('/supervisor/reviews')}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  View all →
                </button>
              </div>
            )}
          </div>
          {filteredSubmissions.length === 0 && submissions.length > 0 ? (
            <p className="muted">No submissions match your filters.</p>
          ) : submissions.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">📎</div>
              <p className="admin-empty-text">No submissions yet.</p>
            </div>
          ) : (
            <div className="admin-list-modern">
              {filteredSubmissions.slice(0, 5).map((s) => {
                const student = students.find(st => st.id === s.student_id);
                const statusColors: Record<string, string> = {
                  pending: '#fbbf24',
                  reviewed: '#60a5fa',
                  changes_requested: '#f87171'
                };
                const statusLabels: Record<string, string> = {
                  pending: 'Pending',
                  reviewed: 'Reviewed',
                  changes_requested: 'Changes Requested'
                };
                return (
                  <div
                    key={s.id}
                    className="admin-list-item-modern"
                    onClick={() => navigate('/supervisor/reviews')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate('/supervisor/reviews');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="list-title">{s.title}</div>
                    <div className="list-meta">
                      {student?.name || 'Unknown'} · {new Date(s.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })}
                    </div>
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: statusColors[s.status] || '#94a3b8', 
                      fontWeight: '600',
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: `${statusColors[s.status] || '#94a3b8'}20`
                    }}>
                      {statusLabels[s.status] || s.status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorHome;


