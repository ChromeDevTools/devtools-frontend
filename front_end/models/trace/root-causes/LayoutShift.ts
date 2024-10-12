// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import type {ParsedTrace} from '../handlers/types.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import type {RootCauseProtocolInterface} from './RootCauses.js';

export type CSSDimensions = {
  width?: string,
  height?: string,
  aspectRatio?: string,
};

export interface UnsizedMedia {
  node: Protocol.DOM.Node;
  authoredDimensions?: CSSDimensions;
  computedDimensions: CSSDimensions;
}

export interface InjectedIframe {
  iframe: Protocol.DOM.Node;
}

export interface RootCauseRequest {
  request: Types.Events.SyntheticNetworkRequest;
  initiator?: Protocol.Network.Initiator;
}

export interface FontChange extends RootCauseRequest {
  fontFace: Protocol.CSS.FontFace;
}

export interface RenderBlockingRequest extends RootCauseRequest {}

export interface LayoutShiftRootCausesData {
  unsizedMedia: UnsizedMedia[];
  iframes: InjectedIframe[];
  fontChanges: FontChange[];
  renderBlockingRequests: RenderBlockingRequest[];
  scriptStackTrace: Types.Events.CallFrame[];
}

const fontRequestsByPrePaint = new Map<Types.Events.PrePaint, FontChange[]|null>();
const renderBlocksByPrePaint = new Map<Types.Events.PrePaint, RenderBlockingRequest[]|null>();

function setDefaultValue(
    map: Map<Types.Events.LayoutShift, LayoutShiftRootCausesData>, shift: Types.Events.LayoutShift): void {
  Platform.MapUtilities.getWithDefault(map, shift, () => {
    return {
      unsizedMedia: [],
      iframes: [],
      fontChanges: [],
      renderBlockingRequests: [],
      scriptStackTrace: [],
    };
  });
}

function networkRequestIsRenderBlockingInFrame(event: Types.Events.SyntheticNetworkRequest, frameId: string): boolean {
  return event.args.data.frame === frameId && Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(event);
}

interface Options {
  /** Checking iframe root causes can be an expensive operation, so it is disabled by default. */
  enableIframeRootCauses?: boolean;
}

export class LayoutShiftRootCauses {
  #protocolInterface: RootCauseProtocolInterface;
  #rootCauseCacheMap = new Map<Types.Events.LayoutShift, LayoutShiftRootCausesData>();
  #nodeDetailsCache = new Map<Protocol.DOM.NodeId, Protocol.DOM.Node|null>();
  #iframeRootCausesEnabled: boolean;

  constructor(protocolInterface: RootCauseProtocolInterface, options?: Options) {
    this.#protocolInterface = protocolInterface;
    this.#iframeRootCausesEnabled = options?.enableIframeRootCauses ?? false;
  }

