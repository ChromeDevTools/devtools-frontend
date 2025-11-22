var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/utils/EntryNodes.js
var EntryNodes_exports = {};
__export(EntryNodes_exports, {
  domNodesForBackendIds: () => domNodesForBackendIds,
  nodeIdsForEvent: () => nodeIdsForEvent,
  relatedDOMNodesForEvent: () => relatedDOMNodesForEvent
});
import * as SDK from "./../../../core/sdk/sdk.js";
import * as Trace from "./../../../models/trace/trace.js";
var nodeIdsForEventCache = /* @__PURE__ */ new WeakMap();
var domNodesForEventCache = /* @__PURE__ */ new WeakMap();
function nodeIdsForEvent(parsedTrace, event) {
  const fromCache = nodeIdsForEventCache.get(event);
  if (fromCache) {
    return fromCache;
  }
  const foundIds = /* @__PURE__ */ new Set();
  if (Trace.Types.Events.isLayout(event)) {
    event.args.endData?.layoutRoots.forEach((root) => foundIds.add(root.nodeId));
  } else if (Trace.Types.Events.isSyntheticLayoutShift(event) && event.args.data?.impacted_nodes) {
    event.args.data.impacted_nodes.forEach((node) => foundIds.add(node.node_id));
  } else if (Trace.Types.Events.isLargestContentfulPaintCandidate(event) && typeof event.args.data?.nodeId !== "undefined") {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isPaint(event) && typeof event.args.data.nodeId !== "undefined") {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isPaintImage(event) && typeof event.args.data.nodeId !== "undefined") {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isScrollLayer(event) && typeof event.args.data.nodeId !== "undefined") {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isSyntheticAnimation(event) && typeof event.args.data.beginEvent.args.data.nodeId !== "undefined") {
    foundIds.add(event.args.data.beginEvent.args.data.nodeId);
  } else if (Trace.Types.Events.isDecodeImage(event)) {
    const paintImageEvent = parsedTrace.data.ImagePainting.paintImageForEvent.get(event);
    if (typeof paintImageEvent?.args.data.nodeId !== "undefined") {
      foundIds.add(paintImageEvent.args.data.nodeId);
    }
  } else if (Trace.Types.Events.isDrawLazyPixelRef(event) && event.args?.LazyPixelRef) {
    const paintImageEvent = parsedTrace.data.ImagePainting.paintImageByDrawLazyPixelRef.get(event.args.LazyPixelRef);
    if (typeof paintImageEvent?.args.data.nodeId !== "undefined") {
      foundIds.add(paintImageEvent.args.data.nodeId);
    }
  } else if (Trace.Types.Events.isParseMetaViewport(event) && typeof event.args?.data.node_id !== "undefined") {
    foundIds.add(event.args.data.node_id);
  }
  nodeIdsForEventCache.set(event, foundIds);
  return foundIds;
}
async function relatedDOMNodesForEvent(parsedTrace, event) {
  const fromCache = domNodesForEventCache.get(event);
  if (fromCache) {
    return fromCache;
  }
  const nodeIds = nodeIdsForEvent(parsedTrace, event);
  if (nodeIds.size) {
    const frame = event.args?.data?.frame;
    const result = await domNodesForBackendIds(frame, nodeIds);
    domNodesForEventCache.set(event, result);
    return result;
  }
  return null;
}
async function domNodesForBackendIds(frameId, nodeIds) {
  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  const resourceTreeModel = target?.model(SDK.ResourceTreeModel.ResourceTreeModel);
  if (!domModel || !resourceTreeModel) {
    return /* @__PURE__ */ new Map();
  }
  if (frameId && !resourceTreeModel.frames().some((frame) => frame.id === frameId)) {
    return /* @__PURE__ */ new Map();
  }
  return await domModel.pushNodesByBackendIdsToFrontend(nodeIds) || /* @__PURE__ */ new Map();
}

