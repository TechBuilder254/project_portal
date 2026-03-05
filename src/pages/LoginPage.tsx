import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface LoginPageProps {
  onLoggedIn: () => Promise<void> | void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoggedIn }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    await onLoggedIn();
  };

  return (
    <div className="landing-page page-login">
      <header className="landing-header login-header">
        <div className="landing-brand" onClick={() => navigate('/')}>
          <div className="logo-circle">🎓</div>
          <div>
            <div className="logo-title">Project Portal</div>
            <div className="logo-subtitle">Student–Supervisor</div>
          </div>
        </div>
        <nav className="landing-nav">
          <span className="nav-pill">For Students</span>
          <span className="nav-pill">For Supervisors</span>
          <span className="nav-pill">For Admin</span>
          <button
            type="button"
            className="nav-pill nav-pill-primary"
            onClick={() => navigate('/')}
          >
            Home
          </button>
        </nav>
      </header>

      <main className="auth-main login-main">
        <div className="card hero-card auth-card login-card">
          <h1 className="card-title">Login to Project Portal</h1>
          <p className="card-subtitle">
            Enter your university email and password to continue.
          </p>

          <form onSubmit={handleLogin} className="form">
            <label className="form-label">
              Email
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="form-label">
              Password
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="hero-hint">
            Need to change roles or reset accounts? Use the admin dashboard once
            you&apos;re signed in.
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;


