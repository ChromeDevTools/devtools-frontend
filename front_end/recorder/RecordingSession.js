// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Accessibility from '../accessibility/accessibility.js';
import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Elements from '../elements/elements.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

class Step {
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

class ClickStep extends Step {
  /**
   * @param {string} selector
   */
  constructor(selector) {
    super('click');
    this.selector = selector;
  }

  /**
   * @override
   */
  toString() {
    return `await page.click(${JSON.stringify(this.selector)});`;
  }
}

class NavigationStep extends Step {
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

class SubmitStep extends Step {
  /**
   * @param {string} selector
   */
  constructor(selector) {
    super('submit');
    this.selector = selector;
  }

  /**
   * @override
   */
  toString() {
    return `await page.submit(${JSON.stringify(this.selector)});`;
  }
}

class ChangeStep extends Step {
  /**
   * @param {string} selector
   * @param {string} value
   */
  constructor(selector, value) {
    super('change');
    this.selector = selector;
    this.value = value;
  }

  /**
   * @override
   */
  toString() {
    return `await page.type(${JSON.stringify(this.selector)}, ${JSON.stringify(this.value)});`;
  }
}

/**
 * @implements {ProtocolProxyApi.DebuggerDispatcher}
 */
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

    this._domModel = /** @type {!SDK.DOMModel.DOMModel} */ (target.model(SDK.DOMModel.DOMModel));
    this._axModel = /** @type {!Accessibility.AccessibilityModel.AccessibilityModel} */ (
        target.model(Accessibility.AccessibilityModel.AccessibilityModel));
    this._debuggerModel =
        /** @type {!SDK.DebuggerModel.DebuggerModel} */ (target.model(SDK.DebuggerModel.DebuggerModel));

    target.registerDebuggerDispatcher(this);
  }

  async start() {
    const setupEventListeners = () => {
      window.addEventListener('click', event => {}, true);
      window.addEventListener('submit', event => {}, true);
      window.addEventListener('change', event => {}, true);
    };

    const makeFunctionCallable = /** @type {function(*):string} */ (fn => `(${fn.toString()})()`);

    await this._debuggerModel.suspendModel();
    await this._debuggerAgent.invoke_enable({});
    await this._pageAgent.invoke_addScriptToEvaluateOnNewDocument({source: makeFunctionCallable(setupEventListeners)});
    await this._runtimeAgent.invoke_evaluate({expression: makeFunctionCallable(setupEventListeners)});

    await this._domDebuggerAgent.invoke_setEventListenerBreakpoint({eventName: 'click'});
    await this._domDebuggerAgent.invoke_setEventListenerBreakpoint({eventName: 'change'});
    await this._domDebuggerAgent.invoke_setEventListenerBreakpoint({eventName: 'submit'});

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
    this.appendLineToScript('const puppeteer = require(\'puppeteer\')');
    this.appendLineToScript('');
    this.appendLineToScript('(async () => {');
    this._currentIndentation += 1;
    this.appendLineToScript('const browser = await puppeteer.launch();');
    this.appendLineToScript('const page = await browser.newPage();');
    this.appendLineToScript('');
    this.appendStepToScript(new NavigationStep(mainFrame.url));
  }

