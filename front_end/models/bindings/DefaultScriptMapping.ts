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

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import type {DebuggerSourceMapping, DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';

export class DefaultScriptMapping implements DebuggerSourceMapping {
  readonly #debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #project: ContentProviderBasedProject;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];
  readonly #uiSourceCodeToScript: Map<Workspace.UISourceCode.UISourceCode, SDK.Script.Script>;
  readonly #scriptToUISourceCode: Map<SDK.Script.Script, Workspace.UISourceCode.UISourceCode>;

  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    defaultScriptMappings.add(this);
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#project = new ContentProviderBasedProject(
        workspace, 'debugger:' + debuggerModel.target().id(), Workspace.Workspace.projectTypes.Debugger, '',
        true /* isServiceProject */);
    this.#eventListeners = [
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this),
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this),
      debuggerModel.addEventListener(
          SDK.DebuggerModel.Events.DiscardedAnonymousScriptSource, this.discardedScriptSource, this),
    ];
    this.#uiSourceCodeToScript = new Map();
    this.#scriptToUISourceCode = new Map();
  }

  static createV8ScriptURL(script: SDK.Script.Script): Platform.DevToolsPath.UrlString {
    const name = Common.ParsedURL.ParsedURL.extractName(script.sourceURL);
    const url = 'debugger:///VM' + script.scriptId + (name ? ' ' + name : '') as Platform.DevToolsPath.UrlString;
    return url;
  }

  static scriptForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): SDK.Script.Script|null {
    for (const defaultScriptMapping of defaultScriptMappings) {
      const script = defaultScriptMapping.#uiSourceCodeToScript.get(uiSourceCode);
      if (script !== undefined) {
        return script;
      }
    }
    return null;
  }

  uiSourceCodeForScript(script: SDK.Script.Script): Workspace.UISourceCode.UISourceCode|null {
    return this.#scriptToUISourceCode.get(script) ?? null;
  }

  rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation|null {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const uiSourceCode = this.#scriptToUISourceCode.get(script);
    if (!uiSourceCode) {
      return null;
    }
    const {lineNumber, columnNumber} = script.rawLocationToRelativeLocation(rawLocation);
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  uiLocationToRawLocations(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number,
      columnNumber?: number): SDK.DebuggerModel.Location[] {
    const script = this.#uiSourceCodeToScript.get(uiSourceCode);
    if (!script) {
      return [];
    }
    ({lineNumber, columnNumber} = script.relativeLocationToRawLocation({lineNumber, columnNumber}));
    return [script.debuggerModel.createRawLocation(script, lineNumber, columnNumber ?? 0)];
  }

  uiLocationRangeToRawLocationRanges(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      {startLine, startColumn, endLine, endColumn}: TextUtils.TextRange.TextRange):
      SDK.DebuggerModel.LocationRange[]|null {
    const script = this.#uiSourceCodeToScript.get(uiSourceCode);
    if (!script) {
      return [];
    }
    ({lineNumber: startLine, columnNumber: startColumn} =
         script.relativeLocationToRawLocation({lineNumber: startLine, columnNumber: startColumn}));
    ({lineNumber: endLine, columnNumber: endColumn} =
         script.relativeLocationToRawLocation({lineNumber: endLine, columnNumber: endColumn}));
    const start = script.debuggerModel.createRawLocation(script, startLine, startColumn);
    const end = script.debuggerModel.createRawLocation(script, endLine, endColumn);
    return [{start, end}];
  }

  private parsedScriptSource(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    const script = event.data;
    const url = DefaultScriptMapping.createV8ScriptURL(script);

    const uiSourceCode = this.#project.createUISourceCode(url, Common.ResourceType.resourceTypes.Script);
    if (script.isBreakpointCondition) {
      uiSourceCode.markAsUnconditionallyIgnoreListed();
    }
    this.#uiSourceCodeToScript.set(uiSourceCode, script);
    this.#scriptToUISourceCode.set(script, uiSourceCode);
    this.#project.addUISourceCodeWithProvider(uiSourceCode, script, null, 'text/javascript');
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }

  private discardedScriptSource(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    const script = event.data;
    const uiSourceCode = this.#scriptToUISourceCode.get(script);
    if (uiSourceCode === undefined) {
      return;
    }
    this.#scriptToUISourceCode.delete(script);
    this.#uiSourceCodeToScript.delete(uiSourceCode);
    this.#project.removeUISourceCode(uiSourceCode.url());
  }

  private globalObjectCleared(): void {
    this.#scriptToUISourceCode.clear();
    this.#uiSourceCodeToScript.clear();
    this.#project.reset();
  }

  dispose(): void {
    defaultScriptMappings.delete(this);
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.globalObjectCleared();
    this.#project.dispose();
  }
}

// TODO(bmeurer): Remove the static methods from DefaultScriptMapping
// and get rid of this global table.
const defaultScriptMappings = new Set<DefaultScriptMapping>();
