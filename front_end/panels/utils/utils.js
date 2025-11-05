// gen/front_end/panels/utils/utils.prebundle.js
import "./../../ui/components/icon_button/icon_button.js";
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Formatter from "./../../models/formatter/formatter.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as DiffView from "./../../ui/components/diff_view/diff_view.js";
import { Directives, html } from "./../../ui/lit/lit.js";
import * as PanelCommon from "./../common/common.js";
import * as Snippets from "./../snippets/snippets.js";
var { ref, styleMap, ifDefined } = Directives;
var UIStrings = {
  /**
   * @description Tooltip to explain the resource's overridden status
   */
  requestContentHeadersOverridden: "Both request content and headers are overridden",
  /**
   * @description Tooltip to explain the resource's overridden status
   */
  requestContentOverridden: "Request content is overridden",
  /**
   * @description Tooltip to explain the resource's overridden status
   */
  requestHeadersOverridden: "Request headers are overridden",
  /**
   * @description Tooltip to explain why the request has warning icon
   */
  thirdPartyPhaseout: "Cookies for this request are blocked either because of Chrome flags or browser configuration. Learn more in the Issues panel.",
  /**
   * @description Tooltip to explain that a request was throttled
   * @example {Image} PH1
   * @example {3G} PH2
   */
  resourceTypeWithThrottling: "{PH1} (throttled to {PH2})"
};
var str_ = i18n.i18n.registerUIStrings("panels/utils/utils.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var PanelUtils = class _PanelUtils {
  static isFailedNetworkRequest(request) {
    if (!request) {
      return false;
    }
    if (request.failed && !request.statusCode) {
      return true;
    }
    if (request.statusCode >= 400) {
      return true;
    }
    const signedExchangeInfo = request.signedExchangeInfo();
    if (signedExchangeInfo !== null && Boolean(signedExchangeInfo.errors)) {
      return true;
    }
    if (request.corsErrorStatus()) {
      return true;
    }
    return false;
  }
  static getIconForNetworkRequest(request) {
    let type = request.resourceType();
    if (_PanelUtils.isFailedNetworkRequest(request)) {
      let iconName2;
      if (request.resourceType() === Common.ResourceType.resourceTypes.Prefetch) {
        iconName2 = "warning-filled";
      } else {
        iconName2 = "cross-circle-filled";
      }
      return html`<devtools-icon
          class="icon" name=${iconName2} title=${type.title()}>
        </devtools-icon>`;
    }
    if (request.hasThirdPartyCookiePhaseoutIssue()) {
      return html`<devtools-icon
        class="icon"
        name="warning-filled"
        title=${i18nString(UIStrings.thirdPartyPhaseout)}
      ></devtools-icon>`;
    }
    const isHeaderOverridden = request.hasOverriddenHeaders();
    const isContentOverridden = request.hasOverriddenContent;
    if (isHeaderOverridden || isContentOverridden) {
      let title;
      if (isHeaderOverridden && isContentOverridden) {
        title = i18nString(UIStrings.requestContentHeadersOverridden);
      } else if (isContentOverridden) {
        title = i18nString(UIStrings.requestContentOverridden);
      } else {
        title = i18nString(UIStrings.requestHeadersOverridden);
      }
      return html`<div class="network-override-marker">
          <devtools-icon class="icon" name="document" title=${title}></devtools-icon>
        </div>`;
    }
    const typeFromMime = Common.ResourceType.ResourceType.fromMimeType(request.mimeType);
    if (typeFromMime !== type && typeFromMime !== Common.ResourceType.resourceTypes.Other) {
      if (type === Common.ResourceType.resourceTypes.Fetch) {
        type = typeFromMime;
      } else if (typeFromMime === Common.ResourceType.resourceTypes.Image) {
        type = typeFromMime;
      } else if (type === Common.ResourceType.resourceTypes.Other && typeFromMime === Common.ResourceType.resourceTypes.Script) {
        type = typeFromMime;
      }
    }
    if (type === Common.ResourceType.resourceTypes.Image) {
      return html`<div class="image icon">
          <img class="image-network-icon-preview"
               title=${iconTitleForRequest(request)}
               alt=${iconTitleForRequest(request)}
               ${ref((e) => request.populateImageSource(e))}>
        </div>`;
    }
    if (type !== Common.ResourceType.resourceTypes.Manifest && Common.ResourceType.ResourceType.simplifyContentType(request.mimeType) === "application/json") {
      return html`<devtools-icon
          class="icon" name="file-json" title=${iconTitleForRequest(request)}
          style="color:var(--icon-file-script)">
        </devtools-icon>`;
    }
    const { iconName, color } = _PanelUtils.iconDataForResourceType(type);
    return html`<devtools-icon
        class="icon" name=${iconName} title=${iconTitleForRequest(request)}
        style=${styleMap({ color })}>
      </devtools-icon>`;
    function iconTitleForRequest(request2) {
      const throttlingConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(request2);
      if (!throttlingConditions?.urlPattern) {
        return request2.resourceType().title();
      }
      const title = typeof throttlingConditions?.conditions.title === "string" ? throttlingConditions?.conditions.title : throttlingConditions?.conditions.title();
      return i18nString(UIStrings.resourceTypeWithThrottling, { PH1: request2.resourceType().title(), PH2: title });
    }
  }
  static iconDataForResourceType(resourceType) {
    if (resourceType.isDocument()) {
      return { iconName: "file-document" };
    }
    if (resourceType.isImage()) {
      return { iconName: "file-image", color: "var(--icon-file-image)" };
    }
    if (resourceType.isFont()) {
      return { iconName: "file-font" };
    }
    if (resourceType.isScript()) {
      return { iconName: "file-script" };
    }
    if (resourceType.isStyleSheet()) {
      return { iconName: "file-stylesheet" };
    }
    if (resourceType.name() === Common.ResourceType.resourceTypes.Manifest.name()) {
      return { iconName: "file-manifest" };
    }
    if (resourceType.name() === Common.ResourceType.resourceTypes.Wasm.name()) {
      return { iconName: "file-wasm" };
    }
    if (resourceType.name() === Common.ResourceType.resourceTypes.WebSocket.name() || resourceType.name() === Common.ResourceType.resourceTypes.DirectSocket.name()) {
      return { iconName: "file-websocket" };
    }
    if (resourceType.name() === Common.ResourceType.resourceTypes.Media.name()) {
      return { iconName: "file-media" };
    }
    if (resourceType.name() === Common.ResourceType.resourceTypes.Fetch.name() || resourceType.name() === Common.ResourceType.resourceTypes.XHR.name()) {
      return { iconName: "file-fetch-xhr" };
    }
    return { iconName: "file-generic" };
  }
  static getIconForSourceFile(uiSourceCode) {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    let iconType = "document";
    let hasDotBadge = false;
    let isDotPurple = false;
    if (binding) {
      if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(binding.fileSystem)) {
        iconType = "snippet";
      }
      hasDotBadge = true;
      isDotPurple = networkPersistenceManager.project() === binding.fileSystem.project();
    } else if (networkPersistenceManager.isActiveHeaderOverrides(uiSourceCode)) {
      hasDotBadge = true;
      isDotPurple = true;
    } else if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
      iconType = "snippet";
    }
    const title = binding ? PanelCommon.PersistenceUtils.PersistenceUtils.tooltipForUISourceCode(uiSourceCode) : void 0;
    return html`<devtools-file-source-icon
        name=${iconType} title=${ifDefined(title)} .data=${{
      contentType: uiSourceCode.contentType().name(),
      hasDotBadge,
      isDotPurple,
      iconType
    }}>
      </devtools-file-source-icon>`;
  }
  static async formatCSSChangesFromDiff(diff) {
    const indent = "  ";
    const { originalLines, currentLines, rows } = DiffView.DiffView.buildDiffRows(diff);
    const originalRuleMaps = await buildStyleRuleMaps(originalLines.join("\n"));
    const currentRuleMaps = await buildStyleRuleMaps(currentLines.join("\n"));
    let changes = "";
    let recordedOriginalSelector, recordedCurrentSelector;
    let hasOpenDeclarationBlock = false;
    for (const { currentLineNumber, originalLineNumber, type } of rows) {
      if (type !== "deletion" && type !== "addition") {
        continue;
      }
      const isDeletion = type === "deletion";
      const lines = isDeletion ? originalLines : currentLines;
      const lineIndex = isDeletion ? originalLineNumber - 1 : currentLineNumber - 1;
      const line = lines[lineIndex].trim();
      const { declarationIDToStyleRule, styleRuleIDToStyleRule } = isDeletion ? originalRuleMaps : currentRuleMaps;
      let styleRule;
      let prefix = "";
      if (declarationIDToStyleRule.has(lineIndex)) {
        styleRule = declarationIDToStyleRule.get(lineIndex);
        const selector = styleRule.selector;
        if (selector !== recordedOriginalSelector && selector !== recordedCurrentSelector) {
          prefix += `${selector} {
`;
        }
        prefix += indent;
        hasOpenDeclarationBlock = true;
      } else {
        if (hasOpenDeclarationBlock) {
          prefix = "}\n\n";
          hasOpenDeclarationBlock = false;
        }
        if (styleRuleIDToStyleRule.has(lineIndex)) {
          styleRule = styleRuleIDToStyleRule.get(lineIndex);
        }
      }
      const processedLine = isDeletion ? `/* ${line} */` : line;
      changes += prefix + processedLine + "\n";
      if (isDeletion) {
        recordedOriginalSelector = styleRule?.selector;
      } else {
        recordedCurrentSelector = styleRule?.selector;
      }
    }
    if (changes.length > 0) {
      changes += "}";
    }
    return changes;
  }
  static highlightElement(element) {
    element.scrollIntoViewIfNeeded();
    element.animate([
      { offset: 0, backgroundColor: "rgba(255, 255, 0, 0.2)" },
      { offset: 0.1, backgroundColor: "rgba(255, 255, 0, 0.7)" },
      { offset: 1, backgroundColor: "transparent" }
    ], { duration: 2e3, easing: "cubic-bezier(0, 0, 0.2, 1)" });
  }
};
async function buildStyleRuleMaps(content) {
  const rules = await new Promise((res) => {
    const rules2 = [];
    Formatter.FormatterWorkerPool.formatterWorkerPool().parseCSS(content, (isLastChunk, currentRules) => {
      rules2.push(...currentRules);
      if (isLastChunk) {
        res(rules2);
      }
    });
  });
  const declarationIDToStyleRule = /* @__PURE__ */ new Map();
  const styleRuleIDToStyleRule = /* @__PURE__ */ new Map();
  for (const rule of rules) {
    if ("styleRange" in rule) {
      const selector = rule.selectorText.split("\n").pop()?.trim();
      if (!selector) {
        continue;
      }
      const styleRule = { rule, selector };
      styleRuleIDToStyleRule.set(rule.styleRange.startLine, styleRule);
      for (const property of rule.properties) {
        declarationIDToStyleRule.set(property.range.startLine, styleRule);
      }
    }
  }
  return { declarationIDToStyleRule, styleRuleIDToStyleRule };
}
export {
  PanelUtils
};
//# sourceMappingURL=utils.js.map
