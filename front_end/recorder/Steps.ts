// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import {Condition} from './Conditions.js';

export type Script = (string|null)[];

export class StepFrameContext {
  path: number[];
  target: string;
  constructor(target: string, path: number[] = []) {
    this.path = path;
    this.target = target;
  }

  toScript(): Script {
    const script = StepFrameContext.getExpressionForTarget(this.target);
    let expression = 'const frame = targetPage.mainFrame()';
    for (const index of this.path) {
      expression += `.childFrames()[${index}]`;
    }
    expression += ';';
    script.push(expression);
    return script;
  }

  static getExpressionForTarget(target: string): Script {
    if (target === 'main') {
      return ['const targetPage = page;'];
    }
    return [
      `const target = await browser.waitForTarget(p => p.url() === ${JSON.stringify(target)});`,
      'const targetPage = await target.page();',
    ];
  }
}

export class ConditionAddedEvent extends Event {
  data: {condition: Condition};

  constructor(condition: Condition) {
    super('condition-added', {});
    this.data = {condition};
  }
}

export abstract class Step extends EventTarget {
  action: string;
  condition: Condition|null;

  constructor(action: string) {
    super();

    this.action = action;
    this.condition = null;
  }

  abstract toScript(): Script;

  addCondition(condition: Condition): void {
    this.condition = condition;
    this.dispatchEvent(new ConditionAddedEvent(condition));
  }
}

export class ClickStep extends Step {
  context: StepFrameContext;
  selector: string;
  constructor(context: StepFrameContext, selector: string) {
    super('click');
    this.context = context;
    this.selector = selector;
  }

  toScript(): Script {
    return [
      ...this.context.toScript(),
      this.condition ? this.condition.toString() : null,
      `const element = await frame.waitForSelector(${JSON.stringify(this.selector)});`,
      'await element.click();',
      this.condition ? 'await promise;' : null,
    ];
  }
}

export class NavigationStep extends Step {
  url: string;
  constructor(url: string) {
    super('navigate');
    this.url = url;
  }

  toScript(): Script {
    return [`await page.goto(${JSON.stringify(this.url)});`];
  }
}

export class SubmitStep extends Step {
  context: StepFrameContext;
  selector: string;
  constructor(context: StepFrameContext, selector: string) {
    super('submit');
    this.context = context;
    this.selector = selector;
  }

  toScript(): Script {
    return [
      ...this.context.toScript(),
      this.condition ? this.condition.toString() : null,
      `const element = await frame.waitForSelector(${JSON.stringify(this.selector)});`,
      'await element.evaluate(form => form.submit());',
      this.condition ? 'await promise;' : null,
    ];
  }
}

export class ChangeStep extends Step {
  context: StepFrameContext;
  selector: string;
  value: string;
  constructor(context: StepFrameContext, selector: string, value: string) {
    super('change');
    this.context = context;
    this.selector = selector;
    this.value = value;
  }

  toScript(): Script {
    return [
      ...this.context.toScript(),
      this.condition ? this.condition.toString() : null,
      `const element = await frame.waitForSelector(${JSON.stringify(this.selector)});`,
      `await element.type(${JSON.stringify(this.value)});`,
      this.condition ? 'await promise;' : null,
    ];
  }
}

export class CloseStep extends Step {
  target: string;
  constructor(target: string) {
    super('close');
    this.target = target;
  }

  toScript(): Script {
    return [
      ...StepFrameContext.getExpressionForTarget(this.target),
      'await targetPage.close();',
    ];
  }
}

export class EmulateNetworkConditions extends Step {
  conditions: SDK.NetworkManager.Conditions;
  constructor(conditions: SDK.NetworkManager.Conditions) {
    super('emulateNetworkConditions');
    this.conditions = conditions;
  }

  toScript(): Script {
    // TODO(crbug.com/1161438): Update once puppeteer has better support for this
    return [
      `// Simulated network throttling (${this.conditions.title})`,
      'const client = await page.target().createCDPSession();',
      'await client.send(\'Network.enable\');',
      'await client.send(\'Network.emulateNetworkConditions\', {',
      '  // Network connectivity is absent',
      `  offline: ${!this.conditions.download && !this.conditions.upload},`,
      '  // Download speed (bytes/s)',
      `  downloadThroughput: ${this.conditions.download},`,
      '  // Upload speed (bytes/s)',
      `  uploadThroughput: ${this.conditions.upload},`,
      '  // Latency (ms)',
      `  latency: ${this.conditions.latency},`,
      '});',
    ];
  }
}
