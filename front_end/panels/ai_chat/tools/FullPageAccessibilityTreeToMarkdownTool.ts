// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Tool, ErrorResult } from './Tools.js';
import { AgentService } from '../core/AgentService.js';
import { OpenAIClient } from '../core/OpenAIClient.js';
import { GetAccessibilityTreeTool } from './Tools.js';

export interface FullPageAccessibilityTreeToMarkdownResult {
  success: boolean;
  markdown: string;
  treeLength: number;
  truncated: boolean;
  metadata?: { url: string, title: string };
}

export class FullPageAccessibilityTreeToMarkdownTool implements Tool<Record<string, unknown>, FullPageAccessibilityTreeToMarkdownResult | ErrorResult> {
  name = 'accessibility_tree_full_to_markdown';
  description = 'Gets the full page accessibility tree, sends it to an LLM, and returns a Markdown summary of the entire tree.';

  schema = {
    type: 'object',
    properties: {},
  };

  private getSystemPrompt(): string {
    return `You are an expert Markdown tool. 
    Your job is to examine the provided simplified accessibility tree and transform it into Markdown.
    Do not invent content; only use what is present in the tree.
    CRITICAL RULE: The output should represent the entire tree content. If the tree is empty or unavailable, return a Markdown message stating so.`;
  }

  async execute(_args: Record<string, unknown>): Promise<FullPageAccessibilityTreeToMarkdownResult | ErrorResult> {
    const getAccTreeTool = new GetAccessibilityTreeTool();
    const treeResult = await getAccTreeTool.execute({ reasoning: 'Get full accessibility tree for Markdown conversion' });
    if ('error' in treeResult) {
      return { error: treeResult.error };
    }
    const accessibilityTreeString = treeResult.simplified;
    if (!accessibilityTreeString || accessibilityTreeString.trim() === '') {
      return { error: 'Empty or blank tree content.' };
    }

    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    if (!apiKey) {
      return { error: 'API key not configured.' };
    }
    const modelName = 'gpt-4.1-nano-2025-04-14';

    const prompt = `Accessibility Tree:\n\n\`\`\`\n${accessibilityTreeString}\n\`\`\``;

    try {
      const openAIResponse = await OpenAIClient.callOpenAI(
        apiKey,
        modelName,
        prompt,
        { systemPrompt: this.getSystemPrompt() }
      );
      if (openAIResponse.text) {
        return {
          success: true,
          markdown: openAIResponse.text,
          treeLength: accessibilityTreeString.length,
          truncated: false,
          metadata: treeResult.iframes && treeResult.iframes.length > 0 ? { title: 'Contains iframes', url: '' } : undefined,
        };
      }
      return { error: 'No Markdown response from OpenAI.' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
