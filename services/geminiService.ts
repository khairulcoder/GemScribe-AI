import { GoogleGenAI } from "@google/genai";
import type { ContentGenerationParams, GeneratedContentChunk } from '../types';

// Initialization according to guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Builds the prompt for the Gemini model based on user-provided parameters.
 * @param params - The content generation parameters.
 * @param chunkToRegen - Optional. If provided, the prompt will be for regenerating a specific chunk.
 * @returns A string representing the full prompt.
 */
const buildPrompt = (params: ContentGenerationParams, chunkToRegen?: GeneratedContentChunk): string => {

  // --- Base Instructions ---
  let basePrompt = `
You are an expert, world-class e-commerce copywriter for fashion and jewelry brands. Your writing is sophisticated, engaging, and SEO-optimized.

**CRITICAL INSTRUCTION:** Your final output should ONLY be the generated content itself, formatted in markdown with "###" for each distinct section/title. DO NOT repeat the input parameters like "Product Name:", "Tone:", etc., in your response. The product name and keywords should be woven naturally into the text.

---
**CONTENT DETAILS**
---
`;

  // --- Add Parameters to Prompt ---
  basePrompt += `**Product Name/Link:** ${params.productName}\n`;
  basePrompt += `**Tone of Voice:** ${params.tone}\n`;
  basePrompt += `**Target Audience/Country:** ${params.country}\n`;

  if (params.companyName) basePrompt += `**Company Name:** ${params.companyName}\n`;
  if (params.occasion) basePrompt += `**Occasion:** ${params.occasion}\n`;
  if (params.brandVoice) basePrompt += `**Brand Voice Guidelines:** ${params.brandVoice}\n`;
  if (params.seoKeywords) basePrompt += `**SEO Keywords to include naturally:** ${params.seoKeywords}\n`;
  
  // --- Content-Type Specific Instructions & Parameters ---
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
      basePrompt += `**Task:** Write copy for an email campaign. It MUST include an attention-grabbing subject line and a clear call-to-action (CTA) button text.${seoDirective} The email body should expand on this hook. Format it like:\n### Subject: [Your Subject Here]\n\n[Email body here]\n\n### CTA Button: [Your CTA Text Here]`;
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

  // --- Global Additional Requirements ---
  if (params.generateAbTest) {
    basePrompt += `\n**Also generate one A/B test variant** for the primary content. Title it "### A/B Test Variant: [Original Title]".`;
  }
  if (params.generateSocialPost && params.contentType !== 'Social Media Post') {
    basePrompt += `\n**Also generate a related social media post**. Title it "### Social Media Post".`;
  }
  
  // --- Regeneration Logic ---
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


/**
 * Generates content as a stream.
 * @param params - The content generation parameters.
 * @param onChunk - A callback function that receives chunks of generated text.
 * @returns A promise that resolves to the complete generated content string.
 */
export const streamGeneratedContent = async (
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


/**
 * Regenerates a specific chunk of content.
 * @param params - The original content generation parameters.
 * @param chunkToRegen - The content chunk to regenerate.
 * @returns A promise that resolves to the new content string.
 */
export const regenerateContentChunk = async (
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

/**
 * Improves existing content based on a specified action.
 * @param originalText - The text to improve.
 * @param improvementAction - The action to perform (e.g., "Improve SEO").
 * @param tone - Optional. The target tone if the action is "Change Tone".
 * @param onChunk - Callback for streaming results.
 * @returns A promise that resolves to the complete improved content string.
 */
export const streamImprovedContent = async (
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
