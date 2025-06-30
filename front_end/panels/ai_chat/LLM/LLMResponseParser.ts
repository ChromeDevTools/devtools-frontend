// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import type { UnifiedLLMResponse, ParsedLLMAction } from './LLMTypes.js';

const logger = createLogger('LLMResponseParser');

/**
 * Utility class for parsing and processing LLM responses
 */
export class LLMResponseParser {
  /**
   * Parse strict JSON from LLM response, handling common formatting issues
   */
  static parseStrictJSON(text: string): any {
    // Trim whitespace
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Remove any leading/trailing text that's not part of JSON
    const jsonMatch = jsonText.match(/\{.*\}/s) || jsonText.match(/\[.*\]/s);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Try to parse
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      // Log the problematic text for debugging
      logger.error('Failed to parse JSON after cleanup:', {
        original: text,
        cleaned: jsonText,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Unable to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse unified response to determine action type
   * Equivalent to OpenAIClient.parseOpenAIResponse
   */
  static parseResponse(response: UnifiedLLMResponse): ParsedLLMAction {
    // Check for function calls first
    if (response.functionCall) {
      return {
        type: 'tool_call',
        name: response.functionCall.name,
        args: response.functionCall.arguments,
      };
    }

    // Process text response
    if (response.text) {
      const rawContent = response.text;
      
      // Attempt to parse text as JSON tool call (fallback for some models)
      if (rawContent.trim().startsWith('{') && rawContent.includes('"action":"tool"')) {
        try {
          const contentJson = JSON.parse(rawContent);
          if (contentJson.action === 'tool' && contentJson.toolName) {
            return {
              type: 'tool_call',
              name: contentJson.toolName,
              args: contentJson.toolArgs || {},
            };
          }
          // Fallback to treating it as text if JSON structure is not a valid tool call
          return { type: 'final_answer', answer: rawContent };
        } catch (e) {
          // If JSON parsing fails, treat it as plain text
          return { type: 'final_answer', answer: rawContent };
        }
      } else {
        // Treat as plain text final answer
        return { type: 'final_answer', answer: rawContent };
      }
    }

    return {
      type: 'error',
      error: 'No valid response from LLM',
    };
  }

  /**
   * Enhanced JSON parsing with multiple fallback strategies
   */
  static parseJSONWithFallbacks(text: string): any {
    const strategies = [
      // Strategy 1: Direct parsing
      () => JSON.parse(text),
      
      // Strategy 2: Trim and parse
      () => JSON.parse(text.trim()),
      
      // Strategy 3: Remove markdown code blocks
      () => {
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        return JSON.parse(cleaned);
      },
      
      // Strategy 4: Extract JSON from text
      () => {
        const jsonMatch = text.match(/\{.*\}/s) || text.match(/\[.*\]/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found in text');
      },
      
      // Strategy 5: Fix common JSON issues
      () => {
        let fixed = text.trim();
        
        // Fix single quotes to double quotes
        fixed = fixed.replace(/'/g, '"');
        
        // Fix trailing commas
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unquoted keys (basic attempt)
        fixed = fixed.replace(/(\w+):/g, '"$1":');
        
        return JSON.parse(fixed);
      },
    ];

    let lastError: Error | undefined;
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i]();
        if (i > 0) {
          logger.warn(`JSON parsed using fallback strategy ${i + 1}`, {
            originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            strategy: i + 1,
          });
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }
    
    // All strategies failed
    logger.error('All JSON parsing strategies failed:', {
      text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      lastError: lastError?.message,
    });
    
    throw new Error(`JSON parsing failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Validate and clean JSON response for strict mode
   */
  static validateStrictJSON(text: string): { isValid: boolean; cleaned?: string; error?: string } {
    try {
      // Try direct parsing first
      JSON.parse(text.trim());
      return { isValid: true, cleaned: text.trim() };
    } catch (directError) {
      try {
        // Try with fallback strategies
        const parsed = this.parseJSONWithFallbacks(text);
        const cleaned = JSON.stringify(parsed);
        return { isValid: true, cleaned };
      } catch (fallbackError) {
        return {
          isValid: false,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        };
      }
    }
  }

  /**
   * Extract structured data from free-form text response
   */
  static extractStructuredData(text: string, expectedFields: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Try JSON parsing first
    try {
      const parsed = this.parseJSONWithFallbacks(text);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      // Fall back to text extraction
    }
    
    // Extract fields using pattern matching
    for (const field of expectedFields) {
      const patterns = [
        new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i'),
        new RegExp(`${field}\\s*:\\s*"([^"]*)"`, 'i'),
        new RegExp(`${field}\\s*:\\s*([^,}\\n]*)`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          result[field] = match[1].trim();
          break;
        }
      }
    }
    
    return result;
  }

  /**
   * Enhance response with parsed structured data
   */
  static enhanceResponse(response: UnifiedLLMResponse, options: {
    strictJsonMode?: boolean;
    expectedFields?: string[];
  } = {}): UnifiedLLMResponse {
    const enhanced = { ...response };
    
    if (options.strictJsonMode && response.text) {
      try {
        enhanced.parsedJson = this.parseStrictJSON(response.text);
      } catch (error) {
        logger.error('Strict JSON parsing failed:', {
          error: error instanceof Error ? error.message : String(error),
          responseText: response.text,
        });
        // Don't throw here, just log the error
      }
    }
    
    if (options.expectedFields && response.text) {
      try {
        const structuredData = this.extractStructuredData(response.text, options.expectedFields);
        if (Object.keys(structuredData).length > 0) {
          enhanced.parsedJson = { ...enhanced.parsedJson, ...structuredData };
        }
      } catch (error) {
        logger.warn('Structured data extraction failed:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return enhanced;
  }

  /**
   * Check if response appears to be valid JSON
   */
  static isValidJSON(text: string): boolean {
    try {
      JSON.parse(text.trim());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get JSON parsing suggestions for failed responses
   */
  static getJSONParsingSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      suggestions.push('Response should start with { or [');
    }
    
    if (!text.trim().endsWith('}') && !text.trim().endsWith(']')) {
      suggestions.push('Response should end with } or ]');
    }
    
    if (text.includes("'")) {
      suggestions.push('Use double quotes (") instead of single quotes (\')');
    }
    
    if (text.match(/,(\s*[}\]])/)) {
      suggestions.push('Remove trailing commas before } or ]');
    }
    
    if (text.match(/\w+:/)) {
      suggestions.push('Ensure all object keys are quoted');
    }
    
    return suggestions;
  }
}