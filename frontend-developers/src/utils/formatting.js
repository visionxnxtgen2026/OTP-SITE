/**
 * Formats a raw digit string to a user-friendly format (e.g., 9876543210 -> 98765 43210)
 * @param {String} value - Raw digit string
 * @returns {String} Formatted string
 */
export const formatPhoneInput = (value) => {
  if (!value) return '';
  
  // Keep only digits
  const clean = value.replace(/\D/g, '');
  
  // Group as XXXXX XXXXX (Apple/Fintech minimal aesthetic)
  if (clean.length <= 5) {
    return clean;
  } else {
    return `${clean.slice(0, 5)} ${clean.slice(5, 10)}`;
  }
};

/**
 * Remove spacing and return raw digits
 */
export const cleanPhoneInput = (value) => {
  return value.replace(/\D/g, '');
};
