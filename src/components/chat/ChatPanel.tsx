/**
 * ChatPanel Component
 * Main chat interface panel with messages and input
 */

import { X, Trash2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageList, Message } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isLoading: boolean;
  suggestedQuestions: string[];
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  error?: string | null;
  remainingChats?: number;
  dailyLimit?: number;
}

export function ChatPanel({
  isOpen,
  onClose,
  messages,
  isLoading,
  suggestedQuestions,
  onSendMessage,
  onClearChat,
  error,
  remainingChats,
  dailyLimit,
}: ChatPanelProps) {
  const showSuggestions = messages.length === 0 && !isLoading;
  const showRemainingChats = dailyLimit && dailyLimit > 0 && dailyLimit < 999;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col p-0 gap-0',
          'w-full sm:w-[400px] sm:max-w-[400px]'
        )}
      >
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between px-4 py-3 border-b space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">AI Assistant</SheetTitle>
              {showRemainingChats && (
                <p className="text-xs text-muted-foreground">
                  {remainingChats}/{dailyLimit} chats left today
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearChat}
                className="h-8 w-8"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showSuggestions ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg">AI Business Assistant</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    Ask me anything about your transport business. I'll analyze your data and provide personalized insights.
                  </p>
                </div>
              </div>
              <SuggestedQuestions
                questions={suggestedQuestions}
                onSelect={onSendMessage}
              />
            </div>
          ) : (
            <MessageList messages={messages} isLoading={isLoading} />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <ChatInput
          onSubmit={onSendMessage}
          disabled={isLoading || (remainingChats !== undefined && remainingChats <= 0)}
          placeholder={
            remainingChats !== undefined && remainingChats <= 0 
              ? 'Daily limit reached. Upgrade for more.' 
              : showSuggestions 
                ? 'Ask about your business...' 
                : 'Type your follow-up question...'
          }
        />
      </SheetContent>
    </Sheet>
  );
}
