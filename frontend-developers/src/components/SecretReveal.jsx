import React, { useState } from 'react';
import { Copy, Check, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';

/**
 * One-time secret reveal modal.
 * The raw secret is shown exactly once after key generation.
 * After closing, only the secretPreview (masked) is ever shown.
 */
export const SecretReveal = ({ data, onClose }) => {
  const [copied, setCopied] = useState({ pub: false, sec: false });
  const [secretVisible, setSecretVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
    });
  };

  const handleClose = () => {
    if (!confirmed) {
      if (!window.confirm('Have you copied your secret key? It will never be shown again.')) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">API Key Generated</h3>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-bold text-amber-600">{data.keyLabel}</span>
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Warning banner */}
        <div className="mx-6 mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-amber-800">Copy your Secret Key now</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This is the only time your secret key will be displayed. It cannot be recovered after you close this dialog.
            </p>
          </div>
        </div>

        {/* Keys */}
        <div className="p-6 space-y-4">
          {/* Public Key */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Public Key</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <code className="flex-1 text-xs text-gray-600 font-mono break-all">{data.publicKey}</code>
              <button
                onClick={() => handleCopy(data.publicKey, 'pub')}
                className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {copied.pub ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Secret Key */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Secret Key</label>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <code className={`flex-1 text-xs font-mono break-all ${secretVisible ? 'text-gray-800' : 'blur-sm select-none text-gray-800'}`}>
                {data.rawSecret}
              </code>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setSecretVisible(!secretVisible)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title={secretVisible ? 'Hide secret' : 'Reveal secret'}
                >
                  {secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => handleCopy(data.rawSecret, 'sec')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {copied.sec ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer confirmation */}
        <div className="px-6 pb-6">
          <label className="flex items-start gap-2.5 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-blue-600"
            />
            <span className="text-xs text-gray-600">
              I have copied my secret key and understand it will not be shown again.
            </span>
          </label>
          <button
            onClick={() => { if (confirmed) onClose(); else alert('Please confirm you have copied the secret key.'); }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all"
          >
            I've saved my key — Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecretReveal;
