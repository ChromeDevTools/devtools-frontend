// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js'; // Import Common for EventTarget promises
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Logs from '../../../models/logs/logs.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('Tools');

/**
 * Helper function to create tracing observation for any tool execution
 */
async function createToolTracingObservation(toolName: string, args: any): Promise<void> {
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

// Value imports first, then types, ordered correctly
import type { AccessibilityNode } from '../common/context.js';
import type { LogLine } from '../common/log.js';
import * as Utils from '../common/utils.js';
import { getXPathByBackendNodeId } from '../common/utils.js';
import { AgentService } from '../core/AgentService.js';
import type { DevToolsContext } from '../core/State.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';
import { ChatMessageEntity } from '../ui/ChatView.js';

// Type imports

import { CombinedExtractionTool, type CombinedExtractionResult } from './CombinedExtractionTool.js';
import { FetcherTool, type FetcherToolResult, type FetcherToolArgs } from './FetcherTool.js';
import { FinalizeWithCritiqueTool, type FinalizeWithCritiqueResult } from './FinalizeWithCritiqueTool.js';
import { FullPageAccessibilityTreeToMarkdownTool, type FullPageAccessibilityTreeToMarkdownResult } from './FullPageAccessibilityTreeToMarkdownTool.js';
import { HTMLToMarkdownTool, type HTMLToMarkdownResult } from './HTMLToMarkdownTool.js';
import { SchemaBasedExtractorTool, type SchemaExtractionResult, type SchemaDefinition } from './SchemaBasedExtractorTool.js';
import { VisitHistoryManager, type VisitData } from './VisitHistoryManager.js';

/**
 * Base interface for all tools
 */
export interface Tool<TArgs = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  execute: (args: TArgs) => Promise<TResult>;
  schema: {
    type: string,
    properties: Record<string, unknown>,
    required?: string[],
  };
}

/**
 * Type for element inspection result
 */
export interface ElementInspectionResult {
  found: boolean;
  tagName?: string;
  id?: string;
  classList?: string[];
  attributes?: Record<string, string>;
  boundingRect?: {
    top: number,
    right: number,
    bottom: number,
    left: number,
    width: number,
    height: number,
  };
  styles?: Record<string, string>;
}

/**
 * Type for JavaScript execution result
 */
export interface JavaScriptExecutionResult {
  result: unknown;
  type: string;
  exceptionDetails?: unknown;
}

/**
 * Type for console logs result
 */
export interface ConsoleLogsResult {
  messages: Array<{
    text: string,
    level: string,
    timestamp: number,
    url?: string,
    lineNumber?: number,
  }>;
  total: number;
}

/**
 * Type for error result
 */
export interface ErrorResult {
  error: string;
}

/**
 * Type for network analysis result
 */
export interface NetworkAnalysisResult {
  requests: Array<{
    url: string,
    method: string,
    status: number,
    statusText: string,
    headers: Record<string, string>,
    response: {
      headers: Record<string, string>,
      body: string,
    },
  }>;
}

/**
 * Type for navigation result
 */
export interface NavigationResult {
  success: boolean;
  url: string;
  message: string;
  metadata?: { url: string, title: string };
}

/**
 * Type for page HTML result
 */
export interface PageHTMLResult {
  html: string;
  documentTitle: string;
  url: string;
  metadata?: {
    description?: string,
    keywords?: string,
    author?: string,
    [key: string]: string | undefined,
  };
  structure?: {
    headings: Array<{ level: number, text: string }>,
    mainContent?: string,
    navigation?: string,
  };
}

/**
 * Type for click element result
 */
export interface ClickElementResult {
  success: boolean;
  message: string;
  elementInfo?: {
    tagName: string,
    text?: string,
    href?: string,
  };
}

/**
 * Type for search content result
 */
export interface SearchContentResult {
  matches: Array<{
    text: string,
    context: string,
    elementInfo: {
      tagName: string,
      selector: string,
    },
  }>;
  totalMatches: number;
}

/**
 * Type for scroll result
 */
export interface ScrollResult {
  success: boolean;
  message: string;
  position?: {
    x: number,
    y: number,
  };
}

/**
 * Type for screenshot result
 */
export interface ScreenshotResult {
  success: boolean;
  dataUrl?: string;
  message: string;
}

/**
 * Type for accessibility tree result
 */
export interface AccessibilityTreeResult {
  simplified: string;
  iframes: Array<{
    role: string,
    nodeId?: string,
    contentTree?: Array<{
      role: string,
      name?: string,
      description?: string,
      nodeId?: string,
      children?: any[],
    }>,
    contentSimplified?: string,
  }>;
  /**
   * Raw accessibility nodes from the tree for direct node manipulation
   */
  nodes?: Protocol.Accessibility.AXNode[];
  /**
   * Mapping of nodeId to URL for nodes that have URLs
   */
  idToUrl?: Record<string, string>;
  /**
   * Mapping of backendNodeId to xpath
   */
  xpathMap?: Record<number, string>;
  /**
   * Mapping of backendNodeId to tagName
   */
  tagNameMap?: Record<number, string>;
}

/**
 * Type for perform action result
 */
export interface PerformActionResult {
  xpath: string;
  pageChange: {
    hasChanges: boolean;
    summary: string;
    added: string[];
    removed: string[];
    modified: string[];
    hasMore: {
      added: boolean;
      removed: boolean;
      modified: boolean;
    };
  };
}

/**
 * Result type for the new tool
 */
export interface ObjectiveDrivenActionResult {
  success: boolean;
  message: string;
  finalAction?: {
    method: string,
    nodeId: number,
    args?: unknown,
    xpath?: string,
  };
  method: string;
  nodeId: number;
  args?: unknown;
  xpath?: string;
  processedLength: number;
  totalLength: number;
  truncated: boolean;
  metadata?: { url: string, title: string };
  treeDiff?: {
    hasChanges: boolean;
    summary: string;
    added: string[];
    removed: string[];
    modified: string[];
    hasMore: {
      added: boolean;
      removed: boolean;
      modified: boolean;
    };
  } | null;
}

/**
 * Type for NodeIDs to URLs result
 */
export interface NodeIDsToURLsResult {
  urls: Array<{
    nodeId: number,
    url?: string,
  }>;
}

/**
 * Result type for the schema-based data extraction tool
 */
export interface SchemaBasedDataExtractionResult {
  success: boolean;
  message: string;
  jsonData: string;
  processedLength: number;
  totalLength: number;
  truncated: boolean;
  metadata?: { url: string, title: string };
}

/**
 * Tool for executing JavaScript in the page context
 */
export class ExecuteJavaScriptTool implements Tool<{ code: string }, JavaScriptExecutionResult | ErrorResult> {
  name = 'execute_javascript';
  description = 'Executes JavaScript code in the page context';

  async execute(args: { code: string }): Promise<JavaScriptExecutionResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    logger.info('execute_javascript', args);
    const code = args.code;
    if (typeof code !== 'string') {
      return { error: 'Code must be a string' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Execute the JavaScript in the page context
      const result = await target.runtimeAgent().invoke_evaluate({
        expression: code,
        returnByValue: true,
        generatePreview: true,
      });

      logger.info('execute_javascript result', result);

      if (result.exceptionDetails) {
        return {
          error: `JavaScript execution failed: ${result.exceptionDetails.text}`,
          exceptionDetails: result.exceptionDetails,
        };
      }

      return {
        result: result.result.value,
        type: result.result.type,
      };
    } catch (error) {
      return { error: `Failed to execute JavaScript: ${error.message}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'JavaScript code to execute in the page context',
      },
    },
    required: ['code'],
  };
}

/**
 * Tool for analyzing network requests
 */
export class NetworkAnalysisTool implements Tool<{ url?: string, limit?: number }, NetworkAnalysisResult | ErrorResult> {
  name = 'analyze_network';
  description = 'Analyzes network requests, optionally filtered by URL pattern';

  async execute(args: { url?: string, limit?: number }): Promise<NetworkAnalysisResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    const url = args.url;
    const limit = args.limit || 10;

    try {
      // Get network manager
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return { error: 'Primary page target not available' };
      }

      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      if (!networkManager) {
        return { error: 'Network manager not available' };
      }

      // Get network requests from NetworkLog
      const requests = Logs.NetworkLog.NetworkLog.instance().requests();

      // Filter by URL if provided
      const filteredRequests = url ? requests.filter(request => request.url().includes(url)) : requests;

      // Take only the specified limit
      const limitedRequests = filteredRequests.slice(-limit);

      // Map to simplified objects
      const mappedRequests =
        await Promise.all(limitedRequests.map(async (request: SDK.NetworkRequest.NetworkRequest) => {
          const requestHeaders = request.requestHeaders();
          const responseHeaders = request.responseHeaders;

          const requestHeadersMap: Record<string, string> = {};
          const responseHeadersMap: Record<string, string> = {};

          requestHeaders.forEach((header: SDK.NetworkRequest.NameValue) => {
            requestHeadersMap[header.name] = header.value;
          });

          responseHeaders.forEach((header: SDK.NetworkRequest.NameValue) => {
            responseHeadersMap[header.name] = header.value;
          });

          let responseBody = '';
          try {
            const contentData = await request.requestContentData();
            if ('error' in contentData) {
              responseBody = contentData.error;
            } else {
              responseBody = contentData.text;
            }
          } catch {
            // Ignore content errors
          }

          return {
            url: request.url(),
            method: request.requestMethod,
            status: request.statusCode,
            statusText: request.statusText,
            headers: requestHeadersMap,
            response: {
              headers: responseHeadersMap,
              body: responseBody,
            },
          };
        }));

      return {
        requests: mappedRequests,
      };
    } catch (error) {
      return { error: `Failed to analyze network: ${error.message}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL pattern to filter requests (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of requests to return (default: 10)',
      },
    },
  };
}

/**
 * Tool for navigating to a URL
 */
/**
 * Result type for the navigate back tool
 */
export interface NavigateBackResult {
  success: boolean;
  message: string;
  steps: number;
  metadata?: { url: string, title: string };
}

/**
 * Helper function to wait for the page load event with a timeout.
 * @param target The SDK.Target.Target to monitor.
 * @param timeoutMs The timeout duration in milliseconds.
 * @returns A promise that resolves when the load event occurs or rejects on timeout/error.
 */
export async function waitForPageLoad(target: SDK.Target.Target, timeoutMs: number): Promise<void> {
  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  if (!resourceTreeModel) {
    throw new Error('ResourceTreeModel not found for target.');
  }
  const runtimeAgent = target.runtimeAgent();
  if (!runtimeAgent) {
    throw new Error('RuntimeAgent not found for target.');
  }

  let loadEventListener: Common.EventTarget.EventDescriptor | null = null;
  let overallTimeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    // 1. Overall Timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      overallTimeoutId = setTimeout(() => {
        logger.warn(`waitForPageLoad: Overall timeout reached after ${timeoutMs}ms`);
        reject(new Error(`Page load timed out after ${timeoutMs}ms (Overall)`));
      }, timeoutMs);
    });

    // 2. Load Event Promise
    const loadPromise = new Promise<void>(resolve => {
      // Attach listener - Load event should fire even if already loaded.
      loadEventListener = resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, () => {
        logger.info('waitForPageLoad: Load event received.');
        resolve();
      });
    });

    // 3. LCP Promise (via injected script)
    const lcpPromise = (async (): Promise<void> => {
      // Internal timeout slightly less than the main one, minimum 100ms
      const internalTimeout = Math.max(100, timeoutMs - 100);
      const expression = `
        new Promise((resolve, reject) => {
          let observer;
          const timeoutId = setTimeout(() => {
            if (observer) observer.disconnect();
            // Don't reject, just resolve with a "timeout" status
            // This allows the main race to continue waiting for 'load' or the overall timeout
            resolve('LCP observer timed out internally after ${internalTimeout}ms.');
          }, ${internalTimeout});

          try {
            observer = new PerformanceObserver((entryList) => {
              if (entryList.getEntriesByType('largest-contentful-paint').length > 0) {
                clearTimeout(timeoutId);
                observer.disconnect();
                resolve('LCP detected');
              }
            });
            // Use buffered: true to capture LCP if it happened before the observer started
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch (e) {
            clearTimeout(timeoutId);
            // Don't reject, resolve with an error status
            resolve('Failed to set up LCP PerformanceObserver: ' + (e instanceof Error ? e.message : String(e)));
          }
        })
      `;
      try {
        logger.info('waitForPageLoad: Starting LCP observer...');
        const result = await runtimeAgent.invoke_evaluate({
          expression,
          awaitPromise: true, // Wait for the script's promise
          returnByValue: true, // Get the resolution value (string)
          silent: true, // Reduce console noise from evaluation itself
        });

        if (result.exceptionDetails) {
          logger.warn(`waitForPageLoad: LCP observer script failed evaluation: ${result.exceptionDetails.text}`);
          // Evaluation failed, LCP won't resolve successfully.
          // Return a promise that never resolves to take it out of the race.
          return new Promise(() => { });
        }

        const lcpStatus = result.result.value as string;
        if (lcpStatus === 'LCP detected') {
          logger.info('waitForPageLoad: LCP detected via observer.');
          // Resolve the outer lcpPromise successfully
          return Promise.resolve();
        }
          // LCP observer timed out internally or failed setup
          logger.warn(`waitForPageLoad: LCP observer finished with status: "${lcpStatus}"`);
          // Return a promise that never resolves.
          return new Promise(() => { });

      } catch (error) {
        // Catch errors invoking evaluate itself
        logger.warn(`waitForPageLoad: Error invoking LCP observer script: ${error instanceof Error ? error.message : String(error)}`);
        // Invocation failed, LCP won't resolve. Return a promise that never resolves.
        return await new Promise(() => { });
      }
    })();

    // 4. Race the promises: Wait for the first of load, LCP success, or overall timeout
    logger.info(`waitForPageLoad: Waiting for Load event, LCP, or timeout (${timeoutMs}ms)...`);
    await Promise.race([loadPromise, lcpPromise, timeoutPromise]);
    logger.info('waitForPageLoad: Race finished (Load, LCP, or Timeout).');

  } catch (error) {
    // This catch block will primarily handle the overall timeout rejection
    logger.error(`waitForPageLoad: Wait failed - ${error instanceof Error ? error.message : String(error)}`);
    // Rethrow the error (likely the timeout error)
    throw error;
  } finally {
    // 5. Cleanup
    if (overallTimeoutId !== null) {
      clearTimeout(overallTimeoutId);
    }
    if (loadEventListener) {
      Common.EventTarget.removeEventListeners([loadEventListener]);
      logger.info('waitForPageLoad: Load event listener removed.');
    }
    // The LCP observer should disconnect itself within the injected script.
  }
}

