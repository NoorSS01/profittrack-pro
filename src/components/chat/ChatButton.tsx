/**
 * ChatButton Component
 * Floating action button to open the AI chatbot
 */

import { MessageCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
  locked?: boolean;
}

export function ChatButton({ onClick, hasUnread = false, locked = false }: ChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
        locked 
          ? 'bg-muted hover:bg-muted/90 text-muted-foreground'
          : 'bg-primary hover:bg-primary/90 text-primary-foreground',
        'transition-all duration-200 hover:scale-105',
        'lg:bottom-6 lg:right-6'
      )}
      aria-label={locked ? "AI Assistant (Locked)" : "Open AI Assistant"}
    >
      {locked ? (
        <Lock className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
      {hasUnread && !locked && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-pulse" />
      )}
    </Button>
  );
}