  async stop() {
    this._currentIndentation -= 1;
    this.appendLineToScript('})();');
    this.appendLineToScript('');

    await this._debuggerModel.resumeModel();
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
   * @param {!Array.<!Protocol.Runtime.PropertyDescriptor>} localFrame
   */
  async handleClickEvent(localFrame) {
    const targetId = await this._findTargetId(localFrame, [
      'MouseEvent',
      'PointerEvent',
    ]);

    if (!targetId) {
      return;
    }

    const node = await this._domModel.pushNodeToFrontend(targetId);
    if (!node) {
      throw new Error('Node should not be null.');
    }

    // Clicking on a submit button will emit a submit event
    // which will be handled in a different handler.
    if (node.nodeName() === 'BUTTON' && node.getAttribute('type') === 'submit') {
      this.skip();
      return;
    }

    const selector = await this._getSelector(node);
    if (!selector) {
      throw new Error('Could not find selector');
    }
    this.appendStepToScript(new ClickStep(selector));
    await this.resume();
  }

  /**
   * @param {!Array.<!Protocol.Runtime.PropertyDescriptor>} localFrame
   */
  async handleSubmitEvent(localFrame) {
    const targetId = await this._findTargetId(localFrame, [
      'SubmitEvent',
    ]);

    if (!targetId) {
      return;
    }

    const node = await this._domModel.pushNodeToFrontend(targetId);
    if (!node) {
      throw new Error('Node should not be null.');
    }

    const selector = await this._getSelector(node);
    if (!selector) {
      throw new Error('Could not find selector');
    }

    this.appendStepToScript(new SubmitStep(selector));
    await this.resume();
  }

  /**
   * @param {!Array.<!Protocol.Runtime.PropertyDescriptor>} localFrame
   */
  async handleChangeEvent(localFrame) {
    const targetId = await this._findTargetId(localFrame, [
      'Event',
    ]);

    if (!targetId) {
      return;
    }

    const node = await this._domModel.pushNodeToFrontend(targetId);
    if (!node) {
      throw new Error('Node should not be null.');
    }

    const selector = await this._getSelector(node);
    if (!selector) {
      throw new Error('Could not find selector');
    }

    /**
     * @this {!HTMLInputElement}
     */
    function getValue() {
      return this.value;
    }

    const {result} = await this._runtimeAgent.invoke_callFunctionOn({
      functionDeclaration: getValue.toString(),
      objectId: targetId,
    });

    this.appendStepToScript(new ChangeStep(selector, /** @type {string} */ (result.value)));
    await this.resume();
  }

  async resume() {
    await this._debuggerAgent.invoke_setSkipAllPauses({skip: true});
    await this._debuggerAgent.invoke_resume({terminateOnResume: false});
    await this._debuggerAgent.invoke_setSkipAllPauses({skip: false});
  }

  async skip() {
    await this._debuggerAgent.invoke_resume({terminateOnResume: false});
  }

  /**
   * @param {!Array.<!Protocol.Runtime.PropertyDescriptor>} localFrame
   * @param {!Array<string>} interestingClassNames
   * @returns {!Promise<?Protocol.Runtime.RemoteObjectId>}
   */
  async _findTargetId(localFrame, interestingClassNames) {
    const event = localFrame.find(
        prop => !!(prop && prop.value && prop.value.className && interestingClassNames.includes(prop.value.className)));

    if (!event || !event.value || !event.value.objectId) {
      return null;
    }

    const eventProperties = await this._runtimeAgent.invoke_getProperties({
      objectId: event.value.objectId,
    });

    if (!eventProperties) {
      return null;
    }

    const target = eventProperties.result.find(prop => prop.name === 'target');

    if (!target || !target.value) {
      return null;
    }

    return target.value.objectId || null;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  async _getSelector(node) {
    const ariaSelector = await this._getAriaSelector(node);
    if (ariaSelector) {
      return ariaSelector;
    }

    const cssSelector = Elements.DOMPath.cssPath(node);
    if (cssSelector) {
      return cssSelector;
    }

    return null;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  async _getAriaSelector(node) {
    await this._axModel.requestPartialAXTree(node);
    let axNode = this._axModel.axNodeForDOMNode(node);
    while (axNode) {
      const roleObject = axNode.role();
      const nameObject = axNode.name();
      const role = roleObject ? roleObject.value : null;
      const name = nameObject ? nameObject.value : null;
      if (name && ['button', 'link', 'textbox', 'checkbox'].indexOf(role) !== -1) {
        return `aria/${name}`;
      }
      axNode = axNode.parentNode();
    }
    return null;
  }

  /**
   * @override
   * @param {!Protocol.Debugger.PausedEvent} params
   */
  paused(params) {
    const eventName = params.data.eventName;
    const localFrame = params.callFrames[0].scopeChain[0];

    if (!localFrame.object.objectId) {
      return;
    }
    this._runtimeAgent.invoke_getProperties({objectId: localFrame.object.objectId}).then(async ({result}) => {
      switch (eventName) {
        case 'listener:click':
          return this.handleClickEvent(result);
        case 'listener:submit':
          return this.handleSubmitEvent(result);
        case 'listener:change':
          return this.handleChangeEvent(result);
        default:
          this.skip();
      }
    });
  }

  /**
   * @override
   */
  breakpointResolved() {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }

  /**
   * @override
   */
  resumed() {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }

  /**
   * @override
   */
  scriptFailedToParse() {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }

  /**
   * @override
   */
  scriptParsed() {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }
}
