
import React from 'react';

interface LoaderProps {
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ text = "Generating..." }) => (
  <div className="flex flex-col items-center justify-center space-y-2 text-text-primary-light dark:text-text-primary-dark">
    <div className="w-8 h-8 border-4 border-primary-light dark:border-primary-dark border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm font-medium">{text}</p>
  </div>
);
