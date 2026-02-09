# AI Integration Prompts - Financial Command Center

## Overview

This document contains prompt templates for AI-powered features in the Financial Command Center. These prompts are designed to work with OpenAI GPT-4 or Gemini Pro for budget forecasting, risk analysis, and recommendations.

---

## 1. Budget Forecasting Prompt

### Use Case
Generate predictive insights for budget overruns, cash flow optimization, and contingency recommendations.

```typescript
const BUDGET_FORECASTING_PROMPT = `
You are a senior financial analyst specializing in wedding and event planning budgets.
Analyze the following budget data and provide actionable insights.

## BUDGET DATA
- Wedding ID: {wedding_id}
- Wedding Date: {wedding_date}
- Days Until Event: {days_until_event}
- Currency: {currency}

## FINANCIAL SUMMARY
- Total Target Budget: {total_target_budget_cents} {currency}
- Total Contracted: {total_contracted_cents} {currency}
- Total Paid to Date: {total_paid_cents} {currency}
- Remaining Budget: {remaining_budget_cents} {currency}
- Budget Utilization: {utilization_percent}%
- Current Variance: {variance_cents} {currency}

## CATEGORY BREAKDOWN
{category_breakdown_json}

## PAYMENT SCHEDULE
Upcoming Payments (next 30 days):
{upcoming_payments_json}

Historical Variance by Category:
{historical_variance_json}

## YOUR TASK

### 1. RISK ANALYSIS
Identify the top 3 budget overrun risks:
For each risk provide:
- Category name
- Predicted overrun amount (in cents)
- Confidence score (0.0-1.0)
- Primary reason for the risk
- Specific warning signs to watch

### 2. CASH FLOW OPTIMIZATION
Analyze the payment schedule and recommend:
- Payments that could be deferred without penalty
- Early payment discounts to negotiate
- Cash flow gaps that need addressing
- Optimal payment sequencing to smooth outflows

### 3. CONTINGENCY RECOMMENDATIONS
Suggest appropriate contingency buffer increases:
- Current recommended buffer: 10-15% of total
- Category-specific adjustments needed
- Areas where higher buffer is warranted
- Areas where buffer can be reduced

### 4. UNUSUAL PRICING FLAGS
Compare current line items against market averages:
- Categories where prices seem high
- Categories where prices seem competitive
- Specific line items to renegotiate

### 5. ACTION ITEMS
Generate 5-7 specific, actionable tasks:
- Task description
- Priority (high/medium/low)
- Deadline (specific date or event-relative)
- Potential savings or risk mitigation value

## OUTPUT FORMAT
Return a JSON object:
{
  "risks": [{
    "category": string,
    "predicted_overrun_cents": number,
    "confidence": number,
    "reason": string,
    "warning_signs": string[]
  }],
  "cash_flow_optimization": {
    "deferrable_payments": [{
      "item_id": string,
      "amount_cents": number,
      "deferral_days": number,
      "savings_potential": string
    }],
    "cash_flow_gaps": [{
      "date": string,
      "gap_amount_cents": number,
      "severity": "low" | "medium" | "high"
    }]
  },
  "contingency_recommendations": {
    "suggested_buffer_percent": number,
    "category_adjustments": [{
      "category": string,
      "current_buffer": number,
      "suggested_buffer": number,
      "rationale": string
    }]
  },
  "pricing_flags": [{
    "item_id": string,
    "item_name": string,
    "category": string,
    "current_price_cents": number,
    "market_average_cents": number,
    "variance_percent": number,
    "recommendation": string
  }],
  "action_items": [{
    "task": string,
    "priority": "high" | "medium" | "low",
    "deadline": string,
    "impact": string
  }]
}

## CONTEXT
- Current date: {current_date}
- Event date: {wedding_date}
- Planner's historical performance: {planner_performance_summary}
- Regional pricing trends: {regional_trends}

Respond only with valid JSON. Do not include any other text.
`;
```