export class NavigateURLTool implements Tool<{ url: string, reasoning: string }, NavigationResult | ErrorResult> {
  name = 'navigate_url';
  description = 'Navigates the page to a specified URL and waits for it to load';

  constructor() {
  }

  async execute(args: { url: string, reasoning: string /* Add reasoning to signature */ }): Promise<NavigationResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    logger.info('navigate_url', args);
    const url = args.url;
    const LOAD_TIMEOUT_MS = 30000; // 30 seconds timeout for page load

    if (typeof url !== 'string') {
      return { error: 'URL must be a string' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Use the page agent to navigate to the URL
      const pageAgent = target.pageAgent();
      if (!pageAgent) {
        return { error: 'Page agent not available' };
      }

      logger.info('Initiating navigation to: ${url}');
      // Perform the navigation
      const result = await pageAgent.invoke_navigate({ url });

      if (result.getError()) {
        logger.error(`Navigation invocation failed: ${result.getError()}`);
        return { error: `Navigation invocation failed: ${result.getError()}` };
      }
      logger.info('Navigation initiated successfully.');

      // *** Add wait for page load ***
      try {
        await waitForPageLoad(target, LOAD_TIMEOUT_MS);
        logger.info('Page load confirmed or timeout reached.');
      } catch (loadError: any) {
        logger.error(`Error waiting for page load: ${loadError.message}`);
      }
      // *****************************

      // Fetch page metadata AFTER waiting
      logger.info('Fetching page metadata...');
      const metadataEval = await target.runtimeAgent().invoke_evaluate({
        expression: '({ url: window.location.href, title: document.title })',
        returnByValue: true,
      });

      // Handle potential errors during metadata evaluation
      if (metadataEval.exceptionDetails) {
        logger.error(`Error fetching metadata: ${metadataEval.exceptionDetails.text}`);
        // Proceed but without metadata, perhaps? Or return error?
        // Let's return success but indicate metadata failure.
        return {
          success: true,
          url: target.inspectedURL() || url, // Use inspectedURL as fallback
          message: `Successfully navigated to ${target.inspectedURL() || url}, but failed to fetch metadata: ${metadataEval.exceptionDetails.text}`,
          metadata: undefined,
        };
      }

      const metadata = metadataEval.result.value as { url: string, title: string };
      logger.info('Metadata fetched:', metadata);

      // *** Add 404 detection heuristic ***
      const is404Result = await this.check404Status(target, metadata);
      if (is404Result.is404) {
        return {
          error: `Page not found (404): ${is404Result.reason}`,
        };
      }
      // ************************************

      // *** Add verification: Compare intended URL with final URL ***
      const intendedUrl = args.url;
      const finalUrl = metadata.url;

      // Basic normalization: remove trailing slash and ensure http/https
      const normalizeUrl = (urlStr: string): string => {
        try {
          const urlObj = new URL(urlStr);
          // Keep protocol, hostname, pathname. Remove trailing slash from pathname.
          const pathname = urlObj.pathname.endsWith('/') ? urlObj.pathname.slice(0, -1) : urlObj.pathname;
          return `${urlObj.protocol}//${urlObj.hostname}${pathname}${urlObj.search}${urlObj.hash}`;
        } catch (e) {
          // If URL parsing fails, return original string (lowercased for consistency)
          return urlStr.toLowerCase().trim();
        }
      };

      const normalizedIntendedUrl = normalizeUrl(intendedUrl);
      const normalizedFinalUrl = normalizeUrl(finalUrl);

      let verificationMessage = '';
      let navigationVerified = normalizedIntendedUrl === normalizedFinalUrl;

      // Allow for HTTP -> HTTPS redirect as a valid case
      if (!navigationVerified && normalizedIntendedUrl.startsWith('http://') && normalizedFinalUrl.startsWith('https://')) {
        const intendedHttps = 'https' + normalizedIntendedUrl.substring(4);
        if (intendedHttps === normalizedFinalUrl) {
          navigationVerified = true;
          verificationMessage = ' (Redirected to HTTPS)';
        }
      }

      if (!navigationVerified) {
        logger.warn(`URL mismatch after navigation. Intended: ${intendedUrl}, Final: ${finalUrl}`);
        // Return an error or modify success message?
        // Let's modify the message but still return success=true, as the page *did* load.
        return {
          success: true, // Technically navigated and loaded *something*
          url: finalUrl,
          message: `Navigation ended at ${finalUrl} (expected ${intendedUrl}) but page loaded.${verificationMessage}`,
          metadata,
        };
      }
      // **********************************************************

      return {
        success: true,
        url: metadata.url, // Use URL from metadata
        message: `Navigated to ${metadata.url} and page loaded.${verificationMessage}`,
        metadata,
      };
    } catch (error: any) {
      logger.error(`Unexpected error: ${error.message}`);
      return { error: `Failed to navigate to URL: ${error.message}` };
    }
  }

  private async check404Status(target: SDK.Target.Target, metadata: { url: string, title: string }): Promise<{ is404: boolean, reason?: string }> {
    try {
      // Basic heuristic checks first
      const title = metadata.title.toLowerCase();
      const url = metadata.url.toLowerCase();
      
      // Common 404 indicators in title
      const titleIndicators = [
        '404', 'not found', 'page not found', 'file not found',
        'error 404', '404 error', 'page cannot be found',
        'the page you requested was not found', 'page does not exist'
      ];
      
      const hasTitle404 = titleIndicators.some(indicator => title.includes(indicator));
      
      // If obvious 404 indicators, get page content for LLM confirmation
      if (hasTitle404) {
        logger.info('Potential 404 detected in title, getting page content for LLM confirmation');
        
        // Get accessibility tree for better semantic analysis
        const treeResult = await Utils.getAccessibilityTree(target);
        const pageContent = treeResult.simplified;
        const is404Confirmed = await this.confirmWith404LLM(metadata.url, metadata.title, pageContent);
        
        if (is404Confirmed) {
          return { 
            is404: true, 
            reason: 'Page content indicates this is a 404 error page' 
          };
        }
      }
      
      return { is404: false };
    } catch (error: any) {
      logger.error('Error checking 404 status:', error);
      return { is404: false };
    }
  }

  private async confirmWith404LLM(url: string, title: string, content: string): Promise<boolean> {
    try {
      const agentService = AgentService.getInstance();
      const apiKey = agentService.getApiKey();
      
      if (!apiKey) {
        logger.warn('No API key available for 404 confirmation');
        return false;
      }

      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      
      const systemPrompt = `You are analyzing web page content to determine if it represents a 404 "Page Not Found" error page.
Return ONLY "true" if this is definitely a 404 error page, or "false" if it's a legitimate page with content.`;

      const userPrompt = `Analyze this page and determine if it's a 404 error page:

URL: ${url}
Title: ${title}
Content (first 1000 chars): ${content.substring(0, 1000)}

Is this a 404 error page? Answer only "true" or "false".`;

      const response = await llm.call({
        provider,
        model,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        systemPrompt,
        temperature: 0.1,
      });

      const result = response.text?.trim().toLowerCase();
      return result === 'true';
      
    } catch (error: any) {
      logger.error('Error confirming 404 with LLM:', error);
      return false;
    }
  }


  schema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to navigate to',
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for the action. This is a free form text field that will be used to explain the action to the user.'
      }
    },
    required: ['url', 'reasoning']
  };
}

/**
 * Tool for navigating back in browser history
 */
export class NavigateBackTool implements Tool<{ steps: number, reasoning: string }, NavigateBackResult | ErrorResult> {
  name = 'navigate_back';
  description = 'Navigates back in browser history by a specified number of steps';

  schema = {
    type: 'object',
    properties: {
      steps: {
        type: 'number',
        description: 'Number of pages to go back in browser history',
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for the action. This is a free form text field that will be used to explain the action to the user.'
      }
    },
    required: ['steps', 'reasoning'],
  };

  async execute(args: { steps: number, reasoning: string }): Promise<NavigateBackResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    logger.error('navigate_back', args);
    const steps = args.steps;
    if (typeof steps !== 'number' || steps <= 0) {
      return { error: 'Steps must be a positive number' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Use JavaScript to navigate back in history
      const runtimeAgent = target.runtimeAgent();
      if (!runtimeAgent) {
        return { error: 'Runtime agent not available' };
      }

      // First, check if we can go back that many steps
      const historyLengthResult = await runtimeAgent.invoke_evaluate({
        expression: 'window.history.length',
        returnByValue: true,
      });

      if (historyLengthResult.exceptionDetails) {
        return { error: `Failed to check history length: ${historyLengthResult.exceptionDetails.text}` };
      }

      const historyLength = historyLengthResult.result.value as number;
      if (historyLength <= steps) {
        return { error: `Cannot go back ${steps} pages. History only contains ${historyLength} entries.` };
      }

      // Execute history.go(-steps) to go back
      const result = await runtimeAgent.invoke_evaluate({
        expression: `window.history.go(-${steps})`,
        returnByValue: true,
      });

      if (result.exceptionDetails) {
        return { error: `Navigation failed: ${result.exceptionDetails.text}` };
      }

      // Wait for navigation to complete using a polling approach
      const startTime = Date.now();
      const timeoutMs = 5000; // 5 second timeout
      let isNavigationComplete = false;

      // Poll until navigation completes or times out
      while (!isNavigationComplete && (Date.now() - startTime) < timeoutMs) {
        // Short delay between checks
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if navigation is complete by testing document readyState
        try {
          const readyStateResult = await runtimeAgent.invoke_evaluate({
            expression: 'document.readyState',
            returnByValue: true,
          });

          if (readyStateResult && !readyStateResult.exceptionDetails &&
            readyStateResult.result.value === 'complete') {
            isNavigationComplete = true;
            // Only use supported console methods
            logger.error('Navigation completed, document ready state is complete');
          }
        } catch {
          // If we can't evaluate yet, navigation is still in progress
          logger.error('Still waiting for navigation to complete...');
        }
      }

      if (!isNavigationComplete) {
        logger.error('Navigation timed out after waiting for document ready state');
      }

      // Fetch page metadata
      const metadataEval = await runtimeAgent.invoke_evaluate({
        expression: '({ url: window.location.href, title: document.title })',
        returnByValue: true,
      });
      const metadata = metadataEval.result.value as { url: string, title: string };

      return {
        success: true,
        steps,
        message: `Successfully navigated back ${steps} page${steps > 1 ? 's' : ''}`,
        metadata,
      };
    } catch (error: unknown) {
      return { error: `Failed to navigate back: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

/**
 * Tool for getting the HTML contents of the current page
 */
export class GetPageHTMLTool implements Tool<Record<string, unknown>, PageHTMLResult | ErrorResult> {
  name = 'get_page_html';
  description = 'Gets the HTML contents and structure of the current page for analysis and summarization with CSS, JavaScript, and other non-essential content removed';

  async execute(_args: Record<string, unknown>): Promise<PageHTMLResult | ErrorResult> {
    await createToolTracingObservation(this.name, _args);
    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Use the runtime agent to get the page HTML and additional information
      const result = await target.runtimeAgent().invoke_evaluate({
        expression: `(() => {
          // Function to get simplified text content from HTML
          function getSimplifiedHTML() {
            // Get the HTML directly
            const html = document.documentElement.outerHTML;

            // Create a temporary DOM element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Remove all script and style tags
            const scriptTags = tempDiv.querySelectorAll('script');
            scriptTags.forEach(script => script.remove());

            const styleTags = tempDiv.querySelectorAll('style');
            styleTags.forEach(style => style.remove());

            // Return the cleaned HTML
            return tempDiv.innerHTML;
          }

          // Get raw HTML for structure analysis
          const rawHtml = document.documentElement.outerHTML;

          // Basic page info with stripped HTML text
          const basicInfo = {
            html: getSimplifiedHTML(rawHtml),
            documentTitle: document.title,
            url: window.location.href
          };

          // Extract metadata
          const metadata = {};
          const metaTags = document.querySelectorAll('meta');
          metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            if (name && content) {
              metadata[name] = content;
            }
          });

          // Extract page structure - headings
          const headings = [];
          document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            const level = parseInt(heading.tagName.substring(1), 10);
            const text = heading.textContent ? heading.textContent.trim() : '';
            if (text) {
              headings.push({ level, text });
            }
          });

          // Extract navigation as text only
          let navigation = '';
          const navElement = document.querySelector('nav') ||
                            document.querySelector('header') ||
                            document.querySelector('[role="navigation"]');

          if (navElement) {
            navigation = navElement.textContent.trim();
          }

          return {
            ...basicInfo,
            metadata: {
              description: metadata['description'] || metadata['og:description'],
              keywords: metadata['keywords'],
              author: metadata['author'],
              ...metadata
            },
            structure: {
              headings,
              navigation
            }
          };
        })()`,
        returnByValue: true,
      });

      if (result.exceptionDetails) {
        return { error: `Failed to get page HTML: ${result.exceptionDetails.text || JSON.stringify(result.exceptionDetails)}` };
      }

      return result.result.value as PageHTMLResult;
    } catch (error) {
      return { error: `Failed to get page HTML, error: ${error}` };
    }
  }

  schema = {
    type: 'object',
    properties: {},
  };
}

/**
 * Tool for clicking elements on the page
 */
export class ClickElementTool implements Tool<{ selector: string }, ClickElementResult | ErrorResult> {
  name = 'click_element';
  description = 'Clicks on an element identified by a CSS selector';

  async execute(args: { selector: string }): Promise<ClickElementResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    
    const selector = args.selector;
    if (typeof selector !== 'string') {
      return { error: 'Selector must be a string' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Execute the click operation in the page context
      const result = await target.runtimeAgent().invoke_evaluate({
        expression: `(() => {
          const element = document.querySelector("${selector}");
          if (!element) {
            return {
              success: false,
              message: "Element not found with selector: ${selector}"
            };
          }

          // Get element info before clicking
          const tagName = element.tagName.toLowerCase();
          const text = element.textContent ? element.textContent.trim() : '';
          const href = element.getAttribute('href');

          // Attempt to scroll element into view if needed
          element.scrollIntoView({behavior: 'smooth', block: 'center'});

          // Simulate a click
          element.click();

          return {
            success: true,
            message: "Successfully clicked element",
            elementInfo: {
              tagName,
              text,
              href
            }
          };
        })()`,
        returnByValue: true,
      });

      return result.result.value;
    } catch (error) {
      return { error: `Failed to click element: ${error.message}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector of the element to click',
      },
    },
    required: ['selector'],
  };
}

