import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';

interface SupervisorScheduleMeetingProps {
  supervisorId: string;
}

const SupervisorScheduleMeeting: React.FC<SupervisorScheduleMeetingProps> = ({ supervisorId }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        // Get assigned students
        const { data: assignments } = await supabase
          .from('supervisor_assignments')
          .select('student_id')
          .eq('supervisor_id', supervisorId);

        if (!assignments || assignments.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const studentIds = assignments.map((a: { student_id: string }) => a.student_id);
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds)
          .eq('role', 'student');

        if (studentsData) {
          setStudents(studentsData as Profile[]);
        }
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadStudents();
  }, [supervisorId]);

  const handleSubmit = async (data: {
    student_ids: string[];
    title: string;
    description: string;
    scheduled_at: string;
    duration_minutes: number;
    location: string;
    meeting_type: string;
  }) => {
    setSaving(true);

    try {
      // Create a meeting for each selected student
      const meetingsToCreate = data.student_ids.map((studentId) => ({
        supervisor_id: supervisorId,
        student_id: studentId,
        title: data.title.trim(),
        description: data.description.trim() || null,
        scheduled_at: data.scheduled_at, // Already converted to ISO string
        duration_minutes: data.duration_minutes || 60,
        location: data.location.trim() || null,
        meeting_type: data.meeting_type.trim() || null,
        status: 'scheduled' as const,
      }));

      const { error } = await supabase.from('meetings').insert(meetingsToCreate);

      if (error) throw error;

      navigate('/supervisor/meetings');
    } catch (error) {
      console.error('Error creating meetings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page admin-page">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div className="admin-title-section">
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => navigate('/supervisor/meetings')}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Meetings
          </button>
          <h1 className="admin-title">Schedule Meeting</h1>
          <p className="admin-subtitle">Create a new meeting with a student</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="admin-card-modern">
          <div className="admin-empty-state">
            <div className="admin-empty-icon">👥</div>
            <p className="admin-empty-text">No students assigned to you yet.</p>
          </div>
        </div>
      ) : (
        <>
          <ScheduleMeetingModal
            isOpen={true}
            onClose={() => navigate('/supervisor/meetings')}
            onSubmit={handleSubmit}
            students={students}
            isLoading={saving}
          />
          <div style={{ display: 'none' }}>
            {/* Keep old form for reference but hide it */}
            <form className="card" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="student_ids" className="form-label">
                Students <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                onClick={() => {
                  if (formData.student_ids.length === students.length) {
                    setFormData({ ...formData, student_ids: [] });
                  } else {
                    setFormData({ ...formData, student_ids: students.map((s) => s.id) });
                  }
                }}
              >
                {formData.student_ids.length === students.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              {students.map((student) => (
                <label
                  key={student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '0.25rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.student_ids.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          student_ids: [...formData.student_ids, student.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          student_ids: formData.student_ids.filter((id) => id !== student.id),
                        });
                      }
                    }}
                  />
                  <span>
                    {student.name} ({student.email})
                  </span>
                </label>
              ))}
            </div>
            {formData.student_ids.length > 0 && (
              <div className="list-meta" style={{ marginTop: '0.5rem' }}>
                {formData.student_ids.length} student{formData.student_ids.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="title" className="form-label">
              Meeting Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Progress Review Meeting"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="description" className="form-label">Description / Agenda</label>
            <textarea
              id="description"
              className="form-input"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description or agenda for the meeting..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label htmlFor="scheduled_at" className="form-label">
                Date & Time (Kenyan Time - EAT) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="scheduled_at"
                type="datetime-local"
                className="form-input"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                required
              />
              <small className="muted" style={{ display: 'block', marginTop: '0.25rem' }}>
                All times are in East Africa Time (EAT, UTC+3)
              </small>
            </div>

            <div>
              <label htmlFor="duration_minutes" className="form-label">Duration (minutes)</label>
              <input
                id="duration_minutes"
                type="number"
                className="form-input"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                min="15"
                max="240"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label htmlFor="location" className="form-label">Location</label>
              <input
                id="location"
                type="text"
                className="form-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Room 201, Online via Zoom"
              />
            </div>

            <div>
              <label htmlFor="meeting_type" className="form-label">Meeting Type</label>
              <select
                id="meeting_type"
                className="form-input"
                value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="progress_review">Progress Review</option>
                <option value="guidance">Guidance Session</option>
                <option value="milestone_check">Milestone Check</option>
                <option value="feedback">Feedback Discussion</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Schedule Meeting'}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate('/supervisor/meetings')}
            >
              Cancel
            </button>
          </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default SupervisorScheduleMeeting;
