// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Platform from '../../../core/platform/platform.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('MarkdownViewerUtil');

/**
 * Utility for opening markdown content in the AI Assistant viewer
 */
export class MarkdownViewerUtil {
  
  /**
   * Opens markdown content in the AI Assistant markdown viewer
   */
  static async openInAIAssistantViewer(markdownContent: string): Promise<void> {
    try {
      // Get the primary page target to navigate the inspected page
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        throw new Error('No primary target found');
      }

      // Get the ResourceTreeModel to navigate the page
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (!resourceTreeModel) {
        throw new Error('No ResourceTreeModel found');
      }

      // Navigate to ai-app://assistant
      const url = 'ai-app://assistant' as Platform.DevToolsPath.UrlString;
      const navigationResult = await resourceTreeModel.navigate(url);
      
      if (navigationResult.errorText) {
        throw new Error(`Navigation failed: ${navigationResult.errorText}`);
      }

      // Wait for the page to load, then inject the markdown content
      const injectContent = async () => {
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
          logger.error('No RuntimeModel found');
          return;
        }

        // Escape the markdown content for JavaScript injection
        const escapedContent = JSON.stringify(markdownContent);
        
        // JavaScript to inject - calls the global function we added to AI Assistant
        const injectionScript = `
          (function() {
            console.log('DevTools injecting markdown content...', 'Content length:', ${JSON.stringify(markdownContent.length)});
            console.log('Available global functions:', Object.keys(window).filter(k => k.includes('setDevTools') || k.includes('aiAssistant')));
            
            if (typeof window.setDevToolsMarkdown === 'function') {
              try {
                window.setDevToolsMarkdown(${escapedContent});
                console.log('Successfully called setDevToolsMarkdown function');
                return 'SUCCESS: Content injected via setDevToolsMarkdown function';
              } catch (error) {
                console.error('Error calling setDevToolsMarkdown:', error);
                return 'ERROR: Failed to call setDevToolsMarkdown: ' + error.message;
              }
            } else {
              console.warn('setDevToolsMarkdown function not found, using fallback methods');
              console.log('Available window properties:', Object.keys(window).filter(k => k.includes('DevTools') || k.includes('assistant') || k.includes('ai')));
              
              // Store in sessionStorage
              sessionStorage.setItem('devtools-markdown-content', ${escapedContent});
              console.log('Stored content in sessionStorage');
              
              // Try to trigger app reload
              if (window.aiAssistantApp && typeof window.aiAssistantApp.loadFromSessionStorage === 'function') {
                try {
                  window.aiAssistantApp.loadFromSessionStorage();
                  console.log('Successfully called aiAssistantApp.loadFromSessionStorage');
                  return 'SUCCESS: Content stored and app reloaded';
                } catch (error) {
                  console.error('Error calling loadFromSessionStorage:', error);
                  return 'ERROR: Content stored but failed to reload app: ' + error.message;
                }
              } else {
                console.log('aiAssistantApp not available or loadFromSessionStorage not a function');
                console.log('aiAssistantApp type:', typeof window.aiAssistantApp);
                if (window.aiAssistantApp) {
                  console.log('aiAssistantApp methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.aiAssistantApp)));
                }
                
                // Try to force a page reload as last resort
                try {
                  location.reload();
                  return 'SUCCESS: Content stored, forcing page reload';
                } catch (error) {
                  return 'SUCCESS: Content stored in sessionStorage, but manual refresh may be needed';
                }
              }
            }
          })();
        `;

        try {
          // Get the default execution context and evaluate the script
          const executionContext = runtimeModel.defaultExecutionContext();
          if (!executionContext) {
            console.error('No execution context available');
            return;
          }

          const result = await executionContext.evaluate({
            expression: injectionScript,
            objectGroup: 'console',
            includeCommandLineAPI: false,
            silent: false,
            returnByValue: true,
            generatePreview: false
          }, false, false);

          if ('error' in result) {
            console.error('Evaluation failed:', result.error);
            return;
          }

          if (result.object && result.object.value) {
            logger.debug('Markdown injection result:', result.object.value);
          } else if (result.exceptionDetails) {
            console.error('Exception during markdown injection:', result.exceptionDetails.text);
          }

        } catch (error) {
          console.error('Failed to inject markdown content:', error);
        }
      };

      // Wait a bit for the page to load, then inject content
      setTimeout(injectContent, 1500);

    } catch (error) {
      logger.error('Failed to open markdown in AI Assistant:', error);
      this.showErrorFallback(error.message);
    }
  }

  /**
   * Shows an error dialog as fallback when AI Assistant viewing fails
   */
  private static showErrorFallback(errorMessage: string): void {
    const errorDialog = new UI.Dialog.Dialog();
    errorDialog.setDimmed(true);
    errorDialog.contentElement.style.padding = '20px';
    errorDialog.contentElement.style.maxWidth = '400px';
    
    const title = document.createElement('h3');
    title.textContent = 'Unable to Open Report';
    title.style.margin = '0 0 10px 0';
    
    const message = document.createElement('p');
    message.textContent = `Failed to open report in AI Assistant: ${errorMessage}`;
    message.style.margin = '0 0 15px 0';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '8px 16px';
    closeButton.style.border = '1px solid var(--sys-color-outline)';
    closeButton.style.borderRadius = '4px';
    closeButton.style.background = 'var(--sys-color-surface)';
    closeButton.style.color = 'var(--sys-color-on-surface)';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', () => errorDialog.hide());
    
    errorDialog.contentElement.appendChild(title);
    errorDialog.contentElement.appendChild(message);
    errorDialog.contentElement.appendChild(closeButton);
    
    errorDialog.show();
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      errorDialog.hide();
    }, 5000);
  }

  /**
   * Creates a simple text-based report as fallback
   */
  static generateSimpleTextReport(results: any[], title: string): string {
    const lines: string[] = [];
    lines.push(`${title}\n${'='.repeat(title.length)}\n`);
    
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const total = results.length;
    
    lines.push(`Summary:`);
    lines.push(`- Total: ${total}`);
    lines.push(`- Passed: ${passed} (${Math.round(passed/total*100)}%)`);
    lines.push(`- Failed: ${failed} (${Math.round(failed/total*100)}%)`);
    lines.push(`- Errors: ${errors} (${Math.round(errors/total*100)}%)`);
    lines.push('');
    
    lines.push('Test Results:');
    results.forEach(result => {
      const status = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '⚠️' : '❌';
      lines.push(`${status} ${result.testId} (${result.duration}ms)`);
      if (result.error) {
        lines.push(`   Error: ${result.error}`);
      }
      if (result.validation?.summary) {
        lines.push(`   ${result.validation.summary}`);
      }
    });
    
    return lines.join('\n');
  }
}