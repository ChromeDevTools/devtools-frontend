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

import * as Common from '../common/common.js';
import * as HostModule from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import {CSSMatchedStyles} from './CSSMatchedStyles.js';
import {CSSMedia} from './CSSMedia.js';
import {CSSStyleRule} from './CSSRule.js';
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';
import {DOMModel, DOMNode} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars
import {SourceMapManager} from './SourceMapManager.js';

/**
 * @unrestricted
 */
export class CSSModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._domModel = /** @type {!DOMModel} */ (target.model(DOMModel));
    /** @type {!SourceMapManager<!CSSStyleSheetHeader>} */
    this._sourceMapManager = new SourceMapManager(target);
    this._agent = target.cssAgent();
    this._styleLoader = new ComputedStyleLoader(this);
    this._resourceTreeModel = target.model(ResourceTreeModel);
    if (this._resourceTreeModel) {
      this._resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.MainFrameNavigated, this._resetStyleSheets, this);
    }
    target.registerCSSDispatcher(new CSSDispatcher(this));
    if (!target.suspended()) {
      this._enable();
    }
    /** @type {!Map.<string, !CSSStyleSheetHeader>} */
    this._styleSheetIdToHeader = new Map();
    /** @type {!Map.<string, !Map.<!Protocol.Page.FrameId, !Set.<!Protocol.CSS.StyleSheetId>>>} */
    this._styleSheetIdsForURL = new Map();

    /** @type {!Map.<!CSSStyleSheetHeader, !Promise<?string>>} */
    this._originalStyleSheetText = new Map();

    /** @type {boolean} */
    this._isRuleUsageTrackingEnabled = false;

    this._sourceMapManager.setEnabled(Common.Settings.Settings.instance().moduleSetting('cssSourceMapsEnabled').get());
    Common.Settings.Settings.instance()
        .moduleSetting('cssSourceMapsEnabled')
        .addChangeListener(event => this._sourceMapManager.setEnabled(/** @type {boolean} */ (event.data)));
  }

  /**
   * @param {string} sourceURL
   * @return {!Array<!CSSStyleSheetHeader>}
   */
  headersForSourceURL(sourceURL) {
    const headers = [];
    for (const headerId of this.styleSheetIdsForURL(sourceURL)) {
      const header = this.styleSheetHeaderForId(headerId);
      if (header) {
        headers.push(header);
      }
    }
    return headers;
  }

  /**
   * @param {string} sourceURL
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!CSSLocation>}
   */
  createRawLocationsByURL(sourceURL, lineNumber, columnNumber) {
    const headers = this.headersForSourceURL(sourceURL);
    headers.sort(stylesheetComparator);
    const compareToArgLocation = (_, header) => lineNumber - header.startLine || columnNumber - header.startColumn;
    const endIndex = headers.upperBound(undefined, compareToArgLocation);
    if (!endIndex) {
      return [];
    }
    const locations = [];
    const last = headers[endIndex - 1];
    for (let index = endIndex - 1;
         index >= 0 && headers[index].startLine === last.startLine && headers[index].startColumn === last.startColumn;
         --index) {
      if (headers[index].containsLocation(lineNumber, columnNumber)) {
        locations.push(new CSSLocation(headers[index], lineNumber, columnNumber));
      }
    }


    return locations;
    /**
     * @param {!CSSStyleSheetHeader} a
     * @param {!CSSStyleSheetHeader} b
     * @return {number}
     */
    function stylesheetComparator(a, b) {
      return a.startLine - b.startLine || a.startColumn - b.startColumn || a.id.localeCompare(b.id);
    }
  }

  /**
   * @return {!SourceMapManager<!CSSStyleSheetHeader>}
   */
  sourceMapManager() {
    return this._sourceMapManager;
  }

  /**
   * @param {string} text
   * @return {string}
   */
  static trimSourceURL(text) {
    let sourceURLIndex = text.lastIndexOf('/*# sourceURL=');
    if (sourceURLIndex === -1) {
      sourceURLIndex = text.lastIndexOf('/*@ sourceURL=');
      if (sourceURLIndex === -1) {
        return text;
      }
    }
    const sourceURLLineIndex = text.lastIndexOf('\n', sourceURLIndex);
    if (sourceURLLineIndex === -1) {
      return text;
    }
    const sourceURLLine = text.substr(sourceURLLineIndex + 1).split('\n', 1)[0];
    const sourceURLRegex = /[\040\t]*\/\*[#@] sourceURL=[\040\t]*([^\s]*)[\040\t]*\*\/[\040\t]*$/;
    if (sourceURLLine.search(sourceURLRegex) === -1) {
      return text;
    }
    return text.substr(0, sourceURLLineIndex) + text.substr(sourceURLLineIndex + sourceURLLine.length + 1);
  }

  /**
   * @return {!DOMModel}
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
  async setStyleText(styleSheetId, range, text, majorChange) {
    try {
      await this._ensureOriginalStyleSheetText(styleSheetId);

      const stylePayloads =
          await this._agent.setStyleTexts([{styleSheetId: styleSheetId, range: range.serializeToObject(), text: text}]);
      if (!stylePayloads || stylePayloads.length !== 1) {
        return false;
      }

      this._domModel.markUndoableState(!majorChange);
      const edit = new Edit(styleSheetId, range, text, stylePayloads[0]);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} text
   * @return {!Promise<boolean>}
   */
  async setSelectorText(styleSheetId, range, text) {
    HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this._ensureOriginalStyleSheetText(styleSheetId);
      const selectorPayload = await this._agent.setRuleSelector(styleSheetId, range, text);

      if (!selectorPayload) {
        return false;
      }
      this._domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, text, selectorPayload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} text
   * @return {!Promise<boolean>}
   */
  async setKeyframeKey(styleSheetId, range, text) {
    HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this._ensureOriginalStyleSheetText(styleSheetId);
      const payload = await this._agent.setKeyframeKey(styleSheetId, range, text);

      if (!payload) {
        return false;
      }
      this._domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, text, payload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      return false;
    }
  }

  startCoverage() {
    this._isRuleUsageTrackingEnabled = true;
    return this._agent.startRuleUsageTracking();
  }

  /**
   * @return {!Promise<{timestamp: number, coverage:!Array<!Protocol.CSS.RuleUsage>}>}
   */
  async takeCoverageDelta() {
    const r = await this._agent.invoke_takeCoverageDelta({});
    const timestamp = (r && r.timestamp) || 0;
    const coverage = (r && r.coverage) || [];
    return {timestamp, coverage};
  }

  /**
   * @return {!Promise}
   */
  stopCoverage() {
    this._isRuleUsageTrackingEnabled = false;
    return this._agent.stopRuleUsageTracking();
  }

  /**
   * @return {!Promise<!Array<!CSSMedia>>}
   */
  async mediaQueriesPromise() {
    const payload = await this._agent.getMediaQueries();
    return payload ? CSSMedia.parseMediaArrayPayload(this, payload) : [];
  }

  /**
   * @return {boolean}
   */
  isEnabled() {
    return this._isEnabled;
  }

  /**
   * @return {!Promise}
   */
  async _enable() {
    await this._agent.enable();
    this._isEnabled = true;
    if (this._isRuleUsageTrackingEnabled) {
      await this.startCoverage();
    }
    this.dispatchEventToListeners(Events.ModelWasEnabled);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise<?CSSMatchedStyles>}
   */
  async matchedStylesPromise(nodeId) {
    const response = await this._agent.invoke_getMatchedStylesForNode({nodeId});

    if (response[ProtocolClient.InspectorBackend.ProtocolError]) {
      return null;
    }

    const node = this._domModel.nodeForId(nodeId);
    if (!node) {
      return null;
    }

    return new CSSMatchedStyles(
        this, /** @type {!DOMNode} */ (node), response.inlineStyle || null, response.attributesStyle || null,
        response.matchedCSSRules || [], response.pseudoElements || [], response.inherited || [],
        response.cssKeyframesRules || []);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @return {!Promise<!Array<string>>}
   */
  classNamesPromise(styleSheetId) {
    return this._agent.collectClassNames(styleSheetId).then(classNames => classNames || []);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise<?Map<string, string>>}
   */
  computedStylePromise(nodeId) {
    return this._styleLoader.computedStylePromise(nodeId);
  }

  /**
   * @param {number} nodeId
   * @return {!Promise<?ContrastInfo>}
   */
  async backgroundColorsPromise(nodeId) {
    const response = this._agent.invoke_getBackgroundColors({nodeId});
    if (response[ProtocolClient.InspectorBackend.ProtocolError]) {
      return null;
    }

    return response;
  }

  /**
   * @param {number} nodeId
   * @return {!Promise<?Array<!Protocol.CSS.PlatformFontUsage>>}
   */
  platformFontsPromise(nodeId) {
    return this._agent.getPlatformFontsForNode(nodeId);
  }

  /**
   * @return {!Array.<!CSSStyleSheetHeader>}
   */
  allStyleSheets() {
    const values = [...this._styleSheetIdToHeader.values()];
    /**
     * @param {!CSSStyleSheetHeader} a
     * @param {!CSSStyleSheetHeader} b
     * @return {number}
     */
    function styleSheetComparator(a, b) {
      if (a.sourceURL < b.sourceURL) {
        return -1;
      }
      if (a.sourceURL > b.sourceURL) {
        return 1;
      }
      return a.startLine - b.startLine || a.startColumn - b.startColumn;
    }
    values.sort(styleSheetComparator);

    return values;
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise<?InlineStyleResult>}
   */
  async inlineStylesPromise(nodeId) {
    const response = await this._agent.invoke_getInlineStylesForNode({nodeId});

    if (response[ProtocolClient.InspectorBackend.ProtocolError] || !response.inlineStyle) {
      return null;
    }
    const inlineStyle = new CSSStyleDeclaration(this, null, response.inlineStyle, Type.Inline);
    const attributesStyle = response.attributesStyle ?
        new CSSStyleDeclaration(this, null, response.attributesStyle, Type.Attributes) :
        null;
    return new InlineStyleResult(inlineStyle, attributesStyle);
  }

  /**
   * @param {!DOMNode} node
   * @param {string} pseudoClass
   * @param {boolean} enable
   * @return {boolean}
   */
  forcePseudoState(node, pseudoClass, enable) {
    const pseudoClasses = node.marker(PseudoStateMarker) || [];
    if (enable) {
      if (pseudoClasses.indexOf(pseudoClass) >= 0) {
        return false;
      }
      pseudoClasses.push(pseudoClass);
      node.setMarker(PseudoStateMarker, pseudoClasses);
    } else {
      if (pseudoClasses.indexOf(pseudoClass) < 0) {
        return false;
      }
      Platform.ArrayUtilities.removeElement(pseudoClasses, pseudoClass);
      if (pseudoClasses.length) {
        node.setMarker(PseudoStateMarker, pseudoClasses);
      } else {
        node.setMarker(PseudoStateMarker, null);
      }
    }

    this._agent.forcePseudoState(node.id, pseudoClasses);
    this.dispatchEventToListeners(Events.PseudoStateForced, {node: node, pseudoClass: pseudoClass, enable: enable});
    return true;
  }

  /**
   * @param {!DOMNode} node
   * @return {?Array<string>} state
   */
  pseudoState(node) {
    return node.marker(PseudoStateMarker) || [];
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!TextUtils.TextRange} range
   * @param {string} newMediaText
   * @return {!Promise<boolean>}
   */
  async setMediaText(styleSheetId, range, newMediaText) {
    HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this._ensureOriginalStyleSheetText(styleSheetId);
      const mediaPayload = await this._agent.setMediaText(styleSheetId, range, newMediaText);

      if (!mediaPayload) {
        return false;
      }
      this._domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, newMediaText, mediaPayload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {string} ruleText
   * @param {!TextUtils.TextRange} ruleLocation
   * @return {!Promise<?CSSStyleRule>}
   */
  async addRule(styleSheetId, ruleText, ruleLocation) {
    try {
      await this._ensureOriginalStyleSheetText(styleSheetId);
      const rulePayload = await this._agent.addRule(styleSheetId, ruleText, ruleLocation);

      if (!rulePayload) {
        return null;
      }
      this._domModel.markUndoableState();
      const edit = new Edit(styleSheetId, ruleLocation, ruleText, rulePayload);
      this._fireStyleSheetChanged(styleSheetId, edit);
      return new CSSStyleRule(this, rulePayload);
    } catch (e) {
      return null;
    }
  }

  /**
   * @param {!DOMNode} node
   * @return {!Promise<?CSSStyleSheetHeader>}
   */
  async requestViaInspectorStylesheet(node) {
    const frameId = node.frameId() || (this._resourceTreeModel ? this._resourceTreeModel.mainFrame.id : '');
    const headers = [...this._styleSheetIdToHeader.values()];
    const styleSheetHeader = headers.find(header => header.frameId === frameId && header.isViaInspector());
    if (styleSheetHeader) {
      return styleSheetHeader;
    }

    try {
      const styleSheetId = await this._agent.createStyleSheet(frameId);
      return styleSheetId && this._styleSheetIdToHeader.get(styleSheetId) || null;
    } catch (e) {
      return null;
    }
  }

  mediaQueryResultChanged() {
    this.dispatchEventToListeners(Events.MediaQueryResultChanged);
  }

  fontsUpdated() {
    this.dispatchEventToListeners(Events.FontsUpdated);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} id
   * @return {?CSSStyleSheetHeader}
   */
  styleSheetHeaderForId(id) {
    return this._styleSheetIdToHeader.get(id) || null;
  }

  /**
   * @return {!Array.<!CSSStyleSheetHeader>}
   */
  styleSheetHeaders() {
    return [...this._styleSheetIdToHeader.values()];
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {!Edit=} edit
   */
  _fireStyleSheetChanged(styleSheetId, edit) {
    this.dispatchEventToListeners(Events.StyleSheetChanged, {styleSheetId: styleSheetId, edit: edit});
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @return {!Promise<?string>}
   */
  _ensureOriginalStyleSheetText(styleSheetId) {
    const header = this.styleSheetHeaderForId(styleSheetId);
    if (!header) {
      return Promise.resolve(/** @type {?string} */ (null));
    }
    let promise = this._originalStyleSheetText.get(header);
    if (!promise) {
      promise = this.getStyleSheetText(header.id);
      this._originalStyleSheetText.set(header, promise);
      this._originalContentRequestedForTest(header);
    }
    return promise;
  }

  /**
   * @param {!CSSStyleSheetHeader} header
   */
  _originalContentRequestedForTest(header) {
  }

  /**
   * @param {!CSSStyleSheetHeader} header
   * @return {!Promise<?string>}
   */
  originalStyleSheetText(header) {
    return this._ensureOriginalStyleSheetText(header.id);
  }

  /**
   *
   * @return {!Iterable<!CSSStyleSheetHeader>}
   */
  getAllStyleSheetHeaders() {
    return this._styleSheetIdToHeader.values();
  }

  /**
   * @param {!Protocol.CSS.CSSStyleSheetHeader} header
   */
  _styleSheetAdded(header) {
    console.assert(!this._styleSheetIdToHeader.get(header.styleSheetId));
    const styleSheetHeader = new CSSStyleSheetHeader(this, header);
    this._styleSheetIdToHeader.set(header.styleSheetId, styleSheetHeader);
    const url = styleSheetHeader.resourceURL();
    if (!this._styleSheetIdsForURL.get(url)) {
      this._styleSheetIdsForURL.set(url, new Map());
    }
    const frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
    let styleSheetIds = frameIdToStyleSheetIds.get(styleSheetHeader.frameId);
    if (!styleSheetIds) {
      styleSheetIds = new Set();
      frameIdToStyleSheetIds.set(styleSheetHeader.frameId, styleSheetIds);
    }
    styleSheetIds.add(styleSheetHeader.id);
    this._sourceMapManager.attachSourceMap(styleSheetHeader, styleSheetHeader.sourceURL, styleSheetHeader.sourceMapURL);
    this.dispatchEventToListeners(Events.StyleSheetAdded, styleSheetHeader);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} id
   */
  _styleSheetRemoved(id) {
    const header = this._styleSheetIdToHeader.get(id);
    console.assert(header);
    if (!header) {
      return;
    }
    this._styleSheetIdToHeader.delete(id);
    const url = header.resourceURL();
    const frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
    console.assert(frameIdToStyleSheetIds, 'No frameId to styleSheetId map is available for given style sheet URL.');
    frameIdToStyleSheetIds.get(header.frameId).delete(id);
    if (!frameIdToStyleSheetIds.get(header.frameId).size) {
      frameIdToStyleSheetIds.delete(header.frameId);
      if (!frameIdToStyleSheetIds.size) {
        this._styleSheetIdsForURL.delete(url);
      }
    }
    this._originalStyleSheetText.delete(header);
    this._sourceMapManager.detachSourceMap(header);
    this.dispatchEventToListeners(Events.StyleSheetRemoved, header);
  }

  /**
   * @param {string} url
   * @return {!Array.<!Protocol.CSS.StyleSheetId>}
   */
  styleSheetIdsForURL(url) {
    const frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
    if (!frameIdToStyleSheetIds) {
      return [];
    }

    const result = [];
    for (const styleSheetIds of frameIdToStyleSheetIds.values()) {
      result.push(...styleSheetIds);
    }
    return result;
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @param {string} newText
   * @param {boolean} majorChange
   * @return {!Promise<?string>}
   */
  async setStyleSheetText(styleSheetId, newText, majorChange) {
    const header = /** @type {!CSSStyleSheetHeader} */ (this._styleSheetIdToHeader.get(styleSheetId));
    console.assert(header);
    newText = CSSModel.trimSourceURL(newText);
    if (header.hasSourceURL) {
      newText += '\n/*# sourceURL=' + header.sourceURL + ' */';
    }

    await this._ensureOriginalStyleSheetText(styleSheetId);
    const response = await this._agent.invoke_setStyleSheetText({styleSheetId: header.id, text: newText});
    const sourceMapURL = response.sourceMapURL;

    this._sourceMapManager.detachSourceMap(header);
    header.setSourceMapURL(sourceMapURL);
    this._sourceMapManager.attachSourceMap(header, header.sourceURL, header.sourceMapURL);
    if (sourceMapURL === null) {
      return 'Error in CSS.setStyleSheetText';
    }
    this._domModel.markUndoableState(!majorChange);
    this._fireStyleSheetChanged(styleSheetId);
    return null;
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   * @return {!Promise<?string>}
   */
  async getStyleSheetText(styleSheetId) {
    try {
      const text = await this._agent.getStyleSheetText(styleSheetId);
      return text && CSSModel.trimSourceURL(text);
    } catch (e) {
      return null;
    }
  }

  _resetStyleSheets() {
    const headers = [...this._styleSheetIdToHeader.values()];
    this._styleSheetIdsForURL.clear();
    this._styleSheetIdToHeader.clear();
    for (const header of headers) {
      this._sourceMapManager.detachSourceMap(header);
      this.dispatchEventToListeners(Events.StyleSheetRemoved, header);
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
  async resumeModel() {
    return this._enable();
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
   * @param {!DOMNode} node
   * @return {!Promise.<?CSSMatchedStyles>}
   */
  cachedMatchedCascadeForNode(node) {
    if (this._cachedMatchedCascadeNode !== node) {
      this.discardCachedMatchedCascade();
    }
    this._cachedMatchedCascadeNode = node;
    if (!this._cachedMatchedCascadePromise) {
      this._cachedMatchedCascadePromise = this.matchedStylesPromise(node.id);
    }
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
}

/** @enum {symbol} */
export const Events = {
  FontsUpdated: Symbol('FontsUpdated'),
  MediaQueryResultChanged: Symbol('MediaQueryResultChanged'),
  ModelWasEnabled: Symbol('ModelWasEnabled'),
  PseudoStateForced: Symbol('PseudoStateForced'),
  StyleSheetAdded: Symbol('StyleSheetAdded'),
  StyleSheetChanged: Symbol('StyleSheetChanged'),
  StyleSheetRemoved: Symbol('StyleSheetRemoved')
};

const PseudoStateMarker = 'pseudo-state-marker';

/**
 * @unrestricted
 */
export class Edit {
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
    this.newText = newText;
    this.payload = payload;
  }
}

export class CSSLocation {
  /**
   * @param {!CSSStyleSheetHeader} header
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
   * @return {!CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  /**
   * @return {?CSSStyleSheetHeader}
   */
  header() {
    return this._cssModel.styleSheetHeaderForId(this.styleSheetId);
  }
}

/**
 * @implements {Protocol.CSSDispatcher}
 * @unrestricted
 */
class CSSDispatcher {
  /**
   * @param {!CSSModel} cssModel
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
}

/**
 * @unrestricted
 */
class ComputedStyleLoader {
  /**
   * @param {!CSSModel} cssModel
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
    let promise = this._nodeIdToPromise.get(nodeId);
    if (promise) {
      return promise;
    }
    promise = this._cssModel._agent.getComputedStyleForNode(nodeId).then(parsePayload.bind(this));
    this._nodeIdToPromise.set(nodeId, promise);
    return promise;

    /**
     * @param {?Array<!Protocol.CSS.CSSComputedStyleProperty>} computedPayload
     * @return {?Map<string, string>}
     * @this {ComputedStyleLoader}
     */
    function parsePayload(computedPayload) {
      this._nodeIdToPromise.delete(nodeId);
      if (!computedPayload || !computedPayload.length) {
        return null;
      }
      const result = new Map();
      for (const property of computedPayload) {
        result.set(property.name, property.value);
      }
      return result;
    }
  }
}

/**
 * @unrestricted
 */
export class InlineStyleResult {
  /**
   * @param {?CSSStyleDeclaration} inlineStyle
   * @param {?CSSStyleDeclaration} attributesStyle
   */
  constructor(inlineStyle, attributesStyle) {
    this.inlineStyle = inlineStyle;
    this.attributesStyle = attributesStyle;
  }
}

SDKModel.register(CSSModel, Capability.DOM, true);

/** @typedef {{backgroundColors: ?Array<string>, computedFontSize: string, computedFontWeight: string}} */
export let ContrastInfo;