// gen/front_end/panels/timeline/utils/Helpers.js
var Helpers_exports = {};
__export(Helpers_exports, {
  RevealableInsight: () => RevealableInsight,
  createUrlLabels: () => createUrlLabels,
  formatOriginWithEntity: () => formatOriginWithEntity,
  getThrottlingRecommendations: () => getThrottlingRecommendations,
  shortenUrl: () => shortenUrl
});
import * as Platform from "./../../../core/platform/platform.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as CrUXManager from "./../../../models/crux-manager/crux-manager.js";
var MAX_ORIGIN_LENGTH = 60;
function getThrottlingRecommendations() {
  let cpuOption = SDK2.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption;
  if (cpuOption.rate() === 0) {
    cpuOption = SDK2.CPUThrottlingManager.MidTierThrottlingOption;
  }
  let networkConditions = null;
  const response = CrUXManager.CrUXManager.instance().getSelectedFieldMetricData("round_trip_time");
  if (response?.percentiles) {
    const rtt = Number(response.percentiles.p75);
    networkConditions = SDK2.NetworkManager.getRecommendedNetworkPreset(rtt);
  }
  return {
    cpuOption,
    networkConditions
  };
}
function createTrimmedUrlSearch(url) {
  const maxSearchValueLength = 8;
  let search = "";
  for (const [key, value] of url.searchParams) {
    if (search) {
      search += "&";
    }
    if (value) {
      search += `${key}=${Platform.StringUtilities.trimEndWithMaxLength(value, maxSearchValueLength)}`;
    } else {
      search += key;
    }
  }
  if (search) {
    search = "?" + search;
  }
  return search;
}
function createUrlLabels(urls) {
  const labels = [];
  const isAllHttps = urls.every((url) => url.protocol === "https:");
  for (const [index, url] of urls.entries()) {
    const previousUrl = urls[index - 1];
    const sameHostAndProtocol = previousUrl && url.host === previousUrl.host && url.protocol === previousUrl.protocol;
    let elideHost = sameHostAndProtocol;
    let elideProtocol = isAllHttps;
    if (index === 0 && isAllHttps) {
      elideHost = true;
      elideProtocol = true;
    }
    const search = createTrimmedUrlSearch(url);
    if (!elideProtocol) {
      labels.push(`${url.protocol}//${url.host}${url.pathname}${search}`);
    } else if (!elideHost) {
      labels.push(`${url.host}${url.pathname}${search}`);
    } else {
      labels.push(`${url.pathname}${search}`);
    }
  }
  return labels.map((label) => label.length > 1 && label.endsWith("/") ? label.substring(0, label.length - 1) : label);
}
function shortenUrl(url, maxChars = 20) {
  const parts = url.pathname === "/" ? [url.host] : url.pathname.split("/");
  let shortenedUrl = parts.at(-1) ?? "";
  if (shortenedUrl.length > maxChars) {
    return Platform.StringUtilities.trimMiddle(shortenedUrl, maxChars);
  }
  let i = parts.length - 1;
  while (--i >= 0) {
    if (shortenedUrl.length + parts[i].length <= maxChars) {
      shortenedUrl = `${parts[i]}/${shortenedUrl}`;
    }
  }
  return shortenedUrl;
}
function formatOriginWithEntity(url, entity, parenthesizeEntity) {
  const origin = url.origin.replace("https://", "");
  if (!entity) {
    return origin;
  }
  let originWithEntity;
  if (entity.isUnrecognized) {
    originWithEntity = `${origin}`;
  } else {
    originWithEntity = parenthesizeEntity ? `${origin} (${entity.name})` : `${origin} - ${entity.name}`;
  }
  originWithEntity = Platform.StringUtilities.trimEndWithMaxLength(originWithEntity, MAX_ORIGIN_LENGTH);
  return originWithEntity;
}
var RevealableInsight = class {
  insight;
  constructor(insight) {
    this.insight = insight;
  }
};

// gen/front_end/panels/timeline/utils/IgnoreList.js
var IgnoreList_exports = {};
__export(IgnoreList_exports, {
  getIgnoredReasonString: () => getIgnoredReasonString,
  isIgnoreListedEntry: () => isIgnoreListedEntry
});
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Trace2 from "./../../../models/trace/trace.js";
import * as SourceMapsResolver from "./../../../models/trace_source_maps_resolver/trace_source_maps_resolver.js";
import * as Workspace from "./../../../models/workspace/workspace.js";
var UIStrings = {
  /**
   * @description Refers to when skipping content scripts is enabled and the current script is ignored because it's a content script.
   */
  skipContentScripts: "Content script",
  /**
   * @description Refers to when skipping known third party scripts is enabled and the current script is ignored because it's a known third party script.
   */
  skip3rdPartyScripts: "Marked with ignoreList in source map",
  /**
   * @description Refers to when skipping anonymous scripts is enabled and the current script is ignored because is an anonymous script.
   */
  skipAnonymousScripts: "Anonymous script",
  /**
   * @description Refers to when the current script is ignored because of an unknown rule.
   */
  unknown: "Unknown"
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/utils/IgnoreList.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function getUrlAndIgnoreListOptions(entry) {
  const rawUrl = entry.callFrame.url;
  const sourceMappedData = SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(entry);
  const script = sourceMappedData?.script;
  const uiSourceCode = sourceMappedData?.devtoolsLocation?.uiSourceCode;
  const resolvedUrl = uiSourceCode?.url();
  const isKnownThirdParty = uiSourceCode?.isKnownThirdParty();
  const isContentScript = script?.isContentScript();
  const ignoreListOptions = { isContentScript, isKnownThirdParty };
  const url = resolvedUrl || rawUrl;
  return { url, ignoreListOptions };
}
function isIgnoreListedEntry(entry) {
  if (!Trace2.Types.Events.isProfileCall(entry)) {
    return false;
  }
  const { url, ignoreListOptions } = getUrlAndIgnoreListOptions(entry);
  return isIgnoreListedURL(url, ignoreListOptions);
}
function isIgnoreListedURL(url, options) {
  return Workspace.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url, options);
}
function getIgnoredReasonString(entry) {
  if (!Trace2.Types.Events.isProfileCall(entry)) {
    console.warn("Ignore list feature should only support ProfileCall.");
    return "";
  }
  const { url, ignoreListOptions } = getUrlAndIgnoreListOptions(entry);
  const ignoreListMgr = Workspace.IgnoreListManager.IgnoreListManager.instance();
  if (ignoreListOptions.isContentScript && ignoreListMgr.skipContentScripts) {
    return i18nString(UIStrings.skipContentScripts);
  }
  if (ignoreListOptions.isKnownThirdParty && ignoreListMgr.automaticallyIgnoreListKnownThirdPartyScripts) {
    return i18nString(UIStrings.skip3rdPartyScripts);
  }
  if (!url) {
    if (ignoreListMgr.skipAnonymousScripts) {
      return i18nString(UIStrings.skipAnonymousScripts);
    }
    return "";
  }
  const regex = ignoreListMgr.getFirstMatchedRegex(url);
  return regex ? regex.source : i18nString(UIStrings.unknown);
}

