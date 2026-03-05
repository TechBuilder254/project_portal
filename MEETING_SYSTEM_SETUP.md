# Meeting Tracking System - Setup Guide

## 🚀 Quick Start

### 1. Database Setup

Run the SQL migration file in your Supabase SQL Editor:

```bash
# Copy and paste the contents of meetings_migration.sql into Supabase SQL Editor
# Then click "Run" to execute
```

The migration will create:
- ✅ 4 new tables: `meetings`, `meeting_attendance`, `meeting_recaps`, `meeting_feedback`
- ✅ 3 new enum types: `meeting_status`, `attendance_status`, `recap_status`
- ✅ All necessary indexes and RLS policies
- ✅ Triggers for `updated_at` timestamps

### 2. Verify Installation

After running the migration, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'meeting%';
```

You should see:
- `meetings`
- `meeting_attendance`
- `meeting_recaps`
- `meeting_feedback`

### 3. Test the System

1. **As Supervisor:**
   - Navigate to "Meetings" in the sidebar
   - Click "Schedule Meeting"
   - Fill in meeting details and select a student
   - Submit to create the meeting

2. **As Student:**
   - Navigate to "Meetings" in the sidebar
   - See upcoming meetings
   - When meeting time arrives (15 min before), "Check In" button becomes active
   - Click "Check In" to record attendance
   - After check-in, write a recap (mandatory)
   - Submit recap for supervisor review

3. **As Supervisor (Review):**
   - Go to meeting details page
   - Confirm student attendance
   - Review and approve/reject recap
   - Add feedback and remarks

---

## 📋 Features Implemented

### ✅ Supervisor Features
- [x] Schedule meetings with date/time, location, agenda
- [x] View all meetings with filters (all, scheduled, completed, cancelled)
- [x] Meeting statistics dashboard
- [x] Confirm/dispute student attendance
- [x] Review and approve/reject student recaps
- [x] Add feedback and remarks
- [x] Rate meeting quality

### ✅ Student Features
- [x] View upcoming and past meetings
- [x] Check-in during meeting window (±15 minutes)
- [x] Optional geolocation verification
- [x] Write mandatory recap after check-in
- [x] View supervisor feedback
- [x] Revise recap if rejected

### ✅ Security & Verification
- [x] Time-based check-in window enforcement
- [x] One check-in per meeting
- [x] Geolocation capture (optional)
- [x] IP address logging
- [x] Supervisor confirmation required
- [x] Recap quality verification
- [x] Complete audit trail

---

## 🔧 Configuration

### Check-in Window
The check-in window is currently set to:
- **Opens:** 15 minutes before scheduled meeting time
- **Closes:** 15 minutes after meeting end time

To change this, edit `src/utils/meetingUtils.ts`:

```typescript
// Change 15 to your desired minutes
const windowStart = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
```

### Geolocation
Geolocation is **optional** by default. Students can check in without location.

To make it mandatory, modify `src/components/CheckInModal.tsx`:

```typescript
// Add validation to require location before check-in
if (!location) {
  alert('Location is required for check-in.');
  return;
}
```

---

## 📊 Database Schema Overview

### `meetings`
Stores meeting information:
- Supervisor and student IDs
- Title, description, scheduled time
- Duration, location, meeting type
- Status (scheduled, in_progress, completed, cancelled, missed)

### `meeting_attendance`
Tracks student check-ins:
- Check-in timestamp
- Location (lat/lng/address)
- IP address
- Attendance status
- Supervisor confirmation

### `meeting_recaps`
Student meeting summaries:
- Summary, topics discussed
- Action items, next steps
- Student notes
- Recap status (draft, submitted, approved, rejected, revised)
- Supervisor feedback and rating

### `meeting_feedback`
Supervisor feedback:
- Remarks and overall rating
- Meeting quality assessment
- Action items for student
- Deadline for actions

---

## 🎯 Workflow

### Meeting Lifecycle

```
1. Supervisor creates meeting
   ↓ Status: scheduled
   
2. Meeting time approaches
   ↓ Check-in window opens (15 min before)
   
3. Student checks in
   ↓ Status: checked_in
   ↓ Meeting status: in_progress
   
4. Student writes recap
   ↓ Recap status: submitted
   ↓ Meeting status: completed
   
5. Supervisor confirms attendance
   ↓ Attendance status: confirmed
   
6. Supervisor reviews recap
   ↓ Recap status: approved/rejected
   
7. Supervisor adds feedback
   ↓ Complete!
```

---

## 🐛 Troubleshooting

### Issue: Check-in button not appearing
**Solution:** Check if:
- Current time is within check-in window (±15 min)
- Student has already checked in
- Meeting status is not cancelled

### Issue: Can't write recap
**Solution:** Ensure:
- Student has checked in first
- Meeting has passed or is in progress

### Issue: Supervisor can't see meetings
**Solution:** Verify:
- Supervisor is assigned to the student (via `supervisor_assignments` table)
- RLS policies are correctly set up

### Issue: Database errors
**Solution:** 
- Ensure migration ran successfully
- Check RLS policies in Supabase dashboard
- Verify user has correct role (student/supervisor)

---

## 📝 Notes

- All timestamps are stored in UTC
- Meeting status updates automatically based on check-ins and recaps
- Recaps are mandatory - meeting cannot be completed without one
- Supervisor can dispute attendance if needed
- All actions are logged with timestamps for audit trail

---

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Students can only see their own meetings
- Supervisors can only see meetings they created
- Admins can see all meetings
- Check-in window prevents gaming the system
- One check-in per meeting enforced

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify database migration completed successfully
3. Check Supabase logs for RLS policy violations
4. Ensure all environment variables are set correctly

---

**Happy Meeting Tracking! 🎓**
