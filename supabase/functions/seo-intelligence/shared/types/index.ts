import type { Database } from "./database.types";

// Table row types (convenience aliases)
export type ContentStrategy =
  Database["public"]["Tables"]["content_strategy"]["Row"];
export type ContentStrategyInsert =
  Database["public"]["Tables"]["content_strategy"]["Insert"];
export type ContentStrategyUpdate =
  Database["public"]["Tables"]["content_strategy"]["Update"];

export type SeoPage = Database["public"]["Tables"]["seo_pages"]["Row"];
export type SeoPageInsert = Database["public"]["Tables"]["seo_pages"]["Insert"];
export type SeoPageUpdate = Database["public"]["Tables"]["seo_pages"]["Update"];

export type CompetitorTracking =
  Database["public"]["Tables"]["competitor_tracking"]["Row"];
export type CompetitorTrackingInsert =
  Database["public"]["Tables"]["competitor_tracking"]["Insert"];
export type CompetitorTrackingUpdate =
  Database["public"]["Tables"]["competitor_tracking"]["Update"];

export type ProgrammaticTemplate =
  Database["public"]["Tables"]["programmatic_templates"]["Row"];
export type ProgrammaticTemplateInsert =
  Database["public"]["Tables"]["programmatic_templates"]["Insert"];
export type ProgrammaticTemplateUpdate =
  Database["public"]["Tables"]["programmatic_templates"]["Update"];

export type ProgrammaticPage =
  Database["public"]["Tables"]["programmatic_pages"]["Row"];
export type ProgrammaticPageInsert =
  Database["public"]["Tables"]["programmatic_pages"]["Insert"];
export type ProgrammaticPageUpdate =
  Database["public"]["Tables"]["programmatic_pages"]["Update"];

export type SeoAuditResult =
  Database["public"]["Tables"]["seo_audit_results"]["Row"];
export type SeoAuditResultInsert =
  Database["public"]["Tables"]["seo_audit_results"]["Insert"];

export type ConversionTracking =
  Database["public"]["Tables"]["conversion_tracking"]["Row"];
export type ConversionTrackingInsert =
  Database["public"]["Tables"]["conversion_tracking"]["Insert"];

export type SeoPerformance =
  Database["public"]["Tables"]["seo_performance"]["Row"];
export type SeoPerformanceInsert =
  Database["public"]["Tables"]["seo_performance"]["Insert"];

export type SeoAutomationConfig =
  Database["public"]["Tables"]["seo_automation_config"]["Row"];

// Domain-specific interfaces

export interface AuditIssue {
  type: "error" | "warning" | "info";
  category: "content" | "technical" | "on_page" | "backlinks";
  message: string;
  element?: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
}

export interface AuditResult {
  seo_page_id: string;
  audit_type: "full" | "content" | "technical" | "on_page" | "backlinks";
  overall_score: number;
  content_score: number;
  technical_score: number;
  on_page_score: number;
  issues: AuditIssue[];
  recommendations: string[];
}

export interface ContentGenerationRequest {
  template_id: string;
  variables: Record<string, string>;
  target_keyword: string;
  secondary_keywords?: string[];
  tone?: "professional" | "casual" | "authoritative" | "friendly";
  target_word_count?: number;
}

export interface ContentGenerationResult {
  title: string;
  slug: string;
  meta_description: string;
  content: string;
  quality_score: number;
  keyword_density: number;
  readability_score: number;
}

export interface CompetitorAnalysis {
  competitor_domain: string;
  keyword: string;
  their_position: number;
  our_position: number | null;
  content_gaps: string[];
  opportunity_score: number;
  recommended_actions: string[];
}

export interface PerformanceSnapshot {
  seo_page_id: string;
  keyword: string;
  date: string;
  position: number;
  previous_position: number | null;
  position_change: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface PageHealthReport {
  page_id: string;
  url_path: string;
  health_status: "critical" | "warning" | "ok";
  seo_score: number;
  content_score: number;
  technical_score: number;
  issues: AuditIssue[];
  priority_actions: string[];
}

export interface StrategyProgress {
  strategy_id: string;
  name: string;
  completion_pct: number;
  traffic_achievement_pct: number;
  pages_remaining: number;
  estimated_completion_date?: string;
}

// Orchestration types

export type TierLevel = "tier1-strategy" | "tier2-execution" | "tier3-quality";

export interface OrchestrationTask {
  id: string;
  tier: TierLevel;
  action: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface PipelineConfig {
  strategy_id?: string;
  template_id?: string;
  target_keywords: string[];
  auto_publish: boolean;
  min_quality_score: number;
  max_pages_per_run: number;
}

export type { Database };
