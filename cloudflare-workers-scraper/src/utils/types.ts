/**
 * Request body for extract endpoint
 */
export interface ExtractRequest {
  url: string;
  format?: 'json' | 'csv' | 'xml' | 'markdown' | 'pdf';
  options?: ExtractOptions;
}

/**
 * Extraction options
 */
export interface ExtractOptions {
  extractMainContent?: boolean;
  removeScripts?: boolean;
  removeStyles?: boolean;
  includeMetadata?: boolean;
  customSelectors?: {
    title?: string;
    content?: string;
    author?: string;
  };
}

/**
 * Extracted content
 */
export interface ExtractedContent {
  title: string;
  author?: string;
  publishedDate?: string;
  body: string;
  metadata?: {
    description?: string;
    keywords?: string[];
    openGraph?: Record<string, string>;
  };
}

/**
 * API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Stats
 */
export interface ExtractionStats {
  processingTime: string;
  contentLength?: number;
  wordCount?: number;
  readingTime?: string;
}
