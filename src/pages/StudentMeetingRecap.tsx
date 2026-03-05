import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { MeetingWithDetails, MeetingRecap } from '../types';
import { formatMeetingDateTime } from '../utils/meetingUtils';

const StudentMeetingRecap: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingWithDetails | null>(null);
  const [recap, setRecap] = useState<MeetingRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    summary: '',
    topics_discussed: '',
    action_items: '',
    next_steps: '',
    student_notes: '',
  });

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

      const [supervisor, attendance, existingRecap] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', meetingData.supervisor_id).single(),
        supabase.from('meeting_attendance').select('*').eq('meeting_id', id).single(),
        supabase.from('meeting_recaps').select('*').eq('meeting_id', id).single(),
      ]);

      setMeeting({
        ...meetingData,
        supervisor: supervisor.data || undefined,
        attendance: attendance.data || undefined,
        recap: existingRecap.data || undefined,
      });

      if (existingRecap.data) {
        setRecap(existingRecap.data);
        setFormData({
          summary: existingRecap.data.summary,
          topics_discussed: existingRecap.data.topics_discussed,
          action_items: existingRecap.data.action_items || '',
          next_steps: existingRecap.data.next_steps || '',
          student_notes: existingRecap.data.student_notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !meeting) return;

    // Check if student has checked in
    if (!meeting.attendance || !meeting.attendance.checked_in_at) {
      alert('You must check in for the meeting before writing a recap.');
      return;
    }

    setSubmitting(true);

    try {
      const recapData = {
        meeting_id: id,
        student_id: meeting.student_id,
        summary: formData.summary,
        topics_discussed: formData.topics_discussed,
        action_items: formData.action_items || null,
        next_steps: formData.next_steps || null,
        student_notes: formData.student_notes || null,
        recap_status: recap?.recap_status === 'rejected' ? 'revised' : 'submitted',
      };

      if (recap) {
        // Update existing recap
        const { error } = await supabase
          .from('meeting_recaps')
          .update(recapData)
          .eq('id', recap.id);

        if (error) throw error;
      } else {
        // Create new recap
        const { error } = await supabase.from('meeting_recaps').insert(recapData);
        if (error) throw error;
      }

      // Update meeting status to completed
      await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', id);

      alert('Recap submitted successfully! Your supervisor will review it.');
      navigate('/student/meetings');
    } catch (error) {
      console.error('Error submitting recap:', error);
      alert('Failed to submit recap. Please try again.');
    } finally {
      setSubmitting(false);
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

  if (!meeting.attendance || !meeting.attendance.checked_in_at) {
    return (
      <div className="page">
        <div className="card">
          <h2 className="card-title">Check In Required</h2>
          <p className="muted">
            You must check in for this meeting before you can write a recap.
          </p>
          <button
            type="button"
            className="btn-primary mt-md"
            onClick={() => navigate('/student/meetings')}
          >
            Go to Meetings
          </button>
        </div>
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
          <h1 className="page-title">Meeting Recap</h1>
          <p className="page-subtitle">
            {meeting.title} · {formatMeetingDateTime(meeting.scheduled_at)}
          </p>
        </div>
      </div>

      {recap && recap.recap_status === 'approved' && (
        <div className="card mb-md success-banner">
          <p>✓ Your recap has been approved by your supervisor.</p>
          {recap.supervisor_feedback && (
            <p className="mt-sm">Feedback: {recap.supervisor_feedback}</p>
          )}
        </div>
      )}

      {recap && recap.recap_status === 'rejected' && (
        <div className="card mb-md error-banner">
          <p>⚠ Your recap was rejected. Please revise and resubmit.</p>
          {recap.supervisor_feedback && (
            <p className="mt-sm">Feedback: {recap.supervisor_feedback}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <h2 className="card-title">Write Meeting Recap</h2>
        <p className="muted mb-md">
          Please provide a detailed summary of what was discussed in the meeting. This helps track your progress and ensures accountability.
        </p>

        <div className="form-group">
          <label htmlFor="summary">Meeting Summary *</label>
          <textarea
            id="summary"
            required
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Provide a brief summary of the meeting..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="topics_discussed">Topics Discussed *</label>
          <textarea
            id="topics_discussed"
            required
            value={formData.topics_discussed}
            onChange={(e) => setFormData({ ...formData, topics_discussed: e.target.value })}
            placeholder="List the main topics, issues, or points discussed..."
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="action_items">Action Items</label>
          <textarea
            id="action_items"
            value={formData.action_items}
            onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
            placeholder="List any action items or tasks assigned during the meeting..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="next_steps">Next Steps</label>
          <textarea
            id="next_steps"
            value={formData.next_steps}
            onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
            placeholder="What are the next steps or follow-up actions?"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="student_notes">Additional Notes</label>
          <textarea
            id="student_notes"
            value={formData.student_notes}
            onChange={(e) => setFormData({ ...formData, student_notes: e.target.value })}
            placeholder="Any additional notes or observations..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate('/student/meetings')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : recap ? 'Update Recap' : 'Submit Recap'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentMeetingRecap;
