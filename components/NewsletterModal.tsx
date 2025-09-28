import React, { useState, useEffect } from 'react';
import { Loader } from './Loader';
import { CheckIcon } from './icons/CheckIcon';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
}

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export const NewsletterModal: React.FC<NewsletterModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('Something went wrong. Please try again in a moment.');


  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow for closing animation
      const timer = setTimeout(() => {
        setName('');
        setEmail('');
        setStatus('idle');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && status !== 'submitting') {
      setStatus('submitting');
      const result = await onSubmit({ name, email });
      if (result.success) {
        setStatus('success');
        setTimeout(() => {
          onClose();
        }, 2000); // Close modal after 2 seconds
      } else {
        setErrorMessage(result.message || 'An unknown error occurred. Please try again.');
        setStatus('error');
      }
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'submitting':
        return <Loader text="Submitting..." />;
      case 'success':
        return (
          <div className="text-center">
            <CheckIcon className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Thank You!</h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark">You've been subscribed.</p>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
             <h2 className="text-2xl font-bold text-red-500 mb-2">Submission Failed</h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
                {errorMessage}
            </p>
            <button 
                onClick={() => setStatus('idle')}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-light dark:bg-primary-dark hover:opacity-90"
            >
                Try Again
            </button>
          </div>
        );
      case 'idle':
      default:
        return (
          <>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">Join Our Newsletter!</h2>
                <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">
                    You're doing great work! Get updates on new features and exclusive content.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newsletter-name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Name</label>
                <input type="text" id="newsletter-name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark" placeholder="Your Name" />
              </div>
              <div>
                <label htmlFor="newsletter-email" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Email</label>
                <input type="email" id="newsletter-email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark" placeholder="you@example.com" />
              </div>
              <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-light dark:bg-primary-dark hover:opacity-90 disabled:opacity-50 transition-opacity">Send</button>
            </form>
          </>
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={status === 'idle' || status === 'error' ? onClose : undefined}></div>
      <div className={`bg-background-light dark:bg-background-dark rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md relative transition-transform duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {(status === 'idle' || status === 'error') && (
          <button onClick={onClose} className="absolute top-3 right-3 text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark text-2xl font-bold leading-none" aria-label="Close">&times;</button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};