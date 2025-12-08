/**
 * ChatButton Component
 * Floating action button to open the AI chatbot
 */

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatButton({ onClick, hasUnread = false }: ChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
        'bg-primary hover:bg-primary/90 text-primary-foreground',
        'transition-all duration-200 hover:scale-105',
        'lg:bottom-6 lg:right-6'
      )}
      aria-label="Open AI Assistant"
    >
      <MessageCircle className="h-6 w-6" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-pulse" />
      )}
    </Button>
  );
}
