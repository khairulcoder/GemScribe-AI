
import React from 'react';

interface SelectorProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  name: string;
}

export const Selector: React.FC<SelectorProps> = ({ label, value, onChange, options, name }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
      {label}
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);