// gen/front_end/panels/timeline/utils/ImageCache.js
var ImageCache_exports = {};
__export(ImageCache_exports, {
  cacheForTesting: () => cacheForTesting,
  emitter: () => emitter,
  getOrQueue: () => getOrQueue,
  loadImageForTesting: () => loadImageForTesting,
  preload: () => preload
});
import * as Trace3 from "./../../../models/trace/trace.js";
var imageCache = /* @__PURE__ */ new WeakMap();
var emitter = new EventTarget();
function getOrQueue(screenshot) {
  if (imageCache.has(screenshot)) {
    return imageCache.get(screenshot) ?? null;
  }
  const uri = Trace3.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(screenshot);
  loadImage(uri).then((imageOrNull) => {
    imageCache.set(screenshot, imageOrNull);
    emitter.dispatchEvent(new CustomEvent("screenshot-loaded", { detail: { screenshot, image: imageOrNull } }));
  }).catch(() => {
  });
  return null;
}
function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => resolve(null));
    image.src = url;
  });
}
function preload(screenshots) {
  const promises = screenshots.map((screenshot) => {
    if (imageCache.has(screenshot)) {
      return;
    }
    const uri = Trace3.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(screenshot);
    return loadImage(uri).then((image) => {
      imageCache.set(screenshot, image);
      return;
    });
  });
  return Promise.all(promises);
}
var cacheForTesting = imageCache;
var loadImageForTesting = loadImage;

