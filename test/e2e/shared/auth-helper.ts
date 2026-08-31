// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import type * as puppeteer from 'puppeteer-core';

export async function chromeLogin(page: puppeteer.Page, username: string): Promise<void> {
  await page.goto('https://accounts.google.com', {waitUntil: 'networkidle2'});
  if (page.url().includes('myaccount.google.com')) {
    return;
  }
  await fillGoogleLoginPage(page, username);
  await page.waitForFunction(() => window.location.href.includes('myaccount.google.com'));
}

export async function fillGoogleLoginPage(page: puppeteer.Page, username: string): Promise<void> {
  const password = getOtaPassword(username);
  const nextBtn = await page.waitForSelector('#identifierNext, #passwordNext', {visible: true});
  if (!nextBtn) {
    throw new Error('Could not find Next button during login');
  }
  const isIdentifier = await nextBtn.evaluate((el: Element) => el.id === 'identifierNext');
  if (isIdentifier) {
    await typeTextIn(page, 'input[name="identifier"]', username);
    await page.click('#identifierNext');
  }
  const renderedInput = await page.waitForSelector('input[type="password"], input[name="contact"]', {visible: true});
  const isContactChallenge =
      await renderedInput?.evaluate((el: Element) => (el as HTMLInputElement).name === 'contact');
  if (isContactChallenge) {
    throw new Error('Account verification from trusted contact required!');
  }
  await typeTextIn(page, 'input[type="password"]', password);
  await page.click('#passwordNext');
}

export async function typeTextIn(page: puppeteer.Page, selector: string, value: string) {
  await page.focus(selector);
  await page.keyboard.type(value);
}

export async function configureDevToolsPreferences(page: puppeteer.Page) {
  const devtoolsPage = await page.openDevTools();
  if (!devtoolsPage) {
    throw new Error('Could not open DevTools page!');
  }
  await devtoolsPage.waitForFunction(() => window.location.origin.startsWith('devtools://'), {timeout: 1000})
      .catch(() => {});
  await devtoolsPage.evaluate(() => {
    localStorage.setItem('debugAiAssistancePanelEnabled', 'true');
    localStorage.setItem('aiAssistanceStructuredLogEnabled', 'true');
  });
  await devtoolsPage.close().catch((e: unknown) => console.error('Failed to close DevTools page:', e));
}

export function getOtaPassword(email: string): string {
  const cmd =
      `stubby call blade:identity-testaccount-service-prod TestaccountService.ChangeTestAccountPassword 'email: "${
          email}" generate_string_password: true' --output_json`;
  try {
    const output = execSync(cmd, {encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe']});
    const parsed = JSON.parse(output);
    if (!parsed || typeof parsed !== 'object' || !parsed.string_password) {
      throw new Error(`Could not find string_password in stubby JSON output:\n${output}`);
    }
    return parsed.string_password;
  } catch (error) {
    console.error(`Failed to get password for ${email}.`);
    if (error && typeof error === 'object' && 'stderr' in error) {
      console.error(`stubby error:\n${error.stderr}`);
    }
    throw error;
  }
}
