# Design Document - AI Analytics Chatbot

## Overview

The AI Analytics Chatbot is a conversational interface that enables ProfitTrack Pro users to interact with their business data using natural language. The system aggregates user statistics, constructs context-aware prompts, sends them to Google Gemini 2.0 Flash Lite, and returns personalized, data-driven insights.

### Key Design Decisions

1. **Client-side API calls**: Gemini API calls are made directly from the browser to avoid backend infrastructure costs
2. **localStorage for chat history**: No server-side storage of conversations for privacy and simplicity
3. **Real-time data aggregation**: Fresh data is fetched from Supabase for each conversation
4. **Streaming responses**: Use Gemini's streaming API for better UX (responses appear progressively)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  ChatButton  │  │  ChatPanel   │  │   MessageList        │  │
│  │  (FAB)       │──│  (Drawer)    │──│   ChatInput          │  │
│  └──────────────┘  └──────────────┘  │   SuggestedQuestions │  │
│                                       └──────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    useChatbot Hook                        │   │
│  │  - manages chat state                                     │   │
│  │  - handles message submission                             │   │
│  │  - persists to localStorage                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│  │ DataService │  │PromptBuilder│  │   GeminiService     │     │
│  │ (Supabase)  │  │             │  │   (API Client)      │     │
│  └─────────────┘  └─────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────┐
                              │   Google Gemini API       │
                              │   (gemini-2.0-flash-lite) │
                              └───────────────────────────┘
```

## Components and Interfaces

### 1. ChatButton Component
```typescript
// src/components/chat/ChatButton.tsx
interface ChatButtonProps {
  onClick: () => void;
  hasUnread: boolean;
}
```
- Floating action button (FAB) positioned bottom-right
- Shows notification badge when `hasUnread` is true
- Uses Lucide `MessageCircle` icon

### 2. ChatPanel Component
```typescript
// src/components/chat/ChatPanel.tsx
interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```
- Slide-out drawer on desktop (400px width)
- Full-screen modal on mobile
- Contains header, message list, and input area

### 3. MessageList Component
```typescript
// src/components/chat/MessageList.tsx
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}
```
- Renders chat bubbles with different styles for user/assistant
- Auto-scrolls to bottom on new messages
- Shows typing indicator when `isLoading`

### 4. ChatInput Component
```typescript
// src/components/chat/ChatInput.tsx
interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled: boolean;
}
```
- Text input with send button
- Disabled during API calls
- Supports Enter key submission

### 5. SuggestedQuestions Component
```typescript
// src/components/chat/SuggestedQuestions.tsx
interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}
```
- Displays clickable question chips
- Hidden after first user message

## Data Models

### UserContext (aggregated data for prompts)
```typescript
interface UserContext {
  period: {
    start: string;  // ISO date
    end: string;    // ISO date
    label: string;  // "Last 30 days", "This month", etc.
  };
  summary: {
    totalEarnings: number;
    totalExpenses: number;
    netProfit: number;
    totalKilometers: number;
    totalTrips: number;
    avgDailyProfit: number;
    profitMargin: number;  // percentage
  };
  expenseBreakdown: {
    fuel: number;
    toll: number;
    repair: number;
    food: number;
    misc: number;
    emi: number;
    driverSalary: number;
    maintenance: number;
  };
  vehicles: Array<{
    id: string;
    name: string;
    type: string;
    totalKm: number;
    totalEarnings: number;
    totalExpenses: number;
    netProfit: number;
    tripCount: number;
    avgProfitPerTrip: number;
    fuelEfficiency: number;  // km per liter
  }>;
  trends: {
    profitChange: number;      // percentage vs previous period
    expenseChange: number;     // percentage vs previous period
    earningsChange: number;    // percentage vs previous period
    kmChange: number;          // percentage vs previous period
  };
  topPerformer: string;        // vehicle name
  worstPerformer: string;      // vehicle name
  highestExpenseCategory: string;
}
```

### ChatSession (localStorage structure)
```typescript
interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastUpdatedAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data aggregation accuracy
*For any* user with N daily entries in a date range, the Data_Aggregator SHALL return summary totals that equal the sum of individual entry values (earnings, expenses, kilometers)
**Validates: Requirements 2.1, 2.2**

### Property 2: Prompt context completeness
*For any* user query, the constructed prompt SHALL contain all required context fields (summary, expenseBreakdown, vehicles array) with non-null values
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 3: Rate limiting enforcement
*For any* user making API requests, the system SHALL reject requests exceeding 10 per minute and return an appropriate error message
**Validates: Requirements 6.2**

### Property 4: Message persistence round-trip
*For any* chat message saved to localStorage, reading it back SHALL return an identical message object (id, role, content, timestamp)
**Validates: Requirements 4.1, 6.4**

### Property 5: Time period parsing accuracy
*For any* user query containing a time reference ("today", "this week", "last month", "this year"), the Prompt_Refiner SHALL extract the correct date range
**Validates: Requirements 8.2, 8.3, 8.4**

### Property 6: PII exclusion
*For any* prompt sent to the Gemini API, the content SHALL NOT contain user email, phone number, or physical address
**Validates: Requirements 6.1**

## Error Handling

| Error Type | Detection | User Message | Recovery |
|------------|-----------|--------------|----------|
| API Key Missing | `!import.meta.env.VITE_GEMINI_API_KEY` | "AI features are not configured. Please add your Gemini API key." | Show setup instructions |
| API Rate Limited | HTTP 429 | "Too many requests. Please wait a moment." | Auto-retry after 60s |
| API Quota Exceeded | HTTP 403 | "AI quota exceeded. Please try again tomorrow." | Disable chat until reset |
| Network Error | fetch throws | "Connection error. Please check your internet." | Show retry button |
| Invalid Response | No candidates in response | "Unable to generate response. Please try again." | Show retry button |
| Data Fetch Error | Supabase error | "Unable to load your data. Please refresh." | Show retry button |

## Testing Strategy

### Unit Tests
- DataService: Test aggregation functions with mock Supabase data
- PromptBuilder: Test prompt construction with various user contexts
- Time period parser: Test extraction of date ranges from natural language

### Property-Based Tests
- Property 1: Generate random daily entries, verify sum matches aggregation
- Property 4: Generate random messages, verify localStorage round-trip
- Property 5: Generate time period strings, verify correct date extraction
- Property 6: Generate user data with PII, verify exclusion from prompts

### Integration Tests
- End-to-end chat flow with mocked Gemini API
- Rate limiting behavior verification
- localStorage persistence across page reloads

### Manual Testing Checklist
- [ ] Chat opens/closes correctly on desktop and mobile
- [ ] Suggested questions work
- [ ] Messages display with correct styling
- [ ] Loading indicator shows during API calls
- [ ] Error messages display appropriately
- [ ] Chat history persists after page refresh
- [ ] New chat clears history
