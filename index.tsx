import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- BUNDLED FROM types.ts ---
interface ContentGenerationParams {
  productName: string;
  contentType: string;
  country: string;
  tone: string;
  contentLength?: string;
  starRating?: string;
  seoKeywords?: string;
  companyName?: string;
  occasion?: string;
  brandVoice?: string; // Added for Brand Voice feature
  generateAbTest: boolean;
  generateSocialPost: boolean;
  productImage?: {
    base64: string;
    mimeType: string;
  };
}

interface GeneratedContentChunk {
  id: string;
  title: string;
  content: string;
}

interface HistoryItem {
  id: string;
  projectId: string; // Kept for schema consistency, but will be a single hardcoded value now.
  params: ContentGenerationParams;
  generatedContent: string; // The raw markdown string
  createdAt: string;
}

interface Template {
  name: string;
  params: Partial<ContentGenerationParams>;
}


// --- BUNDLED FROM constants/constants.ts ---
const CONTENT_LENGTHS = ["Default", "Short", "Medium", "Long"];
const CONTENT_TYPES = [
  "Product Description",
  "Product Reviews (3)",
  "Social Media Post",
  "Email Campaign",
  "Blog Post Intro",
  "Ad Copy",
];
const TONES = [
  "Professional",
  "Casual",
  "Enthusiastic",
  "Humorous",
  "Luxurious",
  "Minimalist",
  "Adventurous",
];
const COUNTRIES = [
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "India",
  "Global",
];
const STAR_RATINGS = ["5 Stars", "4 Stars", "3 Stars"];
const OCCASIONS = [
  "Holiday Season",
  "Anniversary",
  "Birthday",
  "Wedding",
  "Summer Vacation",
  "Back to School",
];
const IMPROVEMENT_ACTIONS = [
    "Improve SEO",
    "Change Tone",
    "Shorten",
    "Lengthen",
    "Fix Grammar & Spelling",
    "Make more professional",
    "Make more casual",
];

// --- BUNDLED FROM constants/templates.ts ---
const TEMPLATES: Template[] = [
  {
    name: 'Luxury Product Launch',
    params: {
      contentType: 'Product Description',
      tone: 'Luxurious',
      seoKeywords: 'designer, exclusive, premium quality',
      generateSocialPost: true,
    },
  },
  {
    name: 'Holiday Sale Review',
    params: {
      contentType: 'Product Reviews (3)',
      tone: 'Enthusiastic',
      occasion: 'Holiday Season',
      starRating: '5 Stars',
      generateAbTest: true,
    },
  },
  {
    name: 'Casual Social Post',
    params: {
      contentType: 'Social Media Post',
      tone: 'Casual',
      generateAbTest: true,
    },
  },
  {
    name: 'Professional Ad Copy',
    params: {
      contentType: 'Ad Copy',
      tone: 'Professional',
      seoKeywords: 'limited time offer, official store, free shipping',
    },
  },
];

// --- BUNDLED FROM hooks/useLocalStorage.ts ---
function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key) {
            try {
                setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
            } catch (error) {
                console.error(error);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue];
}


