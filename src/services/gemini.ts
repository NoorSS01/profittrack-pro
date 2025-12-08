/**
 * Gemini AI Service
 * Handles communication with Google Gemini API
 */

// Using gemini-1.5-flash as it's stable and widely available
// You can change to 'gemini-2.0-flash-exp' or 'gemini-1.5-pro' if needed
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// Rate limiting state - more generous limits
const rateLimitState = {
  requests: [] as number[],
  maxRequests: 30, // 30 requests per minute (Gemini free tier allows 60/min)
  windowMs: 60000, // 1 minute
};

/**
 * Check if rate limit is exceeded
 */
function isRateLimited(): boolean {
  const now = Date.now();
  // Remove requests older than the window
  rateLimitState.requests = rateLimitState.requests.filter(
    (timestamp) => now - timestamp < rateLimitState.windowMs
  );
  return rateLimitState.requests.length >= rateLimitState.maxRequests;
}

/**
 * Record a new request for rate limiting
 */
function recordRequest(): void {
  rateLimitState.requests.push(Date.now());
}

/**
 * Get remaining requests in current window
 */
export function getRemainingRequests(): number {
  const now = Date.now();
  rateLimitState.requests = rateLimitState.requests.filter(
    (timestamp) => now - timestamp < rateLimitState.windowMs
  );
  return Math.max(0, rateLimitState.maxRequests - rateLimitState.requests.length);
}

/**
 * Generate a response from Gemini API
 */
export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GeminiMessage[] = []
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  if (isRateLimited()) {
    throw new Error('RATE_LIMITED');
  }

  // Build the contents array with conversation history
  const contents: GeminiMessage[] = [
    // System instruction as first user message
    {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    {
      role: 'model',
      parts: [{ text: 'I understand. I will analyze your transport business data and provide personalized insights based on your actual statistics.' }],
    },
    // Add conversation history
    ...conversationHistory,
    // Add current user message
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  recordRequest();

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      }),
    });

    if (!response.ok) {
      let errorData: GeminiError | null = null;
      try {
        errorData = (await response.json()) as GeminiError;
      } catch {
        // Response might not be JSON
      }
      
      console.error('Gemini API Error:', response.status, errorData);
      
      if (response.status === 429) {
        throw new Error('API_RATE_LIMITED');
      }
      if (response.status === 403) {
        throw new Error('API_QUOTA_EXCEEDED');
      }
      if (response.status === 400) {
        // Check if it's a model not found error
        if (errorData?.error?.message?.includes('not found')) {
          throw new Error('MODEL_NOT_FOUND');
        }
        throw new Error('API_INVALID_REQUEST');
      }
      if (response.status === 404) {
        throw new Error('MODEL_NOT_FOUND');
      }
      
      throw new Error(`API_ERROR: ${errorData?.error?.message || `HTTP ${response.status}`}`);
    }

    const data = (await response.json()) as GeminiResponse;

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('NO_RESPONSE');
    }

    const candidate = data.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('SAFETY_BLOCKED');
    }

    if (!candidate.content?.parts?.[0]?.text) {
      throw new Error('EMPTY_RESPONSE');
    }

    return candidate.content.parts[0].text;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('NETWORK_ERROR');
    }
    throw error;
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error): string {
  switch (error.message) {
    case 'GEMINI_API_KEY_MISSING':
      return 'AI features are not configured. Please add your Gemini API key in settings.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'API_RATE_LIMITED':
      return 'API rate limit reached. Please wait a minute and try again.';
    case 'API_QUOTA_EXCEEDED':
      return 'AI quota exceeded for today. Please try again tomorrow or check your API key.';
    case 'API_INVALID_REQUEST':
      return 'Invalid request. Please try rephrasing your question.';
    case 'MODEL_NOT_FOUND':
      return 'AI model not available. Please contact support.';
    case 'NO_RESPONSE':
    case 'EMPTY_RESPONSE':
      return 'Unable to generate a response. Please try again.';
    case 'SAFETY_BLOCKED':
      return 'Your request was blocked for safety reasons. Please try a different question.';
    case 'NETWORK_ERROR':
      return 'Connection error. Please check your internet and try again.';
    default:
      if (error.message.startsWith('API_ERROR:')) {
        return `AI service error: ${error.message.replace('API_ERROR: ', '')}`;
      }
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Reset rate limit state (useful for testing)
 */
export function resetRateLimit(): void {
  rateLimitState.requests = [];
}
