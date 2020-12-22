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
      expression = 'const targetPage = page;\n';
    } else {
      expression = `const target = await browser.waitForTarget(p => p.url() === ${JSON.stringify(this.target)});
        const targetPage = await target.page();
      `;
    }

    expression += 'const frame = targetPage.mainFrame()';
    for (const index of this.path) {
      expression += `.childFrames()[${index}]`;
    }
    expression += ';';
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
    return `{
      ${this.context}
      const element = await frame.waitForSelector(${JSON.stringify(this.selector)});
      await element.click();
    }`;
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
    return `{
      ${this.context}
      const element = await frame.waitForSelector(${JSON.stringify(this.selector)});
      await element.evaluate(form => form.submit());
    }`;
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
    return `{
      ${this.context}
      const element = await frame.waitForSelector(${JSON.stringify(this.selector)});
      await element.type(${JSON.stringify(this.value)});
    }`;
  }
}

const DOM_BREAKPOINTS = new Set(['Mouse:click', 'Control:change', 'Control:submit']);
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
    /** @type {Map<!SDK.SDKModel.Target, RecordingEventHandler>} */
    this._eventHandlers = new Map();

    /** @type {Set<!SDK.SDKModel.Target>} */
    this._targets = new Set();

    /** @type {Map<!SDK.DOMDebuggerModel.EventListenerBreakpoint, boolean>} */
    this._initialDomBreakpointState = new Map();

    /** @type {Array<!SDK.DOMDebuggerModel.EventListenerBreakpoint>} */
    this._interestingBreakpoints = [];

    /** @type {?Protocol.Page.ScriptIdentifier} */
    this._newDocumentScriptIdentifier = null;
  }

  async start() {
    const allDomBreakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints();
    this._interestingBreakpoints =
        allDomBreakpoints.filter(breakpoint => DOM_BREAKPOINTS.has(breakpoint.category() + ':' + breakpoint.title()));

    for (const breakpoint of this._interestingBreakpoints) {
      this._initialDomBreakpointState.set(breakpoint, breakpoint.enabled());
      breakpoint.setEnabled(true);
    }

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
    await this.appendLineToScript('const puppeteer = require(\'puppeteer\');');
    await this.appendLineToScript('');
    await this.appendLineToScript('(async () => {');
    this._currentIndentation += 1;
    await this.appendLineToScript('const browser = await puppeteer.launch();');
    await this.appendLineToScript('const page = await browser.newPage();');
    await this.appendLineToScript('');
    await this.appendStepToScript(new NavigationStep(mainFrame.url));
  }

  async stop() {
    for (const target of this._targets) {
      await this.detachFromTarget(target);
    }
    await this.detachFromTarget(this._target);

    await this.appendLineToScript('await browser.close();');
    this._currentIndentation -= 1;
    await this.appendLineToScript('})();');
    await this.appendLineToScript('');

    if (this._newDocumentScriptIdentifier) {
      await this._pageAgent.invoke_removeScriptToEvaluateOnNewDocument({identifier: this._newDocumentScriptIdentifier});
    }

    await this._debuggerModel.ignoreDebuggerPausedEvents(false);

    for (const [breakpoint, enabled] of this._initialDomBreakpointState.entries()) {
      breakpoint.setEnabled(enabled);
    }
  }

  /**
   * @param {string} line
   */
  async appendLineToScript(line) {
    let content = this._uiSourceCode.content();
    const indent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
    content += (indent.repeat(this._currentIndentation) + line).trimRight() + '\n';
    await this._uiSourceCode.setContent(content, false);
    const lastLine = content.split('\n').length;
    Common.Revealer.reveal(this._uiSourceCode.uiLocation(lastLine));
  }

  /**
   * @param {!Step} step
   */
  async appendStepToScript(step) {
    const lines = step.toString().split('\n').map(l => l.trim());
    for (const line of lines) {
      if (line === '}') {
        this._currentIndentation -= 1;
      }
      await this.appendLineToScript(line);
      if (line === '{') {
        this._currentIndentation += 1;
      }
    }
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
    this._targets.add(target);
    const eventHandler = new RecordingEventHandler(this, target);
    this._eventHandlers.set(target, eventHandler);
    target.registerDebuggerDispatcher(eventHandler);

    const pageAgent = target.pageAgent();

    const debuggerModel =
        /** @type {!SDK.DebuggerModel.DebuggerModel} */ (target.model(SDK.DebuggerModel.DebuggerModel));

    const childTargetManager = target.model(SDK.ChildTargetManager.ChildTargetManager);

    const setupEventListeners = `
      if (!window.__recorderEventListener) {
        const recorderEventListener = (event) => { };
        window.addEventListener('click', recorderEventListener, true);
        window.addEventListener('submit', recorderEventListener, true);
        window.addEventListener('change', recorderEventListener, true);
        window.__recorderEventListener = recorderEventListener;
      }
    `;

    // This uses the setEventListenerBreakpoint method from the debugger
    // to get notified about new events. Therefor disable the normal debugger
    // while recording.
    await debuggerModel.resumeModel();
    await debuggerModel.ignoreDebuggerPausedEvents(true);

    const {identifier} = await pageAgent.invoke_addScriptToEvaluateOnNewDocument({source: setupEventListeners});
    this._newDocumentScriptIdentifier = identifier;

    await this.evaluateInAllFrames(target, setupEventListeners);

    childTargetManager?.addEventListener(SDK.ChildTargetManager.Events.TargetCreated, this.handleWindowOpened, this);
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   */
  async detachFromTarget(target) {
    const eventHandler = this._eventHandlers.get(target);
    if (!eventHandler) {
      return;
    }
    target.unregisterDebuggerDispatcher(eventHandler);

    const debuggerModel =
        /** @type {!SDK.DebuggerModel.DebuggerModel} */ (target.model(SDK.DebuggerModel.DebuggerModel));

    await debuggerModel.ignoreDebuggerPausedEvents(false);
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   * @param {string} expression
   */
  async evaluateInAllFrames(target, expression) {
    const resourceTreeModel =
        /** @type {!SDK.ResourceTreeModel.ResourceTreeModel} */ (target.model(SDK.ResourceTreeModel.ResourceTreeModel));
    const runtimeModel = /** @type {!SDK.RuntimeModel.RuntimeModel} */ (target.model(SDK.RuntimeModel.RuntimeModel));
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
