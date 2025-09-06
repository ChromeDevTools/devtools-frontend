// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMMessage, TextContent, ImageContent, FileContent } from './LLMTypes.js';

/**
 * Deep clone helper to avoid mutating original messages.
 */
function deepClone<T>(obj: T): T {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

/**
 * Sanitization options for capability-aware message preparation.
 */
export interface SanitizationOptions {
  visionCapable: boolean;
  /**
   * If true, when a message becomes empty after stripping image/file parts,
   * replace it with a concise placeholder string.
   */
  placeholderForImageOnly?: boolean;
}

/**
 * Remove image and file parts for models that do not support vision, while preserving
 * textual content and message roles. Ensures resulting messages remain valid for providers
 * that expect either string content or an array with only text parts.
 */
export function sanitizeMessagesForModel(
  messages: LLMMessage[],
  options: SanitizationOptions
): LLMMessage[] {
  const { visionCapable, placeholderForImageOnly } = options;

  // Fast path: if the model supports vision, return a deep clone to avoid side effects.
  if (visionCapable) {
    return deepClone(messages);
  }

  const sanitized: LLMMessage[] = [];

  for (const msg of messages) {
    const cloned: LLMMessage = deepClone(msg);

    // Only sanitize the content field; keep tool_calls, tool_call_id, name, role as-is.
    const content = cloned.content;

    if (content === undefined) {
      sanitized.push(cloned);
      continue;
    }

    if (typeof content === 'string') {
      // Plain text content is always safe.
      sanitized.push(cloned);
      continue;
    }

    // content is an array of parts; filter out non-text parts for non-vision models.
    const parts = content as Array<TextContent | ImageContent | FileContent>;
    const filteredParts = parts.filter(part => {
      // Keep only text parts; drop image_url and file parts.
      // Also future-proof for any { type: 'image' } style parts.
      return (typeof part === 'object' && 'type' in part && part.type === 'text');
    });

    if (filteredParts.length === 0) {
      // Message was image/file-only. Replace with explicit text indicating no image available.
      if (placeholderForImageOnly) {
        cloned.content = [{ type: 'text', text: 'Image omitted (model lacks vision).' }] as any;
      } else {
        // If we don't want placeholders, set to empty string to keep message valid.
        cloned.content = '';
      }
    } else if (filteredParts.length === 1 && (filteredParts[0] as any).type === 'text') {
      // Collapse single text part into a plain string for compatibility/simplicity.
      cloned.content = (filteredParts[0] as any).text || '';
    } else {
      cloned.content = filteredParts as any;
    }

    sanitized.push(cloned);
  }

  return sanitized;
}