---

## 2. Vendor Recommendation Prompt

### Use Case
Suggest alternative vendors based on budget constraints and client preferences.

```typescript
const VENDOR_RECOMMENDATION_PROMPT = `
You are a wedding planning expert with deep knowledge of vendor pricing and quality.
Recommend alternatives for an over-budget line item.

## LINE ITEM DETAILS
- Current Item: {item_name}
- Category: {category_type}
- Current Vendor: {vendor_name}
- Current Price: {current_price_cents} {currency}
- Target Budget: {target_budget_cents} {currency}
- Overrun: {overrun_cents} {currency}
- Event Date: {event_date}
- Location: {location}

## CLIENT PREFERENCES
- Style: {client_style}
- Must-Haves: {must_haves}
- Nice-to-Haves: {nice_to_haves}
- Guest Count: {guest_count}
- Venue Type: {venue_type}

## VENDOR DATABASE (Simulated)
Available vendors in category:
{vendor_database_json}

## YOUR TASK

Provide 3 vendor alternatives ranked by fit:

For each recommendation include:
1. Vendor name and rating
2. Price range (low-high)
3. Why this vendor fits the event
4. Risk considerations
5. Estimated savings vs. current
6. Availability status

## OUTPUT FORMAT
JSON:
{
  "recommendations": [{
    "vendor_id": string,
    "vendor_name": string,
    "rating": number,
    "price_range_low": number,
    "price_range_high": number,
    "estimated_price_cents": number,
    "savings_cents": number,
    "fit_score": number,
    "rationale": string,
    "risk_factors": string[],
    "availability": "available" | "limited" | "unavailable",
    "contact_info": {
      "phone": string,
      "email": string
    }
  }],
  "negotiation_tips": [{
    "current_vendor": string,
    "tactics": string[],
    "potential_savings_cents": number
  }],
  "alternative_strategies": [{
    "strategy": string,
    "description": string,
    "savings_cents": number,
    "trade_offs": string[]
  }]
}

Respond only with valid JSON.
`;
```

---

## 3. Payment Scheduling Optimization Prompt

### Use Case
Suggest optimal payment installment plans to manage cash flow.

```typescript
const PAYMENT_SCHEDULING_PROMPT = `
You are a cash flow management specialist for event planners.
Optimize this payment schedule to reduce financial stress and leverage payment terms.

## BUDGET OVERVIEW
- Total Budget: {total_budget_cents} {currency}
- Total Paid: {total_paid_cents} {currency}
- Balance Due: {balance_due_cents} {currency}
- Event Date: {event_date}
- Planner Payment Terms: {payment_terms_days} days

## CURRENT PAYMENT OBLIGATIONS
{current_payments_json}

## PLANNER CASH FLOW CONSTRAINTS
- Preferred monthly outflow cap: {monthly_cap_cents} {currency}
- Large payments to avoid: {avoid_payments_json}
- Vendor payment terms: {vendor_terms_json}

## YOUR TASK

### 1. PAYMENT RESEQUENCING
Suggest a new payment schedule that:
- Smooths monthly outflows
- Maximizes payment term utilization
- Avoids lump sums > {lump_sum_threshold_cents}
- Maintains good vendor relationships

### 2. INSTALLMENT RECOMMENDATIONS
For payments > {installment_threshold_cents}, suggest splits:
- Standard 50/25/25
- Milestone-based (booking/deposit/final)
- Date-aligned with event milestones

### 3. CASH FLOW PROJECTION
Project 6-month cash flow with optimized schedule:
- Monthly outflows
- Cash position at key dates
- Potential interest earned (if applicable)

### 4. RISK MITIGATION
Identify:
- Payments at risk of missing terms
- Vendor relationships to maintain
- Contingency for delayed payments

