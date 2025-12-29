/**
 * ChatContext
 * Provides chat state and functions to the entire app
 */

import { createContext, useContext, ReactNode } from 'react';
import { useChatbot } from '@/hooks/use-chatbot';
import type { Message } from '@/components/chat/MessageList';

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  suggestedQuestions: string[];
  isOpen: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  dailyChatCount: number;
  remainingChats: number;
  dailyLimit: number;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatbot = useChatbot();

  return (
    <ChatContext.Provider value={chatbot}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
