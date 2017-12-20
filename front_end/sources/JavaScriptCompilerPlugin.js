// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Sources.UISourceCodeFrame.Plugin}
 */
Sources.JavaScriptCompilerPlugin = class {
  /**
   * @param {!SourceFrame.SourcesTextEditor} textEditor
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(textEditor, uiSourceCode) {
    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;
    this._compiling = false;
    this._recompileScheduled = false;
    /** @type {?number} */
    this._timeout = null;
    /** @type {?Workspace.UISourceCode.Message} */
    this._message = null;
    this._disposed = false;

    this._textEditor.addEventListener(UI.TextEditor.Events.TextChanged, this._scheduleCompile, this);
    this._scheduleCompile();
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    if (uiSourceCode.extension() === 'js')
      return true;
    if (uiSourceCode.project().type() === Workspace.projectTypes.Snippets)
      return true;
    for (var debuggerModel of SDK.targetManager.models(SDK.DebuggerModel)) {
      if (Bindings.debuggerWorkspaceBinding.scriptFile(uiSourceCode, debuggerModel))
        return true;
    }
    return false;
  }

  _scheduleCompile() {
    if (this._compiling) {
      this._recompileScheduled = true;
      return;
    }
    if (this._timeout)
      clearTimeout(this._timeout);
    this._timeout = setTimeout(this._compile.bind(this), Sources.JavaScriptCompilerPlugin.CompileDelay);
  }

  /**
   * @return {?SDK.RuntimeModel}
   */
  _findRuntimeModel() {
    // TODO(dgozman): grab correct runtime model from JavaScriptSourceFrame instead.
    var debuggerModels = SDK.targetManager.models(SDK.DebuggerModel);
    for (var i = 0; i < debuggerModels.length; ++i) {
      var scriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(this._uiSourceCode, debuggerModels[i]);
      if (scriptFile)
        return debuggerModels[i].runtimeModel();
    }
    return SDK.targetManager.mainTarget() ? SDK.targetManager.mainTarget().model(SDK.RuntimeModel) : null;
  }

  async _compile() {
    var runtimeModel = this._findRuntimeModel();
    if (!runtimeModel)
      return;
    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!currentExecutionContext)
      return;

    var code = this._textEditor.text();
    if (code.length > 1024 * 1024)
      return;

    this._compiling = true;
    var result = await runtimeModel.compileScript(code, '', false, currentExecutionContext.id);

    this._compiling = false;
    if (this._recompileScheduled) {
      this._recompileScheduled = false;
      this._scheduleCompile();
      return;
    }
    if (this._message)
      this._uiSourceCode.removeMessage(this._message);
    if (this._disposed || !result || !result.exceptionDetails)
      return;

    var exceptionDetails = result.exceptionDetails;
    var text = SDK.RuntimeModel.simpleTextFromException(exceptionDetails);
    this._message = this._uiSourceCode.addLineMessage(
        Workspace.UISourceCode.Message.Level.Error, text, exceptionDetails.lineNumber, exceptionDetails.columnNumber);
    this._compilationFinishedForTest();
  }

  _compilationFinishedForTest() {
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  rightToolbarItems() {
    return [];
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  leftToolbarItems() {
    return [];
  }

  /**
   * @override
   */
  dispose() {
    this._textEditor.removeEventListener(UI.TextEditor.Events.TextChanged, this._scheduleCompile, this);
    if (this._message)
      this._uiSourceCode.removeMessage(this._message);
    this._disposed = true;
    if (this._timeout)
      clearTimeout(this._timeout);
  }
};

Sources.JavaScriptCompilerPlugin.CompileDelay = 1000;