## OUTPUT FORMAT
JSON:
{
  "optimized_schedule": [{
    "original_item_id": string,
    "item_name": string,
    "original_due_date": string,
    "optimized_due_date": string,
    "original_amount": number,
    "optimized_amount": number,
    "change_rationale": string
  }],
  "installment_suggestions": [{
    "item_id": string,
    "item_name": string,
    "current_amount": number,
    "suggested_splits": [{
      "installment_number": number,
      "percentage": number,
      "amount_cents": number,
      "due_date": string,
      "milestone": string
    }],
    "total_installment_fees": number,
    "savings_vs_original": number
  }],
  "cash_flow_projection": [{
    "month": string,
    "outflow_cents": number,
    "cumulative_outflow_cents": number,
    "notes": string
  }],
  "risk_alerts": [{
    "item_id": string,
    "risk_type": string,
    "description": string,
    "mitigation": string
  }],
  "summary_metrics": {
    "total_savings_cents": number,
    "avg_monthly_outflow_reduction_percent": number,
    "lump_sums_eliminated": number
  }
}

Respond only with valid JSON.
`;
```

---

## 4. Variance Analysis Prompt

### Use Case
Post-event reconciliation analysis comparing estimated vs. actual spending.

```typescript
const VARIANCE_ANALYSIS_PROMPT = `
You are a financial analyst conducting post-event budget reconciliation.
Analyze variance between estimated, contracted, and actual spending.

## BUDGET RECONCILIATION DATA
- Wedding: {wedding_name}
- Event Date: {event_date}
- Planner: {planner_name}

## BUDGET vs. ACTUAL COMPARISON
{budget_variance_json}

## DETAILED LINE ITEM ANALYSIS
{line_items_json}

## HISTORICAL CONTEXT
Planner's historical variance patterns:
- Average variance by category: {historical_variance_json}
- Typical overruns: {typical_overruns_json}
- Typical under-runs: {typical_underruns_json}

## YOUR TASK

### 1. EXECUTIVE SUMMARY
Provide high-level analysis:
- Total variance (estimated vs. actual)
- Variance as percentage of budget
- Categories with largest positive/negative variance
- Was the budget reasonable given actual outcomes?

### 2. VARIANCE DRIVERS
For each category with significant variance (>5%), explain:
- What caused the variance
- Controllable vs. uncontrollable factors
- Lessons for future planning

### 3. CLIENT IMPACT ANALYSIS
- Which variances affect client billing
- Which are internal (planner) costs
- Recommended adjustments to client invoice

### 4. RECOMMENDATIONS
Provide specific guidance:
- Vendor changes for future events
- Budget template adjustments
- Process improvements

## OUTPUT FORMAT
JSON:
{
  "executive_summary": {
    "total_estimated_cents": number,
    "total_contracted_cents": number,
    "total_actual_cents": number,
    "total_variance_cents": number,
    "variance_percent": number,
    "budget_adequacy_rating": "accurate" | "optimistic" | "pessimistic",
    "key_insight": string
  },
  "category_analysis": [{
    "category": string,
    "estimated_cents": number,
    "contracted_cents": number,
    "actual_cents": number,
    "variance_contracted_vs_actual_cents": number,
    "variance_percent": number,
    "driver_analysis": {
      "primary_causes": string[],
      "controllable_factors": string[],
      "uncontrollable_factors": string[]
    },
    "future_recommendations": string[]
  }],
  "client_impact": {
    "items_to_rebill": [{
      "item_id": string,
      "item_name": string,
      "client_billed_cents": number,
      "actual_cost_cents": number,
      "adjustment_cents": number,
      "reason": string
    }],
    "internal_only_items": [{
      "item_id": string,
      "item_name": string,
      "amount_cents": number,
      "reason": string
    }],
    "total_client_credit_cents": number,
    "adjusted_invoice_total_cents": number
  },
  "vendor_performance": [{
    "vendor_id": string,
    "vendor_name": string,
    "contracted_cents": number,
    "actual_cents": number,
    "on_budget_score": number,
    "recommendation": "continue" | "caution" | "replace"
  }],
  "improvement_recommendations": [{
    "area": string,
    "recommendation": string,
    "impact_rating": "high" | "medium" | "low",
    "implementation_difficulty": "easy" | "medium" | "hard"
  }]
}

