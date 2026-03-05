import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { UserRole } from '../types';

interface LayoutProps {
  role: UserRole | null;
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ role, children, onLogout }) => {
  const location = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('pp_theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem('pp_theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Icon components for navigation items
  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  );

  const MeetingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  );

  const SubmissionsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );

  const ReviewsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <path d="M13 8H7"></path>
      <path d="M17 12H7"></path>
    </svg>
  );

  const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );

  const AddUserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="20" y1="8" x2="20" y2="14"></line>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
  );

  const ProfileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  const ThemeIcon = () => (
    theme === 'dark' ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    )
  );

  const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-circle">🎓</div>
          <div className="logo-content">
            <div className="logo-title">Project Portal</div>
            <div className="logo-subtitle">Student–Supervisor</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {role === 'student' && (
            <>
              <Link to="/student" className={`nav-link ${isActive('/student') ? 'active' : ''}`}>
                <span className="nav-icon"><DashboardIcon /></span>
                <span className="nav-text">Dashboard</span>
              </Link>
              <Link to="/student/meetings" className={`nav-link ${isActive('/student/meetings') ? 'active' : ''}`}>
                <span className="nav-icon"><MeetingsIcon /></span>
                <span className="nav-text">Meetings</span>
              </Link>
              <Link to="/student/submissions" className={`nav-link ${isActive('/student/submissions') ? 'active' : ''}`}>
                <span className="nav-icon"><SubmissionsIcon /></span>
                <span className="nav-text">My submissions</span>
              </Link>
              <Link to="/student/profile" className={`nav-link ${isActive('/student/profile') ? 'active' : ''}`}>
                <span className="nav-icon"><ProfileIcon /></span>
                <span className="nav-text">Profile & security</span>
              </Link>
            </>
          )}

          {role === 'supervisor' && (
            <>
              <Link to="/supervisor" className={`nav-link ${isActive('/supervisor') ? 'active' : ''}`}>
                <span className="nav-icon"><DashboardIcon /></span>
                <span className="nav-text">Dashboard</span>
              </Link>
              <Link to="/supervisor/meetings" className={`nav-link ${isActive('/supervisor/meetings') ? 'active' : ''}`}>
                <span className="nav-icon"><MeetingsIcon /></span>
                <span className="nav-text">Meetings</span>
              </Link>
              <Link to="/supervisor/reviews" className={`nav-link ${isActive('/supervisor/reviews') ? 'active' : ''}`}>
                <span className="nav-icon"><ReviewsIcon /></span>
                <span className="nav-text">Reviews</span>
              </Link>
              <Link to="/supervisor/profile" className={`nav-link ${isActive('/supervisor/profile') ? 'active' : ''}`}>
                <span className="nav-icon"><ProfileIcon /></span>
                <span className="nav-text">Profile & security</span>
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                <span className="nav-icon"><DashboardIcon /></span>
                <span className="nav-text">Dashboard</span>
              </Link>
              <Link to="/admin/users" className={`nav-link ${isActive('/admin/users') ? 'active' : ''}`}>
                <span className="nav-icon"><UsersIcon /></span>
                <span className="nav-text">Users & assignments</span>
              </Link>
              <Link to="/admin/add-student" className={`nav-link ${isActive('/admin/add-student') ? 'active' : ''}`}>
                <span className="nav-icon"><AddUserIcon /></span>
                <span className="nav-text">Add student</span>
              </Link>
              <Link to="/admin/add-supervisor" className={`nav-link ${isActive('/admin/add-supervisor') ? 'active' : ''}`}>
                <span className="nav-icon"><AddUserIcon /></span>
                <span className="nav-text">Add supervisor</span>
              </Link>
              <Link to="/admin/profile" className={`nav-link ${isActive('/admin/profile') ? 'active' : ''}`}>
                <span className="nav-icon"><ProfileIcon /></span>
                <span className="nav-text">Profile & security</span>
              </Link>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {role && (
            <button className="btn-sidebar logout-btn" onClick={onLogout}>
              <span className="btn-icon"><LogoutIcon /></span>
              <span className="btn-text">Logout</span>
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;


