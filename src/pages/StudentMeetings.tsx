import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Meeting, MeetingAttendance, MeetingRecap, Profile } from '../types';
import {
  isCheckInWindowOpen,
  canCheckIn,
  hasCheckedIn,
  formatMeetingDateTime,
  formatKenyaTime,
  getTimeUntilMeeting,
  getMeetingStatusColor,
  getAttendanceStatusColor,
  getRecapStatusColor,
} from '../utils/meetingUtils';
import MeetingModal from '../components/MeetingModal';
import Pagination from '../components/Pagination';
import MeetingFilters from '../components/MeetingFilters';

interface StudentMeetingsProps {
  studentId: string;
}

const StudentMeetings: React.FC<StudentMeetingsProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Record<string, MeetingAttendance>>({});
  const [recaps, setRecaps] = useState<Record<string, MeetingRecap>>({});
  const [supervisors, setSupervisors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  
  // Filtering and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        // Load meetings
        const { data: meetingsData } = await supabase
          .from('meetings')
          .select('*')
          .eq('student_id', studentId)
          .order('scheduled_at', { ascending: true });

        if (!meetingsData) return;

        const meetingsList = meetingsData as Meeting[];
        setMeetings(meetingsList);

        // Load attendances
        const meetingIds = meetingsList.map((m) => m.id);
        if (meetingIds.length > 0) {
          const { data: attendancesData } = await supabase
            .from('meeting_attendance')
            .select('*')
            .in('meeting_id', meetingIds);

          if (attendancesData) {
            const attendanceMap: Record<string, MeetingAttendance> = {};
            attendancesData.forEach((att) => {
              attendanceMap[att.meeting_id] = att as MeetingAttendance;
            });
            setAttendances(attendanceMap);
          }

          // Load recaps
          const { data: recapsData } = await supabase
            .from('meeting_recaps')
            .select('*')
            .in('meeting_id', meetingIds);

          if (recapsData) {
            const recapMap: Record<string, MeetingRecap> = {};
            recapsData.forEach((recap) => {
              recapMap[recap.meeting_id] = recap as MeetingRecap;
            });
            setRecaps(recapMap);
          }

          // Load supervisor profiles
          const supervisorIds = [...new Set(meetingsList.map((m) => m.supervisor_id))];
          if (supervisorIds.length > 0) {
            const { data: supervisorsData } = await supabase
              .from('profiles')
              .select('*')
              .in('id', supervisorIds);

            if (supervisorsData) {
              const supervisorMap: Record<string, Profile> = {};
              supervisorsData.forEach((sup) => {
                supervisorMap[sup.id] = sup as Profile;
              });
              setSupervisors(supervisorMap);
            }
          }
        }
      } catch (error) {
        console.error('Error loading meetings:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadMeetings();
  }, [studentId]);

  const handleCheckIn = async (meeting: Meeting) => {
    try {
      const location = await navigator.geolocation
        ? await new Promise<{ lat: number; lng: number } | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null)
            );
          })
        : null;

      const { data, error } = await supabase
        .from('meeting_attendance')
        .insert({
          meeting_id: meeting.id,
          student_id: studentId,
          checked_in_at: new Date().toISOString(),
          check_in_location: location,
          attendance_status: 'checked_in',
        })
        .select()
        .single();

      if (error) throw error;

      // Update meeting status
      await supabase
        .from('meetings')
        .update({ status: 'in_progress' })
        .eq('id', meeting.id);

      // Reload data
      window.location.reload();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in. Please try again.');
    }
  };

  const handleWriteRecap = (meetingId: string) => {
    navigate(`/student/meetings/${meetingId}/recap`);
  };

  const handleViewRecap = (meetingId: string) => {
    navigate(`/student/meetings/${meetingId}/recap`);
  };

  // Calculate base meetings - must be before any conditional returns
  const baseMeetings = useMemo(() => {
    const now = new Date();
    if (activeTab === 'upcoming') {
      return meetings.filter(
        (m) => new Date(m.scheduled_at) > now && m.status !== 'cancelled'
      );
    } else {
      return meetings.filter(
        (m) => new Date(m.scheduled_at) <= now || m.status === 'completed' || m.status === 'missed'
      );
    }
  }, [meetings, activeTab]);

  // Apply filters - must be before any conditional returns
  const filteredMeetings = useMemo(() => {
    let filtered = [...baseMeetings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const supervisor = supervisors[m.supervisor_id];
        return (
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          supervisor?.name.toLowerCase().includes(query) ||
          m.location?.toLowerCase().includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
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
  }, [baseMeetings, searchQuery, statusFilter, dateFilter, supervisors]);

  // Pagination - must be before any conditional returns
  const totalPages = useMemo(() => Math.ceil(filteredMeetings.length / itemsPerPage), [filteredMeetings.length, itemsPerPage]);
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMeetings.slice(start, start + itemsPerPage);
  }, [filteredMeetings, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, activeTab]);

  // Early return after all hooks
  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading meetings...</p>
      </div>
    );
  }

  // Calculate display values (these are just references, not hooks)
  const displayMeetings = paginatedMeetings;
  const now = new Date();
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) > now && m.status !== 'cancelled'
  );
  const pastMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) <= now || m.status === 'completed' || m.status === 'missed'
  );

  return (
    <div className="page meetings-page">
      <div className="meetings-header">
        <div className="meetings-header-content">
          <div className="meetings-title-section">
            <h1 className="meetings-title">My Meetings</h1>
            <p className="meetings-subtitle">Track your meetings with your supervisor</p>
          </div>
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
            className={`meetings-tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past ({pastMeetings.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <MeetingFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />

      {/* Results Summary */}
      {filteredMeetings.length > 0 && (
        <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Found {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {displayMeetings.length === 0 ? (
        <div className="meetings-empty-state">
          <div className="meetings-empty-icon">🔍</div>
          <p className="meetings-empty-text">
            {filteredMeetings.length === 0 && baseMeetings.length > 0
              ? 'No meetings match your filters. Try adjusting your search criteria.'
              : activeTab === 'upcoming'
                ? 'No upcoming meetings scheduled.'
                : 'No past meetings found.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayMeetings.map((meeting, index) => {
              // Calculate actual index for numbering (considering pagination)
              const actualIndex = (currentPage - 1) * itemsPerPage + index;
            const attendance = attendances[meeting.id];
            const recap = recaps[meeting.id];
            const supervisor = supervisors[meeting.supervisor_id];
            const canCheckInNow = canCheckIn(meeting, attendance);
            const checkInWindowOpen = isCheckInWindowOpen(meeting);

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
                      setSelectedMeeting(meeting);
                    }}
                  >
                    View Details
                  </button>
                </div>

                <div className="meeting-card-info-grid">
                  <div className="meeting-card-info-item">
                    <div className="meeting-card-info-label">Supervisor</div>
                    <div className="meeting-card-info-value">{supervisor?.name || 'Unknown Supervisor'}</div>
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
                  {activeTab === 'upcoming' && canCheckInNow && (
                    <span className="list-item-badge" style={{ fontSize: '0.75rem', backgroundColor: '#22c55e', color: 'white', padding: '6px 12px', borderRadius: '8px' }}>
                      ✓ Check-in Available
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
      )}

      {selectedMeeting && (
        <MeetingModal
          meeting={selectedMeeting}
          attendance={attendances[selectedMeeting.id]}
          recap={recaps[selectedMeeting.id]}
          supervisor={supervisors[selectedMeeting.supervisor_id]}
          onClose={() => setSelectedMeeting(null)}
          onCheckIn={async () => {
            if (selectedMeeting) {
              await handleCheckIn(selectedMeeting);
              setSelectedMeeting(null);
            }
          }}
          onWriteRecap={() => {
            if (selectedMeeting) {
              navigate(`/student/meetings/${selectedMeeting.id}/recap`);
              setSelectedMeeting(null);
            }
          }}
          canCheckIn={canCheckIn(selectedMeeting, attendances[selectedMeeting.id])}
          canWriteRecap={
            hasCheckedIn(attendances[selectedMeeting.id]) &&
            (!recaps[selectedMeeting.id] ||
              recaps[selectedMeeting.id].recap_status === 'rejected' ||
              recaps[selectedMeeting.id].recap_status === 'revised')
          }
          checkInWindowOpen={isCheckInWindowOpen(selectedMeeting)}
        />
      )}
    </div>
  );
};

export default StudentMeetings;
