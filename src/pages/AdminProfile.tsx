import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

const AdminProfile: React.FC<{ adminId: string }> = ({ adminId }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', adminId)
        .single();

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const p = data as Profile;
      setProfile(p);
      setName(p.name);
      setDepartment(p.department ?? '');
      setLoading(false);
    };

    void load();
  }, [adminId]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name, department })
      .eq('id', adminId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess('Profile updated successfully.');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const { error: pwError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (pwError) {
      setError(pwError.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setSuccess('Password updated successfully.');
  };

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <h1 className="profile-title">Profile &amp; Security</h1>
        <p className="profile-subtitle">
          Manage your admin account details and password.
        </p>
      </div>

      {loading && <p className="muted">Loading profile…</p>}
      {error && (
        <div className="profile-message-modern profile-message-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="profile-message-modern profile-message-success">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {!loading && profile && (
        <div>
          <div className="profile-section">
            <div className="profile-card-modern">
              <div className="profile-card-header">
                <div className="profile-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h2 className="profile-card-title-modern">Account Details</h2>
              </div>
              <form onSubmit={handleProfileSave} className="profile-form-modern">
                <div className="profile-form-group">
                  <label className="profile-form-label-modern">
                    <span>👤</span>
                    <span>Full Name</span>
                  </label>
                  <input
                    className="profile-form-input-modern"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label-modern">
                    <span>🏢</span>
                    <span>Department</span>
                  </label>
                  <input
                    className="profile-form-input-modern"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Enter your department"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label-modern">
                    <span>📧</span>
                    <span>Email</span>
                  </label>
                  <input 
                    className="profile-form-input-modern" 
                    value={profile.email} 
                    disabled 
                    placeholder="Your email address"
                  />
                </div>

                <button className="profile-form-button-modern" type="submit">
                  Save Profile
                </button>
              </form>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-card-modern">
              <div className="profile-card-header">
                <div className="profile-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h2 className="profile-card-title-modern">Change Password</h2>
              </div>
              <form onSubmit={handlePasswordChange} className="profile-form-modern">
                <div className="profile-form-group">
                  <label className="profile-form-label-modern">
                    <span>🔒</span>
                    <span>New Password</span>
                  </label>
                  <input
                    type="password"
                    className="profile-form-input-modern"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label-modern">
                    <span>🔐</span>
                    <span>Confirm New Password</span>
                  </label>
                  <input
                    type="password"
                    className="profile-form-input-modern"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                  />
                </div>

                <button className="profile-form-button-modern" type="submit">
                  Update Password
                </button>
              </form>
              <p className="profile-hint-modern">
                Choose a strong password and avoid sharing it. If you suspect someone else has access, change it immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;


