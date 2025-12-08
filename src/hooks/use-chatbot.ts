/**
 * useChatbot Hook
 * Manages chat state, message handling, and AI integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { generateResponse, getErrorMessage, getRemainingRequests } from '@/services/gemini';
import { getUserContext, parseTimePeriod } from '@/services/dataAggregator';
import { buildSystemPrompt, buildConversationHistory, getSuggestedQuestions, filterPII } from '@/services/promptBuilder';
import type { Message } from '@/components/chat/MessageList';
import type { GeminiMessage } from '@/services/gemini';

const STORAGE_KEY = 'profittrack_chat_session';

interface ChatSession {
  messages: Message[];
  lastUpdatedAt: string;
}

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

    // Check rate limit
    const remaining = getRemainingRequests();
    if (remaining <= 0) {
      setError('Too many requests. Please wait a moment before trying again.');
      return;
    }

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

    try {
      // Parse time period from user query
      const { start, end, label } = parseTimePeriod(content);

      // Get user context data
      const context = await getUserContext(user.id, start, end, label);

      // Build system prompt with context
      const systemPrompt = filterPII(buildSystemPrompt(context));

      // Build conversation history for context
      const history = buildConversationHistory(messages) as GeminiMessage[];

      // Generate AI response
      const response = await generateResponse(systemPrompt, content, history);

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (e) {
      const errorMessage = e instanceof Error ? getErrorMessage(e) : 'Something went wrong. Please try again.';
      setError(errorMessage);
      
      // Remove the user message if we failed to get a response
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
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
