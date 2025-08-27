import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemCount?: number;
  loading?: boolean;
  progress?: { current: number; total: number };
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemCount = 0,
  loading = false,
  progress = { current: 0, total: 0 }
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            // Loading State
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Siliniyor...
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {progress.total > 1 
                    ? `${progress.current} / ${progress.total} öğe işlendi`
                    : 'Öğe silinmek için işleniyor...'
                  }
                </p>
                
                {/* Progress Bar */}
                {progress.total > 1 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                )}
                
                {/* Progress Percentage */}
                {progress.total > 1 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                    %{Math.round((progress.current / progress.total) * 100)} tamamlandı
                  </div>
                )}
              </div>
              
              {/* Loading Spinner */}
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⏳ Lütfen bekleyin, işlem devam ediyor...
                </p>
              </div>
            </div>
          ) : (
            // Normal State
            <>
              <div className="text-gray-600 dark:text-gray-300 mb-4">
                {message}
              </div>

              {itemCount > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      {itemCount} öğe kalıcı olarak silinecek
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                    Bu işlem geri alınamaz! Silinen veriler kurtarılamaz.
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Dikkat:</strong> Bu işlem tüm ilişkili verileri de silecektir (stok hareketleri, loglar vb.)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{loading ? 'Siliniyor...' : 'Evet, Sil'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
