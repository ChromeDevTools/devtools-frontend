// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Snippets from '../snippets/snippets.js';

import {Plugin} from './Plugin.js';

export class JavaScriptCompilerPlugin extends Plugin {
  private readonly textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor;
  private uiSourceCode: Workspace.UISourceCode.UISourceCode;
  private compiling: boolean;
  private recompileScheduled: boolean;
  private timeout: number|null;
  private message: Workspace.UISourceCode.Message|null;
  private disposed: boolean;
  constructor(
      textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor, uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super();
    this.textEditor = textEditor;
    this.uiSourceCode = uiSourceCode;
    this.compiling = false;
    this.recompileScheduled = false;
    this.timeout = null;
    this.message = null;
    this.disposed = false;

    this.textEditor.addEventListener(UI.TextEditor.Events.TextChanged, this.scheduleCompile, this);
    if (this.uiSourceCode.hasCommits() || this.uiSourceCode.isDirty()) {
      this.scheduleCompile();
    }
  }

  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    if (uiSourceCode.extension() === 'js') {
      return true;
    }
    if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
      return true;
    }
    for (const debuggerModel of SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
      if (Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(
              uiSourceCode, debuggerModel)) {
        return true;
      }
    }
    return false;
  }

  private scheduleCompile(): void {
    if (this.compiling) {
      this.recompileScheduled = true;
      return;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = window.setTimeout(this.compile.bind(this), CompileDelay);
  }

  private findRuntimeModel(): SDK.RuntimeModel.RuntimeModel|null {
    const debuggerModels = SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel);
    for (let i = 0; i < debuggerModels.length; ++i) {
      const scriptFile = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(
          this.uiSourceCode, debuggerModels[i]);
      if (scriptFile) {
        return debuggerModels[i].runtimeModel();
      }
    }
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    return mainTarget ? mainTarget.model(SDK.RuntimeModel.RuntimeModel) : null;
  }

  private async compile(): Promise<void> {
    const runtimeModel = this.findRuntimeModel();
    if (!runtimeModel) {
      return;
    }
    const currentExecutionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!currentExecutionContext) {
      return;
    }

    const code = this.textEditor.text();
    if (code.length > 1024 * 100) {
      return;
    }

    const scripts =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForResource(this.uiSourceCode);
    const isModule = scripts.reduce((v, s) => v || s.isModule === true, false);
    if (isModule) {
      return;
    }

    this.compiling = true;
    const result = await runtimeModel.compileScript(code, '', false, currentExecutionContext.id);

    this.compiling = false;
    if (this.recompileScheduled) {
      this.recompileScheduled = false;
      this.scheduleCompile();
      return;
    }
    if (this.message) {
      this.uiSourceCode.removeMessage(this.message);
    }
    if (this.disposed || !result || !result.exceptionDetails) {
      return;
    }

    const exceptionDetails = result.exceptionDetails;
    const text = SDK.RuntimeModel.RuntimeModel.simpleTextFromException(exceptionDetails);
    this.message = this.uiSourceCode.addLineMessage(
        Workspace.UISourceCode.Message.Level.Error, text, exceptionDetails.lineNumber, exceptionDetails.columnNumber);
    this.compilationFinishedForTest();
  }

  private compilationFinishedForTest(): void {
  }

  dispose(): void {
    this.textEditor.removeEventListener(UI.TextEditor.Events.TextChanged, this.scheduleCompile, this);
    if (this.message) {
      this.uiSourceCode.removeMessage(this.message);
    }
    this.disposed = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
}

export const CompileDelay = 1000;
