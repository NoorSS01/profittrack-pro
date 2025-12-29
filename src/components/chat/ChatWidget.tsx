/**
 * ChatWidget Component
 * Combines ChatButton and ChatPanel for easy integration
 */

import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ChatButton } from './ChatButton';
import { ChatPanel } from './ChatPanel';
import { LockedChatPanel } from './LockedChatPanel';

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
    remainingChats,
    dailyLimit,
  } = useChat();

  const { plan, limits } = useSubscription();
  const navigate = useNavigate();

  // Check if AI chat is enabled for this plan
  const isAIChatEnabled = plan === 'trial' || limits.aiChatEnabled;

  const handleOpenChat = () => {
    if (!isAIChatEnabled) {
      // Still open but show locked state
    }
    openChat();
  };

  return (
    <>
      <ChatButton onClick={handleOpenChat} locked={!isAIChatEnabled} />
      {isAIChatEnabled ? (
        <ChatPanel
          isOpen={isOpen}
          onClose={closeChat}
          messages={messages}
          isLoading={isLoading}
          suggestedQuestions={suggestedQuestions}
          onSendMessage={sendMessage}
          onClearChat={clearChat}
          error={error}
          remainingChats={remainingChats}
          dailyLimit={dailyLimit}
        />
      ) : (
        <LockedChatPanel
          isOpen={isOpen}
          onClose={closeChat}
          onUpgrade={() => { closeChat(); navigate('/pricing'); }}
        />
      )}
    </>
  );
}
