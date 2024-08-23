/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../../core/platform/platform.js';

import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';

import {LiveLocationPool, LiveLocationWithPool, type LiveLocation} from './LiveLocation.js';
import {CSSWorkspaceBinding} from './CSSWorkspaceBinding.js';

export interface MessageSource {
  url?: Platform.DevToolsPath.UrlString;
  line: number;
  column: number;
  scriptId?: Protocol.Runtime.ScriptId;
  stackTrace?: Protocol.Runtime.StackTrace;
}

export class PresentationSourceFrameMessageManager implements
    SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel>,
    SDK.TargetManager.SDKModelObserver<SDK.CSSModel.CSSModel> {
  #targetToMessageHelperMap = new WeakMap<SDK.Target.Target, PresentationSourceFrameMessageHelper>();
  constructor() {
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DebuggerModel.DebuggerModel, this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.CSSModel.CSSModel, this);
  }

  modelAdded(model: SDK.DebuggerModel.DebuggerModel|SDK.CSSModel.CSSModel): void {
    const target = model.target();
    const helper = this.#targetToMessageHelperMap.get(target) ?? new PresentationSourceFrameMessageHelper();
    if (model instanceof SDK.DebuggerModel.DebuggerModel) {
      helper.setDebuggerModel(model);
    } else {
      helper.setCSSModel(model);
    }
    this.#targetToMessageHelperMap.set(target, helper);
  }

  modelRemoved(model: SDK.DebuggerModel.DebuggerModel|SDK.CSSModel.CSSModel): void {
    const target = model.target();
    const helper = this.#targetToMessageHelperMap.get(target);
    helper?.clear();
  }

  addMessage(message: Workspace.UISourceCode.Message, source: MessageSource, target: SDK.Target.Target): void {
    const helper = this.#targetToMessageHelperMap.get(target);
    void helper?.addMessage(message, source);
  }

  clear(): void {
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
      const helper = this.#targetToMessageHelperMap.get(target);
      helper?.clear();
    }
  }
}

export class PresentationConsoleMessageManager {
  #sourceFrameMessageManager = new PresentationSourceFrameMessageManager();

  constructor() {
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageAdded,
        event => this.consoleMessageAdded(event.data));
    SDK.ConsoleModel.ConsoleModel.allMessagesUnordered().forEach(this.consoleMessageAdded, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.ConsoleCleared,
        () => this.#sourceFrameMessageManager.clear());
  }

  private consoleMessageAdded(consoleMessage: SDK.ConsoleModel.ConsoleMessage): void {
    const runtimeModel = consoleMessage.runtimeModel();
    if (!consoleMessage.isErrorOrWarning() || !consoleMessage.runtimeModel() ||
        consoleMessage.source === Protocol.Log.LogEntrySource.Violation || !runtimeModel) {
      return;
    }
    const level = consoleMessage.level === Protocol.Log.LogEntryLevel.Error ?
        Workspace.UISourceCode.Message.Level.ERROR :
        Workspace.UISourceCode.Message.Level.WARNING;
    this.#sourceFrameMessageManager.addMessage(
        new Workspace.UISourceCode.Message(level, consoleMessage.messageText), consoleMessage, runtimeModel.target());
  }
}

