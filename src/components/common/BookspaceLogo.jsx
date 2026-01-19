import React from 'react';

/**
 * Logo de Bookspace
 * @param {number} size - Tamaño del logo
 */
const BookspaceLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="bookspaceGradient" x1="16" y1="10" x2="104" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4f67eb" />
        <stop offset="1" stopColor="#2a1d89" />
      </linearGradient>
    </defs>
    <rect x="10" y="18" width="100" height="92" rx="18" stroke="url(#bookspaceGradient)" strokeWidth="8" />
    <rect x="30" y="6" width="16" height="24" rx="6" fill="url(#bookspaceGradient)" />
    <rect x="52" y="6" width="16" height="24" rx="6" fill="url(#bookspaceGradient)" />
    <rect x="74" y="6" width="16" height="24" rx="6" fill="url(#bookspaceGradient)" />
    <rect x="30" y="46" width="34" height="34" rx="10" fill="#4f67eb" />
    <rect x="70" y="46" width="24" height="24" rx="8" fill="#2a1d89" />
    <rect x="30" y="78" width="20" height="20" rx="8" fill="#2a1d89" />
    <rect x="50" y="70" width="44" height="28" rx="12" fill="#4f67eb" />
  </svg>
);

export default BookspaceLogo;
