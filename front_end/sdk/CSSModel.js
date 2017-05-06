/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
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

/**
 * @unrestricted
 */
SDK.CSSModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._domModel = /** @type {!SDK.DOMModel} */ (target.model(SDK.DOMModel));
    /** @type {!SDK.SourceMapManager<!SDK.CSSStyleSheetHeader>} */
    this._sourceMapManager = new SDK.SourceMapManager(target);
    this._agent = target.cssAgent();
    this._styleLoader = new SDK.CSSModel.ComputedStyleLoader(this);
    this._resourceTreeModel = target.model(SDK.ResourceTreeModel);
    if (this._resourceTreeModel) {
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._resetStyleSheets, this);
    }
    target.registerCSSDispatcher(new SDK.CSSDispatcher(this));
    this._agent.enable().then(this._wasEnabled.bind(this));
    /** @type {!Map.<string, !SDK.CSSStyleSheetHeader>} */
    this._styleSheetIdToHeader = new Map();
    /** @type {!Map.<string, !Object.<!Protocol.Page.FrameId, !Array.<!Protocol.CSS.StyleSheetId>>>} */
    this._styleSheetIdsForURL = new Map();

    /** @type {!Map.<!SDK.CSSStyleSheetHeader, !Promise<?string>>} */
    this._originalStyleSheetText = new Map();

    this._sourceMapManager.setEnabled(Common.moduleSetting('cssSourceMapsEnabled').get());
    Common.moduleSetting('cssSourceMapsEnabled')
        .addChangeListener(event => this._sourceMapManager.setEnabled(/** @type {boolean} */ (event.data)));
  }

  /**
   * @return {!SDK.SourceMapManager<!SDK.CSSStyleSheetHeader>}
   */
  sourceMapManager() {
    return this._sourceMapManager;
  }

  /**
   * @param {string} text
   * @return {string}
   */
  static trimSourceURL(text) {
    var sourceURLIndex = text.lastIndexOf('/*# sourceURL=');
    if (sourceURLIndex === -1) {
      sourceURLIndex = text.lastIndexOf('/*@ sourceURL=');
      if (sourceURLIndex === -1)
        return text;
    }
    var sourceURLLineIndex = text.lastIndexOf('\n', sourceURLIndex);
    if (sourceURLLineIndex === -1)
      return text;
    var sourceURLLine = text.substr(sourceURLLineIndex + 1).split('\n', 1)[0];
    var sourceURLRegex = /[\040\t]*\/\*[#@] sourceURL=[\040\t]*([^\s]*)[\040\t]*\*\/[\040\t]*$/;
    if (sourceURLLine.search(sourceURLRegex) === -1)
      return text;
    return text.substr(0, sourceURLLineIndex) + text.substr(sourceURLLineIndex + sourceURLLine.length + 1);
  }

  /**
   * @return {!SDK.DOMModel}
   */
  domModel() {
    return this._domModel;
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} text
   * @param {boolean} majorChange
   * @return {!Promise<boolean>}
   */
  setStyleText(styleSheetId, range, text, majorChange) {
    var original = this._innerSetStyleTexts.bind(this, [styleSheetId], [range], [text], majorChange);
    var header = this.styleSheetHeaderForId(styleSheetId);
    if (!header)
      return original();

    var sourceMap = this._sourceMapManager.sourceMapForClient(header);
    if (!sourceMap)
      return original();

    var originalAndDetach = originalAndDetachIfSuccess.bind(this, header);

    if (!sourceMap.editable())
      return original();

    return /** @type {!Promise<boolean>} */ (
        sourceMap.editCompiled([range], [text]).then(onEditingDone.bind(this)).catch(onError.bind(this, header)));

    /**
     * @param {?SDK.SourceMap.EditResult} editResult
     * @return {!Promise<boolean>}
     * @this {SDK.CSSModel}
     */
    function onEditingDone(editResult) {
      if (!editResult)
        return Promise.resolve(false);

      var edits = editResult.compiledEdits;
      if (!edits.length)
        return onCSSPatched.call(this, editResult, true);

      edits.sort(TextUtils.SourceEdit.comparator);
      edits = edits.reverse();

      var styleSheetIds = [];
      var ranges = [];
      var texts = [];
      for (var edit of edits) {
        styleSheetIds.push(header.id);
        ranges.push(edit.oldRange);
        texts.push(edit.newText);
      }
      return this._innerSetStyleTexts(styleSheetIds, ranges, texts, majorChange)
          .then(onCSSPatched.bind(this, editResult));
    }

    /**
     * @param {!SDK.SourceMap.EditResult} editResult
     * @param {boolean} success
     * @return {!Promise<boolean>}
     * @this {SDK.CSSModel}
     */
    function onCSSPatched(editResult, success) {
      if (!success)
        return originalAndDetach();

      this._sourceMapManager.applySourceMapEdit(editResult);
      return Promise.resolve(true);
    }

    /**
     * @param {!SDK.CSSStyleSheetHeader} header
     * @param {*} error
     * @return {!Promise<boolean>}
     * @this {SDK.CSSModel}
     */
    function onError(header, error) {
      Common.console.error(Common.UIString('LiveSASS failed: %s', sourceMap.compiledURL()));
      console.error(error);
      this._sourceMapManager.detachSourceMap(header);
      return original();
    }

    /**
     * @param {!SDK.CSSStyleSheetHeader} header
     * @return {!Promise<boolean>}
     * @this {SDK.CSSModel}
     */
    function originalAndDetachIfSuccess(header) {
      return this._innerSetStyleTexts([styleSheetId], [range], [text], majorChange).then(detachIfSuccess.bind(this));

      /**
       * @param {boolean} success
       * @return {boolean}
       * @this {SDK.CSSModel}
       */
      function detachIfSuccess(success) {
        if (success)
          this._sourceMapManager.detachSourceMap(header);
        return success;
      }
    }
  }

  /**
   * @param {!Array<!Protocol.CSS.StyleSheetId>} styleSheetIds
   * @param {!Array<!TextUtils.TextRange>} ranges
   * @param {!Array<string>} texts
   * @param {boolean} majorChange
   * @return {!Promise<boolean>}
   */
  _innerSetStyleTexts(styleSheetIds, ranges, texts, majorChange) {
    /**
     * @param {?Protocol.Error} error
     * @param {?Array<!Protocol.CSS.CSSStyle>} stylePayloads
     * @return {boolean}
     * @this {SDK.CSSModel}
     */
    function parsePayload(error, stylePayloads) {
      if (error || !stylePayloads || stylePayloads.length !== ranges.length)
        return false;

      if (majorChange)
        this._domModel.markUndoableState();
      for (var i = 0; i < ranges.length; ++i) {
        var edit = new SDK.CSSModel.Edit(styleSheetIds[i], ranges[i], texts[i], stylePayloads[i]);
        this._fireStyleSheetChanged(styleSheetIds[i], edit);
      }
      return true;
    }

    console.assert(
        styleSheetIds.length === ranges.length && ranges.length === texts.length, 'Array lengths must be equal');
    var edits = [];
    var ensureContentPromises = [];
    for (var i = 0; i < styleSheetIds.length; ++i) {
      edits.push({styleSheetId: styleSheetIds[i], range: ranges[i].serializeToObject(), text: texts[i]});
      ensureContentPromises.push(this._ensureOriginalStyleSheetText(styleSheetIds[i]));
    }

    return Promise.all(ensureContentPromises)
        .then(() => this._agent.setStyleTexts(edits, parsePayload.bind(this)))
        .catchException(false);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} text
   * @return {!Promise<boolean>}
   */
  setSelectorText(styleSheetId, range, text) {
    /**
     * @param {?Protocol.Error} error
     * @param {?Protocol.CSS.SelectorList} selectorPayload
     * @return {boolean}
     * @this {SDK.CSSModel}
     */
    function callback(error, selectorPayload) {
      if (error || !selectorPayload)
        return false;
      this._domModel.markUndoableState();
      var edit = new SDK.CSSModel.Edit(styleSheetId, range, text, selectorPayload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);
    return this._ensureOriginalStyleSheetText(styleSheetId)
        .then(() => this._agent.setRuleSelector(styleSheetId, range, text, callback.bind(this)))
        .catchException(false);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} text
   * @return {!Promise<boolean>}
   */
  setKeyframeKey(styleSheetId, range, text) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.CSS.Value} payload
     * @return {boolean}
     * @this {SDK.CSSModel}
     */
    function callback(error, payload) {
      if (error || !payload)
        return false;
      this._domModel.markUndoableState();
      var edit = new SDK.CSSModel.Edit(styleSheetId, range, text, payload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);
    return this._ensureOriginalStyleSheetText(styleSheetId)
        .then(() => this._agent.setKeyframeKey(styleSheetId, range, text, callback.bind(this)))
        .catchException(false);
  }

  startCoverage() {
    this._agent.startRuleUsageTracking();
  }

  /**
   * @return {!Promise<!Array<!Protocol.CSS.RuleUsage>>}
   */
  takeCoverageDelta() {
    return this._agent.takeCoverageDelta((error, ruleUsage) => error || !ruleUsage ? [] : ruleUsage);
  }

  /**
   * @return {!Promise}
   */
  stopCoverage() {
    return this._agent.stopRuleUsageTracking();
  }

  /**
   * @return {!Promise.<!Array.<!SDK.CSSMedia>>}
   */
  mediaQueriesPromise() {
    /**
     * @param {?Protocol.Error} error
     * @param {?Array.<!Protocol.CSS.CSSMedia>} payload
     * @return {!Array.<!SDK.CSSMedia>}
     * @this {!SDK.CSSModel}
     */
    function parsePayload(error, payload) {
      return !error && payload ? SDK.CSSMedia.parseMediaArrayPayload(this, payload) : [];
    }

    return this._agent.getMediaQueries(parsePayload.bind(this));
  }

  /**
   * @return {boolean}
   */
  isEnabled() {
    return this._isEnabled;
  }

  /**
   * @param {?Protocol.Error} error
   */
  _wasEnabled(error) {
    if (error) {
      console.error('Failed to enabled CSS agent: ' + error);
      return;
    }
    this._isEnabled = true;
    this.dispatchEventToListeners(SDK.CSSModel.Events.ModelWasEnabled);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise.<?SDK.CSSMatchedStyles>}
   */
  matchedStylesPromise(nodeId) {
    /**
     * @param {?Protocol.Error} error
     * @param {?Protocol.CSS.CSSStyle=} inlinePayload
     * @param {?Protocol.CSS.CSSStyle=} attributesPayload
     * @param {!Array.<!Protocol.CSS.RuleMatch>=} matchedPayload
     * @param {!Array.<!Protocol.CSS.PseudoElementMatches>=} pseudoPayload
     * @param {!Array.<!Protocol.CSS.InheritedStyleEntry>=} inheritedPayload
     * @param {!Array.<!Protocol.CSS.CSSKeyframesRule>=} animationsPayload
     * @return {?SDK.CSSMatchedStyles}
     * @this {SDK.CSSModel}
     */
    function callback(
        error, inlinePayload, attributesPayload, matchedPayload, pseudoPayload, inheritedPayload, animationsPayload) {
      if (error)
        return null;

      var node = this._domModel.nodeForId(nodeId);
      if (!node)
        return null;

      return new SDK.CSSMatchedStyles(
          this, node, inlinePayload || null, attributesPayload || null, matchedPayload || [], pseudoPayload || [],
          inheritedPayload || [], animationsPayload || []);
    }

    return this._agent.getMatchedStylesForNode(nodeId, callback.bind(this));
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @return {!Promise<!Array<string>>}
   */
  classNamesPromise(styleSheetId) {
    /**
     * @param {?string} error
     * @param {?Array<string>} classNames
     * @return {!Array<string>}
     */
    function classNamesCallback(error, classNames) {
      return !error && classNames ? classNames : [];
    }
    return this._agent.collectClassNames(styleSheetId, classNamesCallback);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise.<?Map.<string, string>>}
   */
  computedStylePromise(nodeId) {
    return this._styleLoader.computedStylePromise(nodeId);
  }

  /**
   * @param {number} nodeId
   * @return {!Promise<?Array<string>>}
   */
  backgroundColorsPromise(nodeId) {
    /**
     * @param {?string} error
     * @param {!Array<string>=} backgroundColors
     * @return {?Array<string>}
     */
    function backgroundColorsCallback(error, backgroundColors) {
      return !error && backgroundColors ? backgroundColors : null;
    }
    return this._agent.getBackgroundColors(nodeId, backgroundColorsCallback);
  }

  /**
   * @param {number} nodeId
   * @return {!Promise.<?Array.<!Protocol.CSS.PlatformFontUsage>>}
   */
  platformFontsPromise(nodeId) {
    /**
     * @param {?Protocol.Error} error
     * @param {?Array.<!Protocol.CSS.PlatformFontUsage>} fonts
     * @return {?Array.<!Protocol.CSS.PlatformFontUsage>}
     */
    function platformFontsCallback(error, fonts) {
      return !error && fonts ? fonts : null;
    }

    return this._agent.getPlatformFontsForNode(nodeId, platformFontsCallback);
  }

  /**
   * @return {!Array.<!SDK.CSSStyleSheetHeader>}
   */
  allStyleSheets() {
    var values = this._styleSheetIdToHeader.valuesArray();
    /**
     * @param {!SDK.CSSStyleSheetHeader} a
     * @param {!SDK.CSSStyleSheetHeader} b
     * @return {number}
     */
    function styleSheetComparator(a, b) {
      if (a.sourceURL < b.sourceURL)
        return -1;
      else if (a.sourceURL > b.sourceURL)
        return 1;
      return a.startLine - b.startLine || a.startColumn - b.startColumn;
    }
    values.sort(styleSheetComparator);

    return values;
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise.<?SDK.CSSModel.InlineStyleResult>}
   */
  inlineStylesPromise(nodeId) {
    /**
     * @param {?Protocol.Error} error
     * @param {?Protocol.CSS.CSSStyle=} inlinePayload
     * @param {?Protocol.CSS.CSSStyle=} attributesStylePayload
     * @return {?SDK.CSSModel.InlineStyleResult}
     * @this {SDK.CSSModel}
     */
    function callback(error, inlinePayload, attributesStylePayload) {
      if (error || !inlinePayload)
        return null;
      var inlineStyle = inlinePayload ?
          new SDK.CSSStyleDeclaration(this, null, inlinePayload, SDK.CSSStyleDeclaration.Type.Inline) :
          null;
      var attributesStyle = attributesStylePayload ?
          new SDK.CSSStyleDeclaration(this, null, attributesStylePayload, SDK.CSSStyleDeclaration.Type.Attributes) :
          null;
      return new SDK.CSSModel.InlineStyleResult(inlineStyle, attributesStyle);
    }

    return this._agent.getInlineStylesForNode(nodeId, callback.bind(this));
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {string} pseudoClass
   * @param {boolean} enable
   * @return {boolean}
   */
  forcePseudoState(node, pseudoClass, enable) {
    var pseudoClasses = node.marker(SDK.CSSModel.PseudoStateMarker) || [];
    if (enable) {
      if (pseudoClasses.indexOf(pseudoClass) >= 0)
        return false;
      pseudoClasses.push(pseudoClass);
      node.setMarker(SDK.CSSModel.PseudoStateMarker, pseudoClasses);
    } else {
      if (pseudoClasses.indexOf(pseudoClass) < 0)
        return false;
      pseudoClasses.remove(pseudoClass);
      if (pseudoClasses.length)
        node.setMarker(SDK.CSSModel.PseudoStateMarker, pseudoClasses);
      else
        node.setMarker(SDK.CSSModel.PseudoStateMarker, null);
    }

    this._agent.forcePseudoState(node.id, pseudoClasses);
    this.dispatchEventToListeners(
        SDK.CSSModel.Events.PseudoStateForced, {node: node, pseudoClass: pseudoClass, enable: enable});
    return true;
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {?Array<string>} state
   */
  pseudoState(node) {
    return node.marker(SDK.CSSModel.PseudoStateMarker) || [];
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} newMediaText
   * @return {!Promise<boolean>}
   */
  setMediaText(styleSheetId, range, newMediaText) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.CSS.CSSMedia} mediaPayload
     * @return {boolean}
     * @this {SDK.CSSModel}
     */
    function parsePayload(error, mediaPayload) {
      if (!mediaPayload)
        return false;
      this._domModel.markUndoableState();
      var edit = new SDK.CSSModel.Edit(styleSheetId, range, newMediaText, mediaPayload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);
    return this._ensureOriginalStyleSheetText(styleSheetId)
        .then(() => this._agent.setMediaText(styleSheetId, range, newMediaText, parsePayload.bind(this)))
        .catchException(false);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {string} ruleText
   * @param {!TextUtils.TextRange} ruleLocation
   * @return {!Promise<?SDK.CSSStyleRule>}
   */
  addRule(styleSheetId, ruleText, ruleLocation) {
    return this._ensureOriginalStyleSheetText(styleSheetId)
        .then(() => this._agent.addRule(styleSheetId, ruleText, ruleLocation, parsePayload.bind(this)))
        .catchException(/** @type {?SDK.CSSStyleRule} */ (null));

    /**
     * @param {?Protocol.Error} error
     * @param {?Protocol.CSS.CSSRule} rulePayload
     * @return {?SDK.CSSStyleRule}
     * @this {SDK.CSSModel}
     */
    function parsePayload(error, rulePayload) {
      if (error || !rulePayload)
        return null;
      this._domModel.markUndoableState();
      var edit = new SDK.CSSModel.Edit(styleSheetId, ruleLocation, ruleText, rulePayload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return new SDK.CSSStyleRule(this, rulePayload);
    }
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {function(?SDK.CSSStyleSheetHeader)} userCallback
   */
  requestViaInspectorStylesheet(node, userCallback) {
    var frameId = node.frameId() || (this._resourceTreeModel ? this._resourceTreeModel.mainFrame.id : '');
    var headers = this._styleSheetIdToHeader.valuesArray();
    for (var i = 0; i < headers.length; ++i) {
      var styleSheetHeader = headers[i];
      if (styleSheetHeader.frameId === frameId && styleSheetHeader.isViaInspector()) {
        userCallback(styleSheetHeader);
        return;
      }
    }

    /**
     * @param {?Protocol.Error} error
     * @param {?Protocol.CSS.StyleSheetId} styleSheetId
     * @return {?SDK.CSSStyleSheetHeader}
     * @this {SDK.CSSModel}
     */
    function innerCallback(error, styleSheetId) {
      return !error && styleSheetId ? this._styleSheetIdToHeader.get(styleSheetId) || null : null;
    }

    this._agent.createStyleSheet(frameId, innerCallback.bind(this)).catchException(null).then(userCallback);
  }

  mediaQueryResultChanged() {
    this.dispatchEventToListeners(SDK.CSSModel.Events.MediaQueryResultChanged);
  }

  fontsUpdated() {
    this.dispatchEventToListeners(SDK.CSSModel.Events.FontsUpdated);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} id
   * @return {?SDK.CSSStyleSheetHeader}
   */
  styleSheetHeaderForId(id) {
    return this._styleSheetIdToHeader.get(id) || null;
  }

  /**
   * @return {!Array.<!SDK.CSSStyleSheetHeader>}
   */
  styleSheetHeaders() {
    return this._styleSheetIdToHeader.valuesArray();
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!SDK.CSSModel.Edit=} edit
   */
  _fireStyleSheetChanged(styleSheetId, edit) {
    this.dispatchEventToListeners(SDK.CSSModel.Events.StyleSheetChanged, {styleSheetId: styleSheetId, edit: edit});
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @return {!Promise<?string>}
   */
  _ensureOriginalStyleSheetText(styleSheetId) {
    var header = this.styleSheetHeaderForId(styleSheetId);
    if (!header)
      return Promise.resolve(/** @type {?string} */ (null));
    var promise = this._originalStyleSheetText.get(header);
    if (!promise) {
      promise = this.getStyleSheetText(header.id);
      this._originalStyleSheetText.set(header, promise);
      this._originalContentRequestedForTest(header);
    }
    return promise;
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _originalContentRequestedForTest(header) {
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {!Promise<?string>}
   */
  originalStyleSheetText(header) {
    return this._ensureOriginalStyleSheetText(header.id);
  }

  /**
   * @param {!Protocol.CSS.CSSStyleSheetHeader} header
   */
  _styleSheetAdded(header) {
    console.assert(!this._styleSheetIdToHeader.get(header.styleSheetId));
    var styleSheetHeader = new SDK.CSSStyleSheetHeader(this, header);
    this._styleSheetIdToHeader.set(header.styleSheetId, styleSheetHeader);
    var url = styleSheetHeader.resourceURL();
    if (!this._styleSheetIdsForURL.get(url))
      this._styleSheetIdsForURL.set(url, {});
    var frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
    var styleSheetIds = frameIdToStyleSheetIds[styleSheetHeader.frameId];
    if (!styleSheetIds) {
      styleSheetIds = [];
      frameIdToStyleSheetIds[styleSheetHeader.frameId] = styleSheetIds;
    }
    styleSheetIds.push(styleSheetHeader.id);
    this._sourceMapManager.attachSourceMap(styleSheetHeader, styleSheetHeader.sourceURL, styleSheetHeader.sourceMapURL);
    this.dispatchEventToListeners(SDK.CSSModel.Events.StyleSheetAdded, styleSheetHeader);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} id
   */
  _styleSheetRemoved(id) {
    var header = this._styleSheetIdToHeader.get(id);
    console.assert(header);
    if (!header)
      return;
    this._styleSheetIdToHeader.remove(id);
    var url = header.resourceURL();
    var frameIdToStyleSheetIds = /** @type {!Object.<!Protocol.Page.FrameId, !Array.<!Protocol.CSS.StyleSheetId>>} */ (
        this._styleSheetIdsForURL.get(url));
    console.assert(frameIdToStyleSheetIds, 'No frameId to styleSheetId map is available for given style sheet URL.');
    frameIdToStyleSheetIds[header.frameId].remove(id);
    if (!frameIdToStyleSheetIds[header.frameId].length) {
      delete frameIdToStyleSheetIds[header.frameId];
      if (!Object.keys(frameIdToStyleSheetIds).length)
        this._styleSheetIdsForURL.remove(url);
    }
    this._originalStyleSheetText.remove(header);
    this._sourceMapManager.detachSourceMap(header);
    this.dispatchEventToListeners(SDK.CSSModel.Events.StyleSheetRemoved, header);
  }

  /**
   * @param {string} url
   * @return {!Array.<!Protocol.CSS.StyleSheetId>}
   */
  styleSheetIdsForURL(url) {
    var frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
    if (!frameIdToStyleSheetIds)
      return [];

    var result = [];
    for (var frameId in frameIdToStyleSheetIds)
      result = result.concat(frameIdToStyleSheetIds[frameId]);
    return result;
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {string} newText
   * @param {boolean} majorChange
   * @return {!Promise.<?Protocol.Error>}
   */
  setStyleSheetText(styleSheetId, newText, majorChange) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (this._styleSheetIdToHeader.get(styleSheetId));
    console.assert(header);
    newText = SDK.CSSModel.trimSourceURL(newText);
    if (header.hasSourceURL)
      newText += '\n/*# sourceURL=' + header.sourceURL + ' */';
    return this._ensureOriginalStyleSheetText(styleSheetId)
        .then(() => this._agent.setStyleSheetText(header.id, newText, callback.bind(this)));

    /**
     * @param {?Protocol.Error} error
     * @param {string=} sourceMapURL
     * @return {?Protocol.Error}
     * @this {SDK.CSSModel}
     */
    function callback(error, sourceMapURL) {
      this._sourceMapManager.detachSourceMap(header);
      header.setSourceMapURL(sourceMapURL);
      this._sourceMapManager.attachSourceMap(header, header.sourceURL, header.sourceMapURL);
      if (error)
        return error;
      if (majorChange)
        this._domModel.markUndoableState();
      this._fireStyleSheetChanged(styleSheetId);
      return null;
    }
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @return {!Promise<?string>}
   */
  getStyleSheetText(styleSheetId) {
    /**
     * @param {?Protocol.Error} error
     * @param {?string} text
     * @return {?string}
     */
    function textCallback(error, text) {
      if (error || text === null) {
        console.error('Failed to get text for stylesheet ' + styleSheetId + ': ' + error);
        return null;
      }
      return SDK.CSSModel.trimSourceURL(text);
    }

    return this._agent.getStyleSheetText(styleSheetId, textCallback).catchException(/** @type {?string} */ (null));
  }

  _resetStyleSheets() {
    var headers = this._styleSheetIdToHeader.valuesArray();
    this._styleSheetIdsForURL.clear();
    this._styleSheetIdToHeader.clear();
    for (var i = 0; i < headers.length; ++i) {
      this._sourceMapManager.detachSourceMap(headers[i]);
      this.dispatchEventToListeners(SDK.CSSModel.Events.StyleSheetRemoved, headers[i]);
    }
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    this._isEnabled = false;
    return this._agent.disable().then(this._resetStyleSheets.bind(this));
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    return this._agent.enable().then(this._wasEnabled.bind(this));
  }

  /**
   * @param {number} nodeId
   * @param {string} name
   * @param {string} value
   */
  setEffectivePropertyValueForNode(nodeId, name, value) {
    this._agent.setEffectivePropertyValueForNode(nodeId, name, value);
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {!Promise.<?SDK.CSSMatchedStyles>}
   */
  cachedMatchedCascadeForNode(node) {
    if (this._cachedMatchedCascadeNode !== node)
      this.discardCachedMatchedCascade();
    this._cachedMatchedCascadeNode = node;
    if (!this._cachedMatchedCascadePromise)
      this._cachedMatchedCascadePromise = this.matchedStylesPromise(node.id);
    return this._cachedMatchedCascadePromise;
  }

  discardCachedMatchedCascade() {
    delete this._cachedMatchedCascadeNode;
    delete this._cachedMatchedCascadePromise;
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    this._sourceMapManager.dispose();
  }
};

SDK.SDKModel.register(SDK.CSSModel, SDK.Target.Capability.DOM, true);

/** @typedef {!{range: !Protocol.CSS.SourceRange, styleSheetId: !Protocol.CSS.StyleSheetId, wasUsed: boolean}} */
SDK.CSSModel.RuleUsage;

/** @enum {symbol} */
SDK.CSSModel.Events = {
  FontsUpdated: Symbol('FontsUpdated'),
  MediaQueryResultChanged: Symbol('MediaQueryResultChanged'),
  ModelWasEnabled: Symbol('ModelWasEnabled'),
  PseudoStateForced: Symbol('PseudoStateForced'),
  StyleSheetAdded: Symbol('StyleSheetAdded'),
  StyleSheetChanged: Symbol('StyleSheetChanged'),
  StyleSheetRemoved: Symbol('StyleSheetRemoved')
};

SDK.CSSModel.MediaTypes =
    ['all', 'braille', 'embossed', 'handheld', 'print', 'projection', 'screen', 'speech', 'tty', 'tv'];

SDK.CSSModel.PseudoStateMarker = 'pseudo-state-marker';

/**
 * @unrestricted
 */
SDK.CSSModel.Edit = class {
  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} oldRange
   * @param {string} newText
   * @param {?Object} payload
   */
  constructor(styleSheetId, oldRange, newText, payload) {
    this.styleSheetId = styleSheetId;
    this.oldRange = oldRange;
    this.newRange = TextUtils.TextRange.fromEdit(oldRange, newText);
    this.payload = payload;
  }
};

SDK.CSSLocation = class {
  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   * @param {number} lineNumber
   * @param {number=} columnNumber
   */
  constructor(header, lineNumber, columnNumber) {
    this._cssModel = header.cssModel();
    this.styleSheetId = header.id;
    this.url = header.resourceURL();
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber || 0;
  }

  /**
   * @return {!SDK.CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  /**
   * @return {?SDK.CSSStyleSheetHeader}
   */
  header() {
    return this._cssModel.styleSheetHeaderForId(this.styleSheetId);
  }
};

/**
 * @implements {Protocol.CSSDispatcher}
 * @unrestricted
 */
SDK.CSSDispatcher = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   */
  constructor(cssModel) {
    this._cssModel = cssModel;
  }

  /**
   * @override
   */
  mediaQueryResultChanged() {
    this._cssModel.mediaQueryResultChanged();
  }

  /**
   * @override
   */
  fontsUpdated() {
    this._cssModel.fontsUpdated();
  }

  /**
   * @override
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   */
  styleSheetChanged(styleSheetId) {
    this._cssModel._fireStyleSheetChanged(styleSheetId);
  }

  /**
   * @override
   * @param {!Protocol.CSS.CSSStyleSheetHeader} header
   */
  styleSheetAdded(header) {
    this._cssModel._styleSheetAdded(header);
  }

  /**
   * @override
   * @param {!Protocol.CSS.StyleSheetId} id
   */
  styleSheetRemoved(id) {
    this._cssModel._styleSheetRemoved(id);
  }
};

/**
 * @unrestricted
 */
SDK.CSSModel.ComputedStyleLoader = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   */
  constructor(cssModel) {
    this._cssModel = cssModel;
    /** @type {!Map<!Protocol.DOM.NodeId, !Promise<?Map<string, string>>>} */
    this._nodeIdToPromise = new Map();
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise<?Map<string, string>>}
   */
  computedStylePromise(nodeId) {
    if (!this._nodeIdToPromise.has(nodeId)) {
      this._nodeIdToPromise.set(
          nodeId, this._cssModel._agent.getComputedStyleForNode(nodeId, parsePayload).then(cleanUp.bind(this)));
    }

    return /** @type {!Promise.<?Map.<string, string>>} */ (this._nodeIdToPromise.get(nodeId));

    /**
     * @param {?Protocol.Error} error
     * @param {!Array.<!Protocol.CSS.CSSComputedStyleProperty>} computedPayload
     * @return {?Map.<string, string>}
     */
    function parsePayload(error, computedPayload) {
      if (error || !computedPayload || !computedPayload.length)
        return null;
      var result = new Map();
      for (var property of computedPayload)
        result.set(property.name, property.value);
      return result;
    }

    /**
     * @param {?Map.<string, string>} computedStyle
     * @return {?Map.<string, string>}
     * @this {SDK.CSSModel.ComputedStyleLoader}
     */
    function cleanUp(computedStyle) {
      this._nodeIdToPromise.delete(nodeId);
      return computedStyle;
    }
  }
};


/**
 * @unrestricted
 */
SDK.CSSModel.InlineStyleResult = class {
  /**
   * @param {?SDK.CSSStyleDeclaration} inlineStyle
   * @param {?SDK.CSSStyleDeclaration} attributesStyle
   */
  constructor(inlineStyle, attributesStyle) {
    this.inlineStyle = inlineStyle;
    this.attributesStyle = attributesStyle;
  }
};
