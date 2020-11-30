// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars
import {RecordingEventHandler} from './RecordingEventHandler.js';

export class StepFrameContext {
  /**
   * @param {!string} target
   * @param {!Array<number>} path
   */
  constructor(target, path = []) {
    this.path = path;
    this.target = target;
  }


  toString() {
    let expression = '';
    if (this.target === 'main') {
      expression = 'page';
    } else {
      expression = `(await browser.pages()).find(p => p.url() === ${JSON.stringify(this.target)})`;
    }

    if (this.path.length) {
      expression += '.mainFrame()';
    }
    for (const index of this.path) {
      expression += `.childFrames()[${index}]`;
    }

    return expression;
  }
}

export class Step {
  /**
   * @param {string} action
   */
  constructor(action) {
    this.action = action;
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    throw new Error('Must be implemented in subclass.');
  }
}

export class ClickStep extends Step {
  /**
   * @param {!StepFrameContext} context
   * @param {string} selector
   */
  constructor(context, selector) {
    super('click');
    this.context = context;
    this.selector = selector;
  }

  /**
   * @override
   */
  toString() {
    return `await ${this.context}.click(${JSON.stringify(this.selector)});`;
  }
}

export class NavigationStep extends Step {
  /**
   * @param {string} url
   */
  constructor(url) {
    super('navigate');
    this.url = url;
  }

  /**
   * @override
   */
  toString() {
    return `await page.goto(${JSON.stringify(this.url)});`;
  }
}

export class SubmitStep extends Step {
  /**
   * @param {!StepFrameContext} context
   * @param {string} selector
   */
  constructor(context, selector) {
    super('submit');
    this.context = context;
    this.selector = selector;
  }

  /**
   * @override
   */
  toString() {
    return `await ${this.context}.submit(${JSON.stringify(this.selector)});`;
  }
}

export class ChangeStep extends Step {
  /**
   * @param {!StepFrameContext} context
   * @param {string} selector
   * @param {string} value
   */
  constructor(context, selector, value) {
    super('change');
    this.context = context;
    this.selector = selector;
    this.value = value;
  }

  /**
   * @override
   */
  toString() {
    return `await ${this.context}.type(${JSON.stringify(this.selector)}, ${JSON.stringify(this.value)});`;
  }
}

export class RecordingSession {
  /**
   * @param {!SDK.SDKModel.Target} target
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  constructor(target, uiSourceCode) {
    this._target = target;
    this._uiSourceCode = uiSourceCode;
    this._currentIndentation = 0;

    this._debuggerAgent = target.debuggerAgent();
    this._domDebuggerAgent = target.domdebuggerAgent();
    this._runtimeAgent = target.runtimeAgent();
    this._accessibilityAgent = target.accessibilityAgent();
    this._pageAgent = target.pageAgent();
    this._targetAgent = target.targetAgent();

    this._domModel = /** @type {!SDK.DOMModel.DOMModel} */ (target.model(SDK.DOMModel.DOMModel));
    this._axModel = /** @type {!SDK.AccessibilityModel.AccessibilityModel} */ (
        target.model(SDK.AccessibilityModel.AccessibilityModel));
    this._debuggerModel =
        /** @type {!SDK.DebuggerModel.DebuggerModel} */ (target.model(SDK.DebuggerModel.DebuggerModel));

    this._resourceTreeModel =
        /** @type {!SDK.ResourceTreeModel.ResourceTreeModel} */ (target.model(SDK.ResourceTreeModel.ResourceTreeModel));
    this._runtimeModel = /** @type {!SDK.RuntimeModel.RuntimeModel} */ (target.model(SDK.RuntimeModel.RuntimeModel));
    this._childTargetManager = target.model(SDK.ChildTargetManager.ChildTargetManager);