// gen/front_end/panels/timeline/utils/Treemap.js
var Treemap_exports = {};
__export(Treemap_exports, {
  createTreemapData: () => createTreemapData,
  makeScriptNode: () => makeScriptNode,
  openTreemap: () => openTreemap
});
import * as Common from "./../../../core/common/common.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Trace4 from "./../../../models/trace/trace.js";
async function toCompressedBase64(string) {
  const compAb = await Common.Gzip.compress(string);
  const strb64 = await Common.Base64.encode(compAb);
  return strb64;
}
async function openTabWithUrlData(data, urlString, windowName) {
  const url = new URL(urlString);
  url.hash = await toCompressedBase64(JSON.stringify(data));
  url.searchParams.set("gzip", "1");
  window.open(url.toString(), windowName);
}
function openTreemap(treemapData, mainDocumentUrl, windowNameSuffix) {
  const treemapOptions = {
    lhr: {
      mainDocumentUrl,
      audits: {
        "script-treemap-data": {
          details: {
            type: "treemap-data",
            nodes: treemapData
          }
        }
      },
      configSettings: {
        locale: i18n3.DevToolsLocale.DevToolsLocale.instance().locale
      }
    },
    initialView: "duplicate-modules"
  };
  const url = "https://googlechrome.github.io/lighthouse/treemap/";
  const windowName = `treemap-${windowNameSuffix}`;
  void openTabWithUrlData(treemapOptions, url, windowName);
}
function makeScriptNode(src, sourceRoot, sourcesData) {
  function newNode(name) {
    return {
      name,
      resourceBytes: 0,
      encodedBytes: void 0
    };
  }
  const sourceRootNode = newNode(sourceRoot);
  function addAllNodesInSourcePath(source, data) {
    let node = sourceRootNode;
    sourceRootNode.resourceBytes += data.resourceBytes;
    const sourcePathSegments = source.replace(sourceRoot, "").split(/\/+/);
    sourcePathSegments.forEach((sourcePathSegment, i) => {
      if (sourcePathSegment.length === 0) {
        return;
      }
      const isLeaf = i === sourcePathSegments.length - 1;
      let child = node.children?.find((child2) => child2.name === sourcePathSegment);
      if (!child) {
        child = newNode(sourcePathSegment);
        node.children = node.children || [];
        node.children.push(child);
      }
      node = child;
      node.resourceBytes += data.resourceBytes;
      if (isLeaf && data.duplicatedNormalizedModuleName !== void 0) {
        node.duplicatedNormalizedModuleName = data.duplicatedNormalizedModuleName;
      }
    });
  }
  for (const [source, data] of Object.entries(sourcesData)) {
    addAllNodesInSourcePath(source, data);
  }
  function collapseAll(node) {
    while (node.children?.length === 1) {
      const child = node.children[0];
      node.name += "/" + child.name;
      if (child.duplicatedNormalizedModuleName) {
        node.duplicatedNormalizedModuleName = child.duplicatedNormalizedModuleName;
      }
      node.children = child.children;
    }
    if (node.children) {
      for (const child of node.children) {
        collapseAll(child);
      }
    }
  }
  collapseAll(sourceRootNode);
  if (!sourceRootNode.name) {
    return {
      ...sourceRootNode,
      name: src,
      children: sourceRootNode.children
    };
  }
  const scriptNode = { ...sourceRootNode };
  scriptNode.name = src;
  scriptNode.children = [sourceRootNode];
  return scriptNode;
}
function getNetworkRequestSizes(request) {
  const resourceSize = request.args.data.decodedBodyLength;
  const transferSize = request.args.data.encodedDataLength;
  const headersTransferSize = 0;
  return { resourceSize, transferSize, headersTransferSize };
}
function createTreemapData(scripts, duplication) {
  const nodes = [];
  const htmlNodesByFrameId = /* @__PURE__ */ new Map();
  for (const script of scripts.scripts) {
    if (!script.url) {
      continue;
    }
    const name = script.url;
    const sizes = Trace4.Handlers.ModelHandlers.Scripts.getScriptGeneratedSizes(script);
    let node;
    if (script.sourceMap && sizes && !("errorMessage" in sizes)) {
      const sourcesData = {};
      for (const [source, resourceBytes] of Object.entries(sizes.files)) {
        const sourceData = {
          resourceBytes,
          encodedBytes: void 0
        };
        const key = Trace4.Extras.ScriptDuplication.normalizeSource(source);
        if (duplication.has(key)) {
          sourceData.duplicatedNormalizedModuleName = key;
        }
        sourcesData[source] = sourceData;
      }
      if (sizes.unmappedBytes) {
        const sourceData = {
          resourceBytes: sizes.unmappedBytes
        };
        sourcesData["(unmapped)"] = sourceData;
      }
      node = makeScriptNode(script.url, script.url, sourcesData);
    } else {
      node = {
        name,
        resourceBytes: script.content?.length ?? 0,
        encodedBytes: void 0
      };
    }
    if (script.inline) {
      let htmlNode = htmlNodesByFrameId.get(script.frame);
      if (!htmlNode) {
        htmlNode = {
          name,
          resourceBytes: 0,
          encodedBytes: void 0,
          children: []
        };
        htmlNodesByFrameId.set(script.frame, htmlNode);
        nodes.push(htmlNode);
      }
      htmlNode.resourceBytes += node.resourceBytes;
      node.name = script.content ? "(inline) " + script.content.trimStart().substring(0, 15) + "\u2026" : "(inline)";
      htmlNode.children?.push(node);
    } else {
      nodes.push(node);
      if (script.request) {
        const { transferSize, headersTransferSize } = getNetworkRequestSizes(script.request);
        const bodyTransferSize = transferSize - headersTransferSize;
        node.encodedBytes = bodyTransferSize;
      } else {
        node.encodedBytes = node.resourceBytes;
      }
    }
  }
  for (const [frameId, node] of htmlNodesByFrameId) {
    const script = scripts.scripts.find((s) => s.request?.args.data.resourceType === "Document" && s.request?.args.data.frame === frameId);
    if (script?.request) {
      const { resourceSize, transferSize, headersTransferSize } = getNetworkRequestSizes(script.request);
      const inlineScriptsPct = node.resourceBytes / resourceSize;
      const bodyTransferSize = transferSize - headersTransferSize;
      node.encodedBytes = Math.floor(bodyTransferSize * inlineScriptsPct);
    } else {
      node.encodedBytes = node.resourceBytes;
    }
  }
  return nodes;
}
export {
  EntryNodes_exports as EntryNodes,
  Helpers_exports as Helpers,
  IgnoreList_exports as IgnoreList,
  ImageCache_exports as ImageCache,
  Treemap_exports as Treemap
};
//# sourceMappingURL=utils.js.map