  /**
   * Calculates the potential root causes for a given layout shift event. Once
   * calculated, this data is cached.
   * Note: because you need all layout shift data at once to calculate these
   * correctly, this function will parse the root causes for _all_ layout shift
   * events the first time that it's called. That then populates the cache for
   * each shift, so any subsequent calls are just a constant lookup.
   */
  async rootCausesForEvent(modelData: ParsedTrace, event: Types.Events.LayoutShift):
      Promise<Readonly<LayoutShiftRootCausesData>|null> {
    const cachedResult = this.#rootCauseCacheMap.get(event);
    if (cachedResult) {
      return cachedResult;
    }

    const allLayoutShifts = modelData.LayoutShifts.clusters.flatMap(cluster => cluster.events);
    // Make sure a value in the cache is set even for shifts that don't have a root cause,
    // so that we don't have to recompute when no root causes are found. In case a cause
    // for a shift is found, the default value is replaced.
    allLayoutShifts.forEach(shift => setDefaultValue(this.#rootCauseCacheMap, shift));

    // Populate the cache
    await this.blameShifts(
        allLayoutShifts,
        modelData,
    );

    const resultForEvent = this.#rootCauseCacheMap.get(event);
    if (!resultForEvent) {
      // No root causes available for this layout shift.
      return null;
    }
    return resultForEvent;
  }

  /**
   * Determines potential root causes for shifts
   */
  async blameShifts(
      layoutShifts: Types.Events.LayoutShift[],
      modelData: ParsedTrace,
      ): Promise<void> {
    await this.linkShiftsToLayoutInvalidations(layoutShifts, modelData);
    this.linkShiftsToLayoutEvents(layoutShifts, modelData);
  }

  /**
   * "LayoutInvalidations" are a set of trace events dispatched in Blink under the name
   * "layoutInvalidationTracking", which track invalidations on the "Layout"stage of the
   * rendering pipeline. This function utilizes this event to flag potential root causes
   * to layout shifts.
   */
  async linkShiftsToLayoutInvalidations(layoutShifts: Types.Events.LayoutShift[], modelData: ParsedTrace):
      Promise<void> {
    const {prePaintEvents, layoutInvalidationEvents, scheduleStyleInvalidationEvents, backendNodeIds} =
        modelData.LayoutShifts;

    // For the purposes of determining root causes of layout shifts, we
    // consider scheduleStyleInvalidationTracking and
    // LayoutInvalidationTracking events as events that could have been the
    // cause of the layout shift.
    const eventsForLayoutInvalidation:
        Array<Types.Events.LayoutInvalidationTracking|Types.Events.ScheduleStyleInvalidationTracking> =
            [...layoutInvalidationEvents, ...scheduleStyleInvalidationEvents];

    const nodes = await this.#protocolInterface.pushNodesByBackendIdsToFrontend(backendNodeIds);
    const nodeIdsByBackendIdMap = new Map<Protocol.DOM.BackendNodeId, Protocol.DOM.NodeId>();
    for (let i = 0; i < backendNodeIds.length; i++) {
      nodeIdsByBackendIdMap.set(backendNodeIds[i], nodes[i]);
    }

    // Maps from PrePaint events to LayoutShifts that occured in each one.
    const shiftsByPrePaint = getShiftsByPrePaintEvents(layoutShifts, prePaintEvents);
    for (const layoutInvalidation of eventsForLayoutInvalidation) {
      // Get the first PrePaint event that happened after the current LayoutInvalidation event.
      const nextPrePaintIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(
          prePaintEvents, prePaint => prePaint.ts > layoutInvalidation.ts);
      if (nextPrePaintIndex === null) {
        // No PrePaint event registered after this LayoutInvalidation. Continue.
        continue;
      }
      const nextPrePaint = prePaintEvents[nextPrePaintIndex];
      const subsequentShifts = shiftsByPrePaint.get(nextPrePaint);
      if (!subsequentShifts) {
        // The PrePaint after the current LayoutInvalidation doesn't contain shifts.
        continue;
      }
      const fontChangeRootCause = this.getFontChangeRootCause(layoutInvalidation, nextPrePaint, modelData);
      const renderBlockRootCause = this.getRenderBlockRootCause(layoutInvalidation, nextPrePaint, modelData);
      const layoutInvalidationNodeId = nodeIdsByBackendIdMap.get(layoutInvalidation.args.data.nodeId);
      let unsizedMediaRootCause: UnsizedMedia|null = null;
      let iframeRootCause: InjectedIframe|null = null;
      if (layoutInvalidationNodeId !== undefined && Types.Events.isLayoutInvalidationTracking(layoutInvalidation)) {
        unsizedMediaRootCause = await this.getUnsizedMediaRootCause(layoutInvalidation, layoutInvalidationNodeId);
        iframeRootCause = await this.getIframeRootCause(layoutInvalidation, layoutInvalidationNodeId);
      }

      if (!unsizedMediaRootCause && !iframeRootCause && !fontChangeRootCause && !renderBlockRootCause) {
        continue;
      }

      // Add found potential root causes to all the shifts in this PrePaint and populate the cache.
      for (const shift of subsequentShifts) {
        const rootCausesForShift = Platform.MapUtilities.getWithDefault(this.#rootCauseCacheMap, shift, () => {
          return {
            unsizedMedia: [],
            iframes: [],
            fontChanges: [],
            renderBlockingRequests: [],
            scriptStackTrace: [],
          };
        });
        if (unsizedMediaRootCause &&
            !rootCausesForShift.unsizedMedia.some(media => media.node.nodeId === unsizedMediaRootCause?.node.nodeId) &&
            shift.args.frame === layoutInvalidation.args.data.frame) {
          rootCausesForShift.unsizedMedia.push(unsizedMediaRootCause);
        }
        if (iframeRootCause &&
            !rootCausesForShift.iframes.some(
                injectedIframe => injectedIframe.iframe.nodeId === iframeRootCause?.iframe.nodeId)) {
          rootCausesForShift.iframes.push(iframeRootCause);
        }
        if (fontChangeRootCause) {
          // Unlike other root causes, we calculate fonts causing a shift only once,
          // which means we assign the built array instead of appending new objects
          // to it.
          rootCausesForShift.fontChanges = fontChangeRootCause;
        }
        if (renderBlockRootCause) {
          rootCausesForShift.renderBlockingRequests = renderBlockRootCause;
        }
      }
    }
  }

  /**
   * For every shift looks up the initiator of its corresponding Layout event. This initiator
   * is assigned by the RendererHandler and contains the stack trace of the point in a script
   * that caused a style recalculation or a relayout. This stack trace is added to the shift's
   * potential root causes.
   * Note that a Layout cannot always be linked to a script, in that case, we cannot add a
   * "script causing reflow" as a potential root cause to the corresponding shift.
   */
  linkShiftsToLayoutEvents(layoutShifts: Types.Events.LayoutShift[], modelData: ParsedTrace): void {
    const {prePaintEvents} = modelData.LayoutShifts;
    // Maps from PrePaint events to LayoutShifts that occured in each one.
    const shiftsByPrePaint = getShiftsByPrePaintEvents(layoutShifts, prePaintEvents);

    const eventTriggersLayout = ({name}: {name: string}): boolean => {
      const knownName = name as Types.Events.Name;
      return knownName === Types.Events.Name.LAYOUT;
    };
    const layoutEvents = modelData.Renderer.allTraceEntries.filter(eventTriggersLayout);
    for (const layout of layoutEvents) {
      // Get the first PrePaint event that happened after the current layout event.
      const nextPrePaintIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(
          prePaintEvents, prePaint => prePaint.ts > layout.ts + (layout.dur || 0));
      if (nextPrePaintIndex === null) {
        // No PrePaint event registered after this LayoutInvalidation. Continue.
        continue;
      }
      const nextPrePaint = prePaintEvents[nextPrePaintIndex];
      const subsequentShifts = shiftsByPrePaint.get(nextPrePaint);
      if (!subsequentShifts) {
        // The PrePaint after the current LayoutInvalidation doesn't contain shifts.
        continue;
      }
      const layoutNode = modelData.Renderer.entryToNode.get(layout);
      const initiator = layoutNode ? modelData.Initiators.eventToInitiator.get(layoutNode.entry) : null;
      const stackTrace = initiator?.args?.data?.stackTrace;
      if (!stackTrace) {
        continue;
      }
      // Add found potential root causes to all the shifts in this PrePaint and populate the cache.
      for (const shift of subsequentShifts) {
        const rootCausesForShift = Platform.MapUtilities.getWithDefault(this.#rootCauseCacheMap, shift, () => {
          return {
            unsizedMedia: [],
            iframes: [],
            fontChanges: [],
            renderBlockingRequests: [],
            scriptStackTrace: [],
          };
        });
        if (rootCausesForShift.scriptStackTrace.length === 0) {
          rootCausesForShift.scriptStackTrace = stackTrace;
        }
      }
    }
  }

