/**
 * Prompt Builder Service
 * Constructs context-aware prompts for the AI chatbot
 */

import { UserContext } from './dataAggregator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Format currency for display in prompts
 */
function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Build the system prompt with user context
 */
export function buildSystemPrompt(context: UserContext): string {
  const { period, summary, expenseBreakdown, vehicles, trends, topPerformer, worstPerformer, highestExpenseCategory } = context;

  if (!context.hasData) {
    return `You are an AI assistant for ProfitTrack Pro, a transport business management application.

The user has no data recorded for the period: ${period.label} (${period.start} to ${period.end}).

Help them understand how to use the app:
- They can add vehicles in the Vehicles section
- They can record daily trips in the Daily Entry section
- Once they have data, you can provide personalized insights

Be helpful and encouraging. Suggest they start by adding their first vehicle and recording a trip.`;
  }

  // Build vehicle summary
  const vehicleSummary = vehicles
    .filter(v => v.tripCount > 0)
    .map(v => `  - ${v.name} (${v.type}): ${v.tripCount} trips, ${v.totalKm.toFixed(1)} km, Profit: ${formatCurrency(v.netProfit)}, Avg per trip: ${formatCurrency(v.avgProfitPerTrip)}`)
    .join('\n');

  // Build expense breakdown
  const expenseItems = [
    { name: 'Fuel', value: expenseBreakdown.fuel },
    { name: 'EMI', value: expenseBreakdown.emi },
    { name: 'Driver Salary', value: expenseBreakdown.driverSalary },
    { name: 'Maintenance', value: expenseBreakdown.maintenance },
    { name: 'Toll', value: expenseBreakdown.toll },
    { name: 'Repairs', value: expenseBreakdown.repair },
    { name: 'Food', value: expenseBreakdown.food },
    { name: 'Miscellaneous', value: expenseBreakdown.misc },
  ].filter(e => e.value > 0);

  const expenseSummary = expenseItems
    .map(e => `  - ${e.name}: ${formatCurrency(e.value)} (${((e.value / summary.totalExpenses) * 100).toFixed(1)}%)`)
    .join('\n');

  return `You are an AI business analyst for ProfitTrack Pro, a transport business management application. You provide personalized, data-driven insights based on the user's actual business statistics.

## User's Business Data (${period.label}: ${period.start} to ${period.end})

### Summary Statistics
- Total Earnings: ${formatCurrency(summary.totalEarnings)}
- Total Expenses: ${formatCurrency(summary.totalExpenses)}
- Net Profit: ${formatCurrency(summary.netProfit)}
- Profit Margin: ${summary.profitMargin.toFixed(1)}%
- Total Kilometers: ${summary.totalKilometers.toFixed(1)} km
- Total Trips: ${summary.totalTrips}
- Average Daily Profit: ${formatCurrency(summary.avgDailyProfit)}

### Expense Breakdown
${expenseSummary || '  No expenses recorded'}

### Vehicle Performance
${vehicleSummary || '  No vehicle data available'}

### Trends (vs Previous ${period.days} days)
- Profit Change: ${formatPercent(trends.profitChange)}
- Earnings Change: ${formatPercent(trends.earningsChange)}
- Expense Change: ${formatPercent(trends.expenseChange)}
- Kilometers Change: ${formatPercent(trends.kmChange)}

### Key Insights
- Top Performing Vehicle: ${topPerformer || 'N/A'}
- Lowest Performing Vehicle: ${worstPerformer || 'N/A'}
- Highest Expense Category: ${highestExpenseCategory}

## Your Role
1. Answer questions about the user's business performance using the data above
2. Provide specific, actionable recommendations based on their actual numbers
3. Reference specific values from their data (e.g., "Your fuel costs are ₹X, which is Y% of expenses")
4. Compare vehicles and identify optimization opportunities
5. Be concise but thorough - aim for 2-4 paragraphs per response
6. Use bullet points for lists of recommendations
7. Always be encouraging and solution-oriented

## Important Guidelines
- ALWAYS reference specific numbers from the user's data
- NEVER give generic advice without connecting it to their actual statistics
- If asked about something not in the data, explain what data would be needed
- Format currency as ₹X,XXX.XX
- Format percentages with one decimal place`;
}

/**
 * Build conversation history for context
 */
export function buildConversationHistory(
  messages: ChatMessage[],
  maxMessages: number = 5
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  // Take the last N messages (excluding the current one being sent)
  const recentMessages = messages.slice(-maxMessages);

  return recentMessages.map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.content }],
  }));
}

/**
 * Summarize older messages if conversation is too long
 */
export function summarizeOlderMessages(messages: ChatMessage[]): string {
  if (messages.length <= 10) {
    return '';
  }

  const olderMessages = messages.slice(0, -5);
  const topics = new Set<string>();

  olderMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    if (content.includes('profit')) topics.add('profit');
    if (content.includes('expense') || content.includes('cost')) topics.add('expenses');
    if (content.includes('vehicle')) topics.add('vehicles');
    if (content.includes('fuel')) topics.add('fuel');
    if (content.includes('trend') || content.includes('growth')) topics.add('trends');
    if (content.includes('recommend') || content.includes('improve')) topics.add('recommendations');
  });

  if (topics.size === 0) {
    return '';
  }

  return `[Previous conversation covered: ${Array.from(topics).join(', ')}]`;
}

/**
 * Filter PII from user context (safety measure)
 */
export function filterPII(text: string): string {
  // Remove email patterns
  let filtered = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove phone patterns (Indian format)
  filtered = filtered.replace(/(\+91|0)?[6-9]\d{9}/g, '[PHONE]');
  
  // Remove potential addresses (basic pattern)
  filtered = filtered.replace(/\d+\s+[A-Za-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr)/gi, '[ADDRESS]');
  
  return filtered;
}

/**
 * Get suggested questions based on user context
 */
export function getSuggestedQuestions(context: UserContext): string[] {
  const questions: string[] = [];

  if (!context.hasData) {
    return [
      'How do I get started with ProfitTrack Pro?',
      'What features does this app offer?',
      'How do I add my first vehicle?',
      'How do I record a daily trip?',
    ];
  }

  // Always include these
  questions.push('How can I improve my profit?');
  questions.push('What are my biggest expenses?');

  // Add vehicle-specific question if multiple vehicles
  if (context.vehicles.filter(v => v.tripCount > 0).length > 1) {
    questions.push('Which vehicle is most profitable?');
  } else {
    questions.push('How is my vehicle performing?');
  }

  // Add trend question
  if (context.trends.profitChange !== 0) {
    questions.push('Show me my performance trend');
  } else {
    questions.push('What should I focus on this month?');
  }

  return questions;
}
