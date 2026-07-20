import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { Phone, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '../services/firebase';
import api from '../services/api';
import { useDevStore } from '../store/devStore';
import { detectUserCountryAsync, countriesList } from '../utils/countries';
import CustomCountryPicker from '../components/CustomCountryPicker';
import { cleanPhoneInput } from '../utils/formatting';

export const Onboarding = () => {
  const navigate = useNavigate();
  const { developer, updateDeveloper } = useDevStore();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(null);
  const [isDetectingCountry, setIsDetectingCountry] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [validation, setValidation] = useState({ isValid: false, message: '' });
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  // Redirect if already verified — depend only on the boolean primitive,
  // not the entire developer object (which creates new references on each Zustand rehydration)
  useEffect(() => {
    if (developer?.mobileVerified) navigate('/dashboard');
  }, [developer?.mobileVerified, navigate]);

  // Detect user locale on initial mount
  useEffect(() => {
    const detect = async () => {
      setIsDetectingCountry(true);
      try {
        const detected = await detectUserCountryAsync();
        setCountry(detected);
      } catch (err) {
        console.error('Failed to detect country:', err);
      } finally {
        setIsDetectingCountry(false);
      }
    };
    detect();
  }, []);

  // Validate the phone number dynamically using libphonenumber-js or strict Indian mobile rules
  useEffect(() => {
    if (!country) {
      setValidation({ isValid: false, message: '' });
      return;
    }
    const cleanNumber = cleanPhoneInput(phone);
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
  }, [phone, country]);

  // Handle selected country changes
  const handleCountryChange = (selected) => {
    setCountry(selected);
    if (phone) {
      const cleanVal = cleanPhoneInput(phone);
      const formatted = new AsYouType(selected.iso).input(cleanVal);
      setPhone(formatted);
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
      if (testVal.startsWith('+') && country) {
        const parsed = parsePhoneNumberFromString(testVal);
        if (parsed && parsed.country) {
          const matchedCountry = countriesList.find((c) => c.iso === parsed.country);
          if (matchedCountry) {
            setCountry(matchedCountry);
            const national = parsed.nationalNumber;
            setPhone(new AsYouType(matchedCountry.iso).input(national));
            return;
          }
        }
      }
      
      // 2. Fallback: Parse or clean digits and format as you type under selected country
      const cleanVal = cleanPhoneInput(rawVal);
      const formatted = new AsYouType(country ? country.iso : 'IN').input(cleanVal);
      setPhone(formatted);

    } catch (err) {
      console.warn('[Autofill Phone Parse Warning]', err.message);
      const cleanVal = cleanPhoneInput(rawVal);
      const formatted = new AsYouType(country ? country.iso : 'IN').input(cleanVal);
      setPhone(formatted);
    }
  };

  const setupRecaptcha = () => {
    if (!window.devRecaptchaVerifier) {
      window.devRecaptchaVerifier = new RecaptchaVerifier(auth, 'dev-recaptcha', {
        size: 'invisible'
      });
    }
  };

  const handleSendOtp = async () => {
    if (!country) return;
    let rawNumber = cleanPhoneInput(phone);
    if (rawNumber.startsWith('0')) {
      rawNumber = rawNumber.slice(1);
    }
    const fullNumber = `${country.code}${rawNumber}`;

    if (!auth) {
      toast.error('Firebase is not configured.');
      return;
    }

    setIsLoading(true);
    const tid = toast.loading('Sending verification code...');
    try {
      setupRecaptcha();
      const conf = await signInWithPhoneNumber(auth, fullNumber, window.devRecaptchaVerifier);
      setConfirmation(conf);
      setStep('otp');
      toast.success('Code sent!', { id: tid });
    } catch (err) {
      toast.error(err.message || 'Failed to send code.', { id: tid });
      if (window.devRecaptchaVerifier) {
        window.devRecaptchaVerifier.clear();
        window.devRecaptchaVerifier = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Enter the 6-digit code.');
      return;
    }
    if (!country) return;
    setIsLoading(true);
    const tid = toast.loading('Verifying...');
    try {
      await confirmation.confirm(otp);
      let rawNumber = cleanPhoneInput(phone);
      if (rawNumber.startsWith('0')) {
        rawNumber = rawNumber.slice(1);
      }
      const fullNumber = `${country.code}${rawNumber}`;

      // Link phone to developer account
      await api.post('/api/dev/auth/verify-phone', {
        phoneNumber: fullNumber,
        countryCode: country.code,
        countryISO: country.iso,
        countryName: country.name
      });

      updateDeveloper({ mobileVerified: true, phoneNumber: fullNumber });
      toast.success('Mobile verified! Welcome to DDS Developers.', { id: tid });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification failed.';
      toast.error(msg, { id: tid });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div id="dev-recaptcha" />
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Phone size={18} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Verify your mobile number</h1>
          <p className="text-sm text-gray-500">
            {step === 'phone'
              ? 'A verified mobile number is required to access your developer account.'
              : 'Enter the 6-digit code sent to your phone.'}
          </p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</label>
              
              <div 
                className={`w-full flex items-center border rounded-xl transition-all duration-200 bg-white ${
                  isFocused ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'
                }`}
              >
                {isDetectingCountry || !country ? (
                  <div className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 select-none">
                    <Loader2 size={12} className="animate-spin text-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Detecting...</span>
                  </div>
                ) : (
                  <>
                    <CustomCountryPicker
                      selectedIso={country.iso}
                      onChange={handleCountryChange}
                      minimal={true}
                    />
                    <span className="text-sm font-medium text-gray-900 pr-3 select-none">
                      {country.code}
                    </span>
                  </>
                )}

                <div className="h-6 w-[1px] bg-gray-200" />

                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="98765 43210"
                  autoComplete="tel"
                  className="flex-grow px-3 py-3 bg-transparent text-sm font-medium text-gray-900 outline-none w-full"
                />
              </div>

              {phone && !validation.isValid && (
                <p className="text-[10px] font-bold text-red-500 pl-1 mt-1">
                  {validation.message}
                </p>
              )}
            </div>
            <button
              onClick={handleSendOtp}
              disabled={isLoading || !validation.isValid || isDetectingCountry}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-all"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              Send Verification Code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">6-Digit Code</label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="483921"
                autoComplete="one-time-code"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono text-xl tracking-[0.4em] text-center"
              />
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-all"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              Verify & Continue
            </button>
            <button onClick={() => setStep('phone')} className="w-full text-xs text-gray-400 hover:text-gray-600">
              ← Change number
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
