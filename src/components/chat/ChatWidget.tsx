/**
 * ChatWidget Component
 * Combines ChatButton and ChatPanel for easy integration
 */

import { useChat } from '@/contexts/ChatContext';
import { ChatButton } from './ChatButton';
import { ChatPanel } from './ChatPanel';

export function ChatWidget() {
  const {
    messages,
    isLoading,
    error,
    suggestedQuestions,
    isOpen,
    sendMessage,
    clearChat,
    openChat,
    closeChat,
  } = useChat();

  return (
    <>
      <ChatButton onClick={openChat} />
      <ChatPanel
        isOpen={isOpen}
        onClose={closeChat}
        messages={messages}
        isLoading={isLoading}
        suggestedQuestions={suggestedQuestions}
        onSendMessage={sendMessage}
        onClearChat={clearChat}
        error={error}
      />
    </>
  );
}