  /**
   * Given a LayoutInvalidation trace event, determines if it was dispatched
   * because a media element without dimensions was resized.
   */
  async getUnsizedMediaRootCause(
      layoutInvalidation: Types.Events.LayoutInvalidationTracking,
      layoutInvalidationNodeId: Protocol.DOM.NodeId): Promise<UnsizedMedia|null> {
    // Filter events to resizes only.
    if (layoutInvalidation.args.data.reason !== Types.Events.LayoutInvalidationReason.SIZE_CHANGED) {
      return null;
    }

    const layoutInvalidationNode = await this.getNodeDetails(layoutInvalidationNodeId);
    if (!layoutInvalidationNode) {
      return null;
    }

    const computedStylesList = await this.#protocolInterface.getComputedStyleForNode(layoutInvalidationNode.nodeId);
    const computedStyles = new Map(computedStylesList.map(item => [item.name, item.value]));
    if (computedStyles && !(await nodeIsUnfixedMedia(layoutInvalidationNode, computedStyles))) {
      return null;
    }
    const authoredDimensions = await this.getNodeAuthoredDimensions(layoutInvalidationNode);
    if (dimensionsAreExplicit(authoredDimensions)) {
      return null;
    }
    const computedDimensions = computedStyles ? getNodeComputedDimensions(computedStyles) : {};

    return {node: layoutInvalidationNode, authoredDimensions, computedDimensions};
  }

