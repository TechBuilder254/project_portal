import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MeetingWithDetails } from '../types';
import { isCheckInWindowOpen } from '../utils/meetingUtils';

interface CheckInModalProps {
  meeting: MeetingWithDetails;
  onSuccess: () => void;
  onClose: () => void;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ meeting, onSuccess, onClose }) => {
  const [checkingIn, setCheckingIn] = useState(false);
  const [location, setLocation] = useState<{ lat?: number; lng?: number; address?: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationError(null);

        // Optional: Reverse geocode to get address
        try {
          // You can integrate with a geocoding service here if needed
          // For now, we'll just store coordinates
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      },
      (error) => {
        setLocationError('Unable to get your location. You can still check in without location.');
        console.error('Geolocation error:', error);
      }
    );
  };

  const handleCheckIn = async () => {
    if (!isCheckInWindowOpen(meeting)) {
      alert('Check-in window is not open. Please try again during the meeting window.');
      return;
    }

    setCheckingIn(true);

    try {
      // Get IP address (simplified - in production, use a service)
      const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const ipData = ipResponse ? await ipResponse.json() : null;
      const ipAddress = ipData?.ip || null;

      const { error } = await supabase
        .from('meeting_attendance')
        .update({
          checked_in_at: new Date().toISOString(),
          check_in_location: location,
          check_in_ip: ipAddress,
          attendance_status: 'checked_in',
        })
        .eq('meeting_id', meeting.id)
        .eq('student_id', meeting.student_id);

      if (error) throw error;

      // Update meeting status to in_progress
      await supabase
        .from('meetings')
        .update({ status: 'in_progress' })
        .eq('id', meeting.id);

      onSuccess();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Check In</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="mb-md">
            You are checking in for: <strong>{meeting.title}</strong>
          </p>
          <p className="muted mb-md">
            Scheduled for: {new Date(meeting.scheduled_at).toLocaleString()}
          </p>

          {/* Location Verification (Optional) */}
          <div className="form-group">
            <label htmlFor="location">Location Verification (Optional)</label>
            {!location && (
              <button
                type="button"
                className="btn-outline"
                onClick={getCurrentLocation}
                disabled={checkingIn}
              >
                Get My Location
              </button>
            )}
            {location && (
              <div className="success-message">
                ✓ Location captured: {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
              </div>
            )}
            {locationError && (
              <div className="error-message">{locationError}</div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={checkingIn}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCheckIn}
              disabled={checkingIn}
            >
              {checkingIn ? 'Checking In...' : 'Confirm Check In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;
