
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300">
    <p className="font-bold">Error</p>
    <p>{message}</p>
  </div>
);
