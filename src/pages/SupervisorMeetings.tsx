import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Meeting, MeetingAttendance, MeetingRecap, Profile } from '../types';
import {
  formatMeetingDateTime,
  formatKenyaDateTime,
  getMeetingStatusColor,
  getAttendanceStatusColor,
  getRecapStatusColor,
  convertToKenyaISOString,
} from '../utils/meetingUtils';
import MeetingModal from '../components/MeetingModal';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';
import Pagination from '../components/Pagination';
import MeetingFilters from '../components/MeetingFilters';

interface SupervisorMeetingsProps {
  supervisorId: string;
}

const SupervisorMeetings: React.FC<SupervisorMeetingsProps> = ({ supervisorId }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Record<string, MeetingAttendance>>({});
  const [recaps, setRecaps] = useState<Record<string, MeetingRecap>>({});
  const [students, setStudents] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'pending' | 'attendance'>('upcoming');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'checked_in' | 'confirmed' | 'disputed'>('all');
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<string | null>(null);
  
  // Filtering and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        // Load meetings
        const { data: meetingsData } = await supabase
          .from('meetings')
          .select('*')
          .eq('supervisor_id', supervisorId)
          .order('scheduled_at', { ascending: true });

        if (!meetingsData) return;

        const meetingsList = meetingsData as Meeting[];
        setMeetings(meetingsList);

        // Load attendances, recaps, and students
        const meetingIds = meetingsList.map((m) => m.id);
        if (meetingIds.length > 0) {
          const [attendancesRes, recapsRes] = await Promise.all([
            supabase.from('meeting_attendance').select('*').in('meeting_id', meetingIds),
            supabase.from('meeting_recaps').select('*').in('meeting_id', meetingIds),
          ]);

          if (attendancesRes.data) {
            const attendanceMap: Record<string, MeetingAttendance> = {};
            attendancesRes.data.forEach((att) => {
              attendanceMap[att.meeting_id] = att as MeetingAttendance;
            });
            setAttendances(attendanceMap);
          }

          if (recapsRes.data) {
            const recapMap: Record<string, MeetingRecap> = {};
            recapsRes.data.forEach((recap) => {
              recapMap[recap.meeting_id] = recap as MeetingRecap;
            });
            setRecaps(recapMap);
          }

          // Load student profiles
          const studentIds = [...new Set(meetingsList.map((m) => m.student_id))];
          if (studentIds.length > 0) {
            const { data: studentsData } = await supabase
              .from('profiles')
              .select('*')
              .in('id', studentIds);

            if (studentsData) {
              const studentMap: Record<string, Profile> = {};
              studentsData.forEach((stu) => {
                studentMap[stu.id] = stu as Profile;
              });
              setStudents(studentMap);
            }
          }
        }
      } catch (error) {
        console.error('Error loading meetings:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadAssignedStudents = async () => {
      try {
        const { data: assignments } = await supabase
          .from('supervisor_assignments')
          .select('student_id')
          .eq('supervisor_id', supervisorId);

        if (!assignments || assignments.length === 0) {
          setAssignedStudents([]);
          return;
        }

        const studentIds = assignments.map((a: { student_id: string }) => a.student_id);
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds)
          .eq('role', 'student');

        if (studentsData) {
          setAssignedStudents(studentsData as Profile[]);
        }
      } catch (error) {
        console.error('Error loading assigned students:', error);
      }
    };

    void loadMeetings();
    void loadAssignedStudents();
  }, [supervisorId]);

  const now = new Date();
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) > now && m.status !== 'cancelled'
  );
  const pastMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) <= now || m.status === 'completed' || m.status === 'missed'
  );
  const pendingVerification = meetings.filter((m) => {
    const attendance = attendances[m.id];
    const recap = recaps[m.id];
    return (
      (attendance && attendance.attendance_status === 'checked_in') ||
      (recap && recap.recap_status === 'submitted')
    );
  });

  // All meetings that have an attendance record (for Attendance tab)
  const meetingsWithAttendance = useMemo(() => {
    return meetings
      .filter((m) => attendances[m.id])
      .map((m) => ({
        meeting: m,
        attendance: attendances[m.id],
        student: students[m.student_id],
        recap: recaps[m.id],
      }))
      .filter((row) => {
        if (attendanceStatusFilter === 'all') return true;
        return row.attendance.attendance_status === attendanceStatusFilter;
      })
      .sort((a, b) => new Date(b.meeting.scheduled_at).getTime() - new Date(a.meeting.scheduled_at).getTime());
  }, [meetings, attendances, students, recaps, attendanceStatusFilter]);

  const handleAttendanceAction = async (meetingId: string, action: 'confirm' | 'dispute') => {
    const attendance = attendances[meetingId];
    if (!attendance) return;

    setUpdatingAttendanceId(attendance.id);
    try {
      const { error } = await supabase
        .from('meeting_attendance')
        .update({
          attendance_status: action === 'confirm' ? 'confirmed' : 'disputed',
          supervisor_confirmed_at: new Date().toISOString(),
          supervisor_confirmed_by: supervisorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attendance.id);

      if (error) throw error;

      // Refresh attendances
      const { data } = await supabase
        .from('meeting_attendance')
        .select('*')
        .in('meeting_id', meetings.map((m) => m.id));

      if (data) {
        const next: Record<string, MeetingAttendance> = {};
        data.forEach((att) => {
          next[att.meeting_id] = att as MeetingAttendance;
        });
        setAttendances(next);
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      alert('Failed to update attendance. Please try again.');
    } finally {
      setUpdatingAttendanceId(null);
    }
  };

  const baseMeetings =
    activeTab === 'upcoming'
      ? upcomingMeetings
      : activeTab === 'pending'
        ? pendingVerification
        : pastMeetings;

  // Apply filters
  const filteredMeetings = useMemo(() => {
    let filtered = [...baseMeetings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const student = students[m.student_id];
        return (
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          student?.name.toLowerCase().includes(query) ||
          student?.email.toLowerCase().includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    // Student filter
    if (studentFilter !== 'all') {
      filtered = filtered.filter((m) => m.student_id === studentFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      filtered = filtered.filter((m) => {
        const meetingDate = new Date(m.scheduled_at);
        switch (dateFilter) {
          case 'today':
            return meetingDate >= today && meetingDate < tomorrow;
          case 'this_week':
            return meetingDate >= today && meetingDate < nextWeek;
          case 'this_month':
            return meetingDate >= today && meetingDate < nextMonth;
          case 'next_month':
            const nextMonthEnd = new Date(nextMonth);
            nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
            return meetingDate >= nextMonth && meetingDate < nextMonthEnd;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [baseMeetings, searchQuery, statusFilter, dateFilter, studentFilter, students]);

  // Pagination
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMeetings.slice(start, start + itemsPerPage);
  }, [filteredMeetings, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, studentFilter, activeTab]);

  const displayMeetings = paginatedMeetings;

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading meetings...</p>
      </div>
    );
  }

  return (
    <div className="page meetings-page">
      <div className="meetings-header">
        <div className="meetings-header-content">
          <div className="meetings-title-section">
            <h1 className="meetings-title">Meetings</h1>
            <p className="meetings-subtitle">Manage and track student meetings</p>
          </div>
          <button
            type="button"
            className="meetings-action-btn"
            onClick={() => setShowScheduleModal(true)}
          >
            <span>+</span>
            <span>Schedule Meeting</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="meetings-tabs">
          <button
            type="button"
            className={`meetings-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({upcomingMeetings.length})
          </button>
          <button
            type="button"
            className={`meetings-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Verification ({pendingVerification.length})
          </button>
          <button
            type="button"
            className={`meetings-tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past ({pastMeetings.length})
          </button>
          <button
            type="button"
            className={`meetings-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance ({meetings.filter((m) => attendances[m.id]).length})
          </button>
        </div>
      </div>

      {/* Filters - hide when on Attendance tab */}
      {activeTab !== 'attendance' && (
        <MeetingFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          studentFilter={studentFilter}
          onStudentFilterChange={setStudentFilter}
          students={assignedStudents.map((s) => ({ id: s.id, name: s.name }))}
        />
      )}

      {/* Attendance tab: table of all attendance with Approve / Reject / View */}
      {activeTab === 'attendance' && (
        <div className="admin-card-modern" style={{ marginBottom: '24px' }}>
          <div className="admin-card-header-modern">
            <h2 className="admin-card-title-modern">
              <span>📋</span>
              <span>All Attendance</span>
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Status:</span>
              {(['all', 'checked_in', 'confirmed', 'disputed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`meetings-tab ${attendanceStatusFilter === status ? 'active' : ''}`}
                  onClick={() => setAttendanceStatusFilter(status)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          {meetingsWithAttendance.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">📋</div>
              <p className="admin-empty-text">
                {attendanceStatusFilter === 'all'
                  ? 'No attendance records yet.'
                  : `No attendance with status "${attendanceStatusFilter.replace('_', ' ')}".`}
              </p>
            </div>
          ) : (
            <div className="admin-table-modern admin-table-attendance">
              <div className="admin-table-header-modern admin-table-attendance-header">
                <div className="admin-table-cell-modern">#</div>
                <div className="admin-table-cell-modern">Student name</div>
                <div className="admin-table-cell-modern">Email</div>
                <div className="admin-table-cell-modern">Department</div>
                <div className="admin-table-cell-modern">Meeting</div>
                <div className="admin-table-cell-modern">Scheduled</div>
                <div className="admin-table-cell-modern">Check-in time</div>
                <div className="admin-table-cell-modern">Status</div>
                <div className="admin-table-cell-modern admin-table-cell-actions">Actions</div>
              </div>
              <div className="admin-table-body-modern">
                {meetingsWithAttendance.map((row, index) => (
                  <div
                    key={row.meeting.id}
                    className="admin-table-row-modern admin-table-attendance-row"
                  >
                    <div className="admin-table-cell-modern" data-label="#">{index + 1}</div>
                    <div className="admin-table-cell-modern" data-label="Student name">
                      {row.student?.name ?? '—'}
                    </div>
                    <div className="admin-table-cell-modern" data-label="Email">
                      {row.student?.email ?? '—'}
                    </div>
                    <div className="admin-table-cell-modern" data-label="Department">
                      {row.student?.department ?? '—'}
                    </div>
                    <div className="admin-table-cell-modern" data-label="Meeting">
                      {row.meeting.title}
                    </div>
                    <div className="admin-table-cell-modern" data-label="Scheduled">
                      {formatMeetingDateTime(row.meeting.scheduled_at)} EAT
                    </div>
                    <div className="admin-table-cell-modern" data-label="Check-in time">
                      {row.attendance.checked_in_at
                        ? formatKenyaDateTime(row.attendance.checked_in_at)
                        : '—'}
                    </div>
                    <div className="admin-table-cell-modern" data-label="Status">
                      <span className={`list-item-status status-${getAttendanceStatusColor(row.attendance.attendance_status)}`}>
                        {row.attendance.attendance_status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="admin-table-cell-modern admin-table-cell-actions" data-label="Actions">
                      <div className="attendance-row-actions">
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          onClick={() => navigate(`/supervisor/meetings/${row.meeting.id}`)}
                        >
                          View
                        </button>
                        {row.attendance.attendance_status === 'checked_in' && (
                          <>
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              disabled={updatingAttendanceId === row.attendance.id}
                              onClick={() => handleAttendanceAction(row.meeting.id, 'confirm')}
                            >
                              {updatingAttendanceId === row.attendance.id ? '…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="btn-outline btn-sm btn-danger"
                              disabled={updatingAttendanceId === row.attendance.id}
                              onClick={() => handleAttendanceAction(row.meeting.id, 'dispute')}
                            >
                              {updatingAttendanceId === row.attendance.id ? '…' : 'Reject'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Summary - only when not on Attendance tab */}
      {activeTab !== 'attendance' && filteredMeetings.length > 0 && (
        <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Found {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {activeTab !== 'attendance' && displayMeetings.length === 0 ? (
        <div className="meetings-empty-state">
          <div className="meetings-empty-icon">🔍</div>
          <p className="meetings-empty-text">
            {filteredMeetings.length === 0 && baseMeetings.length > 0
              ? 'No meetings match your filters. Try adjusting your search criteria.'
              : activeTab === 'upcoming'
                ? 'No upcoming meetings scheduled.'
                : activeTab === 'pending'
                  ? 'No meetings pending verification.'
                  : 'No past meetings found.'}
          </p>
        </div>
      ) : activeTab !== 'attendance' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayMeetings.map((meeting, index) => {
              // Calculate actual index for numbering (considering pagination)
              const actualIndex = (currentPage - 1) * itemsPerPage + index;
            const attendance = attendances[meeting.id];
            const recap = recaps[meeting.id];
            const student = students[meeting.student_id];

            return (
              <div
                key={meeting.id}
                className="meeting-card-modern"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="meeting-card-header">
                  <div className="meeting-card-number">{actualIndex + 1}</div>
                  <div className="meeting-card-title-row">
                    <h3 className="meeting-card-title">{meeting.title}</h3>
                    <span className={`meeting-card-status status-${getMeetingStatusColor(meeting.status)}`}>
                      {meeting.status.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="meeting-card-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/supervisor/meetings/${meeting.id}`);
                    }}
                  >
                    View Details
                  </button>
                </div>

                <div className="meeting-card-info-grid">
                  <div className="meeting-card-info-item">
                    <div className="meeting-card-info-label">Student</div>
                    <div className="meeting-card-info-value">{student?.name || 'Unknown Student'}</div>
                  </div>
                  <div className="meeting-card-info-item">
                    <div className="meeting-card-info-label">Scheduled</div>
                    <div className="meeting-card-info-value">{formatMeetingDateTime(meeting.scheduled_at)} EAT</div>
                  </div>
                  {meeting.location && (
                    <div className="meeting-card-info-item">
                      <div className="meeting-card-info-label">Location</div>
                      <div className="meeting-card-info-value">{meeting.location}</div>
                    </div>
                  )}
                  {meeting.duration_minutes && (
                    <div className="meeting-card-info-item">
                      <div className="meeting-card-info-label">Duration</div>
                      <div className="meeting-card-info-value">{meeting.duration_minutes} minutes</div>
                    </div>
                  )}
                </div>

                <div className="meeting-card-badges">
                  {attendance && (
                    <span className={`list-item-status status-${getAttendanceStatusColor(attendance.attendance_status)}`}>
                      Attendance: {attendance.attendance_status.replace('_', ' ')}
                    </span>
                  )}
                  {recap && (
                    <span className={`list-item-status status-${getRecapStatusColor(recap.recap_status)}`}>
                      Recap: {recap.recap_status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          </div>

          {/* Pagination */}
          {filteredMeetings.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredMeetings.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      ) : null}

      {selectedMeeting && (
        <MeetingModal
          meeting={selectedMeeting}
          attendance={attendances[selectedMeeting.id]}
          recap={recaps[selectedMeeting.id]}
          student={students[selectedMeeting.student_id]}
          onClose={() => setSelectedMeeting(null)}
          onViewDetails={() => {
            setSelectedMeeting(null);
            navigate(`/supervisor/meetings/${selectedMeeting.id}`);
          }}
        />
      )}

      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSubmit={async (data) => {
          setSaving(true);
          try {
            const meetingsToCreate = data.student_ids.map((studentId) => ({
              supervisor_id: supervisorId,
              student_id: studentId,
              title: data.title.trim(),
              description: data.description.trim() || null,
              scheduled_at: data.scheduled_at,
              duration_minutes: data.duration_minutes || 60,
              location: data.location.trim() || null,
              meeting_type: data.meeting_type.trim() || null,
              status: 'scheduled' as const,
            }));

            const { error } = await supabase.from('meetings').insert(meetingsToCreate);

            if (error) throw error;

            setShowScheduleModal(false);
            window.location.reload(); // Reload to show new meetings
          } catch (error) {
            console.error('Error creating meetings:', error);
            throw error;
          } finally {
            setSaving(false);
          }
        }}
        students={assignedStudents}
        isLoading={saving}
      />
    </div>
  );
};

export default SupervisorMeetings;
