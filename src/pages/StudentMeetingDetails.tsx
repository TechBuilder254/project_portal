import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { MeetingWithDetails } from '../types';
import { formatMeetingDateTime, getMeetingStatusColor, getRecapStatusColor } from '../utils/meetingUtils';

const StudentMeetingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  const loadMeeting = async () => {
    if (!id) return;

    try {
      const { data: meetingData, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!meetingData) return;

      const [supervisor, attendance, recap, feedback] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', meetingData.supervisor_id).single(),
        supabase.from('meeting_attendance').select('*').eq('meeting_id', id).single(),
        supabase.from('meeting_recaps').select('*').eq('meeting_id', id).single(),
        supabase.from('meeting_feedback').select('*').eq('meeting_id', id).single(),
      ]);

      setMeeting({
        ...meetingData,
        supervisor: supervisor.data || undefined,
        attendance: attendance.data || undefined,
        recap: recap.data || undefined,
        feedback: feedback.data || undefined,
      });
    } catch (error) {
      console.error('Error loading meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading meeting details...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="page">
        <p className="muted">Meeting not found.</p>
        <button type="button" className="btn-outline mt-md" onClick={() => navigate('/student/meetings')}>
          Back to Meetings
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-outline mb-md" onClick={() => navigate('/student/meetings')}>
            ← Back
          </button>
          <h1 className="page-title">{meeting.title}</h1>
          <p className="page-subtitle">
            Meeting with {meeting.supervisor?.name || 'Supervisor'}
          </p>
        </div>
        <span className={`list-item-status status-${getMeetingStatusColor(meeting.status)}`}>
          {meeting.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid-two mt-lg">
        {/* Meeting Details */}
        <div className="card">
          <h2 className="card-title">Meeting Details</h2>
          <div className="detail-row">
            <span className="detail-label">Scheduled Time:</span>
            <span>{formatMeetingDateTime(meeting.scheduled_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Duration:</span>
            <span>{meeting.duration_minutes} minutes</span>
          </div>
          {meeting.location && (
            <div className="detail-row">
              <span className="detail-label">Location:</span>
              <span>{meeting.location}</span>
            </div>
          )}
          {meeting.description && (
            <div className="detail-row">
              <span className="detail-label">Description:</span>
              <p className="muted">{meeting.description}</p>
            </div>
          )}
        </div>

        {/* Attendance Status */}
        <div className="card">
          <h2 className="card-title">Attendance</h2>
          {meeting.attendance ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`list-item-status status-${
                  meeting.attendance.attendance_status === 'confirmed' ? 'green' :
                  meeting.attendance.attendance_status === 'checked_in' ? 'orange' :
                  meeting.attendance.attendance_status === 'disputed' ? 'red' : 'gray'
                }`}>
                  {meeting.attendance.attendance_status.replace('_', ' ')}
                </span>
              </div>
              {meeting.attendance.checked_in_at && (
                <div className="detail-row">
                  <span className="detail-label">Checked In At:</span>
                  <span>{formatMeetingDateTime(meeting.attendance.checked_in_at)}</span>
                </div>
              )}
            </>
          ) : (
            <p className="muted">No attendance record yet.</p>
          )}
        </div>
      </div>

      {/* Student Recap */}
      {meeting.recap && (
        <div className="card mt-lg">
          <div className="card-header">
            <h2 className="card-title">Your Recap</h2>
            <span className={`list-item-status status-${getRecapStatusColor(meeting.recap.recap_status)}`}>
              {meeting.recap.recap_status}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Summary:</span>
            <p>{meeting.recap.summary}</p>
          </div>
          <div className="detail-row">
            <span className="detail-label">Topics Discussed:</span>
            <p>{meeting.recap.topics_discussed}</p>
          </div>
          {meeting.recap.action_items && (
            <div className="detail-row">
              <span className="detail-label">Action Items:</span>
              <p>{meeting.recap.action_items}</p>
            </div>
          )}
          {meeting.recap.next_steps && (
            <div className="detail-row">
              <span className="detail-label">Next Steps:</span>
              <p>{meeting.recap.next_steps}</p>
            </div>
          )}
          {meeting.recap.supervisor_feedback && (
            <div className="detail-row">
              <span className="detail-label">Supervisor Feedback:</span>
              <p>{meeting.recap.supervisor_feedback}</p>
            </div>
          )}
          {meeting.recap.recap_status === 'rejected' && (
            <div className="mt-md">
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate(`/student/meetings/${meeting.id}/recap`)}
              >
                Revise Recap
              </button>
            </div>
          )}
        </div>
      )}

      {/* Supervisor Feedback */}
      {meeting.feedback && (
        <div className="card mt-lg">
          <h2 className="card-title">Supervisor Feedback</h2>
          <div className="detail-row">
            <span className="detail-label">Remarks:</span>
            <p>{meeting.feedback.remarks}</p>
          </div>
          {meeting.feedback.overall_rating && (
            <div className="detail-row">
              <span className="detail-label">Rating:</span>
              <span>{meeting.feedback.overall_rating}/5</span>
            </div>
          )}
          {meeting.feedback.action_items_for_student && (
            <div className="detail-row">
              <span className="detail-label">Action Items:</span>
              <p>{meeting.feedback.action_items_for_student}</p>
            </div>
          )}
          {meeting.feedback.deadline_for_actions && (
            <div className="detail-row">
              <span className="detail-label">Deadline:</span>
              <span>{formatMeetingDateTime(meeting.feedback.deadline_for_actions)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentMeetingDetails;
