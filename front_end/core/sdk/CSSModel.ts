// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
 *     * Neither the #name of Google Inc. nor the names of its
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

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';

import {CSSFontFace} from './CSSFontFace.js';
import {CSSMatchedStyles} from './CSSMatchedStyles.js';
import {CSSMedia} from './CSSMedia.js';
import {CSSStyleRule} from './CSSRule.js';
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';
import {DOMModel, type DOMNode} from './DOMModel.js';
import {
  Events as ResourceTreeModelEvents,
  PrimaryPageChangeType,
  type ResourceTreeFrame,
  ResourceTreeModel,
} from './ResourceTreeModel.js';
import {SDKModel} from './SDKModel.js';
import {SourceMapManager} from './SourceMapManager.js';
import {Capability, type Target} from './Target.js';

export class CSSModel extends SDKModel<EventTypes> {
  readonly agent: ProtocolProxyApi.CSSApi;
  readonly #domModel: DOMModel;
  readonly #fontFaces: Map<string, CSSFontFace>;
  readonly #originalStyleSheetText: Map<CSSStyleSheetHeader, Promise<string|null>>;
  readonly #resourceTreeModel: ResourceTreeModel|null;
  readonly #sourceMapManager: SourceMapManager<CSSStyleSheetHeader>;
  readonly #styleLoader: ComputedStyleLoader;
  readonly #stylePollingThrottler: Common.Throttler.Throttler;
  readonly #styleSheetIdsForURL: Map<Platform.DevToolsPath.UrlString, Map<string, Set<Protocol.CSS.StyleSheetId>>>;
  readonly #styleSheetIdToHeader: Map<Protocol.CSS.StyleSheetId, CSSStyleSheetHeader>;
  #cachedMatchedCascadeNode: DOMNode|null;
  #cachedMatchedCascadePromise: Promise<CSSMatchedStyles|null>|null;
  #cssPropertyTracker: CSSPropertyTracker|null;
  #isCSSPropertyTrackingEnabled: boolean;
  #isEnabled: boolean;
  #isRuleUsageTrackingEnabled: boolean;
  #isTrackingRequestPending: boolean;

