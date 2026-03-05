import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) => {
  const colors = {
    danger: { bg: 'var(--danger)', border: 'var(--danger)' },
    warning: { bg: '#f59e0b', border: '#f59e0b' },
    info: { bg: 'var(--primary)', border: 'var(--primary)' },
  };

  const color = colors[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="small" title={title}>
      <div>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: color.bg,
              borderColor: color.border,
            }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
