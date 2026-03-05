import React from 'react';
import type { Meeting, MeetingAttendance, MeetingRecap, Profile } from '../types';
import {
  formatMeetingDateTime,
  formatKenyaTime,
  getMeetingStatusColor,
  getAttendanceStatusColor,
  getRecapStatusColor,
} from '../utils/meetingUtils';

interface MeetingModalProps {
  meeting: Meeting;
  attendance?: MeetingAttendance | null;
  recap?: MeetingRecap | null;
  student?: Profile | null;
  supervisor?: Profile | null;
  onClose: () => void;
  onViewDetails?: () => void;
  onWriteRecap?: () => void;
  onCheckIn?: () => void;
  canCheckIn?: boolean;
  canWriteRecap?: boolean;
  checkInWindowOpen?: boolean;
}

const MeetingModal: React.FC<MeetingModalProps> = ({
  meeting,
  attendance,
  recap,
  student,
  supervisor,
  onClose,
  onViewDetails,
  onWriteRecap,
  onCheckIn,
  canCheckIn,
  canWriteRecap,
  checkInWindowOpen,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
          }}
        >
          ×
        </button>

        <h2 className="card-title" style={{ marginBottom: '0.5rem', paddingRight: '2rem' }}>
          {meeting.title}
        </h2>
        <div className="list-meta" style={{ marginBottom: '1rem' }}>
          {student && `${student.name} · `}
          {supervisor && `${supervisor.name} · `}
          {formatMeetingDateTime(meeting.scheduled_at)} EAT
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <span className={`list-item-status status-${getMeetingStatusColor(meeting.status)}`}>
            {meeting.status.replace('_', ' ')}
          </span>
        </div>

        {meeting.description && (
          <div style={{ marginBottom: '1rem' }}>
            <strong className="list-meta">Description:</strong>
            <p style={{ marginTop: '0.25rem' }}>{meeting.description}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {meeting.location && (
            <div>
              <strong className="list-meta">Location:</strong>
              <div>{meeting.location}</div>
            </div>
          )}
          {meeting.meeting_type && (
            <div>
              <strong className="list-meta">Type:</strong>
              <div>{meeting.meeting_type.replace('_', ' ')}</div>
            </div>
          )}
          <div>
            <strong className="list-meta">Duration:</strong>
            <div>{meeting.duration_minutes} minutes</div>
          </div>
        </div>

        {attendance && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
            <strong className="list-meta">Attendance:</strong>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`list-item-status status-${getAttendanceStatusColor(attendance.attendance_status)}`}>
                {attendance.attendance_status.replace('_', ' ')}
              </span>
              {attendance.checked_in_at && (
                <div className="list-meta" style={{ marginTop: '0.25rem' }}>
                  Checked in at: {formatKenyaTime(attendance.checked_in_at)} EAT
                </div>
              )}
            </div>
          </div>
        )}

        {recap && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
            <strong className="list-meta">Recap Status:</strong>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`list-item-status status-${getRecapStatusColor(recap.recap_status)}`}>
                {recap.recap_status}
              </span>
            </div>
            {recap.summary && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong className="list-meta">Summary:</strong>
                <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{recap.summary}</p>
              </div>
            )}
          </div>
        )}

        {canCheckIn && onCheckIn && (
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-primary" onClick={onCheckIn}>
              Check In
            </button>
          </div>
        )}

        {canWriteRecap && onWriteRecap && (
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-primary" onClick={onWriteRecap} style={{ marginRight: '0.5rem' }}>
              {recap && (recap.recap_status === 'rejected' || recap.recap_status === 'revised') ? 'Revise Recap' : 'Write Meeting Recap'}
            </button>
          </div>
        )}

        {onViewDetails && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-outline" onClick={onViewDetails}>
              View Full Details
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {!onViewDetails && (
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingModal;
