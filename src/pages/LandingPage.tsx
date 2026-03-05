import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DURATION_MS = 1600;
const EASING = (t: number) => 1 - (1 - t) * (1 - t); // ease-out quad

function useCountUp(end: number, suffix = '', startOnMount = true) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!startOnMount) return;
    setStarted(true);
  }, [startOnMount]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const eased = EASING(progress);
      const current = Math.round(eased * end);
      setValue(current);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [started, end]);

  return `${value}${suffix}`;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const projectsCount = useCountUp(300, '+');
  const supervisorsCount = useCountUp(80, '+');
  const dashboardsCount = useCountUp(3);

  return (
    <div className="landing-page landing-page-hero">
      {/* Top nav */}
      <header className="hero-nav">
        <div className="hero-nav-left">
          <div className="logo-circle">🎓</div>
          <div>
            <div className="logo-title">Project Portal</div>
            <div className="logo-subtitle">Student–Supervisor</div>
          </div>
        </div>
        <nav className="hero-nav-links">
          <button className="link-button" type="button">
            Home
          </button>
          <button className="link-button" type="button">
            Features
          </button>
          <button className="link-button" type="button">
            Dashboards
          </button>
          <button className="link-button" type="button">
            Contact
          </button>
        </nav>
        <div className="hero-nav-right">
          <button
            type="button"
            className="btn-outline nav-login-btn"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
          <button
            type="button"
            className="btn-primary nav-cta-btn"
            onClick={() => navigate('/login')}
          >
            Get started
          </button>
        </div>
      </header>

      {/* Main hero two-column content */}
      <section className="hero-main hero-main-full">
        <div className="hero-main-left">
          <div className="hero-main-left-top">
            <div className="hero-badge-row">
              <span className="hero-badge">FINAL YEAR & CAPSTONE SUPERVISION</span>
              <span className="hero-badge hero-badge-soft">
                One portal for students, supervisors, and admin
              </span>
            </div>

            <h1 className="hero-headline-main">
              Streamline project supervision with{' '}
              <span className="hero-headline-highlight">seamless collaboration</span> and real-time tracking.
            </h1>
            <p className="hero-subtitle">
              Upload work, give feedback, request changes, and approve — all in a shared
              timeline for every final‑year project.
            </p>

            <ul className="hero-feature-list">
              <li>Track submissions and deadlines in one place</li>
              <li>Get feedback and approvals from your supervisor</li>
              <li>One shared timeline per project — no more scattered files</li>
            </ul>

            <div className="hero-cta-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
              >
                Start as student
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => navigate('/login')}
              >
                Login as supervisor
              </button>
              <button
                type="button"
                className="link-button hero-demo-link"
                onClick={() => navigate('/login')}
              >
                View demo timeline
              </button>
            </div>
          </div>

          {/* How it works - minimal flow */}
          <div className="hero-workflow">
            <span className="hero-workflow-label">How it works</span>
            <div className="hero-workflow-line">
              <div className="hero-workflow-item">
                <span className="hero-workflow-num">1</span>
                <span className="hero-workflow-text">Upload work</span>
              </div>
              <span className="hero-workflow-dot" aria-hidden="true" />
              <div className="hero-workflow-item">
                <span className="hero-workflow-num">2</span>
                <span className="hero-workflow-text">Get feedback</span>
              </div>
              <span className="hero-workflow-dot" aria-hidden="true" />
              <div className="hero-workflow-item">
                <span className="hero-workflow-num">3</span>
                <span className="hero-workflow-text">Approve & done</span>
              </div>
            </div>
          </div>

          <div className="hero-stats-row hero-stats-row-compact">
            <div className="hero-stat hero-stat-1">
              <div className="hero-stat-label">Projects tracked</div>
              <div className="hero-stat-value" aria-label="300 plus">
                {projectsCount}
              </div>
            </div>
            <div className="hero-stat hero-stat-2">
              <div className="hero-stat-label">Supervisors</div>
              <div className="hero-stat-value" aria-label="80 plus">
                {supervisorsCount}
              </div>
            </div>
            <div className="hero-stat hero-stat-3">
              <div className="hero-stat-label">Dedicated dashboards</div>
              <div className="hero-stat-value" aria-label="3">
                {dashboardsCount}
              </div>
            </div>
          </div>
        </div>

        <div className="hero-main-right">
          <div className="hero-avatar-circle">
            <div className="hero-avatar-inner">
              <div className="hero-avatar-title">Supervision snapshot</div>
              <ul className="hero-avatar-list">
                <li>
                  <span className="hero-dot hero-dot-pending" /> Proposal — Pending
                  review
                </li>
                <li>
                  <span className="hero-dot hero-dot-changes" /> Chapter 3 — Changes
                  requested
                </li>
                <li>
                  <span className="hero-dot hero-dot-approved" /> Final report —
                  Approved
                </li>
              </ul>
            </div>

            <div className="hero-floating-tag hero-tag-student">
              <span className="hero-tag-icon">🎓</span>
              <span className="hero-tag-text">Student uploads</span>
            </div>
            <div className="hero-floating-tag hero-tag-supervisor">
              <span className="hero-tag-icon">🧑‍🏫</span>
              <span className="hero-tag-text">Supervisor feedback</span>
            </div>
            <div className="hero-floating-tag hero-tag-admin">
              <span className="hero-tag-icon">📊</span>
              <span className="hero-tag-text">Admin overview</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;