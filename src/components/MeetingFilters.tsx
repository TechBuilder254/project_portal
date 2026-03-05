import React from 'react';
import type { Meeting } from '../types';

interface MeetingFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
  studentFilter?: string;
  onStudentFilterChange?: (studentId: string) => void;
  students?: Array<{ id: string; name: string }>;
}

const MeetingFilters: React.FC<MeetingFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  studentFilter,
  onStudentFilterChange,
  students,
}) => {
  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Search */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Search
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.5rem' }}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status
          </label>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.5rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Date Range
          </label>
          <select
            className="form-input"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.5rem' }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="next_month">Next Month</option>
          </select>
        </div>

        {/* Student Filter (for supervisors) */}
        {onStudentFilterChange && students && (
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Student
            </label>
            <select
              className="form-input"
              value={studentFilter || 'all'}
              onChange={(e) => onStudentFilterChange(e.target.value)}
              style={{ fontSize: '0.875rem', padding: '0.5rem' }}
            >
              <option value="all">All Students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingFilters;