// --- BUNDLED FROM services/geminiService.ts ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const buildPrompt = (params: ContentGenerationParams, chunkToRegen?: GeneratedContentChunk): string => {
  let basePrompt = `
You are an expert, world-class e-commerce copywriter for fashion and jewelry brands. Your writing is sophisticated, engaging, and SEO-optimized.

**CRITICAL INSTRUCTION:** Your final output should ONLY be the generated content itself, formatted in markdown with "###" for each distinct section/title. DO NOT repeat the input parameters like "Product Name:", "Tone:", etc., in your response. The product name and keywords should be woven naturally into the text.

---
**CONTENT DETAILS**
---
`;
  basePrompt += `**Product Name/Link:** ${params.productName}\n`;
  basePrompt += `**Tone of Voice:** ${params.tone}\n`;
  basePrompt += `**Target Audience/Country:** ${params.country}\n`;

  if (params.companyName) basePrompt += `**Company Name:** ${params.companyName}\n`;
  if (params.occasion) basePrompt += `**Occasion:** ${params.occasion}\n`;
  if (params.brandVoice) basePrompt += `**Brand Voice Guidelines:** ${params.brandVoice}\n`;
  if (params.seoKeywords) basePrompt += `**SEO Keywords to include naturally:** ${params.seoKeywords}\n`;
  
  basePrompt += `
---
**GENERATION TASK**
---
`;
  basePrompt += `**Content Type to Generate:** ${params.contentType}\n`;

  const seoDirective = (params.seoKeywords && params.productName) 
    ? `\n**SEO Focus:** Start with a compelling, SEO-optimized introductory sentence or meta description (under 160 characters) that naturally incorporates the primary keywords. This sentence should serve as a powerful hook.`
    : '';

  switch (params.contentType) {
    case 'Product Description':
      basePrompt += `**Task:** Write a compelling product description.${seoDirective} Then, detail the key features and benefits, and end with a call to action. Weave the SEO keywords throughout the description.`;
      if (params.contentLength && params.contentLength !== 'Default') {
        basePrompt += ` Keep the length ${params.contentLength}.`;
      }
      break;
    case 'Product Reviews (3)':
      basePrompt += `**Task:** Generate three distinct and realistic product reviews from different customer personas (e.g., a gift buyer, a long-time fan, a first-time customer).`;
      if (params.starRating) {
        basePrompt += ` The reviews should reflect a ${params.starRating} rating. You can represent the stars visually (e.g., ⭐⭐⭐⭐⭐). Do not add any other metadata like 'Product Name' to the review body.`;
      }
      break;
    case 'Social Media Post':
      basePrompt += `**Task:** Create an engaging social media post suitable for platforms like Instagram or Facebook.${seoDirective} Include relevant, popular hashtags at the end.`;
      break;
    case 'Email Campaign':
      basePrompt += `**Task:** Write copy for an email campaign. It MUST include an attention-grabbing subject line and a clear call to-action (CTA) button text.${seoDirective} The email body should expand on this hook. Format it like:\n### Subject: [Your Subject Here]\n\n[Email body here]\n\n### CTA Button: [Your CTA Text Here]`;
      break;
    case 'Blog Post Intro':
       basePrompt += `**Task:** Write an introductory paragraph for a blog post about this product.${seoDirective} It should hook the reader and briefly state what the post will cover.`;
       break;
    case 'Ad Copy':
        basePrompt += `**Task:** Write two short, punchy ad copy variations. Each should have a clear headline and a concise body text. Format it like:\n### Ad 1: [Headline]\n\n[Body]\n\n### Ad 2: [Headline]\n\n[Body]`;
        break;
    default:
        basePrompt += `**Task:** Generate the content as requested.`;
  }
  
  basePrompt += `\n`;
  if (params.generateAbTest) {
    basePrompt += `\n**Also generate one A/B test variant** for the primary content. Title it "### A/B Test Variant: [Original Title]".`;
  }
  if (params.generateSocialPost && params.contentType !== 'Social Media Post') {
    basePrompt += `\n**Also generate a related social media post**. Title it "### Social Media Post".`;
  }
  if (chunkToRegen) {
    return `
You are an expert e-commerce copywriter. Based on the original parameters provided below, your task is to regenerate ONLY the content for the section titled "${chunkToRegen.title}". 

**CRITICAL INSTRUCTION:** Provide ONLY the new text for this section. Do not include the title or any markdown like "###". Just the raw, regenerated content.

---
**ORIGINAL PARAMETERS**
---
${basePrompt}
`;
  }
  basePrompt += `\nNow, generate the content based on these instructions.`;
  return basePrompt;
};

