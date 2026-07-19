import React from 'react';
import logo from '../assets/logo.svg';

export const Header = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col items-center text-center select-none">
      {/* Branding Logo & Text */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <img src={logo} alt="DDS Logo" className="w-10 h-10 object-contain" />
        <span className="font-bold text-2xl tracking-wider text-[#111827]">DDS</span>
      </div>
      
      {/* Heading Text */}
      <h1 className="text-2xl font-bold tracking-tight text-[#111827] mb-1.5">{title}</h1>
      <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
    </div>
  );
};

export default Header;
