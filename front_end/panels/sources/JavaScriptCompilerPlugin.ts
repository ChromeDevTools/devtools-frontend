// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as Snippets from '../snippets/snippets.js';

import {Plugin} from './Plugin.js';

// Plugin that tries to compile the editor content and highlights
// compilation errors.

export class JavaScriptCompilerPlugin extends Plugin {
  private compiling: boolean = false;
  private recompileScheduled: boolean = false;
  private timeout: number|null = null;
  private message: Workspace.UISourceCode.Message|null = null;
  private disposed: boolean = false;
  private editor: TextEditor.TextEditor.TextEditor|null = null;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(uiSourceCode);
  }

  editorExtension(): CodeMirror.Extension {
    return CodeMirror.EditorView.updateListener.of(update => {
      if (update.docChanged) {
        this.scheduleCompile();
      }
    });
  }

  editorInitialized(editor: TextEditor.TextEditor.TextEditor): void {
    this.editor = editor;
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
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
    return mainTarget ? mainTarget.model(SDK.RuntimeModel.RuntimeModel) : null;
  }

  private async compile(): Promise<void> {
    const runtimeModel = this.findRuntimeModel();
    if (!runtimeModel || !this.editor) {
      return;
    }
    const currentExecutionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!currentExecutionContext) {
      return;
    }

    if (this.editor.state.doc.length > 1024 * 100) {
      return;
    }

    const code = this.editor.state.doc.toString();
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
      this.message = null;
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