/**
 * Tool for searching content on the page
 */
export class SearchContentTool implements Tool<{ query: string, limit?: number }, SearchContentResult | ErrorResult> {
  name = 'search_content';
  description = 'Searches for text content on the page and returns matching elements';

  async execute(args: { query: string, limit?: number }): Promise<SearchContentResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    
    const query = args.query;
    const limit = args.limit || 5;

    if (typeof query !== 'string') {
      return { error: 'Query must be a string' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Execute the search in the page context
      const result = await target.runtimeAgent().invoke_evaluate({
        expression: `(() => {
          const query = "${query}";
          const limit = ${limit};

          // Helper function to get a unique selector for an element
          function getSelector(element) {
            if (element.id) {
              return '#' + element.id;
            }
            if (element.className && typeof element.className === 'string') {
              return '.' + element.className.trim().replace(/\\s+/g, '.');
            }

            // Fallback to path
            let path = '';
            let current = element;
            while (current && current !== document.body) {
              let selector = current.tagName.toLowerCase();
              if (current.parentNode) {
                const siblings = Array.from(current.parentNode.children);
                if (siblings.length > 1) {
                  const index = siblings.indexOf(current) + 1;
                  selector += ':nth-child(' + index + ')';
                }
              }
              path = selector + (path ? ' > ' + path : '');
              current = current.parentNode;
            }
            return path ? 'body > ' + path : path;
          }

          // Create a TreeWalker to navigate all text nodes
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function(node) {
                // Filter out script and style content
                const parent = node.parentNode;
                if (parent && (
                    parent.nodeName === 'SCRIPT' ||
                    parent.nodeName === 'STYLE' ||
                    parent.nodeName === 'NOSCRIPT'
                )) {
                  return NodeFilter.FILTER_REJECT;
                }

                // Only accept nodes that contain our query
                if (node.textContent && node.textContent.toLowerCase().includes(query.toLowerCase())) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
              }
            }
          );

          const matches = [];
          let node;

          // Collect matches
          while ((node = walker.nextNode()) && matches.length < limit) {
            const element = node.parentNode;
            const text = node.textContent.trim();

            // Get some surrounding text for context
            const wholeText = text;
            const lowerText = wholeText.toLowerCase();
            const queryIndex = lowerText.indexOf(query.toLowerCase());

            // Create a context snippet
            let startIndex = Math.max(0, queryIndex - 30);
            let endIndex = Math.min(wholeText.length, queryIndex + query.length + 30);
            let contextText = wholeText.substring(startIndex, endIndex);

            // Add ellipsis if we truncated the text
            if (startIndex > 0) contextText = '...' + contextText;
            if (endIndex < wholeText.length) contextText = contextText + '...';

            matches.push({
              text,
              context: contextText,
              elementInfo: {
                tagName: element.tagName.toLowerCase(),
                selector: getSelector(element)
              }
            });
          }

          return {
            matches,
            totalMatches: matches.length
          };
        })()`,
        returnByValue: true,
      });

      return result.result.value;
    } catch (error) {
      return { error: `Failed to search content: ${error.message}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text to search for on the page',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of matches to return (default: 5)',
      },
    },
    required: ['query'],
  };
}

/**
 * Tool for scrolling the page
 */
export class ScrollPageTool implements Tool<{ position?: { x: number, y: number }, direction?: string, amount?: number }, ScrollResult | ErrorResult> {
  name = 'scroll_page';
  description = 'Scrolls the page to a specific position or in a specific direction';

  async execute(args: { position?: { x: number, y: number }, direction?: string, amount?: number }): Promise<ScrollResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    const position = args.position;
    const direction = args.direction;
    const amount = args.amount || 300;  // Default scroll amount

    if (!position && !direction) {
      return { error: 'Either position or direction must be provided' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    try {
      // Execute the scroll operation in the page context
      const result = await target.runtimeAgent().invoke_evaluate({
        expression: `(() => {
          ${position ?
            `// Scroll to specific position
            window.scrollTo({
              left: ${position.x || 0},
              top: ${position.y || 0},
              behavior: 'smooth'
            });` :
            `// Scroll in direction
            const direction = "${direction}";
            const amount = ${amount};

            if (direction === "up") {
              window.scrollBy({top: -amount, behavior: 'smooth'});
            } else if (direction === "down") {
              window.scrollBy({top: amount, behavior: 'smooth'});
            } else if (direction === "left") {
              window.scrollBy({left: -amount, behavior: 'smooth'});
            } else if (direction === "right") {
              window.scrollBy({left: amount, behavior: 'smooth'});
            } else if (direction === "top") {
              window.scrollTo({top: 0, behavior: 'smooth'});
            } else if (direction === "bottom") {
              window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
            }`
          }

          // Return current scroll position
          return {
            success: true,
            message: "Scroll operation completed",
            position: {
              x: window.pageXOffset,
              y: window.pageYOffset
            }
          };
        })()`,
        returnByValue: true,
      });

      return result.result.value;
    } catch (error) {
      return { error: `Failed to scroll page: ${error.message}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      position: {
        type: 'object',
        description: 'Specific position to scroll to (x and y coordinates)',
        properties: {
          x: {
            type: 'number',
            description: 'X coordinate to scroll to',
          },
          y: {
            type: 'number',
            description: 'Y coordinate to scroll to',
          },
        },
      },
      direction: {
        type: 'string',
        description: 'Direction to scroll (up, down, left, right, top, bottom)',
        enum: ['up', 'down', 'left', 'right', 'top', 'bottom'],
      },
      amount: {
        type: 'number',
        description: 'Amount to scroll in pixels (default: 300)',
      },
    },
  };
}

/**
 * Tool for taking screenshots of the page
 */
export class TakeScreenshotTool implements Tool<{fullPage?: boolean}, ScreenshotResult|ErrorResult> {
  name = 'take_screenshot';
  description = 'Takes a screenshot of the current page view or the entire page';

  async execute(args: {fullPage?: boolean}): Promise<ScreenshotResult|ErrorResult> {
    await createToolTracingObservation(this.name, args);
    const fullPage = args.fullPage || false;

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return {error: 'No page target available'};
    }

    try {
      // Use the page agent to capture a screenshot
      const pageAgent = target.pageAgent();
      if (!pageAgent) {
        return {error: 'Page agent not available'};
      }

      // Take the screenshot
      const result = await pageAgent.invoke_captureScreenshot({
        format: 'png' as Protocol.Page.CaptureScreenshotRequestFormat,
        captureBeyondViewport: fullPage,
      });

      if (result.getError()) {
        return {error: `Screenshot failed: ${result.getError()}`};
      }

      // Get base64 data from result
      const data = result.data;

      return {
        success: true,
        dataUrl: `data:image/png;base64,${data}`,
        message: `Successfully took ${fullPage ? 'full page' : 'viewport'} screenshot`,
      };
    } catch (error) {
      return {error: `Failed to take screenshot: ${error.message}`};
    }
  }

  schema = {
    type: 'object',
    properties: {
      fullPage: {
        type: 'boolean',
        description: 'Whether to capture the entire page or just the viewport (default: false)',
      },
    },
  };
}

/**
 * Tool for getting the accessibility tree including reasoning
 */
export class GetAccessibilityTreeTool implements Tool<{ reasoning: string }, AccessibilityTreeResult | ErrorResult> {
  name = 'get_page_content';
  description = 'Gets the accessibility tree of the current page, providing a hierarchical structure of all accessible elements.';

  async execute(args: { reasoning: string }): Promise<AccessibilityTreeResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    try {
      // Log reasoning for this action (addresses unused args warning)
      logger.warn(`Getting accessibility tree: ${args.reasoning}`);
      // Get the main target
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return { error: 'No page target available' };
      }

      // Get the accessibility tree using the utility function
      const treeResult = await Utils.getAccessibilityTree(target);

      return {
        simplified: treeResult.simplified,
        iframes: treeResult.iframes,
        idToUrl: treeResult.idToUrl,
        xpathMap: treeResult.xpathMap,
        tagNameMap: treeResult.tagNameMap,
      };
    } catch (error) {
      return { error: `Failed to get accessibility tree: ${String(error)}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        description: 'The reasoning behind why the accessibility tree is needed',
      },
    },
    required: ['reasoning'],
  };
}

/**
 * Tool for getting the visible accessibility tree (only elements in the viewport)
 */
export class GetVisibleAccessibilityTreeTool implements Tool<{ reasoning: string }, AccessibilityTreeResult | ErrorResult> {
  name = 'get_visible_content';
  description = 'Gets the accessibility tree of only the visible content in the viewport, providing a focused view of what the user can currently see.';

  async execute(args: { reasoning: string }): Promise<AccessibilityTreeResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    try {
      // Log reasoning for this action
      logger.warn(`Getting visible accessibility tree: ${args.reasoning}`);
      // Get the main target
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return { error: 'No page target available' };
      }

      try {
        // Get only the visible accessibility tree using the utility function
        const treeResult = await Utils.getVisibleAccessibilityTree(target);

        // Convert the enhanced iframes to the expected format
        const enhancedIframes = treeResult.iframes.map(iframe => ({
          role: iframe.role,
          nodeId: iframe.nodeId,
          contentTree: iframe.contentTree,
          contentSimplified: iframe.contentSimplified
        }));

        return {
          simplified: treeResult.simplified,
          iframes: enhancedIframes,
        };
      } catch (visibleTreeError) {
        // Handle specific errors from the visible tree function
        return {
          error: `Unable to get visible content: ${String(visibleTreeError)}`
        };
      }
    } catch (error) {
      return { error: `Failed to process visible accessibility tree request: ${String(error)}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        description: 'The reasoning behind why the visible accessibility tree is needed',
      },
    },
    required: ['reasoning'],
  };
}

/**
 * Tool for performing actions on DOM elements
 */
export class PerformActionTool implements Tool<{ method: string, nodeId: number | string, reasoning: string, args?: Record<string, unknown> | unknown[] }, PerformActionResult | ErrorResult> {
  name = 'perform_action';
  description = 'Performs an action on a DOM element identified by NodeID';

  async execute(args: { method: string, nodeId: number | string, reasoning: string, args?: Record<string, unknown> | unknown[] }): Promise<PerformActionResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    logger.info('Executing with args:', JSON.stringify(args));
    const method = args.method;
    const nodeId = args.nodeId;
    const reasoning = args.reasoning;
    let actionArgsArray: unknown[] = [];

    if (typeof method !== 'string') {
      logger.info('Error: Method must be a string');
      return { error: 'Method must be a string' };
    }

