import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Imports from the worldwide index
import { countriesList } from '../utils/countries';

export const CustomCountryPicker = ({ selectedIso, onChange, fullMode, minimal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter countries by search keyword
  const filteredCountries = countriesList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search) ||
      c.iso.toLowerCase().includes(search.toLowerCase())
  );

  // Match the active country based on selected ISO code (defaults to first item)
  const activeCountry = 
    countriesList.find((c) => c.iso === selectedIso) || 
    countriesList[0];

  return (
    <div className="relative flex select-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={minimal ? 
          "flex items-center gap-1.5 px-3 py-3 bg-transparent text-[#111827] font-semibold text-xs hover:bg-slate-100/30 transition-colors focus:outline-none rounded-xl" :
          fullMode ? 
          "flex items-center justify-between w-full px-4 py-3.5 bg-transparent text-[#111827] font-bold text-xs hover:bg-slate-100/50 transition-colors focus:outline-none" : 
          "flex items-center gap-1.5 px-4 bg-gray-50 border-r border-gray-250 text-[#111827] font-semibold text-xs rounded-l-xl hover:bg-gray-100 transition-colors focus:outline-none h-full min-h-[46px]"
        }
        aria-label="Select Country Code"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none" role="img" aria-label={activeCountry.name}>
            {activeCountry.flag}
          </span>
          {!minimal && (
            <span className="text-xs font-extrabold tracking-tight text-gray-900">
              {fullMode ? activeCountry.name : activeCountry.code}
            </span>
          )}
        </div>
        <ChevronDown size={11} className="text-gray-400 ml-0.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute left-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-[0_12px_30px_rgba(0,0,0,0.1)] z-50 overflow-hidden ${fullMode ? 'w-full' : 'w-72'}`}
          >
            {/* Search Input Box */}
            <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <Search size={13} className="text-gray-400 ml-2" />
              <input
                type="text"
                placeholder="Search country name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-gray-900 placeholder-gray-400 py-1.5 focus:ring-0"
              />
            </div>
            
            {/* Country List Options */}
            <div className="max-h-56 overflow-y-auto py-1 scrollbar-none">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => (
                  <button
                    key={`${c.iso}-${c.code}`}
                    type="button"
                    onClick={() => {
                      onChange(c); // Returns full object: { name, code, flag, iso }
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span className="text-gray-900 font-bold">{c.name}</span>
                    </div>
                    <span className="text-gray-400 font-extrabold">{c.code}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-xs text-gray-400">
                  No matching countries
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomCountryPicker;