Respond only with valid JSON.
`;
```

---

## 5. Client Mode Summary Prompt

### Use Case
Generate client-friendly budget summaries for sharing.

```typescript
const CLIENT_SUMMARY_PROMPT = `
You are creating a client-facing budget summary.
Generate a professional, easy-to-understand overview.

## BUDGET DATA (Client-Approved View)
- Wedding: {wedding_name}
- Event Date: {event_date}
- Guest Count: {guest_count}

## BUDGET SUMMARY
- Total Budget: {total_budget_cents} {currency}
- Allocated to Date: {allocated_cents} {currency}
- Paid to Vendors: {paid_cents} {currency}
- Remaining: {remaining_cents} {currency}

## CATEGORY BREAKDOWN (Client-Safe)
{category_breakdown_json}

## TOP VENDORS
{vendors_json}

## YOUR TASK

Generate a client-friendly document:

1. EXECUTIVE SUMMARY
- Warm, professional tone
- Key numbers presented clearly
- Reassurance about budget management

2. CATEGORY HIGHLIGHTS
- Each major category with description
- What is included
- Any notable items

3. VENDOR OVERVIEW
- Key vendor partnerships
- Service descriptions

4. TIMELINE
- Major payment milestones
- What has been paid
- What is coming

5. NEXT STEPS
- What client needs to know
- Any decisions required
- Approval requests

## OUTPUT FORMAT
JSON:
{
  "document_title": string,
  "generated_date": string,
  "executive_summary": {
    "headline": string,
    "body": string,
    "key_numbers": [{
      "label": string,
      "value": string,
      "formatted": string
    }]
  },
  "categories": [{
    "name": string,
    "description": string,
    "budget_range": string,
    "included_items": string[],
    "highlights": string[]
  }],
  "timeline": {
    "past_payments": [{
      "date": string,
      "description": string,
      "amount": string
    }],
    "upcoming_payments": [{
      "date": string,
      "description": string,
      "amount": string
    }],
    "final_payment_due": string
  },
  "vendors": [{
    "name": string,
    "service": string,
    "status": "booked" | "pending" | "paid"
  }],
  "next_steps": [{
    "action": string,
    "description": string,
    "deadline": string,
    "requires_response": boolean
  }],
  "client_message": string
}

Respond only with valid JSON.
`;
```

---

## 6. Natural Language Query Prompt

### Use Case
Answer planner questions about the budget in natural language.

```typescript
const NATURAL_LANGUAGE_PROMPT = `
You are a financial assistant for wedding planners.
Answer questions about this budget clearly and accurately.

## BUDGET CONTEXT
{wedding_budget_json}

## CURRENT QUESTION
{user_question}

## PREVIOUS QUESTIONS (for context)
{conversation_history_json}

## YOUR TASK

Provide a helpful, accurate response:
- Direct answer to the question
- Supporting data/rationale
- Actionable next steps if applicable
- Acknowledge limitations if data is incomplete

## OUTPUT FORMAT
JSON:
{
  "answer": string,
  "confidence": number,
  "supporting_data": {
    "direct_answer": string,
    "calculations": string,
    "assumptions": string[]
  },
  "recommendations": string[],
  "related_topics": string[],
  "needsclarification": boolean,
  "clarification_question": string | null
}

Respond only with valid JSON.
`;
```

---

## Prompt Engineering Best Practices

### Temperature Settings

| Use Case | Temperature | Rationale |
|----------|------------|-----------|
| Forecasting | 0.3 | Conservative, data-driven outputs |
| Recommendations | 0.5 | Balanced creativity and accuracy |
| Natural language | 0.7 | Conversational, engaging tone |
| Structured data extraction | 0.1 | Strict adherence to format |

