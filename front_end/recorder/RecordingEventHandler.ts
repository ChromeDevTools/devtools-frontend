// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Elements from '../elements/elements.js';
import * as SDK from '../sdk/sdk.js';
import {Condition, WaitForNavigationCondition} from './Conditions.js';
import {RecordingSession} from './RecordingSession.js';
import {ChangeStep, ClickStep, CloseStep, Step, StepFrameContext, SubmitStep} from './Steps.js';

const RELEVANT_ROLES_FOR_ARIA_SELECTORS = new Set<string>(['button', 'link', 'textbox', 'checkbox']);

export class RecordingEventHandler implements ProtocolProxyApi.DebuggerDispatcher {
  private target: SDK.SDKModel.Target;
  private session: RecordingSession;
  private runtimeModel: SDK.RuntimeModel.RuntimeModel;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  private debuggerAgent: ProtocolProxyApi.DebuggerApi;
  private runtimeAgent: ProtocolProxyApi.RuntimeApi;
  private domModel: SDK.DOMModel.DOMModel;
  private axModel: SDK.AccessibilityModel.AccessibilityModel;
  private lastStep: Step|null;
  private lastStepTimeout: number|null;

  constructor(session: RecordingSession, target: SDK.SDKModel.Target) {
    this.target = target;
    this.session = session;
    this.lastStep = null;
    this.lastStepTimeout = null;

    this.runtimeAgent = target.runtimeAgent();
    this.debuggerAgent = target.debuggerAgent();
    this.runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel) as SDK.RuntimeModel.RuntimeModel;
    this.resourceTreeModel =
        target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    this.domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    this.axModel = target.model(SDK.AccessibilityModel.AccessibilityModel) as SDK.AccessibilityModel.AccessibilityModel;
  }

  async isSubmitButton(targetId: string): Promise<unknown> {
    function innerIsSubmitButton(this: HTMLButtonElement): boolean {
      return this.tagName === 'BUTTON' && this.type === 'submit' && this.form !== null;
    }

    const {result} = await this.runtimeAgent.invoke_callFunctionOn({
      functionDeclaration: innerIsSubmitButton.toString(),
      objectId: targetId,
    });
    return result.value;
  }

  async getSelector(node: SDK.DOMModel.DOMNode): Promise<string|null> {
    const ariaSelector = await this.getAriaSelector(node);
    if (ariaSelector) {
      return ariaSelector;
    }

    const cssSelector = Elements.DOMPath.cssPath(node);
    if (cssSelector) {
      return cssSelector;
    }

    return null;
  }

  async findTargetId(localFrame: Protocol.Runtime.PropertyDescriptor[], interestingClassNames: string[]):
      Promise<string|null|undefined> {
    const event = localFrame.find(
        prop => Boolean(
            prop && prop.value && prop.value.className && interestingClassNames.includes(prop.value.className)));

    if (!event || !event.value || !event.value.objectId) {
      return null;
    }

    const eventProperties = await this.runtimeAgent.invoke_getProperties({
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

  async getAriaSelector(node: SDK.DOMModel.DOMNode): Promise<string|null> {
    await this.axModel.requestPartialAXTree(node);
    let axNode = this.axModel.axNodeForDOMNode(node);
    while (axNode) {
      const roleObject = axNode.role();
      const nameObject = axNode.name();
      const role = roleObject ? roleObject.value : null;
      const name = nameObject ? nameObject.value : null;
      if (name && RELEVANT_ROLES_FOR_ARIA_SELECTORS.has(role)) {
        return `aria/${name}`;
      }
      axNode = axNode.parentNode();
    }
    return null;
  }

  async handleClickEvent(context: StepFrameContext, localFrame: Protocol.Runtime.PropertyDescriptor[]): Promise<void> {
    const targetId = await this.findTargetId(localFrame, [
      'MouseEvent',
      'PointerEvent',
    ]);

    if (!targetId) {
      this.skip();
      return;
    }

    const node = await this.domModel.pushNodeToFrontend(targetId);
    if (!node) {
      throw new Error('Node should not be null.');
    }

    // Clicking on a submit button will emit a submit event
    // which will be handled in a different handler.
    if (node.nodeName() === 'BUTTON' && node.getAttribute('type') === 'submit') {
      this.skip();
      return;
    }

    const selector = await this.getSelector(node);
    if (!selector) {
      throw new Error('Could not find selector');
    }
    this.appendStep(new ClickStep(context, selector));
    await this.resume();
  }

  async handleSubmitEvent(context: StepFrameContext, localFrame: Protocol.Runtime.PropertyDescriptor[]): Promise<void> {
    const targetId = await this.findTargetId(localFrame, [
      'SubmitEvent',
    ]);

    if (!targetId) {
      this.skip();
      return;
    }

    const node = await this.domModel.pushNodeToFrontend(targetId);
    if (!node) {
      throw new Error('Node should not be null.');
    }

    const selector = await this.getSelector(node);
    if (!selector) {
      throw new Error('Could not find selector');
    }

    this.appendStep(new SubmitStep(context, selector));
    await this.resume();
  }

  async handleChangeEvent(context: StepFrameContext, localFrame: Protocol.Runtime.PropertyDescriptor[]): Promise<void> {
    const targetId = await this.findTargetId(localFrame, [
      'Event',
    ]);

    if (!targetId) {
      this.skip();
      return;
    }

    const node = await this.domModel.pushNodeToFrontend(targetId);
    if (!node) {
      throw new Error('Node should not be null.');
    }

    const selector = await this.getSelector(node);
    if (!selector) {
      throw new Error('Could not find selector');
    }

    function getValue(this: HTMLInputElement): string {
      return this.value;
    }

    const {result} = await this.runtimeAgent.invoke_callFunctionOn({
      functionDeclaration: getValue.toString(),
      objectId: targetId,
    });
    this.appendStep(new ChangeStep(context, selector, result.value as string));
    await this.resume();
  }

  getTarget(): string {
    return this.target.id() === 'main' ? 'main' : this.target.inspectedURL();
  }

  getContextForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): StepFrameContext {
    const path = [];
    let currentFrame: SDK.ResourceTreeModel.ResourceTreeFrame = frame;
    while (currentFrame) {
      const parentFrame = currentFrame.parentFrame();
      if (!parentFrame) {
        break;
      }

      const childFrames = parentFrame.childFrames;
      const index = childFrames.indexOf(currentFrame);
      path.unshift(index);
      currentFrame = parentFrame;
    }

    const target = this.getTarget();
    return new StepFrameContext(target, path);
  }

  async resume(): Promise<void> {
    await this.debuggerAgent.invoke_setSkipAllPauses({skip: true});
    await this.debuggerAgent.invoke_resume({terminateOnResume: false});
    await this.debuggerAgent.invoke_setSkipAllPauses({skip: false});
  }

  async skip(): Promise<void> {
    await this.debuggerAgent.invoke_resume({terminateOnResume: false});
  }

  paused(params: Protocol.Debugger.PausedEvent): void {
    if (params.reason !== 'EventListener') {
      this.skip();
      return;
    }

    const eventName = params.data.eventName;
    const localFrame = params.callFrames[0].scopeChain[0];

    const scriptId = params.callFrames[0].location.scriptId;
    const executionContextId = this.runtimeModel.executionContextIdForScriptId(scriptId);
    const executionContext = this.runtimeModel.executionContext(executionContextId);
    if (!executionContext) {
      throw new Error('Could not find execution context.');
    }
    if (!executionContext.frameId) {
      throw new Error('Execution context is not assigned to a frame.');
    }
    const frame = this.resourceTreeModel.frameForId(executionContext.frameId);
    if (!frame) {
      throw new Error('Could not find frame.');
    }

    const context = this.getContextForFrame(frame);

    if (!localFrame.object.objectId) {
      return;
    }
    this.runtimeAgent.invoke_getProperties({objectId: localFrame.object.objectId}).then(async ({result}) => {
      switch (eventName) {
        case 'listener:click':
          return this.handleClickEvent(context, result);
        case 'listener:submit':
          return this.handleSubmitEvent(context, result);
        case 'listener:change':
          return this.handleChangeEvent(context, result);
        default:
          this.skip();
      }
    });
  }

  appendStep(step: Step): void {
    this.session.appendStep(step);
    this.lastStep = step;
    if (this.lastStepTimeout) {
      window.clearTimeout(this.lastStepTimeout);
    }
    this.lastStepTimeout = window.setTimeout(() => {
      this.lastStep = null;
      this.lastStepTimeout = null;
    }, 1000);
  }

  addConditionToLastStep(condition: Condition): void {
    if (!this.lastStep) {
      return;
    }

    this.lastStep.addCondition(condition);
  }

  targetDestroyed(): void {
    this.appendStep(new CloseStep(this.getTarget()));
  }

  targetInfoChanged(url: string): void {
    this.addConditionToLastStep(new WaitForNavigationCondition(url));
  }

  breakpointResolved(): void {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }

  resumed(): void {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }

  scriptFailedToParse(): void {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }

  scriptParsed(): void {
    // Added here to fullfill the ProtocolProxyApi.DebuggerDispatcher interface.
  }
}
