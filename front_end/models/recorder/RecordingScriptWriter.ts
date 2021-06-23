// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Step, ClickStep, StepWithFrameContext, ChangeStep, UserFlow, EmulateNetworkConditionsStep, KeyDownStep, KeyUpStep, CloseStep, ViewportStep, ScrollStep} from './Steps.js';
import {assertAllStepTypesAreHandled, typeableInputTypes} from './Steps.js';

export class RecordingScriptWriter {
  private indentation: string;
  private script: string[] = [];
  private currentIndentation = 0;

  constructor(indentation: string) {
    this.indentation = indentation;
  }

  appendLineToScript(line: string): void {
    this.script.push(line ? this.indentation.repeat(this.currentIndentation) + line.trimRight() : '');
  }

  appendTarget(target: string): void {
    if (target === 'main') {
      this.appendLineToScript('const targetPage = page;');
    } else {
      this.appendLineToScript(`const target = await browser.waitForTarget(t => t.url === ${JSON.stringify(target)});`);
      this.appendLineToScript('const targetPage = await target.page();');
    }
  }

  appendFrame(path: number[]): void {
    this.appendLineToScript('let frame = targetPage.mainFrame();');
    for (const index of path) {
      this.appendLineToScript(`frame = frame.childFrames()[${index}];`);
    }
  }

  appendContext(step: StepWithFrameContext): void {
    this.appendTarget(step.context.target);
    this.appendFrame(step.context.path);
  }

  appendWaitForSelector(step: ClickStep|ChangeStep|ScrollStep): void {
    if (step.selector instanceof Array) {
      this.appendLineToScript(`let element = await frame.waitForSelector(${JSON.stringify(step.selector[0])});`);
      for (const part of step.selector.slice(1)) {
        this.appendLineToScript(`element = await element.$(${JSON.stringify(part)});`);
        this.appendLineToScript(
            'element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();');
      }
    } else {
      this.appendLineToScript(`const element = await frame.waitForSelector(${JSON.stringify(step.selector)});`);
    }
  }

  appendClickStep(step: ClickStep): void {
    this.appendWaitForSelector(step);
    this.appendLineToScript('const {offsetLeft, offsetTop} = await element.evaluate(el => {');
    this.appendLineToScript('  const styles = getComputedStyle(el);');
    this.appendLineToScript('  const borderTop = parseFloat(styles.getPropertyValue(\'border-top-width\'));');
    this.appendLineToScript('  const borderLeft = parseFloat(styles.getPropertyValue(\'border-left-width\'));');
    this.appendLineToScript('  return {');
    this.appendLineToScript('    offsetTop: el.offsetTop + borderTop,');
    this.appendLineToScript('    offsetLeft: el.offsetLeft + borderLeft,');
    this.appendLineToScript('  };');
    this.appendLineToScript('});');
    this.appendLineToScript(`await page.mouse.click(offsetLeft + ${step.offsetX}, offsetTop + ${step.offsetY});`);
  }

  appendChangeStep(step: ChangeStep): void {
    this.appendWaitForSelector(step);
    this.appendLineToScript('const type = await element.evaluate(el => el.type);');
    this.appendLineToScript(`if (${JSON.stringify(Array.from(typeableInputTypes))}.includes(type)) {`);
    this.appendLineToScript(`  await element.type(${JSON.stringify(step.value)});`);
    this.appendLineToScript('} else {');
    this.appendLineToScript('  await element.focus();');
    this.appendLineToScript('  await element.evaluate((el, value) => {');
    this.appendLineToScript('    el.value = value;');
    this.appendLineToScript('    el.dispatchEvent(new Event(\'input\', { bubbles: true }));');
    this.appendLineToScript('    el.dispatchEvent(new Event(\'change\', { bubbles: true }));');
    this.appendLineToScript(`  }, ${JSON.stringify(step.value)});`);
    this.appendLineToScript('}');
  }

  appendEmulateNetworkConditionsStep(step: EmulateNetworkConditionsStep): void {
    this.appendLineToScript('await page.emulateNetworkConditions({');
    this.appendLineToScript(`  offline: ${!step.conditions.download && !step.conditions.upload},`);
    this.appendLineToScript(`  downloadThroughput: ${step.conditions.download},`);
    this.appendLineToScript(`  uploadThroughput: ${step.conditions.upload},`);
    this.appendLineToScript(`  latency: ${step.conditions.latency},`);
    this.appendLineToScript('});');
  }

  appendKeyDownStep(step: KeyDownStep): void {
    this.appendLineToScript(`await targetPage.keyboard.down(${JSON.stringify(step.key)});`);
  }

  appendKeyUpStep(step: KeyUpStep): void {
    this.appendLineToScript(`await targetPage.keyboard.up(${JSON.stringify(step.key)});`);
  }

  appendCloseStep(_step: CloseStep): void {
    this.appendLineToScript('await targetPage.close()');
  }

  appendViewportStep(step: ViewportStep): void {
    this.appendLineToScript(
        `await targetPage.setViewport(${JSON.stringify({width: step.width, height: step.height})}})`);
  }

  appendScrollStep(step: ScrollStep): void {
    if (step.selector) {
      this.appendWaitForSelector(step);
      this.appendLineToScript(
          `await element.evaluate((el, x, y) => { el.scrollTop = y; el.scrollLeft = x; }, ${step.x}, ${step.y});`);
    } else {
      this.appendLineToScript(`await targetPage.evaluate((x, y) => { window.scroll(x, y); }, ${step.x}, ${step.y})`);
    }
  }

  appendStepType(step: Step): void {
    switch (step.type) {
      case 'click':
        return this.appendClickStep(step);
      case 'change':
        return this.appendChangeStep(step);
      case 'emulateNetworkConditions':
        return this.appendEmulateNetworkConditionsStep(step);
      case 'keydown':
        return this.appendKeyDownStep(step);
      case 'keyup':
        return this.appendKeyUpStep(step);
      case 'close':
        return this.appendCloseStep(step);
      case 'viewport':
        return this.appendViewportStep(step);
      case 'scroll':
        return this.appendScrollStep(step);
      default:
        return assertAllStepTypesAreHandled(step);
    }
  }


  appendStep(step: Step): void {
    this.appendLineToScript('{');
    this.currentIndentation += 1;

    if ('condition' in step && step.condition && step.condition.type === 'waitForNavigation') {
      this.appendLineToScript('const promise = targetPage.waitForNavigation();');
    }

    if ('context' in step) {
      this.appendContext(step);
    }

    this.appendStepType(step);

    if ('condition' in step) {
      this.appendLineToScript('await promise;');
    }

    this.currentIndentation -= 1;
    this.appendLineToScript('}');
  }

  getCurrentScript(): string {
    // Scripts should end with a final blank line.
    return this.script.join('\n') + '\n';
  }

  getScript(recording: UserFlow): string {
    this.script = [];
    this.appendLineToScript('const puppeteer = require(\'puppeteer\');');
    this.appendLineToScript('');
    this.appendLineToScript('(async () => {');
    this.currentIndentation += 1;
    this.appendLineToScript('const browser = await puppeteer.launch();');
    this.appendLineToScript('const page = await browser.newPage();');
    this.appendLineToScript('');

    for (const section of recording.sections) {
      for (const step of section.steps) {
        this.appendStep(step);
      }
    }

    this.appendLineToScript('');
    this.appendLineToScript('await browser.close();');
    this.currentIndentation -= 1;
    this.appendLineToScript('})();');

    // Scripts should end with a final blank line.
    return this.getCurrentScript();
  }
}
