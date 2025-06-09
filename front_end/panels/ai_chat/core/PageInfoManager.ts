// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Utils from '../common/utils.js'; // Path relative to core/ assuming utils.ts will be in common/ later, this will be common/utils.js
import { VisitHistoryManager } from '../tools/VisitHistoryManager.js'; // Path relative to core/ assuming VisitHistoryManager.ts will be in core/
import { createLogger } from './Logger.js';

const logger = createLogger('PageInfoManager');

// Add PageInfoManager class after imports but before other code
export class PageInfoManager {
  private static instance: PageInfoManager;
  private currentInfo: { url: string, title: string } | null = null;
  private accessibilityTree: string | null = null;
  private iframeContent: Array<{ role: string, name?: string, contentSimplified?: string }> | null = null;
  private listeners = new Set<(info: { url: string, title: string } | null) => void>();

  static getInstance(): PageInfoManager {
    if (!PageInfoManager.instance) {
      PageInfoManager.instance = new PageInfoManager();
    }
    return PageInfoManager.instance;
  }

  private constructor() {
    // Set up navigation event listeners
    SDK.TargetManager.TargetManager.instance().observeTargets({
      targetAdded: (target: SDK.Target.Target) => {
        if (target.type() === SDK.Target.Type.FRAME) {
          this.updatePageInfo();
        }
      },
      targetRemoved: () => { }
    });

    // Listen for target info changed events (includes navigation)
    SDK.TargetManager.TargetManager.instance().addEventListener(
      SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
      () => this.updatePageInfo()
    );

    // Initialize with current info
    this.updatePageInfo();
  }

  /**
   * Updates page information and fetches the latest accessibility tree
   * This method is used to explicitly refresh the data before each agent iteration
   */
  async updatePageInfoWithFullTree(): Promise<void> {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      this.setInfo(null);
      return;
    }

    try {
      // First update basic page info
      const result = await target.runtimeAgent().invoke_evaluate({
        expression: '({ url: window.location.href, title: document.title })',
        returnByValue: true,
      });

      if (result.result?.value) {
        const pageInfo = result.result.value as { url: string, title: string };
        this.setInfo(pageInfo);

        // Remove storeVisit call from here - we'll store after accessibility tree is loaded
      }

      // Then, fetch the latest accessibility tree
      await this.fetchAccessibilityTree(target);

      logger.debug('Updated page info and accessibility tree');
    } catch (error) {
      logger.error('Error updating page info with full tree:', error);
    }
  }

  private async updatePageInfo(): Promise<void> {
    try {
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        this.setInfo(null);
        return;
      }

      const result = await target.runtimeAgent().invoke_evaluate({
        expression: '({ url: window.location.href, title: document.title })',
        returnByValue: true,
      });

      if (result.result?.value) {
        const pageInfo = result.result.value as { url: string, title: string };
        this.setInfo(pageInfo);

        // Remove storeVisit call from here - we'll only store after accessibility tree is loaded
      } else {
        this.setInfo(null);
      }
    } catch (error) {
      logger.error('Error updating page info:', error);
      this.setInfo(null);
    }
  }

  private async fetchAccessibilityTree(target: SDK.Target.Target): Promise<void> {
    try {
      // Call the getVisibleAccessibilityTree function from Utils
      const treeResult = await Utils.getVisibleAccessibilityTree(target);

      // Store the simplified tree
      this.accessibilityTree = treeResult.simplified;

      // Store information about iframes - create an additional property
      this.iframeContent = treeResult.iframes
        .filter(iframe => iframe.contentSimplified)
        .map(iframe => ({
          role: iframe.role,
          name: iframe.name,
          contentSimplified: iframe.contentSimplified
        }));

      logger.debug('Accessibility tree updated:', this.accessibilityTree?.substring(0, 100) + '...');
      if (this.iframeContent?.length) {
        logger.debug(`Found ${this.iframeContent.length} iframes with content`);
      }

      // Keep this storeVisit call - it has the most complete data (page info + accessibility tree)
      const pageInfo = this.getCurrentInfo();
      if (pageInfo?.url) {
        // Store with the accessibility tree
        VisitHistoryManager.getInstance().storeVisit(pageInfo, this.accessibilityTree);
      }
    } catch (error) {
      logger.error('Error fetching accessibility tree:', error);
      this.accessibilityTree = null;
      this.iframeContent = [];
    }
  }

  private setInfo(info: { url: string, title: string } | null): void {
    const oldInfo = this.currentInfo;
    const isDifferent = !oldInfo || !info || oldInfo.url !== info.url || oldInfo.title !== info.title;

    if (isDifferent) {
      logger.debug('Page info updated:', info);
      this.currentInfo = info;
      // Notify all listeners
      this.listeners.forEach(listener => listener(info));
    }
  }

  getCurrentInfo(): { url: string, title: string } | null {
    return this.currentInfo;
  }

  getAccessibilityTree(): string | null {
    return this.accessibilityTree;
  }

  getIframeContent(): Array<{ role: string, name?: string, contentSimplified?: string }> | null {
    return this.iframeContent;
  }

  addListener(listener: (info: { url: string, title: string } | null) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }
}

