// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars
import {RecordingEventHandler} from './RecordingEventHandler.js';
import {RecordingScriptWriter} from './RecordingScriptWriter.js';
import {EmulateNetworkConditions, NavigationStep, Step} from './Steps.js';

const DOM_BREAKPOINTS = new Set<string>(['Mouse:click', 'Control:change', 'Control:submit']);

export class RecordingSession {
  _target: SDK.SDKModel.Target;
  _uiSourceCode: Workspace.UISourceCode.UISourceCode;
  _debuggerAgent: ProtocolProxyApi.DebuggerApi;
  _domDebuggerAgent: ProtocolProxyApi.DOMDebuggerApi;
  _runtimeAgent: ProtocolProxyApi.RuntimeApi;
  _accessibilityAgent: ProtocolProxyApi.AccessibilityApi;
  _pageAgent: ProtocolProxyApi.PageApi;
  _targetAgent: ProtocolProxyApi.TargetApi;
  _networkManager: SDK.NetworkManager.MultitargetNetworkManager;
  _domModel: SDK.DOMModel.DOMModel;
  _axModel: SDK.AccessibilityModel.AccessibilityModel;
  _debuggerModel: SDK.DebuggerModel.DebuggerModel;
  _resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  _runtimeModel: SDK.RuntimeModel.RuntimeModel;
  _childTargetManager: SDK.ChildTargetManager.ChildTargetManager|null;
  _eventHandlers: Map<string, RecordingEventHandler>;
  _targets: Map<string, SDK.SDKModel.Target>;
  _initialDomBreakpointState: Map<SDK.DOMDebuggerModel.EventListenerBreakpoint, boolean>;
  _interestingBreakpoints: SDK.DOMDebuggerModel.EventListenerBreakpoint[];
  _newDocumentScriptIdentifier: string|null;
  steps: Step[] = [];
  _indentation: string;
  _scriptWriter: RecordingScriptWriter|null = null;

  constructor(target: SDK.SDKModel.Target, uiSourceCode: Workspace.UISourceCode.UISourceCode, indentation: string) {
    this._target = target;
    this._uiSourceCode = uiSourceCode;
    this._indentation = indentation;

    this._debuggerAgent = target.debuggerAgent();
    this._domDebuggerAgent = target.domdebuggerAgent();
    this._runtimeAgent = target.runtimeAgent();
    this._accessibilityAgent = target.accessibilityAgent();
    this._pageAgent = target.pageAgent();
    this._targetAgent = target.targetAgent();

    this._networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    this._domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    this._axModel =
        target.model(SDK.AccessibilityModel.AccessibilityModel) as SDK.AccessibilityModel.AccessibilityModel;
    this._debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    this._resourceTreeModel =
        target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    this._runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel) as SDK.RuntimeModel.RuntimeModel;
    this._childTargetManager = target.model(SDK.ChildTargetManager.ChildTargetManager);

    this._target = target;
    this._eventHandlers = new Map();

    this._targets = new Map();

    this._initialDomBreakpointState = new Map();

    this._interestingBreakpoints = [];

