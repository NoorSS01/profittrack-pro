/**
 * Gemini AI Service
 * Handles communication with Google Gemini API
 */

// Using gemini-2.0-flash - the current stable model
// API v1beta is required for Gemini models
const GEMINI_MODEL = 'gemini-2.0-flash';
const API_VERSION = 'v1beta';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
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

  // Check if API key exists and is valid
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key' || apiKey.length < 20) {
    console.error('Gemini API key is missing or invalid');
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  // Build the contents array
  const contents: GeminiMessage[] = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    {
      role: 'model',
      parts: [{ text: 'I understand. I will analyze your transport business data and provide personalized insights.' }],
    },
    ...conversationHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  // Use the v1beta API endpoint (required for gemini-1.5-flash)
  const apiUrl = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  console.log('Calling Gemini API...');
  console.log('Model:', GEMINI_MODEL);
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch(apiUrl, {
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
      }),
    });

    console.log('Response status:', response.status);

    // Try to parse response
    let data: GeminiResponse;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error('API_ERROR: Failed to parse response');
    }

    console.log('Response data:', JSON.stringify(data).substring(0, 200));

    // Check for error in response body
    if (data.error) {
      console.error('Gemini API Error:', data.error);
      
      const errorMessage = (data.error.message || '').toLowerCase();
      const errorCode = data.error.code;
      
      if (errorCode === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        throw new Error('API_RATE_LIMITED');
      }
      if (errorCode === 403 || errorMessage.includes('permission') || errorMessage.includes('denied')) {
        throw new Error('API_QUOTA_EXCEEDED');
      }
      if (errorMessage.includes('api key') || errorMessage.includes('invalid key')) {
        throw new Error('API_KEY_INVALID');
      }
      if (errorCode === 404 || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        throw new Error('MODEL_NOT_FOUND');
      }
      
      throw new Error(`API_ERROR: ${data.error.message}`);
    }

    // Check HTTP status for non-JSON errors
    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      
      if (response.status === 429) throw new Error('API_RATE_LIMITED');
      if (response.status === 403) throw new Error('API_QUOTA_EXCEEDED');
      if (response.status === 404) throw new Error('MODEL_NOT_FOUND');
      if (response.status === 400) throw new Error('API_INVALID_REQUEST');
      
      throw new Error(`API_ERROR: HTTP ${response.status}`);
    }

    // Check for valid response
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response');
      throw new Error('NO_RESPONSE');
    }

    const candidate = data.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('SAFETY_BLOCKED');
    }

    const text = candidate.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Empty text in response');
      throw new Error('EMPTY_RESPONSE');
    }

    console.log('Gemini API Success! Response length:', text.length);
    return text;

  } catch (error) {
    console.error('Gemini API call failed:', error);
    
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
  const messages: Record<string, string> = {
    'GEMINI_API_KEY_MISSING': 'AI features are not configured. Please add your Gemini API key.',
    'API_KEY_INVALID': 'Invalid API key. Please check your Gemini API key is correct.',
    'API_RATE_LIMITED': 'API rate limit reached. Please wait a minute and try again.',
    'API_QUOTA_EXCEEDED': 'AI quota exceeded. Please check your Google Cloud billing or try again tomorrow.',
    'API_INVALID_REQUEST': 'Invalid request. Please try rephrasing your question.',
    'MODEL_NOT_FOUND': 'AI model temporarily unavailable. Please try again in a moment.',
    'NO_RESPONSE': 'Unable to generate a response. Please try again.',
    'EMPTY_RESPONSE': 'Received empty response. Please try again.',
    'SAFETY_BLOCKED': 'Your request was blocked for safety reasons. Please try a different question.',
    'NETWORK_ERROR': 'Connection error. Please check your internet and try again.',
  };

  if (messages[error.message]) {
    return messages[error.message];
  }

  if (error.message.startsWith('API_ERROR:')) {
    return `AI service error: ${error.message.replace('API_ERROR: ', '')}`;
  }

  return 'Something went wrong. Please try again.';
}

// Dummy function for backward compatibility
export function getRemainingRequests(): number {
  return 100; // Always return high number - let Google handle rate limiting
}

export function resetRateLimit(): void {
  // No-op - we removed client-side rate limiting
}