    if (typeof nodeId !== 'number' && typeof nodeId !== 'string') {
      logger.info('Error: NodeID must be a number or string');
      return { error: 'NodeID must be a number or string' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      logger.info('Error: No primary page target found');
      return { error: 'No page target available' };
    }

    // Declare variables needed across different branches
    let initialUrl: string | undefined;
    let isLikelyNavigationElement = false;
    let xpath: string = '';
    let isContentEditableElement = false;

    // Process arguments
    if (args.args) {
      if (Array.isArray(args.args)) {
        actionArgsArray = args.args;
      } else {
        actionArgsArray = [args.args];
      }
      logger.info('Processed action args:', JSON.stringify(actionArgsArray));
    }

    let iframeNodeId: string | undefined;
    let elementNodeId: string | undefined;
    let treeResult: any = null; // Cache the tree result to avoid multiple calls
    
    try {
      // Check if nodeId is from an iframe (has prefix)
      const isIframeNodeId = typeof nodeId === 'string' && nodeId.startsWith('iframe_');
      
      if (isIframeNodeId) {
        // Handle iframe nodeId - extract iframe nodeId and element nodeId
        const match = (nodeId as string).match(/^iframe_(\d+)_(.+)$/);
        if (!match) {
          logger.info('Error: Invalid iframe nodeId format:', nodeId);
          return { error: `Invalid iframe nodeId format: ${nodeId}` };
        }
        
        iframeNodeId = match[1];
        elementNodeId = match[2];
        logger.info(`Iframe action detected - iframeNodeId: ${iframeNodeId}, elementNodeId: ${elementNodeId}`);
        
        // For iframe elements, we don't need xpath - we'll use the nodeId directly
        // The performAction function will handle finding the element within the iframe
        xpath = elementNodeId; // Pass the element nodeId as xpath placeholder
      } else {
        // Handle regular nodeId
        logger.info('Getting XPath for nodeId:', nodeId);
        
        // Get the accessibility tree once for potential reuse
        treeResult = await Utils.getAccessibilityTree(target);
        if (treeResult.xpathMap && treeResult.xpathMap[nodeId as number]) {
          xpath = treeResult.xpathMap[nodeId as number];
          logger.info('Found XPath from xpathMap:', xpath);
        } else {
          // Fallback to CDP call
          xpath = await Utils.getXPathByBackendNodeId(target, nodeId as Protocol.DOM.BackendNodeId);
          if (!xpath || xpath === '') {
            logger.info('Error: Could not determine XPath for NodeID:', nodeId);
            return { error: `Could not determine XPath for NodeID: ${nodeId}` };
          }
          logger.info('Found XPath via CDP fallback:', xpath);
        }
      }

      // Pre-action checks
      if (method === 'fill' || method === 'type') {
        logger.info('Performing fill/type pre-action checks');
        if (typeof args.args !== 'object' || args.args === null || Array.isArray(args.args) || typeof (args.args as Record<string, unknown>).text !== 'string') {
          logger.info('Error: Missing or invalid args for fill/type action');
          return { error: `Missing or invalid args for action '${method}' on NodeID ${nodeId}. Expected an object with a string property 'text'. Example: { "text": "your value" }` };
        }
        const textValue = (args.args as { text: string }).text;
        actionArgsArray = [textValue]; // Prepare array for utility function
        logger.info('Text value for fill/type:', textValue);

        // Get tree result again for the tagNameMap (only if not iframe)
        let elementTagName: string | undefined;
        if (!iframeNodeId) {
          const treeResult = await Utils.getAccessibilityTree(target);
          if (treeResult.tagNameMap && treeResult.tagNameMap[nodeId as number]) {
            elementTagName = treeResult.tagNameMap[nodeId as number];
            logger.info('Found element tagName from tagNameMap:', elementTagName);
          }
        }

        const suitabilityResult = await target.runtimeAgent().invoke_evaluate({
          expression: `(() => {
              const xpath = ${JSON.stringify(xpath)}; // Use JSON.stringify for safe injection
              const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (!element || !(element instanceof Element)) return { suitable: false, reason: 'Element not found or not an Element type' };
              const tagName = element.tagName.toLowerCase();
              const isInput = tagName === 'input';
              const isTextArea = tagName === 'textarea';
              // Removed 'as HTMLElement'
              const isContentEditable = element.isContentEditable;

              // Specific check for input types that accept text
              let isSuitableInputType = true;
              let inputElementType = '';
              if (isInput) {
                  // Removed 'as HTMLInputElement', added safe check for element.type
                  inputElementType = typeof element.type === 'string' ? element.type.toLowerCase() : '';
                  isSuitableInputType = !['button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'file', 'hidden', 'color', 'range'].includes(inputElementType);
              }

              const suitable = (isInput && isSuitableInputType) || isTextArea || isContentEditable;
              let reason = '';
              if (!suitable) {
                  if (isInput && !isSuitableInputType) reason = 'Input element type \\'' + inputElementType + '\\' cannot be filled or typed into';
                  else if (!isInput && !isTextArea && !isContentEditable) reason = 'Element tagName \\'' + tagName + '\\' is not suitable for text input';
                  else if (!isContentEditable) reason = 'Element is not content-editable';
                  else reason = 'Element not suitable for text input'; // Fallback
              }
              return { suitable, reason };
            })()`,
          returnByValue: true,
        });

        // Handle suitability check errors
        if (suitabilityResult.exceptionDetails) {
          // Log detailed error for debugging
          const errorDetailsText = suitabilityResult.exceptionDetails.text ||
            (suitabilityResult.exceptionDetails.exception ? suitabilityResult.exceptionDetails.exception.description : 'Unknown evaluation error');
          logger.info('Error checking element suitability:', errorDetailsText);
          return { error: `Failed to check element suitability for '${method}' on NodeID ${nodeId}: ${errorDetailsText}. XPath used: ${xpath}` }; // Include xpath
        }
        if (!suitabilityResult.result?.value?.suitable) {
          const reason = suitabilityResult.result?.value?.reason || 'Element not suitable for text input';
          logger.info('Element not suitable for text input:', reason);
          return { error: `Cannot perform '${method}' on NodeID ${nodeId}: ${reason}. Final XPath used: ${xpath}. Please try a different NodeID.` }; // Include xpath
        }
        logger.info('Element suitable for text input');

        // Assign based on suitability check result
        isContentEditableElement = suitabilityResult.result?.value?.reason === 'Content-editable element is suitable';

      } else if (method === 'selectOption') {
        logger.info('Performing selectOption pre-action checks');
        if (typeof args.args !== 'object' || args.args === null || Array.isArray(args.args) || typeof (args.args as Record<string, unknown>).text !== 'string') {
          logger.info('Error: Missing or invalid args for selectOption action');
          return { error: `Missing or invalid args for action '${method}' on NodeID ${nodeId}. Expected an object with a string property 'text'. Example: { "text": "option_value" }` };
        }
        const optionValue = (args.args as { text: string }).text;
        actionArgsArray = [optionValue]; // Prepare array for utility function
        logger.info('Option value for selectOption:', optionValue);
      } else if (method === 'setChecked') {
        logger.info('Performing setChecked pre-action checks');
        if (typeof args.args !== 'object' || args.args === null || Array.isArray(args.args) || typeof (args.args as Record<string, unknown>).checked !== 'boolean') {
          logger.info('Error: Missing or invalid args for setChecked action');
          return { error: `Missing or invalid args for action '${method}' on NodeID ${nodeId}. Expected an object with a boolean property 'checked'. Example: { "checked": true }` };
        }
        const checkedValue = (args.args as { checked: boolean }).checked;
        actionArgsArray = [checkedValue]; // Prepare array for utility function
        logger.info('Checked value for setChecked:', checkedValue);
      } else if (method === 'click') {
        logger.info('Performing click pre-action checks');
        const detailsResult = await target.runtimeAgent().invoke_evaluate({
          expression: `(() => {
            // Ensure XPath is properly escaped for use in a string literal
            const escapedXPath = "${xpath.replace(/\"/g, '\\"')}";
            const element = document.evaluate(escapedXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (!element || !(element instanceof Element)) return { url: window.location.href, isLinkOrButton: false, tagName: null };
            const tagName = element.tagName.toLowerCase();
            const isLink = tagName === 'a' && element.hasAttribute('href');
            // Check common button types and roles
            const isButton = tagName === 'button' ||
                             (tagName === 'input' && ['button', 'submit', 'reset'].includes(element.getAttribute('type') || '')) ||
                             element.getAttribute('role') === 'button';
            return {
              url: window.location.href,
              isLinkOrButton: isLink || isButton,
              tagName: tagName
            };
          })()`,
          returnByValue: true,
        });

        if (detailsResult.exceptionDetails) {
          logger.info('Could not get element details before click:', detailsResult.exceptionDetails.text);
          // Fallback: try getting just the URL
          const urlOnlyResult = await target.runtimeAgent().invoke_evaluate({ expression: 'window.location.href', returnByValue: true });
          initialUrl = urlOnlyResult.result?.value;
        } else if (detailsResult.result?.value) {
          initialUrl = detailsResult.result.value.url;
          isLikelyNavigationElement = detailsResult.result.value.isLinkOrButton;
          logger.info('Click element details', {
            tagName: detailsResult.result.value.tagName,
            isLinkOrButton: isLikelyNavigationElement,
            initialUrl
          });
        }
      }
      // Handle args for other methods if needed
      else if (Array.isArray(args.args)) {
        actionArgsArray = args.args;
      }

      // --- Capture tree state before action ---
      let treeBeforeAction = '';
      let treeAfterAction = '';
      let treeDiff: { hasChanges: boolean; added: string[]; removed: string[]; modified: string[]; summary: string; } | null = null;

      try {
        const beforeTreeResult = await Utils.getAccessibilityTree(target);
        treeBeforeAction = beforeTreeResult.simplified;
        logger.debug('Captured accessibility tree before action');
      } catch (error) {
        logger.warn('Failed to capture tree before action:', error);
      }

      // --- Perform Action (Do this BEFORE verification) ---
      logger.info(`Executing Utils.performAction('${method}', args: ${JSON.stringify(actionArgsArray)}, xpath: '${xpath}', iframeNodeId: '${iframeNodeId || 'none'}')`);
      await Utils.performAction(target, method, actionArgsArray, xpath, iframeNodeId);

      // --- Wait for DOM to stabilize after action ---
      await this.waitForDOMStability(target, method, isLikelyNavigationElement);

      // --- Capture tree state after action and generate diff ---
      try {
        if (treeBeforeAction) {
          const afterTreeResult = await Utils.getAccessibilityTree(target);
          treeAfterAction = afterTreeResult.simplified;
          
          // Generate tree diff
          treeDiff = this.getTreeDiff(treeBeforeAction, treeAfterAction);
          
          logger.info(`Tree diff after ${method}:`, treeDiff.summary);
          if (treeDiff.hasChanges) {
            logger.debug('Tree changes:', {
              added: treeDiff.added.slice(0, 3),
              removed: treeDiff.removed.slice(0, 3),
              modified: treeDiff.modified.slice(0, 3)
            });
          } else {
            logger.warn(`No tree changes detected after ${method} - action may have failed or had no visible effect`);
          }
        }
      } catch (error) {
        logger.warn('Failed to capture tree after action:', error);
      }

      // --- Post-action verification ONLY for fill/type ---
      let verificationMessage = '';
      if (method === 'fill' || method === 'type') {
        logger.info('Performing post-action verification for fill/type');
        const expectedValue = (args.args as { text: string }).text;
        try {
          const verifyResult = await target.runtimeAgent().invoke_evaluate({
            expression: `(() => {
              const xpath = "${xpath.replace(/\"/g, '\\"')}";
              const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (!element) return { error: 'Element not found during verification' };

              // Get the actual value from the element
              let currentValue;
              if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                currentValue = element.value;
              } else if (element instanceof HTMLElement && element.isContentEditable) {
                currentValue = element.textContent;
              } else {
                return { error: 'Element type not verifiable (not input, textarea, or contenteditable)' };
              }
              return { value: currentValue };
            })()`,
            returnByValue: true,
          });

          if (verifyResult.exceptionDetails) {
            verificationMessage = ` (${method} verification failed: ${verifyResult.exceptionDetails.text})`;
            logger.info('Verification failed:', verifyResult.exceptionDetails.text);
          } else if (verifyResult.result?.value?.error) {
            verificationMessage = ` (${method} verification failed: ${verifyResult.result.value.error})`;
            logger.info('Verification failed:', verifyResult.result.value.error);
          } else {
            const actualValue = verifyResult.result?.value?.value;
            const comparisonValue = isContentEditableElement ? actualValue?.trim() : actualValue;
            if (comparisonValue !== expectedValue) {
              verificationMessage = ` (${method} verification failed: Expected value "${expectedValue}" but got "${actualValue}")`;
              logger.info(`Verification mismatch: Expected "${expectedValue}", Got "${actualValue}"`);
            } else {
              verificationMessage = ` (${method} action verified successfully)`;
              logger.info('Verification successful');
            }
          }
        } catch (verifyError) {
          verificationMessage = ` (${method} verification encountered an error: ${verifyError instanceof Error ? verifyError.message : String(verifyError)})`;
          logger.info('Verification error:', verifyError);
        }
      }

      let navigationDetected = false;
      let finalUrl = initialUrl; // Assume no navigation initially

      // Check for navigation after 'click' on relevant elements
      if (method === 'click' && isLikelyNavigationElement && initialUrl !== undefined) {
        logger.info('Checking for navigation after click');
        // Wait briefly for potential navigation.
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second wait

        const urlResult = await target.runtimeAgent().invoke_evaluate({
          expression: 'window.location.href',
          returnByValue: true,
        });

        if (!urlResult.exceptionDetails && urlResult.result?.value !== undefined) {
          finalUrl = urlResult.result.value;
          navigationDetected = initialUrl !== finalUrl;
          logger.info('Navigation check', {
            initialUrl,
            finalUrl,
            navigationDetected
          });
        } else {
          logger.info('Could not get URL after click:', urlResult.exceptionDetails?.text);
        }
      }

      // Construct the result message, including verification status
      let message = `Successfully performed '${method}' action on element with NodeID: ${nodeId}${verificationMessage}`;
      if (method === 'click') {
        if (isLikelyNavigationElement) {
          message += navigationDetected ? ` (Navigation detected to: ${finalUrl})` : ' (No navigation detected)';
        } else if (initialUrl !== undefined) {
          // It was a click, but not on a typical navigation element
          message += ' (Element not typically navigatable)';
        }
      }

      return {
        xpath,
        pageChange: treeDiff ? {
          hasChanges: treeDiff.hasChanges,
          summary: treeDiff.summary,
          added: treeDiff.added.slice(0, 5),
          removed: treeDiff.removed.slice(0, 5),
          modified: treeDiff.modified.slice(0, 5),
          hasMore: {
            added: treeDiff.added.length > 5,
            removed: treeDiff.removed.length > 5,
            modified: treeDiff.modified.length > 5
          }
        } : {
          hasChanges: false,
          summary: "No changes detected",
          added: [],
          removed: [],
          modified: [],
          hasMore: { added: false, removed: false, modified: false }
        },
      };
    } catch (error: unknown) {
      logger.info('Error during execution:', error instanceof Error ? error.message : String(error));
      // Include XPath in the error message if it was determined before the error
      const errorMessage = `Failed to perform action '${method}' on NodeID ${nodeId}${xpath ? ` (XPath: ${xpath})` : ' (XPath determination failed or did not run)'}: ${error instanceof Error ? error.message : String(error)}`;
      return {
        error: errorMessage
      };
    }
  }

