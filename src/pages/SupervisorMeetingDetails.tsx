import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Meeting, MeetingAttendance, MeetingRecap, MeetingFeedback, Profile } from '../types';
import {
  formatMeetingDateTime,
  formatKenyaDateTime,
  convertToKenyaISOString,
  convertFromKenyaISOToLocal,
  getMeetingStatusColor,
  getAttendanceStatusColor,
  getRecapStatusColor,
} from '../utils/meetingUtils';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';

const SupervisorMeetingDetails: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<MeetingAttendance | null>(null);
  const [recap, setRecap] = useState<MeetingRecap | null>(null);
  const [feedback, setFeedback] = useState<MeetingFeedback | null>(null);
  const [student, setStudent] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [attendanceAction, setAttendanceAction] = useState<'confirm' | 'dispute' | null>(null);
  const [recapAction, setRecapAction] = useState<'approve' | 'reject' | null>(null);
  const [recapFeedback, setRecapFeedback] = useState('');
  const [recapRating, setRecapRating] = useState<number>(5);
  const [feedbackForm, setFeedbackForm] = useState({
    remarks: '',
    overall_rating: 5,
    meeting_quality: 'good',
    action_items_for_student: '',
    deadline_for_actions: '',
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    meeting_type: '',
    status: 'scheduled' as Meeting['status'],
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
          const meetingObj = meetingData as Meeting;
          setMeeting(meetingObj);
          
          // Initialize edit form
          setEditForm({
            title: meetingObj.title,
            description: meetingObj.description || '',
            scheduled_at: convertFromKenyaISOToLocal(meetingObj.scheduled_at),
            duration_minutes: meetingObj.duration_minutes || 60,
            location: meetingObj.location || '',
            meeting_type: meetingObj.meeting_type || '',
            status: meetingObj.status,
          });

          // Load student
          const { data: studentData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', meetingObj.student_id)
            .single();

          if (studentData) {
            setStudent(studentData as Profile);
          }

          // Load attendance
          const { data: attendanceData } = await supabase
            .from('meeting_attendance')
            .select('*')
            .eq('meeting_id', meetingId)
            .single();

          if (attendanceData) {
            setAttendance(attendanceData as MeetingAttendance);
          }

          // Load recap
          const { data: recapData } = await supabase
            .from('meeting_recaps')
            .select('*')
            .eq('meeting_id', meetingId)
            .single();

          if (recapData) {
            const recapObj = recapData as MeetingRecap;
            setRecap(recapObj);
            setRecapFeedback(recapObj.supervisor_feedback || '');
            setRecapRating(recapObj.supervisor_rating || 5);
          }

          // Load feedback
          const { data: feedbackData } = await supabase
            .from('meeting_feedback')
            .select('*')
            .eq('meeting_id', meetingId)
            .single();

          if (feedbackData) {
            const feedbackObj = feedbackData as MeetingFeedback;
            setFeedback(feedbackObj);
            setFeedbackForm({
              remarks: feedbackObj.remarks,
              overall_rating: feedbackObj.overall_rating || 5,
              meeting_quality: feedbackObj.meeting_quality || 'good',
              action_items_for_student: feedbackObj.action_items_for_student || '',
              deadline_for_actions: feedbackObj.deadline_for_actions || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [meetingId]);

  const handleConfirmAttendance = async (action: 'confirm' | 'dispute') => {
    if (!meetingId || !attendance) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('meeting_attendance')
        .update({
          attendance_status: action === 'confirm' ? 'confirmed' : 'disputed',
          supervisor_confirmed_at: new Date().toISOString(),
          supervisor_confirmed_by: meeting?.supervisor_id,
        })
        .eq('id', attendance.id);

      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error confirming attendance:', error);
      alert('Failed to update attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewRecap = async (action: 'approve' | 'reject') => {
    if (!meetingId || !recap) return;

    if (action === 'reject' && !recapFeedback.trim()) {
      alert('Please provide feedback when rejecting a recap.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('meeting_recaps')
        .update({
          recap_status: action === 'approve' ? 'approved' : 'rejected',
          supervisor_approved_at: action === 'approve' ? new Date().toISOString() : null,
          supervisor_approved_by: action === 'approve' ? meeting?.supervisor_id : null,
          supervisor_feedback: recapFeedback.trim() || null,
          supervisor_rating: action === 'approve' ? recapRating : null,
        })
        .eq('id', recap.id);

      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error reviewing recap:', error);
      alert('Failed to review recap. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingId || !meeting) return;

    if (!editForm.title.trim() || !editForm.scheduled_at) {
      alert('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const scheduledAtISO = convertToKenyaISOString(editForm.scheduled_at);
      
      const { error } = await supabase
        .from('meetings')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          scheduled_at: scheduledAtISO,
          duration_minutes: editForm.duration_minutes || 60,
          location: editForm.location.trim() || null,
          meeting_type: editForm.meeting_type.trim() || null,
          status: editForm.status,
        })
        .eq('id', meetingId);

      if (error) throw error;

      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('Failed to update meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meetingId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;

      navigate('/supervisor/meetings');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting. Please try again.');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingId || !meeting) return;

    if (!feedbackForm.remarks.trim()) {
      alert('Please provide remarks.');
      return;
    }

    setSaving(true);
    try {
      const feedbackData = {
        meeting_id: meetingId,
        supervisor_id: meeting.supervisor_id,
        remarks: feedbackForm.remarks.trim(),
        overall_rating: feedbackForm.overall_rating,
        meeting_quality: feedbackForm.meeting_quality,
        action_items_for_student: feedbackForm.action_items_for_student.trim() || null,
        deadline_for_actions: feedbackForm.deadline_for_actions || null,
      };

      if (feedback) {
        const { error } = await supabase
          .from('meeting_feedback')
          .update(feedbackData)
          .eq('id', feedback.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('meeting_feedback').insert(feedbackData);

        if (error) throw error;
      }

      alert('Feedback saved successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Failed to save feedback. Please try again.');
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

  return (
    <div className="page" style={{ maxWidth: '1400px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          type="button"
          className="btn-outline"
          onClick={() => navigate('/supervisor/meetings')}
          style={{ marginBottom: '1.5rem', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
        >
          ← Back to Meetings
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 className="page-title" style={{ marginBottom: '0.75rem', fontSize: '1.75rem' }}>{meeting.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student</span>
                <span style={{ fontWeight: '500', fontSize: '1rem' }}>{student?.name || 'Unknown Student'}</span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled</span>
                <span style={{ fontSize: '1rem' }}>{formatMeetingDateTime(meeting.scheduled_at)} EAT</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            {!isEditing && (
              <>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsEditing(true)}
                  style={{ fontSize: '0.875rem', padding: '0.625rem 1.25rem' }}
                >
                  Edit Meeting
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.875rem', padding: '0.625rem 1.25rem' }}
                >
                  Delete Meeting
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteMeeting}
        title="⚠️ Delete Meeting"
        message={
          <>
            Are you sure you want to delete this meeting? This action cannot be undone.
            <p style={{ marginTop: '0.75rem', fontWeight: 'bold' }}>
              Meeting: {meeting.title}
            </p>
            <p style={{ marginTop: '0.75rem', color: 'var(--danger)' }}>
              This will permanently delete:
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>The meeting record</li>
                <li>All attendance data</li>
                <li>All recaps and feedback</li>
              </ul>
            </p>
          </>
        }
        confirmText="Yes, Delete Meeting"
        type="danger"
        isLoading={saving}
      />

      {/* Meeting Details - Edit Mode */}
      {isEditing && (
        <Modal
          isOpen={isEditing}
          onClose={() => {
            setIsEditing(false);
            // Reset form to original values
            if (meeting) {
              setEditForm({
                title: meeting.title,
                description: meeting.description || '',
                scheduled_at: convertFromKenyaISOToLocal(meeting.scheduled_at),
                duration_minutes: meeting.duration_minutes || 60,
                location: meeting.location || '',
                meeting_type: meeting.meeting_type || '',
                status: meeting.status,
              });
            }
          }}
          title="Edit Meeting Details"
          size="large"
        >
          <form onSubmit={handleEditMeeting}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Meeting Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Description / Agenda</label>
              <textarea
                className="form-input"
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">
                  Date & Time (Kenyan Time - EAT) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editForm.scheduled_at}
                  onChange={(e) => setEditForm({ ...editForm, scheduled_at: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Duration (minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editForm.duration_minutes}
                  onChange={(e) => setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) || 60 })}
                  min="15"
                  max="240"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g., Room 201, Online via Zoom"
                />
              </div>

              <div>
                <label className="form-label">Meeting Type</label>
                <select
                  className="form-input"
                  value={editForm.meeting_type}
                  onChange={(e) => setEditForm({ ...editForm, meeting_type: e.target.value })}
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

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Meeting['status'] })}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="missed">Missed</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset form to original values
                  if (meeting) {
                    setEditForm({
                      title: meeting.title,
                      description: meeting.description || '',
                      scheduled_at: convertFromKenyaISOToLocal(meeting.scheduled_at),
                      duration_minutes: meeting.duration_minutes || 60,
                      location: meeting.location || '',
                      meeting_type: meeting.meeting_type || '',
                      status: meeting.status,
                    });
                  }
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Two Column Layout - Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!isEditing && (
            /* Meeting Details - View Mode */
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>Meeting Details</h2>
                <span className={`list-item-status status-${getMeetingStatusColor(meeting.status)}`} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
                  {meeting.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {meeting.description && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Description
                    </div>
                    <p style={{ margin: 0, lineHeight: '1.7', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{meeting.description}</p>
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {meeting.location && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Location
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '500' }}>{meeting.location}</div>
                    </div>
                  )}
                  
                  {meeting.meeting_type && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Meeting Type
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '500' }}>{meeting.meeting_type.replace('_', ' ')}</div>
                    </div>
                  )}
                  
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Duration
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>{meeting.duration_minutes} minutes</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 className="card-title" style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Attendance</h2>
            {attendance ? (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status
                  </div>
                  <span className={`list-item-status status-${getAttendanceStatusColor(attendance.attendance_status)}`} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
                    {attendance.attendance_status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  {attendance.checked_in_at && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Checked In At
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '500' }}>{formatKenyaDateTime(attendance.checked_in_at)}</div>
                    </div>
                  )}
                  {attendance.check_in_location && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Check-in Location
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                        {attendance.check_in_location.lat && attendance.check_in_location.lng
                          ? `${attendance.check_in_location.lat.toFixed(4)}, ${attendance.check_in_location.lng.toFixed(4)}`
                          : 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
                
                {attendance.attendance_status === 'checked_in' && (
                  <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleConfirmAttendance('confirm')}
                      disabled={saving}
                      style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem', flex: 1 }}
                    >
                      ✓ Confirm Attendance
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleConfirmAttendance('dispute')}
                      disabled={saving}
                      style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem', flex: 1 }}
                    >
                      Dispute Attendance
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ margin: 0, fontSize: '0.9375rem' }}>No check-in recorded yet.</p>
              </div>
            )}
          </div>

          {/* Recap Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>Student Recap</h2>
              {recap && (
                <span className={`list-item-status status-${getRecapStatusColor(recap.recap_status)}`} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
                  {recap.recap_status.toUpperCase()}
                </span>
              )}
            </div>
            {recap ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Summary
                    </div>
                    <p style={{ margin: 0, lineHeight: '1.7', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{recap.summary}</p>
                  </div>
                  
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Topics Discussed
                    </div>
                    <p style={{ margin: 0, lineHeight: '1.7', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{recap.topics_discussed}</p>
                  </div>
                  
                  {recap.action_items && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Action Items
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.7', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{recap.action_items}</p>
                    </div>
                  )}
                  
                  {recap.next_steps && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Next Steps
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.7', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{recap.next_steps}</p>
                    </div>
                  )}
                </div>
            
                {recap.recap_status === 'submitted' && (
                  <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border)' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Review Recap
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Feedback (required for rejection)</label>
                        <textarea
                          className="form-input"
                          rows={5}
                          value={recapFeedback}
                          onChange={(e) => setRecapFeedback(e.target.value)}
                          placeholder="Provide feedback on the recap..."
                          style={{ fontSize: '0.9375rem', padding: '0.75rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                        <div style={{ minWidth: '120px' }}>
                          <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Rating (1-5)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="1"
                            max="5"
                            value={recapRating}
                            onChange={(e) => setRecapRating(parseInt(e.target.value) || 5)}
                            style={{ fontSize: '0.9375rem', padding: '0.75rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleReviewRecap('approve')}
                            disabled={saving}
                            style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem', flex: 1 }}
                          >
                            ✓ Approve Recap
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => handleReviewRecap('reject')}
                            disabled={saving || !recapFeedback.trim()}
                            style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem', flex: 1 }}
                          >
                            Request Revision
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            
                {recap.supervisor_feedback && (
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Your Feedback
                    </div>
                    <p style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.9375rem', lineHeight: '1.6' }}>{recap.supervisor_feedback}</p>
                    {recap.supervisor_rating && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Rating: <strong style={{ color: 'var(--text-primary)' }}>{recap.supervisor_rating}/5</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <p style={{ margin: 0, fontSize: '0.9375rem' }}>No recap submitted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Feedback Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 className="card-title" style={{ marginBottom: '2rem', fontSize: '1.25rem' }}>Meeting Feedback</h2>
            <form onSubmit={handleSaveFeedback}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '500' }}>
                    Remarks <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={feedbackForm.remarks}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, remarks: e.target.value })}
                    placeholder="Overall feedback and remarks about the meeting..."
                    required
                    style={{ fontSize: '0.9375rem', padding: '0.75rem', lineHeight: '1.6' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '500' }}>Overall Rating (1-5)</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="5"
                      value={feedbackForm.overall_rating}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, overall_rating: parseInt(e.target.value) || 5 })}
                      style={{ fontSize: '0.9375rem', padding: '0.75rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '500' }}>Meeting Quality</label>
                    <select
                      className="form-input"
                      value={feedbackForm.meeting_quality}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, meeting_quality: e.target.value })}
                      style={{ fontSize: '0.9375rem', padding: '0.75rem' }}
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '500' }}>Action Items for Student</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    value={feedbackForm.action_items_for_student}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, action_items_for_student: e.target.value })}
                    placeholder="List any action items or tasks for the student..."
                    style={{ fontSize: '0.9375rem', padding: '0.75rem', lineHeight: '1.6' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '500' }}>Deadline for Actions</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={feedbackForm.deadline_for_actions}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, deadline_for_actions: e.target.value })}
                    style={{ fontSize: '0.9375rem', padding: '0.75rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: '0.875rem', padding: '0.75rem 2rem', width: '100%' }}>
                    {saving ? 'Saving...' : feedback ? 'Update Feedback' : 'Save Feedback'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorMeetingDetails;
