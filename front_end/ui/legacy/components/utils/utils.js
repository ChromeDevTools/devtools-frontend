var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/utils/ImagePreview.js
var ImagePreview_exports = {};
__export(ImagePreview_exports, {
  ImagePreview: () => ImagePreview,
  loadPrecomputedFeatures: () => loadPrecomputedFeatures
});
import * as Common from "./../../../../core/common/common.js";
import * as Host from "./../../../../core/host/host.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import * as SDK from "./../../../../core/sdk/sdk.js";

// gen/front_end/ui/legacy/components/utils/imagePreview.css.js
var imagePreview_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.image-preview-container {
  background: transparent;
  text-align: center;
  border-spacing: 0;
}

.image-preview-container img {
  margin: 6px 0;
  width: auto;
  max-height: 100px;
  background-image: var(--image-file-checker);
  user-select: text;
  vertical-align: top;
  -webkit-user-drag: auto;
}

.image-container {
  padding: 0;
}

.image-container > div {
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.image-container > div.start {
  justify-content: start;
}

.image-preview-container .row {
  line-height: 1.2;
  vertical-align: baseline;
}

.image-preview-container .title {
  padding-right: 0.5em;
  color: var(--sys-color-token-subtle);
  white-space: nowrap;

  &.start {
    text-align: start;
  }

  &.center {
    text-align: end;
  }
}

.image-preview-container .description {
  white-space: nowrap;
  text-align: left;
  color: var(--sys-color-on-surface);
}

.image-preview-container .description-link {
  max-width: 20em;
}

.image-preview-container .source-link {
  white-space: normal;
  word-break: break-all;
  color: var(--sys-color-primary);
  cursor: pointer;
}

/*# sourceURL=${import.meta.resolve("./imagePreview.css")} */`;

// gen/front_end/ui/legacy/components/utils/ImagePreview.js
var UIStrings = {
  /**
   * @description Alt text description of an image's source
   */
  unknownSource: "unknown source",
  /**
   * @description Text to indicate the source of an image
   * @example {example.com} PH1
   */
  imageFromS: "Image from {PH1}",
  /**
   * @description Title of the row that shows the file size of an image.
   */
  fileSize: "File size:",
  /**
   * @description Title of the row that shows the intrinsic size of an image in pixels.
   */
  intrinsicSize: "Intrinsic size:",
  /**
   * @description Title of the row that shows the rendered size of an image in pixels.
   */
  renderedSize: "Rendered size:",
  /**
   * @description Title of the row that shows the current URL of an image.
   * https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-currentsrc.
   */
  currentSource: "Current source:",
  /**
   * @description The rendered aspect ratio of an image.
   */
  renderedAspectRatio: "Rendered aspect ratio:",
  /**
   * @description The intrinsic aspect ratio of an image.
   */
  intrinsicAspectRatio: "Intrinsic aspect ratio:"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/utils/ImagePreview.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function isImageResource(resource) {
  return resource !== null && resource.resourceType() === Common.ResourceType.resourceTypes.Image;
}
var ImagePreview = class {
  static async build(originalImageURL, showDimensions, options = {
    align: "center"
    /* Align.CENTER */
  }) {
    const { precomputedFeatures, imageAltText, align } = options;
    let resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(originalImageURL);
    let imageURL = originalImageURL;
    if (!isImageResource(resource) && precomputedFeatures?.currentSrc) {
      imageURL = precomputedFeatures.currentSrc;
      resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(imageURL);
    }
    if (!resource || !isImageResource(resource)) {
      return null;
    }
    const imageResource = resource;
    const displayName = resource.displayName;
    const content = resource.content ? resource.content : resource.url.split("base64,")[1];
    const contentSize = resource.contentSize();
    const resourceSize = contentSize ? contentSize : Platform.StringUtilities.base64ToSize(content);
    const resourceSizeText = resourceSize > 0 ? i18n.ByteUtilities.bytesToString(resourceSize) : "";
    return await new Promise((resolve) => {
      const imageElement = document.createElement("img");
      imageElement.addEventListener("load", buildContent, false);
      imageElement.addEventListener("error", () => resolve(null), false);
      if (imageAltText) {
        imageElement.alt = imageAltText;
      }
      void imageResource.populateImageSource(imageElement);
      function buildContent() {
        const shadowBoundary = document.createElement("div");
        const shadowRoot = shadowBoundary.attachShadow({ mode: "open" });
        shadowRoot.createChild("style").textContent = imagePreview_css_default;
        const container = shadowRoot.createChild("table");
        container.className = "image-preview-container";
        const imageRow = container.createChild("tr").createChild("td", "image-container");
        imageRow.colSpan = 2;
        const link3 = imageRow.createChild("div", ` ${align}`);
        link3.title = displayName;
        link3.appendChild(imageElement);
        link3.addEventListener("click", () => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(imageURL);
        });
        const intrinsicWidth = imageElement.naturalWidth;
        const intrinsicHeight = imageElement.naturalHeight;
        const renderedWidth = precomputedFeatures ? precomputedFeatures.renderedWidth : intrinsicWidth;
        const renderedHeight = precomputedFeatures ? precomputedFeatures.renderedHeight : intrinsicHeight;
        if (showDimensions) {
          const renderedRow = container.createChild("tr", "row");
          renderedRow.createChild("td", `title ${align}`).textContent = i18nString(UIStrings.renderedSize);
          renderedRow.createChild("td", "description").textContent = `${renderedWidth} \xD7 ${renderedHeight} px`;
          const aspectRatioRow = container.createChild("tr", "row");
          aspectRatioRow.createChild("td", `title ${align}`).textContent = i18nString(UIStrings.renderedAspectRatio);
          aspectRatioRow.createChild("td", "description").textContent = Platform.NumberUtilities.aspectRatio(renderedWidth, renderedHeight);
          if (renderedHeight !== intrinsicHeight || renderedWidth !== intrinsicWidth) {
            const intrinsicRow = container.createChild("tr", "row");
            intrinsicRow.createChild("td", `title ${align}`).textContent = i18nString(UIStrings.intrinsicSize);
            intrinsicRow.createChild("td", "description").textContent = `${intrinsicWidth} \xD7 ${intrinsicHeight} px`;
            const intrinsicAspectRatioRow = container.createChild("tr", "row");
            intrinsicAspectRatioRow.createChild("td", `title ${align}`).textContent = i18nString(UIStrings.intrinsicAspectRatio);
            intrinsicAspectRatioRow.createChild("td", "description").textContent = Platform.NumberUtilities.aspectRatio(intrinsicWidth, intrinsicHeight);
          }
        }
        if (!options.hideFileData) {
          const fileRow = container.createChild("tr", "row");
          fileRow.createChild("td", `title ${align}`).textContent = i18nString(UIStrings.fileSize);
          fileRow.createChild("td", "description").textContent = resourceSizeText;
          const originalRow = container.createChild("tr", "row");
          originalRow.createChild("td", `title ${align}`).textContent = i18nString(UIStrings.currentSource);
          const sourceText = Platform.StringUtilities.trimMiddle(imageURL, 100);
          const sourceLink = originalRow.createChild("td", "description description-link").createChild("span", "source-link");
          sourceLink.textContent = sourceText;
          sourceLink.addEventListener("click", () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(imageURL);
          });
        }
        resolve(shadowBoundary);
      }
    });
  }
  static defaultAltTextForImageURL(url) {
    const parsedImageURL = new Common.ParsedURL.ParsedURL(url);
    const imageSourceText = parsedImageURL.isValid ? parsedImageURL.displayName : i18nString(UIStrings.unknownSource);
    return i18nString(UIStrings.imageFromS, { PH1: imageSourceText });
  }
};
async function loadPrecomputedFeatures(node) {
  if (!node) {
    return void 0;
  }
  if (!node.nodeName() || node.nodeName().toLowerCase() !== "img") {
    return void 0;
  }
  const object = await node.resolveToObject("");
  if (!object) {
    return void 0;
  }
  const featuresObject = await object.callFunctionJSON(features, void 0);
  object.release();
  return featuresObject ?? void 0;
  function features() {
    return {
      renderedWidth: this.width,
      renderedHeight: this.height,
      currentSrc: this.currentSrc
    };
  }
}

// gen/front_end/ui/legacy/components/utils/JSPresentationUtils.js
var JSPresentationUtils_exports = {};
__export(JSPresentationUtils_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  StackTracePreviewContent: () => StackTracePreviewContent
});
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Root from "./../../../../core/root/root.js";
import * as SDK3 from "./../../../../core/sdk/sdk.js";
import * as StackTrace from "./../../../../models/stack_trace/stack_trace.js";
import * as Workspace3 from "./../../../../models/workspace/workspace.js";
import { Directives as Directives2, html as html2, nothing, render as render2 } from "./../../../lit/lit.js";
import * as VisualLogging2 from "./../../../visual_logging/visual_logging.js";
import * as UI2 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/utils/jsUtils.css.js
var jsUtils_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.stack-preview-async-description {
  padding: 3px 0 1px;
  font-weight: bold;
}

.stack-preview-container {
  --display-ignored-row: none;
  --display-toggle-link: var(--override-display-stack-preview-toggle-link, none);

  align-self: flex-start;
  user-select: text;

  & > tfoot > tr {
    font-style: italic;
    display: var(--display-toggle-link);
  }

  & > tbody {
    display: var(--override-display-stack-preview-tbody, table-row-group);

    & > tr {
      height: 16px;
      line-height: 16px;

      &:has(td.link > .ignore-list-link) {
        opacity: 60%;
        display: var(--display-ignored-row);
      }
    }

    &:has(tr > td.link > .ignore-list-link) {
      &:not(:has(tr > td.link > .devtools-link:not(.ignore-list-link))) {
        .stack-preview-async-row {
          /* An async row is hidden if the following group of call frames are all hidden */
          display: var(--display-ignored-row);
        }
      }
    }
  }

  &:not(:has(tbody > tr > td.link > .devtools-link:not(.ignore-list-link))),
  &.show-hidden-rows {
    /* Display ignore listed rows if everything is ignore listed or if displaying expanded. */
    --display-ignored-row: table-row;
  }

  &:has(tbody > tr > td.link > .ignore-list-link):has(tbody > tr > td.link > .devtools-link:not(.ignore-list-link)) {
    /* Show toggle links if some rows are ignore listed but not all of them. */
    --display-toggle-link: table-row;
  }

  td {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-inline: 2px;

    &.link {
      overflow: visible;

      & > button.text-button.devtools-link {
        background-color: inherit;
      }
    }
  }

  &.width-constrained {
    display: block;
    width: 100%;

    td.link {
      /* width: 100%; and max-width: 0; combination causes the link cell to be
      extended as much as possible while still staying inside the table */
      width: 100%;
      max-width: 0;
    }
  }

  .function-name {
    max-width: 80em;
  }

  &.show-hidden-rows > tfoot > tr.show-all-link {
    --display-toggle-link: none;
  }

  &:not(.show-hidden-rows) > tfoot > tr.show-less-link {
    --display-toggle-link: none;
  }

  .arrow-icon-button {
    cursor: pointer;
    padding: 1px 0;
    border: none;
    background: none;
    margin-left: -4px;
    margin-right: -2px;
  }

  .arrow-icon {
    display: inline-block;
    mask-image: var(--image-file-triangle-right);
    background-color: var(--icon-default);
    margin-top: 2px;
    height: 14px;
    width: 14px;
    transition: transform 200ms;
  }

  &.expanded .arrow-icon{
    transform: rotate(90deg);
  }

  &.expandable:not(.expanded) tbody:not(:first-of-type),
  &.expandable:not(.expanded) tbody tr:not(:first-of-type) {
    display: none;
  }
}

/* The show more/less links aren't really a part of the content
as they are equivalent to an expander triangle and not something
you would want to copy to the clipboard. Attributes are used to
insert their text through css rather than put the text in the DOM. */
.css-inserted-text::before {
  content: attr(data-inserted-text);
}

/*# sourceURL=${import.meta.resolve("./jsUtils.css")} */`;

// gen/front_end/ui/legacy/components/utils/Linkifier.js
var Linkifier_exports = {};
__export(Linkifier_exports, {
  ContentProviderContextMenuProvider: () => ContentProviderContextMenuProvider,
  LinkContextMenuProvider: () => LinkContextMenuProvider,
  LinkHandlerSettingUI: () => LinkHandlerSettingUI,
  Linkifier: () => Linkifier,
  ScriptLocationLink: () => ScriptLocationLink
});
import * as Common2 from "./../../../../core/common/common.js";
import * as Host2 from "./../../../../core/host/host.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as Bindings from "./../../../../models/bindings/bindings.js";
import * as Breakpoints from "./../../../../models/breakpoints/breakpoints.js";
import * as TextUtils from "./../../../../models/text_utils/text_utils.js";
import * as Workspace from "./../../../../models/workspace/workspace.js";
import * as UIHelpers from "./../../../helpers/helpers.js";
import { Directives, html, render } from "./../../../lit/lit.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy.js";
var { ref, ifDefined, classMap } = Directives;
var UIStrings2 = {
  /**
   * @description Text in Linkifier
   */
  unknown: "(unknown)",
  /**
   * @description Text short for automatic
   */
  auto: "auto",
  /**
   * @description Text in Linkifier
   * @example {Sources panel} PH1
   */
  revealInS: "Reveal in {PH1}",
  /**
   * @description Text for revealing an item in its destination
   */
  reveal: "Reveal",
  /**
   * @description A context menu item in the Linkifier
   * @example {Extension} PH1
   */
  openUsingS: "Open using {PH1}",
  /**
   * @description The name of a setting which controls how links are handled in the UI. 'Handling'
   * refers to the ability of extensions to DevTools to be able to intercept link clicks so that they
   * can react to them.
   */
  linkHandling: "Link handling:"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/utils/Linkifier.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var instances = /* @__PURE__ */ new Set();
var decorator = null;
var anchorsByUISourceCode = /* @__PURE__ */ new WeakMap();
var infoByAnchor = /* @__PURE__ */ new WeakMap();
var textByAnchor = /* @__PURE__ */ new WeakMap();
var linkHandlers = /* @__PURE__ */ new Map();
var linkHandlerSettingInstance;
var Linkifier = class _Linkifier extends Common2.ObjectWrapper.ObjectWrapper {
  maxLength;
  anchorsByTarget = /* @__PURE__ */ new Map();
  locationPoolByTarget = /* @__PURE__ */ new Map();
  useLinkDecorator;
  #anchorUpdaters;
  constructor(maxLengthForDisplayedURLs, useLinkDecorator) {
    super();
    this.maxLength = maxLengthForDisplayedURLs || UI.UIUtils.MaxLengthForDisplayedURLs;
    this.useLinkDecorator = Boolean(useLinkDecorator);
    this.#anchorUpdaters = /* @__PURE__ */ new WeakMap();
    instances.add(this);
    SDK2.TargetManager.TargetManager.instance().observeTargets(this);
    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.WorkingCopyChanged, this.#onWorkingCopyChangedOrCommitted, this);
    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, this.#onWorkingCopyChangedOrCommitted, this);
  }
  #onWorkingCopyChangedOrCommitted({ data: { uiSourceCode } }) {
    const anchors = anchorsByUISourceCode.get(uiSourceCode);
    if (!anchors) {
      return;
    }
    for (const anchor of anchors) {
      const updater = this.#anchorUpdaters.get(anchor);
      if (!updater) {
        continue;
      }
      updater.call(this, anchor);
    }
  }
  static setLinkDecorator(linkDecorator) {
    console.assert(!decorator, "Cannot re-register link decorator.");
    decorator = linkDecorator;
    linkDecorator.addEventListener("LinkIconChanged", onLinkIconChanged);
    for (const linkifier of instances) {
      linkifier.updateAllAnchorDecorations();
    }
    function onLinkIconChanged(event) {
      const uiSourceCode = event.data;
      const links = anchorsByUISourceCode.get(uiSourceCode) || [];
      for (const link3 of links) {
        _Linkifier.updateLinkDecorations(link3);
      }
    }
  }
  updateAllAnchorDecorations() {
    for (const anchors of this.anchorsByTarget.values()) {
      for (const anchor of anchors) {
        _Linkifier.updateLinkDecorations(anchor);
      }
    }
  }
  static bindUILocation(anchor, uiLocation) {
    const linkInfo = _Linkifier.linkInfo(anchor);
    if (!linkInfo) {
      return;
    }
    linkInfo.uiLocation = uiLocation;
    if (!uiLocation) {
      return;
    }
    const uiSourceCode = uiLocation.uiSourceCode;
    let sourceCodeAnchors = anchorsByUISourceCode.get(uiSourceCode);
    if (!sourceCodeAnchors) {
      sourceCodeAnchors = /* @__PURE__ */ new Set();
      anchorsByUISourceCode.set(uiSourceCode, sourceCodeAnchors);
    }
    sourceCodeAnchors.add(anchor);
  }
  static bindUILocationForTest(anchor, uiLocation) {
    _Linkifier.bindUILocation(anchor, uiLocation);
  }
  static unbindUILocation(anchor) {
    const info = _Linkifier.linkInfo(anchor);
    if (!info?.uiLocation) {
      return;
    }
    const uiSourceCode = info.uiLocation.uiSourceCode;
    info.uiLocation = null;
    const sourceCodeAnchors = anchorsByUISourceCode.get(uiSourceCode);
    if (sourceCodeAnchors) {
      sourceCodeAnchors.delete(anchor);
    }
  }
  /**
   * When we link to a breakpoint condition, we need to stash the BreakpointLocation as the revealable
   * in the LinkInfo.
   */
  static bindBreakpoint(anchor, uiLocation) {
    const info = _Linkifier.linkInfo(anchor);
    if (!info) {
      return;
    }
    const breakpoint = Breakpoints.BreakpointManager.BreakpointManager.instance().findBreakpoint(uiLocation);
    if (breakpoint) {
      info.revealable = breakpoint;
    }
  }
  /**
   * When we link to a breakpoint condition, we store the BreakpointLocation in the revealable.
   * Clear it when the LiveLocation updates.
   */
  static unbindBreakpoint(anchor) {
    const info = _Linkifier.linkInfo(anchor);
    if (info?.revealable) {
      info.revealable = null;
    }
  }
  targetAdded(target) {
    this.anchorsByTarget.set(target, []);
    this.locationPoolByTarget.set(target, new Bindings.LiveLocation.LiveLocationPool());
  }
  targetRemoved(target) {
    const locationPool = this.locationPoolByTarget.get(target);
    this.locationPoolByTarget.delete(target);
    if (!locationPool) {
      return;
    }
    locationPool.disposeAll();
    const anchors = this.anchorsByTarget.get(target);
    if (!anchors) {
      return;
    }
    this.anchorsByTarget.delete(target);
    for (const anchor of anchors) {
      const info = _Linkifier.linkInfo(anchor);
      if (!info) {
        continue;
      }
      info.liveLocation = null;
      _Linkifier.unbindUILocation(anchor);
      const fallback = info.fallback;
      if (fallback) {
        anchor.replaceWith(fallback);
      }
    }
  }
  maybeLinkifyScriptLocation(target, scriptId, sourceURL, lineNumber, options) {
    let fallbackAnchor = null;
    const linkifyURLOptions = {
      lineNumber,
      maxLength: options?.maxLength ?? this.maxLength,
      columnNumber: options?.columnNumber,
      showColumnNumber: Boolean(options?.showColumnNumber),
      className: options?.className,
      tabStop: options?.tabStop,
      inlineFrameIndex: options?.inlineFrameIndex ?? 0,
      userMetric: options?.userMetric,
      jslogContext: options?.jslogContext || "script-location",
      omitOrigin: options?.omitOrigin
    };
    const { columnNumber, className = "" } = linkifyURLOptions;
    if (sourceURL) {
      fallbackAnchor = _Linkifier.linkifyURL(sourceURL, linkifyURLOptions);
    }
    if (!target || target.isDisposed()) {
      return fallbackAnchor;
    }
    const debuggerModel = target.model(SDK2.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return fallbackAnchor;
    }
    const rawLocation = scriptId ? debuggerModel.createRawLocationByScriptId(scriptId, lineNumber || 0, columnNumber, linkifyURLOptions.inlineFrameIndex) : debuggerModel.createRawLocationByURL(sourceURL, lineNumber || 0, columnNumber, linkifyURLOptions.inlineFrameIndex);
    if (!rawLocation) {
      return fallbackAnchor;
    }
    const createLinkOptions = {
      tabStop: options?.tabStop,
      jslogContext: "script-location"
    };
    const { link: link3, linkInfo } = _Linkifier.createLink(fallbackAnchor?.textContent ? fallbackAnchor.textContent : "", className, createLinkOptions);
    linkInfo.enableDecorator = this.useLinkDecorator;
    linkInfo.fallback = fallbackAnchor;
    linkInfo.userMetric = options?.userMetric;
    const pool = this.locationPoolByTarget.get(rawLocation.debuggerModel.target());
    if (!pool) {
      return fallbackAnchor;
    }
    const linkDisplayOptions = {
      showColumnNumber: linkifyURLOptions.showColumnNumber ?? false,
      maxLength: linkifyURLOptions.maxLength,
      revealBreakpoint: options?.revealBreakpoint
    };
    const updateDelegate = async (liveLocation) => {
      await this.updateAnchor(link3, linkDisplayOptions, liveLocation);
      this.dispatchEventToListeners("liveLocationUpdated", liveLocation);
    };
    void Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createLiveLocation(rawLocation, updateDelegate.bind(this), pool).then((liveLocation) => {
      if (liveLocation) {
        linkInfo.liveLocation = liveLocation;
      }
    });
    const anchors = this.anchorsByTarget.get(rawLocation.debuggerModel.target());
    anchors.push(link3);
    return link3;
  }
  linkifyScriptLocation(target, scriptId, sourceURL, lineNumber, options) {
    const scriptLink = this.maybeLinkifyScriptLocation(target, scriptId, sourceURL, lineNumber, options);
    const linkifyURLOptions = {
      lineNumber,
      maxLength: this.maxLength,
      className: options?.className,
      columnNumber: options?.columnNumber,
      showColumnNumber: Boolean(options?.showColumnNumber),
      inlineFrameIndex: options?.inlineFrameIndex ?? 0,
      tabStop: options?.tabStop,
      userMetric: options?.userMetric,
      jslogContext: options?.jslogContext || "script-source-url"
    };
    return scriptLink || _Linkifier.linkifyURL(sourceURL, linkifyURLOptions);
  }
  linkifyRawLocation(rawLocation, fallbackUrl, className, options) {
    return this.linkifyScriptLocation(rawLocation.debuggerModel.target(), rawLocation.scriptId, fallbackUrl, rawLocation.lineNumber, {
      columnNumber: rawLocation.columnNumber,
      className,
      inlineFrameIndex: rawLocation.inlineFrameIndex,
      tabStop: options?.tabStop
    });
  }
  maybeLinkifyConsoleCallFrame(target, callFrame, options) {
    const linkifyOptions = {
      ...options,
      columnNumber: callFrame.columnNumber,
      inlineFrameIndex: options?.inlineFrameIndex ?? 0
    };
    return this.maybeLinkifyScriptLocation(target, String(callFrame.scriptId), callFrame.url, callFrame.lineNumber, linkifyOptions);
  }
  static linkifyStackTraceFrame(frame, options) {
    const linkifyURLOptions = {
      ...options,
      lineNumber: frame.line,
      columnNumber: frame.column,
      showColumnNumber: Boolean(options?.showColumnNumber),
      className: options?.className,
      tabStop: options?.tabStop,
      inlineFrameIndex: options?.inlineFrameIndex ?? 0,
      userMetric: options?.userMetric,
      jslogContext: options?.jslogContext || "script-location",
      omitOrigin: options?.omitOrigin
    };
    const { className = "" } = linkifyURLOptions;
    const fallbackAnchor = _Linkifier.linkifyURL(frame.url, linkifyURLOptions);
    if (!frame.uiSourceCode) {
      const isIgnoreListed = (options?.ignoreListManager ?? Workspace.IgnoreListManager.IgnoreListManager.instance()).isUserIgnoreListedURL(frame.url);
      fallbackAnchor.classList.toggle("ignore-list-link", isIgnoreListed);
      return fallbackAnchor;
    }
    const createLinkOptions = {
      tabStop: options?.tabStop,
      jslogContext: "script-location"
    };
    const { link: link3, linkInfo } = _Linkifier.createLink(fallbackAnchor?.textContent ? fallbackAnchor.textContent : "", className, createLinkOptions);
    linkInfo.fallback = fallbackAnchor;
    linkInfo.userMetric = options?.userMetric;
    const linkDisplayOptions = {
      showColumnNumber: linkifyURLOptions.showColumnNumber ?? false,
      maxLength: linkifyURLOptions.maxLength ?? UI.UIUtils.MaxLengthForDisplayedURLs,
      revealBreakpoint: options?.revealBreakpoint
    };
    const uiLocation = frame.uiSourceCode.uiLocation(frame.line, frame.column) ?? null;
    _Linkifier.updateAnchorFromUILocation(link3, linkDisplayOptions, uiLocation, options?.ignoreListManager);
    return link3;
  }
  linkifyStackTraceTopFrame(target, stackTrace) {
    console.assert(stackTrace.callFrames.length > 0);
    const { url, lineNumber, columnNumber } = stackTrace.callFrames[0];
    const fallbackAnchor = _Linkifier.linkifyURL(url, {
      lineNumber,
      columnNumber,
      showColumnNumber: false,
      inlineFrameIndex: 0,
      maxLength: this.maxLength,
      preventClick: true,
      jslogContext: "script-source-url"
    });
    if (!target) {
      return fallbackAnchor;
    }
    const pool = this.locationPoolByTarget.get(target);
    if (!pool || target.isDisposed()) {
      return fallbackAnchor;
    }
    const debuggerModel = target.model(SDK2.DebuggerModel.DebuggerModel);
    const { link: link3, linkInfo } = _Linkifier.createLink("", "", { jslogContext: "script-location" });
    linkInfo.enableDecorator = this.useLinkDecorator;
    linkInfo.fallback = fallbackAnchor;
    const linkDisplayOptions = { showColumnNumber: false, maxLength: this.maxLength };
    const updateDelegate = async (liveLocation) => {
      await this.updateAnchor(link3, linkDisplayOptions, liveLocation);
      this.dispatchEventToListeners("liveLocationUpdated", liveLocation);
    };
    void Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceTopFrameLiveLocation(debuggerModel.createRawLocationsByStackTrace(stackTrace), updateDelegate.bind(this), pool).then((liveLocation) => {
      linkInfo.liveLocation = liveLocation;
    });
    const anchors = this.anchorsByTarget.get(target);
    anchors.push(link3);
    return link3;
  }
  linkifyCSSLocation(rawLocation, classes) {
    const createLinkOptions = {
      tabStop: true,
      jslogContext: "css-location"
    };
    const { link: link3, linkInfo } = _Linkifier.createLink("", classes || "", createLinkOptions);
    linkInfo.enableDecorator = this.useLinkDecorator;
    const pool = this.locationPoolByTarget.get(rawLocation.cssModel().target());
    if (!pool) {
      return link3;
    }
    const linkDisplayOptions = { showColumnNumber: false, maxLength: this.maxLength };
    const updateDelegate = async (liveLocation) => {
      await this.updateAnchor(link3, linkDisplayOptions, liveLocation);
      this.dispatchEventToListeners("liveLocationUpdated", liveLocation);
    };
    void Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().createLiveLocation(rawLocation, updateDelegate.bind(this), pool).then((liveLocation) => {
      linkInfo.liveLocation = liveLocation;
    });
    const anchors = this.anchorsByTarget.get(rawLocation.cssModel().target());
    anchors.push(link3);
    return link3;
  }
  reset() {
    for (const target of [...this.anchorsByTarget.keys()]) {
      this.targetRemoved(target);
      this.targetAdded(target);
    }
    this.listeners?.clear();
  }
  dispose() {
    Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.WorkingCopyChanged, this.#onWorkingCopyChangedOrCommitted, this);
    Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, this.#onWorkingCopyChangedOrCommitted, this);
    for (const target of [...this.anchorsByTarget.keys()]) {
      this.targetRemoved(target);
    }
    SDK2.TargetManager.TargetManager.instance().unobserveTargets(this);
    instances.delete(this);
  }
  async updateAnchor(anchor, options, liveLocation) {
    _Linkifier.unbindUILocation(anchor);
    if (options.revealBreakpoint) {
      _Linkifier.unbindBreakpoint(anchor);
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      anchor.classList.add("invalid-link");
      anchor.removeAttribute("role");
      return;
    }
    this.#anchorUpdaters.set(anchor, function(anchor2) {
      void this.updateAnchor(anchor2, options, liveLocation);
    });
    _Linkifier.updateAnchorFromUILocation(anchor, options, uiLocation);
  }
  static updateAnchorFromUILocation(anchor, options, uiLocation, ignoreListManager) {
    if (!uiLocation) {
      anchor.classList.add("invalid-link");
      anchor.removeAttribute("role");
      return;
    }
    _Linkifier.bindUILocation(anchor, uiLocation);
    if (options.revealBreakpoint) {
      _Linkifier.bindBreakpoint(anchor, uiLocation);
    }
    const text = uiLocation.linkText(true, options.showColumnNumber);
    _Linkifier.setTrimmedText(anchor, text, options.maxLength);
    let titleText = uiLocation.uiSourceCode.url();
    if (uiLocation.uiSourceCode.mimeType() === "application/wasm") {
      if (typeof uiLocation.columnNumber === "number") {
        titleText += `:0x${uiLocation.columnNumber.toString(16)}`;
      }
    } else {
      titleText += ":" + (uiLocation.lineNumber + 1);
      if (options.showColumnNumber && typeof uiLocation.columnNumber === "number") {
        titleText += ":" + (uiLocation.columnNumber + 1);
      }
    }
    UI.Tooltip.Tooltip.install(anchor, titleText);
    const isIgnoreListed = Boolean(uiLocation?.isIgnoreListed(ignoreListManager));
    anchor.classList.toggle("ignore-list-link", isIgnoreListed);
    _Linkifier.updateLinkDecorations(anchor);
  }
  static updateLinkDecorations(anchor) {
    const info = _Linkifier.linkInfo(anchor);
    if (!info?.enableDecorator) {
      return;
    }
    if (!decorator || !info.uiLocation) {
      return;
    }
    const icon = decorator.linkIcon(info.uiLocation.uiSourceCode);
    if (icon && anchor instanceof HTMLElement && anchor.firstElementChild instanceof HTMLElement) {
      anchor.firstElementChild?.style.setProperty("margin-left", "2px");
      render(icon, anchor, { renderBefore: anchor.firstElementChild });
    }
    info.icon = icon;
  }
  static renderLinkifiedUrl(url, options) {
    options = options || {
      showColumnNumber: false,
      inlineFrameIndex: 0
    };
    const text = options.text;
    const className = options.className || "";
    const lineNumber = options.lineNumber;
    const columnNumber = options.columnNumber;
    const showColumnNumber = options.showColumnNumber;
    const preventClick = options.preventClick;
    const maxLength = options.maxLength || UI.UIUtils.MaxLengthForDisplayedURLs;
    const bypassURLTrimming = options.bypassURLTrimming;
    const omitOrigin = options.omitOrigin;
    if (!url || Common2.ParsedURL.schemeIs(url, "javascript:")) {
      return html`<span class=${className}>${text || url || i18nString2(UIStrings2.unknown)}</span>`;
    }
    let linkText = text || Bindings.ResourceUtils.displayNameForURL(url);
    if (omitOrigin) {
      const parsedUrl = URL.parse(url);
      if (parsedUrl) {
        linkText = url.replace(parsedUrl.origin, "");
      }
    }
    if (typeof lineNumber === "number" && !text) {
      linkText += ":" + (lineNumber + 1);
      if (showColumnNumber && typeof columnNumber === "number") {
        linkText += ":" + (columnNumber + 1);
      }
    }
    const title = linkText !== url ? url : "";
    const linkOptions = {
      maxLength,
      title,
      href: url,
      preventClick,
      tabStop: options.tabStop,
      bypassURLTrimming,
      jslogContext: options.jslogContext || "url",
      lineNumber,
      columnNumber,
      userMetric: options?.userMetric,
      onRef: options.onRef
    };
    return _Linkifier.renderLink(linkText, className, linkOptions);
  }
  /**
   * @deprecated use renderLinkifiedUrl.
   */
  static linkifyURL(url, options) {
    const container = document.createDocumentFragment();
    render(_Linkifier.renderLinkifiedUrl(url, options), container);
    return container.firstElementChild;
  }
  static linkifyRevealable(revealable, text, fallbackHref, title, className, jslogContext) {
    const createLinkOptions = {
      maxLength: UI.UIUtils.MaxLengthForDisplayedURLs,
      href: fallbackHref,
      title,
      jslogContext
    };
    const { link: link3, linkInfo } = _Linkifier.createLink(text, className || "", createLinkOptions);
    linkInfo.revealable = revealable;
    return link3;
  }
  static renderLink(text, className, options = {}) {
    const { maxLength, title, href, preventClick, tabStop, bypassURLTrimming, jslogContext } = options;
    const classes = {
      "devtools-link": true,
      "text-button": !preventClick,
      "link-style": !preventClick,
      "devtools-link-prevent-click": !!preventClick
    };
    for (const cls of className.split(" ")) {
      if (cls) {
        classes[cls] = true;
      }
    }
    const handler = (event) => {
      if (event instanceof KeyboardEvent && event.key !== Platform2.KeyboardUtilities.ENTER_KEY && event.key !== " ") {
        return;
      }
      if (_Linkifier.handleClick(event)) {
        event.consume(true);
      }
    };
    const createRef = () => {
      return ref((link3) => {
        if (!link3) {
          return;
        }
        options.onRef?.(link3);
        if (text instanceof HTMLElement) {
          link3.appendChild(text);
        } else if (bypassURLTrimming) {
          link3.classList.add("devtools-link-styled-trim");
          _Linkifier.appendTextWithoutHashes(link3, text);
        } else {
          _Linkifier.setTrimmedText(link3, text, maxLength);
        }
        const linkInfo = {
          icon: null,
          enableDecorator: false,
          uiLocation: null,
          liveLocation: null,
          url: options.href || null,
          lineNumber: options.lineNumber ?? null,
          columnNumber: options.columnNumber ?? null,
          inlineFrameIndex: 0,
          revealable: null,
          fallback: null,
          userMetric: options.userMetric
        };
        infoByAnchor.set(link3, linkInfo);
      });
    };
    const jslog = VisualLogging.link(jslogContext).track({ click: true });
    return preventClick ? html`<span
      class=${classMap(classes)}
      .href=${href}
      title=${ifDefined(title ? title : void 0)}
      jslog=${jslog}
      .tabIndex=${tabStop ? 0 : -1}
      role="link"
      ${createRef()}></span>` : html`<button
        @click=${handler}
        @keydown=${handler}
        class=${classMap(classes)}
        .href=${href}
        title=${ifDefined(title ? title : void 0)}
        jslog=${jslog}
        .tabIndex=${tabStop ? 0 : -1}
        role="link"
        ${createRef()}></button>`;
  }
  /**
   * @deprecated use renderLink.
   */
  static createLink(text, className, options = {}) {
    const container = document.createDocumentFragment();
    render(_Linkifier.renderLink(text, className, options), container);
    const link3 = container.firstElementChild;
    const linkInfo = infoByAnchor.get(link3);
    return { link: link3, linkInfo };
  }
  static setTrimmedText(link3, text, maxLength) {
    link3.removeChildren();
    if (maxLength && text.length > maxLength) {
      const middleSplit = splitMiddle(text, maxLength);
      _Linkifier.appendTextWithoutHashes(link3, middleSplit[0]);
      _Linkifier.appendHiddenText(link3, middleSplit[1]);
      _Linkifier.appendTextWithoutHashes(link3, middleSplit[2]);
    } else {
      _Linkifier.appendTextWithoutHashes(link3, text);
    }
    function splitMiddle(string, maxLength2) {
      let leftIndex = Math.floor(maxLength2 / 2);
      let rightIndex = string.length - Math.ceil(maxLength2 / 2) + 1;
      const codePointAtRightIndex = string.codePointAt(rightIndex - 1);
      if (typeof codePointAtRightIndex !== "undefined" && codePointAtRightIndex >= 65536) {
        rightIndex++;
        leftIndex++;
      }
      const codePointAtLeftIndex = string.codePointAt(leftIndex - 1);
      if (typeof codePointAtLeftIndex !== "undefined" && leftIndex > 0 && codePointAtLeftIndex >= 65536) {
        leftIndex--;
      }
      return [string.substring(0, leftIndex), string.substring(leftIndex, rightIndex), string.substring(rightIndex)];
    }
  }
  static appendTextWithoutHashes(link3, string) {
    const hashSplit = TextUtils.TextUtils.Utils.splitStringByRegexes(string, [/[a-f0-9]{20,}/g]);
    for (const match of hashSplit) {
      if (match.regexIndex === -1) {
        UI.UIUtils.createTextChild(link3, match.value);
      } else {
        UI.UIUtils.createTextChild(link3, match.value.substring(0, 7));
        _Linkifier.appendHiddenText(link3, match.value.substring(7));
      }
    }
  }
  static appendHiddenText(link3, string) {
    const ellipsisNode = UI.UIUtils.createTextChild(link3.createChild("span", "devtools-link-ellipsis"), "\u2026");
    textByAnchor.set(ellipsisNode, string);
  }
  static untruncatedNodeText(node) {
    return textByAnchor.get(node) || node.textContent || "";
  }
  static linkInfo(link3) {
    return link3 ? infoByAnchor.get(link3) || null : null;
  }
  static handleClick(event) {
    const link3 = event.currentTarget;
    if (UI.UIUtils.isBeingEdited(event.target) || link3.hasSelection()) {
      return false;
    }
    const linkInfo = _Linkifier.linkInfo(link3);
    if (!linkInfo) {
      return false;
    }
    return _Linkifier.invokeFirstAction(linkInfo);
  }
  static handleClickFromNewComponentLand(linkInfo) {
    _Linkifier.invokeFirstAction(linkInfo);
  }
  static invokeFirstAction(linkInfo) {
    const actions = _Linkifier.linkActions(linkInfo);
    if (actions.length) {
      void actions[0].handler.call(null);
      if (linkInfo.userMetric) {
        Host2.userMetrics.actionTaken(linkInfo.userMetric);
      }
      return true;
    }
    return false;
  }
  static linkHandlerSetting() {
    if (!linkHandlerSettingInstance) {
      linkHandlerSettingInstance = Common2.Settings.Settings.instance().createSetting("open-link-handler", i18nString2(UIStrings2.auto));
    }
    return linkHandlerSettingInstance;
  }
  static registerLinkHandler(registration) {
    for (const origin of linkHandlers.keys()) {
      const existingHandler = linkHandlers.get(origin);
      if (existingHandler?.scheme === registration.scheme) {
        const schemeString = registration.scheme ? `scheme '${registration.scheme}'` : "all schemes";
        Common2.Console.Console.instance().warn(`DevTools extension '${registration.title}' registered with setOpenResourceHandler for ${schemeString}, which is already registered by '${existingHandler?.title}'. This can lead to unexpected results.`);
      }
    }
    linkHandlers.set(registration.origin, registration);
    LinkHandlerSettingUI.instance().update();
  }
  static unregisterLinkHandler(registration) {
    const { origin } = registration;
    linkHandlers.delete(origin);
    LinkHandlerSettingUI.instance().update();
  }
  // The primary filter implementation for the openResourceHandlers. Returns false
  // if the handler is NOT supposed to handle the `url`. Usually, this happens if
  // a handler has registered for a particular `scheme` and the scheme for that url
  // does not match. If no openResourceScheme is provided, it means the handler is
  // interested in all urls (except those handled by scheme-specific handlers, see
  // otherSchemeRegistrations).
  static shouldHandleOpenResource(openResourceScheme, url, otherSchemeRegistrations) {
    if (openResourceScheme) {
      return url.startsWith(openResourceScheme);
    }
    const scheme = URL.parse(url)?.protocol || "";
    return !otherSchemeRegistrations.has(scheme);
  }
  static uiLocation(link3) {
    const info = _Linkifier.linkInfo(link3);
    return info ? info.uiLocation : null;
  }
  static linkActions(info) {
    const result = [];
    if (!info) {
      return result;
    }
    let url = Platform2.DevToolsPath.EmptyUrlString;
    let uiLocation = null;
    if (info.uiLocation) {
      uiLocation = info.uiLocation;
      url = uiLocation.uiSourceCode.contentURL();
    } else if (info.url) {
      url = info.url;
      const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url) || Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(Common2.ParsedURL.ParsedURL.urlWithoutHash(url));
      uiLocation = uiSourceCode ? uiSourceCode.uiLocation(info.lineNumber || 0, info.columnNumber || 0) : null;
    }
    const resource = url ? Bindings.ResourceUtils.resourceForURL(url) : null;
    const contentProvider = uiLocation ? uiLocation.uiSourceCode : resource;
    const revealable = info.revealable || uiLocation || resource;
    if (revealable) {
      const destination = Common2.Revealer.revealDestination(revealable);
      result.push({
        section: "reveal",
        title: destination ? i18nString2(UIStrings2.revealInS, { PH1: destination }) : i18nString2(UIStrings2.reveal),
        jslogContext: "reveal",
        handler: () => Common2.Revealer.reveal(revealable)
      });
    }
    const contentProviderOrUrl = contentProvider || url;
    const lineNumber = uiLocation ? uiLocation.lineNumber : info.lineNumber || 0;
    const columnNumber = uiLocation ? uiLocation.columnNumber : info.columnNumber || 0;
    const specificSchemeHandlers = /* @__PURE__ */ new Set();
    for (const registration of linkHandlers.values()) {
      if (registration.scheme) {
        specificSchemeHandlers.add(registration.scheme);
      }
    }
    for (const registration of linkHandlers.values().filter((r) => r.handler)) {
      const { title, handler, shouldHandleOpenResource } = registration;
      if (url && !shouldHandleOpenResource(url, specificSchemeHandlers)) {
        continue;
      }
      const action = {
        section: "reveal",
        title: i18nString2(UIStrings2.openUsingS, { PH1: title }),
        jslogContext: "open-using",
        handler: handler.bind(null, contentProviderOrUrl, lineNumber, columnNumber)
      };
      if (title === _Linkifier.linkHandlerSetting().get()) {
        result.unshift(action);
      } else {
        result.push(action);
      }
    }
    if (resource || info.url) {
      result.push({
        section: "reveal",
        title: UI.UIUtils.openLinkExternallyLabel(),
        jslogContext: "open-in-new-tab",
        handler: () => UIHelpers.openInNewTab(url)
      });
      result.push({
        section: "clipboard",
        title: UI.UIUtils.copyLinkAddressLabel(),
        jslogContext: "copy-link-address",
        handler: () => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(url)
      });
    }
    if (uiLocation?.uiSourceCode) {
      const contentProvider2 = uiLocation.uiSourceCode;
      result.push({
        section: "clipboard",
        title: UI.UIUtils.copyFileNameLabel(),
        jslogContext: "copy-file-name",
        handler: () => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(contentProvider2.displayName())
      });
    }
    return result;
  }
};
var LinkContextMenuProvider = class {
  appendApplicableItems(_event, contextMenu, target) {
    let targetNode = target;
    while (targetNode && !infoByAnchor.get(targetNode)) {
      targetNode = targetNode.parentNodeOrShadowHost();
    }
    const link3 = targetNode;
    const linkInfo = Linkifier.linkInfo(link3);
    if (!linkInfo) {
      return;
    }
    const actions = Linkifier.linkActions(linkInfo);
    for (const action of actions) {
      contextMenu.section(action.section).appendItem(action.title, action.handler, { jslogContext: action.jslogContext });
    }
  }
};
var linkHandlerSettingUIInstance;
var LinkHandlerSettingUI = class _LinkHandlerSettingUI {
  element;
  constructor() {
    this.element = document.createElement("select");
    this.element.addEventListener("change", this.onChange.bind(this), false);
    this.update();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!linkHandlerSettingUIInstance || forceNew) {
      linkHandlerSettingUIInstance = new _LinkHandlerSettingUI();
    }
    return linkHandlerSettingUIInstance;
  }
  update() {
    this.element.removeChildren();
    const names = [...linkHandlers.keys()];
    names.unshift(i18nString2(UIStrings2.auto));
    for (const name of names) {
      const option = document.createElement("option");
      option.textContent = name;
      option.selected = name === Linkifier.linkHandlerSetting().get();
      this.element.appendChild(option);
    }
    this.element.disabled = names.length <= 1;
  }
  onChange(event) {
    if (!event.target) {
      return;
    }
    const value = event.target.value;
    Linkifier.linkHandlerSetting().set(value);
  }
  settingElement() {
    const p = document.createElement("p");
    p.classList.add("settings-select");
    const label = p.createChild("label");
    label.textContent = i18nString2(UIStrings2.linkHandling);
    UI.ARIAUtils.bindLabelToControl(label, this.element);
    p.appendChild(this.element);
    return p;
  }
};
var listeningToNewEvents = false;
function listenForNewComponentLinkifierEvents() {
  if (listeningToNewEvents) {
    return;
  }
  listeningToNewEvents = true;
  window.addEventListener("linkifieractivated", function(event) {
    const eventWithData = event;
    Linkifier.handleClickFromNewComponentLand(eventWithData.data);
  });
}
listenForNewComponentLinkifierEvents();
var ContentProviderContextMenuProvider = class {
  appendApplicableItems(_event, contextMenu, contentProvider) {
    const contentUrl = contentProvider.contentURL();
    if (!contentUrl) {
      return;
    }
    if (!Common2.ParsedURL.schemeIs(contentUrl, "file:")) {
      contextMenu.revealSection().appendItem(UI.UIUtils.openLinkExternallyLabel(), () => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(contentUrl.endsWith(":formatted") ? Common2.ParsedURL.ParsedURL.slice(contentUrl, 0, contentUrl.lastIndexOf(":")) : contentUrl), { jslogContext: "open-in-new-tab" });
    }
    for (const origin of linkHandlers.keys()) {
      const registration = linkHandlers.get(origin);
      if (!registration) {
        continue;
      }
      const { title } = registration;
      contextMenu.revealSection().appendItem(i18nString2(UIStrings2.openUsingS, { PH1: title }), registration.handler.bind(null, contentProvider, 0), { jslogContext: "open-using" });
    }
    if (contentProvider instanceof SDK2.NetworkRequest.NetworkRequest) {
      return;
    }
    contextMenu.clipboardSection().appendItem(UI.UIUtils.copyLinkAddressLabel(), () => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(contentUrl), { jslogContext: "copy-link-address" });
    if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
      contextMenu.clipboardSection().appendItem(UI.UIUtils.copyFileNameLabel(), () => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(contentProvider.displayName()), { jslogContext: "copy-file-name" });
    } else {
      contextMenu.clipboardSection().appendItem(UI.UIUtils.copyFileNameLabel(), () => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(contentProvider.displayName), { jslogContext: "copy-file-name" });
    }
  }
};
var DEFAULT_SCRIPT_LOCATION_VIEW = (input, _output, target) => {
  render(html`${input.linkifier.linkifyScriptLocation(input.target ?? null, input.scriptId ?? null, input.sourceURL, input.lineNumber, input.options)}`, target);
};
var ScriptLocationLink = class extends UI.Widget.Widget {
  target;
  scriptId;
  sourceURL = "";
  lineNumber;
  options;
  linkifier = new Linkifier();
  #view;
  constructor(element, view = DEFAULT_SCRIPT_LOCATION_VIEW) {
    super(element);
    this.#view = view;
  }
  performUpdate() {
    this.#view(this, void 0, this.contentElement);
  }
  onDetach() {
    this.linkifier.dispose();
  }
};

