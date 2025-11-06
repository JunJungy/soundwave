import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ModerationResult {
  isSafe: boolean;
  reason?: string;
  category?: string;
}

function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();
  
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "");
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  
  return cleaned.trim();
}

export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image for inappropriate content. Check for: nudity, sexual content, violence, gore, hate symbols, or other adult/NSFW content. Respond with JSON only: {\"isSafe\": boolean, \"reason\": string, \"category\": string}. If safe, set isSafe=true and reason=\"Content is appropriate\". If unsafe, set isSafe=false and provide specific reason and category.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { isSafe: false, reason: "Unable to analyze image" };
    }

    const cleanedContent = cleanJsonResponse(content);
    const result = JSON.parse(cleanedContent);
    return {
      isSafe: result.isSafe || false,
      reason: result.reason || "Content moderation check failed",
      category: result.category,
    };
  } catch (error) {
    console.error("Image moderation error:", error);
    return { isSafe: false, reason: "Image moderation service error" };
  }
}

export async function moderateUsername(username: string): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this username for inappropriate content: "${username}"
          
Check for:
- Profanity or vulgar language
- Sexual references or innuendos
- Hate speech or slurs
- Violence or threats
- Drug references
- Impersonation of public figures
- Spam or promotional content

Respond with JSON only: {"isSafe": boolean, "reason": string, "category": string}
If safe, set isSafe=true and reason="Username is appropriate".
If unsafe, set isSafe=false and provide specific reason and category.`,
        },
      ],
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { isSafe: false, reason: "Unable to analyze username" };
    }

    const cleanedContent = cleanJsonResponse(content);
    const result = JSON.parse(cleanedContent);
    return {
      isSafe: result.isSafe || false,
      reason: result.reason || "Username moderation check failed",
      category: result.category,
    };
  } catch (error) {
    console.error("Username moderation error:", error);
    return { isSafe: false, reason: "Username moderation service error" };
  }
}

export async function moderateText(text: string, context: string = "general"): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this ${context} text for inappropriate content: "${text}"
          
Check for:
- Profanity or vulgar language
- Sexual content or references
- Hate speech or slurs
- Violence or threats
- Harassment or bullying
- Spam or scams

Respond with JSON only: {"isSafe": boolean, "reason": string, "category": string}
If safe, set isSafe=true and reason="Text is appropriate".
If unsafe, set isSafe=false and provide specific reason and category.`,
        },
      ],
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { isSafe: false, reason: "Unable to analyze text" };
    }

    const cleanedContent = cleanJsonResponse(content);
    const result = JSON.parse(cleanedContent);
    return {
      isSafe: result.isSafe || false,
      reason: result.reason || "Text moderation check failed",
      category: result.category,
    };
  } catch (error) {
    console.error("Text moderation error:", error);
    return { isSafe: false, reason: "Text moderation service error" };
  }
}
