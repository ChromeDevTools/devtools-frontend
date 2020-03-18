// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';  // eslint-disable-line no-unused-vars

/**
 * @type {!BlackboxManager}
 */
let blackboxManagerInstance;

/**
 * @unrestricted
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.DebuggerModel.DebuggerModel>}
 */
export class BlackboxManager {
  /**
   * @private
   * @param {!DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerWorkspaceBinding) {
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared,
        this._clearCacheIfNeeded.bind(this), this);
    Common.Settings.Settings.instance()
        .moduleSetting('skipStackFramesPattern')
        .addChangeListener(this._patternChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('skipContentScripts')
        .addChangeListener(this._patternChanged.bind(this));

    /** @type {!Set<function()>} */
    this._listeners = new Set();

    /** @type {!Map<string, boolean>} */
    this._isBlackboxedURLCache = new Map();

    SDK.SDKModel.TargetManager.instance().observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  /**
   * @param {{forceNew: ?boolean, debuggerWorkspaceBinding: ?DebuggerWorkspaceBinding}} opts
   */
  static instance(opts = {forceNew: null, debuggerWorkspaceBinding: null}) {
    const {forceNew, debuggerWorkspaceBinding} = opts;
    if (!blackboxManagerInstance || forceNew) {
      if (!debuggerWorkspaceBinding) {
        throw new Error(
            `Unable to create settings: targetManager, workspace, and debuggerWorkspaceBinding must be provided: ${
                new Error().stack}`);
      }

      blackboxManagerInstance = new BlackboxManager(debuggerWorkspaceBinding);
    }

    return blackboxManagerInstance;
  }

  /**
   * @param {function()} listener
   */
  addChangeListener(listener) {
    this._listeners.add(listener);
  }