  /**
   * Given a LayoutInvalidation trace event, determines if it was dispatched
   * because a node, which is an ancestor to an iframe, was injected.
   */
  async getIframeRootCause(
      layoutInvalidation: Types.Events.LayoutInvalidationTracking,
      layoutInvalidationNodeId: Protocol.DOM.NodeId): Promise<InjectedIframe|null> {
    if (!this.#iframeRootCausesEnabled) {
      return null;
    }

    if (!layoutInvalidation.args.data.nodeName?.startsWith('IFRAME') &&
        layoutInvalidation.args.data.reason !== Types.Events.LayoutInvalidationReason.STYLE_CHANGED &&
        layoutInvalidation.args.data.reason !== Types.Events.LayoutInvalidationReason.ADDED_TO_LAYOUT) {
      return null;
    }

    const layoutInvalidationNode = await this.getNodeDetails(layoutInvalidationNodeId);
    if (!layoutInvalidationNode) {
      return null;
    }

    const iframe = firstIframeInDOMTree(layoutInvalidationNode);
    if (!iframe) {
      return null;
    }
    return {iframe};
  }

  async getNodeDetails(nodeId: Protocol.DOM.NodeId): Promise<Protocol.DOM.Node|null> {
    let nodeDetails = this.#nodeDetailsCache.get(nodeId);
    if (nodeDetails !== undefined) {
      return nodeDetails;
    }

    nodeDetails = await this.#protocolInterface.getNode(nodeId);
    this.#nodeDetailsCache.set(nodeId, nodeDetails);

    return nodeDetails;
  }

  /**
   * Given a layout invalidation event and a sorted array, returns the subset of requests that arrived within a
   * 500ms window before the layout invalidation.
   */
  requestsInInvalidationWindow(
      layoutInvalidation: Types.Events.LayoutInvalidationTracking|Types.Events.ScheduleStyleInvalidationTracking,
      modelData: ParsedTrace): RootCauseRequest[] {
    const requestsSortedByEndTime = modelData.NetworkRequests.byTime.sort((req1, req2) => {
      const req1EndTime = req1.ts + req1.dur;
      const req2EndTime = req2.ts + req2.dur;
      return req1EndTime - req2EndTime;
    });

    const lastRequestIndex = Platform.ArrayUtilities.nearestIndexFromEnd(
        requestsSortedByEndTime, request => request.ts + request.dur < layoutInvalidation.ts);
    if (lastRequestIndex === null) {
      return [];
    }

    const MAX_DELTA_FOR_FONT_REQUEST = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(0.5));

    const requestsInInvalidationWindow: RootCauseRequest[] = [];

