# Implementation Plan

- [x] 1. Set up Gemini API integration




  - [ ] 1.1 Create GeminiService class with API client
    - Create `src/services/gemini.ts` with `generateResponse()` method
    - Use `@google/generative-ai` package or direct fetch to Gemini REST API
    - Implement streaming response handling


    - Add error handling for API errors (rate limit, quota, network)
    - _Requirements: 6.2, 6.3, 6.5_
  - [ ] 1.2 Add environment variable for Gemini API key
    - Add `VITE_GEMINI_API_KEY` to `.env` and `.env.example`
    - Update documentation with setup instructions
    - _Requirements: 6.3_




  - [ ]* 1.3 Write unit tests for GeminiService
    - Test error handling for various HTTP status codes
    - Test rate limiting logic
    - _Requirements: 6.2, 6.3_


- [ ] 2. Implement Data Aggregation Service
  - [x] 2.1 Create DataAggregator service

    - Create `src/services/dataAggregator.ts`
    - Implement `getUserContext(userId, startDate, endDate)` function
    - Query daily_entries and vehicles tables from Supabase

    - Calculate summary statistics (totals, averages, percentages)
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [ ] 2.2 Implement expense breakdown calculation
    - Calculate per-category expense totals
    - Include fixed costs (EMI, driver salary, maintenance) prorated daily
    - _Requirements: 2.5_




  - [ ] 2.3 Implement vehicle performance metrics
    - Calculate per-vehicle: km, earnings, expenses, profit, trip count
    - Identify top and worst performers

    - _Requirements: 2.2, 3.4_
  - [ ] 2.4 Implement trend calculation
    - Compare current period to previous period of same length
    - Calculate percentage changes for profit, expenses, earnings, km

    - _Requirements: 2.3_
  - [ ]* 2.5 Write property test for data aggregation accuracy
    - **Property 1: Data aggregation accuracy**

    - **Validates: Requirements 2.1, 2.2**

- [ ] 3. Implement Prompt Builder
  - [ ] 3.1 Create PromptBuilder service
    - Create `src/services/promptBuilder.ts`
    - Implement `buildPrompt(userQuery, userContext, chatHistory)` function
    - Create system prompt template with business context
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 3.2 Implement time period extraction
    - Parse natural language time references ("today", "this week", "last month", "this year")
    - Return date range object { start, end }



    - Default to last 30 days if no time specified
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 3.3 Implement conversation context management
    - Include last 5 messages in prompt
    - Summarize older messages if conversation exceeds 10 messages

    - _Requirements: 4.2, 4.5_
  - [ ] 3.4 Implement PII filtering
    - Remove user email, phone, address from context before sending
    - _Requirements: 6.1_
  - [x]* 3.5 Write property test for time period parsing

    - **Property 5: Time period parsing accuracy**
    - **Validates: Requirements 8.2, 8.3, 8.4**
  - [ ]* 3.6 Write property test for PII exclusion
    - **Property 6: PII exclusion**
    - **Validates: Requirements 6.1**

- [x] 4. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create Chat UI Components
  - [ ] 5.1 Create ChatButton component (FAB)
    - Create `src/components/chat/ChatButton.tsx`

    - Position fixed bottom-right with z-index
    - Add notification badge for unread messages
    - Use Lucide MessageCircle icon
    - _Requirements: 5.1, 5.4_
  - [x] 5.2 Create ChatPanel component



    - Create `src/components/chat/ChatPanel.tsx`
    - Use shadcn Sheet component for slide-out drawer
    - 400px width on desktop, full-screen on mobile
    - Include header with title and close button
    - _Requirements: 5.2, 5.3, 5.5_

  - [ ] 5.3 Create MessageList component
    - Create `src/components/chat/MessageList.tsx`
    - Render user messages (right-aligned, primary color)
    - Render assistant messages (left-aligned, muted background)

    - Show timestamps on each message
    - Auto-scroll to bottom on new messages
    - Show typing indicator during loading
    - _Requirements: 1.1, 1.2, 4.4_
  - [ ] 5.4 Create ChatInput component
    - Create `src/components/chat/ChatInput.tsx`
    - Text input with send button



    - Disable during API calls
    - Support Enter key to submit
    - _Requirements: 1.1, 1.2_
  - [x] 5.5 Create SuggestedQuestions component

    - Create `src/components/chat/SuggestedQuestions.tsx`
    - Display 4 starter questions as clickable chips
    - Questions: "How can I improve my profit?", "Which vehicle is most profitable?", "What are my biggest expenses?", "Show me my performance trend"
    - Hide after first user message

    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 6. Implement Chat State Management
  - [ ] 6.1 Create useChatbot hook
    - Create `src/hooks/use-chatbot.ts`
    - Manage messages state array
    - Implement `sendMessage(content)` function
    - Handle loading and error states
    - _Requirements: 1.2, 1.4, 4.1_
  - [ ] 6.2 Implement localStorage persistence
    - Save chat session to localStorage on each message
    - Load chat session on hook initialization
    - Implement `clearChat()` function
    - _Requirements: 4.3, 6.4_
  - [ ] 6.3 Implement rate limiting
    - Track request timestamps in memory
    - Block requests if >10 in last 60 seconds
    - Show appropriate error message
    - _Requirements: 6.2_




  - [ ]* 6.4 Write property test for message persistence
    - **Property 4: Message persistence round-trip**
    - **Validates: Requirements 4.1, 6.4**


- [ ] 7. Integrate Chat into App
  - [ ] 7.1 Create ChatProvider context
    - Create `src/contexts/ChatContext.tsx`
    - Provide chat state and functions to entire app

    - Manage open/closed state of chat panel
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 7.2 Add ChatButton and ChatPanel to Layout
    - Import and render in `src/components/Layout.tsx`
    - Position ChatButton as fixed element
    - Render ChatPanel conditionally based on open state
    - _Requirements: 5.1, 5.2_
  - [ ] 7.3 Wire up complete chat flow
    - Connect useChatbot hook to UI components
    - Integrate DataAggregator, PromptBuilder, and GeminiService
    - Handle full request/response cycle
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 8. Implement Response Formatting
  - [ ] 8.1 Create response formatter utility
    - Create `src/utils/formatResponse.ts`
    - Format currency values with ₹ symbol
    - Format percentages with % symbol
    - Parse markdown in responses (bold, lists)
    - _Requirements: 1.5, 3.2_
  - [ ] 8.2 Style AI responses with data highlights
    - Highlight numbers and percentages in responses
    - Use appropriate colors for positive/negative values
    - _Requirements: 1.5, 3.2, 3.5_

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Build and Deploy
  - [ ] 10.1 Run production build
    - Execute `npm run build`
    - Verify no build errors
    - _Requirements: All_
  - [ ] 10.2 Update deployment documentation
    - Add Gemini API key setup instructions to HOSTINGER_DEPLOYMENT.md
    - Document environment variable requirements
    - _Requirements: 6.3_
  - [ ] 10.3 Commit and push to GitHub
    - Commit all changes with descriptive message
    - Push to main branch for Hostinger deployment
    - _Requirements: All_
