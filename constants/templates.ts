
import type { Template } from '../types.ts';

export const TEMPLATES: Template[] = [
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