    // Get all requests finished within the valid window.
    for (let i = lastRequestIndex; i > -1; i--) {
      const previousRequest = requestsSortedByEndTime[i];
      const previousRequestEndTime = previousRequest.ts + previousRequest.dur;
      if (layoutInvalidation.ts - previousRequestEndTime < MAX_DELTA_FOR_FONT_REQUEST) {
        const requestInInvalidationWindow: RootCauseRequest = {request: previousRequest};

        const initiator = this.#protocolInterface.getInitiatorForRequest(
            previousRequest.args.data.url as Platform.DevToolsPath.UrlString);
        requestInInvalidationWindow.initiator = initiator || undefined;
        requestsInInvalidationWindow.push(requestInInvalidationWindow);
      } else {
        // No more requests fit in the time window.
        break;
      }
    }
    return requestsInInvalidationWindow;
  }

  /**
   * Given a LayoutInvalidation trace event, determines if it was dispatched
   * because fonts were changed and if so returns the information of all network
   * request with which the fonts were possibly fetched, if any. The computed
   * network requests are cached for the corresponding prepaint event, meaning
   * that other LayoutInvalidation events that correspond to the same prepaint
   * are not processed and the cached network requests for the prepaint is
   * returned instead.
   */
  getFontChangeRootCause(
      layoutInvalidation: Types.Events.LayoutInvalidationTracking|Types.Events.ScheduleStyleInvalidationTracking,
      nextPrePaint: Types.Events.PrePaint, modelData: ParsedTrace): FontChange[]|null {
    if (layoutInvalidation.args.data.reason !== Types.Events.LayoutInvalidationReason.FONTS_CHANGED) {
      return null;
    }
    // Prevent computing the result of this function multiple times per PrePaint event.
    const fontRequestsForPrepaint = fontRequestsByPrePaint.get(nextPrePaint);
    if (fontRequestsForPrepaint !== undefined) {
      return fontRequestsForPrepaint;
    }

    const fontRequestsInThisPrepaint =
        this.getFontRequestsInInvalidationWindow(this.requestsInInvalidationWindow(layoutInvalidation, modelData));
    fontRequestsByPrePaint.set(nextPrePaint, fontRequestsInThisPrepaint);
    return fontRequestsInThisPrepaint;
  }

  /**
   * Given the requests that arrived within a 500ms window before the layout invalidation, returns the font
   * requests of them.
   */
  getFontRequestsInInvalidationWindow(requestsInInvalidationWindow: RootCauseRequest[]): FontChange[] {
    const fontRequests: FontChange[] = [];

    // Get all requests finished within the valid window.
    for (let i = 0; i < requestsInInvalidationWindow.length; i++) {
      const fontRequest = requestsInInvalidationWindow[i] as FontChange;
      if (!fontRequest.request.args.data.mimeType.startsWith('font')) {
        continue;
      }

      const fontFace = this.#protocolInterface.fontFaceForSource(fontRequest.request.args.data.url);
      if (!fontFace || fontFace.fontDisplay === 'optional') {
        // Setting font-display to optional is part of what the developer
        // can do to avoid layout shifts due to FOIT/FOUT, as such we cannot
        // suggest any actionable insight here.
        continue;
      }
      fontRequest.fontFace = fontFace;
      fontRequests.push(fontRequest);
    }
    return fontRequests;
  }

  /**
   * Given a LayoutInvalidation trace event, determines if it arrived within a 500ms window before the layout
   * invalidation and if so returns the information of all network request, if any. The computed network
   * requests are cached for the corresponding prepaint event, meaning that other LayoutInvalidation events
   * that correspond to the same prepaint are not processed and the cached network requests for the prepaint is
   *  returned instead.
   */
  getRenderBlockRootCause(
      layoutInvalidation: Types.Events.LayoutInvalidationTracking|Types.Events.ScheduleStyleInvalidationTracking,
      nextPrePaint: Types.Events.PrePaint, modelData: ParsedTrace): RenderBlockingRequest[]|null {
    // Prevent computing the result of this function multiple times per PrePaint event.
    const renderBlocksInPrepaint = renderBlocksByPrePaint.get(nextPrePaint);
    if (renderBlocksInPrepaint !== undefined) {
      return renderBlocksInPrepaint;
    }

    const renderBlocksInThisPrepaint =
        getRenderBlockRequestsInInvalidationWindow(this.requestsInInvalidationWindow(layoutInvalidation, modelData));
    renderBlocksByPrePaint.set(nextPrePaint, renderBlocksInThisPrepaint);
    return renderBlocksInThisPrepaint;
  }

  /**
   * Returns a function that retrieves the active value of a given
   * CSS property within the matched styles of the param node.
   * The first occurence within the matched styles is returned and the
   * value is looked up in the following order, which follows CSS
   * specificity:
   * 1. Inline styles.
   * 2. CSS rules matching this node, from all applicable stylesheets.
   * 3. Attribute defined styles.
   */
  async nodeMatchedStylesPropertyGetter(node: Protocol.DOM.Node): Promise<((property: string) => string | null)> {
    const response = await this.#protocolInterface.getMatchedStylesForNode(node.nodeId);

    function cssPropertyValueGetter(cssProperty: string): string|null {
      let prop = response.inlineStyle?.cssProperties.find(prop => prop.name === cssProperty);
      if (prop) {
        return prop.value;
      }

      for (const {rule} of response.matchedCSSRules || []) {
        const prop = rule.style.cssProperties.find(prop => prop.name === cssProperty);
        if (prop) {
          return prop.value;
        }
      }

      prop = response.attributesStyle?.cssProperties.find(prop => prop.name === cssProperty);
      if (prop) {
        return prop.value;
      }

      return null;
    }
    return cssPropertyValueGetter;
  }

  /**
   * Returns the CSS dimensions set to the node from its matched styles.
   */
  async getNodeAuthoredDimensions(node: Protocol.DOM.Node): Promise<CSSDimensions> {
    const authoredDimensions: CSSDimensions = {};

    const cssMatchedRulesGetter = await this.nodeMatchedStylesPropertyGetter(node);
    if (!cssMatchedRulesGetter) {
      return authoredDimensions;
    }

    const attributesFlat = node.attributes || [];
    const attributes = [];
    for (let i = 0; i < attributesFlat.length; i += 2) {
      attributes.push({name: attributesFlat[i], value: attributesFlat[i + 1]});
    }

    const htmlHeight = attributes.find(attr => attr.name === 'height' && htmlAttributeIsExplicit(attr));
    const htmlWidth = attributes.find(attr => attr.name === 'width' && htmlAttributeIsExplicit(attr));

    const cssExplicitAspectRatio = cssMatchedRulesGetter('aspect-ratio') || undefined;

    if (htmlHeight && htmlWidth && cssExplicitAspectRatio) {
      return {height: htmlHeight.value, width: htmlWidth.value, aspectRatio: cssExplicitAspectRatio};
    }

    const cssHeight = cssMatchedRulesGetter('height') || undefined;
    const cssWidth = cssMatchedRulesGetter('width') || undefined;
    return {height: cssHeight, width: cssWidth, aspectRatio: cssExplicitAspectRatio};
  }
}