  constructor(target: Target) {
    super(target);
    this.#isEnabled = false;
    this.#cachedMatchedCascadeNode = null;
    this.#cachedMatchedCascadePromise = null;
    this.#domModel = (target.model(DOMModel) as DOMModel);
    this.#sourceMapManager = new SourceMapManager(target);
    this.agent = target.cssAgent();
    this.#styleLoader = new ComputedStyleLoader(this);
    this.#resourceTreeModel = target.model(ResourceTreeModel);
    if (this.#resourceTreeModel) {
      this.#resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.PrimaryPageChanged, this.onPrimaryPageChanged, this);
    }
    target.registerCSSDispatcher(new CSSDispatcher(this));
    if (!target.suspended()) {
      void this.enable();
    }
    this.#styleSheetIdToHeader = new Map();
    this.#styleSheetIdsForURL = new Map();

    this.#originalStyleSheetText = new Map();

    this.#isRuleUsageTrackingEnabled = false;

    this.#fontFaces = new Map();

    this.#cssPropertyTracker = null;  // TODO: support multiple trackers when we refactor the backend
    this.#isCSSPropertyTrackingEnabled = false;
    this.#isTrackingRequestPending = false;
    this.#stylePollingThrottler = new Common.Throttler.Throttler(StylePollingInterval);

    this.#sourceMapManager.setEnabled(Common.Settings.Settings.instance().moduleSetting('cssSourceMapsEnabled').get());
    Common.Settings.Settings.instance()
        .moduleSetting('cssSourceMapsEnabled')
        .addChangeListener(event => this.#sourceMapManager.setEnabled((event.data as boolean)));
  }

  headersForSourceURL(sourceURL: Platform.DevToolsPath.UrlString): CSSStyleSheetHeader[] {
    const headers = [];
    for (const headerId of this.getStyleSheetIdsForURL(sourceURL)) {
      const header = this.styleSheetHeaderForId(headerId);
      if (header) {
        headers.push(header);
      }
    }
    return headers;
  }

  createRawLocationsByURL(
      sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number,
      columnNumber: number|undefined = 0): CSSLocation[] {
    const headers = this.headersForSourceURL(sourceURL);
    headers.sort(stylesheetComparator);
    const endIndex = Platform.ArrayUtilities.upperBound(
        headers, undefined, (_, header) => lineNumber - header.startLine || columnNumber - header.startColumn);
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
    function stylesheetComparator(a: CSSStyleSheetHeader, b: CSSStyleSheetHeader): number {
      return a.startLine - b.startLine || a.startColumn - b.startColumn || a.id.localeCompare(b.id);
    }
  }

  sourceMapManager(): SourceMapManager<CSSStyleSheetHeader> {
    return this.#sourceMapManager;
  }

  static readableLayerName(text: string): string {
    return text || '<anonymous>';
  }

  static trimSourceURL(text: string): string {
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

  domModel(): DOMModel {
    return this.#domModel;
  }

  async setStyleText(
      styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange, text: string,
      majorChange: boolean): Promise<boolean> {
    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);

      const {styles} = await this.agent.invoke_setStyleTexts(
          {edits: [{styleSheetId: styleSheetId, range: range.serializeToObject(), text}]});
      if (!styles || styles.length !== 1) {
        return false;
      }

      this.#domModel.markUndoableState(!majorChange);
      const edit = new Edit(styleSheetId, range, text, styles[0]);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setSelectorText(styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange, text: string):
      Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {selectorList} = await this.agent.invoke_setRuleSelector({styleSheetId, range, selector: text});

      if (!selectorList) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, text, selectorList);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setPropertyRulePropertyName(
      styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange, text: string): Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {propertyName} =
          await this.agent.invoke_setPropertyRulePropertyName({styleSheetId, range, propertyName: text});

      if (!propertyName) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, text, propertyName);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setKeyframeKey(styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange, text: string):
      Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {keyText} = await this.agent.invoke_setKeyframeKey({styleSheetId, range, keyText: text});

