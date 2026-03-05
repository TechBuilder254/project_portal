import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile, Submission } from '../types';

const AdminHome: React.FC<{ adminId: string }> = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: profileData }, { data: subData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('submissions').select('*').order('created_at', { ascending: false })
      ]);

      setProfiles((profileData as Profile[]) ?? []);
      setSubmissions((subData as Submission[]) ?? []);
    };

    void load();
  }, []);

  const studentCount = profiles.filter((p) => p.role === 'student').length;
  const supervisorCount = profiles.filter((p) => p.role === 'supervisor').length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const totalSubmissions = submissions.length;
  const pending = submissions.filter((s) => s.status === 'pending').length;
  const recent = submissions.slice(0, 5);

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">
            Quick overview of users and supervision activity across the system.
          </p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>👥</span>
            <span>Students</span>
          </div>
          <div className="admin-stat-value">{studentCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>🎓</span>
            <span>Supervisors</span>
          </div>
          <div className="admin-stat-value">{supervisorCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>⚙️</span>
            <span>Admins</span>
          </div>
          <div className="admin-stat-value">{adminCount}</div>
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
            <span>Pending Reviews</span>
          </div>
          <div className="admin-stat-value">{pending}</div>
        </div>
      </div>

      <div className="admin-card-modern">
        <div className="admin-card-header-modern">
          <h2 className="admin-card-title-modern">
            <span>📋</span>
            <span>Recent Submissions</span>
          </h2>
        </div>
        {recent.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📭</div>
            <p className="admin-empty-text">No submissions yet. Activity will appear here.</p>
          </div>
        ) : (
          <div className="admin-list-modern">
            {recent.map((s) => {
              const owner = profiles.find((p) => p.id === s.student_id);
              return (
                <div key={s.id} className="admin-list-item-modern">
                  <div className="list-title">{s.title}</div>
                  <div className="list-meta">
                    {owner ? `${owner.name} · ` : ''}
                    {new Date(s.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })} · {s.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHome;


