
import React, { useState, useEffect } from 'react';
import type { ContentGenerationParams, Template } from '../types';
import { CONTENT_TYPES, TONES, COUNTRIES, STAR_RATINGS, OCCASIONS, CONTENT_LENGTHS } from '../constants/constants';
import { TEMPLATES } from '../constants/templates';
import { Selector } from './Selector';
import { Toggle } from './Toggle';
import { SparklesIcon } from './icons/SparklesIcon';

interface ContentFormProps {
  onSubmit: (params: ContentGenerationParams) => void;
  isLoading: boolean;
  initialParams?: ContentGenerationParams;
}

const defaultParams: ContentGenerationParams = {
  productName: '',
  contentType: CONTENT_TYPES[0],
  country: COUNTRIES[0],
  tone: TONES[0],
  contentLength: CONTENT_LENGTHS[0],
  brandVoice: '',
  generateAbTest: false,
  generateSocialPost: false,
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const ContentForm: React.FC<ContentFormProps> = ({ onSubmit, isLoading, initialParams }) => {
  const [params, setParams] = useState<ContentGenerationParams>(initialParams || defaultParams);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (initialParams) {
      setParams(initialParams);
      if (initialParams.productImage) {
        setImagePreview(`data:${initialParams.productImage.mimeType};base64,${initialParams.productImage.base64}`);
      } else {
        setImagePreview(null);
      }
    }
  }, [initialParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  };
  
  const handleToggle = (name: keyof ContentGenerationParams, checked: boolean) => {
    setParams(prev => ({ ...prev, [name]: checked }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    const selectedTemplate = TEMPLATES.find(t => t.name === templateName);
    if (selectedTemplate) {
      setParams(prev => ({ ...prev, ...selectedTemplate.params }));
    }
  };
  
  const processFile = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        setParams(prev => ({
            ...prev,
            productImage: { base64, mimeType: file.type }
        }));
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="template" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Use a Template</label>
        <select id="template" onChange={handleTemplateChange} className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark">
          <option value="">-- Select a Template --</option>
          {TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="productName" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Product Name / Link</label>
        <input type="text" name="productName" id="productName" value={params.productName} onChange={handleChange} required className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Selector label="Content Type" name="contentType" value={params.contentType} onChange={handleChange} options={CONTENT_TYPES} />
        <Selector label="Content Length" name="contentLength" value={params.contentLength || CONTENT_LENGTHS[0]} onChange={handleChange} options={CONTENT_LENGTHS} />
        <Selector label="Country" name="country" value={params.country} onChange={handleChange} options={COUNTRIES} />
        <Selector label="Tone" name="tone" value={params.tone} onChange={handleChange} options={TONES} />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Product Image (Optional)</label>
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-1 flex justify-center items-center p-4 border-2 border-dashed rounded-md transition-colors ${isDraggingOver ? 'border-primary-light dark:border-primary-dark bg-accent-light/10' : 'border-gray-300 dark:border-gray-600'}`}
        >
            <div className="flex items-center space-x-4 text-center">
                {imagePreview ? (
                     <img src={imagePreview} alt="Product preview" className="h-20 w-20 object-cover rounded-md" />
                ) : (
                    <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        <p>Drag & drop an image here</p>
                        <p className="font-semibold">or</p>
                    </div>
                )}
                <label htmlFor="file-upload" className="cursor-pointer bg-white dark:bg-gray-700 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-light">
                    <span>Upload an image</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                </label>
            </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <Toggle label="Generate A/B Test Variant" name="generateAbTest" checked={params.generateAbTest} onChange={(c) => handleToggle('generateAbTest', c)} />
        <Toggle label="Generate Social Media Post" name="generateSocialPost" checked={params.generateSocialPost} onChange={(c) => handleToggle('generateSocialPost', c)} />
      </div>

      <div>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-medium text-primary-light dark:text-primary-dark hover:underline">
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Selector label="Star Rating (for reviews)" name="starRating" value={params.starRating || ''} onChange={handleChange} options={['', ...STAR_RATINGS]} />
            <Selector label="Occasion" name="occasion" value={params.occasion || ''} onChange={handleChange} options={['', ...OCCASIONS]} />
          </div>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Company Name</label>
            <input type="text" name="companyName" id="companyName" value={params.companyName || ''} onChange={handleChange} className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary-light dark:text-text-primary-dark" />
          </div>
          <div>
            <label htmlFor="seoKeywords" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">SEO Keywords (comma-separated)</label>
            <textarea name="seoKeywords" id="seoKeywords" value={params.seoKeywords || ''} onChange={handleChange} rows={2} className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary-light dark:text-text-primary-dark" />
          </div>
          <div>
            <label htmlFor="brandVoice" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Brand Voice</label>
            <textarea name="brandVoice" id="brandVoice" value={params.brandVoice || ''} onChange={handleChange} rows={3} placeholder="e.g., We are a playful, eco-friendly brand. Use emojis and a slightly informal tone." className="w-full bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary-light dark:text-text-primary-dark" />
          </div>
        </div>
      )}

      <button type="submit" disabled={isLoading || !params.productName} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-light dark:bg-primary-dark hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
        {isLoading ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Generating...</>
        ) : (
          <><SparklesIcon className="w-5 h-5 mr-2" /> Generate Content</>
        )}
      </button>
    </form>
  );
};

// Add a simple fade-in animation for the advanced options
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);