const streamGeneratedContent = async (
  params: ContentGenerationParams,
  onChunk: (chunk: string) => void
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = buildPrompt(params);

    const parts: any[] = [];
    if (params.productImage) {
      parts.push({
        inlineData: {
          mimeType: params.productImage.mimeType,
          data: params.productImage.base64,
        }
      });
    }
    parts.push({ text: prompt });

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: { parts: parts },
    });

    let fullContent = '';
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullContent += text;
        onChunk(text);
      }
    }
    return fullContent;
  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating content.");
  }
};

const regenerateContentChunk = async (
  params: ContentGenerationParams,
  chunkToRegen: GeneratedContentChunk
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = buildPrompt(params, chunkToRegen);

    const parts: any[] = [];
    if (params.productImage) {
      parts.push({
        inlineData: {
          mimeType: params.productImage.mimeType,
          data: params.productImage.base64,
        }
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received an empty response from the AI.");
    }
    return text.trim();

  } catch (error) {
    console.error("Error regenerating content chunk:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to regenerate content: ${error.message}`);
    }
    throw new Error("An unknown error occurred while regenerating content.");
  }
};

const streamImprovedContent = async (
  originalText: string,
  improvementAction: string,
  tone: string | undefined,
  onChunk: (chunk: string) => void
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    let prompt = `
You are an expert, world-class copy editor. Your task is to improve the provided text based on the user's request.

**CRITICAL INSTRUCTION:** Your final output should ONLY be the improved text itself. Do not add any conversational filler, preambles, or explanations like "Here is the improved version:".

---
**IMPROVEMENT TASK**
---
**Action:** ${improvementAction}
`;

    if (improvementAction === 'Change Tone' && tone) {
      prompt += `**New Tone:** ${tone}\n`;
    }

    prompt += `
---
**ORIGINAL TEXT**
---
${originalText}

---
**IMPROVED TEXT (Your Output):**
---
`;

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
    });

    let fullContent = '';
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullContent += text;
        onChunk(text);
      }
    }
    return fullContent;
  } catch (error) {
    console.error("Error improving content:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to improve content: ${error.message}`);
    }
    throw new Error("An unknown error occurred while improving content.");
  }
};


// --- BUNDLED FROM components/icons ---
const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);
const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);
const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);
const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
    </svg>
);
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const RefreshCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 12a9 9 0 0 1 9-9c2.39 0 4.68.94 6.34 2.6" />
        <path d="M21 3v6h-6" />
        <path d="M21 12a9 9 0 0 1-9 9c-2.39 0-4.68-.94-6.34-2.6" />
        <path d="M3 21v-6h6" />
    </svg>
);
const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m12 3-1.9 4.8-4.8 1.9 4.8 1.9L12 21l1.9-4.8 4.8-1.9-4.8-1.9L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </svg>
);
const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.93 19.07 1.41-1.41" />
    <path d="m17.66 6.34 1.41-1.41" />
  </svg>
);
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);


// --- BUNDLED FROM components ---
const Loader: React.FC<{ text?: string }> = ({ text = "Generating..." }) => (
  <div className="flex flex-col items-center justify-center space-y-2 text-text-primary-light dark:text-text-primary-dark">
    <div className="w-8 h-8 border-4 border-primary-light dark:border-primary-dark border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm font-medium">{text}</p>
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300">
    <p className="font-bold">Error</p>
    <p>{message}</p>
  </div>
);