// gen/front_end/ui/legacy/components/utils/JSPresentationUtils.js
var { classMap: classMap2 } = Directives2;
var UIStrings3 = {
  /**
   * @description Text to stop preventing the debugger from stepping into library code
   */
  removeFromIgnore: "Remove from ignore list",
  /**
   * @description Text for scripts that should not be stepped into when debugging
   */
  addToIgnore: "Add script to ignore list",
  /**
   * @description A link to show more frames when they are available.
   */
  showMoreFrames: "Show ignore-listed frames",
  /**
   * @description A link to rehide frames that are by default hidden.
   */
  showLess: "Show less"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/utils/JSPresentationUtils.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
function populateContextMenu(link3, event) {
  const contextMenu = new UI2.ContextMenu.ContextMenu(event);
  event.consume(true);
  const uiLocation = Linkifier.uiLocation(link3);
  if (uiLocation && Workspace3.IgnoreListManager.IgnoreListManager.instance().canIgnoreListUISourceCode(uiLocation.uiSourceCode)) {
    if (Workspace3.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(uiLocation.uiSourceCode.url())) {
      contextMenu.debugSection().appendItem(i18nString3(UIStrings3.removeFromIgnore), () => Workspace3.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(uiLocation.uiSourceCode), { jslogContext: "remove-from-ignore-list" });
    } else {
      contextMenu.debugSection().appendItem(i18nString3(UIStrings3.addToIgnore), () => Workspace3.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiLocation.uiSourceCode), { jslogContext: "add-to-ignore-list" });
    }
  }
  contextMenu.appendApplicableItems(event);
  void contextMenu.show();
}
var DEFAULT_VIEW = (input, output, target) => {
  let renderExpandButton = Boolean(input.expandable);
  const maybeRenderExpandButton = () => {
    const result = html2`
      ${renderExpandButton ? html2`
        <button class="arrow-icon-button" jslog=${VisualLogging2.expand().track({ click: true })} @click=${input.onExpand}>
          <span class="arrow-icon"></span>
        </button>
      ` : "\n"}`;
    renderExpandButton = false;
    return result;
  };
  const classes = {
    "stack-preview-container": true,
    "width-constrained": Boolean(input.widthConstrained),
    expandable: Boolean(input.expandable),
    expanded: Boolean(input.expanded),
    "show-hidden-rows": Boolean(input.showIgnoreListed)
  };
  const { stackTrace } = input;
  render2(html2`
    <style>${jsUtils_css_default}</style>
    <table class=${classMap2(classes)}>
      ${stackTrace ? html2`
        ${[stackTrace.syncFragment, ...stackTrace.asyncFragments].map((fragment) => html2`
          <tbody>
            ${"description" in fragment ? html2`
              <tr class="stack-preview-async-row">
                <td>${maybeRenderExpandButton()}</td>
                <td class="stack-preview-async-description">
                  ${UI2.UIUtils.asyncFragmentLabel(stackTrace, fragment)}
                </td>
                <td></td>
                <td></td>
              </tr>
            ` : nothing}
            ${fragment.frames.map((frame, i) => {
    const previousStackFrameWasBreakpointCondition = i > 0 && [
      SDK3.DebuggerModel.COND_BREAKPOINT_SOURCE_URL,
      SDK3.DebuggerModel.LOGPOINT_SOURCE_URL
    ].includes(fragment.frames[i - 1].url ?? "");
    const link3 = Linkifier.linkifyStackTraceFrame(frame, {
      showColumnNumber: Boolean(input.showColumnNumber),
      tabStop: Boolean(input.tabStops),
      inlineFrameIndex: 0,
      revealBreakpoint: previousStackFrameWasBreakpointCondition,
      maxLength: UI2.UIUtils.MaxLengthForDisplayedURLsInConsole,
      ignoreListManager: input.ignoreListManager
    });
    link3.setAttribute("jslog", `${VisualLogging2.link("stack-trace").track({ click: true })}`);
    link3.addEventListener("contextmenu", populateContextMenu.bind(null, link3));
    return html2`
                <tr>
                  <td>${maybeRenderExpandButton()}</td>
                  <td class="function-name">
                    ${UI2.UIUtils.beautifyFunctionName(frame.name ?? "")}
                  </td>
                  <td> @ </td>
                  <td class="link">${link3}</td>
                </tr>
            `;
  })}
          </tbody>
        `)}
        <tfoot>
          <tr class="show-all-link">
            <td></td>
            <td colspan="3">
              <span class="link" @click=${input.onShowMore}>
                <span class="css-inserted-text" data-inserted-text=${i18nString3(UIStrings3.showMoreFrames)}></span>
              </span>
            </td>
          </tr>
          <tr class="show-less-link">
            <td></td>
            <td colspan="3">
              <span class="link" @click=${input.onShowLess}>
                <span class="css-inserted-text" data-inserted-text=${i18nString3(UIStrings3.showLess)}></span>
              </span>
            </td>
          </tr>
        </tfoot>
      ` : nothing}
    </table>
  `, target, { container: { classes: ["monospace", "stack-preview-container"] } });
};
var StackTracePreviewContent = class extends UI2.Widget.Widget {
  #view;
  #stackTrace;
  #options = {};
  #expanded = false;
  #showIgnoreListed = false;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: "pure" });
    this.#view = view;
  }
  hasContent() {
    if (!this.#stackTrace) {
      return false;
    }
    const { syncFragment, asyncFragments } = this.#stackTrace;
    return syncFragment.frames.length > 0 || asyncFragments.some((f) => f.frames.length > 0);
  }
  performUpdate() {
    this.element.classList.toggle("expandable", this.#options.expandable);
    this.element.classList.toggle("expanded", this.#expanded);
    this.element.classList.toggle("show-hidden-rows", this.#showIgnoreListed);
    const input = {
      stackTrace: this.#stackTrace,
      ...this.#options,
      expanded: this.#expanded,
      showIgnoreListed: this.#showIgnoreListed,
      onExpand: this.#onExpand.bind(this),
      onShowMore: this.#onShowMoreLess.bind(this, true),
      onShowLess: this.#onShowMoreLess.bind(this, false)
    };
    this.#view(input, {}, this.contentElement);
    this.#updateHasNonIgnoredLinks();
  }
  // Propagate ignore-list state to the host element so that CSS outside the
  // shadow DOM can coordinate ignore-list toggling across multiple stack
  // traces (e.g. Error inline stack + console.error call stack).
  // See crbug.com/379788109.
  #updateHasNonIgnoredLinks = () => {
    const hasNonIgnoredLinks = this.linkElements.some((link3) => {
      const uiLocation = Linkifier.uiLocation(link3);
      if (uiLocation) {
        return !uiLocation.isIgnoreListed(this.#options.ignoreListManager);
      }
      return !link3.classList.contains("ignore-list-link");
    });
    this.element.classList.toggle("has-non-ignored-links", hasNonIgnoredLinks);
  };
  wasShown() {
    super.wasShown();
    if (Root.DevToolsContext.globalInstance().has(Workspace3.IgnoreListManager.IgnoreListManager)) {
      Workspace3.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.#updateHasNonIgnoredLinks);
    }
  }
  willHide() {
    if (Root.DevToolsContext.globalInstance().has(Workspace3.IgnoreListManager.IgnoreListManager)) {
      Workspace3.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.#updateHasNonIgnoredLinks);
    }
    super.willHide();
  }
  get linkElements() {
    return [...this.contentElement.querySelectorAll("td.link > .devtools-link")];
  }
  set options(options) {
    this.#options = options;
    this.requestUpdate();
  }
  set stackTrace(stackTrace) {
    if (this.#stackTrace) {
      this.#stackTrace.removeEventListener("UPDATED", this.requestUpdate, this);
    }
    this.#stackTrace = stackTrace;
    this.#stackTrace.addEventListener("UPDATED", this.requestUpdate, this);
    this.requestUpdate();
  }
  #onShowMoreLess(more) {
    this.#showIgnoreListed = more;
    this.requestUpdate();
    void this.updateComplete.then(() => UI2.GlassPane.GlassPane.containerMoved(this.element));
  }
  #onExpand() {
    this.#expanded = !this.#expanded;
    this.requestUpdate();
  }
};

