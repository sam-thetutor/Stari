import React from 'react';

export function Button({ className, variant = 'default', children, ...props }) {
  return (
    <button 
      className={className}
      {...props}
    >
      {children}
    </button>
  );
} 