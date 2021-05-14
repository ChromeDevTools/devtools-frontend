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

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';
import * as Protocol from '../../generated/protocol.js';

import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import type {LiveLocation} from './LiveLocation.js';
import {LiveLocationPool} from './LiveLocation.js';  // eslint-disable-line no-unused-vars

const debuggerModelToMessageHelperMap =
    new WeakMap<SDK.DebuggerModel.DebuggerModel, PresentationConsoleMessageHelper>();

export class PresentationConsoleMessageManager implements
    SDK.SDKModel.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  constructor() {
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.DebuggerModel.DebuggerModel, this);

    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageAdded,
        event => this._consoleMessageAdded((event.data as SDK.ConsoleModel.ConsoleMessage)));
    SDK.ConsoleModel.ConsoleModel.instance().messages().forEach(this._consoleMessageAdded, this);
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    debuggerModelToMessageHelperMap.set(debuggerModel, new PresentationConsoleMessageHelper(debuggerModel));
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    const helper = debuggerModelToMessageHelperMap.get(debuggerModel);
    if (helper) {
      helper._consoleCleared();
    }
  }

  _consoleMessageAdded(message: SDK.ConsoleModel.ConsoleMessage): void {
    const runtimeModel = message.runtimeModel();
    if (!message.isErrorOrWarning() || !message.runtimeModel() ||
        message.source === Protocol.Log.LogEntrySource.Violation || !runtimeModel) {
      return;
    }
    const helper = debuggerModelToMessageHelperMap.get(runtimeModel.debuggerModel());
    if (helper) {
      helper._consoleMessageAdded(message);
    }
  }

  _consoleCleared(): void {
    for (const debuggerModel of SDK.SDKModel.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
      const helper = debuggerModelToMessageHelperMap.get(debuggerModel);
      if (helper) {
        helper._consoleCleared();
      }
    }
  }
}

export class PresentationConsoleMessageHelper {
  _debuggerModel: SDK.DebuggerModel.DebuggerModel;
  _pendingConsoleMessages: Map<string, SDK.ConsoleModel.ConsoleMessage[]>;
  _presentationConsoleMessages: PresentationConsoleMessage[];
  _locationPool: LiveLocationPool;

  constructor(debuggerModel: SDK.DebuggerModel.DebuggerModel) {
    this._debuggerModel = debuggerModel;

    this._pendingConsoleMessages = new Map();

    this._presentationConsoleMessages = [];

    // TODO(dgozman): queueMicrotask because we race with DebuggerWorkspaceBinding on ParsedScriptSource event delivery.
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, event => {
      queueMicrotask(() => {
        this._parsedScriptSource(event);
      });
    });
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);

    this._locationPool = new LiveLocationPool();
  }

  _consoleMessageAdded(message: SDK.ConsoleModel.ConsoleMessage): void {
    const rawLocation = this._rawLocation(message);
    if (rawLocation) {
      this._addConsoleMessageToScript(message, rawLocation);
    } else {
      this._addPendingConsoleMessage(message);
    }
  }

  _rawLocation(message: SDK.ConsoleModel.ConsoleMessage): SDK.DebuggerModel.Location|null {
    if (message.scriptId) {
      return this._debuggerModel.createRawLocationByScriptId(message.scriptId, message.line, message.column);
    }
    const callFrame = message.stackTrace && message.stackTrace.callFrames ? message.stackTrace.callFrames[0] : null;
    if (callFrame) {
      return this._debuggerModel.createRawLocationByScriptId(
          callFrame.scriptId, callFrame.lineNumber, callFrame.columnNumber);
    }
    if (message.url) {
      return this._debuggerModel.createRawLocationByURL(message.url, message.line, message.column);
    }
    return null;
  }

  _addConsoleMessageToScript(message: SDK.ConsoleModel.ConsoleMessage, rawLocation: SDK.DebuggerModel.Location): void {
    this._presentationConsoleMessages.push(new PresentationConsoleMessage(message, rawLocation, this._locationPool));
  }

  _addPendingConsoleMessage(message: SDK.ConsoleModel.ConsoleMessage): void {
    if (!message.url) {
      return;
    }
    const pendingMessages = this._pendingConsoleMessages.get(message.url);
    if (!pendingMessages) {
      this._pendingConsoleMessages.set(message.url, [message]);
    } else {
      pendingMessages.push(message);
    }
  }

  _parsedScriptSource(event: Common.EventTarget.EventTargetEvent): void {
    const script = (event.data as SDK.Script.Script);

    const messages = this._pendingConsoleMessages.get(script.sourceURL);
    if (!messages) {
      return;
    }

    const pendingMessages = [];
    for (const message of messages) {
      const rawLocation = this._rawLocation(message);
      if (rawLocation && script.scriptId === rawLocation.scriptId) {
        this._addConsoleMessageToScript(message, rawLocation);
      } else {
        pendingMessages.push(message);
      }
    }

    if (pendingMessages.length) {
      this._pendingConsoleMessages.set(script.sourceURL, pendingMessages);
    } else {
      this._pendingConsoleMessages.delete(script.sourceURL);
    }
  }

  _consoleCleared(): void {
    this._pendingConsoleMessages = new Map();
    this._debuggerReset();
  }

  _debuggerReset(): void {
    for (const message of this._presentationConsoleMessages) {
      message.dispose();
    }
    this._presentationConsoleMessages = [];
    this._locationPool.disposeAll();
  }
}

export class PresentationConsoleMessage extends Workspace.UISourceCode.Message {
  private uiSourceCode?: Workspace.UISourceCode.UISourceCode;

  constructor(
      message: SDK.ConsoleModel.ConsoleMessage, rawLocation: SDK.DebuggerModel.Location,
      locationPool: LiveLocationPool) {
    const level = message.level === Protocol.Log.LogEntryLevel.Error ? Workspace.UISourceCode.Message.Level.Error :
                                                                       Workspace.UISourceCode.Message.Level.Warning;
    super(level, message.messageText);
    DebuggerWorkspaceBinding.instance().createLiveLocation(rawLocation, this._updateLocation.bind(this), locationPool);
  }

  async _updateLocation(liveLocation: LiveLocation): Promise<void> {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeMessage(this);
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    this._range = TextUtils.TextRange.TextRange.createFromLocation(uiLocation.lineNumber, uiLocation.columnNumber || 0);
    this.uiSourceCode = uiLocation.uiSourceCode;
    this.uiSourceCode.addMessage(this);
  }

  dispose(): void {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeMessage(this);
    }
  }
}