/**
 * Given the requests that arrived within a 500ms window before the layout invalidation, returns the render
 * block requests of them.
 */
function getRenderBlockRequestsInInvalidationWindow(requestsInInvalidationWindow: RootCauseRequest[]):
    RenderBlockingRequest[] {
  const renderBlockingRequests: RenderBlockingRequest[] = [];

  // Get all requests finished within the valid window.
  for (let i = 0; i < requestsInInvalidationWindow.length; i++) {
    const mainFrameId = requestsInInvalidationWindow[i].request.args.data.frame;
    if (!networkRequestIsRenderBlockingInFrame(requestsInInvalidationWindow[i].request, mainFrameId)) {
      continue;
    }
    renderBlockingRequests.push(requestsInInvalidationWindow[i] as RenderBlockingRequest);
  }
  return renderBlockingRequests;
}

function firstIframeInDOMTree(root: Protocol.DOM.Node): Protocol.DOM.Node|null {
  if (root.nodeName === 'IFRAME') {
    return root;
  }
  const children = root.children;
  if (!children) {
    return null;
  }
  for (const child of children) {
    const iFrameInChild = firstIframeInDOMTree(child);
    if (iFrameInChild) {
      return iFrameInChild;
    }
  }
  return null;
}

function cssPropertyIsExplicitlySet(propertyValue: string): boolean {
  return !['auto', 'initial', 'unset', 'inherit'].includes(propertyValue);
}

