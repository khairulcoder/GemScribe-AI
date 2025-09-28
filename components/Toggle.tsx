
import React from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, name }) => (
  <label htmlFor={name} className="flex items-center cursor-pointer">
    <div className="relative">
      <input
        type="checkbox"
        id={name}
        name={name}
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary-light dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}></div>
    </div>
    <div className="ml-3 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
      {label}
    </div>
  </label>
);
