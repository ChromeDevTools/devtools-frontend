// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMJudgeResult } from '../framework/types.js';
import { createLogger } from '../../core/Logger.js';

const logger = createLogger('ResponseParsingUtils');

/**
 * Utility class for parsing LLM responses and extracting structured data
 * Consolidates JSON parsing logic from LLMEvaluator and VisionLLMEvaluator
 */
export class ResponseParsingUtils {
  
  /**
   * Parse dimensions object with fallback to default scores
   */
  private static parseDimensions(
    dimensions: unknown, 
    fallbackScore: number
  ): { completeness: number; accuracy: number; structure: number; relevance: number; } {
    if (dimensions && typeof dimensions === 'object') {
      const dims = dimensions as Record<string, unknown>;
      return {
        completeness: typeof dims.completeness === 'number' ? dims.completeness : fallbackScore,
        accuracy: typeof dims.accuracy === 'number' ? dims.accuracy : fallbackScore,
        structure: typeof dims.structure === 'number' ? dims.structure : fallbackScore,
        relevance: typeof dims.relevance === 'number' ? dims.relevance : fallbackScore,
      };
    }
    
    return {
      completeness: fallbackScore,
      accuracy: fallbackScore,
      structure: fallbackScore,
      relevance: fallbackScore,
    };
  }
  
  
  /**
   * Parse OpenAI API response structure to extract content
   */
  static extractContentFromAPIResponse(apiResponse: Record<string, unknown>): string {
    try {
      const choices = apiResponse.choices as Array<Record<string, unknown>> | undefined;
      const message = choices?.[0]?.message as Record<string, unknown> | undefined;
      const content = message?.content;
      
      if (!content || typeof content !== 'string') {
        throw new Error('No content found in API response');
      }
      
      return content;
    } catch (error) {
      logger.error('Failed to extract content from API response:', error);
      throw new Error(`Invalid API response structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Safe parsing with multiple fallback strategies
   */
  static safeParseJudgment(
    response: string, 
    options: { 
      isVision?: boolean; 
      context?: string; 
      allowFallback?: boolean;
    } = {}
  ): LLMJudgeResult {
    const { context, allowFallback = true } = options;
    
    try {
      // Parse JSON from response
      let parsed: unknown;
      
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid response: expected non-empty string');
      }
      
      // Try direct JSON parse first
      try {
        parsed = JSON.parse(response);
      } catch {
        // Try extracting from markdown code blocks
        const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
          try {
            parsed = JSON.parse(codeBlockMatch[1].trim());
          } catch {
            // Continue to next method
          }
        }
        
        // Try extracting JSON object from text
        if (!parsed) {
          const jsonStart = response.indexOf('{');
          const jsonEnd = response.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            parsed = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
          }
        }
      }
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Could not parse JSON from response');
      }
      
      const judgment = parsed as Record<string, unknown>;
      
      // Basic validation
      if (typeof judgment.passed !== 'boolean' || typeof judgment.score !== 'number') {
        throw new Error('Invalid judgment format: missing required fields (passed, score)');
      }
      
      return {
        passed: judgment.passed,
        score: Math.max(0, Math.min(100, judgment.score)),
        explanation: String(judgment.explanation || 'No explanation provided'),
        issues: Array.isArray(judgment.issues) ? judgment.issues.map(String) : [],
        confidence: typeof judgment.confidence === 'number' 
          ? Math.max(0, Math.min(100, judgment.confidence)) 
          : undefined,
        dimensions: this.parseDimensions(judgment.dimensions, judgment.score),
        visualEvidence: judgment.visualEvidence ? String(judgment.visualEvidence) : undefined
      };
      
    } catch (error) {
      logger.error(`Judgment parsing failed${context ? ` in ${context}` : ''}:`, error);
      
      if (allowFallback) {
        // Fallback parsing strategy
        logger.warn(`Using fallback parsing for response in ${context}`);
        
        const responseText = response.toLowerCase();
        const passed = responseText.includes('passed') || 
                       responseText.includes('success') ||
                       responseText.includes('completed');
        
        const scoreMatch = response.match(/\b(\d{1,3})\b/);
        const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
        const score = extractedScore !== null && extractedScore <= 100 ? 
                      extractedScore : 
                      (passed ? 75 : 25);
        
        return {
          passed,
          score,
          issues: ['Failed to parse structured LLM judgment - used text analysis fallback'],
          explanation: `Parsing failed, extracted meaning from text. Original response: ${response.substring(0, 150)}...`,
          confidence: 10
        };
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Utility to clean response text before parsing
   */
  static cleanResponseText(response: string): string {
    return response
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');
  }
}