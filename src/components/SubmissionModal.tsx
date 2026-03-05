import React, { useState } from 'react';
import Modal from './Modal';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, file: File) => Promise<void>;
  isLoading?: boolean;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select a file.');
      return;
    }

    try {
      await onSubmit(title, description, file);
      // Reset form on success
      setTitle('');
      setDescription('');
      setFile(null);
      (document.getElementById('file-input-modal') as HTMLInputElement | null) &&
        ((document.getElementById('file-input-modal') as HTMLInputElement).value = '');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload New Submission" size="medium">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Title <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Chapter 2 - Literature Review"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of your submission..."
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            File (PDF, DOCX) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="file-input-modal"
            type="file"
            className="form-input"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>

        {error && <div className="error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Submit Work'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SubmissionModal;
