import React from 'react';
import { Loader2 } from 'lucide-react';

const spinnerVariants = (show) => {
  return show ? 'flex items-center justify-center' : 'hidden';
};

const loaderVariants = (size) => {
  switch (size) {
    case 'small':
      return 'animate-spin text-primary size-6';
    case 'large':
      return 'animate-spin text-primary size-12';
    default:
      return 'animate-spin text-primary size-8';
  }
};

export function Spinner({ size = 'medium', show = true, children, className }) {
  return (
    <span className={`${spinnerVariants(show)}`}>
      <Loader2 className={`${loaderVariants(size)} ${className}`} />
      {children}
    </span>
  );
}
