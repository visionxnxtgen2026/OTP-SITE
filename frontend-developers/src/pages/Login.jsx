import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';
import { useDevStore } from '../store/devStore';

export const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useDevStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and register
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  const handleGoogleLogin = async () => {
    // If sign up view, ensure they checked the terms checkbox
    if (isSignUp && !agreedToTerms) {
      setShowValidationError(true);
      toast.error('You must accept the Terms & Conditions and Privacy Policy to continue.');
      return;
    }

    if (!auth) {
      toast.error('Firebase is not configured. Check your .env file.');
      return;
    }
    
    setIsLoading(true);
    const toastId = toast.loading(isSignUp ? 'Creating your account...' : 'Signing in with Google...');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await api.post('/api/dev/auth/google-login', { idToken });
      const { token, developer: devData } = res.data;

      setAuth(devData, token);
      toast.success(`Welcome, ${devData.displayName?.split(' ')[0]}!`, { id: toastId });

      if (!devData.mobileVerified) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[Login Error]', err);
      toast.error(err.response?.data?.message || 'Authentication failed. Please try again.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setAgreedToTerms(checked);
    if (checked) {
      setShowValidationError(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="flex flex-1">
        {/* Left brand panel */}
        <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-indigo-600" />
          <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span className="text-white font-black text-lg tracking-tight">DDS Developers</span>
          </div>

          <div className="space-y-6 relative z-10">
            <h1 className="text-4xl font-black text-white leading-tight">
              Build with the<br />DDS Identity API
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
              Integrate secure phone-based authentication into your applications. Manage API keys, monitor usage, and scale with confidence.
            </p>
            <div className="space-y-3 pt-2">
              {[
                'Cryptographically secure API keys',
                'Real-time usage analytics',
                'Pay-as-you-go billing with Stripe',
                '7-day invoice payment grace period'
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-blue-100 text-sm">
                  <ShieldCheck size={15} className="text-blue-300 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-blue-300/80 text-xs relative z-10 font-semibold">© 2026 DDS Identity Platform</p>
        </div>

        {/* Right login panel */}
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 lg:hidden mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap size={15} className="text-white fill-white" />
                </div>
                <span className="font-black text-slate-900">DDS Developers</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                {isSignUp ? 'Create your developer account' : 'Sign in to your account'}
              </h2>
              <p className="text-xs text-slate-500">
                {isSignUp 
                  ? 'Get started with DDS push authentication and secure key credentials.' 
                  : 'Access your developer dashboard, API configurations, and billing settings.'}
              </p>
            </div>

            {isSignUp && (
              <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={agreedToTerms}
                    onChange={handleCheckboxChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs text-slate-600 leading-normal font-medium select-none cursor-pointer">
                    I have read and agree to the{' '}
                    <a href="/legal/terms-and-conditions.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">
                      Terms & Conditions
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">
                      Privacy Policy
                    </a>.
                  </label>
                </div>
                {showValidationError && (
                  <p className="text-[11px] text-red-500 font-bold">
                    You must accept the Terms & Conditions and Privacy Policy to continue.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading || (isSignUp && !agreedToTerms)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                )}
                <span>{isLoading ? 'Processing...' : isSignUp ? 'Register with Google' : 'Continue with Google'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAgreedToTerms(false);
                    setShowValidationError(false);
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'New to DDS? Create an account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer containing the requested legal links */}
      <footer className="border-t border-slate-200 bg-white py-6 px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
        <div className="text-slate-400 font-medium">
          &copy; 2026 DDS Authentication Platform &bull; v2.0.0
        </div>
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <a href="/legal/privacy-policy.html" className="text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</a>
          <a href="/legal/terms-and-conditions.html" className="text-slate-500 hover:text-blue-600 transition-colors">Terms & Conditions</a>
          <a href="/legal/about-dds.html" className="text-slate-500 hover:text-blue-600 transition-colors">About DDS</a>
          <a href="mailto:support@dds.com" className="text-slate-500 hover:text-blue-600 transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
};

export default Login;
