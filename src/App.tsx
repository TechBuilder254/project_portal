import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import type { Profile, UserRole } from './types';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudentHome from './pages/StudentHome';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentMeetings from './pages/StudentMeetings';
import StudentRecapForm from './pages/StudentRecapForm';
import SupervisorHome from './pages/SupervisorHome';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorProfile from './pages/SupervisorProfile';
import SupervisorMeetings from './pages/SupervisorMeetings';
import SupervisorScheduleMeeting from './pages/SupervisorScheduleMeeting';
import SupervisorMeetingDetails from './pages/SupervisorMeetingDetails';
import AdminHome from './pages/AdminHome';
import AdminDashboard from './pages/AdminDashboard';
import AdminAddStudent from './pages/AdminAddStudent';
import AdminAddSupervisor from './pages/AdminAddSupervisor';
import AdminProfile from './pages/AdminProfile';

const App: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadProfileForCurrentSession = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setProfile(null);
    } else {
      setProfile(profileData as Profile);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadProfileForCurrentSession();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      void loadProfileForCurrentSession();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    navigate('/');
  };

  const afterLogin = async () => {
    // Refresh profile and then route based on the stored role
    await loadProfileForCurrentSession();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { data: p } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = (p?.role ?? null) as UserRole | null;
    if (role === 'student') navigate('/student');
    if (role === 'supervisor') navigate('/supervisor');
    if (role === 'admin') navigate('/admin');
  };

  if (loading) {
    return (
      <div className="centered-page">
        <div className="card">
          <div className="card-title">Loading…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLoggedIn={afterLogin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Layout role={profile.role} onLogout={handleLogout}>
      <Routes>
        {profile.role === 'student' && (
          <>
            <Route path="/student" element={<StudentHome studentId={profile.id} />} />
            <Route
              path="/student/meetings"
              element={<StudentMeetings studentId={profile.id} />}
            />
            <Route
              path="/student/meetings/:meetingId/recap"
              element={<StudentRecapForm />}
            />
            <Route
              path="/student/submissions"
              element={<StudentDashboard studentId={profile.id} />}
            />
            <Route
              path="/student/profile"
              element={<StudentProfile studentId={profile.id} />}
            />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </>
        )}

        {profile.role === 'supervisor' && (
          <>
            <Route
              path="/supervisor"
              element={<SupervisorHome supervisorId={profile.id} />}
            />
            <Route
              path="/supervisor/meetings"
              element={<SupervisorMeetings supervisorId={profile.id} />}
            />
            <Route
              path="/supervisor/meetings/schedule"
              element={<SupervisorScheduleMeeting supervisorId={profile.id} />}
            />
            <Route
              path="/supervisor/meetings/:meetingId"
              element={<SupervisorMeetingDetails />}
            />
            <Route
              path="/supervisor/reviews"
              element={<SupervisorDashboard supervisorId={profile.id} />}
            />
            <Route
              path="/supervisor/profile"
              element={<SupervisorProfile supervisorId={profile.id} />}
            />
            <Route path="*" element={<Navigate to="/supervisor" replace />} />
          </>
        )}

        {profile.role === 'admin' && (
          <>
            <Route path="/admin" element={<AdminHome adminId={profile.id} />} />
            <Route path="/admin/users" element={<AdminDashboard adminId={profile.id} />} />
            <Route
              path="/admin/add-student"
              element={<AdminAddStudent adminId={profile.id} />}
            />
            <Route
              path="/admin/add-supervisor"
              element={<AdminAddSupervisor adminId={profile.id} />}
            />
            <Route
              path="/admin/profile"
              element={<AdminProfile adminId={profile.id} />}
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
};

export default App;