      if (!keyText) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, text, keyText);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  startCoverage(): Promise<Protocol.ProtocolResponseWithError> {
    this.#isRuleUsageTrackingEnabled = true;
    return this.agent.invoke_startRuleUsageTracking();
  }

  async takeCoverageDelta(): Promise<{
    timestamp: number,
    coverage: Array<Protocol.CSS.RuleUsage>,
  }> {
    const r = await this.agent.invoke_takeCoverageDelta();
    const timestamp = (r && r.timestamp) || 0;
    const coverage = (r && r.coverage) || [];
    return {timestamp, coverage};
  }

  setLocalFontsEnabled(enabled: boolean): Promise<Protocol.ProtocolResponseWithError> {
    return this.agent.invoke_setLocalFontsEnabled({
      enabled,
    });
  }

  async stopCoverage(): Promise<void> {
    this.#isRuleUsageTrackingEnabled = false;
    await this.agent.invoke_stopRuleUsageTracking();
  }

  async getMediaQueries(): Promise<CSSMedia[]> {
    const {medias} = await this.agent.invoke_getMediaQueries();
    return medias ? CSSMedia.parseMediaArrayPayload(this, medias) : [];
  }

  async getRootLayer(nodeId: Protocol.DOM.NodeId): Promise<Protocol.CSS.CSSLayerData> {
    const {rootLayer} = await this.agent.invoke_getLayersForNode({nodeId});
    return rootLayer;
  }

  isEnabled(): boolean {
    return this.#isEnabled;
  }

  private async enable(): Promise<void> {
    await this.agent.invoke_enable();
    this.#isEnabled = true;
    if (this.#isRuleUsageTrackingEnabled) {
      await this.startCoverage();
    }
    this.dispatchEventToListeners(Events.ModelWasEnabled);
  }

  async getMatchedStyles(nodeId: Protocol.DOM.NodeId): Promise<CSSMatchedStyles|null> {
    const response = await this.agent.invoke_getMatchedStylesForNode({nodeId});

    if (response.getError()) {
      return null;
    }

    const node = this.#domModel.nodeForId(nodeId);
    if (!node) {
      return null;
    }

    return await CSSMatchedStyles.create({
      cssModel: this,
      node: (node as DOMNode),
      inlinePayload: response.inlineStyle || null,
      attributesPayload: response.attributesStyle || null,
      matchedPayload: response.matchedCSSRules || [],
      pseudoPayload: response.pseudoElements || [],
      inheritedPayload: response.inherited || [],
      inheritedPseudoPayload: response.inheritedPseudoElements || [],
      animationsPayload: response.cssKeyframesRules || [],
      parentLayoutNodeId: response.parentLayoutNodeId,
      positionFallbackRules: response.cssPositionFallbackRules || [],
      propertyRules: response.cssPropertyRules ?? [],
      cssPropertyRegistrations: response.cssPropertyRegistrations ?? [],
    });
  }

  async getClassNames(styleSheetId: Protocol.CSS.StyleSheetId): Promise<string[]> {
    const {classNames} = await this.agent.invoke_collectClassNames({styleSheetId});
    return classNames || [];
  }

  async getComputedStyle(nodeId: Protocol.DOM.NodeId): Promise<Map<string, string>|null> {
    if (!this.isEnabled()) {
      await this.enable();
    }
    return this.#styleLoader.computedStylePromise(nodeId);
  }

  async getBackgroundColors(nodeId: Protocol.DOM.NodeId): Promise<ContrastInfo|null> {
    const response = await this.agent.invoke_getBackgroundColors({nodeId});
    if (response.getError()) {
      return null;
    }

    return {
      backgroundColors: response.backgroundColors || null,
      computedFontSize: response.computedFontSize || '',
      computedFontWeight: response.computedFontWeight || '',
    };
  }

  async getPlatformFonts(nodeId: Protocol.DOM.NodeId): Promise<Protocol.CSS.PlatformFontUsage[]|null> {
    const {fonts} = await this.agent.invoke_getPlatformFontsForNode({nodeId});
    return fonts;
  }

  allStyleSheets(): CSSStyleSheetHeader[] {
    const values = [...this.#styleSheetIdToHeader.values()];
    function styleSheetComparator(a: CSSStyleSheetHeader, b: CSSStyleSheetHeader): number {
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

  async getInlineStyles(nodeId: Protocol.DOM.NodeId): Promise<InlineStyleResult|null> {
    const response = await this.agent.invoke_getInlineStylesForNode({nodeId});

    if (response.getError() || !response.inlineStyle) {
      return null;
    }
    const inlineStyle = new CSSStyleDeclaration(this, null, response.inlineStyle, Type.Inline);
    const attributesStyle = response.attributesStyle ?
        new CSSStyleDeclaration(this, null, response.attributesStyle, Type.Attributes) :
        null;
    return new InlineStyleResult(inlineStyle, attributesStyle);
  }

  forcePseudoState(node: DOMNode, pseudoClass: string, enable: boolean): boolean {
    const forcedPseudoClasses = node.marker<string[]>(PseudoStateMarker) || [];
    const hasPseudoClass = forcedPseudoClasses.includes(pseudoClass);
    if (enable) {
      if (hasPseudoClass) {
        return false;
      }
      forcedPseudoClasses.push(pseudoClass);
      node.setMarker(PseudoStateMarker, forcedPseudoClasses);
    } else {
      if (!hasPseudoClass) {
        return false;
      }
      Platform.ArrayUtilities.removeElement(forcedPseudoClasses, pseudoClass);
      if (forcedPseudoClasses.length) {
        node.setMarker(PseudoStateMarker, forcedPseudoClasses);
      } else {
        node.setMarker(PseudoStateMarker, null);
      }
    }

    if (node.id === undefined) {
      return false;
    }
    void this.agent.invoke_forcePseudoState({nodeId: node.id, forcedPseudoClasses});
    this.dispatchEventToListeners(Events.PseudoStateForced, {node: node, pseudoClass: pseudoClass, enable: enable});
    return true;
  }

  pseudoState(node: DOMNode): string[]|null {
    return node.marker(PseudoStateMarker) || [];
  }

  async setMediaText(
      styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange,
      newMediaText: string): Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {media} = await this.agent.invoke_setMediaText({styleSheetId, range, text: newMediaText});

      if (!media) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, newMediaText, media);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setContainerQueryText(
      styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange,
      newContainerQueryText: string): Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {containerQuery} =
          await this.agent.invoke_setContainerQueryText({styleSheetId, range, text: newContainerQueryText});

      if (!containerQuery) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, newContainerQueryText, containerQuery);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setSupportsText(
      styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange,
      newSupportsText: string): Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {supports} = await this.agent.invoke_setSupportsText({styleSheetId, range, text: newSupportsText});

      if (!supports) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, newSupportsText, supports);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setScopeText(
      styleSheetId: Protocol.CSS.StyleSheetId, range: TextUtils.TextRange.TextRange,
      newScopeText: string): Promise<boolean> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);

    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {scope} = await this.agent.invoke_setScopeText({styleSheetId, range, text: newScopeText});

      if (!scope) {
        return false;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, range, newScopeText, scope);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async addRule(styleSheetId: Protocol.CSS.StyleSheetId, ruleText: string, ruleLocation: TextUtils.TextRange.TextRange):
      Promise<CSSStyleRule|null> {
    try {
      await this.ensureOriginalStyleSheetText(styleSheetId);
      const {rule} = await this.agent.invoke_addRule({styleSheetId, ruleText, location: ruleLocation});

      if (!rule) {
        return null;
      }
      this.#domModel.markUndoableState();
      const edit = new Edit(styleSheetId, ruleLocation, ruleText, rule);
      this.fireStyleSheetChanged(styleSheetId, edit);
      return new CSSStyleRule(this, rule);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async requestViaInspectorStylesheet(node: DOMNode): Promise<CSSStyleSheetHeader|null> {
    const frameId = node.frameId() ||
        (this.#resourceTreeModel && this.#resourceTreeModel.mainFrame ? this.#resourceTreeModel.mainFrame.id : null);
    const headers = [...this.#styleSheetIdToHeader.values()];
    const styleSheetHeader = headers.find(header => header.frameId === frameId && header.isViaInspector());
    if (styleSheetHeader) {
      return styleSheetHeader;
    }
    if (!frameId) {
      return null;
    }

    try {
      const {styleSheetId} = await this.agent.invoke_createStyleSheet({frameId});
      if (!styleSheetId) {
        return null;
      }
      return this.#styleSheetIdToHeader.get(styleSheetId) || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  mediaQueryResultChanged(): void {
    this.dispatchEventToListeners(Events.MediaQueryResultChanged);
  }

  fontsUpdated(fontFace?: Protocol.CSS.FontFace|null): void {
    if (fontFace) {
      this.#fontFaces.set(fontFace.src, new CSSFontFace(fontFace));
    }
    this.dispatchEventToListeners(Events.FontsUpdated);
  }

  fontFaces(): CSSFontFace[] {
    return [...this.#fontFaces.values()];
  }

  fontFaceForSource(src: string): CSSFontFace|undefined {
    return this.#fontFaces.get(src);
  }

  styleSheetHeaderForId(id: Protocol.CSS.StyleSheetId): CSSStyleSheetHeader|null {
    return this.#styleSheetIdToHeader.get(id) || null;
  }

  styleSheetHeaders(): CSSStyleSheetHeader[] {
    return [...this.#styleSheetIdToHeader.values()];
  }

  fireStyleSheetChanged(styleSheetId: Protocol.CSS.StyleSheetId, edit?: Edit): void {
    this.dispatchEventToListeners(Events.StyleSheetChanged, {styleSheetId: styleSheetId, edit: edit});
  }

  private ensureOriginalStyleSheetText(styleSheetId: Protocol.CSS.StyleSheetId): Promise<string|null> {
    const header = this.styleSheetHeaderForId(styleSheetId);
    if (!header) {
      return Promise.resolve(null);
    }
    let promise = this.#originalStyleSheetText.get(header);
    if (!promise) {
      promise = this.getStyleSheetText(header.id);
      this.#originalStyleSheetText.set(header, promise);
      this.originalContentRequestedForTest(header);
    }
    return promise;
  }

  private originalContentRequestedForTest(_header: CSSStyleSheetHeader): void {
  }

  originalStyleSheetText(header: CSSStyleSheetHeader): Promise<string|null> {
    return this.ensureOriginalStyleSheetText(header.id);
  }

  getAllStyleSheetHeaders(): Iterable<CSSStyleSheetHeader> {
    return this.#styleSheetIdToHeader.values();
  }

  styleSheetAdded(header: Protocol.CSS.CSSStyleSheetHeader): void {
    console.assert(!this.#styleSheetIdToHeader.get(header.styleSheetId));
    if (header.loadingFailed) {
      // When the stylesheet fails to load, treat it as a constructed stylesheet. Failed sheets can still be modified
      // from JS, in which case CSS.styleSheetChanged events are sent. So as to not confuse CSSModel clients we don't
      // just discard the failed sheet here. Treating the failed sheet as a constructed stylesheet lets us keep track
      // of it cleanly.
      header.hasSourceURL = false;
      header.isConstructed = true;
      header.isInline = false;
      header.isMutable = false;
      header.sourceURL = '';
      header.sourceMapURL = undefined;
    }
    const styleSheetHeader = new CSSStyleSheetHeader(this, header);
    this.#styleSheetIdToHeader.set(header.styleSheetId, styleSheetHeader);
    const url = styleSheetHeader.resourceURL();
    let frameIdToStyleSheetIds = this.#styleSheetIdsForURL.get(url);
    if (!frameIdToStyleSheetIds) {
      frameIdToStyleSheetIds = new Map();
      this.#styleSheetIdsForURL.set(url, frameIdToStyleSheetIds);
    }
    if (frameIdToStyleSheetIds) {
      let styleSheetIds = frameIdToStyleSheetIds.get(styleSheetHeader.frameId);
      if (!styleSheetIds) {
        styleSheetIds = new Set();
        frameIdToStyleSheetIds.set(styleSheetHeader.frameId, styleSheetIds);
      }
      styleSheetIds.add(styleSheetHeader.id);
    }
    this.#sourceMapManager.attachSourceMap(styleSheetHeader, styleSheetHeader.sourceURL, styleSheetHeader.sourceMapURL);
    this.dispatchEventToListeners(Events.StyleSheetAdded, styleSheetHeader);
  }

  styleSheetRemoved(id: Protocol.CSS.StyleSheetId): void {
    const header = this.#styleSheetIdToHeader.get(id);
    console.assert(Boolean(header));
    if (!header) {
      return;
    }
    this.#styleSheetIdToHeader.delete(id);
    const url = header.resourceURL();
    const frameIdToStyleSheetIds = this.#styleSheetIdsForURL.get(url);
    console.assert(
        Boolean(frameIdToStyleSheetIds), 'No frameId to styleSheetId map is available for given style sheet URL.');
    if (frameIdToStyleSheetIds) {
      const stylesheetIds = frameIdToStyleSheetIds.get(header.frameId);
      if (stylesheetIds) {
        stylesheetIds.delete(id);
        if (!stylesheetIds.size) {
          frameIdToStyleSheetIds.delete(header.frameId);
          if (!frameIdToStyleSheetIds.size) {
            this.#styleSheetIdsForURL.delete(url);
          }
        }
      }
    }
    this.#originalStyleSheetText.delete(header);
    this.#sourceMapManager.detachSourceMap(header);
    this.dispatchEventToListeners(Events.StyleSheetRemoved, header);
  }

  getStyleSheetIdsForURL(url: Platform.DevToolsPath.UrlString): Protocol.CSS.StyleSheetId[] {
    const frameIdToStyleSheetIds = this.#styleSheetIdsForURL.get(url);
    if (!frameIdToStyleSheetIds) {
      return [];
    }

    const result = [];
    for (const styleSheetIds of frameIdToStyleSheetIds.values()) {
      result.push(...styleSheetIds);
    }
    return result;
  }

  async setStyleSheetText(styleSheetId: Protocol.CSS.StyleSheetId, newText: string, majorChange: boolean):
      Promise<string|null> {
    const header = this.#styleSheetIdToHeader.get(styleSheetId);
    if (!header) {
      return 'Unknown stylesheet in CSS.setStyleSheetText';
    }
    newText = CSSModel.trimSourceURL(newText);
    if (header.hasSourceURL) {
      newText += '\n/*# sourceURL=' + header.sourceURL + ' */';
    }

    await this.ensureOriginalStyleSheetText(styleSheetId);
    const response = await this.agent.invoke_setStyleSheetText({styleSheetId: header.id, text: newText});
    const sourceMapURL = response.sourceMapURL as Platform.DevToolsPath.UrlString;

    this.#sourceMapManager.detachSourceMap(header);
    header.setSourceMapURL(sourceMapURL);
    this.#sourceMapManager.attachSourceMap(header, header.sourceURL, header.sourceMapURL);
    if (sourceMapURL === null) {
      return 'Error in CSS.setStyleSheetText';
    }
    this.#domModel.markUndoableState(!majorChange);
    this.fireStyleSheetChanged(styleSheetId);
    return null;
  }

  async getStyleSheetText(styleSheetId: Protocol.CSS.StyleSheetId): Promise<string|null> {
    try {
      const {text} = await this.agent.invoke_getStyleSheetText({styleSheetId});
      return text && CSSModel.trimSourceURL(text);
    } catch (e) {
      return null;
    }
  }

  private async onPrimaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<{frame: ResourceTreeFrame, type: PrimaryPageChangeType}>):
      Promise<void> {
    // If the main frame was restored from the back-forward cache, the order of CDP
    // is different from the regular navigations. In this case, events about CSS
    // stylesheet has already been received and they are mixed with the previous page
    // stylesheets. Therefore, we re-enable the CSS agent to get fresh events.
    // For the regular navigations, we can just clear the local data because events about
    // stylesheets will arrive later.
    if (event.data.frame.backForwardCacheDetails.restoredFromCache) {
      await this.suspendModel();
      await this.resumeModel();
    } else if (event.data.type !== PrimaryPageChangeType.Activation) {
      this.resetStyleSheets();
      this.resetFontFaces();
    }
  }

  private resetStyleSheets(): void {
    const headers = [...this.#styleSheetIdToHeader.values()];
    this.#styleSheetIdsForURL.clear();
    this.#styleSheetIdToHeader.clear();
    for (const header of headers) {
      this.#sourceMapManager.detachSourceMap(header);
      this.dispatchEventToListeners(Events.StyleSheetRemoved, header);
    }
  }

  private resetFontFaces(): void {
    this.#fontFaces.clear();
  }

  override async suspendModel(): Promise<void> {
    this.#isEnabled = false;
    await this.agent.invoke_disable();
    this.resetStyleSheets();
    this.resetFontFaces();
  }

  override async resumeModel(): Promise<void> {
    return this.enable();
  }

  setEffectivePropertyValueForNode(nodeId: Protocol.DOM.NodeId, propertyName: string, value: string): void {
    void this.agent.invoke_setEffectivePropertyValueForNode({nodeId, propertyName, value});
  }

  cachedMatchedCascadeForNode(node: DOMNode): Promise<CSSMatchedStyles|null> {
    if (this.#cachedMatchedCascadeNode !== node) {
      this.discardCachedMatchedCascade();
    }
    this.#cachedMatchedCascadeNode = node;
    if (!this.#cachedMatchedCascadePromise) {
      if (node.id) {
        this.#cachedMatchedCascadePromise = this.getMatchedStyles(node.id);
      } else {
        return Promise.resolve(null);
      }
    }
    return this.#cachedMatchedCascadePromise;
  }

  discardCachedMatchedCascade(): void {
    this.#cachedMatchedCascadeNode = null;
    this.#cachedMatchedCascadePromise = null;
  }

  createCSSPropertyTracker(propertiesToTrack: Protocol.CSS.CSSComputedStyleProperty[]): CSSPropertyTracker {
    const cssPropertyTracker = new CSSPropertyTracker(this, propertiesToTrack);
    return cssPropertyTracker;
  }

  enableCSSPropertyTracker(cssPropertyTracker: CSSPropertyTracker): void {
    const propertiesToTrack = cssPropertyTracker.getTrackedProperties();
    if (propertiesToTrack.length === 0) {
      return;
    }
    void this.agent.invoke_trackComputedStyleUpdates({propertiesToTrack});
    this.#isCSSPropertyTrackingEnabled = true;
    this.#cssPropertyTracker = cssPropertyTracker;
    void this.pollComputedStyleUpdates();
  }

  // Since we only support one tracker at a time, this call effectively disables
  // style tracking.
  disableCSSPropertyTracker(): void {
    this.#isCSSPropertyTrackingEnabled = false;
    this.#cssPropertyTracker = null;
    // Sending an empty list to the backend signals the close of style tracking
    void this.agent.invoke_trackComputedStyleUpdates({propertiesToTrack: []});
  }

  private async pollComputedStyleUpdates(): Promise<void> {
    if (this.#isTrackingRequestPending) {
      return;
    }

    if (this.#isCSSPropertyTrackingEnabled) {
      this.#isTrackingRequestPending = true;
      const result = await this.agent.invoke_takeComputedStyleUpdates();
      this.#isTrackingRequestPending = false;

      if (result.getError() || !result.nodeIds || !this.#isCSSPropertyTrackingEnabled) {
        return;
      }

      if (this.#cssPropertyTracker) {
        this.#cssPropertyTracker.dispatchEventToListeners(
            CSSPropertyTrackerEvents.TrackedCSSPropertiesUpdated,
            result.nodeIds.map(nodeId => this.#domModel.nodeForId(nodeId)));
      }
    }

    if (this.#isCSSPropertyTrackingEnabled) {
      void this.#stylePollingThrottler.schedule(this.pollComputedStyleUpdates.bind(this));
    }
  }

  override dispose(): void {
    this.disableCSSPropertyTracker();
    super.dispose();
    this.#sourceMapManager.dispose();
  }

  getAgent(): ProtocolProxyApi.CSSApi {
    return this.agent;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FontsUpdated = 'FontsUpdated',
  MediaQueryResultChanged = 'MediaQueryResultChanged',
  ModelWasEnabled = 'ModelWasEnabled',
  PseudoStateForced = 'PseudoStateForced',
  StyleSheetAdded = 'StyleSheetAdded',
  StyleSheetChanged = 'StyleSheetChanged',
  StyleSheetRemoved = 'StyleSheetRemoved',
}

export interface StyleSheetChangedEvent {
  styleSheetId: Protocol.CSS.StyleSheetId;
  edit?: Edit;
}

export interface PseudoStateForcedEvent {
  node: DOMNode;
  pseudoClass: string;
  enable: boolean;
}

export type EventTypes = {
  [Events.FontsUpdated]: void,
  [Events.MediaQueryResultChanged]: void,
  [Events.ModelWasEnabled]: void,
  [Events.PseudoStateForced]: PseudoStateForcedEvent,
  [Events.StyleSheetAdded]: CSSStyleSheetHeader,
  [Events.StyleSheetChanged]: StyleSheetChangedEvent,
  [Events.StyleSheetRemoved]: CSSStyleSheetHeader,
};

const PseudoStateMarker = 'pseudo-state-marker';

export class Edit {
  styleSheetId: string;
  oldRange: TextUtils.TextRange.TextRange;
  newRange: TextUtils.TextRange.TextRange;
  newText: string;
  payload: Object|null;
  constructor(styleSheetId: string, oldRange: TextUtils.TextRange.TextRange, newText: string, payload: Object|null) {
    this.styleSheetId = styleSheetId;
    this.oldRange = oldRange;
    this.newRange = TextUtils.TextRange.TextRange.fromEdit(oldRange, newText);
    this.newText = newText;
    this.payload = payload;
  }
}

export class CSSLocation {
  readonly #cssModelInternal: CSSModel;
  styleSheetId: Protocol.CSS.StyleSheetId;
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber: number;
  constructor(header: CSSStyleSheetHeader, lineNumber: number, columnNumber?: number) {
    this.#cssModelInternal = header.cssModel();
    this.styleSheetId = header.id;
    this.url = header.resourceURL();
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber || 0;
  }

  cssModel(): CSSModel {
    return this.#cssModelInternal;
  }

  header(): CSSStyleSheetHeader|null {
    return this.#cssModelInternal.styleSheetHeaderForId(this.styleSheetId);
  }
}

class CSSDispatcher implements ProtocolProxyApi.CSSDispatcher {
  readonly #cssModel: CSSModel;
  constructor(cssModel: CSSModel) {
    this.#cssModel = cssModel;
  }

  mediaQueryResultChanged(): void {
    this.#cssModel.mediaQueryResultChanged();
  }

  fontsUpdated({font}: Protocol.CSS.FontsUpdatedEvent): void {
    this.#cssModel.fontsUpdated(font);
  }

  styleSheetChanged({styleSheetId}: Protocol.CSS.StyleSheetChangedEvent): void {
    this.#cssModel.fireStyleSheetChanged(styleSheetId);
  }

  styleSheetAdded({header}: Protocol.CSS.StyleSheetAddedEvent): void {
    this.#cssModel.styleSheetAdded(header);
  }

  styleSheetRemoved({styleSheetId}: Protocol.CSS.StyleSheetRemovedEvent): void {
    this.#cssModel.styleSheetRemoved(styleSheetId);
  }
}

class ComputedStyleLoader {
  #cssModel: CSSModel;
  #nodeIdToPromise: Map<number, Promise<Map<string, string>|null>>;
  constructor(cssModel: CSSModel) {
    this.#cssModel = cssModel;
    this.#nodeIdToPromise = new Map();
  }

  computedStylePromise(nodeId: Protocol.DOM.NodeId): Promise<Map<string, string>|null> {
    let promise = this.#nodeIdToPromise.get(nodeId);
    if (promise) {
      return promise;
    }
    promise = this.#cssModel.getAgent().invoke_getComputedStyleForNode({nodeId}).then(({computedStyle}) => {
      this.#nodeIdToPromise.delete(nodeId);
      if (!computedStyle || !computedStyle.length) {
        return null;
      }
      const result = new Map<string, string>();
      for (const property of computedStyle) {
        result.set(property.name, property.value);
      }
      return result;
    });
    this.#nodeIdToPromise.set(nodeId, promise);
    return promise;
  }
}

export class InlineStyleResult {
  inlineStyle: CSSStyleDeclaration|null;
  attributesStyle: CSSStyleDeclaration|null;
  constructor(inlineStyle: CSSStyleDeclaration|null, attributesStyle: CSSStyleDeclaration|null) {
    this.inlineStyle = inlineStyle;
    this.attributesStyle = attributesStyle;
  }
}

export class CSSPropertyTracker extends Common.ObjectWrapper.ObjectWrapper<CSSPropertyTrackerEventTypes> {
  readonly #cssModel: CSSModel;
  readonly #properties: Protocol.CSS.CSSComputedStyleProperty[];
  constructor(cssModel: CSSModel, propertiesToTrack: Protocol.CSS.CSSComputedStyleProperty[]) {
    super();
    this.#cssModel = cssModel;
    this.#properties = propertiesToTrack;
  }

  start(): void {
    this.#cssModel.enableCSSPropertyTracker(this);
  }

  stop(): void {
    this.#cssModel.disableCSSPropertyTracker();
  }

  getTrackedProperties(): Protocol.CSS.CSSComputedStyleProperty[] {
    return this.#properties;
  }
}

const StylePollingInterval = 1000;  // throttling interval for style polling, in milliseconds

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum CSSPropertyTrackerEvents {
  TrackedCSSPropertiesUpdated = 'TrackedCSSPropertiesUpdated',
}

export type CSSPropertyTrackerEventTypes = {
  [CSSPropertyTrackerEvents.TrackedCSSPropertiesUpdated]: (DOMNode|null)[],
};

SDKModel.register(CSSModel, {capabilities: Capability.DOM, autostart: true});
export interface ContrastInfo {
  backgroundColors: string[]|null;
  computedFontSize: string;
  computedFontWeight: string;
}