function htmlAttributeIsExplicit(attr: {value: string}): boolean {
  return parseInt(attr.value, 10) >= 0;
}

function computedStyleHasBackroundImage(computedStyle: Map<string, string>): boolean {
  const CSS_URL_REGEX = /^url\("([^"]+)"\)$/;
  const backgroundImage = computedStyle.get('background-image');
  if (!backgroundImage) {
    return false;
  }
  return CSS_URL_REGEX.test(backgroundImage);
}

function computedStyleHasFixedPosition(computedStyle: Map<string, string>): boolean {
  const position = computedStyle.get('position');
  if (!position) {
    return false;
  }
  return position === 'fixed' || position === 'absolute';
}

function getNodeComputedDimensions(computedStyle: Map<string, string>): CSSDimensions {
  const computedDimensions: CSSDimensions = {};
  computedDimensions.height = computedStyle.get('height');
  computedDimensions.width = computedStyle.get('width');
  computedDimensions.aspectRatio = computedStyle.get('aspect-ratio');
  return computedDimensions;
}

/**
 * Determines if a node is a media element and is not fixed positioned
 * (i.e. "position: fixed;" or "position: absolute;")
 */
async function nodeIsUnfixedMedia(node: Protocol.DOM.Node, computedStyle: Map<string, string>): Promise<boolean> {
  const localName = node.localName;
  const isBackgroundImage = computedStyleHasBackroundImage(computedStyle);
  if (localName !== 'img' && localName !== 'video' && !isBackgroundImage) {
    // Not a media element.
    return false;
  }
  const isFixed = computedStyleHasFixedPosition(computedStyle);
  return !isFixed;
}

/**
 * Determines if a CSS dimensions object explicitly defines both width and height
 * (i.e. not set to auto, inherit, etc.)
 */
function dimensionsAreExplicit(dimensions: CSSDimensions): boolean {
  const {height, width, aspectRatio} = dimensions;

  const explicitHeight = Boolean(height && cssPropertyIsExplicitlySet(height));
  const explicitWidth = Boolean(width && cssPropertyIsExplicitlySet(width));
  const explicitAspectRatio = Boolean(aspectRatio && cssPropertyIsExplicitlySet(aspectRatio));

  const explicitWithAR = (explicitHeight || explicitWidth) && explicitAspectRatio;
  return (explicitHeight && explicitWidth) || explicitWithAR;
}

/**
 * Given an array of layout shift and PrePaint events, returns a mapping from
 * PrePaint events to layout shifts dispatched within it.
 */
function getShiftsByPrePaintEvents(
    layoutShifts: Types.Events.LayoutShift[],
    prePaintEvents: Types.Events.PrePaint[],
    ): Map<Types.Events.PrePaint, Types.Events.LayoutShift[]> {
  // Maps from PrePaint events to LayoutShifts that occured in each one.
  const shiftsByPrePaint = new Map<Types.Events.PrePaint, Types.Events.LayoutShift[]>();

  // Associate all shifts to their corresponding PrePaint.
  for (const prePaintEvent of prePaintEvents) {
    const firstShiftIndex =
        Platform.ArrayUtilities.nearestIndexFromBeginning(layoutShifts, shift => shift.ts >= prePaintEvent.ts);
    if (firstShiftIndex === null) {
      // No layout shifts registered after this PrePaint start. Continue.
      continue;
    }
    for (let i = firstShiftIndex; i < layoutShifts.length; i++) {
      const shift = layoutShifts[i];
      if (shift.ts >= prePaintEvent.ts && shift.ts <= prePaintEvent.ts + prePaintEvent.dur) {
        const shiftsInPrePaint = Platform.MapUtilities.getWithDefault(shiftsByPrePaint, prePaintEvent, () => []);
        shiftsInPrePaint.push(shift);
      }
      if (shift.ts > prePaintEvent.ts + prePaintEvent.dur) {
        // Reached the end of this PrePaint. Continue to the next one.
        break;
      }
    }
  }
  return shiftsByPrePaint;
}
