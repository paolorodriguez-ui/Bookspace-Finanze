import React from 'react';

/**
 * Logo de Bookspace
 * @param {{size?: number; className?: string}} props
 */
const BookspaceLogo = ({ size = 160, className = '' }) => (
  <img
    src="/bookspace-logo.png"
    alt="Bookspace logo"
    width={size}
    className={className}
    style={{ height: 'auto' }}
  />
);

export default BookspaceLogo;
