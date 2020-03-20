// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Persistence from '../persistence/persistence.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars
import * as Workspace from '../workspace/workspace.js';

class SnippetFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
  constructor() {
    super('snippet://', 'snippets');
    this._lastSnippetIdentifierSetting =
        Common.Settings.Settings.instance().createSetting('scriptSnippets_lastIdentifier', 0);
    this._snippetsSetting = Common.Settings.Settings.instance().createSetting('scriptSnippets', []);
  }

  /**
   * @override
   * @return {!Array<string>}
   */
  initialFilePaths() {
    const savedSnippets = this._snippetsSetting.get();
    return savedSnippets.map(snippet => escape(snippet.name));
  }

  /**
   * @override
   * @param {string} path
   * @param {?string} name
   * @return {!Promise<?string>}
   */
  async createFile(path, name) {
    const nextId = this._lastSnippetIdentifierSetting.get() + 1;
    this._lastSnippetIdentifierSetting.set(nextId);

    const snippetName = ls`Script snippet #${nextId}`;
    const snippets = this._snippetsSetting.get();
    snippets.push({name: snippetName, content: ''});
    this._snippetsSetting.set(snippets);

    return escape(snippetName);
  }

  /**
   * @override
   * @param {string} path
   * @return {!Promise<boolean>}
   */
  async deleteFile(path) {
    const name = unescape(path.substring(1));
    const allSnippets = this._snippetsSetting.get();
    const snippets = allSnippets.filter(snippet => snippet.name !== name);
    if (allSnippets.length !== snippets.length) {
      this._snippetsSetting.set(snippets);
      return true;
    }
    return false;
  }

  /**
   * @override
   * @param {string} path
   * @returns {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  async requestFileContent(path) {
    const name = unescape(path.substring(1));
    const snippet = this._snippetsSetting.get().find(snippet => snippet.name === name);
    return {content: snippet ? snippet.content : null, isEncoded: false};
  }

  /**
   * @override
   * @param {string} path
   * @param {string} content
   * @param {boolean} isBase64
   */
  async setFileContent(path, content, isBase64) {
    const name = unescape(path.substring(1));
    const snippets = this._snippetsSetting.get();
    const snippet = snippets.find(snippet => snippet.name === name);
    if (snippet) {
      snippet.content = content;
      this._snippetsSetting.set(snippets);
      return true;
    }
    return false;
  }

  /**
   * @override
   * @param {string} path
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  renameFile(path, newName, callback) {
    const name = unescape(path.substring(1));
    const snippets = this._snippetsSetting.get();
    const snippet = snippets.find(snippet => snippet.name === name);
    newName = newName.trim();
    if (!snippet || newName.length === 0 || snippets.find(snippet => snippet.name === newName)) {
      callback(false);
      return;
    }
    snippet.name = newName;
    this._snippetsSetting.set(snippets);
    callback(true, newName);
  }

  /**
   * @override
   * @param {string} query
   * @param {!Common.Progress.Progress} progress
   * @return {!Promise<!Array<string>>}
   */
  async searchInPath(query, progress) {
    const re = new RegExp(query.escapeForRegExp(), 'i');
    const snippets = this._snippetsSetting.get().filter(snippet => snippet.content.match(re));
    return snippets.map(snippet => escape(snippet.name));
  }

  /**
   * @override
   * @param {string} path
   * @return {string}
   */
  mimeFromPath(path) {
    return 'text/javascript';
  }

  /**
   * @override
   * @param {string} path
   * @return {!Common.ResourceType.ResourceType}
   */
  contentType(path) {
    return Common.ResourceType.resourceTypes.Script;
  }

  /**
   * @override
   * @param {string} url
   * @return {string}
   */
  tooltipForURL(url) {
    return ls`Linked to ${unescape(url.substring(this.path().length))}`;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsAutomapping() {
    return true;
  }
}

/**
 * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
 */
export async function evaluateScriptSnippet(uiSourceCode) {
  if (!uiSourceCode.url().startsWith('snippet://')) {
    return;
  }

  const executionContext = self.UI.context.flavor(SDK.RuntimeModel.ExecutionContext);
  if (!executionContext) {
    return;
  }

  const runtimeModel = executionContext.runtimeModel;
  await uiSourceCode.requestContent();
  uiSourceCode.commitWorkingCopy();
  const expression = uiSourceCode.workingCopy();
  Common.Console.Console.instance().show();

  const url = uiSourceCode.url();

  const result = await executionContext.evaluate(
      {
        expression: `${expression}\n//# sourceURL=${url}`,
        objectGroup: 'console',
        silent: false,
        includeCommandLineAPI: true,
        returnByValue: false,
        generatePreview: true,
        replMode: true,
      },
      /* userGesture */ false,
      /* awaitPromise */ true);

  if (result.exceptionDetails) {
    SDK.ConsoleModel.ConsoleModel.instance().addMessage(SDK.ConsoleModel.ConsoleMessage.fromException(
        runtimeModel, result.exceptionDetails, /* messageType */ undefined, /* timestamp */ undefined, url));
    return;
  }
  if (!result.object) {
    return;
  }

  const scripts = executionContext.debuggerModel.scriptsForSourceURL(url);
  const scriptId = scripts[scripts.length - 1].scriptId;
  SDK.ConsoleModel.ConsoleModel.instance().addMessage(new SDK.ConsoleModel.ConsoleMessage(
      runtimeModel, SDK.ConsoleModel.MessageSource.JS, SDK.ConsoleModel.MessageLevel.Info, '',
      SDK.ConsoleModel.MessageType.Result, url, undefined, undefined, [result.object], undefined, undefined,
      executionContext.id, scriptId));
}

/**
 * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
 * @return {boolean}
 */
export function isSnippetsUISourceCode(uiSourceCode) {
  return uiSourceCode.url().startsWith('snippet://');
}

/**
 * @param {!Workspace.Workspace.Project} project
 * @return {boolean}
 */
export function isSnippetsProject(project) {
  return project.type() === Workspace.Workspace.projectTypes.FileSystem &&
      Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) === 'snippets';
}

Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addPlatformFileSystem(
    'snippet://', new SnippetFileSystem());