export class PresentationSourceFrameMessageHelper {
  #debuggerModel?: SDK.DebuggerModel.DebuggerModel;
  #cssModel?: SDK.CSSModel.CSSModel;
  #presentationMessages: Map<Platform.DevToolsPath.UrlString, Array<{
                               source: MessageSource,
                               presentation: PresentationSourceFrameMessage,
                             }>> = new Map();
  readonly #locationPool: LiveLocationPool;

  constructor() {
    this.#locationPool = new LiveLocationPool();

    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAdded.bind(this));
  }

  setDebuggerModel(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    if (this.#debuggerModel) {
      throw new Error('Cannot set DebuggerModel twice');
    }
    this.#debuggerModel = debuggerModel;
    // TODO(dgozman): queueMicrotask because we race with DebuggerWorkspaceBinding on ParsedScriptSource event delivery.
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, event => {
      queueMicrotask(() => {
        this.#parsedScriptSource(event);
      });
    });
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.#debuggerReset, this);
  }

  setCSSModel(cssModel: SDK.CSSModel.CSSModel): void {
    if (this.#cssModel) {
      throw new Error('Cannot set CSSModel twice');
    }
    this.#cssModel = cssModel;
    cssModel.addEventListener(
        SDK.CSSModel.Events.StyleSheetAdded, event => queueMicrotask(() => this.#styleSheetAdded(event)));
  }

  async addMessage(message: Workspace.UISourceCode.Message, source: MessageSource): Promise<void> {
    const presentation = new PresentationSourceFrameMessage(message, this.#locationPool);
    const location = this.#rawLocation(source) ?? this.#cssLocation(source) ?? this.#uiLocation(source);
    if (location) {
      await presentation.updateLocationSource(location);
    }
    if (source.url) {
      let messages = this.#presentationMessages.get(source.url);
      if (!messages) {
        messages = [];
        this.#presentationMessages.set(source.url, messages);
      }
      messages.push({source, presentation});
    }
  }

  #uiLocation(source: MessageSource): Workspace.UISourceCode.UILocation|null {
    if (!source.url) {
      return null;
    }

    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(source.url);
    if (!uiSourceCode) {
      return null;
    }
    return new Workspace.UISourceCode.UILocation(uiSourceCode, source.line, source.column);
  }

  #cssLocation(source: MessageSource): SDK.CSSModel.CSSLocation|null {
    if (!this.#cssModel || !source.url) {
      return null;
    }
    const locations = this.#cssModel.createRawLocationsByURL(source.url, source.line, source.column);
    return locations[0] ?? null;
  }

  #rawLocation(source: MessageSource): SDK.DebuggerModel.Location|null {
    if (!this.#debuggerModel) {
      return null;
    }
    if (source.scriptId) {
      return this.#debuggerModel.createRawLocationByScriptId(source.scriptId, source.line, source.column);
    }
    const callFrame = source.stackTrace && source.stackTrace.callFrames ? source.stackTrace.callFrames[0] : null;
    if (callFrame) {
      return this.#debuggerModel.createRawLocationByScriptId(
          callFrame.scriptId, callFrame.lineNumber, callFrame.columnNumber);
    }
    if (source.url) {
      return this.#debuggerModel.createRawLocationByURL(source.url, source.line, source.column);
    }
    return null;
  }

  #parsedScriptSource(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    const script = event.data;
    const messages = this.#presentationMessages.get(script.sourceURL);

    const promises: Promise<void>[] = [];
    for (const {presentation, source} of messages ?? []) {
      const rawLocation = this.#rawLocation(source);
      if (rawLocation && script.scriptId === rawLocation.scriptId) {
        promises.push(presentation.updateLocationSource(rawLocation));
      }
    }

    void Promise.all(promises).then(this.parsedScriptSourceForTest.bind(this));
  }

  parsedScriptSourceForTest(): void {
  }

  #uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    const messages = this.#presentationMessages.get(uiSourceCode.url());

    const promises: Promise<void>[] = [];
    for (const {presentation, source} of messages ?? []) {
      promises.push(presentation.updateLocationSource(
          new Workspace.UISourceCode.UILocation(uiSourceCode, source.line, source.column)));
    }
    void Promise.all(promises).then(this.uiSourceCodeAddedForTest.bind(this));
  }

  uiSourceCodeAddedForTest(): void {
  }

  #styleSheetAdded(event: Common.EventTarget
                       .EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, SDK.CSSModel.EventTypes>): void {
    const header = event.data;
    const messages = this.#presentationMessages.get(header.sourceURL);

    const promises: Promise<void>[] = [];
    for (const {source, presentation} of messages ?? []) {
      if (header.containsLocation(source.line, source.column)) {
        promises.push(
            presentation.updateLocationSource(new SDK.CSSModel.CSSLocation(header, source.line, source.column)));
      }
    }
    void Promise.all(promises).then(this.styleSheetAddedForTest.bind(this));
  }

  styleSheetAddedForTest(): void {
  }

  clear(): void {
    this.#debuggerReset();
  }

  #debuggerReset(): void {
    const presentations = Array.from(this.#presentationMessages.values()).flat();
    for (const {presentation} of presentations) {
      presentation.dispose();
    }
    this.#presentationMessages.clear();
    this.#locationPool.disposeAll();
  }
}

class FrozenLiveLocation extends LiveLocationWithPool {
  #uiLocation: Workspace.UISourceCode.UILocation;
  constructor(
      uiLocation: Workspace.UISourceCode.UILocation, updateDelegate: (arg0: LiveLocation) => Promise<void>,
      locationPool: LiveLocationPool) {
    super(updateDelegate, locationPool);
    this.#uiLocation = uiLocation;
  }

  override async isIgnoreListed(): Promise<boolean> {
    return false;
  }

  override async uiLocation(): Promise<Workspace.UISourceCode.UILocation|null> {
    return this.#uiLocation;
  }
}

export class PresentationSourceFrameMessage {
  #uiSourceCode?: Workspace.UISourceCode.UISourceCode;
  #liveLocation?: LiveLocation;
  readonly #locationPool: LiveLocationPool;
  readonly #message: Workspace.UISourceCode.Message;

  constructor(message: Workspace.UISourceCode.Message, locationPool: LiveLocationPool) {
    this.#message = message;
    this.#locationPool = locationPool;
  }

  async updateLocationSource(source: SDK.DebuggerModel.Location|Workspace.UISourceCode.UILocation|
                             SDK.CSSModel.CSSLocation): Promise<void> {
    if (source instanceof SDK.DebuggerModel.Location) {
      await DebuggerWorkspaceBinding.instance().createLiveLocation(
          source, this.#updateLocation.bind(this), this.#locationPool);
    } else if (source instanceof SDK.CSSModel.CSSLocation) {
      await CSSWorkspaceBinding.instance().createLiveLocation(
          source, this.#updateLocation.bind(this), this.#locationPool);
    } else if (source instanceof Workspace.UISourceCode.UILocation) {
      if (!this.#liveLocation) {  // Don't "downgrade" the location if a debugger or css mapping was already successful
        this.#liveLocation = new FrozenLiveLocation(source, this.#updateLocation.bind(this), this.#locationPool);
        await this.#liveLocation.update();
      }
    }
  }

  async #updateLocation(liveLocation: LiveLocation): Promise<void> {
    if (this.#uiSourceCode) {
      this.#uiSourceCode.removeMessage(this.#message);
    }
    if (liveLocation !== this.#liveLocation) {
      this.#uiSourceCode?.removeMessage(this.#message);
      this.#liveLocation?.dispose();
      this.#liveLocation = liveLocation;
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    this.#message.range =
        TextUtils.TextRange.TextRange.createFromLocation(uiLocation.lineNumber, uiLocation.columnNumber || 0);
    this.#uiSourceCode = uiLocation.uiSourceCode;
    this.#uiSourceCode.addMessage(this.#message);
  }

  dispose(): void {
    this.#uiSourceCode?.removeMessage(this.#message);
    this.#liveLocation?.dispose();
  }
}