### Token Management

```typescript
// Optimize prompt size by truncating historical data
function prepareHistoricalContext(
  historicalEvents: Event[],
  maxEvents: number = 10
): HistoricalSummary {
  const recentEvents = historicalEvents
    .sort((a, b) => b.event_date - a.event_date)
    .slice(0, maxEvents);

  return {
    summary: aggregateVariance(historicalEvents),
    recent_events: recentEvents.map(e => ({
      event_type: e.type,
      variance_percent: e.variance_percent,
      category_overruns: e.category_overruns,
    })),
  };
}

// Summarize vendor lists by tier
function summarizeVendorDatabase(vendors: Vendor[]): VendorTierSummary[] {
  return [
    {
      tier: 'premium',
      count: vendors.filter(v => v.rating >= 4.5).length,
      avg_price_range: calculateAverageRange(vendors.filter(v => v.rating >= 4.5)),
    },
    {
      tier: 'standard',
      count: vendors.filter(v => v.rating >= 3.5 && v.rating < 4.5).length,
      avg_price_range: calculateAverageRange(vendors.filter(v => v.rating >= 3.5 && v.rating < 4.5)),
    },
    {
      tier: 'budget',
      count: vendors.filter(v => v.rating < 3.5).length,
      avg_price_range: calculateAverageRange(vendors.filter(v => v.rating < 3.5)),
    },
  ];
}
```

### Caching Strategy

```typescript
interface AIPromptCache {
  key: string;
  response: AIResponse;
  generated_at: Timestamp;
  expires_at: Timestamp;
  invalidation_triggers: string[];
}

async function getCachedAIResponse(
  promptKey: string,
  contextHash: string
): Promise<AIResponse | null> {
  const cacheKey = `${promptKey}:${contextHash}`;
  const cached = await redis.get(cacheKey);
  
  if (cached && new Date(cached.expires_at) > now()) {
    return cached.response;
  }
  
  return null;
}

async function cacheAIResponse(
  promptKey: string,
  contextHash: string,
  response: AIResponse,
  ttlHours: number = 24,
  invalidationTriggers: string[] = []
): Promise<void> {
  const cacheKey = `${promptKey}:${contextHash}`;
  await redis.setex(cacheKey, ttlHours * 3600, {
    response,
    generated_at: now(),
    expires_at: addHours(now(), ttlHours),
    invalidation_triggers: invalidationTriggers,
  });

  // Schedule cache invalidation
  for (const trigger of invalidationTriggers) {
    await scheduleInvalidation(trigger, cacheKey);
  }
}

// Automatic cache invalidation on budget changes
async function onBudgetChanged(budgetId: UUID): Promise<void> {
  const cacheKeys = await findRelatedCacheKeys(budgetId);
  for (const key of cacheKeys) {
    await redis.del(key);
  }
  
  // Regenerate AI insights
  await generateBudgetForecast(budgetId);
}
```

### Error Handling and Fallbacks

