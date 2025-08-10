import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-lg p-4">
        <h4 className="text-lg font-semibold mb-2">{title}</h4>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">{message}</div>
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={onCancel}>{cancelText}</button>
          <button className="px-3 py-1.5 text-sm rounded bg-red-600 text-white" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;



