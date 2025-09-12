// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
