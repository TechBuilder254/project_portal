export type UserRole = 'student' | 'supervisor' | 'admin';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  // Optional: course/grouping name for admins to use when organising students
  course?: string | null;
}

export interface Submission {
  id: string;
  student_id: string;
  title: string;
  description: string;
  file_url: string;
  status: 'pending' | 'reviewed' | 'changes_requested';
  created_at: string;
}

export interface Feedback {
  id: string;
  submission_id: string;
  supervisor_id: string;
  comment: string;
  rating: number;
  action: 'approved' | 'revise';
  created_at: string;
}

// Meeting Tracking Types
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
export type AttendanceStatus = 'pending' | 'checked_in' | 'confirmed' | 'disputed' | 'missed';
export type RecapStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'revised';

export interface Meeting {
  id: string;
  supervisor_id: string;
  student_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_type: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  student_id: string;
  checked_in_at: string | null;
  check_in_location: { lat?: number; lng?: number; address?: string } | null;
  check_in_ip: string | null;
  attendance_status: AttendanceStatus;
  supervisor_confirmed_at: string | null;
  supervisor_confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingRecap {
  id: string;
  meeting_id: string;
  student_id: string;
  summary: string;
  topics_discussed: string;
  action_items: string | null;
  next_steps: string | null;
  student_notes: string | null;
  recap_status: RecapStatus;
  supervisor_approved_at: string | null;
  supervisor_approved_by: string | null;
  supervisor_feedback: string | null;
  supervisor_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingFeedback {
  id: string;
  meeting_id: string;
  supervisor_id: string;
  remarks: string;
  overall_rating: number | null;
  meeting_quality: string | null;
  action_items_for_student: string | null;
  deadline_for_actions: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface MeetingWithDetails extends Meeting {
  student?: Profile;
  supervisor?: Profile;
  attendance?: MeetingAttendance;
  recap?: MeetingRecap;
  feedback?: MeetingFeedback;
}


