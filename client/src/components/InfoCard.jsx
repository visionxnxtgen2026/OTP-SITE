import React from 'react';
import { Shield } from 'lucide-react';

export const InfoCard = () => {
  return (
    <div className="flex items-start gap-3.5 p-4 bg-gray-50/80 rounded-dds border border-gray-100 mt-6 select-none">
      <div className="p-1.5 bg-blue-50/50 rounded-lg text-primary mt-0.5">
        <Shield size={16} className="stroke-[2.5]" />
      </div>
      <p className="text-xs text-text-secondary font-medium leading-relaxed">
        We will send a One-Time Password (OTP) to verify your mobile number.
      </p>
    </div>
  );
};

export default InfoCard;
