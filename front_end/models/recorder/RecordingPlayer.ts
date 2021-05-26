// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as puppeteer from '../../third_party/puppeteer/puppeteer.js';
import {getPuppeteerConnection as getPuppeteerConnectionToCurrentPage} from './PuppeteerConnection.js';

import type {Step, UserFlow} from './Steps.js';
import {assertAllStepTypesAreHandled} from './Steps.js';

export class RecordingPlayer {
  userFlow: UserFlow;

  constructor(userFlow: UserFlow) {
    this.userFlow = userFlow;
  }

  async play(): Promise<void> {
    await SDK.SDKModel.TargetManager.instance().suspendAllTargets();

    const {page, browser} = await getPuppeteerConnectionToCurrentPage();
    if (!page) {
      throw new Error('could not find main page!');
    }

    try {
      page.setDefaultTimeout(5000);
      let isFirstSection = true;

      for (const section of this.userFlow.sections) {
        if (isFirstSection) {
          await page.goto(section.url);
          isFirstSection = false;
        }

        for (const step of section.steps) {
          await this.step(browser, page, step);
        }
      }
    } catch (err) {
      console.error('ERROR', err.message);
    } finally {
      const pages = await browser.pages();
      for (const page of pages) {
        // @ts-ignore
        const client = page._client;
        await client.send('Network.disable');
        await client.send('Page.disable');
        await client.send('Log.disable');
        await client.send('Performance.disable');
        await client.send('Runtime.disable');
      }
      browser.disconnect();
      await SDK.SDKModel.TargetManager.instance().resumeAllTargets();
    }
  }

  async getTargetPage(browser: puppeteer.Browser, page: puppeteer.Page, step: Step): Promise<puppeteer.Page> {
    if (!('context' in step) || step.context.target === 'main') {
      return page;
    }

    const target = await browser.waitForTarget(t => t.url() === step.context.target);
    const targetPage = await target.page();

    if (!targetPage) {
      throw new Error('Could not find target page.');
    }
    return targetPage;
  }

  async getTargetPageAndFrame(browser: puppeteer.Browser, page: puppeteer.Page, step: Step):
      Promise<{targetPage: puppeteer.Page, frame: puppeteer.Frame}> {
    const targetPage = await this.getTargetPage(browser, page, step);
    let frame = targetPage.mainFrame();
    if ('context' in step) {
      for (const index of step.context.path) {
        frame = frame.childFrames()[index];
      }
    }
    return {targetPage, frame};
  }

  async step(browser: puppeteer.Browser, page: puppeteer.Page, step: Step): Promise<void> {
    const {targetPage, frame} = await this.getTargetPageAndFrame(browser, page, step);

    let condition: Promise<unknown>|null = null;

    if ('condition' in step && step.condition && step.condition.type === 'waitForNavigation') {
      condition = targetPage.waitForNavigation();
    }

    switch (step.type) {
      case 'click': {
        const element = await frame.waitForSelector(step.selector);
        if (!element) {
          throw new Error('Could not find element: ' + step.selector);
        }
        await element.click();
      } break;
      case 'change': {
        const element = await frame.waitForSelector(step.selector);
        if (!element) {
          throw new Error('Could not find element: ' + step.selector);
        }
        await element.type(step.value);
      } break;
      case 'submit': {
        const element = await frame.waitForSelector(step.selector);
        if (!element) {
          throw new Error('Could not find element: ' + step.selector);
        }
        await element.evaluate(form => (form as HTMLFormElement).submit());
      } break;
      case 'emulateNetworkConditions': {
        await page.emulateNetworkConditions(step.conditions);
      } break;
      case 'keydown': {
        await page.keyboard.down(step.key);
        await page.waitForTimeout(100);
      } break;
      case 'keyup': {
        await page.keyboard.up(step.key);
        await page.waitForTimeout(100);
      } break;
      case 'close': {
        await page.close();
      } break;
      default:
        assertAllStepTypesAreHandled(step);
    }

    await condition;
  }
}
