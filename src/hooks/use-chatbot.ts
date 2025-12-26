/**
 * useChatbot Hook
 * Manages chat state, message handling, and AI integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { generateResponse, getErrorMessage } from '@/services/gemini';
import { getUserContext, parseTimePeriod } from '@/services/dataAggregator';
import { buildSystemPrompt, buildConversationHistory, getSuggestedQuestions, filterPII } from '@/services/promptBuilder';
import type { Message } from '@/components/chat/MessageList';
import type { GeminiMessage } from '@/services/gemini';

const STORAGE_KEY = 'profittrack_chat_session';
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds

interface ChatSession {
  messages: Message[];
  lastUpdatedAt: string;
}

// Helper function to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load chat session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session: ChatSession = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = session.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (e) {
        console.error('Failed to parse chat session:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save chat session to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = {
        messages,
        lastUpdatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [messages]);

  // Load suggested questions when user context is available
  useEffect(() => {
    async function loadSuggestions() {
      if (!user) return;
      
      try {
        const { start, end, label } = parseTimePeriod('');
        const context = await getUserContext(user.id, start, end, label);
        const questions = getSuggestedQuestions(context);
        setSuggestedQuestions(questions);
      } catch (e) {
        console.error('Failed to load suggestions:', e);
        setSuggestedQuestions([
          'How can I improve my profit?',
          'What are my biggest expenses?',
          'Which vehicle is most profitable?',
          'Show me my performance trend',
        ]);
      }
    }

    loadSuggestions();
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
          await delay(RETRY_DELAY * attempt); // Exponential backoff
        }

        console.log('Sending message to AI:', content);
        
        // Parse time period from user query
        const { start, end, label } = parseTimePeriod(content);
        console.log('Time period:', { start, end, label });

        // Get user context data
        const context = await getUserContext(user.id, start, end, label);
        console.log('User context loaded, hasData:', context.hasData);

        // Build system prompt with context
        const systemPrompt = filterPII(buildSystemPrompt(context));
        console.log('System prompt built, length:', systemPrompt.length);

        // Build conversation history for context (limit to last 6 messages)
        const recentMessages = messages.slice(-6);
        const history = buildConversationHistory(recentMessages) as GeminiMessage[];
        console.log('Conversation history:', history.length, 'messages');

        // Generate AI response
        console.log('Calling Gemini API...');
        const response = await generateResponse(systemPrompt, content, history);
        console.log('AI response received, length:', response.length);

        // Add assistant message
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return; // Success, exit the function

      } catch (e) {
        console.error(`Chat error (attempt ${attempt + 1}):`, e);
        lastError = e instanceof Error ? e : new Error('Unknown error');
        
        // Don't retry for certain errors
        if (lastError.message === 'GEMINI_API_KEY_MISSING' || 
            lastError.message === 'API_KEY_INVALID' ||
            lastError.message === 'SAFETY_BLOCKED') {
          break;
        }
      }
    }

    // All retries failed
    const errorMessage = lastError ? getErrorMessage(lastError) : 'Something went wrong. Please try again.';
    setError(errorMessage);
    
    // Remove the user message if we failed to get a response
    setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    setIsLoading(false);
  }, [user, isLoading, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    suggestedQuestions,
    isOpen,
    sendMessage,
    clearChat,
    openChat,
    closeChat,
  };
}
