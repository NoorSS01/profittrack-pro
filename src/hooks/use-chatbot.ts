/**
 * useChatbot Hook
 * Manages chat state, message handling, and AI integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { generateResponse, getErrorMessage } from '@/services/gemini';
import { getUserContext, parseTimePeriod } from '@/services/dataAggregator';
import { buildSystemPrompt, buildConversationHistory, getSuggestedQuestions, filterPII } from '@/services/promptBuilder';
import type { Message } from '@/components/chat/MessageList';
import type { GeminiMessage } from '@/services/gemini';

const STORAGE_KEY = 'profittrack_chat_session';
const CHAT_COUNT_KEY = 'profittrack_chat_daily_count';
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds

interface ChatSession {
  messages: Message[];
  lastUpdatedAt: string;
}

interface DailyChatCount {
  date: string;
  count: number;
}

// Helper function to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

export function useChatbot() {
  const { user } = useAuth();
  const { limits, plan } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dailyChatCount, setDailyChatCount] = useState(0);

  // Load daily chat count from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_COUNT_KEY);
    if (stored) {
      try {
        const data: DailyChatCount = JSON.parse(stored);
        // Reset count if it's a new day
        if (data.date === getTodayString()) {
          setDailyChatCount(data.count);
        } else {
          // New day, reset count
          localStorage.setItem(CHAT_COUNT_KEY, JSON.stringify({ date: getTodayString(), count: 0 }));
          setDailyChatCount(0);
        }
      } catch (e) {
        console.error('Failed to parse chat count:', e);
        localStorage.removeItem(CHAT_COUNT_KEY);
      }
    }
  }, []);

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

    // Check daily limit (skip for trial users)
    if (plan !== 'trial' && limits.aiChatDailyLimit > 0) {
      if (dailyChatCount >= limits.aiChatDailyLimit) {
        setError(`Daily limit reached (${limits.aiChatDailyLimit} chats/day). Upgrade your plan for higher limits.`);
        setIsLoading(false);
        return;
      }
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
        
        // Increment daily chat count on successful response
        const newCount = dailyChatCount + 1;
        setDailyChatCount(newCount);
        localStorage.setItem(CHAT_COUNT_KEY, JSON.stringify({ date: getTodayString(), count: newCount }));
        
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
  }, [user, isLoading, messages, plan, limits.aiChatDailyLimit, dailyChatCount]);

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

  // Calculate remaining chats for the day
  const remainingChats = limits.aiChatDailyLimit > 0 ? Math.max(0, limits.aiChatDailyLimit - dailyChatCount) : 999;

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
    dailyChatCount,
    remainingChats,
    dailyLimit: limits.aiChatDailyLimit,
  };
}