  schema = {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        description: 'Action to perform (click, hover, fill, type, press, scrollIntoView, selectOption, check, uncheck, setChecked)',
        enum: ['click', 'hover', 'fill', 'type', 'press', 'scrollIntoView', 'selectOption', 'check', 'uncheck', 'setChecked']
      },
      nodeId: {
        oneOf: [
          { type: 'number' },
          { type: 'string' }
        ],
        description: 'NodeID of the element to perform the action on (number for main document, string with iframe_ prefix for iframe elements)'
      },
      args: {
        oneOf: [
          {
            type: 'object',
            description: 'Arguments for the action. For "fill"/"type", requires an object like { "text": "value" }. For "selectOption", requires an object like { "text": "option_value" }. For "setChecked", requires an object like { "checked": true/false }. For "press", requires an array like ["key"]. Other methods (click, hover, check, uncheck, scrollIntoView) typically do not use args.',
            properties: {
              text: {
                type: 'string',
                description: 'The text value to fill, type, or select option value.'
              },
              checked: {
                type: 'boolean',
                description: 'For setChecked method - whether the checkbox should be checked (true) or unchecked (false).'
              }
            },
          },
          {
            type: 'array',
            description: 'Arguments for the action. For "press", requires an array like ["key"].',
            items: {
              type: 'string'
            }
          }
        ],
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for the action. This is a free form text field that will be used to explain the action to the user.'
      }
    },
    required: ['method', 'nodeId', 'reasoning']
  };

  // DOM stability waiting method
  private async waitForDOMStability(target: SDK.Target.Target, method: string, isLikelyNavigationElement: boolean): Promise<void> {
    const maxWaitTime = isLikelyNavigationElement ? 5000 : 2000; // 5s for navigation, 2s for other actions
    const startTime = Date.now();
    
    logger.debug(`Waiting for DOM stability after ${method} (max ${maxWaitTime}ms)`);
    
    try {
      // For navigation elements, wait for document ready state
      if (isLikelyNavigationElement) {
        await this.waitForDocumentReady(target, maxWaitTime);
      }
      
      // Wait for DOM mutations to settle using polling approach
      await this.waitForDOMMutationStability(target, maxWaitTime - (Date.now() - startTime));
      
    } catch (error) {
      logger.warn('Error waiting for DOM stability:', error);
      // Fallback to minimal wait
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  private async waitForDocumentReady(target: SDK.Target.Target, maxWaitTime: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 100;
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const readyStateResult = await target.runtimeAgent().invoke_evaluate({
          expression: 'document.readyState',
          returnByValue: true,
        });
        
        if (!readyStateResult.exceptionDetails && readyStateResult.result.value === 'complete') {
          logger.debug('Document ready state is complete');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.warn('Error checking document ready state:', error);
        break;
      }
    }
  }

  private async waitForDOMMutationStability(target: SDK.Target.Target, maxWaitTime: number): Promise<void> {
    const startTime = Date.now();
    const stabilityWindow = 800; // Longer stability window for complex content
    const pollInterval = 100;
    let lastTreeHash = '';
    let lastChangeTime = startTime;
    let consecutiveStableChecks = 0;
    const requiredStableChecks = 3;
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Generic DOM stability detection
        const currentTreeResult = await target.runtimeAgent().invoke_evaluate({
          expression: `
            (() => {
              // Comprehensive DOM fingerprint
              const elements = document.querySelectorAll('*');
              let hash = elements.length.toString();
              
              // Track structural changes
              const body = document.body;
              if (body) {
                hash += '|body:' + body.children.length;
                hash += '|text:' + (body.textContent || '').length;
              }
              
              // Generic loading indicators
              const loadingSelectors = [
                '[aria-busy="true"]', '[data-loading]', '[class*="loading"]', 
                '[class*="spinner"]', '[class*="progress"]', '.loading'
              ];
              const loadingElements = document.querySelectorAll(loadingSelectors.join(', '));
              hash += '|loading:' + loadingElements.length;
              
              // Check for images still loading
              const images = document.querySelectorAll('img[src]');
              let loadedImages = 0;
              for (const img of images) {
                if (img.complete && img.naturalHeight !== 0) loadedImages++;
              }
              hash += '|imgs:' + loadedImages + '/' + images.length;
              
              // Check for dynamic content containers
              const dynamicContainers = document.querySelectorAll(
                '[data-testid], [data-component], [data-async], [data-reactroot], ' +
                '[ng-app], [ng-controller], [v-app], [data-vue]'
              );
              hash += '|dynamic:' + dynamicContainers.length;
              
              // Network/fetch activity detection
              const busyElements = document.querySelectorAll('[aria-busy="true"], [data-fetching="true"]');
              hash += '|busy:' + busyElements.length;
              
              return hash;
            })()
          `,
          returnByValue: true,
        });
        
        if (!currentTreeResult.exceptionDetails && currentTreeResult.result.value) {
          const currentHash = currentTreeResult.result.value as string;
          
          if (currentHash !== lastTreeHash) {
            lastTreeHash = currentHash;
            lastChangeTime = Date.now();
            consecutiveStableChecks = 0;
          } else {
            consecutiveStableChecks++;
            if (consecutiveStableChecks >= requiredStableChecks && 
                Date.now() - lastChangeTime >= stabilityWindow) {
              logger.debug(`DOM stable for ${stabilityWindow}ms with ${consecutiveStableChecks} consecutive stable checks`);
              return;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.warn('Error checking DOM stability:', error);
        break;
      }
    }
    
    logger.debug('DOM stability wait timeout reached');
  }

  // Tree diff methods for action verification
  private getTreeDiff(before: string, after: string): { hasChanges: boolean; added: string[]; removed: string[]; modified: string[]; summary: string; } {
    if (before === after) {
      return {
        hasChanges: false,
        added: [],
        removed: [],
        modified: [],
        summary: "No changes detected in page structure"
      };
    }
    
    const beforeLines = before.split('\n').filter(line => line.trim());
    const afterLines = after.split('\n').filter(line => line.trim());
    
    const lcs = this.findLCS(beforeLines, afterLines);
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    
    afterLines.forEach(line => {
      if (!lcs.includes(line)) {
        added.push(line);
      }
    });
    
    beforeLines.forEach(line => {
      if (!lcs.includes(line)) {
        removed.push(line);
      }
    });
    
    this.findModifications(beforeLines, afterLines, added, removed, modified);
    
    const summary = `${added.length} added, ${removed.length} removed, ${modified.length} modified`;
    
    return {
      hasChanges: true,
      added,
      removed,
      modified,
      summary
    };
  }

  private findLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }

  private findModifications(
    before: string[], 
    after: string[], 
    added: string[], 
    removed: string[], 
    modified: string[]
  ): void {
    for (const removedLine of [...removed]) {
      for (const addedLine of [...added]) {
        if (this.areSimilar(removedLine, addedLine)) {
          modified.push(`${removedLine} → ${addedLine}`);
          const addedIndex = added.indexOf(addedLine);
          const removedIndex = removed.indexOf(removedLine);
          if (addedIndex > -1) added.splice(addedIndex, 1);
          if (removedIndex > -1) removed.splice(removedIndex, 1);
          break;
        }
      }
    }
  }

  private areSimilar(line1: string, line2: string): boolean {
    const nodePattern = /\[(\d+)\]\s+(\w+)/;
    const match1 = line1.match(nodePattern);
    const match2 = line2.match(nodePattern);
    
    if (match1 && match2) {
      return match1[2] === match2[2] && match1[1] !== match2[1];
    }
    
    const similarity = this.calculateSimilarity(line1, line2);
    return similarity > 0.7;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    const distance = this.editDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  private editDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    
    return dp[m][n];
  }
}

/**
 * NEW TOOL: ObjectiveDrivenActionTool
 */
// Tree diff interfaces for ObjectiveDrivenActionTool
interface TreeDiffResult {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  modified: string[];
  summary: string;
}

export class ObjectiveDrivenActionTool implements Tool<{ objective: string, offset?: number, chunkSize?: number, maxRetries?: number }, ObjectiveDrivenActionResult | ErrorResult> {
  name = 'objective_driven_action';
  description = 'Analyzes the page\'s accessibility tree to fulfill a delegated action objective. Performs actions (e.g., click, fill) using accessibility IDs. Identifies the best element to interact with based on the context and objectives. Acts as a specialized sub-agent with retries.';

  // Tree diff methods
  private getTreeDiff(before: string, after: string): TreeDiffResult {
    if (before === after) {
      return {
        hasChanges: false,
        added: [],
        removed: [],
        modified: [],
        summary: "No changes detected in page structure"
      };
    }
    
    const beforeLines = before.split('\n').filter(line => line.trim());
    const afterLines = after.split('\n').filter(line => line.trim());
    
    // Simple Myers-inspired diff using LCS (Longest Common Subsequence)
    const lcs = this.findLCS(beforeLines, afterLines);
    
    // Find added and removed lines
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    
    // Lines in 'after' but not in LCS are added
    afterLines.forEach(line => {
      if (!lcs.includes(line)) {
        added.push(line);
      }
    });
    
    // Lines in 'before' but not in LCS are removed
    beforeLines.forEach(line => {
      if (!lcs.includes(line)) {
        removed.push(line);
      }
    });
    
    // Detect modifications (similar lines that changed)
    this.findModifications(beforeLines, afterLines, added, removed, modified);
    
    const summary = `${added.length} added, ${removed.length} removed, ${modified.length} modified`;
    
    return {
      hasChanges: true,
      added,
      removed,
      modified,
      summary
    };
  }