// gen/front_end/ui/legacy/components/utils/Reload.js
var Reload_exports = {};
__export(Reload_exports, {
  reload: () => reload
});
import * as Host3 from "./../../../../core/host/host.js";
import * as UI3 from "./../../legacy.js";
function reload() {
  if (UI3.DockController.DockController.instance().canDock() && UI3.DockController.DockController.instance().dockSide() === "undocked") {
    Host3.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {
    });
  }
  Host3.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
}

// gen/front_end/ui/legacy/components/utils/TargetDetachedDialog.js
var TargetDetachedDialog_exports = {};
__export(TargetDetachedDialog_exports, {
  TargetDetachedDialog: () => TargetDetachedDialog
});
import * as SDK4 from "./../../../../core/sdk/sdk.js";
import * as UI4 from "./../../legacy.js";
var TargetDetachedDialog = class _TargetDetachedDialog extends SDK4.SDKModel.SDKModel {
  static hideCrashedDialog;
  constructor(target) {
    super(target);
    target.registerInspectorDispatcher(this);
    void target.inspectorAgent().invoke_enable();
    if (target.parentTarget()?.type() === SDK4.Target.Type.BROWSER && _TargetDetachedDialog.hideCrashedDialog) {
      _TargetDetachedDialog.hideCrashedDialog.call(null);
      _TargetDetachedDialog.hideCrashedDialog = null;
    }
  }
  workerScriptLoaded() {
  }
  detached({ reason }) {
    UI4.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(reason);
  }
  static connectionLost(message) {
    UI4.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(message);
  }
  targetCrashed() {
    if (_TargetDetachedDialog.hideCrashedDialog) {
      return;
    }
    const parentTarget = this.target().parentTarget();
    if (parentTarget && parentTarget.type() !== SDK4.Target.Type.BROWSER) {
      return;
    }
    const dialog = new UI4.Dialog.Dialog("target-crashed");
    dialog.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    dialog.addCloseButton();
    dialog.setDimmed(true);
    _TargetDetachedDialog.hideCrashedDialog = dialog.hide.bind(dialog);
    new UI4.TargetCrashedScreen.TargetCrashedScreen(() => {
      _TargetDetachedDialog.hideCrashedDialog = null;
    }).show(dialog.contentElement);
    dialog.show();
  }
  /**
   * ;
   */
  targetReloadedAfterCrash() {
    void this.target().runtimeAgent().invoke_runIfWaitingForDebugger();
    if (_TargetDetachedDialog.hideCrashedDialog) {
      _TargetDetachedDialog.hideCrashedDialog.call(null);
      _TargetDetachedDialog.hideCrashedDialog = null;
    }
  }
};
SDK4.SDKModel.SDKModel.register(TargetDetachedDialog, { capabilities: 2048, autostart: true });
export {
  ImagePreview_exports as ImagePreview,
  JSPresentationUtils_exports as JSPresentationUtils,
  Linkifier_exports as Linkifier,
  Reload_exports as Reload,
  TargetDetachedDialog_exports as TargetDetachedDialog
};
//# sourceMappingURL=utils.js.map
