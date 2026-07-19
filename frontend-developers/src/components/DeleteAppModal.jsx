import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

/**
 * Enterprise SaaS Delete Application Modal.
 * Guaranteed fixed header, fixed footer, scrollable body (max-height 85vh),
 * backdrop click close, ESC key close, and responsive width.
 */
export const DeleteAppModal = ({ isOpen, onClose, app, onSuccess }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Keyboard shortcut listener for ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !app) return null;

  const appName = app.applicationName || 'Cartify';
  const appId = app.applicationId || 'app_fdcea04877b64fa3b767';
  const environment = app.environment || 'Production';
  const status = app.status || 'active';

  // Case-sensitive exact match validation
  const isConfirmed = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/dev/apps/${appId}`);
      toast.success('✓ Application deleted successfully.');
      onClose();
      if (onSuccess) {
        onSuccess(appId);
      }
    } catch (err) {
      toast.error('Unable to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-[680px] md:max-w-[560px] sm:max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200 my-auto">
        
        {/* ── FIXED HEADER (Never Scrolls) ────────────────────────────────────── */}
        <div className="shrink-0 p-6 sm:px-7 sm:py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Delete Application</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                This action permanently removes your application and all associated credentials.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── SCROLLABLE BODY (Only Content Section Scrolls) ──────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          
          {/* APPLICATION INFORMATION (Two-Column Layout) */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-4.5 sm:p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Application Name</span>
                <span className="text-sm font-black text-gray-900 mt-0.5 block">{appName}</span>
              </div>

              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Application ID</span>
                <code className="text-xs font-mono font-bold text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded inline-block mt-0.5 truncate max-w-full">
                  {appId}
                </code>
              </div>

              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Environment</span>
                <span className="text-xs font-bold text-gray-700 bg-gray-200/60 px-2 py-0.5 rounded inline-block mt-0.5 capitalize">
                  {environment}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700 capitalize">{status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* WARNING SECTION */}
          <div className="bg-red-50/60 border border-red-200/70 rounded-xl p-4.5 sm:p-5 space-y-2.5">
            <h4 className="text-xs font-black text-red-900 uppercase tracking-wider">
              Warning
            </h4>
            <p className="text-xs text-red-800 font-medium">
              Deleting this application will permanently revoke:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5 text-xs text-red-700 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">•</span> Application ID
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">•</span> Public API Key
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">•</span> Secret API Key
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">•</span> Future DDS authentication access
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">•</span> Application configuration
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">•</span> Analytics associated with this app
              </div>
            </div>
            <p className="text-[11px] font-bold text-red-900 pt-1">
              This action cannot be undone.
            </p>
          </div>

          {/* CONFIRMATION SECTION */}
          <div className="space-y-2.5">
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Confirmation Required
              </h4>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                To confirm deletion, type <span className="font-mono font-black bg-gray-100 px-1.5 py-0.5 rounded text-red-600 border border-gray-200">DELETE</span> exactly.
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              disabled={isDeleting}
              className="w-full px-4 py-3 text-sm font-mono font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 bg-white"
            />
          </div>

        </div>

        {/* ── FIXED FOOTER (Never Scrolls, Always Visible) ───────────────────── */}
        <div className="shrink-0 p-5 sm:px-7 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-white hover:border-gray-300 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isConfirmed && !isDeleting
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-[0.98]'
                : 'bg-red-200 text-red-400 cursor-not-allowed border border-transparent'
            }`}
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            {isDeleting ? 'Deleting Application...' : 'Delete Application'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeleteAppModal;