    this._newDocumentScriptIdentifier = null;
  }

  async start(): Promise<void> {
    const allDomBreakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints();
    this._interestingBreakpoints =
        allDomBreakpoints.filter(breakpoint => DOM_BREAKPOINTS.has(breakpoint.category() + ':' + breakpoint.title()));

    for (const breakpoint of this._interestingBreakpoints) {
      this._initialDomBreakpointState.set(breakpoint, breakpoint.enabled());
      breakpoint.setEnabled(true);
    }

    this._networkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this._handleNetworkConditionsChanged,
        this);

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

    this._scriptWriter = new RecordingScriptWriter(this._indentation);

    const networkConditions = this._networkManager.networkConditions();
    if (networkConditions !== SDK.NetworkManager.NoThrottlingConditions) {
      await this.appendStep(new EmulateNetworkConditions(networkConditions));
    }

    await this.appendStep(new NavigationStep(mainFrame.url));
  }

  _handleNetworkConditionsChanged(): void {
    const networkConditions = this._networkManager.networkConditions();
    this.appendStep(new EmulateNetworkConditions(networkConditions));
  }

  async stop(): Promise<void> {
    for (const target of this._targets.values()) {
      await this.detachFromTarget(target);
    }
    await this.detachFromTarget(this._target);

    this._networkManager.removeEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this._handleNetworkConditionsChanged,
        this);

    if (this._newDocumentScriptIdentifier) {
      await this._pageAgent.invoke_removeScriptToEvaluateOnNewDocument({identifier: this._newDocumentScriptIdentifier});
    }

    await this._debuggerModel.ignoreDebuggerPausedEvents(false);

    for (const [breakpoint, enabled] of this._initialDomBreakpointState.entries()) {
      breakpoint.setEnabled(enabled);
    }
  }

  async appendStep(step: Step): Promise<void> {
    if (!this._scriptWriter) {
      throw new Error('Recording has not started yet.');
    }

    this._scriptWriter.appendStep(step);
    this.renderSteps();
    step.addEventListener('condition-added', () => {
      this.renderSteps();
    });
  }

  async renderSteps(): Promise<void> {
    if (!this._scriptWriter) {
      throw new Error('Recording has not started yet.');
    }
    const content = this._scriptWriter.getScript();

    this._uiSourceCode.setContent(content, false);
    Common.Revealer.reveal(this._uiSourceCode.uiLocation(content.length), true);
  }

  async isSubmitButton(targetId: string): Promise<boolean> {
    function innerIsSubmitButton(this: HTMLButtonElement): boolean {
      return this.tagName === 'BUTTON' && this.type === 'submit' && this.form !== null;
    }

    const {result} = await this._runtimeAgent.invoke_callFunctionOn({
      functionDeclaration: innerIsSubmitButton.toString(),
      objectId: targetId,
    });
    return result.value;
  }

  async attachToTarget(target: SDK.SDKModel.Target): Promise<void> {
    this._targets.set(target.id(), target);
    const eventHandler = new RecordingEventHandler(this, target);
    this._eventHandlers.set(target.id(), eventHandler);
    target.registerDebuggerDispatcher(eventHandler);

    const pageAgent = target.pageAgent();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;

    const childTargetManager =
        target.model(SDK.ChildTargetManager.ChildTargetManager) as SDK.ChildTargetManager.ChildTargetManager;

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

    childTargetManager.addEventListener(SDK.ChildTargetManager.Events.TargetCreated, this.handleWindowOpened, this);
    childTargetManager.addEventListener(SDK.ChildTargetManager.Events.TargetDestroyed, this.handleWindowClosed, this);
    childTargetManager.addEventListener(SDK.ChildTargetManager.Events.TargetInfoChanged, this.handleNavigation, this);
    for (const target of childTargetManager.childTargets()) {
      this.attachToTarget(target);
    }
  }

  async detachFromTarget(target: SDK.SDKModel.Target): Promise<void> {
    const eventHandler = this._eventHandlers.get(target.id());
    if (!eventHandler) {
      return;
    }
    target.unregisterDebuggerDispatcher(eventHandler);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;

    await debuggerModel.ignoreDebuggerPausedEvents(false);
  }

  async evaluateInAllFrames(target: SDK.SDKModel.Target, expression: string): Promise<void> {
    const resourceTreeModel =
        target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel) as SDK.RuntimeModel.RuntimeModel;
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

  async handleWindowOpened(event: Common.EventTarget.EventTargetEvent): Promise<void> {
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

  async handleWindowClosed(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const target = this._targets.get(event.data);
    if (!target) {
      return;
    }

    const targetInfo = target.targetInfo();
    if (targetInfo && targetInfo.type !== 'page') {
      return;
    }

    const eventHandler = this._eventHandlers.get(target.id());
    if (!eventHandler) {
      return;
    }
    eventHandler.targetDestroyed();
  }

  async handleNavigation(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    if (event.data.type !== 'page') {
      return;
    }

    const targetId = this._resourceTreeModel.mainFrame?.id === event.data.targetId ? 'main' : event.data.targetId;
    const eventHandler = this._eventHandlers.get(targetId);
    if (!eventHandler) {
      return;
    }

    eventHandler.targetInfoChanged(event.data.url);
  }
}
