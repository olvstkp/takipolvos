import React from 'react';
import toast from 'react-hot-toast';

export const showToast = {
  // Success toasts
  success: (message: string, duration = 3000) => {
    return toast.success(message, {
      icon: '✅',
      duration,
      style: {
        background: '#10B981',
        color: 'white',
      }
    });
  },

  // Error toasts
  error: (message: string, duration = 5000) => {
    return toast.error(message, {
      icon: '❌',
      duration,
      style: {
        background: '#EF4444',
        color: 'white',
      }
    });
  },

  // Warning toasts
  warning: (message: string, duration = 4000) => {
    return toast.error(message, {
      icon: '⚠️',
      duration,
      style: {
        background: '#F59E0B',
        color: 'white',
      }
    });
  },

  // Loading toasts
  loading: (message: string) => {
    return toast.loading(message, {
      icon: '⏳',
      style: {
        background: '#3B82F6',
        color: 'white',
      }
    });
  },

  // Info toasts
  info: (message: string, duration = 4000) => {
    return toast(message, {
      icon: 'ℹ️',
      duration,
      style: {
        background: '#6B7280',
        color: 'white',
      }
    });
  },

  // Update existing toast (for loading -> success/error)
  update: {
    success: (toastId: string, message: string, duration = 3000) => {
      return toast.success(message, {
        id: toastId,
        icon: '✅',
        duration,
        style: {
          background: '#10B981',
          color: 'white',
        }
      });
    },

    error: (toastId: string, message: string, duration = 5000) => {
      return toast.error(message, {
        id: toastId,
        icon: '❌',
        duration,
        style: {
          background: '#EF4444',
          color: 'white',
        }
      });
    }
  },

  // Custom confirmation dialog
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Evet',
    cancelText = 'İptal',
    icon = '❓'
  ) => {
    return toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium">{title}</span>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: {
        background: 'white',
        color: 'black',
        maxWidth: '400px',
      }
    });
  },

  // Delete confirmation (red confirm button)
  confirmDelete: (
    itemName: string,
    onConfirm: () => void,
    itemType = 'öğe'
  ) => {
    return toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🗑️</span>
          <span className="font-medium">{itemType.charAt(0).toUpperCase() + itemType.slice(1)} Sil</span>
        </div>
        <p className="text-sm text-gray-600">
          <strong>"{itemName}"</strong> {itemType}sini silmek istediğinizden emin misiniz?
        </p>
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            İptal
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sil
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: {
        background: 'white',
        color: 'black',
        maxWidth: '400px',
      }
    });
  }
};

export default showToast; 