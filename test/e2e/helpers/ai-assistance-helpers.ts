// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../shared/frontend-helper.js';

/**
 * Inspects a node via the DevTools Console.
 */
export async function inspectNode(devToolsPage: DevToolsPage, selector: string): Promise<void> {
  await devToolsPage.click('#tab-console');
  await devToolsPage.click('aria/Console prompt');
  await devToolsPage.typeText(`inspect(document.querySelector(${JSON.stringify(selector)}))`);
  await devToolsPage.pressKey('Enter');
  await new Promise(r => setTimeout(r, 1000));
}

/**
 * Dismisses the AI Assistance opt-in onboarding dialog if it is present.
 */
export async function dismissOptInDialogIfPresent(devToolsPage: DevToolsPage): Promise<boolean> {
  try {
    const dialog = await devToolsPage.$('.opt-in-change-dialog');
    if (dialog && await dialog.evaluate(el => (el as HTMLElement).checkVisibility())) {
      const btn = await devToolsPage.$('pierceShadowText/Got it', dialog);
      if (btn) {
        await btn.click();
        return true;
      }
    }
  } catch {
    // Ignore if dialog is not present.
  }
  return false;
}

/**
 * Types a query into the AI Assistance chat input.
 */
export async function typeQuery(devtoolsPage: DevToolsPage, query: string): Promise<void> {
  const inputSelector = 'textarea.chat-input';
  await devtoolsPage.waitForFunction(async () => {
    const input = await devtoolsPage.$(inputSelector);
    if (input) {
      return true;
    }
    const disabled = await devtoolsPage.$('.disabled-view');
    if (disabled) {
      const text = await disabled.evaluate(el => (el as HTMLElement).innerText?.trim());
      throw new Error(`AI Assistance panel is disabled: "${text}"`);
    }
    return false;
  }, undefined, 'Waiting for AI chat input');

  await devtoolsPage.scrollElementIntoView(inputSelector);
  await devtoolsPage.click(inputSelector);
  await devtoolsPage.typeText(query);
}

/**
 * Gets AI structured logs from localStorage after waiting for a response to complete.
 */
export async function getAiLogs(devToolsPage: DevToolsPage): Promise<Array<Record<string, unknown>>|null> {
  let resultLogs: Array<Record<string, unknown>>|null = null;
  await devToolsPage.waitForFunction(async () => {
    const logsJson = await devToolsPage.evaluate(() => localStorage.getItem('aiAssistanceStructuredLog'));
    if (logsJson) {
      try {
        const logs = JSON.parse(logsJson);
        if (Array.isArray(logs) && logs.length > 0) {
          const lastLog = logs[logs.length - 1];
          if (lastLog && (lastLog.completed || lastLog.aidaResponse)) {
            resultLogs = logs;
            return true;
          }
        }
      } catch {
        // Parse error, continue waiting.
      }
    }

    return false;
  }, undefined, 'Waiting for AI response');

  return resultLogs;
}