```typescript
interface AIErrorHandler {
  onRateLimit: (retryAfter: number) => Promise<AIResponse>;
  onTimeout: (prompt: string) => Promise<AIResponse>;
  onInvalidResponse: (prompt: string, response: string) => Promise<AIResponse>;
  onAPIError: (error: Error) => Promise<AIResponse>;
}

async function generateAIResponse(
  prompt: string,
  context: BudgetContext,
  options: AIOptions
): Promise<AIResponse> {
  const cacheKey = generateCacheKey(prompt, context);
  
  // Check cache first
  const cached = await getCachedAIResponse(options.promptType, cacheKey);
  if (cached) return cached;

  try {
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[options.promptType] },
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 4000,
      timeout: options.timeout || 30000,
    });

    const parsedResponse = parseAIResponse(response);
    
    // Cache successful response
    await cacheAIResponse(
      options.promptType,
      cacheKey,
      parsedResponse,
      options.cacheTTL || 24,
      [`budget:${context.budgetId}`]
    );

    return parsedResponse;

  } catch (error) {
    if (error.status === 429) {
      // Rate limited - wait and retry once
      const retryAfter = error.headers?.['retry-after'] || 60;
      await sleep(retryAfter * 1000);
      
      const retryResponse = await openai.chat.completions.create({
        model: options.model || 'gpt-4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[options.promptType] },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 2000, // Reduced on retry
      });
      
      return parseAIResponse(retryResponse);
    }

    if (error.code === 'timeout') {
      // Fallback to simplified prompt
      return await generateFallbackResponse(prompt, context);
    }

    // Log error and return empty response
    console.error('AI generation failed:', error);
    return generateEmptyResponse(options.promptType);
  }
}

async function generateFallbackResponse(
  originalPrompt: string,
  context: BudgetContext
): Promise<AIResponse> {
  // Simplified analysis without AI
  const analysis = basicBudgetAnalysis(context);
  
  return {
    success: true,
    data: {
      risks: analysis.risks,
      recommendations: [],
      action_items: [],
    },
    meta: {
      generated_at: now(),
      model: 'fallback',
      confidence: 0.5,
      note: 'AI service unavailable. Basic analysis provided.',
    },
  };
}
```

### Prompt Versioning

```typescript
const PROMPT_VERSIONS = {
  'budget-forecast-v1': {
    version: '1.0.0',
    deprecated: false,
    migrations: [],
  },
  'budget-forecast-v2': {
    version: '2.0.0',
    deprecated: false,
    added: ['cash_flow_optimization', 'contingency_recommendations'],
    changed: ['improved_risk_scoring'],
    migrations: [],
  },
};

// Version detection and migration
async function getPromptForVersion(
  promptType: string,
  requestedVersion?: string
): Promise<string> {
  const latestVersion = getLatestVersion(promptType);
  const targetVersion = requestedVersion || latestVersion;

  let prompt = loadPrompt(promptType, targetVersion);
  
  // Apply migrations if upgrading
  const currentVersion = getCurrentVersion(promptType);
  if (currentVersion && targetVersion > currentVersion) {
    for (let v = currentVersion; v < targetVersion; v++) {
      prompt = applyMigration(prompt, `v${v}-to-v${v + 1}`);
    }
  }

  return prompt;
}
```

### Performance Monitoring

```typescript
interface AIPerformanceMetrics {
  prompt_type: string;
  model: string;
  response_time_ms: number;
  token_count: number;
  cost_usd: number;
  success: boolean;
  error_type?: string;
  cache_hit: boolean;
  user_feedback?: 'helpful' | 'neutral' | 'not_helpful';
}

async function recordAIMetrics(metrics: AIPerformanceMetrics): Promise<void> {
  await insert('ai_usage_metrics', {
    ...metrics,
    recorded_at: now(),
  });

  // Alert on degraded performance
  if (!metrics.success && metrics.error_type === 'timeout') {
    await sendAlert({
      type: 'ai_performance_degraded',
      prompt_type: metrics.prompt_type,
      error_rate: await calculateErrorRate(metrics.prompt_type),
    });
  }

  // Track costs
  await trackAICost({
    date: today(),
    prompt_type: metrics.prompt_type,
    cost_cents: metrics.cost_usd * 100,
  });
}

// Usage analytics query
async function getAIUsageStats(
  startDate: Date,
  endDate: Date
): Promise<AIUsageStats> {
  return query(`
    SELECT 
      prompt_type,
      COUNT(*) as total_requests,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
      AVG(response_time_ms) as avg_response_time,
      SUM(cost_usd) as total_cost,
      SUM(token_count) as total_tokens,
      AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hit_rate
    FROM ai_usage_metrics
    WHERE recorded_at BETWEEN $1 AND $2
    GROUP BY prompt_type
  `, [startDate, endDate]);
}
```
