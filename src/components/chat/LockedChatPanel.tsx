/**
 * LockedChatPanel Component
 * Shows when AI chat is not available for the user's plan
 */

import { X, Bot, Lock, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface LockedChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function LockedChatPanel({ isOpen, onClose, onUpgrade }: LockedChatPanelProps) {
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <SheetTitle className="text-base">AI Assistant</SheetTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {/* Locked Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-[300px]">
            {/* Lock Icon */}
            <div className="relative mx-auto">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                <Lock className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h3 className="font-semibold text-xl mb-2">AI Assistant Locked</h3>
              <p className="text-sm text-muted-foreground">
                Upgrade to Standard or Ultra plan to unlock the AI Assistant and get personalized insights for your transport business.
              </p>
            </div>

            {/* Features */}
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <p className="text-sm font-medium">With AI Assistant you can:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Get personalized profit optimization tips</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Analyze your expense patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Compare vehicle performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Get fuel efficiency recommendations</span>
                </li>
              </ul>
            </div>

            {/* Upgrade Button */}
            <Button onClick={onUpgrade} className="w-full gap-2" size="lg">
              <Crown className="h-5 w-5" />
              Upgrade to Unlock
            </Button>

            {/* Plan Info */}
            <p className="text-xs text-muted-foreground">
              Available in Standard (30 chats/day) and Ultra (100 chats/day) plans
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
