/**
 * MessageList Component
 * Displays chat messages with proper styling for user/assistant
 */

import { useEffect, useRef } from 'react';
import { Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          <FormattedContent content={message.content} />
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {format(new Date(message.timestamp), 'h:mm a')}
        </span>
      </div>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple markdown-like formatting
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Handle bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <div key={index} className="flex gap-2">
              <span>•</span>
              <span>{formatInlineText(line.replace(/^[-•]\s*/, ''))}</span>
            </div>
          );
        }
        // Handle numbered lists
        if (/^\d+\.\s/.test(line.trim())) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={index} className="flex gap-2">
                <span className="font-medium">{match[1]}.</span>
                <span>{formatInlineText(match[2])}</span>
              </div>
            );
          }
        }
        // Handle headers (##)
        if (line.trim().startsWith('## ')) {
          return (
            <div key={index} className="font-semibold mt-2">
              {line.replace(/^##\s*/, '')}
            </div>
          );
        }
        // Regular paragraph
        if (line.trim()) {
          return <p key={index}>{formatInlineText(line)}</p>;
        }
        return <br key={index} />;
      })}
    </div>
  );
}

function formatInlineText(text: string): React.ReactNode {
  // Bold text **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Highlight currency values
    const currencyParts = part.split(/(₹[\d,]+\.?\d*)/g);
    return currencyParts.map((cp, j) => {
      if (cp.startsWith('₹')) {
        return (
          <span key={`${i}-${j}`} className="font-semibold text-primary">
            {cp}
          </span>
        );
      }
      // Highlight percentages
      const percentParts = cp.split(/([+-]?\d+\.?\d*%)/g);
      return percentParts.map((pp, k) => {
        if (pp.endsWith('%')) {
          const isPositive = pp.startsWith('+') || (!pp.startsWith('-') && parseFloat(pp) > 0);
          const isNegative = pp.startsWith('-');
          return (
            <span
              key={`${i}-${j}-${k}`}
              className={cn(
                'font-semibold',
                isPositive && 'text-success',
                isNegative && 'text-destructive'
              )}
            >
              {pp}
            </span>
          );
        }
        return pp;
      });
    });
  });
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Analyzing your data...</span>
      </div>
    </div>
  );
}
