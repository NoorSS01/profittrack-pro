# Requirements Document

## Introduction

This document specifies the requirements for an AI Analytics Chatbot feature for ProfitTrack Pro. The chatbot enables users to have conversational interactions about their transport business data, receiving personalized insights, recommendations, and answers based on their actual historical and real-time statistics. The system uses Google Gemini 2.0 Flash Lite as the LLM backend.

## Glossary

- **AI_Chatbot**: The conversational interface component that accepts user queries and displays AI-generated responses
- **Data_Aggregator**: The service that collects and summarizes user statistics from the database
- **Prompt_Refiner**: The module that constructs context-aware prompts by combining user queries with their data
- **LLM_Service**: The backend service that communicates with Google Gemini API
- **User_Context**: The aggregated business data (vehicles, trips, profits, expenses) for a specific user
- **Chat_Session**: A conversation thread containing multiple messages between user and AI
- **Gemini_API**: Google's Generative AI API endpoint for Gemini 2.0 Flash Lite model

## Requirements

### Requirement 1

**User Story:** As a transport business owner, I want to ask questions about my business performance in natural language, so that I can get personalized insights without manually analyzing data.

#### Acceptance Criteria

1. WHEN a user opens the chatbot interface THEN THE AI_Chatbot SHALL display a chat window with an input field and message history area
2. WHEN a user submits a question THEN THE AI_Chatbot SHALL show a loading indicator while processing the request
3. WHEN a user submits a question THEN THE Data_Aggregator SHALL retrieve the user's statistics from the past 30 days by default
4. WHEN the AI generates a response THEN THE AI_Chatbot SHALL display the response within 10 seconds of submission
5. WHEN displaying responses THEN THE AI_Chatbot SHALL format numbers as currency (₹) or percentages where appropriate

### Requirement 2

**User Story:** As a user, I want the AI to understand my specific business context, so that recommendations are relevant to my actual situation.

#### Acceptance Criteria

1. WHEN constructing a prompt THEN THE Prompt_Refiner SHALL include the user's total profit, expenses, and earnings for the selected period
2. WHEN constructing a prompt THEN THE Prompt_Refiner SHALL include per-vehicle performance metrics (km, profit, fuel efficiency)
3. WHEN constructing a prompt THEN THE Prompt_Refiner SHALL include trend data comparing current period to previous period
4. WHEN the user asks about a specific vehicle THEN THE Prompt_Refiner SHALL include detailed data for that vehicle only
5. WHEN constructing a prompt THEN THE Prompt_Refiner SHALL include expense breakdown by category (fuel, toll, repair, food, misc, EMI, driver salary, maintenance)

### Requirement 3

**User Story:** As a user, I want to receive actionable recommendations, so that I can improve my business profitability.

#### Acceptance Criteria

1. WHEN a user asks "How can I increase profit?" THEN THE LLM_Service SHALL return at least 3 specific recommendations based on their data
2. WHEN providing recommendations THEN THE AI_Chatbot SHALL reference specific numbers from the user's data (e.g., "Your fuel costs are ₹X, which is Y% of expenses")
3. WHEN a user asks about cost reduction THEN THE LLM_Service SHALL identify the highest expense categories and suggest optimizations
4. WHEN a user asks about vehicle performance THEN THE LLM_Service SHALL compare vehicles and identify best/worst performers
5. WHEN providing insights THEN THE AI_Chatbot SHALL avoid generic advice and focus on data-specific observations

### Requirement 4

**User Story:** As a user, I want to ask follow-up questions in the same conversation, so that I can drill down into specific topics.

#### Acceptance Criteria

1. WHEN a user sends a follow-up message THEN THE Chat_Session SHALL maintain context from previous messages in the conversation
2. WHEN maintaining context THEN THE Prompt_Refiner SHALL include the last 5 messages from the conversation history
3. WHEN a user starts a new chat THEN THE AI_Chatbot SHALL clear the previous conversation history
4. WHEN displaying messages THEN THE AI_Chatbot SHALL show timestamps for each message
5. WHEN the conversation exceeds 10 messages THEN THE Prompt_Refiner SHALL summarize older messages to stay within token limits

### Requirement 5

**User Story:** As a user, I want to access the chatbot easily from anywhere in the app, so that I can get insights without navigating away from my current task.

#### Acceptance Criteria

1. WHEN on any page THEN THE AI_Chatbot SHALL be accessible via a floating action button in the bottom-right corner
2. WHEN the user clicks the chatbot button THEN THE AI_Chatbot SHALL open as a slide-out panel or modal
3. WHEN the chatbot is open THEN THE AI_Chatbot SHALL allow the user to minimize or close it
4. WHEN the chatbot is minimized THEN THE AI_Chatbot SHALL show a badge if there are unread responses
5. WHEN on mobile devices THEN THE AI_Chatbot SHALL display as a full-screen overlay for better usability

### Requirement 6

**User Story:** As a system administrator, I want the AI integration to be secure and cost-effective, so that user data is protected and API costs are controlled.

#### Acceptance Criteria

1. WHEN sending data to the LLM THEN THE LLM_Service SHALL never include personally identifiable information (user email, phone, address)
2. WHEN making API calls THEN THE LLM_Service SHALL implement rate limiting of maximum 10 requests per user per minute
3. WHEN the API key is invalid or quota exceeded THEN THE AI_Chatbot SHALL display a user-friendly error message
4. WHEN storing chat history THEN THE Chat_Session SHALL store messages in the user's browser localStorage only (not server-side)
5. WHEN the Gemini API is unavailable THEN THE AI_Chatbot SHALL display a fallback message and retry option

### Requirement 7

**User Story:** As a user, I want suggested questions to help me get started, so that I know what kinds of insights the AI can provide.

#### Acceptance Criteria

1. WHEN the chatbot opens with no messages THEN THE AI_Chatbot SHALL display at least 4 suggested starter questions
2. WHEN displaying suggestions THEN THE AI_Chatbot SHALL include questions like "How can I improve my profit?", "Which vehicle is most profitable?", "What are my biggest expenses?", "Show me my performance trend"
3. WHEN a user clicks a suggested question THEN THE AI_Chatbot SHALL automatically submit that question
4. WHEN the user has sent at least one message THEN THE AI_Chatbot SHALL hide the starter suggestions
5. WHEN displaying suggestions THEN THE AI_Chatbot SHALL style them as clickable chips or buttons

### Requirement 8

**User Story:** As a user, I want to select the time period for analysis, so that I can get insights for specific date ranges.

#### Acceptance Criteria

1. WHEN the chatbot opens THEN THE AI_Chatbot SHALL default to analyzing the last 30 days of data
2. WHEN a user mentions a time period in their question (e.g., "this month", "last week") THEN THE Prompt_Refiner SHALL adjust the data query accordingly
3. WHEN a user asks about "today" THEN THE Data_Aggregator SHALL retrieve only today's entries
4. WHEN a user asks about "this year" THEN THE Data_Aggregator SHALL retrieve entries from January 1st to current date
5. WHEN no time period is specified THEN THE Prompt_Refiner SHALL use the default 30-day period