    this._target = target;
  }

  async start() {
    this.attachToTarget(this._target);
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      throw new Error('Could not find main target');
    }
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('Could not find resource tree model');
    }

    const mainFrame = resourceTreeModel.mainFrame;

    if (!mainFrame) {
      throw new Error('Could not find main frame');
    }
    this.appendLineToScript('const puppeteer = require(\'puppeteer\');');
    this.appendLineToScript('');
    this.appendLineToScript('(async () => {');
    this._currentIndentation += 1;
    this.appendLineToScript('const browser = await puppeteer.launch();');
    this.appendLineToScript('const page = await browser.newPage();');
    this.appendLineToScript('');
    this.appendStepToScript(new NavigationStep(mainFrame.url));
  }

  async stop() {
    this.appendLineToScript('await browser.close();');
    this._currentIndentation -= 1;
    this.appendLineToScript('})();');
    this.appendLineToScript('');

    await this._debuggerModel.ignoreDebuggerPausedEvents(false);
  }

  /**
   * @param {string} line
   */
  appendLineToScript(line) {
    let content = this._uiSourceCode.content();
    const indent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
    content += (indent.repeat(this._currentIndentation) + line).trimRight() + '\n';
    this._uiSourceCode.setContent(content, false);
  }

  /**
   * @param {!Step} step
   */
  appendStepToScript(step) {
    this.appendLineToScript(step.toString());
  }

  /**
   * @param {string} targetId
   */
  async isSubmitButton(targetId) {
    /**
     * @this {!HTMLButtonElement}
     */
    function innerIsSubmitButton() {
      return this.tagName === 'BUTTON' && this.type === 'submit' && this.form !== null;
    }

    const {result} = await this._runtimeAgent.invoke_callFunctionOn({
      functionDeclaration: innerIsSubmitButton.toString(),
      objectId: targetId,
    });
    return result.value;
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   */
  async attachToTarget(target) {
    target.registerDebuggerDispatcher(new RecordingEventHandler(this, target));
    const debuggerAgent = target.debuggerAgent();
    const domDebuggerAgent = target.domdebuggerAgent();
    const pageAgent = target.pageAgent();

    const debuggerModel =
        /** @type {!SDK.DebuggerModel.DebuggerModel} */ (target.model(SDK.DebuggerModel.DebuggerModel));

    const resourceTreeModel =
        /** @type {!SDK.ResourceTreeModel.ResourceTreeModel} */ (target.model(SDK.ResourceTreeModel.ResourceTreeModel));
    const runtimeModel = /** @type {!SDK.RuntimeModel.RuntimeModel} */ (target.model(SDK.RuntimeModel.RuntimeModel));
    const childTargetManager = target.model(SDK.ChildTargetManager.ChildTargetManager);

    const setupEventListeners = () => {
      window.addEventListener('click', event => {}, true);
      window.addEventListener('submit', event => {}, true);
      window.addEventListener('change', event => {}, true);
    };

    const makeFunctionCallable = /** @type {function(*):string} */ (fn => `(${fn.toString()})()`);

    // This uses the setEventListenerBreakpoint method from the debugger
    // to get notified about new events. Therefor disable the normal debugger
    // while recording.
    await debuggerModel.ignoreDebuggerPausedEvents(true);
    await debuggerAgent.invoke_enable({});
    await pageAgent.invoke_addScriptToEvaluateOnNewDocument({source: makeFunctionCallable(setupEventListeners)});

    const expression = makeFunctionCallable(setupEventListeners);
    const executionContexts = runtimeModel.executionContexts();
    for (const frame of resourceTreeModel.frames()) {
      const executionContext = executionContexts.find(context => context.frameId === frame.id);
      if (!executionContext) {
        continue;
      }

      await executionContext.evaluate(
          {
            expression,
            objectGroup: undefined,
            includeCommandLineAPI: undefined,
            silent: undefined,
            returnByValue: undefined,
            generatePreview: undefined,
            allowUnsafeEvalBlockedByCSP: undefined,
            throwOnSideEffect: undefined,
            timeout: undefined,
            disableBreaks: undefined,
            replMode: undefined,
          },
          true, false);
    }


    await Promise.all([
      domDebuggerAgent.invoke_setEventListenerBreakpoint({eventName: 'click'}),
      domDebuggerAgent.invoke_setEventListenerBreakpoint({eventName: 'change'}),
      domDebuggerAgent.invoke_setEventListenerBreakpoint({eventName: 'submit'}),
    ]);

    childTargetManager?.addEventListener(SDK.ChildTargetManager.Events.TargetCreated, this.handleWindowOpened, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async handleWindowOpened(event) {
    if (event.data.type !== 'page') {
      return;
    }
    const executionContexts = this._runtimeModel.executionContexts();
    const executionContext = executionContexts.find(context => context.frameId === event.data.openerFrameId);
    if (!executionContext) {
      throw new Error('Could not find execution context in opened frame.');
    }

    await this._targetAgent.invoke_attachToTarget({targetId: event.data.targetId, flatten: true});
    const target = SDK.SDKModel.TargetManager.instance().targets().find(t => t.id() === event.data.targetId);

    if (!target) {
      throw new Error('Could not find target.');
    }

    this.attachToTarget(target);
  }
}
