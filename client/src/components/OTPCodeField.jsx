import React, { useState, useRef, useEffect } from 'react';

export const OTPCodeField = ({ disabled, onComplete }) => {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const inputRefs = useRef([]);

  // Auto-focus the first slot on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Monitor OTP completion to auto-submit
  useEffect(() => {
    const code = digits.join('');
    if (code.length === 6 && /^\d+$/.test(code)) {
      onComplete(code);
    }
  }, [digits, onComplete]);

  // Handle single digit input
  const handleChange = (e, index) => {
    const value = e.target.value;
    
    // We only want the last character to handle fast typing/overwrite
    const lastChar = value.slice(-1);
    
    if (lastChar && !/^\d$/.test(lastChar)) {
      return; // Reject non-numeric inputs
    }

    const updatedDigits = [...digits];
    updatedDigits[index] = lastChar;
    setDigits(updatedDigits);

    // Focus next box if current slot is filled
    if (lastChar && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle key triggers (Backspace, Arrow keys)
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Clear previous cell and focus it
        const updatedDigits = [...digits];
        updatedDigits[index - 1] = '';
        setDigits(updatedDigits);
        inputRefs.current[index - 1].focus();
      } else {
        // Clear current cell
        const updatedDigits = [...digits];
        updatedDigits[index] = '';
        setDigits(updatedDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle clipboard paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    
    // If it's a 6-digit number, parse and distribute it
    if (/^\d{6}$/.test(pastedText)) {
      const splitDigits = pastedText.split('');
      setDigits(splitDigits);
      // Focus on the last element
      inputRefs.current[5].focus();
    }
  };

  return (
    <div className="flex justify-between items-center gap-2.5 my-8">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold text-text-primary bg-white border border-gray-200 rounded-xl outline-none shadow-soft transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-gray-50 disabled:text-gray-400"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default OTPCodeField;
