// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { AgentService } from '../core/AgentService.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

import { GetAccessibilityTreeTool, type Tool, type ErrorResult } from './Tools.js';

export interface FullPageAccessibilityTreeToMarkdownResult {
  success: boolean;
  markdown: string;
  treeLength: number;
  truncated: boolean;
  metadata?: { url: string, title?: string, urls?: string };
}

export class FullPageAccessibilityTreeToMarkdownTool implements Tool<Record<string, unknown>, FullPageAccessibilityTreeToMarkdownResult | ErrorResult> {
  name = 'accessibility_tree_full_to_markdown';
  description = 'Gets the full page accessibility tree, sends it to an LLM, and returns a Markdown summary of the entire tree.';

  private async createToolTracingObservation(toolName: string, args: any): Promise<void> {
    try {
      const { getCurrentTracingContext, createTracingProvider } = await import('../tracing/TracingConfig.js');
      const context = getCurrentTracingContext();
      if (context) {
        const tracingProvider = createTracingProvider();
        await tracingProvider.createObservation({
          id: `event-tool-execute-${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `Tool Execute: ${toolName}`,
          type: 'event',
          startTime: new Date(),
          input: { 
            toolName, 
            toolArgs: args,
            contextInfo: `Direct tool execution in ${toolName}`
          },
          metadata: {
            executionPath: 'direct-tool',
            toolName
          }
        }, context.traceId);
      }
    } catch (tracingError) {
      // Don't fail tool execution due to tracing errors
      console.error(`[TRACING ERROR in ${toolName}]`, tracingError);
    }
  }

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
    await this.createToolTracingObservation(this.name, _args);
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
    const { model, provider } = AIChatPanel.getNanoModelWithProvider();

    const prompt = `Accessibility Tree:\n\n\`\`\`\n${accessibilityTreeString}\n\`\`\``;

    try {
      const llm = LLMClient.getInstance();
      const llmResponse = await llm.call({
        provider,
        model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        systemPrompt: this.getSystemPrompt(),
        temperature: 0.7
      });
      const response = llmResponse.text;
      if (response) {
        return {
          success: true,
          markdown: response,
          treeLength: accessibilityTreeString.length,
          truncated: false,
          metadata: {
            ...(treeResult.iframes && treeResult.iframes.length > 0 && { title: 'Contains iframes' }),
            ...(treeResult.idToUrl && Object.keys(treeResult.idToUrl).length > 0 && { 
              urls: Object.values(treeResult.idToUrl).slice(0, 5).join(', ') // Include up to 5 URLs found
            }),
            url: ''
          },
        };
      }
      return { error: 'No Markdown response from LLM.' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
