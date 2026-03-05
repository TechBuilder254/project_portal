import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Submission, Feedback } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string, rating: number, action: 'approved' | 'revise') => Promise<void>;
  submission: Submission | null;
  existingFeedback?: Feedback[];
  isLoading?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submission,
  existingFeedback = [],
  isLoading = false,
}) => {
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [action, setAction] = useState<'approved' | 'revise'>('approved');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setComment('');
      setRating(3);
      setAction('approved');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!comment.trim()) {
      setError('Please provide feedback comment.');
      return;
    }

    try {
      await onSubmit(comment, rating, action);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    }
  };

  if (!submission) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provide Feedback" size="large">
      <div style={{ marginBottom: '1rem' }}>
        <strong>Submission:</strong> {submission.title}
      </div>

      {existingFeedback.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
          <strong style={{ fontSize: '0.875rem' }}>Previous Feedback:</strong>
          {existingFeedback.map((f) => (
            <div key={f.id} style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              <div>{f.comment}</div>
              <div className="list-meta">
                Rating: {f.rating}/5 · Action: {f.action}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Feedback Comment <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            className="form-input"
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Provide detailed feedback on the submission..."
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '150px' }}>
            <label className="form-label">Rating (1-5)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value) || 3)}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <label className="form-label">Action</label>
            <select
              className="form-input"
              value={action}
              onChange={(e) => setAction(e.target.value as 'approved' | 'revise')}
            >
              <option value="approved">Approve</option>
              <option value="revise">Request Revision</option>
            </select>
          </div>
        </div>

        {error && <div className="error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FeedbackModal;