const Selector: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[]; name: string; }> = ({ label, value, onChange, options, name }) => (
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

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; name: string; }> = ({ label, checked, onChange, name }) => (
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const ContentCard: React.FC<{ chunk: GeneratedContentChunk; onDelete: (id: string) => void; onUpdate: (id: string, newContent: string) => void; onRegenerate: (chunk: GeneratedContentChunk) => void; isRegenerating: boolean; }> = ({ chunk, onDelete, onUpdate, onRegenerate, isRegenerating }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(chunk.content);
  const [isVisible, setIsVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedContent = useDebounce(content, 500);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setContent(chunk.content);
  }, [chunk.content]);

  useEffect(() => {
    if (debouncedContent !== chunk.content) {
      onUpdate(chunk.id, debouncedContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className={`relative bg-foreground-light dark:bg-foreground-dark p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {isRegenerating && (
        <div className="absolute inset-0 bg-background-light/80 dark:bg-background-dark/80 flex items-center justify-center rounded-lg z-10">
          <div className="flex items-center space-x-2 text-text-primary-light dark:text-text-primary-dark">
            <div className="w-5 h-5 border-2 border-primary-light dark:border-primary-dark border-t-transparent rounded-full animate-spin"></div>
            <span>Regenerating...</span>
          </div>
        </div>
      )}
      <div className={`transition-opacity ${isRegenerating ? 'opacity-30' : 'opacity-100'}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-primary-light dark:text-primary-dark">{chunk.title}</h3>
          <div className="flex items-center space-x-1">
            <button onClick={() => onRegenerate(chunk)} title="Regenerate" className="p-1.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 transform hover:scale-110">
              <RefreshCwIcon className="w-4 h-4" />
            </button>
            <button onClick={handleCopy} title="Copy" className="p-1.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 transform hover:scale-110">
              {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
            </button>
            <button onClick={() => onDelete(chunk.id)} title="Delete" className="p-1.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-500 transition-all duration-200 transform hover:scale-110">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onBlur={handleBlur}
            autoFocus
            className="w-full p-2 bg-background-light dark:bg-background-dark border border-accent-light dark:border-accent-dark rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-accent-light dark:focus:ring-accent-dark text-text-primary-light dark:text-text-primary-dark"
            rows={5}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none cursor-pointer rounded-md p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
          >
            {content || <span className="text-text-secondary-light dark:text-text-secondary-dark">Click to edit...</span>}
          </div>
        )}
      </div>
    </div>
  );
};

const parseContent = (rawContent: string): GeneratedContentChunk[] => {
    if (!rawContent) return [];
    
    const sections = rawContent.split(/(?=###\s)/).filter(s => s.trim() !== '');
    if (sections.length <= 1 && rawContent.trim()) {
        return [{ id: `chunk-0`, title: 'Generated Content', content: rawContent.trim() }];
    }

    return sections.map((section, index) => {
        const lines = section.trim().split('\n');
        const title = lines[0].replace('###', '').trim();
        const content = lines.slice(1).join('\n').trim();
        return { id: `chunk-${index}`, title, content };
    });
};

const ContentOutput: React.FC<{ rawContent: string | null; isLoading: boolean; error: string | null; params: ContentGenerationParams | null; onRegenerateAll: () => void; onUpdateFullContent: (newContent: string) => void; }> = ({ rawContent, isLoading, error, params, onRegenerateAll, onUpdateFullContent }) => {
    const [chunks, setChunks] = useState<GeneratedContentChunk[]>([]);
    const [regeneratingChunkId, setRegeneratingChunkId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChunks(parseContent(rawContent || ''));
    }, [rawContent]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const updateFullContentFromChunks = useCallback((updatedChunks: GeneratedContentChunk[]) => {
        const newRawContent = updatedChunks.map(c => `### ${c.title}\n\n${c.content}`).join('\n\n');
        onUpdateFullContent(newRawContent);
    }, [onUpdateFullContent]);

    const handleDeleteChunk = (id: string) => {
        const newChunks = chunks.filter(chunk => chunk.id !== id);
        setChunks(newChunks);
        updateFullContentFromChunks(newChunks);
    };

    const handleUpdateChunk = (id: string, newContent: string) => {
        const newChunks = chunks.map(chunk => chunk.id === id ? { ...chunk, content: newContent } : chunk);
        setChunks(newChunks);
        updateFullContentFromChunks(newChunks);
    };

    const handleRegenerateChunk = async (chunkToRegen: GeneratedContentChunk) => {
        if (!params) return;
        setRegeneratingChunkId(chunkToRegen.id);
        try {
            const newContent = await regenerateContentChunk(params, chunkToRegen);
            const newChunks = chunks.map(c => c.id === chunkToRegen.id ? { ...c, content: newContent } : c);
            setChunks(newChunks);
            updateFullContentFromChunks(newChunks);
        } catch (e) {
            console.error("Failed to regenerate chunk", e);
        } finally {
            setRegeneratingChunkId(null);
        }
    };
    
    const handleCopyAll = () => {
        const allContent = chunks.map(c => `### ${c.title}\n\n${c.content}`).join('\n\n');
        navigator.clipboard.writeText(allContent);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };
    
    const handleExport = (format: 'txt' | 'md' | 'html') => {
        if (!params?.productName || chunks.length === 0) return;

        let fileContent = '';
        let mimeType = '';
        
        const sanitizedProductName = params.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedProductName}_content.${format}`;

        switch (format) {
            case 'txt':
                fileContent = chunks.map(c => `${c.title}\n\n${c.content}`).join('\n\n---\n\n');
                mimeType = 'text/plain;charset=utf-8';
                break;
            case 'md':
                fileContent = chunks.map(c => `### ${c.title}\n\n${c.content}`).join('\n\n');
                mimeType = 'text/markdown;charset=utf-8';
                break;
            case 'html':
                const bodyContent = chunks.map(c => {
                    const titleHtml = `<h3>${c.title}</h3>`;
                    const contentHtml = `<p>${c.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
                    return `${titleHtml}\n${contentHtml}`;
                }).join('\n<hr>\n');
                fileContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${params.productName}</title>\n  <style>body { font-family: sans-serif; line-height: 1.6; padding: 1em 2em; max-width: 800px; margin: auto; } h3 { color: #4f46e5; } hr { border: 0; border-top: 1px solid #e2e8f0; margin: 2em 0; }</style>\n</head>\n<body>\n${bodyContent}\n</body>\n</html>`;
                mimeType = 'text/html;charset=utf-8';
                break;
        }
        
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    
        setIsExportMenuOpen(false);
    };

    const memoizedChunks = useMemo(() => {
        return chunks.map(chunk => (
            <ContentCard
                key={chunk.id}
                chunk={chunk}
                onDelete={handleDeleteChunk}
                onUpdate={handleUpdateChunk}
                onRegenerate={handleRegenerateChunk}
                isRegenerating={regeneratingChunkId === chunk.id}
            />
        ));
    }, [chunks, regeneratingChunkId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader /></div>;
    }

    if (error) {
        return <ErrorMessage message={error} />;
    }

    if (!rawContent) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary-light dark:text-text-secondary-dark">
                <SparklesIcon className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />
                <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Ready to create?</h2>
                <p>Fill out the form to generate your content.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-end space-x-2">
                <div className="relative" ref={exportMenuRef}>
                    <button 
                        onClick={() => setIsExportMenuOpen(prev => !prev)} 
                        className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        disabled={chunks.length === 0}
                    >
                        <DownloadIcon className="w-4 h-4 mr-1.5" />
                        Export
                    </button>
                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 animate-fade-in-sm">
                            <ul className="py-1">
                                <li>
                                    <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        as Text (.txt)
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => handleExport('md')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        as Markdown (.md)
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => handleExport('html')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        as HTML (.html)
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
                <button onClick={handleCopyAll} disabled={chunks.length === 0} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                    {copiedAll ? <CheckIcon className="w-4 h-4 mr-1.5"/> : <ClipboardIcon className="w-4 h-4 mr-1.5" />}
                    {copiedAll ? 'Copied!' : 'Copy All'}
                </button>
                <button onClick={onRegenerateAll} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 transition-opacity">
                    <RefreshCwIcon className="w-4 h-4 mr-1.5" />
                    Regenerate All
                </button>
            </div>
            <div className="space-y-4">
                {memoizedChunks}
            </div>
        </div>
    );
};

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

const ContentForm: React.FC<{ onSubmit: (params: ContentGenerationParams) => void; isLoading: boolean; initialParams?: ContentGenerationParams; }> = ({ onSubmit, isLoading, initialParams }) => {
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

const ContentGeneratorView: React.FC<{ onSaveHistory: (item: Omit<HistoryItem, 'id' | 'createdAt' | 'projectId'>) => void; activeHistoryItem: HistoryItem | null; clearActiveHistoryItem: () => void; incrementGenerationCount: () => void; }> = ({ onSaveHistory, activeHistoryItem, clearActiveHistoryItem, incrementGenerationCount }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<ContentGenerationParams | null>(null);

  useEffect(() => {
    if (activeHistoryItem) {
      setGeneratedContent(activeHistoryItem.generatedContent);
      setCurrentParams(activeHistoryItem.params);
    }
  }, [activeHistoryItem]);


  const handleGenerate = useCallback(async (params: ContentGenerationParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentParams(params);
    setGeneratedContent('');
    
    try {
      incrementGenerationCount();
      const finalContent = await streamGeneratedContent(params, (chunk) => {
        setGeneratedContent(prev => (prev || '') + chunk);
      });
      onSaveHistory({ params, generatedContent: finalContent });
      clearActiveHistoryItem();
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setGeneratedContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [onSaveHistory, clearActiveHistoryItem, incrementGenerationCount]);
  
  const handleUpdateFullContent = (newContent: string) => {
    setGeneratedContent(newContent);
    if(currentParams){
        onSaveHistory({ params: currentParams, generatedContent: newContent });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="lg:overflow-y-auto p-4 lg:p-1 rounded-lg">
        <div className="p-6 bg-background-light dark:bg-background-dark rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-text-primary-light dark:text-text-primary-dark">Content Generator</h2>
          <ContentForm 
            onSubmit={handleGenerate} 
            isLoading={isLoading}
            initialParams={activeHistoryItem?.params}
          />
        </div>
      </div>
      <div className="bg-foreground-light dark:bg-foreground-dark rounded-lg lg:overflow-y-auto p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
        <ContentOutput
          rawContent={generatedContent}
          isLoading={isLoading}
          error={error}
          params={currentParams}
          onRegenerateAll={() => currentParams && handleGenerate(currentParams)}
          onUpdateFullContent={handleUpdateFullContent}
        />
      </div>
    </div>
  );
};

const HistoryItemCard: React.FC<{ item: HistoryItem; onView: (item: HistoryItem) => void; }> = ({ item, onView }) => {
    const { params, createdAt } = item;
    return (
        <div className="p-4 bg-foreground-light dark:bg-foreground-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-primary-light dark:text-primary-dark">{params.productName}</p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{params.contentType} for {params.country}</p>
                </div>
                <button 
                    onClick={() => onView(item)}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90 transition-opacity"
                >
                    View
                </button>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                <HistoryIcon className="w-4 h-4 mr-2" />
                <span>{new Date(createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};

const ProjectView: React.FC<{ history: HistoryItem[]; onViewHistoryItem: (item: HistoryItem) => void; onClearHistory: () => void; }> = ({ history, onViewHistoryItem, onClearHistory }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = useMemo(() => {
        const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!searchTerm) {
            return sortedHistory;
        }
        return sortedHistory.filter(item =>
            item.params.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.params.contentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.generatedContent.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [history, searchTerm]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4 text-text-primary-light dark:text-text-primary-dark">Project History</h2>
            <div className="flex justify-between items-center mb-4 gap-4">
                <input
                    type="text"
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-lg bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark"
                />
                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors"
                        title="Clear all history"
                    >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Clear History
                    </button>
                )}
            </div>
            {filteredHistory.length > 0 ? (
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {filteredHistory.map(item => (
                        <HistoryItemCard key={item.id} item={item} onView={onViewHistoryItem} />
                    ))}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center text-center text-text-secondary-light dark:text-text-secondary-dark">
                    <div>
                        <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                        <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">No History Found</h3>
                        <p>Generate some content to see your history here.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

type View = 'generator' | 'project' | 'improver';

const Sidebar: React.FC<{ theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void; view: View; setView: (view: View) => void; }> = ({
  theme, setTheme, view, setView
}) => {
  return (
    <div className="w-64 bg-foreground-light dark:bg-foreground-dark flex flex-col h-full border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-light dark:text-primary-dark flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2"/>
            GemScribe AI
        </h1>
      </div>

      <nav className="p-4 space-y-2 flex-grow">
         <button onClick={() => setView('generator')} className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${view === 'generator' ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md' : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <SparklesIcon className="w-5 h-5 mr-3"/> Generator
         </button>
          <button onClick={() => setView('improver')} className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${view === 'improver' ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md' : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <PencilIcon className="w-5 h-5 mr-3"/> Content Improver
         </button>
         <button onClick={() => setView('project')} className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${view === 'project' ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md' : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <HistoryIcon className="w-5 h-5 mr-3"/> Project History
         </button>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-full flex items-center justify-center p-2 rounded-md text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'light' ? <MoonIcon className="w-5 h-5 mr-2" /> : <SunIcon className="w-5 h-5 mr-2" />}
          <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
        </button>
      </div>
    </div>
  );
};

const NewsletterModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: { name: string; email: string }) => Promise<{ success: boolean; message?: string }>; }> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('Something went wrong. Please try again in a moment.');


  useEffect(() => {
    if (!isOpen) {
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
        }, 2000);
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

const ContentImproverView: React.FC = () => {
    const [originalText, setOriginalText] = useState('');
    const [improvedText, setImprovedText] = useState('');
    const [improvementAction, setImprovementAction] = useState(IMPROVEMENT_ACTIONS[0]);
    const [tone, setTone] = useState(TONES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleImprove = useCallback(async () => {
        if (!originalText.trim()) return;

        setIsLoading(true);
        setError(null);
        setImprovedText('');

        try {
            await streamImprovedContent(originalText, improvementAction, tone, (chunk) => {
                setImprovedText(prev => prev + chunk);
            });
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [originalText, improvementAction, tone]);
    
    const handleCopy = () => {
        if (!improvedText) return;
        navigator.clipboard.writeText(improvedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-4 text-text-primary-light dark:text-text-primary-dark">Content Improver</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow overflow-hidden">
                <div className="flex flex-col space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Original Content</h3>
                    <textarea
                        value={originalText}
                        onChange={(e) => setOriginalText(e.target.value)}
                        placeholder="Paste your content here..."
                        className="w-full flex-grow bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark resize-none"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Selector
                            label="Action"
                            name="improvementAction"
                            value={improvementAction}
                            onChange={(e) => setImprovementAction(e.target.value)}
                            options={IMPROVEMENT_ACTIONS}
                        />
                        {improvementAction === 'Change Tone' && (
                            <Selector
                                label="New Tone"
                                name="tone"
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                options={TONES}
                            />
                        )}
                    </div>
                    <button
                        onClick={handleImprove}
                        disabled={isLoading || !originalText.trim()}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-light dark:bg-primary-dark hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isLoading ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Improving...</>
                        ) : (
                            <><SparklesIcon className="w-5 h-5 mr-2" /> Improve Content</>
                        )}
                    </button>
                </div>
                <div className="flex flex-col bg-foreground-light dark:bg-foreground-dark rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Improved Content</h3>
                        <button onClick={handleCopy} title="Copy" disabled={!improvedText || isLoading} className="p-2 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="p-4 flex-grow overflow-y-auto">
                        {isLoading && !improvedText && <div className="flex items-center justify-center h-full"><Loader text="Improving..." /></div>}
                        {error && <ErrorMessage message={error} />}
                        {!isLoading && !error && !improvedText && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary-light dark:text-text-secondary-dark">
                                <SparklesIcon className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-600" />
                                <p>Your improved content will appear here.</p>
                            </div>
                        )}
                        {improvedText && (
                            <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                                {improvedText}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SINGLE_PROJECT_ID = 'default_project';

function App() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [view, setView] = useState<View>('generator');
  
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('history', []);
  const [activeHistoryItem, setActiveHistoryItem] = useState<HistoryItem | null>(null);

  const [generationCount, setGenerationCount] = useLocalStorage<number>('generationCount', 0);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useLocalStorage<boolean>('newsletterSubscribed', false);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  useEffect(() => {
    if (!newsletterSubscribed && generationCount >= 3) {
        setIsNewsletterOpen(true);
    }
  }, [generationCount, newsletterSubscribed]);

  const incrementGenerationCount = () => {
    setGenerationCount(prev => prev + 1);
  };

  const handleNewsletterSubmit = async (data: { name: string; email: string }) => {
    console.log("Newsletter submission:", data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setNewsletterSubscribed(true);
    return { success: true };
  };

  const saveHistory = useCallback((item: Omit<HistoryItem, 'id' | 'createdAt' | 'projectId'>) => {
    setHistory(prev => {
        const existingItemFromHistory = activeHistoryItem && prev.find(h => h.id === activeHistoryItem.id);
        
        if (existingItemFromHistory) {
            return prev.map(h => h.id === existingItemFromHistory.id ? { ...h, generatedContent: item.generatedContent } : h);
        } else {
            const newHistoryItem: HistoryItem = {
                ...item,
                projectId: SINGLE_PROJECT_ID,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
            };
            const lastItem = prev[prev.length - 1];
            if (lastItem && lastItem.projectId === newHistoryItem.projectId && JSON.stringify(lastItem.params) === JSON.stringify(newHistoryItem.params) && (new Date().getTime() - new Date(lastItem.createdAt).getTime() < 5000)) {
                return [...prev.slice(0, -1), newHistoryItem];
            }
            return [...prev, newHistoryItem];
        }
    });

  }, [setHistory, activeHistoryItem]);
  
  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all project history? This action cannot be undone.')) {
        setHistory([]);
    }
  };

  const handleViewHistoryItem = (item: HistoryItem) => {
    setActiveHistoryItem(item);
    setView('generator');
  };
  
  const clearActiveHistoryItem = useCallback(() => setActiveHistoryItem(null), []);

  const switchView = (newView: View) => {
    if (newView === 'generator' && view !== 'generator') {
        clearActiveHistoryItem();
    }
    setView(newView);
  }

  return (
    <div className="flex h-screen w-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark font-sans">
      <Sidebar
        theme={theme}
        setTheme={setTheme}
        view={view}
        setView={switchView}
      />
      <main className="flex-1 overflow-hidden transition-opacity duration-300">
        {view === 'generator' && (
          <ContentGeneratorView 
            onSaveHistory={saveHistory}
            activeHistoryItem={activeHistoryItem}
            clearActiveHistoryItem={clearActiveHistoryItem}
            incrementGenerationCount={incrementGenerationCount}
          />
        )}
         {view === 'improver' && (
          <ContentImproverView />
        )}
        {view === 'project' && (
          <ProjectView
            history={history}
            onViewHistoryItem={handleViewHistoryItem}
            onClearHistory={clearHistory}
          />
        )}
      </main>
      <NewsletterModal 
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
        onSubmit={handleNewsletterSubmit}
      />
    </div>
  );
}


// --- Original index.tsx content ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- Inject animations ---
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
  }
   @keyframes fade-in-sm {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in-sm {
    animation: fade-in-sm 0.1s ease-out forwards;
    transform-origin: top right;
  }
`;
document.head.appendChild(style);