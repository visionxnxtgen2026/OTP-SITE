import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { ArrowLeft, Loader2, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Local Services, Stores & Helpers
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/authStore';
import { cleanPhoneInput } from '../utils/formatting';
import { detectUserCountry, countriesList } from '../utils/countries';
import CustomCountryPicker from '../components/CustomCountryPicker';

export const VerifyMobile = () => {
  const navigate = useNavigate();
  const { tempVerificationCountry, setTempVerificationData } = useAuthStore();
  
  // Custom states
  const [country, setCountry] = useState(tempVerificationCountry);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [validation, setValidation] = useState({ isValid: false, message: '' });

  const {
    register,
    handleSubmit,
    setValue,
    watch
  } = useForm({
    defaultValues: {
      phone: ''
    }
  });

  const phoneValue = watch('phone');

  // Detect user locale on initial mount
  useEffect(() => {
    if (!tempVerificationCountry || tempVerificationCountry.iso === 'US') {
      const detected = detectUserCountry();
      setCountry(detected);
      setTempVerificationData({ country: detected });
    }
  }, []);

  // Validate the phone number dynamically using libphonenumber-js or strict Indian mobile rules
  useEffect(() => {
    const cleanNumber = cleanPhoneInput(phoneValue || '');
    if (!cleanNumber) {
      setValidation({ isValid: false, message: '' });
      return;
    }

    // 1. Strict validation rule for India
    if (country.iso === 'IN') {
      if (cleanNumber.length !== 10 || !/^[6-9]/.test(cleanNumber)) {
        setValidation({ isValid: false, message: 'Please enter a valid mobile number.' });
        return;
      }
      setValidation({ isValid: true, message: '✔ Valid Number' });
      return;
    }

    // 2. International standard validation using libphonenumber-js
    try {
      const parsed = parsePhoneNumberFromString(cleanNumber, country.iso);
      if (parsed && parsed.isValid()) {
        setValidation({ isValid: true, message: '✔ Valid Number' });
      } else {
        setValidation({ isValid: false, message: 'Please enter a valid mobile number.' });
      }
    } catch (err) {
      setValidation({ isValid: false, message: 'Please enter a valid mobile number.' });
    }
  }, [phoneValue, country]);

  // Handle selected country changes
  const handleCountryChange = (selected) => {
    setCountry(selected);
    setTempVerificationData({ country: selected });
    
    // Format existing input value according to new country convention
    if (phoneValue) {
      const cleanVal = cleanPhoneInput(phoneValue);
      const formatted = new AsYouType(selected.iso).input(cleanVal);
      setValue('phone', formatted);
    }
  };

  // Parse phone number dynamically on changes, pastes, and browser autofills
  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    let testVal = rawVal.trim();

    // Standardize 00 prefix to + prefix for international resolution
    if (testVal.startsWith('00')) {
      testVal = '+' + testVal.slice(2);
    }

    try {
      // 1. Attempt international parse if it starts with a plus code prefix
      if (testVal.startsWith('+')) {
        const parsed = parsePhoneNumberFromString(testVal);
        if (parsed && parsed.country) {
          const matchedCountry = countriesList.find((c) => c.iso === parsed.country);
          if (matchedCountry) {
            setCountry(matchedCountry);
            setTempVerificationData({ country: matchedCountry });
            
            // Output only national numbers into field input (strip calling prefix)
            const national = parsed.nationalNumber;
            setValue('phone', national);
            return;
          }
        }
      }
      
      // 2. Fallback: Parse or clean digits and format as you type under selected country
      const cleanVal = cleanPhoneInput(rawVal);
      const formatted = new AsYouType(country.iso).input(cleanVal);
      setValue('phone', formatted);

    } catch (err) {
      console.warn('[Autofill Phone Parse Warning]', err.message);
      const cleanVal = cleanPhoneInput(rawVal);
      const formatted = new AsYouType(country.iso).input(cleanVal);
      setValue('phone', formatted);
    }
  };

  const setupInvisibleRecaptcha = () => {
    if (window.recaptchaVerifier) return;
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'page-recaptcha-container', {
        size: 'invisible'
      });
    } catch (err) {
      console.error('[Recaptcha Init Error]', err);
      toast.error('reCAPTCHA initialization failed. Please reload.');
    }
  };

  // Submit and send verification code
  const handleSendOtp = async (data) => {
    if (!auth) {
      toast.error('Firebase Auth is not configured. OTP verification failed.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Sending verification code...');

    try {
      setupInvisibleRecaptcha();
      const verifier = window.recaptchaVerifier;

      let rawNumber = cleanPhoneInput(data.phone);
      if (rawNumber.startsWith('0')) {
        rawNumber = rawNumber.slice(1);
      }
      const internationalNumber = `${country.code}${rawNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, internationalNumber, verifier);
      
      setTempVerificationData({
        phone: internationalNumber,
        confirmationResult: confirmation
      });

      toast.success('Verification code sent!', { id: toastId });
      navigate('/verify-mobile/otp');
    } catch (err) {
      console.error('[Send OTP Error]', err);
      toast.error(err.message || 'Failed to send OTP. Try again.', { id: toastId });
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isContinueEnabled = validation.isValid && !!country && !!auth && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col min-h-screen bg-[#F8FAFC] relative overflow-hidden animate-page-transition"
    >
      {/* Invisible Recaptcha container */}
      <div id="page-recaptcha-container" />

      {/* Main Container Chassis (Centered, 430px max width for mobile design) */}
      <div className="flex-grow w-full max-w-[430px] mx-auto px-6 py-6 flex flex-col justify-between select-none">
        
        {/* Header Back Button */}
        <div className="flex justify-start">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white border border-gray-150 rounded-full flex items-center justify-center text-text-primary shadow-soft hover:bg-slate-50 transition-colors focus:outline-none"
            aria-label="Go Back"
          >
            <ArrowLeft size={16} className="stroke-[2.5]" />
          </motion.button>
        </div>

        {/* Hero Details Header */}
        <div className="space-y-3.5 pt-6 text-left">
          <h1 className="text-3xl font-black text-[#111827] tracking-tight leading-[1.15] whitespace-pre-line">
            Verify your{"\n"}mobile number
          </h1>
          <p className="text-xs font-semibold text-text-secondary leading-relaxed max-w-[310px]">
            We'll securely verify your mobile number using Firebase Authentication. A one-time verification code will be sent to your device.
          </p>
        </div>

        {/* Input Card Container */}
        <div className="space-y-5 pt-8 flex-grow">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mobile number</label>
            
            {/* White floating card wrapper */}
            <div 
              className={`bg-white border rounded-[22px] p-2 flex items-center shadow-[0_12px_30px_rgba(0,0,0,0.02)] transition-all duration-200 ${
                isFocused ? 'border-primary ring-4 ring-blue-500/10' : 'border-gray-200'
              }`}
            >
              {/* Minimal Flag selector (only flag + Chevron down) */}
              <CustomCountryPicker
                selectedIso={country.iso}
                onChange={handleCountryChange}
                minimal={true}
              />

              {/* Read-only dialed code */}
              <span className="text-xs font-extrabold text-[#111827] pl-1.5 pr-3 select-none">
                {country.code}
              </span>

              {/* Vertical line divider */}
              <div className="h-6 w-[1px] bg-gray-250/70" />

              {/* Phone text input with native autofill/autocomplete triggers */}
              <input
                type="tel"
                autoComplete="tel"
                name="phone"
                id="phone"
                placeholder="98765 43210"
                disabled={isLoading}
                {...register('phone')}
                onChange={handlePhoneChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-grow bg-transparent text-sm font-bold text-text-primary px-3 outline-none placeholder-gray-300 w-full"
              />

              {/* Inline dynamic checkmark */}
              <AnimatePresence>
                {phoneValue && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    exit={{ scale: 0 }}
                    className="shrink-0 mr-2"
                  >
                    {validation.isValid ? (
                      <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center shadow-soft">
                        <Check size={11} className="stroke-[3.5]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100">
                        <span className="text-[10px] font-black leading-none">!</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error status notice */}
            {phoneValue && !validation.isValid && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] font-bold text-red-500 pl-1 mt-1 animate-pulse"
              >
                {validation.message}
              </motion.p>
            )}
          </div>

          {/* Large Gradient Submit button */}
          <div className="pt-2">
            <motion.button
              type="button"
              onClick={handleSubmit(handleSendOtp)}
              disabled={!isContinueEnabled}
              whileTap={{ scale: isContinueEnabled ? 0.98 : 1 }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-150 disabled:to-gray-150 disabled:text-gray-400 disabled:shadow-none text-white font-extrabold text-xs h-14 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_-8px_rgba(37,99,235,0.45)] focus:outline-none"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sending verification code...</span>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <span>Send OTP</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </div>
              )}
            </motion.button>
          </div>
        </div>

        {/* Sticky bottom information sections */}
        <div className="space-y-6 pt-6">
          
          {/* Subtle light-blue card */}
          <div className="bg-blue-50/50 border border-blue-100/30 rounded-[18px] p-4 flex gap-3 text-left">
            <ShieldCheck size={18} className="text-primary stroke-[2] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider">Protected with Firebase Authentication</h4>
              <p className="text-[9px] font-semibold text-text-secondary leading-relaxed">
                Your phone number is encrypted and securely verified before being linked to your DDS Identity.
              </p>
            </div>
          </div>

          {/* Terms & Privacy */}
          <p className="text-[9px] font-bold text-gray-400 text-center leading-relaxed max-w-[280px] mx-auto">
            By continuing, you agree to the DDS identity verification process, terms of use, and privacy statements.
          </p>
        </div>

      </div>
    </motion.div>
  );
};

export default VerifyMobile;
