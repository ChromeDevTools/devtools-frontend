// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Sources.JavaScriptCompiler = class {
  /**
   * @param {!Sources.JavaScriptSourceFrame} sourceFrame
   */
  constructor(sourceFrame) {
    this._sourceFrame = sourceFrame;
    this._compiling = false;
  }

  scheduleCompile() {
    if (this._compiling) {
      this._recompileScheduled = true;
      return;
    }
    if (this._timeout)
      clearTimeout(this._timeout);
    this._timeout = setTimeout(this._compile.bind(this), Sources.JavaScriptCompiler.CompileDelay);
  }

  /**
   * @return {?SDK.RuntimeModel}
   */
  _findRuntimeModel() {
    var debuggerModels = SDK.targetManager.models(SDK.DebuggerModel);
    var sourceCode = this._sourceFrame.uiSourceCode();
    for (var i = 0; i < debuggerModels.length; ++i) {
      var scriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(sourceCode, debuggerModels[i]);
      if (scriptFile)
        return debuggerModels[i].target().runtimeModel;
    }
    return SDK.targetManager.mainTarget() ? SDK.targetManager.mainTarget().runtimeModel : null;
  }

  _compile() {
    var runtimeModel = this._findRuntimeModel();
    if (!runtimeModel)
      return;
    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!currentExecutionContext)
      return;

    this._compiling = true;
    var code = this._sourceFrame.textEditor.text();
    runtimeModel.compileScript(code, '', false, currentExecutionContext.id, compileCallback.bind(this));

    /**
     * @param {!Protocol.Runtime.ScriptId=} scriptId
     * @param {?Protocol.Runtime.ExceptionDetails=} exceptionDetails
     * @this {Sources.JavaScriptCompiler}
     */
    function compileCallback(scriptId, exceptionDetails) {
      this._compiling = false;
      if (this._recompileScheduled) {
        delete this._recompileScheduled;
        this.scheduleCompile();
        return;
      }
      if (!exceptionDetails)
        return;
      var text = SDK.ConsoleMessage.simpleTextFromException(exceptionDetails);
      this._sourceFrame.uiSourceCode().addLineMessage(
          Workspace.UISourceCode.Message.Level.Error, text, exceptionDetails.lineNumber, exceptionDetails.columnNumber);
      this._compilationFinishedForTest();
    }
  }

  _compilationFinishedForTest() {
  }
};

Sources.JavaScriptCompiler.CompileDelay = 1000;
