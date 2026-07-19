import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Star, Send, CheckCircle2, AlertTriangle,
  Upload, Sparkles, Monitor, HardDrive, Hash, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Feedback = () => {
  const navigate = useNavigate();
  const [formType, setFormType] = useState('general'); // 'general' | 'bug' | 'feature'
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');
  const [fileName, setFileName] = useState('');

  const { register, handleSubmit, reset } = useForm();

  const handleBackToPortal = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const onUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      toast.success(`Selected screenshot: ${file.name}`);
    }
  };

  const onSubmit = (data) => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = formType === 'bug' ? 'BUG' : formType === 'feature' ? 'FTR' : 'FBK';
    setRefId(`${prefix}-${randomId}-2026`);
    setSubmitted(true);
    toast.success('Feedback received!');
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
    setRating(5);
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-[#0d1321] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm border border-slate-150 dark:border-slate-750 shrink-0"
          >
            ← Back to Developer Portal
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-650" size={20} />
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Feedback Portal</h1>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold max-w-sm sm:text-right">Help us improve the developer experience by sharing your ideas.</p>
      </header>

      {/* Main Container */}
      <div className="flex-grow max-w-3xl w-full mx-auto px-6 py-8 flex items-center justify-center">
        <div className="w-full">
          {submitted ? (
            /* SUCCESS VIEW */
            <div className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-md animate-fadeIn max-w-xl mx-auto">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Feedback Submitted Successfully</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Thank you for helping improve DDS. Our team reads every submission.</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm mx-auto text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reference ID</span>
                  <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">{refId}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expected Response</span>
                  <span className="text-xs font-bold text-slate-850 dark:text-slate-300">Within 24 hours</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-blue-650 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  Submit More Feedback
                </button>
              </div>
            </div>
          ) : (
            /* FORM VIEW */
            <div className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
              
              {/* Form Type Tab selectors */}
              <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                {[
                  { type: 'general', label: 'General Feedback', icon: MessageSquare },
                  { type: 'bug', label: 'Bug Report', icon: AlertTriangle },
                  { type: 'feature', label: 'Feature Request', icon: Sparkles }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => { setFormType(item.type); setFileName(''); }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${formType === item.type ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50' : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      <Icon size={13} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                {/* GENERAL FEEDBACK FORM */}
                {formType === 'general' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overall Experience</label>
                      <div className="flex gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star size={24} fill={rating >= star ? 'currentColor' : 'none'} strokeWidth={2} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Feedback Category</label>
                        <select
                          {...register('category')}
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Documentation Improvement">Documentation Improvement</option>
                          <option value="UI / UX Feedback">UI / UX Feedback</option>
                          <option value="Billing Feedback">Billing Feedback</option>
                          <option value="SDK Improvement">SDK Improvement</option>
                          <option value="API Suggestion">API Suggestion</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subject</label>
                        <input
                          {...register('subject', { required: true })}
                          placeholder="Quick summary of your thoughts"
                          required
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Description</label>
                      <textarea
                        {...register('description', { required: true })}
                        placeholder="Tell us what you like, or what we should build next..."
                        rows={5}
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                  </>
                )}

                {/* BUG REPORT FORM */}
                {formType === 'bug' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Issue Title</label>
                      <input
                        {...register('bugTitle', { required: true })}
                        placeholder="e.g. getStatus polls indefinitely on Fastify SDK integration"
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Steps to Reproduce</label>
                      <textarea
                        {...register('steps')}
                        placeholder="1. Call requestAuth()&#10;2. Open mobile app...&#10;3. Tap Approve but console shows timeout"
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expected Behaviour</label>
                        <input
                          {...register('expected')}
                          placeholder="Expected output"
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actual Behaviour</label>
                        <input
                          {...register('actual')}
                          placeholder="Actual failure details"
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1"><Monitor size={10} /> Browser</label>
                        <input {...register('browser')} placeholder="Chrome 120" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-650" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1"><HardDrive size={10} /> OS</label>
                        <input {...register('os')} placeholder="Windows 11" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-650" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1"><Hash size={10} /> SDK Version</label>
                        <input {...register('sdk')} placeholder="v2.0.0" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-650" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1"><Hash size={10} /> App ID</label>
                        <input {...register('appId')} placeholder="app_xxxx" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-650" />
                      </div>
                    </div>
                  </>
                )}

                {/* FEATURE REQUEST FORM */}
                {formType === 'feature' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Feature Title</label>
                      <input
                        {...register('featureTitle', { required: true })}
                        placeholder="e.g. Python SDK Client Library"
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Description</label>
                      <textarea
                        {...register('featureDesc', { required: true })}
                        placeholder="What should this feature do? Describe its behavior..."
                        rows={4}
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Business Use Case</label>
                        <input
                          {...register('useCase')}
                          placeholder="e.g. Replaces Auth0 for internal engineering portals"
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</label>
                        <select
                          {...register('priority')}
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-650 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-205"
                        >
                          <option value="low">Low (Nice to have)</option>
                          <option value="medium">Medium (Improves developer flow)</option>
                          <option value="high">High (Required for launch)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* ATTACH SCREENSHOT (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attach Screenshot (Optional)</label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative cursor-pointer group flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1.5 pointer-events-none flex flex-col items-center">
                      <Upload size={20} className="text-slate-400 group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors" />
                      <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                        {fileName ? (
                          <span className="text-slate-900 dark:text-white font-bold">{fileName}</span>
                        ) : (
                          <span>Drag & drop or click to upload screenshot</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">PNG, JPG, or WEBP up to 5MB</p>
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-3 bg-blue-655 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    <Send size={12} />
                    <span>Submit Feedback</span>
                  </button>
                </div>

              </form>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;