  // Simple LCS implementation for diff
  private findLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Reconstruct LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }

  // Detect modifications (lines that are similar but changed)
  private findModifications(
    before: string[], 
    after: string[], 
    added: string[], 
    removed: string[], 
    modified: string[]
  ): void {
    // Look for similar lines that might be modifications
    for (const removedLine of removed) {
      for (const addedLine of added) {
        if (this.areSimilar(removedLine, addedLine)) {
          modified.push(`${removedLine} → ${addedLine}`);
          // Remove from added/removed since they're modifications
          const addedIndex = added.indexOf(addedLine);
          const removedIndex = removed.indexOf(removedLine);
          if (addedIndex > -1) added.splice(addedIndex, 1);
          if (removedIndex > -1) removed.splice(removedIndex, 1);
          break;
        }
      }
    }
  }

  // Simple similarity check for accessibility tree lines
  private areSimilar(line1: string, line2: string): boolean {
    // Extract node type and check if they're the same element with different content
    const nodePattern = /\[(\d+)\]\s+(\w+)/;
    const match1 = line1.match(nodePattern);
    const match2 = line2.match(nodePattern);
    
    if (match1 && match2) {
      // Same element type but different content might be a modification
      return match1[2] === match2[2] && match1[1] !== match2[1];
    }
    
    // Fallback: check if lines are 70% similar
    const similarity = this.calculateSimilarity(line1, line2);
    return similarity > 0.7;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    // Simple edit distance calculation
    const distance = this.editDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  private editDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    
    return dp[m][n];
  }

  // Create system prompt for ObjectiveDrivenActionTool
  private getSystemPrompt(): string {
    return `You are an expert assistant for Browser Operator, specializing in analyzing web page accessibility trees and determining the most appropriate browser actions to satisfy objectives delegated by another AI agent.

Your task is to examine the provided simplified accessibility tree, which contains element structures with their accessibility IDs in brackets, and determine the appropriate action to take based on the delegated objective. You must determine the target element (nodeIdString), the action method, and any necessary arguments. Then respond using the provided tool format.

Handling different action types:
*   For clicks: Find the most relevant interactive element (button, link, menu item)
*   For filling forms: Identify the correct input field
*   For complex interactions: Determine the precise sequence needed

Handle edge cases:
- When in doubt about performing an action, set the error field instead of guessing incorrectly.
- If no suitable element exists for the requested action, clearly explain why in an error message.

Important guidelines:
- Be precise when extracting nodeIdString for actions.
- Only include 'args' for relevant actions (fill, type, press).
- Prefer the most direct path to accomplishing the objective.
- Choose the most semantically appropriate element when multiple options exist.`;
  }


  async execute(args: { objective: string, offset?: number, chunkSize?: number, maxRetries?: number }): Promise<ObjectiveDrivenActionResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    const { objective, offset = 0, chunkSize = 60000, maxRetries = 1 } = args; // Default offset 0, chunkSize 60000, maxRetries 1
    let currentTry = 0;
    let lastError: string | null = null;

    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    const { model: modelNameForAction, provider: providerForAction } = AIChatPanel.getMiniModelWithProvider();

    if (!apiKey) {return { error: 'API key not configured.' };}
    if (typeof objective !== 'string' || objective.trim() === '') {
      return { error: 'Objective must be a non-empty string' };
    }

    // --- Internal Agentic Loop ---
    while (currentTry <= maxRetries) {
      currentTry++;
      logger.info(`ObjectiveDrivenActionTool: Attempt ${currentTry}/${maxRetries + 1} for objective: "${objective}"`);
      let attemptError: Error | null = null; // Use Error object for better stack traces

      try {
        // --- Step 1: Get Tree ---
        logger.info('ObjectiveDrivenActionTool: Getting Accessibility Tree...');
        const getAccTreeTool = new GetAccessibilityTreeTool();
        const treeResult = await getAccTreeTool.execute({ reasoning: `Attempt ${currentTry} for objective: ${objective}` });
        if ('error' in treeResult) {throw new Error(`Tree Error: ${treeResult.error}`);}
        const accessibilityTreeString = treeResult.simplified;
        if (!accessibilityTreeString || accessibilityTreeString.trim() === '') {throw new Error('Tree Error: Empty or blank tree content.');}
        logger.info('ObjectiveDrivenActionTool: Got Accessibility Tree.');

        // --- Step 2: LLM - Determine Action (Method, Accessibility NodeID String, Args) ---
        logger.info('ObjectiveDrivenActionTool: Determining Action via LLM...');

        // Create PerformActionTool to use its schema
        const performActionTool = new PerformActionTool();

        const promptGetAction = `
User Objective: "${objective}"

Full tree length: ${accessibilityTreeString.length} chars. Showing chars ${offset}-${offset + chunkSize}:
Simplified Accessibility Tree Chunk:
\`\`\`
${accessibilityTreeString.substring(offset, offset + chunkSize)}
\`\`\`
${accessibilityTreeString.length > offset + chunkSize ? `...(tree truncated at ${offset + chunkSize}/${accessibilityTreeString.length})...` : ''}
${lastError ? `Previous attempt failed with this error: "${lastError}". Consider a different approach.` : ''}
Based on the objective and the simplified accessibility tree chunk, determine the target element, the action method, the accessibility nodeId string, and any necessary arguments. Then respond using the provided tool format.

Handling different action types:
*   For clicks: Find the most relevant interactive element (button, link, menu item)
*   For filling forms: Identify the correct input field
*   For complex interactions: Determine the precise sequence needed

Handle edge cases:
- When in doubt about performing an action, set the error field instead of guessing incorrectly.
- If no suitable element exists for the requested action, clearly explain why in an error message.

Important guidelines:
- Be precise when extracting nodeIdString for actions.
- Only include 'args' for relevant actions (fill, type, press).
- Prefer the most direct path to accomplishing the objective.
- Choose the most semantically appropriate element when multiple options exist.`;

        // Use LLMClient with function call support
        const llm = LLMClient.getInstance();
        const llmResponse = await llm.call({
          provider: providerForAction,
          model: modelNameForAction,
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: promptGetAction }
          ],
          systemPrompt: this.getSystemPrompt(),
          tools: [{
            type: 'function',
            function: {
              name: performActionTool.name,
              description: performActionTool.description,
              parameters: performActionTool.schema
            }
          }],
          temperature: 0.4
        });
        
        // Convert LLMResponse to expected format
        const response = {
          text: llmResponse.text,
          functionCall: llmResponse.functionCall
        };

        // --- Parse the Tool Call Response ---
        if (!response.functionCall || response.functionCall.name !== performActionTool.name) {
          logger.warn('LLM did not return the expected function call; this is likely an error', response);
          const errorMessage = response.text || 'No function call returned - this tool requires a function call response.';

          // Since this tool specifically handles actions, if we didn't get a function call
          // we should return an error instead of text content
          return {
            error: `Failed to determine appropriate action: ${errorMessage}`
          };
        }
        const { method: actionMethod, nodeId: accessibilityNodeId, args: actionArgs } = response.functionCall.arguments as {
          method: string,
          nodeId: number,
          args?: Record<string, unknown> | unknown[],
        };
        logger.info('Parsed Tool Arguments:', { actionMethod, accessibilityNodeId, actionArgs });

        const actionNodeId = accessibilityNodeId as Protocol.DOM.NodeId;
        logger.info(`ObjectiveDrivenActionTool: Performing action '${actionMethod}' on potentially incorrect NodeID ${actionNodeId}...`);

        // --- Capture tree state before action ---
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        let treeBeforeAction = '';
        let treeAfterAction = '';
        let treeDiff: TreeDiffResult | null = null;

        try {
          if (target) {
            const beforeTreeResult = await Utils.getAccessibilityTree(target);
            treeBeforeAction = beforeTreeResult.simplified;
            logger.debug('Captured accessibility tree before action');
          }
        } catch (error) {
          logger.warn('Failed to capture tree before action:', error);
        }

        const performResult = await performActionTool.execute({
          method: actionMethod,
          nodeId: actionNodeId,
          args: actionArgs,
          reasoning: `Attempt ${currentTry} for objective: ${objective}`
        });
        if ('error' in performResult) {
          // Throw error to be caught by the loop's catch block
          throw new Error(`Action Error (NodeID ${actionNodeId}): ${performResult.error}`);
        }

        // --- Capture tree state after action and generate diff ---
        try {
          if (target && treeBeforeAction) {
            const afterTreeResult = await Utils.getAccessibilityTree(target);
            treeAfterAction = afterTreeResult.simplified;
            
            // Generate tree diff
            treeDiff = this.getTreeDiff(treeBeforeAction, treeAfterAction);
            
            logger.info(`Tree diff after ${actionMethod}:`, treeDiff.summary);
            if (treeDiff.hasChanges) {
              logger.debug('Tree changes:', {
                added: treeDiff.added.slice(0, 3),
                removed: treeDiff.removed.slice(0, 3),
                modified: treeDiff.modified.slice(0, 3)
              });
            } else {
              logger.warn(`No tree changes detected after ${actionMethod} - action may have failed or had no visible effect`);
            }
          }
        } catch (error) {
          logger.warn('Failed to capture tree after action:', error);
        }

        logger.info('ObjectiveDrivenActionTool: Action successful (but may have affected unexpected element).');

        // Fetch page metadata
        let metadata: { url: string, title: string } | undefined;
        const pageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (pageTarget) {
          const metadataEval = await pageTarget.runtimeAgent().invoke_evaluate({
            expression: '({ url: window.location.href, title: document.title })',
            returnByValue: true,
          });
          metadata = metadataEval.result.value as { url: string, title: string };
        }

        return {
          success: true,
          message: `Successfully executed action for objective "${objective}"`,
          finalAction: { method: actionMethod, nodeId: actionNodeId, args: actionArgs },
          method: actionMethod,
          nodeId: actionNodeId,
          args: actionArgs,
          processedLength: offset + chunkSize,
          totalLength: accessibilityTreeString.length,
          truncated: accessibilityTreeString.length > offset + chunkSize,
          metadata,
          treeDiff: treeDiff ? {
            hasChanges: treeDiff.hasChanges,
            summary: treeDiff.summary,
            added: treeDiff.added.slice(0, 5),
            removed: treeDiff.removed.slice(0, 5),
            modified: treeDiff.modified.slice(0, 5),
            hasMore: {
              added: treeDiff.added.length > 5,
              removed: treeDiff.removed.length > 5,
              modified: treeDiff.modified.length > 5
            }
          } : null,
        };

      } catch (error) {
        // Catch errors from any step within the try block
        attemptError = error as Error;
        logger.warn(`ObjectiveDrivenActionTool: Attempt ${currentTry} failed:`, attemptError.message);
        lastError = attemptError.message; // Store error message for the next attempt's prompt
        // Optional: Add a small delay before retrying? await new Promise(resolve => setTimeout(resolve, 500));
      }
    } // End while loop

    // If loop finishes without success (i.e., all retries failed)
    return {
      error: `Failed objective "${objective}" after ${currentTry} attempts. Last error: ${lastError || 'Unknown error during final attempt.'}`
    };
  }

  schema = {
    type: 'object',
    properties: {
      objective: {
        type: 'string',
        description: 'The high-level objective the user wants to achieve on the page (e.g., "click the login button", "fill the search box with \'test\' and press Enter"). Be specific.',
      },
      offset: {
        type: 'number',
        description: 'Offset for the accessibility tree chunk (default: 0)',
        default: 0
      },
      chunkSize: {
        type: 'number',
        description: 'Size of the accessibility tree chunk (default: 60000)',
        default: 60000
      },
      maxRetries: {
        type: 'number',
        description: 'Maximum number of retries if an attempt fails (default: 1, meaning 2 total attempts).',
        default: 1,
      }
    },
    required: ['objective'],
  };
}

/**
 * Tool for getting URLs from a list of NodeIDs
 */
export class NodeIDsToURLsTool implements Tool<{ nodeIds: number[] }, NodeIDsToURLsResult | ErrorResult> {
  name = 'get_urls_from_nodeids';
  description = 'Gets URLs associated with DOM elements identified by NodeIDs from accessibility tree.';

  async execute(args: { nodeIds: number[] }): Promise<NodeIDsToURLsResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    if (!Array.isArray(args.nodeIds)) {
      return { error: 'nodeIds must be an array of numbers' };
    }

    if (args.nodeIds.length === 0) {
      return { error: 'nodeIds array must not be empty' };
    }

    // Get the main target
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return { error: 'No page target available' };
    }

    const results: Array<{ nodeId: number, url?: string }> = [];

    // Process each nodeId separately
    for (const nodeId of args.nodeIds) {
      try {
        // First, get the xpath for the node
        const xpath = await getXPathByBackendNodeId(target, nodeId as Protocol.DOM.BackendNodeId);
        if (!xpath) {
          results.push({ nodeId });
          continue;
        }

        // Execute JavaScript to get the URL from the element
        const runtimeAgent = target.runtimeAgent();
        const evaluateResult = await runtimeAgent.invoke_evaluate({
          expression: `
            (function() {
              const element = document.evaluate("${xpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (!element) return { found: false };
              
              // Try to get href for anchor tags
              if (element instanceof HTMLAnchorElement && element.href) {
                return { found: true, url: element.href };
              }
              
              // Try to find closest anchor parent
              let closestAnchor = element.closest('a[href]');
              if (closestAnchor && closestAnchor.href) {
                return { found: true, url: closestAnchor.href };
              }
              
              return { found: false };
            })()
          `,
          returnByValue: true
        });

        if (evaluateResult.exceptionDetails) {
          logger.warn('Error evaluating URL for NodeID', {
            nodeId,
            details: evaluateResult.exceptionDetails
          });
          results.push({ nodeId });
          continue;
        }

        const resultValue = evaluateResult.result?.value;
        if (resultValue?.found && resultValue.url) {
          results.push({ nodeId, url: resultValue.url });
        } else {
          results.push({ nodeId });
        }
      } catch (error) {
        logger.warn('Error processing NodeID', {
          nodeId,
          error: error instanceof Error ? error.message : String(error)
        });
        results.push({ nodeId });
      }
    }

    return {
      urls: results
    };
  }

  schema = {
    type: 'object',
    properties: {
      nodeIds: {
        type: 'array',
        description: 'Array of node IDs to get URLs for',
        items: {
          type: 'number'
        }
      }
    },
    required: ['nodeIds']
  };
}

/**
 * Tool for structured data extraction based on a provided schema
 */
