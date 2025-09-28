
export interface ContentGenerationParams {
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

export interface GeneratedContentChunk {
  id: string;
  title: string;
  content: string;
}

export interface HistoryItem {
  id: string;
  projectId: string; // Kept for schema consistency, but will be a single hardcoded value now.
  params: ContentGenerationParams;
  generatedContent: string; // The raw markdown string
  createdAt: string;
}

export interface Template {
  name: string;
  params: Partial<ContentGenerationParams>;
}