  /**
   * @param {function()} listener
   */
  removeChangeListener(listener) {
    this._listeners.delete(listener);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._setBlackboxPatterns(debuggerModel);
    const sourceMapManager = debuggerModel.sourceMapManager();
    sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this._sourceMapAttached, this);
    sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, this._sourceMapDetached, this);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    this._clearCacheIfNeeded();
    const sourceMapManager = debuggerModel.sourceMapManager();
    sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this._sourceMapAttached, this);
    sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapDetached, this._sourceMapDetached, this);
  }

  _clearCacheIfNeeded() {
    if (this._isBlackboxedURLCache.size > 1024) {
      this._isBlackboxedURLCache.clear();
    }
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @return {!Promise<boolean>}
   */
  _setBlackboxPatterns(debuggerModel) {
    const regexPatterns = Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern').getAsArray();
    const patterns = /** @type {!Array<string>} */ ([]);
    for (const item of regexPatterns) {
      if (!item.disabled && item.pattern) {
        patterns.push(item.pattern);
      }
    }
    return debuggerModel.setBlackboxPatterns(patterns);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  isBlackboxedUISourceCode(uiSourceCode) {
    const projectType = uiSourceCode.project().type();
    const isContentScript = projectType === Workspace.Workspace.projectTypes.ContentScripts;
    if (isContentScript && Common.Settings.Settings.instance().moduleSetting('skipContentScripts').get()) {
      return true;
    }
    const url = this._uiSourceCodeURL(uiSourceCode);
    return url ? this.isBlackboxedURL(url) : false;
  }

  /**
   * @param {string} url
   * @param {boolean=} isContentScript
   * @return {boolean}
   */
  isBlackboxedURL(url, isContentScript) {
    if (this._isBlackboxedURLCache.has(url)) {
      return !!this._isBlackboxedURLCache.get(url);
    }
    if (isContentScript && Common.Settings.Settings.instance().moduleSetting('skipContentScripts').get()) {
      return true;
    }
    const regex = Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern').asRegExp();
    const isBlackboxed = (regex && regex.test(url)) || false;
    this._isBlackboxedURLCache.set(url, isBlackboxed);
    return isBlackboxed;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _sourceMapAttached(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data.client);
    const sourceMap = /** @type {!SDK.SourceMap.SourceMap} */ (event.data.sourceMap);
    this._updateScriptRanges(script, sourceMap);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _sourceMapDetached(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data.client);
    this._updateScriptRanges(script, null);
  }

  /**
   * @param {!SDK.Script.Script} script
   * @param {?SDK.SourceMap.SourceMap} sourceMap
   * @return {!Promise<undefined>}
   */
  async _updateScriptRanges(script, sourceMap) {
    let hasBlackboxedMappings = false;
    if (!BlackboxManager.instance().isBlackboxedURL(script.sourceURL, script.isContentScript())) {
      hasBlackboxedMappings = sourceMap ? sourceMap.sourceURLs().some(url => this.isBlackboxedURL(url)) : false;
    }
    if (!hasBlackboxedMappings) {
      if (script[_blackboxedRanges] && await script.setBlackboxedRanges([])) {
        delete script[_blackboxedRanges];
      }
      await this._debuggerWorkspaceBinding.updateLocations(script);
      return;
    }

    const mappings = sourceMap.mappings();
    const newRanges = [];
    let currentBlackboxed = false;
    if (mappings[0].lineNumber !== 0 || mappings[0].columnNumber !== 0) {
      newRanges.push({lineNumber: 0, columnNumber: 0});
      currentBlackboxed = true;
    }
    for (const mapping of mappings) {
      if (mapping.sourceURL && currentBlackboxed !== this.isBlackboxedURL(mapping.sourceURL)) {
        newRanges.push({lineNumber: mapping.lineNumber, columnNumber: mapping.columnNumber});
        currentBlackboxed = !currentBlackboxed;
      }
    }

    const oldRanges = script[_blackboxedRanges] || [];
    if (!isEqual(oldRanges, newRanges) && await script.setBlackboxedRanges(newRanges)) {
      script[_blackboxedRanges] = newRanges;
    }
    this._debuggerWorkspaceBinding.updateLocations(script);

    /**
     * @param {!Array<!{lineNumber: number, columnNumber: number}>} rangesA
     * @param {!Array<!{lineNumber: number, columnNumber: number}>} rangesB
     * @return {boolean}
     */
    function isEqual(rangesA, rangesB) {
      if (rangesA.length !== rangesB.length) {
        return false;
      }
      for (let i = 0; i < rangesA.length; ++i) {
        if (rangesA[i].lineNumber !== rangesB[i].lineNumber || rangesA[i].columnNumber !== rangesB[i].columnNumber) {
          return false;
        }
      }
      return true;
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?string}
   */
  _uiSourceCodeURL(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Debugger ? null : uiSourceCode.url();
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  canBlackboxUISourceCode(uiSourceCode) {
    const url = this._uiSourceCodeURL(uiSourceCode);
    return url ? !!this._urlToRegExpString(url) : false;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  blackboxUISourceCode(uiSourceCode) {
    const url = this._uiSourceCodeURL(uiSourceCode);
    if (url) {
      this._blackboxURL(url);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  unblackboxUISourceCode(uiSourceCode) {
    const url = this._uiSourceCodeURL(uiSourceCode);
    if (url) {
      this._unblackboxURL(url);
    }
  }

  blackboxContentScripts() {
    Common.Settings.Settings.instance().moduleSetting('skipContentScripts').set(true);
  }

  unblackboxContentScripts() {
    Common.Settings.Settings.instance().moduleSetting('skipContentScripts').set(false);
  }

  /**
   * @param {string} url
   */
  _blackboxURL(url) {
    const regexPatterns = Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern').getAsArray();
    const regexValue = this._urlToRegExpString(url);
    if (!regexValue) {
      return;
    }
    let found = false;
    for (let i = 0; i < regexPatterns.length; ++i) {
      const item = regexPatterns[i];
      if (item.pattern === regexValue) {
        item.disabled = false;
        found = true;
        break;
      }
    }
    if (!found) {
      regexPatterns.push({pattern: regexValue});
    }
    Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern').setAsArray(regexPatterns);
  }

  /**
   * @param {string} url
   */
  _unblackboxURL(url) {
    let regexPatterns = Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern').getAsArray();
    const regexValue = BlackboxManager.instance()._urlToRegExpString(url);
    if (!regexValue) {
      return;
    }
    regexPatterns = regexPatterns.filter(function(item) {
      return item.pattern !== regexValue;
    });
    for (let i = 0; i < regexPatterns.length; ++i) {
      const item = regexPatterns[i];
      if (item.disabled) {
        continue;
      }
      try {
        const regex = new RegExp(item.pattern);
        if (regex.test(url)) {
          item.disabled = true;
        }
      } catch (e) {
      }
    }
    Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern').setAsArray(regexPatterns);
  }

  async _patternChanged() {
    this._isBlackboxedURLCache.clear();

    /** @type {!Array<!Promise>} */
    const promises = [];
    for (const debuggerModel of SDK.SDKModel.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
      promises.push(this._setBlackboxPatterns(debuggerModel));
      const sourceMapManager = debuggerModel.sourceMapManager();
      for (const script of debuggerModel.scripts()) {
        promises.push(this._updateScriptRanges(script, sourceMapManager.sourceMapForClient(script)));
      }
    }
    await Promise.all(promises);
    const listeners = Array.from(this._listeners);
    for (const listener of listeners) {
      listener();
    }
    this._patternChangeFinishedForTests();
  }

  _patternChangeFinishedForTests() {
    // This method is sniffed in tests.
  }

  /**
   * @param {string} url
   * @return {string}
   */
  _urlToRegExpString(url) {
    const parsedURL = new Common.ParsedURL.ParsedURL(url);
    if (parsedURL.isAboutBlank() || parsedURL.isDataURL()) {
      return '';
    }
    if (!parsedURL.isValid) {
      return '^' + url.escapeForRegExp() + '$';
    }
    let name = parsedURL.lastPathComponent;
    if (name) {
      name = '/' + name;
    } else if (parsedURL.folderPathComponents) {
      name = parsedURL.folderPathComponents + '/';
    }
    if (!name) {
      name = parsedURL.host;
    }
    if (!name) {
      return '';
    }
    const scheme = parsedURL.scheme;
    let prefix = '';
    if (scheme && scheme !== 'http' && scheme !== 'https') {
      prefix = '^' + scheme + '://';
      if (scheme === 'chrome-extension') {
        prefix += parsedURL.host + '\\b';
      }
      prefix += '.*';
    }
    return prefix + name.escapeForRegExp() + (url.endsWith(name) ? '$' : '\\b');
  }
}

const _blackboxedRanges = Symbol('blackboxedRanged');
