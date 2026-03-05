import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Profile } from '../types';
import { convertToKenyaISOString } from '../utils/meetingUtils';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    student_ids: string[];
    title: string;
    description: string;
    scheduled_at: string;
    duration_minutes: number;
    location: string;
    meeting_type: string;
  }) => Promise<void>;
  students: Profile[];
  isLoading?: boolean;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    student_ids: [] as string[],
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    meeting_type: '',
  });
  const [selectAll, setSelectAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        student_ids: [],
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        meeting_type: '',
      });
      setSelectAll(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSelectAll = () => {
    if (selectAll) {
      setFormData({ ...formData, student_ids: [] });
      setSelectAll(false);
    } else {
      setFormData({ ...formData, student_ids: students.map((s) => s.id) });
      setSelectAll(true);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const isSelected = formData.student_ids.includes(studentId);
    if (isSelected) {
      setFormData({
        ...formData,
        student_ids: formData.student_ids.filter((id) => id !== studentId),
      });
      setSelectAll(false);
    } else {
      const newIds = [...formData.student_ids, studentId];
      setFormData({ ...formData, student_ids: newIds });
      if (newIds.length === students.length) {
        setSelectAll(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || !formData.scheduled_at) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.student_ids.length === 0) {
      setError('Please select at least one student.');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        scheduled_at: convertToKenyaISOString(formData.scheduled_at),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule meeting');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule New Meeting" size="large">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Select Students <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleSelectAll}
              style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
            >
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
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
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.student_ids.includes(student.id)}
                  onChange={() => handleStudentToggle(student.id)}
                />
                <span>{student.name}</span>
                <span className="list-meta" style={{ marginLeft: 'auto' }}>
                  {student.email}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Meeting Title <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Progress Review Meeting"
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Meeting agenda and discussion points..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">
              Scheduled Date & Time (Kenyan Time - EAT) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              required
            />
            <small className="muted" style={{ display: 'block', marginTop: '0.25rem' }}>
              Time is in East Africa Time (EAT, UTC+3)
            </small>
          </div>

          <div>
            <label className="form-label">Duration (minutes)</label>
            <input
              type="number"
              className="form-input"
              min="15"
              step="15"
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })
              }
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Room 101, Online"
            />
          </div>

          <div>
            <label className="form-label">Meeting Type</label>
            <input
              type="text"
              className="form-input"
              value={formData.meeting_type}
              onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
              placeholder="e.g., Progress Review, Final Defense"
            />
          </div>
        </div>

        {error && <div className="error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleMeetingModal;
