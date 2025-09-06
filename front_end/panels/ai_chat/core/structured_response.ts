// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { CONTENT_THRESHOLDS, REGEX_PATTERNS } from '../core/Constants.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('structured_response');

export interface StructuredResponse {
  reasoning: string;
  markdownReport: string;
}

// Parse <reasoning> and <markdown_report> wrapped content from a model answer
export function parseStructuredResponse(text: string): StructuredResponse | null {
  try {
    const reasoningMatch = text.match(REGEX_PATTERNS.REASONING_TAG);
    const reportMatch = text.match(REGEX_PATTERNS.MARKDOWN_REPORT_TAG);
    if (reasoningMatch && reportMatch) {
      const reasoning = reasoningMatch[1]?.trim() ?? '';
      const markdownReport = reportMatch[1]?.trim() ?? '';
      if (reasoning && markdownReport && markdownReport.length >= CONTENT_THRESHOLDS.MARKDOWN_REPORT_MIN_LENGTH) {
        return { reasoning, markdownReport };
      }
    }
  } catch (error) {
    logger.error('Failed to parse structured response', error);
  }
  return null;
}

// Create a stable key for a structured response
export function getMessageStateKey(structuredResponse: StructuredResponse): string {
  const content = structuredResponse.reasoning + structuredResponse.markdownReport;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + bytes[i];
    // eslint-disable-next-line no-bitwise
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