// Initialize PageInfoManager
PageInfoManager.getInstance();

/**
 * Enhances a system prompt with current page context information
 * @param basePrompt The original system prompt to enhance
 * @returns The enhanced system prompt with page context information if available
 */
export async function enhancePromptWithPageContext(basePrompt: string): Promise<string> {
  // Fetch the latest accessibility tree before generating the prompt
  await PageInfoManager.getInstance().updatePageInfoWithFullTree();

  // Get current page info from the manager
  const pageInfo = PageInfoManager.getInstance().getCurrentInfo();
  const accessibilityTree = PageInfoManager.getInstance().getAccessibilityTree();
  const iframeContent = PageInfoManager.getInstance().getIframeContent();

  // If no page info is available, return the original prompt
  if (!pageInfo) {
    return basePrompt;
  }

  // TODO: Move out of the system prompt and into a separate context prompt
  // TODO: Add guardrails to protect user privacy and security
  // Add current page context with improved structure and instructions
  return `${basePrompt}

<Context>
  <User>
    <Date>${new Date().toLocaleDateString()}</Date>
    <Time>${new Date().toLocaleTimeString()}</Time>
  </User>
  <Page>
    <Title>${pageInfo.title}</Title>
    <URL>${pageInfo.url}</URL>
    <PartialAccessibility>
      <!-- This tree represents only the currently visible (viewport) section of the page, not the full page. -->
      ${accessibilityTree ? `<Tree>\n${accessibilityTree}\n</Tree>` : 'Unavailable'}
    </PartialAccessibility>
    ${iframeContent && iframeContent.length > 0 ?
      `<Iframes>
      ${iframeContent.map((iframe, index) =>
        `<Iframe index="${index + 1}" role="${iframe.role}"${iframe.name ? ` name="${iframe.name}"` : ''}>
          <Content>
${iframe.contentSimplified}
          </Content>
        </Iframe>`
      ).join('\n      ')}
    </Iframes>` : ''}
  </Page>
</Context>

Instructions:
- The user is currently viewing the web page described above.
- The accessibility tree provided is only for the section of the page currently visible to the user (the viewport), not the entire page.
- If you need the full page accessibility tree to answer the user's query, you have the ability to request it at any time.
- Use the page title, URL, and partial accessibility tree to inform your answers.
${iframeContent && iframeContent.length > 0 ? '- The page contains embedded iframes with their own content, which is included above.' : ''}
- If the user asks about the page, refer to this context.
- If the partial accessibility tree is present, use it to answer questions about visible page structure, elements, or accessibility.
- If you need to extract any data from the entire page, you must always use the extract_schema_data tool to do so. Do not attempt to extract data from the full page by any other means.
- If information is missing, answer based on what is available, or request the full page accessibility tree if necessary.
- Always be concise, accurate, and helpful.

Respond to the user's query with this context in mind.
`;
}