export class SchemaBasedDataExtractionTool implements Tool<{
  objective: string,
  schema: Record<string, unknown>,
  offset?: number,
  chunkSize?: number,
  maxRetries?: number,
}, SchemaBasedDataExtractionResult | ErrorResult> {
  name = 'schema_based_extraction';
  description = 'Extracts structured data from the page according to a provided schema and objective, returning results in JSON format that resembles HTML structure. Uses an efficient NodeID-based extraction approach where accessibility NodeIDs are first identified then resolved to content. The output preserves document hierarchy with proper parent-child relationships between elements. Particularly useful for extracting content while maintaining its original structure and relationships.';

  // Create system prompt for SchemaBasedDataExtractionTool
  private getSystemPrompt(): string {
    return `You are an expert data extraction assistant, specializing in analyzing web page accessibility trees and extracting structured data according to a provided schema and objective.

Your task is to examine the provided simplified accessibility tree, which contains element structures with their accessibility IDs in brackets, and extract NodeIDs that match both the provided objective and schema. Your output must be valid JSON data that resembles HTML structure using NodeIDs instead of content. The objective will guide you on what kind of data to extract and how to interpret the schema in the context of the page content.

Guidelines for extraction:
1. The schema will serve as a guide for what to extract, but structure the data in a DOM-like hierarchy
2. Create a JSON object that preserves parent-child relationships similar to HTML
3. Use tags, attributes, but ONLY include NodeIDs instead of actual content
4. Maintain proper nesting relationships (e.g., sections containing headings and paragraphs)
5. Every element that should contain content must have a nodeId property
6. Preserve the document flow and hierarchy similar to a real HTML document
7. NodeIDs should be numerical values (integers), not strings
8. IMPORTANT: You may filter out 'none' and 'generic' nodes that are just structural containers, but PRESERVE any 'none' or 'generic' nodes that have children with meaningful content (e.g., text, headings, links, buttons, etc.)

Example DOM-like schema structure WITH NODEIDS:

Schema: { "elements": ["heading", "paragraph", "list", "table", "link"] }

JSON output:
{
  "type": "document",
  "children": [
    {
      "type": "section",
      "children": [
        {
          "type": "heading",
          "level": 1,
          "nodeId": 123
        },
        {
          "type": "paragraph",
          "nodeId": 456
        },
        {
          "type": "list",
          "listType": "unordered",
          "items": [
            { "nodeId": 789 },
            { "nodeId": 790 },
            { "nodeId": 791 }
          ]
        }
      ]
    },
    {
      "type": "section",
      "children": [
        {
          "type": "heading",
          "level": 2,
          "nodeId": 555
        },
        {
          "type": "paragraph",
          "nodeId": 556
        },
        {
          "type": "link",
          "href": "https://example.com",
          "nodeId": 557
        },
        {
          "type": "table",
          "headers": [
            { "nodeId": 560 },
            { "nodeId": 561 },
            { "nodeId": 562 }
          ],
          "rows": [
            [
              { "nodeId": 570 },
              { "nodeId": 571 },
              { "nodeId": 572 }
            ],
            [
              { "nodeId": 580 },
              { "nodeId": 581 },
              { "nodeId": 582 }
            ]
          ]
        }
      ]
    }
  ]
}

For more structured content types, use appropriate HTML-like nesting and NodeIDs:

Schema: { "article": { "title": "string", "content": "string", "images": ["string"] } }

JSON output:
{
  "type": "article",
  "children": [
    {
      "type": "heading",
      "level": 1,
      "nodeId": 123
    },
    {
      "type": "paragraph",
      "nodeId": 456
    },
    {
      "type": "image",
      "src": "image1.jpg",
      "alt": "Description of first image",
      "nodeId": 789
    },
    {
      "type": "image",
      "src": "image2.jpg",
      "alt": "Description of second image",
      "nodeId": 790
    }
  ]
}

Do not include any explanatory text or markdown syntax in your response. Return only valid JSON.

CRITICAL: 
1. Your response must ONLY contain valid JSON. Do not include any explanatory text outside the JSON structure.
2. ALWAYS include nodeId properties for any element that would normally have content.
3. Do NOT include actual content text - use only the nodeId property instead.
4. All nodeId values must be numbers, not strings.`;
  }

  /**
   * Get content from a specific node in the accessibility tree with intelligent handling
   * of container nodes and their children
   * @param nodeId The NodeID to extract content from
   * @param nodes The accessibility tree nodes
   * @returns The content as a string or a placeholder if not found
   */
  private getNodeContent(nodeId: number, nodes: Protocol.Accessibility.AXNode[]): string | null {
    const node = nodes.find(n => Number(n.nodeId) === nodeId);
    if (!node) {
      logger.warn(`SchemaBasedDataExtractionTool: Node not found for nodeId ${nodeId}`);
      return null;
    }

    // Check if this is a container that might have interesting children
    if (this.isContainerNode(node) && node.childIds?.length) {
      return this.getAggregatedNodeContent(node, nodes);
    }

    // Get the name property which contains the accessible text
    const nameProperty = node.properties?.find(p => String(p.name) === 'name');
    if (nameProperty && nameProperty.value?.value !== undefined) {
      return String(nameProperty.value.value);
    }

    // Some nodes might have text in valueValue
    const valueProperty = node.properties?.find(p => String(p.name) === 'value');
    if (valueProperty?.value?.value !== undefined) {
      return String(valueProperty.value.value);
    }

    // For nodes with no text content, return role as a fallback
    return `[${node.role?.value ? String(node.role.value) : 'Element'}]`;
  }

  /**
   * Check if a node is a container that might have interesting child content
   * @param node The accessibility node to check
   * @returns True if the node is a container role
   */
  /**
   * Determines if a node is a container that might have interesting child content
   * This is important for intelligent content aggregation from complex elements
   * @param node The accessibility node to check
   * @returns True if the node is a container role that should have its children processed
   */
  private isContainerNode(node: Protocol.Accessibility.AXNode): boolean {
    // If node has no children, it's not a container regardless of role
    if (!node.childIds?.length) {
      return false;
    }

    const role = String(node.role?.value || '').toLowerCase();

    // List of roles that typically act as containers for other content
    const containerRoles = [
      'paragraph', 'section', 'div', 'header', 'footer', 'aside',
      'figure', 'blockquote', 'list', 'listitem', 'table', 'row', 'cell', 'columnheader',
      'rowheader', 'grid', 'document', 'form', 'group', 'region', 'tabpanel'
    ];

    // Special case: if node has a name property with content but also has children,
    // we should consider it a container to get the most complete content
    const nameProperty = node.properties?.find(p => String(p.name) === 'name');
    const hasDirectContent = nameProperty?.value?.value !== undefined &&
      String(nameProperty.value.value).trim() !== '';

    return containerRoles.includes(role) ||
      (role === 'generic' && node.childIds.length > 0) ||
      (hasDirectContent && node.childIds.length > 0);
  }

  /**
   * Intelligently aggregate content from a node and its children
   * @param node The node to extract content from
   * @param allNodes All nodes in the accessibility tree
   * @returns The aggregated content as a string
   */
  private getAggregatedNodeContent(node: Protocol.Accessibility.AXNode, allNodes: Protocol.Accessibility.AXNode[]): string {
    // First, get this node's direct text content
    let directContent = '';

    // Get the name property which contains the accessible text
    const nameProperty = node.properties?.find(p => String(p.name) === 'name');
    if (nameProperty && nameProperty.value?.value !== undefined) {
      directContent = String(nameProperty.value.value);
    }

    // Some nodes might have text in valueValue
    if (!directContent) {
      const valueProperty = node.properties?.find(p => String(p.name) === 'value');
      if (valueProperty?.value?.value !== undefined) {
        directContent = String(valueProperty.value.value);
      }
    }

    // If no children, return direct content or role as fallback
    if (!node.childIds?.length) {
      return directContent || `[${node.role?.value ? String(node.role.value) : 'Element'}]`;
    }

    // Process child nodes
    const childContents: string[] = [];
    const role = String(node.role?.value || '').toLowerCase();

    // For each child node
    for (const childId of node.childIds) {
      const childNode = allNodes.find(n => n.nodeId === childId);
      if (!childNode) {
        continue;
      }

      const childRole = String(childNode.role?.value || '').toLowerCase();

      // Handle different types of child nodes based on their role
      if (childRole === 'statictext' || childRole === 'text') {
        // Get direct text from text nodes
        const childNameProperty = childNode.properties?.find(p => String(p.name) === 'name');
        if (childNameProperty?.value?.value !== undefined) {
          childContents.push(String(childNameProperty.value.value));
        }
      } else if (childRole === 'linebreak' || childRole === 'br') {
        // Handle line breaks
        childContents.push('\n');
      } else if (['emphasis', 'strong', 'b', 'i', 'em', 'mark', 'code', 'cite'].includes(childRole)) {
        // Special handling for emphasis nodes - recursively get their content
        const emphasisContent = this.getAggregatedNodeContent(childNode, allNodes);
        if (emphasisContent) {
          childContents.push(emphasisContent);
        }
      } else if (childRole === 'link') {
        // Get text content from links
        const linkContent = this.getAggregatedNodeContent(childNode, allNodes);
        if (linkContent) {
          childContents.push(linkContent);
        }
      } else if (this.isContainerNode(childNode)) {
        // Recursively process container nodes
        const containerContent = this.getAggregatedNodeContent(childNode, allNodes);
        if (containerContent) {
          // For certain container types, add appropriate spacing
          if (['paragraph', 'div', 'section', 'article'].includes(childRole)) {
            childContents.push(containerContent + '\n');
          } else if (['listitem'].includes(childRole)) {
            childContents.push('• ' + containerContent);
          } else {
            childContents.push(containerContent);
          }
        }
      } else {
        // Default handling for other nodes - try to get their direct content
        const childContent = this.getNodeContent(Number(childNode.nodeId), allNodes);
        if (childContent) {
          childContents.push(childContent);
        }
      }
    }

    // Combine all child content with appropriate formatting based on node type
    let combinedChildContent = '';

    // Format based on container role
    if (role === 'paragraph') {
      // For paragraphs, join with spaces and normalize whitespace
      combinedChildContent = childContents.join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/ \n /g, '\n') // Fix spacing around line breaks
        .trim();
    } else if (role === 'list') {
      // For lists, join with newlines
      combinedChildContent = childContents.join('\n');
    } else if (['table', 'grid'].includes(role)) {
      // For tables, join with newlines and add extra spacing
      combinedChildContent = childContents.join('\n');
    } else {
      // Default joining with spaces
      combinedChildContent = childContents.join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Return combined content, or direct content if no children had content
    return combinedChildContent || directContent || `[${node.role?.value ? String(node.role.value) : 'Element'}]`;
  }

  /**
   * Process the structure to replace NodeIDs with actual content
   * @param structure The structure containing NodeIDs (can be a number, array, or object)
   * @param accessibilityNodes The accessibility tree nodes
   * @returns The processed structure with content
   */
  private async processNodeStructure(structure: unknown, accessibilityNodes: Protocol.Accessibility.AXNode[] = []): Promise<unknown> {
    // Map CDP nodes to AccessibilityNode format for getFormattedSubtreeByNodeId
    // Do this mapping once at the top level of the recursion entry point
    const mappedNodes = accessibilityNodes.map(
      (node: Protocol.Accessibility.AXNode): AccessibilityNode => {
        const roleValue =
          node.role && typeof node.role === 'object' && 'value' in node.role
            ? String(node.role.value) // Ensure string
            : '';

        const nameValue =
          node.name && typeof node.name === 'object' && 'value' in node.name
            ? String(node.name.value) // Ensure string
            : undefined;

        const descriptionValue =
          node.description &&
            typeof node.description === 'object' &&
            'value' in node.description
            ? String(node.description.value) // Ensure string
            : undefined;

        const valueValue =
          node.value && typeof node.value === 'object' && 'value' in node.value
            ? String(node.value.value) // Ensure string
            : undefined;

        const backendNodeId =
          typeof node.backendDOMNodeId === 'number'
            ? node.backendDOMNodeId
            : undefined;

        return {
          role: roleValue,
          name: nameValue,
          description: descriptionValue,
          value: valueValue,
          nodeId: String(node.nodeId), // Ensure nodeId is string
          backendDOMNodeId: backendNodeId,
          parentId: node.parentId,
          childIds: node.childIds,
        };
      },
    );

    // Call a helper function to handle the actual recursive processing
    // Pass both raw nodes (for getNodeContent) and mapped nodes (for getFormattedSubtreeByNodeId)
    return await this.processNodeStructureRecursive(structure, accessibilityNodes, mappedNodes);
  }

  /**
   * Recursive helper for processing the structure
   */
  /**
   * Check if a node should be skipped based on its role
   * @param nodeId The NodeID to check
   * @param nodes The accessibility tree nodes
   * @returns True if the node should be skipped, false otherwise
   */
  private shouldSkipNode(nodeId: number, nodes: Protocol.Accessibility.AXNode[]): boolean {
    const node = nodes.find(n => Number(n.nodeId) === nodeId);
    if (!node) {
      return false; // If node not found, don't skip it
    }

    const role = String(node.role?.value || '').toLowerCase();

    // Check if this is a 'none' or 'generic' node
    if (role === 'none' || role === 'generic') {
      // Only skip if it doesn't have meaningful children
      return !this.hasRelevantChildren(node, nodes);
    }

    return false; // Don't skip nodes with specific roles
  }

  /**
   * Check if a node has children with meaningful content
   * @param node The node to check for meaningful children
   * @param allNodes All nodes in the accessibility tree
   * @returns True if the node has children with meaningful content
   */
  private hasRelevantChildren(node: Protocol.Accessibility.AXNode, allNodes: Protocol.Accessibility.AXNode[]): boolean {
    // If no children, definitely no meaningful content
    if (!node.childIds?.length) {
      return false;
    }

    // Check direct children first
    for (const childId of node.childIds) {
      const childNode = allNodes.find(n => n.nodeId === childId);
      if (!childNode) { continue; }

      const childRole = String(childNode.role?.value || '').toLowerCase();

      // Check if child has direct content
      if (this.nodeHasDirectContent(childNode)) {
        return true;
      }

      // Skip checking further if child is also a structural node
      if (childRole === 'none' || childRole === 'generic') {
        // Recursively check if this child has meaningful descendants
        if (this.hasRelevantChildren(childNode, allNodes)) {
          return true;
        }
      } else if (childRole !== 'none' && childRole !== 'generic') {
        // Child has a specific role, which is likely meaningful
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a node has direct text content
   * @param node The node to check for content
   * @returns True if the node has direct text content
   */
  private nodeHasDirectContent(node: Protocol.Accessibility.AXNode): boolean {
    // Check for name property with content
    const nameProperty = node.properties?.find(p => String(p.name) === 'name');
    if (nameProperty?.value?.value !== undefined && String(nameProperty.value.value).trim() !== '') {
      return true;
    }

    // Check for value property with content
    const valueProperty = node.properties?.find(p => String(p.name) === 'value');
    if (valueProperty?.value?.value !== undefined && String(valueProperty.value.value).trim() !== '') {
      return true;
    }

    // Check role for text-specific roles
    const role = String(node.role?.value || '').toLowerCase();
    if (['statictext', 'text', 'heading', 'link', 'button'].includes(role)) {
      return true;
    }

    return false;
  }

  private async processNodeStructureRecursive(structure: unknown, accessibilityNodes: Protocol.Accessibility.AXNode[], mappedNodes: AccessibilityNode[]): Promise<unknown> {
    if (this.isEmptyOrUndefined(structure)) {
      return structure;
    }

    // Handle direct NodeID (a number)
    if (typeof structure === 'number') {
      const nodeId = structure;

      // Skip nodes with role 'none' or 'generic'
      if (this.shouldSkipNode(nodeId, accessibilityNodes)) {
        return null; // Return null for skipped nodes
      }

      const content = this.getNodeContent(nodeId, accessibilityNodes);
      const simplifiedRepresentation = Utils.getFormattedSubtreeByNodeId(String(nodeId), mappedNodes);
      return {
        originalNodeId: nodeId,
        content: content ?? '[Content not found]', // Provide fallback
        simplifiedRepresentation: simplifiedRepresentation ?? '[Simplified representation not found]', // Provide fallback
      };
    }

    if (Array.isArray(structure)) {
      // Process array of nodes or values
      const processedArray = [];
      for (const item of structure) {
        // Pass mappedNodes down recursively
        const processedItem = await this.processNodeStructureRecursive(item, accessibilityNodes, mappedNodes);
        // Only add non-null items (skip null items which are 'none' or 'generic' nodes)
        if (processedItem !== null) {
          processedArray.push(processedItem);
        }
      }
      return processedArray;
    }

    if (typeof structure === 'object' && structure !== null) {
      // Process object node
      const processedObject: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(structure)) {
        // Handle standard nodeId property
        if (key === 'nodeId' && typeof value === 'number') {
          const nodeId = value;

          // Skip nodes with role 'none' or 'generic'
          if (this.shouldSkipNode(nodeId, accessibilityNodes)) {
            // For nodeId properties, we'll keep the object but mark it as skipped
            processedObject.skipped = true;
            processedObject[key] = nodeId; // Keep the original nodeId
            continue;
          }

          const content = this.getNodeContent(nodeId, accessibilityNodes);
          const simplifiedRepresentation = Utils.getFormattedSubtreeByNodeId(String(nodeId), mappedNodes);

          processedObject[key] = nodeId; // Keep the original nodeId
          processedObject.content = content ?? '[Content not found]'; // Add the content with fallback
          processedObject.simplifiedRepresentation = simplifiedRepresentation ?? '[Simplified representation not found]'; // Add simplified representation with fallback

        } else if (typeof value === 'number') {
          // Direct NodeID as value (e.g., "title": 18)
          const nodeId = value;

          // Skip nodes with role 'none' or 'generic'
          if (this.shouldSkipNode(nodeId, accessibilityNodes)) {
            // For direct NodeID values, we'll skip this property entirely
            continue;
          }

          const content = this.getNodeContent(nodeId, accessibilityNodes);
          const simplifiedRepresentation = Utils.getFormattedSubtreeByNodeId(String(nodeId), mappedNodes);

          // Replace the NodeID with an object containing content and simplified representation
          processedObject[key] = {
            originalNodeId: nodeId,
            content: content ?? '[Content not found]', // Provide fallback
            simplifiedRepresentation: simplifiedRepresentation ?? '[Simplified representation not found]', // Provide fallback
          };
        } else {
          // Recursively process other fields
          // Pass mappedNodes down recursively
          processedObject[key] = await this.processNodeStructureRecursive(value, accessibilityNodes, mappedNodes);
        }
      }

      // If the object is marked as skipped and has no other properties except nodeId and skipped, return null
      if (processedObject.skipped && Object.keys(processedObject).length <= 3) {
        return null;
      }

      // Remove the skipped flag if it exists
      if ('skipped' in processedObject) {
        delete processedObject.skipped;
      }

      return processedObject;
    }

    // Return primitive values as is
    return structure;
  }

  /**
   * Helper to check if a value is empty or undefined
   * @param value The value to check
   * @returns True if empty or undefined, false otherwise
   */
  private isEmptyOrUndefined(value: unknown): boolean {
    return value === undefined || value === null || value === '';
  }


  async execute(args: { objective: string, schema: Record<string, unknown>, offset?: number, chunkSize?: number, maxRetries?: number }): Promise<SchemaBasedDataExtractionResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    const { objective, schema, offset = 0, chunkSize = 60000, maxRetries = 1 } = args; // Default offset 0, chunkSize 60000, maxRetries 1
    let currentTry = 0;
    let lastError: string | null = null;

    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    const { model: modelNameForExtraction, provider: providerForExtraction } = AIChatPanel.getMiniModelWithProvider();

    if (!apiKey) {
      return { error: 'API key not configured.' };
    }

    if (!objective || typeof objective !== 'string' || objective.trim() === '') {
      return { error: 'Objective must be a non-empty string' };
    }

    if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
      return { error: 'Schema must be a non-empty object' };
    }

    // --- Internal Agentic Loop ---
    while (currentTry <= maxRetries) {
      currentTry++;
      logger.warn(`SchemaBasedDataExtractionTool: Attempt ${currentTry}/${maxRetries + 1}`);
      let attemptError: Error | null = null;

      try {
        // --- Step 1: Get Tree ---
        logger.warn('SchemaBasedDataExtractionTool: Getting Accessibility Tree...');
        const getAccTreeTool = new GetAccessibilityTreeTool();
        const treeResult = await getAccTreeTool.execute({ reasoning: `Schema-based extraction attempt ${currentTry}` });
        if ('error' in treeResult) {throw new Error(`Tree Error: ${treeResult.error}`);}
        const accessibilityTreeString = treeResult.simplified;

        if (!accessibilityTreeString || accessibilityTreeString.trim() === '') {throw new Error('Tree Error: Empty or blank tree content.');}
        logger.warn('SchemaBasedDataExtractionTool: Got Accessibility Tree.');

        // --- Step 2: LLM - Extract NodeIDs According to Schema ---
        logger.warn('SchemaBasedDataExtractionTool: Extracting NodeIDs via LLM...');

        const promptExtractData = `
Objective: ${objective}

Schema: ${JSON.stringify(schema, null, 2)}

Full tree length: ${accessibilityTreeString.length} chars. Showing chars ${offset}-${offset + chunkSize}:
Simplified Accessibility Tree Chunk:
\`\`\`
${accessibilityTreeString.substring(offset, offset + chunkSize)}
\`\`\`
${accessibilityTreeString.length > offset + chunkSize ? `...(tree truncated at ${offset + chunkSize}/${accessibilityTreeString.length})...` : ''}
${lastError ? `Previous attempt failed with this error: "${lastError}". Consider a different approach.` : ''}
Extract NodeIDs according to the provided objective and schema, then return a structured JSON with NodeIDs instead of content.`;

        logger.info('SchemaBasedDataExtractionTool: Prompt:', promptExtractData);
        // Use LLMClient to call the LLM
        const llm = LLMClient.getInstance();
        const llmResponse = await llm.call({
          provider: providerForExtraction,
          model: modelNameForExtraction,
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: promptExtractData }
          ],
          systemPrompt: this.getSystemPrompt(),
          temperature: 0.7
        });
        const response = llmResponse.text;
        logger.info('SchemaBasedDataExtractionTool: Response:', response);

        // Process the LLM response - this now contains NodeIDs instead of content
        const nodeIdStructureJson = response?.trim() || '';

        // Basic validation to ensure we got JSON
        let nodeIdStructure;
        try {
          // Attempt to parse the JSON to validate it
          nodeIdStructure = JSON.parse(nodeIdStructureJson);
        } catch (error) {
          throw new Error(`LLM did not return valid JSON data: ${(error as Error).message}`);
        }

        // Step 3: Process the NodeID structure to replace IDs with content
        logger.warn('SchemaBasedDataExtractionTool: Processing NodeIDs to get content...');
        const processedStructure = await this.processNodeStructure(nodeIdStructure, treeResult.nodes);

        logger.info('SchemaBasedDataExtractionTool: Processed structure:', processedStructure);
        // Convert back to JSON string with proper formatting
        const jsonData = JSON.stringify(processedStructure);

        // Fetch page metadata
        let metadata: { url: string, title: string } | undefined;
        const pageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (pageTarget) {
          const metadataEval = await pageTarget.runtimeAgent().invoke_evaluate({
            expression: '({ url: window.location.href, title: document.title })',
            returnByValue: true,
          });
          metadata = metadataEval.result.value as { url: string, title: string };
        }

        // --- Success ---
        return {
          success: true,
          message: 'Successfully extracted data according to the provided schema',
          jsonData,
          processedLength: offset + chunkSize,
          totalLength: accessibilityTreeString.length,
          truncated: accessibilityTreeString.length > offset + chunkSize,
          metadata,
        };

      } catch (error) {
        // Catch errors from any step within the try block
        attemptError = error as Error;
        logger.warn(`SchemaBasedDataExtractionTool: Attempt ${currentTry} failed:`, attemptError.message);
        lastError = attemptError.message; // Store error message for the next attempt's prompt
      }
    } // End while loop

    // If loop finishes without success (i.e., all retries failed)
    return {
      error: `Failed data extraction after ${currentTry} attempts. Last error: ${lastError || 'Unknown error during final attempt.'}`
    };
  }

  schema = {
    type: 'object',
    properties: {
      objective: {
        type: 'string',
        description: 'The objective or goal of the extraction, explaining what information to find and why it is needed.',
      },
      schema: {
        type: 'object',
        description: 'Schema defining the structure of data to extract. Can include nested objects and arrays.',
      },
      offset: {
        type: 'number',
        description: 'Offset for the accessibility tree chunk (default: 0)',
        default: 0
      },
      chunkSize: {
        type: 'number',
        description: 'Size of the accessibility tree chunk (default: 60000)',
        default: 60000
      },
      maxRetries: {
        type: 'number',
        description: 'Maximum number of retries if an attempt fails (default: 1, meaning 2 total attempts).',
        default: 1,
      }
    },
    required: ['objective', 'schema'],
  };
}

