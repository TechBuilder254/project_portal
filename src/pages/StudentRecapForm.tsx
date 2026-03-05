import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Meeting, MeetingRecap, MeetingAttendance } from '../types';
import { formatMeetingDateTime, hasCheckedIn } from '../utils/meetingUtils';

const StudentRecapForm: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<MeetingAttendance | null>(null);
  const [existingRecap, setExistingRecap] = useState<MeetingRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    summary: '',
    topics_discussed: '',
    action_items: '',
    next_steps: '',
    student_notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!meetingId) return;

      try {
        // Load meeting
        const { data: meetingData } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', meetingId)
          .single();

        if (meetingData) {
          setMeeting(meetingData as Meeting);
        }

        // Load attendance (required before writing recap)
        const { data: attendanceData } = await supabase
          .from('meeting_attendance')
          .select('*')
          .eq('meeting_id', meetingId)
          .single();
        if (attendanceData) {
          setAttendance(attendanceData as MeetingAttendance);
        }

        // Load existing recap
        const { data: recapData } = await supabase
          .from('meeting_recaps')
          .select('*')
          .eq('meeting_id', meetingId)
          .single();

        if (recapData) {
          const recap = recapData as MeetingRecap;
          setExistingRecap(recap);
          setFormData({
            summary: recap.summary || '',
            topics_discussed: recap.topics_discussed || '',
            action_items: recap.action_items || '',
            next_steps: recap.next_steps || '',
            student_notes: recap.student_notes || '',
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [meetingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingId || !meeting) return;

    if (!hasCheckedIn(attendance)) {
      alert('You must check in for the meeting before submitting a recap.');
      return;
    }

    if (!formData.summary.trim() || !formData.topics_discussed.trim()) {
      alert('Please fill in the required fields (Summary and Topics Discussed).');
      return;
    }

    setSaving(true);

    try {
      const recapData = {
        meeting_id: meetingId,
        student_id: meeting.student_id,
        summary: formData.summary.trim(),
        topics_discussed: formData.topics_discussed.trim(),
        action_items: formData.action_items.trim() || null,
        next_steps: formData.next_steps.trim() || null,
        student_notes: formData.student_notes.trim() || null,
        recap_status: existingRecap?.recap_status === 'rejected' ? 'revised' : 'submitted',
      };

      if (existingRecap) {
        // Update existing recap
        const { error } = await supabase
          .from('meeting_recaps')
          .update(recapData)
          .eq('id', existingRecap.id);

        if (error) throw error;
      } else {
        // Create new recap
        const { error } = await supabase.from('meeting_recaps').insert(recapData);

        if (error) throw error;
      }

      // Update meeting status to completed if not already
      if (meeting.status !== 'completed') {
        await supabase
          .from('meetings')
          .update({ status: 'completed' })
          .eq('id', meetingId);
      }

      navigate('/student/meetings');
    } catch (error) {
      console.error('Error saving recap:', error);
      alert('Failed to save recap. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="page">
        <p className="muted">Meeting not found.</p>
      </div>
    );
  }

  const isReadOnly = existingRecap?.recap_status === 'approved';
  const mustCheckInFirst = !hasCheckedIn(attendance);

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className="btn-outline"
          onClick={() => navigate('/student/meetings')}
          style={{ marginBottom: '1rem' }}
        >
          ← Back to Meetings
        </button>
        <h1 className="page-title">Meeting Recap</h1>
        <p className="page-subtitle">
          {meeting.title} · {formatMeetingDateTime(meeting.scheduled_at)} EAT
        </p>
      </div>

      {mustCheckInFirst && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <h3 className="card-title">Check-in required</h3>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            You must check in for this meeting before you can write a recap. Go to My Meetings and use &quot;View Details&quot; to check in during the meeting window (15 minutes before or after the scheduled time).
          </p>
          <button type="button" className="btn-primary" onClick={() => navigate('/student/meetings')}>
            Back to My Meetings
          </button>
        </div>
      )}

      {existingRecap?.supervisor_feedback && !mustCheckInFirst && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="card-title">Supervisor Feedback</h3>
          <p>{existingRecap.supervisor_feedback}</p>
          {existingRecap.supervisor_rating && (
            <div className="list-meta" style={{ marginTop: '0.5rem' }}>
              Rating: {existingRecap.supervisor_rating}/5
            </div>
          )}
        </div>
      )}

      {/* Your previous submission – for revision reference */}
      {existingRecap && !mustCheckInFirst && (
        <div className="card" style={{ marginBottom: '1.5rem', maxWidth: '800px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>📄 Your previous submission</h3>
          <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Reference what you wrote when revising your recap below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Summary</div>
              <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{existingRecap.summary}</p>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Topics discussed</div>
              <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{existingRecap.topics_discussed}</p>
            </div>
            {existingRecap.action_items && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Action items</div>
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{existingRecap.action_items}</p>
              </div>
            )}
            {existingRecap.next_steps && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Next steps</div>
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{existingRecap.next_steps}</p>
              </div>
            )}
            {existingRecap.student_notes && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Additional notes</div>
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{existingRecap.student_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!mustCheckInFirst && (
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="summary" className="form-label">
            Summary <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            id="summary"
            className="form-input"
            rows={4}
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Write a brief summary of what was discussed in the meeting..."
            required
            disabled={isReadOnly}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="topics_discussed" className="form-label">
            Topics Discussed <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            id="topics_discussed"
            className="form-input"
            rows={5}
            value={formData.topics_discussed}
            onChange={(e) => setFormData({ ...formData, topics_discussed: e.target.value })}
            placeholder="List the main topics and points discussed during the meeting..."
            required
            disabled={isReadOnly}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="action_items" className="form-label">Action Items</label>
          <textarea
            id="action_items"
            className="form-input"
            rows={3}
            value={formData.action_items}
            onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
            placeholder="List any action items or tasks assigned during the meeting..."
            disabled={isReadOnly}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="next_steps" className="form-label">Next Steps</label>
          <textarea
            id="next_steps"
            className="form-input"
            rows={3}
            value={formData.next_steps}
            onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
            placeholder="What are the next steps or follow-up actions?"
            disabled={isReadOnly}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="student_notes" className="form-label">Additional Notes</label>
          <textarea
            id="student_notes"
            className="form-input"
            rows={3}
            value={formData.student_notes}
            onChange={(e) => setFormData({ ...formData, student_notes: e.target.value })}
            placeholder="Any additional notes or observations..."
            disabled={isReadOnly}
          />
        </div>

        {existingRecap && (
          <div className="list-meta" style={{ marginBottom: '1rem' }}>
            Status: <strong>{existingRecap.recap_status}</strong>
          </div>
        )}

        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : existingRecap ? 'Update Recap' : 'Submit Recap'}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate('/student/meetings')}
            >
              Cancel
            </button>
          </div>
        )}
      </form>
      )}
    </div>
  );
};

export default StudentRecapForm;
