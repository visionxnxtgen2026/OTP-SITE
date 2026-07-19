import React from 'react';
import { Lock } from 'lucide-react';

export const Footer = () => {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 text-gray-400 text-[11px] font-semibold uppercase tracking-wider select-none">
      <Lock size={11} className="stroke-[2.5] text-gray-400" />
      <span>Your data is secure with DDS</span>
    </div>
  );
};

export default Footer;