// Create interfaces for the visit history tool results
export interface VisitHistoryDomainResult {
  visits: Array<{
    url: string,
    title: string,
    visitTime: string,
    keywords: string[],
  }>;
  count: number;
  error?: string;
}

export interface VisitHistoryKeywordResult {
  visits: Array<{
    url: string,
    title: string,
    visitTime: string,
    domain: string,
    keywords: string[],
  }>;
  count: number;
  error?: string;
}

export interface VisitHistorySearchResult {
  visits: Array<{
    url: string,
    title: string,
    visitTime: string,
    domain: string,
    keywords: string[],
  }>;
  count: number;
  filters: {
    domain?: string,
    keyword?: string,
    daysAgo?: number,
    limit?: number,
  };
  error?: string;
}

// Create proper classes for tools that implement the Tool interface
export class GetVisitsByDomainTool implements Tool<{ domain: string }, VisitHistoryDomainResult | ErrorResult> {
  name = 'get_visits_by_domain';
  description = 'Get a list of visited pages filtered by domain name';

  async execute(args: { domain: string }): Promise<VisitHistoryDomainResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    try {
      const visits = await VisitHistoryManager.getInstance().getVisitsByDomain(args.domain);

      return {
        visits: visits.map((visit: VisitData) => ({
          url: visit.url,
          title: visit.title,
          visitTime: new Date(visit.timestamp).toLocaleString(),
          keywords: visit.keywords
        })),
        count: visits.length
      };
    } catch (error) {
      return {
        error: String(error),
        visits: [],
        count: 0
      };
    }
  }

  schema = {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'The domain name to filter by (e.g., "example.com")'
      }
    },
    required: ['domain'],
  };
}

export class GetVisitsByKeywordTool implements Tool<{ keyword: string }, VisitHistoryKeywordResult | ErrorResult> {
  name = 'get_visits_by_keyword';
  description = 'Get a list of visited pages containing a specific keyword';

  async execute(args: { keyword: string }): Promise<VisitHistoryKeywordResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    try {
      const visits = await VisitHistoryManager.getInstance().getVisitsByKeyword(args.keyword);

      return {
        visits: visits.map((visit: VisitData) => ({
          url: visit.url,
          title: visit.title,
          visitTime: new Date(visit.timestamp).toLocaleString(),
          domain: visit.domain,
          keywords: visit.keywords
        })),
        count: visits.length
      };
    } catch (error) {
      return { error: `Failed to get visits for keyword ${args.keyword}: ${error}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'The keyword to search for in page content'
      }
    },
    required: ['keyword'],
  };
}

export class SearchVisitHistoryTool implements Tool<{
  domain?: string,
  keyword?: string,
  daysAgo?: number,
  limit?: number,
}, VisitHistorySearchResult | ErrorResult> {
  name = 'search_visit_history';
  description = 'Search browsing history with multiple filter criteria';

  async execute(args: {
    domain?: string,
    keyword?: string,
    daysAgo?: number,
    limit?: number,
  }): Promise<VisitHistorySearchResult | ErrorResult> {
    await createToolTracingObservation(this.name, args);
    try {
      const { domain, keyword, daysAgo, limit } = args;

      // Calculate time range if daysAgo is provided
      let startTime: number | undefined;
      let endTime: number | undefined;

      if (daysAgo !== undefined) {
        const now = Date.now();
        startTime = now - (daysAgo * 24 * 60 * 60 * 1000);
        endTime = now;
      }

      const visits = await VisitHistoryManager.getInstance().searchVisits({
        domain,
        keyword,
        startTime,
        endTime,
        limit
      });

      return {
        visits: visits.map(visit => ({
          url: visit.url,
          title: visit.title,
          visitTime: new Date(visit.timestamp).toLocaleString(),
          domain: visit.domain,
          keywords: visit.keywords
        })),
        count: visits.length,
        filters: {
          domain,
          keyword,
          daysAgo,
          limit
        }
      };
    } catch (error) {
      return { error: `Failed to search visit history: ${error}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'Optional domain filter'
      },
      keyword: {
        type: 'string',
        description: 'Optional keyword filter'
      },
      daysAgo: {
        type: 'number',
        description: 'Optional filter for how many days back to search'
      },
      limit: {
        type: 'number',
        description: 'Optional limit on number of results (default 100)'
      }
    }
  };
}

/**
 * Returns all available tools
 */
export function getTools(): Array<(
  Tool<{ selector: string }, ElementInspectionResult | ErrorResult> |
  Tool<{ url?: string, limit?: number }, NetworkAnalysisResult | ErrorResult> |
  Tool<{ code: string }, JavaScriptExecutionResult | ErrorResult> |
  Tool<{ limit?: number, level?: string }, ConsoleLogsResult | ErrorResult> |
  Tool<{ url: string, reasoning: string }, NavigationResult | ErrorResult> |
  Tool<{ steps: number, reasoning: string }, NavigateBackResult | ErrorResult> |
  Tool<{ objective: string, offset?: number, chunkSize?: number, maxRetries?: number }, ObjectiveDrivenActionResult | ErrorResult> |
  Tool<{ objective: string, schema: Record<string, unknown>, offset?: number, chunkSize?: number, maxRetries?: number }, SchemaBasedDataExtractionResult | ErrorResult> |
  Tool<{ schema: SchemaDefinition, instruction?: string, selectorOrXPath?: string }, SchemaExtractionResult | ErrorResult> |
  Tool<Record<string, unknown>, PageHTMLResult | ErrorResult> |
  Tool<Record<string, unknown>, DevToolsContext | ErrorResult> |
  Tool<{ selector: string }, ClickElementResult | ErrorResult> |
  Tool<{ query: string, limit?: number }, SearchContentResult | ErrorResult> |
  Tool<{ position?: { x: number, y: number }, direction?: string, amount?: number }, ScrollResult | ErrorResult> |
  Tool<{ reasoning: string }, AccessibilityTreeResult | ErrorResult> |
  Tool<{ method: string, nodeId: number, reasoning: string, args?: Record<string, unknown> | unknown[] }, PerformActionResult | ErrorResult> |
  Tool<Record<string, unknown>, FullPageAccessibilityTreeToMarkdownResult | ErrorResult> |
  Tool<{ nodeIds: number[] }, NodeIDsToURLsResult | ErrorResult> |
  Tool<{ reasoning: string, instruction?: string }, HTMLToMarkdownResult | ErrorResult> |
  Tool<{ url: string, reasoning: string, schema?: SchemaDefinition, markdownResponse?: boolean, extractionInstruction?: string }, CombinedExtractionResult | ErrorResult> |
  Tool<FetcherToolArgs, FetcherToolResult> |
  Tool<{ answer: string }, FinalizeWithCritiqueResult> |
  Tool<{ domain: string }, VisitHistoryDomainResult | ErrorResult> |
  Tool<{ keyword: string }, VisitHistoryKeywordResult | ErrorResult> |
  Tool<{ domain?: string, keyword?: string, daysAgo?: number, limit?: number }, VisitHistorySearchResult | ErrorResult>
)> {
  return [
    new ExecuteJavaScriptTool(),
    new NetworkAnalysisTool(),
    new GetPageHTMLTool(),
    new ClickElementTool(),
    new SearchContentTool(),
    new ScrollPageTool(),
    new NavigateURLTool(),
    new NavigateBackTool(),
    new GetAccessibilityTreeTool(),
    new GetVisibleAccessibilityTreeTool(),
    new NodeIDsToURLsTool(),
    new SchemaBasedExtractorTool(),
    new HTMLToMarkdownTool(),
    new FullPageAccessibilityTreeToMarkdownTool(),
    new CombinedExtractionTool(),
    new FetcherTool(),
    new FinalizeWithCritiqueTool(),
    new GetVisitsByDomainTool(),
    new GetVisitsByKeywordTool(),
    new SearchVisitHistoryTool()
  ];
}
