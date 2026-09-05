var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/ui/legacy/components/object_ui/CSSStyleSanitizer.ts
var CSSStyleSanitizer_exports = {};
__export(CSSStyleSanitizer_exports, {
  cssEscapeRegex: () => cssEscapeRegex,
  sanitizeStyle: () => sanitizeStyle
});
import * as Common from "../../../../core/common/common.js";
function cssEscapeRegex(cssString) {
  return [...cssString].map((char) => {
    const charCodes = new Set([char.toLowerCase(), char.toUpperCase()].map((c) => c.charCodeAt(0).toString(16)));
    const charCodeRegex = [...charCodes].map((charCode) => `\\\\0{0,${6 - charCode.length}}${charCode}[ \\n\\t]?`).join("|");
    return `\\\\?(?:${charCodeRegex}|${char})`;
  }).join("");
}
var ALLOWED_PROPERTY_PREFIXES = ["background", "border", "color", "font", "line", "margin", "padding", "text"];
var URL_REGEX = new RegExp(`(?=${cssEscapeRegex("url")}\\(['"]?([^\\)]*))`, "gi");
var IMAGESET_REGEX = new RegExp(`(?=(${cssEscapeRegex("image-set")}\\(.*))`, "gi");
var GOOD_IMAGESET_REGEX = /^image-set\((?:(?:(?:url|type)\("[^\\"]*"\)|[\d.]+(?:x|dpi|dpcm|dppx)),?\s*)+\)/i;
function sanitizeStyle(currentStyle, styleToAdd) {
  currentStyle.clear();
  const buffer = document.createElement("span");
  buffer.setAttribute("style", styleToAdd);
  for (const property of buffer.style) {
    if (!ALLOWED_PROPERTY_PREFIXES.some((prefix) => property.startsWith(prefix) || property.startsWith(`-webkit-${prefix}`))) {
      continue;
    }
    const value = buffer.style.getPropertyValue(property);
    const imageSets = [...value.matchAll(IMAGESET_REGEX)];
    if (imageSets.some((match) => !GOOD_IMAGESET_REGEX.test(match[1]))) {
      continue;
    }
    const potentialUrls = [...value.matchAll(URL_REGEX)].map((match) => match[1]);
    if (potentialUrls.some((potentialUrl) => !Common.ParsedURL.schemeIs(potentialUrl, "data:"))) {
      continue;
    }
    currentStyle.set(property, {
      value,
      priority: buffer.style.getPropertyPriority(property)
    });
  }
}

// ../../front_end/ui/legacy/components/object_ui/CustomPreviewComponent.ts
var CustomPreviewComponent_exports = {};
__export(CustomPreviewComponent_exports, {
  CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW: () => CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW,
  CustomPreviewComponent: () => CustomPreviewComponent,
  CustomPreviewSection: () => CustomPreviewSection,
  DEFAULT_VIEW: () => DEFAULT_VIEW
});
import * as Common3 from "../../../../core/common/common.js";
import * as i18n5 from "../../../../core/i18n/i18n.js";
import { Directives as Directives3, html as html3, nothing as nothing3, render as render3 } from "../../../lit/lit.js";
import * as UI3 from "../../legacy.js";

// gen/front_end/ui/legacy/components/object_ui/customPreviewComponent.css.js
var customPreviewComponent_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: inline-flex;
}

.custom-expandable-section {
  display: inline-flex;
  flex-direction: column;
}

.custom-expand-icon {
  user-select: none;
  margin-right: 4px;
  margin-bottom: -4px;
}

.custom-expandable-section-standard-section {
  display: inline-flex;
}

.custom-expandable-section-default-body {
  padding-left: 12px;
}

/*# sourceURL=${import.meta.resolve("./customPreviewComponent.css")} */`;

// ../../front_end/ui/legacy/components/object_ui/ObjectPropertiesSection.ts
var ObjectPropertiesSection_exports = {};
__export(ObjectPropertiesSection_exports, {
  ArrayGroupingTreeElement: () => ArrayGroupingTreeElement,
  EXPANDABLE_MAX_DEPTH: () => EXPANDABLE_MAX_DEPTH,
  EXPANDABLE_TEXT_DEFAULT_VIEW: () => EXPANDABLE_TEXT_DEFAULT_VIEW,
  ExpandableTextPropertyValue: () => ExpandableTextPropertyValue,
  OBJECT_PROPERTIES_SECTION_DEFAULT_VIEW: () => OBJECT_PROPERTIES_SECTION_DEFAULT_VIEW,
  OBJECT_PROPERTY_DEFAULT_VIEW: () => OBJECT_PROPERTY_DEFAULT_VIEW,
  OBJECT_TREE_DEFAULT_VIEW: () => OBJECT_TREE_DEFAULT_VIEW,
  ObjectPropertiesMode: () => ObjectPropertiesMode,
  ObjectPropertiesSectionWidget: () => ObjectPropertiesSectionWidget,
  ObjectPropertyTreeElement: () => ObjectPropertyTreeElement,
  ObjectPropertyWidget: () => ObjectPropertyWidget,
  ObjectTree: () => ObjectTree,
  ObjectTreeExpansionTracker: () => ObjectTreeExpansionTracker,
  ObjectTreeNode: () => ObjectTreeNode,
  ObjectTreeNodeBase: () => ObjectTreeNodeBase,
  ObjectTreeWidget: () => ObjectTreeWidget,
  compareProperties: () => compareProperties,
  defaultObjectPresentation: () => defaultObjectPresentation,
  formatObjectAsFunction: () => formatObjectAsFunction,
  getMemoryIcon: () => getMemoryIcon,
  objectPropertiesSectionStyles: () => objectPropertiesSection_css_default,
  objectValueStyles: () => objectValue_css_default,
  populateObjectTreeContextMenu: () => populateObjectTreeContextMenu,
  renderObjectTree: () => renderObjectTree,
  renderPropertyName: () => renderPropertyName,
  renderPropertyValue: () => renderPropertyValue,
  valueElementForFunctionDescription: () => valueElementForFunctionDescription
});
import * as Common2 from "../../../../core/common/common.js";
import * as Host from "../../../../core/host/host.js";
import * as i18n3 from "../../../../core/i18n/i18n.js";
import * as Platform2 from "../../../../core/platform/platform.js";
import * as SDK3 from "../../../../core/sdk/sdk.js";
import * as TextUtils from "../../../../core/text_utils/text_utils.js";
import * as uiI18n from "../../../i18n/i18n.js";
import * as Highlighting from "../../../components/highlighting/highlighting.js";
import * as TextEditor from "../../../components/text_editor/text_editor.js";
import {
  Directives as Directives2,
  html as html2,
  nothing as nothing2,
  render as render2
} from "../../../lit/lit.js";
import * as VisualLogging from "../../../visual_logging/visual_logging.js";
import * as UI2 from "../../legacy.js";

// ../../front_end/ui/legacy/components/object_ui/JavaScriptREPL.ts
var JavaScriptREPL_exports = {};
__export(JavaScriptREPL_exports, {
  JavaScriptREPL: () => JavaScriptREPL
});
import * as SDK2 from "../../../../core/sdk/sdk.js";
import * as Bindings from "../../../../models/bindings/bindings.js";
import * as Formatter from "../../../../models/formatter/formatter.js";
import * as SourceMapScopes from "../../../../models/source_map_scopes/source_map_scopes.js";
import * as Acorn from "../../../../third_party/acorn/acorn.js";
import * as UI from "../../legacy.js";

// ../../front_end/ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.ts
var RemoteObjectPreviewFormatter_exports = {};
__export(RemoteObjectPreviewFormatter_exports, {
  RemoteObjectPreviewFormatter: () => RemoteObjectPreviewFormatter,
  renderNodeTitle: () => renderNodeTitle,
  renderTrustedType: () => renderTrustedType
});
import * as i18n from "../../../../core/i18n/i18n.js";
import * as Platform from "../../../../core/platform/platform.js";
import * as SDK from "../../../../core/sdk/sdk.js";

// ../../front_end/generated/protocol.ts
var Accessibility;
((Accessibility2) => {
  let AXValueType;
  ((AXValueType2) => {
    AXValueType2["Boolean"] = "boolean";
    AXValueType2["Tristate"] = "tristate";
    AXValueType2["BooleanOrUndefined"] = "booleanOrUndefined";
    AXValueType2["Idref"] = "idref";
    AXValueType2["IdrefList"] = "idrefList";
    AXValueType2["Integer"] = "integer";
    AXValueType2["Node"] = "node";
    AXValueType2["NodeList"] = "nodeList";
    AXValueType2["Number"] = "number";
    AXValueType2["String"] = "string";
    AXValueType2["ComputedString"] = "computedString";
    AXValueType2["Token"] = "token";
    AXValueType2["TokenList"] = "tokenList";
    AXValueType2["DomRelation"] = "domRelation";
    AXValueType2["Role"] = "role";
    AXValueType2["InternalRole"] = "internalRole";
    AXValueType2["ValueUndefined"] = "valueUndefined";
  })(AXValueType = Accessibility2.AXValueType || (Accessibility2.AXValueType = {}));
  let AXValueSourceType;
  ((AXValueSourceType2) => {
    AXValueSourceType2["Attribute"] = "attribute";
    AXValueSourceType2["Implicit"] = "implicit";
    AXValueSourceType2["Style"] = "style";
    AXValueSourceType2["Contents"] = "contents";
    AXValueSourceType2["Placeholder"] = "placeholder";
    AXValueSourceType2["RelatedElement"] = "relatedElement";
  })(AXValueSourceType = Accessibility2.AXValueSourceType || (Accessibility2.AXValueSourceType = {}));
  let AXValueNativeSourceType;
  ((AXValueNativeSourceType2) => {
    AXValueNativeSourceType2["Description"] = "description";
    AXValueNativeSourceType2["Figcaption"] = "figcaption";
    AXValueNativeSourceType2["Label"] = "label";
    AXValueNativeSourceType2["Labelfor"] = "labelfor";
    AXValueNativeSourceType2["Labelwrapped"] = "labelwrapped";
    AXValueNativeSourceType2["Legend"] = "legend";
    AXValueNativeSourceType2["Rubyannotation"] = "rubyannotation";
    AXValueNativeSourceType2["Tablecaption"] = "tablecaption";
    AXValueNativeSourceType2["Title"] = "title";
    AXValueNativeSourceType2["Other"] = "other";
  })(AXValueNativeSourceType = Accessibility2.AXValueNativeSourceType || (Accessibility2.AXValueNativeSourceType = {}));
  let AXPropertyName;
  ((AXPropertyName2) => {
    AXPropertyName2["Actions"] = "actions";
    AXPropertyName2["Busy"] = "busy";
    AXPropertyName2["Disabled"] = "disabled";
    AXPropertyName2["Editable"] = "editable";
    AXPropertyName2["Focusable"] = "focusable";
    AXPropertyName2["Focused"] = "focused";
    AXPropertyName2["Hidden"] = "hidden";
    AXPropertyName2["HiddenRoot"] = "hiddenRoot";
    AXPropertyName2["Invalid"] = "invalid";
    AXPropertyName2["Keyshortcuts"] = "keyshortcuts";
    AXPropertyName2["Settable"] = "settable";
    AXPropertyName2["Roledescription"] = "roledescription";
    AXPropertyName2["Live"] = "live";
    AXPropertyName2["Atomic"] = "atomic";
    AXPropertyName2["Relevant"] = "relevant";
    AXPropertyName2["Root"] = "root";
    AXPropertyName2["Autocomplete"] = "autocomplete";
    AXPropertyName2["HasPopup"] = "hasPopup";
    AXPropertyName2["Level"] = "level";
    AXPropertyName2["Multiselectable"] = "multiselectable";
    AXPropertyName2["Orientation"] = "orientation";
    AXPropertyName2["Multiline"] = "multiline";
    AXPropertyName2["Readonly"] = "readonly";
    AXPropertyName2["Required"] = "required";
    AXPropertyName2["Valuemin"] = "valuemin";
    AXPropertyName2["Valuemax"] = "valuemax";
    AXPropertyName2["Valuetext"] = "valuetext";
    AXPropertyName2["Checked"] = "checked";
    AXPropertyName2["Expanded"] = "expanded";
    AXPropertyName2["Modal"] = "modal";
    AXPropertyName2["Pressed"] = "pressed";
    AXPropertyName2["Selected"] = "selected";
    AXPropertyName2["Activedescendant"] = "activedescendant";
    AXPropertyName2["Controls"] = "controls";
    AXPropertyName2["Describedby"] = "describedby";
    AXPropertyName2["Details"] = "details";
    AXPropertyName2["Errormessage"] = "errormessage";
    AXPropertyName2["Flowto"] = "flowto";
    AXPropertyName2["Labelledby"] = "labelledby";
    AXPropertyName2["Owns"] = "owns";
    AXPropertyName2["Url"] = "url";
    AXPropertyName2["ActiveFullscreenElement"] = "activeFullscreenElement";
    AXPropertyName2["ActiveModalDialog"] = "activeModalDialog";
    AXPropertyName2["ActiveAriaModalDialog"] = "activeAriaModalDialog";
    AXPropertyName2["AriaHiddenElement"] = "ariaHiddenElement";
    AXPropertyName2["AriaHiddenSubtree"] = "ariaHiddenSubtree";
    AXPropertyName2["EmptyAlt"] = "emptyAlt";
    AXPropertyName2["EmptyText"] = "emptyText";
    AXPropertyName2["InertElement"] = "inertElement";
    AXPropertyName2["InertSubtree"] = "inertSubtree";
    AXPropertyName2["LabelContainer"] = "labelContainer";
    AXPropertyName2["LabelFor"] = "labelFor";
    AXPropertyName2["NotRendered"] = "notRendered";
    AXPropertyName2["NotVisible"] = "notVisible";
    AXPropertyName2["PresentationalRole"] = "presentationalRole";
    AXPropertyName2["ProbablyPresentational"] = "probablyPresentational";
    AXPropertyName2["InactiveCarouselTabContent"] = "inactiveCarouselTabContent";
    AXPropertyName2["Uninteresting"] = "uninteresting";
  })(AXPropertyName = Accessibility2.AXPropertyName || (Accessibility2.AXPropertyName = {}));
})(Accessibility || (Accessibility = {}));
var Animation;
((Animation2) => {
  let AnimationType;
  ((AnimationType2) => {
    AnimationType2["CSSTransition"] = "CSSTransition";
    AnimationType2["CSSAnimation"] = "CSSAnimation";
    AnimationType2["WebAnimation"] = "WebAnimation";
  })(AnimationType = Animation2.AnimationType || (Animation2.AnimationType = {}));
})(Animation || (Animation = {}));
var Audits;
((Audits2) => {
  let CookieExclusionReason;
  ((CookieExclusionReason2) => {
    CookieExclusionReason2["ExcludeSameSiteUnspecifiedTreatedAsLax"] = "ExcludeSameSiteUnspecifiedTreatedAsLax";
    CookieExclusionReason2["ExcludeSameSiteNoneInsecure"] = "ExcludeSameSiteNoneInsecure";
    CookieExclusionReason2["ExcludeSameSiteLax"] = "ExcludeSameSiteLax";
    CookieExclusionReason2["ExcludeSameSiteStrict"] = "ExcludeSameSiteStrict";
    CookieExclusionReason2["ExcludeDomainNonASCII"] = "ExcludeDomainNonASCII";
    CookieExclusionReason2["ExcludeThirdPartyCookieBlockedInFirstPartySet"] = "ExcludeThirdPartyCookieBlockedInFirstPartySet";
    CookieExclusionReason2["ExcludeThirdPartyPhaseout"] = "ExcludeThirdPartyPhaseout";
    CookieExclusionReason2["ExcludePortMismatch"] = "ExcludePortMismatch";
    CookieExclusionReason2["ExcludeSchemeMismatch"] = "ExcludeSchemeMismatch";
  })(CookieExclusionReason = Audits2.CookieExclusionReason || (Audits2.CookieExclusionReason = {}));
  let CookieWarningReason;
  ((CookieWarningReason2) => {
    CookieWarningReason2["WarnSameSiteUnspecifiedCrossSiteContext"] = "WarnSameSiteUnspecifiedCrossSiteContext";
    CookieWarningReason2["WarnSameSiteNoneInsecure"] = "WarnSameSiteNoneInsecure";
    CookieWarningReason2["WarnSameSiteUnspecifiedLaxAllowUnsafe"] = "WarnSameSiteUnspecifiedLaxAllowUnsafe";
    CookieWarningReason2["WarnSameSiteStrictLaxDowngradeStrict"] = "WarnSameSiteStrictLaxDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeStrict"] = "WarnSameSiteStrictCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeLax"] = "WarnSameSiteStrictCrossDowngradeLax";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeStrict"] = "WarnSameSiteLaxCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeLax"] = "WarnSameSiteLaxCrossDowngradeLax";
    CookieWarningReason2["WarnAttributeValueExceedsMaxSize"] = "WarnAttributeValueExceedsMaxSize";
    CookieWarningReason2["WarnDomainNonASCII"] = "WarnDomainNonASCII";
    CookieWarningReason2["WarnThirdPartyPhaseout"] = "WarnThirdPartyPhaseout";
    CookieWarningReason2["WarnCrossSiteRedirectDowngradeChangesInclusion"] = "WarnCrossSiteRedirectDowngradeChangesInclusion";
    CookieWarningReason2["WarnDeprecationTrialMetadata"] = "WarnDeprecationTrialMetadata";
    CookieWarningReason2["WarnThirdPartyCookieHeuristic"] = "WarnThirdPartyCookieHeuristic";
  })(CookieWarningReason = Audits2.CookieWarningReason || (Audits2.CookieWarningReason = {}));
  let CookieOperation;
  ((CookieOperation2) => {
    CookieOperation2["SetCookie"] = "SetCookie";
    CookieOperation2["ReadCookie"] = "ReadCookie";
  })(CookieOperation = Audits2.CookieOperation || (Audits2.CookieOperation = {}));
  let InsightType;
  ((InsightType2) => {
    InsightType2["GitHubResource"] = "GitHubResource";
    InsightType2["GracePeriod"] = "GracePeriod";
    InsightType2["Heuristics"] = "Heuristics";
  })(InsightType = Audits2.InsightType || (Audits2.InsightType = {}));
  let PerformanceIssueType;
  ((PerformanceIssueType2) => {
    PerformanceIssueType2["DocumentCookie"] = "DocumentCookie";
  })(PerformanceIssueType = Audits2.PerformanceIssueType || (Audits2.PerformanceIssueType = {}));
  let MixedContentResolutionStatus;
  ((MixedContentResolutionStatus2) => {
    MixedContentResolutionStatus2["MixedContentBlocked"] = "MixedContentBlocked";
    MixedContentResolutionStatus2["MixedContentAutomaticallyUpgraded"] = "MixedContentAutomaticallyUpgraded";
    MixedContentResolutionStatus2["MixedContentWarning"] = "MixedContentWarning";
  })(MixedContentResolutionStatus = Audits2.MixedContentResolutionStatus || (Audits2.MixedContentResolutionStatus = {}));
  let MixedContentResourceType;
  ((MixedContentResourceType2) => {
    MixedContentResourceType2["Audio"] = "Audio";
    MixedContentResourceType2["Beacon"] = "Beacon";
    MixedContentResourceType2["CSPReport"] = "CSPReport";
    MixedContentResourceType2["Download"] = "Download";
    MixedContentResourceType2["EventSource"] = "EventSource";
    MixedContentResourceType2["Favicon"] = "Favicon";
    MixedContentResourceType2["Font"] = "Font";
    MixedContentResourceType2["Form"] = "Form";
    MixedContentResourceType2["Frame"] = "Frame";
    MixedContentResourceType2["Image"] = "Image";
    MixedContentResourceType2["Import"] = "Import";
    MixedContentResourceType2["JSON"] = "JSON";
    MixedContentResourceType2["Manifest"] = "Manifest";
    MixedContentResourceType2["Ping"] = "Ping";
    MixedContentResourceType2["PluginData"] = "PluginData";
    MixedContentResourceType2["PluginResource"] = "PluginResource";
    MixedContentResourceType2["Prefetch"] = "Prefetch";
    MixedContentResourceType2["Resource"] = "Resource";
    MixedContentResourceType2["Script"] = "Script";
    MixedContentResourceType2["ServiceWorker"] = "ServiceWorker";
    MixedContentResourceType2["SharedWorker"] = "SharedWorker";
    MixedContentResourceType2["SpeculationRules"] = "SpeculationRules";
    MixedContentResourceType2["Stylesheet"] = "Stylesheet";
    MixedContentResourceType2["Track"] = "Track";
    MixedContentResourceType2["Video"] = "Video";
    MixedContentResourceType2["Worker"] = "Worker";
    MixedContentResourceType2["XMLHttpRequest"] = "XMLHttpRequest";
    MixedContentResourceType2["XSLT"] = "XSLT";
  })(MixedContentResourceType = Audits2.MixedContentResourceType || (Audits2.MixedContentResourceType = {}));
  let BlockedByResponseReason;
  ((BlockedByResponseReason2) => {
    BlockedByResponseReason2["CoepFrameResourceNeedsCoepHeader"] = "CoepFrameResourceNeedsCoepHeader";
    BlockedByResponseReason2["CoopSandboxedIFrameCannotNavigateToCoopPage"] = "CoopSandboxedIFrameCannotNavigateToCoopPage";
    BlockedByResponseReason2["CorpNotSameOrigin"] = "CorpNotSameOrigin";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByDip";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip";
    BlockedByResponseReason2["CorpNotSameSite"] = "CorpNotSameSite";
    BlockedByResponseReason2["SRIMessageSignatureMismatch"] = "SRIMessageSignatureMismatch";
  })(BlockedByResponseReason = Audits2.BlockedByResponseReason || (Audits2.BlockedByResponseReason = {}));
  let HeavyAdResolutionStatus;
  ((HeavyAdResolutionStatus2) => {
    HeavyAdResolutionStatus2["HeavyAdBlocked"] = "HeavyAdBlocked";
    HeavyAdResolutionStatus2["HeavyAdWarning"] = "HeavyAdWarning";
  })(HeavyAdResolutionStatus = Audits2.HeavyAdResolutionStatus || (Audits2.HeavyAdResolutionStatus = {}));
  let HeavyAdReason;
  ((HeavyAdReason2) => {
    HeavyAdReason2["NetworkTotalLimit"] = "NetworkTotalLimit";
    HeavyAdReason2["CpuTotalLimit"] = "CpuTotalLimit";
    HeavyAdReason2["CpuPeakLimit"] = "CpuPeakLimit";
  })(HeavyAdReason = Audits2.HeavyAdReason || (Audits2.HeavyAdReason = {}));
  let ContentSecurityPolicyViolationType;
  ((ContentSecurityPolicyViolationType2) => {
    ContentSecurityPolicyViolationType2["KInlineViolation"] = "kInlineViolation";
    ContentSecurityPolicyViolationType2["KEvalViolation"] = "kEvalViolation";
    ContentSecurityPolicyViolationType2["KURLViolation"] = "kURLViolation";
    ContentSecurityPolicyViolationType2["KSRIViolation"] = "kSRIViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesSinkViolation"] = "kTrustedTypesSinkViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesPolicyViolation"] = "kTrustedTypesPolicyViolation";
    ContentSecurityPolicyViolationType2["KWasmEvalViolation"] = "kWasmEvalViolation";
  })(ContentSecurityPolicyViolationType = Audits2.ContentSecurityPolicyViolationType || (Audits2.ContentSecurityPolicyViolationType = {}));
  let SharedArrayBufferIssueType;
  ((SharedArrayBufferIssueType2) => {
    SharedArrayBufferIssueType2["TransferIssue"] = "TransferIssue";
    SharedArrayBufferIssueType2["CreationIssue"] = "CreationIssue";
  })(SharedArrayBufferIssueType = Audits2.SharedArrayBufferIssueType || (Audits2.SharedArrayBufferIssueType = {}));
  let SharedDictionaryError;
  ((SharedDictionaryError2) => {
    SharedDictionaryError2["UseErrorCrossOriginNoCorsRequest"] = "UseErrorCrossOriginNoCorsRequest";
    SharedDictionaryError2["UseErrorDictionaryLoadFailure"] = "UseErrorDictionaryLoadFailure";
    SharedDictionaryError2["UseErrorMatchingDictionaryNotUsed"] = "UseErrorMatchingDictionaryNotUsed";
    SharedDictionaryError2["UseErrorUnexpectedContentDictionaryHeader"] = "UseErrorUnexpectedContentDictionaryHeader";
    SharedDictionaryError2["WriteErrorCossOriginNoCorsRequest"] = "WriteErrorCossOriginNoCorsRequest";
    SharedDictionaryError2["WriteErrorDisallowedBySettings"] = "WriteErrorDisallowedBySettings";
    SharedDictionaryError2["WriteErrorExpiredResponse"] = "WriteErrorExpiredResponse";
    SharedDictionaryError2["WriteErrorFeatureDisabled"] = "WriteErrorFeatureDisabled";
    SharedDictionaryError2["WriteErrorInsufficientResources"] = "WriteErrorInsufficientResources";
    SharedDictionaryError2["WriteErrorInvalidMatchField"] = "WriteErrorInvalidMatchField";
    SharedDictionaryError2["WriteErrorInvalidStructuredHeader"] = "WriteErrorInvalidStructuredHeader";
    SharedDictionaryError2["WriteErrorInvalidTTLField"] = "WriteErrorInvalidTTLField";
    SharedDictionaryError2["WriteErrorNavigationRequest"] = "WriteErrorNavigationRequest";
    SharedDictionaryError2["WriteErrorNoMatchField"] = "WriteErrorNoMatchField";
    SharedDictionaryError2["WriteErrorNonIntegerTTLField"] = "WriteErrorNonIntegerTTLField";
    SharedDictionaryError2["WriteErrorNonListMatchDestField"] = "WriteErrorNonListMatchDestField";
    SharedDictionaryError2["WriteErrorNonSecureContext"] = "WriteErrorNonSecureContext";
    SharedDictionaryError2["WriteErrorNonStringIdField"] = "WriteErrorNonStringIdField";
    SharedDictionaryError2["WriteErrorNonStringInMatchDestList"] = "WriteErrorNonStringInMatchDestList";
    SharedDictionaryError2["WriteErrorInvalidMatchDestList"] = "WriteErrorInvalidMatchDestList";
    SharedDictionaryError2["WriteErrorNonStringMatchField"] = "WriteErrorNonStringMatchField";
    SharedDictionaryError2["WriteErrorNonTokenTypeField"] = "WriteErrorNonTokenTypeField";
    SharedDictionaryError2["WriteErrorRequestAborted"] = "WriteErrorRequestAborted";
    SharedDictionaryError2["WriteErrorShuttingDown"] = "WriteErrorShuttingDown";
    SharedDictionaryError2["WriteErrorTooLongIdField"] = "WriteErrorTooLongIdField";
    SharedDictionaryError2["WriteErrorUnsupportedType"] = "WriteErrorUnsupportedType";
  })(SharedDictionaryError = Audits2.SharedDictionaryError || (Audits2.SharedDictionaryError = {}));
  let SRIMessageSignatureError;
  ((SRIMessageSignatureError2) => {
    SRIMessageSignatureError2["MissingSignatureHeader"] = "MissingSignatureHeader";
    SRIMessageSignatureError2["MissingSignatureInputHeader"] = "MissingSignatureInputHeader";
    SRIMessageSignatureError2["InvalidSignatureHeader"] = "InvalidSignatureHeader";
    SRIMessageSignatureError2["InvalidSignatureInputHeader"] = "InvalidSignatureInputHeader";
    SRIMessageSignatureError2["SignatureHeaderValueIsNotByteSequence"] = "SignatureHeaderValueIsNotByteSequence";
    SRIMessageSignatureError2["SignatureHeaderValueIsParameterized"] = "SignatureHeaderValueIsParameterized";
    SRIMessageSignatureError2["SignatureHeaderValueIsIncorrectLength"] = "SignatureHeaderValueIsIncorrectLength";
    SRIMessageSignatureError2["SignatureInputHeaderMissingLabel"] = "SignatureInputHeaderMissingLabel";
    SRIMessageSignatureError2["SignatureInputHeaderValueNotInnerList"] = "SignatureInputHeaderValueNotInnerList";
    SRIMessageSignatureError2["SignatureInputHeaderValueMissingComponents"] = "SignatureInputHeaderValueMissingComponents";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentType"] = "SignatureInputHeaderInvalidComponentType";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentName"] = "SignatureInputHeaderInvalidComponentName";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidHeaderComponentParameter"] = "SignatureInputHeaderInvalidHeaderComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidDerivedComponentParameter"] = "SignatureInputHeaderInvalidDerivedComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderKeyIdLength"] = "SignatureInputHeaderKeyIdLength";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidParameter"] = "SignatureInputHeaderInvalidParameter";
    SRIMessageSignatureError2["SignatureInputHeaderMissingRequiredParameters"] = "SignatureInputHeaderMissingRequiredParameters";
    SRIMessageSignatureError2["ValidationFailedSignatureExpired"] = "ValidationFailedSignatureExpired";
    SRIMessageSignatureError2["ValidationFailedInvalidLength"] = "ValidationFailedInvalidLength";
    SRIMessageSignatureError2["ValidationFailedSignatureMismatch"] = "ValidationFailedSignatureMismatch";
    SRIMessageSignatureError2["ValidationFailedIntegrityMismatch"] = "ValidationFailedIntegrityMismatch";
    SRIMessageSignatureError2["SignatureBaseUnknownDerivedComponent"] = "SignatureBaseUnknownDerivedComponent";
    SRIMessageSignatureError2["SignatureBaseMissingHeader"] = "SignatureBaseMissingHeader";
    SRIMessageSignatureError2["SignatureBaseInvalidUnencodedDigest"] = "SignatureBaseInvalidUnencodedDigest";
    SRIMessageSignatureError2["SignatureBaseUnsupportedComponent"] = "SignatureBaseUnsupportedComponent";
  })(SRIMessageSignatureError = Audits2.SRIMessageSignatureError || (Audits2.SRIMessageSignatureError = {}));
  let UnencodedDigestError;
  ((UnencodedDigestError2) => {
    UnencodedDigestError2["MalformedDictionary"] = "MalformedDictionary";
    UnencodedDigestError2["UnknownAlgorithm"] = "UnknownAlgorithm";
    UnencodedDigestError2["IncorrectDigestType"] = "IncorrectDigestType";
    UnencodedDigestError2["IncorrectDigestLength"] = "IncorrectDigestLength";
  })(UnencodedDigestError = Audits2.UnencodedDigestError || (Audits2.UnencodedDigestError = {}));
  let ConnectionAllowlistError;
  ((ConnectionAllowlistError2) => {
    ConnectionAllowlistError2["InvalidHeader"] = "InvalidHeader";
    ConnectionAllowlistError2["MoreThanOneList"] = "MoreThanOneList";
    ConnectionAllowlistError2["ItemNotInnerList"] = "ItemNotInnerList";
    ConnectionAllowlistError2["InvalidAllowlistItemType"] = "InvalidAllowlistItemType";
    ConnectionAllowlistError2["ReportingEndpointNotToken"] = "ReportingEndpointNotToken";
    ConnectionAllowlistError2["InvalidUrlPattern"] = "InvalidUrlPattern";
    ConnectionAllowlistError2["IFrameAttributeLoosensEmbeddingRequirement"] = "IFrameAttributeLoosensEmbeddingRequirement";
    ConnectionAllowlistError2["InvalidAllowConnectionAllowlistFrom"] = "InvalidAllowConnectionAllowlistFrom";
    ConnectionAllowlistError2["EmbeddingRequirementNotSatisfied"] = "EmbeddingRequirementNotSatisfied";
  })(ConnectionAllowlistError = Audits2.ConnectionAllowlistError || (Audits2.ConnectionAllowlistError = {}));
  let GenericIssueErrorType;
  ((GenericIssueErrorType2) => {
    GenericIssueErrorType2["FormLabelForNameError"] = "FormLabelForNameError";
    GenericIssueErrorType2["FormDuplicateIdForInputError"] = "FormDuplicateIdForInputError";
    GenericIssueErrorType2["FormInputWithNoLabelError"] = "FormInputWithNoLabelError";
    GenericIssueErrorType2["FormAutocompleteAttributeEmptyError"] = "FormAutocompleteAttributeEmptyError";
    GenericIssueErrorType2["FormEmptyIdAndNameAttributesForInputError"] = "FormEmptyIdAndNameAttributesForInputError";
    GenericIssueErrorType2["FormAriaLabelledByToNonExistingIdError"] = "FormAriaLabelledByToNonExistingIdError";
    GenericIssueErrorType2["FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = "FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
    GenericIssueErrorType2["FormLabelHasNeitherForNorNestedInputError"] = "FormLabelHasNeitherForNorNestedInputError";
    GenericIssueErrorType2["FormLabelForMatchesNonExistingIdError"] = "FormLabelForMatchesNonExistingIdError";
    GenericIssueErrorType2["FormInputHasWrongButWellIntendedAutocompleteValueError"] = "FormInputHasWrongButWellIntendedAutocompleteValueError";
    GenericIssueErrorType2["ResponseWasBlockedByORB"] = "ResponseWasBlockedByORB";
    GenericIssueErrorType2["NavigationEntryMarkedSkippable"] = "NavigationEntryMarkedSkippable";
    GenericIssueErrorType2["BackUINavigationWouldSkipAd"] = "BackUINavigationWouldSkipAd";
    GenericIssueErrorType2["AutofillAndManualTextPolicyControlledFeaturesInfo"] = "AutofillAndManualTextPolicyControlledFeaturesInfo";
    GenericIssueErrorType2["AutofillPolicyControlledFeatureInfo"] = "AutofillPolicyControlledFeatureInfo";
    GenericIssueErrorType2["ManualTextPolicyControlledFeatureInfo"] = "ManualTextPolicyControlledFeatureInfo";
    GenericIssueErrorType2["FormModelContextParameterMissingTitleAndDescription"] = "FormModelContextParameterMissingTitleAndDescription";
    GenericIssueErrorType2["FormModelContextMissingToolName"] = "FormModelContextMissingToolName";
    GenericIssueErrorType2["FormModelContextMissingToolDescription"] = "FormModelContextMissingToolDescription";
    GenericIssueErrorType2["FormModelContextRequiredParameterMissingName"] = "FormModelContextRequiredParameterMissingName";
    GenericIssueErrorType2["FormModelContextParameterMissingName"] = "FormModelContextParameterMissingName";
  })(GenericIssueErrorType = Audits2.GenericIssueErrorType || (Audits2.GenericIssueErrorType = {}));
  let ClientHintIssueReason;
  ((ClientHintIssueReason2) => {
    ClientHintIssueReason2["MetaTagAllowListInvalidOrigin"] = "MetaTagAllowListInvalidOrigin";
    ClientHintIssueReason2["MetaTagModifiedHTML"] = "MetaTagModifiedHTML";
  })(ClientHintIssueReason = Audits2.ClientHintIssueReason || (Audits2.ClientHintIssueReason = {}));
  let FederatedAuthRequestIssueReason;
  ((FederatedAuthRequestIssueReason2) => {
    FederatedAuthRequestIssueReason2["ShouldEmbargo"] = "ShouldEmbargo";
    FederatedAuthRequestIssueReason2["TooManyRequests"] = "TooManyRequests";
    FederatedAuthRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    FederatedAuthRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    FederatedAuthRequestIssueReason2["WellKnownBlockedByConnectionAllowlist"] = "WellKnownBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    FederatedAuthRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    FederatedAuthRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    FederatedAuthRequestIssueReason2["ConfigNotInWellKnown"] = "ConfigNotInWellKnown";
    FederatedAuthRequestIssueReason2["WellKnownTooBig"] = "WellKnownTooBig";
    FederatedAuthRequestIssueReason2["ConfigHttpNotFound"] = "ConfigHttpNotFound";
    FederatedAuthRequestIssueReason2["ConfigNoResponse"] = "ConfigNoResponse";
    FederatedAuthRequestIssueReason2["ConfigBlockedByConnectionAllowlist"] = "ConfigBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["ConfigInvalidResponse"] = "ConfigInvalidResponse";
    FederatedAuthRequestIssueReason2["ConfigInvalidContentType"] = "ConfigInvalidContentType";
    FederatedAuthRequestIssueReason2["IdpNotPotentiallyTrustworthy"] = "IdpNotPotentiallyTrustworthy";
    FederatedAuthRequestIssueReason2["DisabledInSettings"] = "DisabledInSettings";
    FederatedAuthRequestIssueReason2["DisabledInFlags"] = "DisabledInFlags";
    FederatedAuthRequestIssueReason2["ErrorFetchingSignin"] = "ErrorFetchingSignin";
    FederatedAuthRequestIssueReason2["InvalidSigninResponse"] = "InvalidSigninResponse";
    FederatedAuthRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    FederatedAuthRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    FederatedAuthRequestIssueReason2["AccountsBlockedByConnectionAllowlist"] = "AccountsBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    FederatedAuthRequestIssueReason2["AccountsListEmpty"] = "AccountsListEmpty";
    FederatedAuthRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    FederatedAuthRequestIssueReason2["IdTokenHttpNotFound"] = "IdTokenHttpNotFound";
    FederatedAuthRequestIssueReason2["IdTokenNoResponse"] = "IdTokenNoResponse";
    FederatedAuthRequestIssueReason2["IdTokenBlockedByConnectionAllowlist"] = "IdTokenBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["IdTokenInvalidResponse"] = "IdTokenInvalidResponse";
    FederatedAuthRequestIssueReason2["IdTokenIdpErrorResponse"] = "IdTokenIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenCrossSiteIdpErrorResponse"] = "IdTokenCrossSiteIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenInvalidRequest"] = "IdTokenInvalidRequest";
    FederatedAuthRequestIssueReason2["IdTokenInvalidContentType"] = "IdTokenInvalidContentType";
    FederatedAuthRequestIssueReason2["ErrorIdToken"] = "ErrorIdToken";
    FederatedAuthRequestIssueReason2["Canceled"] = "Canceled";
    FederatedAuthRequestIssueReason2["RpPageNotVisible"] = "RpPageNotVisible";
    FederatedAuthRequestIssueReason2["SilentMediationFailure"] = "SilentMediationFailure";
    FederatedAuthRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthRequestIssueReason2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
    FederatedAuthRequestIssueReason2["ReplacedByActiveMode"] = "ReplacedByActiveMode";
    FederatedAuthRequestIssueReason2["RelyingPartyOriginIsOpaque"] = "RelyingPartyOriginIsOpaque";
    FederatedAuthRequestIssueReason2["TypeNotMatching"] = "TypeNotMatching";
    FederatedAuthRequestIssueReason2["UiDismissedNoEmbargo"] = "UiDismissedNoEmbargo";
    FederatedAuthRequestIssueReason2["CorsError"] = "CorsError";
    FederatedAuthRequestIssueReason2["SuppressedBySegmentationPlatform"] = "SuppressedBySegmentationPlatform";
  })(FederatedAuthRequestIssueReason = Audits2.FederatedAuthRequestIssueReason || (Audits2.FederatedAuthRequestIssueReason = {}));
  let FederatedAuthUserInfoRequestIssueReason;
  ((FederatedAuthUserInfoRequestIssueReason2) => {
    FederatedAuthUserInfoRequestIssueReason2["NotSameOrigin"] = "NotSameOrigin";
    FederatedAuthUserInfoRequestIssueReason2["NotIframe"] = "NotIframe";
    FederatedAuthUserInfoRequestIssueReason2["NotPotentiallyTrustworthy"] = "NotPotentiallyTrustworthy";
    FederatedAuthUserInfoRequestIssueReason2["NoAPIPermission"] = "NoApiPermission";
    FederatedAuthUserInfoRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthUserInfoRequestIssueReason2["NoAccountSharingPermission"] = "NoAccountSharingPermission";
    FederatedAuthUserInfoRequestIssueReason2["InvalidConfigOrWellKnown"] = "InvalidConfigOrWellKnown";
    FederatedAuthUserInfoRequestIssueReason2["InvalidAccountsResponse"] = "InvalidAccountsResponse";
    FederatedAuthUserInfoRequestIssueReason2["NoReturningUserFromFetchedAccounts"] = "NoReturningUserFromFetchedAccounts";
  })(FederatedAuthUserInfoRequestIssueReason = Audits2.FederatedAuthUserInfoRequestIssueReason || (Audits2.FederatedAuthUserInfoRequestIssueReason = {}));
  let EmailVerificationRequestIssueReason;
  ((EmailVerificationRequestIssueReason2) => {
    EmailVerificationRequestIssueReason2["InvalidEmail"] = "InvalidEmail";
    EmailVerificationRequestIssueReason2["DnsFetchFailed"] = "DnsFetchFailed";
    EmailVerificationRequestIssueReason2["DnsInvalidRecord"] = "DnsInvalidRecord";
    EmailVerificationRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    EmailVerificationRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    EmailVerificationRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["WellKnownMissingIssuanceEndpoint"] = "WellKnownMissingIssuanceEndpoint";
    EmailVerificationRequestIssueReason2["WellKnownIssuanceEndpointCrossOrigin"] = "WellKnownIssuanceEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["WellKnownUnsupportedSigningAlgorithm"] = "WellKnownUnsupportedSigningAlgorithm";
    EmailVerificationRequestIssueReason2["TokenHttpNotFound"] = "TokenHttpNotFound";
    EmailVerificationRequestIssueReason2["TokenNoResponse"] = "TokenNoResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidResponse"] = "TokenInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidContentType"] = "TokenInvalidContentType";
    EmailVerificationRequestIssueReason2["TokenMalformedSdJwt"] = "TokenMalformedSdJwt";
    EmailVerificationRequestIssueReason2["TokenInvalidSdJwt"] = "TokenInvalidSdJwt";
    EmailVerificationRequestIssueReason2["KeyBindingSigningFailed"] = "KeyBindingSigningFailed";
    EmailVerificationRequestIssueReason2["RpOriginIsOpaque"] = "RpOriginIsOpaque";
    EmailVerificationRequestIssueReason2["WellKnownMissingAccountsEndpoint"] = "WellKnownMissingAccountsEndpoint";
    EmailVerificationRequestIssueReason2["UserLoggedOut"] = "UserLoggedOut";
    EmailVerificationRequestIssueReason2["WellKnownAccountsEndpointCrossOrigin"] = "WellKnownAccountsEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    EmailVerificationRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    EmailVerificationRequestIssueReason2["AccountsEmptyList"] = "AccountsEmptyList";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownHttpNotFound"] = "EmailVerificationWellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownNoResponse"] = "EmailVerificationWellKnownNoResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidResponse"] = "EmailVerificationWellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidContentType"] = "EmailVerificationWellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["JwksHttpNotFound"] = "JwksHttpNotFound";
    EmailVerificationRequestIssueReason2["JwksInvalidResponse"] = "JwksInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtUnsupportedHeaderAlg"] = "TokenVerificationSdJwtUnsupportedHeaderAlg";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidTyp"] = "TokenVerificationSdJwtInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIss"] = "TokenVerificationSdJwtMissingIss";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIat"] = "TokenVerificationSdJwtMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingCnf"] = "TokenVerificationSdJwtMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingEmail"] = "TokenVerificationSdJwtMissingEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuedAt"] = "TokenVerificationSdJwtInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuer"] = "TokenVerificationSdJwtInvalidIssuer";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtJwksMissingKeys"] = "TokenVerificationSdJwtJwksMissingKeys";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtSignatureFailed"] = "TokenVerificationSdJwtSignatureFailed";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmailVerified"] = "TokenVerificationSdJwtInvalidEmailVerified";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmail"] = "TokenVerificationSdJwtInvalidEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidHolderKey"] = "TokenVerificationSdJwtInvalidHolderKey";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidTyp"] = "TokenVerificationKbInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingAud"] = "TokenVerificationKbMissingAud";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingNonce"] = "TokenVerificationKbMissingNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingIat"] = "TokenVerificationKbMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingSdHash"] = "TokenVerificationKbMissingSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidIssuedAt"] = "TokenVerificationKbInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidAudience"] = "TokenVerificationKbInvalidAudience";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidNonce"] = "TokenVerificationKbInvalidNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidSdHash"] = "TokenVerificationKbInvalidSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingCnf"] = "TokenVerificationKbMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationKbSignatureFailed"] = "TokenVerificationKbSignatureFailed";
  })(EmailVerificationRequestIssueReason = Audits2.EmailVerificationRequestIssueReason || (Audits2.EmailVerificationRequestIssueReason = {}));
  let PartitioningBlobURLInfo;
  ((PartitioningBlobURLInfo2) => {
    PartitioningBlobURLInfo2["BlockedCrossPartitionFetching"] = "BlockedCrossPartitionFetching";
    PartitioningBlobURLInfo2["EnforceNoopenerForNavigation"] = "EnforceNoopenerForNavigation";
  })(PartitioningBlobURLInfo = Audits2.PartitioningBlobURLInfo || (Audits2.PartitioningBlobURLInfo = {}));
  let ElementAccessibilityIssueReason;
  ((ElementAccessibilityIssueReason2) => {
    ElementAccessibilityIssueReason2["DisallowedSelectChild"] = "DisallowedSelectChild";
    ElementAccessibilityIssueReason2["DisallowedOptGroupChild"] = "DisallowedOptGroupChild";
    ElementAccessibilityIssueReason2["NonPhrasingContentOptionChild"] = "NonPhrasingContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentOptionChild"] = "InteractiveContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentLegendChild"] = "InteractiveContentLegendChild";
    ElementAccessibilityIssueReason2["InteractiveContentSummaryDescendant"] = "InteractiveContentSummaryDescendant";
  })(ElementAccessibilityIssueReason = Audits2.ElementAccessibilityIssueReason || (Audits2.ElementAccessibilityIssueReason = {}));
  let StyleSheetLoadingIssueReason;
  ((StyleSheetLoadingIssueReason2) => {
    StyleSheetLoadingIssueReason2["LateImportRule"] = "LateImportRule";
    StyleSheetLoadingIssueReason2["RequestFailed"] = "RequestFailed";
  })(StyleSheetLoadingIssueReason = Audits2.StyleSheetLoadingIssueReason || (Audits2.StyleSheetLoadingIssueReason = {}));
  let PropertyRuleIssueReason;
  ((PropertyRuleIssueReason2) => {
    PropertyRuleIssueReason2["InvalidSyntax"] = "InvalidSyntax";
    PropertyRuleIssueReason2["InvalidInitialValue"] = "InvalidInitialValue";
    PropertyRuleIssueReason2["InvalidInherits"] = "InvalidInherits";
    PropertyRuleIssueReason2["InvalidName"] = "InvalidName";
  })(PropertyRuleIssueReason = Audits2.PropertyRuleIssueReason || (Audits2.PropertyRuleIssueReason = {}));
  let UserReidentificationIssueType;
  ((UserReidentificationIssueType2) => {
    UserReidentificationIssueType2["BlockedFrameNavigation"] = "BlockedFrameNavigation";
    UserReidentificationIssueType2["BlockedSubresource"] = "BlockedSubresource";
    UserReidentificationIssueType2["NoisedCanvasReadback"] = "NoisedCanvasReadback";
  })(UserReidentificationIssueType = Audits2.UserReidentificationIssueType || (Audits2.UserReidentificationIssueType = {}));
  let PermissionElementIssueType;
  ((PermissionElementIssueType2) => {
    PermissionElementIssueType2["InvalidType"] = "InvalidType";
    PermissionElementIssueType2["FencedFrameDisallowed"] = "FencedFrameDisallowed";
    PermissionElementIssueType2["CspFrameAncestorsMissing"] = "CspFrameAncestorsMissing";
    PermissionElementIssueType2["PermissionsPolicyBlocked"] = "PermissionsPolicyBlocked";
    PermissionElementIssueType2["PaddingRightUnsupported"] = "PaddingRightUnsupported";
    PermissionElementIssueType2["PaddingBottomUnsupported"] = "PaddingBottomUnsupported";
    PermissionElementIssueType2["InsetBoxShadowUnsupported"] = "InsetBoxShadowUnsupported";
    PermissionElementIssueType2["RequestInProgress"] = "RequestInProgress";
    PermissionElementIssueType2["UntrustedEvent"] = "UntrustedEvent";
    PermissionElementIssueType2["RegistrationFailed"] = "RegistrationFailed";
    PermissionElementIssueType2["TypeNotSupported"] = "TypeNotSupported";
    PermissionElementIssueType2["InvalidTypeActivation"] = "InvalidTypeActivation";
    PermissionElementIssueType2["SecurityChecksFailed"] = "SecurityChecksFailed";
    PermissionElementIssueType2["ActivationDisabled"] = "ActivationDisabled";
    PermissionElementIssueType2["GeolocationDeprecated"] = "GeolocationDeprecated";
    PermissionElementIssueType2["InvalidDisplayStyle"] = "InvalidDisplayStyle";
    PermissionElementIssueType2["NonOpaqueColor"] = "NonOpaqueColor";
    PermissionElementIssueType2["LowContrast"] = "LowContrast";
    PermissionElementIssueType2["FontSizeTooSmall"] = "FontSizeTooSmall";
    PermissionElementIssueType2["FontSizeTooLarge"] = "FontSizeTooLarge";
    PermissionElementIssueType2["InvalidSizeValue"] = "InvalidSizeValue";
    PermissionElementIssueType2["NonSecureContext"] = "NonSecureContext";
    PermissionElementIssueType2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
  })(PermissionElementIssueType = Audits2.PermissionElementIssueType || (Audits2.PermissionElementIssueType = {}));
  let InspectorIssueCode;
  ((InspectorIssueCode2) => {
    InspectorIssueCode2["CookieIssue"] = "CookieIssue";
    InspectorIssueCode2["MixedContentIssue"] = "MixedContentIssue";
    InspectorIssueCode2["BlockedByResponseIssue"] = "BlockedByResponseIssue";
    InspectorIssueCode2["HeavyAdIssue"] = "HeavyAdIssue";
    InspectorIssueCode2["ContentSecurityPolicyIssue"] = "ContentSecurityPolicyIssue";
    InspectorIssueCode2["SharedArrayBufferIssue"] = "SharedArrayBufferIssue";
    InspectorIssueCode2["CorsIssue"] = "CorsIssue";
    InspectorIssueCode2["QuirksModeIssue"] = "QuirksModeIssue";
    InspectorIssueCode2["PartitioningBlobURLIssue"] = "PartitioningBlobURLIssue";
    InspectorIssueCode2["NavigatorUserAgentIssue"] = "NavigatorUserAgentIssue";
    InspectorIssueCode2["GenericIssue"] = "GenericIssue";
    InspectorIssueCode2["DeprecationIssue"] = "DeprecationIssue";
    InspectorIssueCode2["ClientHintIssue"] = "ClientHintIssue";
    InspectorIssueCode2["FederatedAuthRequestIssue"] = "FederatedAuthRequestIssue";
    InspectorIssueCode2["BounceTrackingIssue"] = "BounceTrackingIssue";
    InspectorIssueCode2["CookieDeprecationMetadataIssue"] = "CookieDeprecationMetadataIssue";
    InspectorIssueCode2["StylesheetLoadingIssue"] = "StylesheetLoadingIssue";
    InspectorIssueCode2["FederatedAuthUserInfoRequestIssue"] = "FederatedAuthUserInfoRequestIssue";
    InspectorIssueCode2["PropertyRuleIssue"] = "PropertyRuleIssue";
    InspectorIssueCode2["SharedDictionaryIssue"] = "SharedDictionaryIssue";
    InspectorIssueCode2["ElementAccessibilityIssue"] = "ElementAccessibilityIssue";
    InspectorIssueCode2["SRIMessageSignatureIssue"] = "SRIMessageSignatureIssue";
    InspectorIssueCode2["UnencodedDigestIssue"] = "UnencodedDigestIssue";
    InspectorIssueCode2["ConnectionAllowlistIssue"] = "ConnectionAllowlistIssue";
    InspectorIssueCode2["UserReidentificationIssue"] = "UserReidentificationIssue";
    InspectorIssueCode2["PermissionElementIssue"] = "PermissionElementIssue";
    InspectorIssueCode2["PerformanceIssue"] = "PerformanceIssue";
    InspectorIssueCode2["SelectivePermissionsInterventionIssue"] = "SelectivePermissionsInterventionIssue";
    InspectorIssueCode2["EmailVerificationRequestIssue"] = "EmailVerificationRequestIssue";
    InspectorIssueCode2["LazyLoadImageIssue"] = "LazyLoadImageIssue";
  })(InspectorIssueCode = Audits2.InspectorIssueCode || (Audits2.InspectorIssueCode = {}));
  let GetEncodedResponseRequestEncoding;
  ((GetEncodedResponseRequestEncoding2) => {
    GetEncodedResponseRequestEncoding2["Webp"] = "webp";
    GetEncodedResponseRequestEncoding2["Jpeg"] = "jpeg";
    GetEncodedResponseRequestEncoding2["Png"] = "png";
  })(GetEncodedResponseRequestEncoding = Audits2.GetEncodedResponseRequestEncoding || (Audits2.GetEncodedResponseRequestEncoding = {}));
})(Audits || (Audits = {}));
var Autofill;
((Autofill2) => {
  let FillingStrategy;
  ((FillingStrategy2) => {
    FillingStrategy2["AutocompleteAttribute"] = "autocompleteAttribute";
    FillingStrategy2["AutofillInferred"] = "autofillInferred";
  })(FillingStrategy = Autofill2.FillingStrategy || (Autofill2.FillingStrategy = {}));
})(Autofill || (Autofill = {}));
var BackgroundService;
((BackgroundService2) => {
  let ServiceName;
  ((ServiceName2) => {
    ServiceName2["BackgroundFetch"] = "backgroundFetch";
    ServiceName2["BackgroundSync"] = "backgroundSync";
    ServiceName2["PushMessaging"] = "pushMessaging";
    ServiceName2["Notifications"] = "notifications";
    ServiceName2["PaymentHandler"] = "paymentHandler";
    ServiceName2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
  })(ServiceName = BackgroundService2.ServiceName || (BackgroundService2.ServiceName = {}));
})(BackgroundService || (BackgroundService = {}));
var BluetoothEmulation;
((BluetoothEmulation2) => {
  let CentralState;
  ((CentralState2) => {
    CentralState2["Absent"] = "absent";
    CentralState2["PoweredOff"] = "powered-off";
    CentralState2["PoweredOn"] = "powered-on";
  })(CentralState = BluetoothEmulation2.CentralState || (BluetoothEmulation2.CentralState = {}));
  let GATTOperationType;
  ((GATTOperationType2) => {
    GATTOperationType2["Connection"] = "connection";
    GATTOperationType2["Discovery"] = "discovery";
  })(GATTOperationType = BluetoothEmulation2.GATTOperationType || (BluetoothEmulation2.GATTOperationType = {}));
  let CharacteristicWriteType;
  ((CharacteristicWriteType2) => {
    CharacteristicWriteType2["WriteDefaultDeprecated"] = "write-default-deprecated";
    CharacteristicWriteType2["WriteWithResponse"] = "write-with-response";
    CharacteristicWriteType2["WriteWithoutResponse"] = "write-without-response";
  })(CharacteristicWriteType = BluetoothEmulation2.CharacteristicWriteType || (BluetoothEmulation2.CharacteristicWriteType = {}));
  let CharacteristicOperationType;
  ((CharacteristicOperationType2) => {
    CharacteristicOperationType2["Read"] = "read";
    CharacteristicOperationType2["Write"] = "write";
    CharacteristicOperationType2["SubscribeToNotifications"] = "subscribe-to-notifications";
    CharacteristicOperationType2["UnsubscribeFromNotifications"] = "unsubscribe-from-notifications";
  })(CharacteristicOperationType = BluetoothEmulation2.CharacteristicOperationType || (BluetoothEmulation2.CharacteristicOperationType = {}));
  let DescriptorOperationType;
  ((DescriptorOperationType2) => {
    DescriptorOperationType2["Read"] = "read";
    DescriptorOperationType2["Write"] = "write";
  })(DescriptorOperationType = BluetoothEmulation2.DescriptorOperationType || (BluetoothEmulation2.DescriptorOperationType = {}));
})(BluetoothEmulation || (BluetoothEmulation = {}));
var Browser;
((Browser2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Browser2.WindowState || (Browser2.WindowState = {}));
  let PermissionType;
  ((PermissionType2) => {
    PermissionType2["Ar"] = "ar";
    PermissionType2["AudioCapture"] = "audioCapture";
    PermissionType2["AutomaticFullscreen"] = "automaticFullscreen";
    PermissionType2["BackgroundFetch"] = "backgroundFetch";
    PermissionType2["BackgroundSync"] = "backgroundSync";
    PermissionType2["CameraPanTiltZoom"] = "cameraPanTiltZoom";
    PermissionType2["CapturedSurfaceControl"] = "capturedSurfaceControl";
    PermissionType2["ClipboardReadWrite"] = "clipboardReadWrite";
    PermissionType2["ClipboardSanitizedWrite"] = "clipboardSanitizedWrite";
    PermissionType2["DisplayCapture"] = "displayCapture";
    PermissionType2["DurableStorage"] = "durableStorage";
    PermissionType2["Geolocation"] = "geolocation";
    PermissionType2["HandTracking"] = "handTracking";
    PermissionType2["IdleDetection"] = "idleDetection";
    PermissionType2["KeyboardLock"] = "keyboardLock";
    PermissionType2["LocalFonts"] = "localFonts";
    PermissionType2["LocalNetwork"] = "localNetwork";
    PermissionType2["LocalNetworkAccess"] = "localNetworkAccess";
    PermissionType2["LoopbackNetwork"] = "loopbackNetwork";
    PermissionType2["Midi"] = "midi";
    PermissionType2["MidiSysex"] = "midiSysex";
    PermissionType2["Nfc"] = "nfc";
    PermissionType2["Notifications"] = "notifications";
    PermissionType2["PaymentHandler"] = "paymentHandler";
    PermissionType2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
    PermissionType2["PointerLock"] = "pointerLock";
    PermissionType2["ProtectedMediaIdentifier"] = "protectedMediaIdentifier";
    PermissionType2["Sensors"] = "sensors";
    PermissionType2["SmartCard"] = "smartCard";
    PermissionType2["SpeakerSelection"] = "speakerSelection";
    PermissionType2["StorageAccess"] = "storageAccess";
    PermissionType2["TopLevelStorageAccess"] = "topLevelStorageAccess";
    PermissionType2["VideoCapture"] = "videoCapture";
    PermissionType2["Vr"] = "vr";
    PermissionType2["WakeLockScreen"] = "wakeLockScreen";
    PermissionType2["WakeLockSystem"] = "wakeLockSystem";
    PermissionType2["WebAppInstallation"] = "webAppInstallation";
    PermissionType2["WebPrinting"] = "webPrinting";
    PermissionType2["WindowManagement"] = "windowManagement";
  })(PermissionType = Browser2.PermissionType || (Browser2.PermissionType = {}));
  let PermissionSetting;
  ((PermissionSetting2) => {
    PermissionSetting2["Granted"] = "granted";
    PermissionSetting2["Denied"] = "denied";
    PermissionSetting2["Prompt"] = "prompt";
  })(PermissionSetting = Browser2.PermissionSetting || (Browser2.PermissionSetting = {}));
  let BrowserCommandId;
  ((BrowserCommandId2) => {
    BrowserCommandId2["OpenTabSearch"] = "openTabSearch";
    BrowserCommandId2["CloseTabSearch"] = "closeTabSearch";
    BrowserCommandId2["OpenGlic"] = "openGlic";
  })(BrowserCommandId = Browser2.BrowserCommandId || (Browser2.BrowserCommandId = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["AllowAndName"] = "allowAndName";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Browser2.SetDownloadBehaviorRequestBehavior || (Browser2.SetDownloadBehaviorRequestBehavior = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Browser2.DownloadProgressEventState || (Browser2.DownloadProgressEventState = {}));
})(Browser || (Browser = {}));
var CSS;
((CSS2) => {
  let StyleSheetOrigin;
  ((StyleSheetOrigin2) => {
    StyleSheetOrigin2["Injected"] = "injected";
    StyleSheetOrigin2["UserAgent"] = "user-agent";
    StyleSheetOrigin2["Inspector"] = "inspector";
    StyleSheetOrigin2["Regular"] = "regular";
  })(StyleSheetOrigin = CSS2.StyleSheetOrigin || (CSS2.StyleSheetOrigin = {}));
  let CSSRuleType;
  ((CSSRuleType2) => {
    CSSRuleType2["MediaRule"] = "MediaRule";
    CSSRuleType2["SupportsRule"] = "SupportsRule";
    CSSRuleType2["ContainerRule"] = "ContainerRule";
    CSSRuleType2["LayerRule"] = "LayerRule";
    CSSRuleType2["ScopeRule"] = "ScopeRule";
    CSSRuleType2["StyleRule"] = "StyleRule";
    CSSRuleType2["StartingStyleRule"] = "StartingStyleRule";
    CSSRuleType2["NavigationRule"] = "NavigationRule";
  })(CSSRuleType = CSS2.CSSRuleType || (CSS2.CSSRuleType = {}));
  let CSSMediaSource;
  ((CSSMediaSource2) => {
    CSSMediaSource2["MediaRule"] = "mediaRule";
    CSSMediaSource2["ImportRule"] = "importRule";
    CSSMediaSource2["LinkedSheet"] = "linkedSheet";
    CSSMediaSource2["InlineSheet"] = "inlineSheet";
  })(CSSMediaSource = CSS2.CSSMediaSource || (CSS2.CSSMediaSource = {}));
  let CSSAtRuleType;
  ((CSSAtRuleType2) => {
    CSSAtRuleType2["FontFace"] = "font-face";
    CSSAtRuleType2["FontFeatureValues"] = "font-feature-values";
    CSSAtRuleType2["FontPaletteValues"] = "font-palette-values";
    CSSAtRuleType2["CounterStyle"] = "counter-style";
  })(CSSAtRuleType = CSS2.CSSAtRuleType || (CSS2.CSSAtRuleType = {}));
  let CSSAtRuleSubsection;
  ((CSSAtRuleSubsection2) => {
    CSSAtRuleSubsection2["Swash"] = "swash";
    CSSAtRuleSubsection2["Annotation"] = "annotation";
    CSSAtRuleSubsection2["Ornaments"] = "ornaments";
    CSSAtRuleSubsection2["Stylistic"] = "stylistic";
    CSSAtRuleSubsection2["Styleset"] = "styleset";
    CSSAtRuleSubsection2["CharacterVariant"] = "character-variant";
  })(CSSAtRuleSubsection = CSS2.CSSAtRuleSubsection || (CSS2.CSSAtRuleSubsection = {}));
})(CSS || (CSS = {}));
var CacheStorage;
((CacheStorage2) => {
  let CachedResponseType;
  ((CachedResponseType2) => {
    CachedResponseType2["Basic"] = "basic";
    CachedResponseType2["Cors"] = "cors";
    CachedResponseType2["Default"] = "default";
    CachedResponseType2["Error"] = "error";
    CachedResponseType2["OpaqueResponse"] = "opaqueResponse";
    CachedResponseType2["OpaqueRedirect"] = "opaqueRedirect";
  })(CachedResponseType = CacheStorage2.CachedResponseType || (CacheStorage2.CachedResponseType = {}));
})(CacheStorage || (CacheStorage = {}));
var DOM;
((DOM2) => {
  let PseudoType;
  ((PseudoType2) => {
    PseudoType2["FirstLine"] = "first-line";
    PseudoType2["FirstLetter"] = "first-letter";
    PseudoType2["Checkmark"] = "checkmark";
    PseudoType2["Before"] = "before";
    PseudoType2["After"] = "after";
    PseudoType2["ExpandIcon"] = "expand-icon";
    PseudoType2["PickerIcon"] = "picker-icon";
    PseudoType2["InterestButton"] = "interest-button";
    PseudoType2["Marker"] = "marker";
    PseudoType2["Backdrop"] = "backdrop";
    PseudoType2["Column"] = "column";
    PseudoType2["Selection"] = "selection";
    PseudoType2["SearchText"] = "search-text";
    PseudoType2["TargetText"] = "target-text";
    PseudoType2["SpellingError"] = "spelling-error";
    PseudoType2["GrammarError"] = "grammar-error";
    PseudoType2["Highlight"] = "highlight";
    PseudoType2["FirstLineInherited"] = "first-line-inherited";
    PseudoType2["ScrollMarker"] = "scroll-marker";
    PseudoType2["ScrollMarkerGroup"] = "scroll-marker-group";
    PseudoType2["ScrollButton"] = "scroll-button";
    PseudoType2["Scrollbar"] = "scrollbar";
    PseudoType2["ScrollbarThumb"] = "scrollbar-thumb";
    PseudoType2["ScrollbarButton"] = "scrollbar-button";
    PseudoType2["ScrollbarTrack"] = "scrollbar-track";
    PseudoType2["ScrollbarTrackPiece"] = "scrollbar-track-piece";
    PseudoType2["ScrollbarCorner"] = "scrollbar-corner";
    PseudoType2["Resizer"] = "resizer";
    PseudoType2["InputListButton"] = "input-list-button";
    PseudoType2["ViewTransition"] = "view-transition";
    PseudoType2["ViewTransitionGroup"] = "view-transition-group";
    PseudoType2["ViewTransitionImagePair"] = "view-transition-image-pair";
    PseudoType2["ViewTransitionGroupChildren"] = "view-transition-group-children";
    PseudoType2["ViewTransitionOld"] = "view-transition-old";
    PseudoType2["ViewTransitionNew"] = "view-transition-new";
    PseudoType2["Placeholder"] = "placeholder";
    PseudoType2["FileSelectorButton"] = "file-selector-button";
    PseudoType2["DetailsContent"] = "details-content";
    PseudoType2["Picker"] = "picker";
    PseudoType2["SelectListbox"] = "select-listbox";
    PseudoType2["PermissionIcon"] = "permission-icon";
    PseudoType2["OverscrollAreaParent"] = "overscroll-area-parent";
    PseudoType2["OverscrollBackdrop"] = "overscroll-backdrop";
    PseudoType2["Skeleton"] = "skeleton";
  })(PseudoType = DOM2.PseudoType || (DOM2.PseudoType = {}));
  let ShadowRootType;
  ((ShadowRootType2) => {
    ShadowRootType2["UserAgent"] = "user-agent";
    ShadowRootType2["Open"] = "open";
    ShadowRootType2["Closed"] = "closed";
  })(ShadowRootType = DOM2.ShadowRootType || (DOM2.ShadowRootType = {}));
  let CompatibilityMode;
  ((CompatibilityMode2) => {
    CompatibilityMode2["QuirksMode"] = "QuirksMode";
    CompatibilityMode2["LimitedQuirksMode"] = "LimitedQuirksMode";
    CompatibilityMode2["NoQuirksMode"] = "NoQuirksMode";
  })(CompatibilityMode = DOM2.CompatibilityMode || (DOM2.CompatibilityMode = {}));
  let PhysicalAxes;
  ((PhysicalAxes2) => {
    PhysicalAxes2["Horizontal"] = "Horizontal";
    PhysicalAxes2["Vertical"] = "Vertical";
    PhysicalAxes2["Both"] = "Both";
  })(PhysicalAxes = DOM2.PhysicalAxes || (DOM2.PhysicalAxes = {}));
  let LogicalAxes;
  ((LogicalAxes2) => {
    LogicalAxes2["Inline"] = "Inline";
    LogicalAxes2["Block"] = "Block";
    LogicalAxes2["Both"] = "Both";
  })(LogicalAxes = DOM2.LogicalAxes || (DOM2.LogicalAxes = {}));
  let ScrollOrientation;
  ((ScrollOrientation2) => {
    ScrollOrientation2["Horizontal"] = "horizontal";
    ScrollOrientation2["Vertical"] = "vertical";
  })(ScrollOrientation = DOM2.ScrollOrientation || (DOM2.ScrollOrientation = {}));
  let EnableRequestIncludeWhitespace;
  ((EnableRequestIncludeWhitespace2) => {
    EnableRequestIncludeWhitespace2["None"] = "none";
    EnableRequestIncludeWhitespace2["All"] = "all";
  })(EnableRequestIncludeWhitespace = DOM2.EnableRequestIncludeWhitespace || (DOM2.EnableRequestIncludeWhitespace = {}));
  let GetElementByRelationRequestRelation;
  ((GetElementByRelationRequestRelation2) => {
    GetElementByRelationRequestRelation2["PopoverTarget"] = "PopoverTarget";
    GetElementByRelationRequestRelation2["InterestTarget"] = "InterestTarget";
    GetElementByRelationRequestRelation2["CommandFor"] = "CommandFor";
  })(GetElementByRelationRequestRelation = DOM2.GetElementByRelationRequestRelation || (DOM2.GetElementByRelationRequestRelation = {}));
})(DOM || (DOM = {}));
var DOMDebugger;
((DOMDebugger2) => {
  let DOMBreakpointType;
  ((DOMBreakpointType2) => {
    DOMBreakpointType2["SubtreeModified"] = "subtree-modified";
    DOMBreakpointType2["AttributeModified"] = "attribute-modified";
    DOMBreakpointType2["NodeRemoved"] = "node-removed";
  })(DOMBreakpointType = DOMDebugger2.DOMBreakpointType || (DOMDebugger2.DOMBreakpointType = {}));
  let CSPViolationType;
  ((CSPViolationType2) => {
    CSPViolationType2["TrustedtypeSinkViolation"] = "trustedtype-sink-violation";
    CSPViolationType2["TrustedtypePolicyViolation"] = "trustedtype-policy-violation";
  })(CSPViolationType = DOMDebugger2.CSPViolationType || (DOMDebugger2.CSPViolationType = {}));
})(DOMDebugger || (DOMDebugger = {}));
var DigitalCredentials;
((DigitalCredentials2) => {
  let VirtualWalletAction;
  ((VirtualWalletAction2) => {
    VirtualWalletAction2["Respond"] = "respond";
    VirtualWalletAction2["Decline"] = "decline";
    VirtualWalletAction2["Wait"] = "wait";
    VirtualWalletAction2["Clear"] = "clear";
  })(VirtualWalletAction = DigitalCredentials2.VirtualWalletAction || (DigitalCredentials2.VirtualWalletAction = {}));
})(DigitalCredentials || (DigitalCredentials = {}));
var Emulation;
((Emulation2) => {
  let ScreenOrientationType;
  ((ScreenOrientationType2) => {
    ScreenOrientationType2["PortraitPrimary"] = "portraitPrimary";
    ScreenOrientationType2["PortraitSecondary"] = "portraitSecondary";
    ScreenOrientationType2["LandscapePrimary"] = "landscapePrimary";
    ScreenOrientationType2["LandscapeSecondary"] = "landscapeSecondary";
  })(ScreenOrientationType = Emulation2.ScreenOrientationType || (Emulation2.ScreenOrientationType = {}));
  let DisplayFeatureOrientation;
  ((DisplayFeatureOrientation2) => {
    DisplayFeatureOrientation2["Vertical"] = "vertical";
    DisplayFeatureOrientation2["Horizontal"] = "horizontal";
  })(DisplayFeatureOrientation = Emulation2.DisplayFeatureOrientation || (Emulation2.DisplayFeatureOrientation = {}));
  let DevicePostureType;
  ((DevicePostureType2) => {
    DevicePostureType2["Continuous"] = "continuous";
    DevicePostureType2["Folded"] = "folded";
  })(DevicePostureType = Emulation2.DevicePostureType || (Emulation2.DevicePostureType = {}));
  let VirtualTimePolicy;
  ((VirtualTimePolicy2) => {
    VirtualTimePolicy2["Advance"] = "advance";
    VirtualTimePolicy2["Pause"] = "pause";
    VirtualTimePolicy2["PauseIfNetworkFetchesPending"] = "pauseIfNetworkFetchesPending";
  })(VirtualTimePolicy = Emulation2.VirtualTimePolicy || (Emulation2.VirtualTimePolicy = {}));
  let SensorType;
  ((SensorType2) => {
    SensorType2["AbsoluteOrientation"] = "absolute-orientation";
    SensorType2["Accelerometer"] = "accelerometer";
    SensorType2["AmbientLight"] = "ambient-light";
    SensorType2["Gravity"] = "gravity";
    SensorType2["Gyroscope"] = "gyroscope";
    SensorType2["LinearAcceleration"] = "linear-acceleration";
    SensorType2["Magnetometer"] = "magnetometer";
    SensorType2["RelativeOrientation"] = "relative-orientation";
  })(SensorType = Emulation2.SensorType || (Emulation2.SensorType = {}));
  let PressureSource;
  ((PressureSource2) => {
    PressureSource2["Cpu"] = "cpu";
  })(PressureSource = Emulation2.PressureSource || (Emulation2.PressureSource = {}));
  let PressureState;
  ((PressureState2) => {
    PressureState2["Nominal"] = "nominal";
    PressureState2["Fair"] = "fair";
    PressureState2["Serious"] = "serious";
    PressureState2["Critical"] = "critical";
  })(PressureState = Emulation2.PressureState || (Emulation2.PressureState = {}));
  let DisabledImageType;
  ((DisabledImageType2) => {
    DisabledImageType2["Avif"] = "avif";
    DisabledImageType2["Jxl"] = "jxl";
    DisabledImageType2["Webp"] = "webp";
  })(DisabledImageType = Emulation2.DisabledImageType || (Emulation2.DisabledImageType = {}));
  let SetDeviceMetricsOverrideRequestScrollbarType;
  ((SetDeviceMetricsOverrideRequestScrollbarType2) => {
    SetDeviceMetricsOverrideRequestScrollbarType2["Overlay"] = "overlay";
    SetDeviceMetricsOverrideRequestScrollbarType2["Default"] = "default";
  })(SetDeviceMetricsOverrideRequestScrollbarType = Emulation2.SetDeviceMetricsOverrideRequestScrollbarType || (Emulation2.SetDeviceMetricsOverrideRequestScrollbarType = {}));
  let SetEmitTouchEventsForMouseRequestConfiguration;
  ((SetEmitTouchEventsForMouseRequestConfiguration2) => {
    SetEmitTouchEventsForMouseRequestConfiguration2["Mobile"] = "mobile";
    SetEmitTouchEventsForMouseRequestConfiguration2["Desktop"] = "desktop";
  })(SetEmitTouchEventsForMouseRequestConfiguration = Emulation2.SetEmitTouchEventsForMouseRequestConfiguration || (Emulation2.SetEmitTouchEventsForMouseRequestConfiguration = {}));
  let SetEmulatedVisionDeficiencyRequestType;
  ((SetEmulatedVisionDeficiencyRequestType2) => {
    SetEmulatedVisionDeficiencyRequestType2["None"] = "none";
    SetEmulatedVisionDeficiencyRequestType2["BlurredVision"] = "blurredVision";
    SetEmulatedVisionDeficiencyRequestType2["ReducedContrast"] = "reducedContrast";
    SetEmulatedVisionDeficiencyRequestType2["Achromatopsia"] = "achromatopsia";
    SetEmulatedVisionDeficiencyRequestType2["Deuteranopia"] = "deuteranopia";
    SetEmulatedVisionDeficiencyRequestType2["Protanopia"] = "protanopia";
    SetEmulatedVisionDeficiencyRequestType2["Tritanopia"] = "tritanopia";
  })(SetEmulatedVisionDeficiencyRequestType = Emulation2.SetEmulatedVisionDeficiencyRequestType || (Emulation2.SetEmulatedVisionDeficiencyRequestType = {}));
  let SetCPUPerformanceOverrideRequestPerformanceTier;
  ((SetCPUPerformanceOverrideRequestPerformanceTier2) => {
    SetCPUPerformanceOverrideRequestPerformanceTier2["Unknown"] = "unknown";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Low"] = "low";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Mid"] = "mid";
    SetCPUPerformanceOverrideRequestPerformanceTier2["High"] = "high";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Ultra"] = "ultra";
  })(SetCPUPerformanceOverrideRequestPerformanceTier = Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier || (Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier = {}));
})(Emulation || (Emulation = {}));
var Extensions;
((Extensions2) => {
  let StorageArea;
  ((StorageArea2) => {
    StorageArea2["Session"] = "session";
    StorageArea2["Local"] = "local";
    StorageArea2["Sync"] = "sync";
    StorageArea2["Managed"] = "managed";
  })(StorageArea = Extensions2.StorageArea || (Extensions2.StorageArea = {}));
})(Extensions || (Extensions = {}));
var FedCm;
((FedCm2) => {
  let LoginState;
  ((LoginState2) => {
    LoginState2["SignIn"] = "SignIn";
    LoginState2["SignUp"] = "SignUp";
  })(LoginState = FedCm2.LoginState || (FedCm2.LoginState = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["AccountChooser"] = "AccountChooser";
    DialogType2["AutoReauthn"] = "AutoReauthn";
    DialogType2["ConfirmIdpLogin"] = "ConfirmIdpLogin";
    DialogType2["Error"] = "Error";
  })(DialogType = FedCm2.DialogType || (FedCm2.DialogType = {}));
  let DialogButton;
  ((DialogButton2) => {
    DialogButton2["ConfirmIdpLoginContinue"] = "ConfirmIdpLoginContinue";
    DialogButton2["ErrorGotIt"] = "ErrorGotIt";
    DialogButton2["ErrorMoreDetails"] = "ErrorMoreDetails";
  })(DialogButton = FedCm2.DialogButton || (FedCm2.DialogButton = {}));
  let AccountUrlType;
  ((AccountUrlType2) => {
    AccountUrlType2["TermsOfService"] = "TermsOfService";
    AccountUrlType2["PrivacyPolicy"] = "PrivacyPolicy";
  })(AccountUrlType = FedCm2.AccountUrlType || (FedCm2.AccountUrlType = {}));
})(FedCm || (FedCm = {}));
var Fetch;
((Fetch2) => {
  let RequestStage;
  ((RequestStage2) => {
    RequestStage2["Request"] = "Request";
    RequestStage2["Response"] = "Response";
  })(RequestStage = Fetch2.RequestStage || (Fetch2.RequestStage = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Fetch2.AuthChallengeSource || (Fetch2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Fetch2.AuthChallengeResponseResponse || (Fetch2.AuthChallengeResponseResponse = {}));
})(Fetch || (Fetch = {}));
var HeadlessExperimental;
((HeadlessExperimental2) => {
  let ScreenshotParamsFormat;
  ((ScreenshotParamsFormat2) => {
    ScreenshotParamsFormat2["Jpeg"] = "jpeg";
    ScreenshotParamsFormat2["Png"] = "png";
    ScreenshotParamsFormat2["Webp"] = "webp";
  })(ScreenshotParamsFormat = HeadlessExperimental2.ScreenshotParamsFormat || (HeadlessExperimental2.ScreenshotParamsFormat = {}));
})(HeadlessExperimental || (HeadlessExperimental = {}));
var IndexedDB;
((IndexedDB2) => {
  let KeyType;
  ((KeyType2) => {
    KeyType2["Number"] = "number";
    KeyType2["String"] = "string";
    KeyType2["Date"] = "date";
    KeyType2["Array"] = "array";
  })(KeyType = IndexedDB2.KeyType || (IndexedDB2.KeyType = {}));
  let KeyPathType;
  ((KeyPathType2) => {
    KeyPathType2["Null"] = "null";
    KeyPathType2["String"] = "string";
    KeyPathType2["Array"] = "array";
  })(KeyPathType = IndexedDB2.KeyPathType || (IndexedDB2.KeyPathType = {}));
})(IndexedDB || (IndexedDB = {}));
var Input;
((Input2) => {
  let GestureSourceType;
  ((GestureSourceType2) => {
    GestureSourceType2["Default"] = "default";
    GestureSourceType2["Touch"] = "touch";
    GestureSourceType2["Mouse"] = "mouse";
  })(GestureSourceType = Input2.GestureSourceType || (Input2.GestureSourceType = {}));
  let MouseButton;
  ((MouseButton2) => {
    MouseButton2["None"] = "none";
    MouseButton2["Left"] = "left";
    MouseButton2["Middle"] = "middle";
    MouseButton2["Right"] = "right";
    MouseButton2["Back"] = "back";
    MouseButton2["Forward"] = "forward";
  })(MouseButton = Input2.MouseButton || (Input2.MouseButton = {}));
  let DispatchDragEventRequestType;
  ((DispatchDragEventRequestType2) => {
    DispatchDragEventRequestType2["DragEnter"] = "dragEnter";
    DispatchDragEventRequestType2["DragOver"] = "dragOver";
    DispatchDragEventRequestType2["Drop"] = "drop";
    DispatchDragEventRequestType2["DragCancel"] = "dragCancel";
  })(DispatchDragEventRequestType = Input2.DispatchDragEventRequestType || (Input2.DispatchDragEventRequestType = {}));
  let DispatchKeyEventRequestType;
  ((DispatchKeyEventRequestType2) => {
    DispatchKeyEventRequestType2["KeyDown"] = "keyDown";
    DispatchKeyEventRequestType2["KeyUp"] = "keyUp";
    DispatchKeyEventRequestType2["RawKeyDown"] = "rawKeyDown";
    DispatchKeyEventRequestType2["Char"] = "char";
  })(DispatchKeyEventRequestType = Input2.DispatchKeyEventRequestType || (Input2.DispatchKeyEventRequestType = {}));
  let DispatchMouseEventRequestType;
  ((DispatchMouseEventRequestType2) => {
    DispatchMouseEventRequestType2["MousePressed"] = "mousePressed";
    DispatchMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    DispatchMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    DispatchMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(DispatchMouseEventRequestType = Input2.DispatchMouseEventRequestType || (Input2.DispatchMouseEventRequestType = {}));
  let DispatchMouseEventRequestPointerType;
  ((DispatchMouseEventRequestPointerType2) => {
    DispatchMouseEventRequestPointerType2["Mouse"] = "mouse";
    DispatchMouseEventRequestPointerType2["Pen"] = "pen";
  })(DispatchMouseEventRequestPointerType = Input2.DispatchMouseEventRequestPointerType || (Input2.DispatchMouseEventRequestPointerType = {}));
  let DispatchTouchEventRequestType;
  ((DispatchTouchEventRequestType2) => {
    DispatchTouchEventRequestType2["TouchStart"] = "touchStart";
    DispatchTouchEventRequestType2["TouchEnd"] = "touchEnd";
    DispatchTouchEventRequestType2["TouchMove"] = "touchMove";
    DispatchTouchEventRequestType2["TouchCancel"] = "touchCancel";
  })(DispatchTouchEventRequestType = Input2.DispatchTouchEventRequestType || (Input2.DispatchTouchEventRequestType = {}));
  let EmulateTouchFromMouseEventRequestType;
  ((EmulateTouchFromMouseEventRequestType2) => {
    EmulateTouchFromMouseEventRequestType2["MousePressed"] = "mousePressed";
    EmulateTouchFromMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    EmulateTouchFromMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    EmulateTouchFromMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(EmulateTouchFromMouseEventRequestType = Input2.EmulateTouchFromMouseEventRequestType || (Input2.EmulateTouchFromMouseEventRequestType = {}));
})(Input || (Input = {}));
var LayerTree;
((LayerTree2) => {
  let ScrollRectType;
  ((ScrollRectType2) => {
    ScrollRectType2["RepaintsOnScroll"] = "RepaintsOnScroll";
    ScrollRectType2["TouchEventHandler"] = "TouchEventHandler";
    ScrollRectType2["WheelEventHandler"] = "WheelEventHandler";
  })(ScrollRectType = LayerTree2.ScrollRectType || (LayerTree2.ScrollRectType = {}));
})(LayerTree || (LayerTree = {}));
var Log;
((Log2) => {
  let LogEntrySource;
  ((LogEntrySource2) => {
    LogEntrySource2["XML"] = "xml";
    LogEntrySource2["Javascript"] = "javascript";
    LogEntrySource2["Network"] = "network";
    LogEntrySource2["Storage"] = "storage";
    LogEntrySource2["Appcache"] = "appcache";
    LogEntrySource2["Rendering"] = "rendering";
    LogEntrySource2["Security"] = "security";
    LogEntrySource2["Deprecation"] = "deprecation";
    LogEntrySource2["Worker"] = "worker";
    LogEntrySource2["Violation"] = "violation";
    LogEntrySource2["Intervention"] = "intervention";
    LogEntrySource2["Recommendation"] = "recommendation";
    LogEntrySource2["Other"] = "other";
  })(LogEntrySource = Log2.LogEntrySource || (Log2.LogEntrySource = {}));
  let LogEntryLevel;
  ((LogEntryLevel2) => {
    LogEntryLevel2["Verbose"] = "verbose";
    LogEntryLevel2["Info"] = "info";
    LogEntryLevel2["Warning"] = "warning";
    LogEntryLevel2["Error"] = "error";
  })(LogEntryLevel = Log2.LogEntryLevel || (Log2.LogEntryLevel = {}));
  let LogEntryCategory;
  ((LogEntryCategory2) => {
    LogEntryCategory2["Cors"] = "cors";
  })(LogEntryCategory = Log2.LogEntryCategory || (Log2.LogEntryCategory = {}));
  let ViolationSettingName;
  ((ViolationSettingName2) => {
    ViolationSettingName2["LongTask"] = "longTask";
    ViolationSettingName2["LongLayout"] = "longLayout";
    ViolationSettingName2["BlockedEvent"] = "blockedEvent";
    ViolationSettingName2["BlockedParser"] = "blockedParser";
    ViolationSettingName2["DiscouragedAPIUse"] = "discouragedAPIUse";
    ViolationSettingName2["Handler"] = "handler";
    ViolationSettingName2["RecurringHandler"] = "recurringHandler";
  })(ViolationSettingName = Log2.ViolationSettingName || (Log2.ViolationSettingName = {}));
})(Log || (Log = {}));
var Media;
((Media2) => {
  let PlayerMessageLevel;
  ((PlayerMessageLevel2) => {
    PlayerMessageLevel2["Error"] = "error";
    PlayerMessageLevel2["Warning"] = "warning";
    PlayerMessageLevel2["Info"] = "info";
    PlayerMessageLevel2["Debug"] = "debug";
  })(PlayerMessageLevel = Media2.PlayerMessageLevel || (Media2.PlayerMessageLevel = {}));
})(Media || (Media = {}));
var Memory;
((Memory2) => {
  let PressureLevel;
  ((PressureLevel2) => {
    PressureLevel2["Moderate"] = "moderate";
    PressureLevel2["Critical"] = "critical";
  })(PressureLevel = Memory2.PressureLevel || (Memory2.PressureLevel = {}));
})(Memory || (Memory = {}));
var Network;
((Network2) => {
  let ResourceType;
  ((ResourceType2) => {
    ResourceType2["Document"] = "Document";
    ResourceType2["Stylesheet"] = "Stylesheet";
    ResourceType2["Image"] = "Image";
    ResourceType2["Media"] = "Media";
    ResourceType2["Font"] = "Font";
    ResourceType2["Script"] = "Script";
    ResourceType2["TextTrack"] = "TextTrack";
    ResourceType2["XHR"] = "XHR";
    ResourceType2["Fetch"] = "Fetch";
    ResourceType2["Prefetch"] = "Prefetch";
    ResourceType2["EventSource"] = "EventSource";
    ResourceType2["WebSocket"] = "WebSocket";
    ResourceType2["Manifest"] = "Manifest";
    ResourceType2["SignedExchange"] = "SignedExchange";
    ResourceType2["Ping"] = "Ping";
    ResourceType2["CSPViolationReport"] = "CSPViolationReport";
    ResourceType2["Preflight"] = "Preflight";
    ResourceType2["FedCM"] = "FedCM";
    ResourceType2["Other"] = "Other";
  })(ResourceType = Network2.ResourceType || (Network2.ResourceType = {}));
  let ErrorReason;
  ((ErrorReason2) => {
    ErrorReason2["Failed"] = "Failed";
    ErrorReason2["Aborted"] = "Aborted";
    ErrorReason2["TimedOut"] = "TimedOut";
    ErrorReason2["AccessDenied"] = "AccessDenied";
    ErrorReason2["ConnectionClosed"] = "ConnectionClosed";
    ErrorReason2["ConnectionReset"] = "ConnectionReset";
    ErrorReason2["ConnectionRefused"] = "ConnectionRefused";
    ErrorReason2["ConnectionAborted"] = "ConnectionAborted";
    ErrorReason2["ConnectionFailed"] = "ConnectionFailed";
    ErrorReason2["NameNotResolved"] = "NameNotResolved";
    ErrorReason2["InternetDisconnected"] = "InternetDisconnected";
    ErrorReason2["AddressUnreachable"] = "AddressUnreachable";
    ErrorReason2["BlockedByClient"] = "BlockedByClient";
    ErrorReason2["BlockedByResponse"] = "BlockedByResponse";
  })(ErrorReason = Network2.ErrorReason || (Network2.ErrorReason = {}));
  let ConnectionType;
  ((ConnectionType2) => {
    ConnectionType2["None"] = "none";
    ConnectionType2["Cellular2g"] = "cellular2g";
    ConnectionType2["Cellular3g"] = "cellular3g";
    ConnectionType2["Cellular4g"] = "cellular4g";
    ConnectionType2["Bluetooth"] = "bluetooth";
    ConnectionType2["Ethernet"] = "ethernet";
    ConnectionType2["Wifi"] = "wifi";
    ConnectionType2["Wimax"] = "wimax";
    ConnectionType2["Other"] = "other";
  })(ConnectionType = Network2.ConnectionType || (Network2.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network2.CookieSameSite || (Network2.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network2.CookiePriority || (Network2.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network2.CookieSourceScheme || (Network2.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network2.ResourcePriority || (Network2.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network2.RenderBlockingBehavior || (Network2.RenderBlockingBehavior = {}));
  let RequestReferrerPolicy;
  ((RequestReferrerPolicy2) => {
    RequestReferrerPolicy2["UnsafeUrl"] = "unsafe-url";
    RequestReferrerPolicy2["NoReferrerWhenDowngrade"] = "no-referrer-when-downgrade";
    RequestReferrerPolicy2["NoReferrer"] = "no-referrer";
    RequestReferrerPolicy2["Origin"] = "origin";
    RequestReferrerPolicy2["OriginWhenCrossOrigin"] = "origin-when-cross-origin";
    RequestReferrerPolicy2["SameOrigin"] = "same-origin";
    RequestReferrerPolicy2["StrictOrigin"] = "strict-origin";
    RequestReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strict-origin-when-cross-origin";
  })(RequestReferrerPolicy = Network2.RequestReferrerPolicy || (Network2.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network2.CertificateTransparencyCompliance || (Network2.CertificateTransparencyCompliance = {}));
  let BlockedReason;
  ((BlockedReason2) => {
    BlockedReason2["Other"] = "other";
    BlockedReason2["Csp"] = "csp";
    BlockedReason2["MixedContent"] = "mixed-content";
    BlockedReason2["Origin"] = "origin";
    BlockedReason2["Inspector"] = "inspector";
    BlockedReason2["Integrity"] = "integrity";
    BlockedReason2["SubresourceFilter"] = "subresource-filter";
    BlockedReason2["ContentType"] = "content-type";
    BlockedReason2["CoepFrameResourceNeedsCoepHeader"] = "coep-frame-resource-needs-coep-header";
    BlockedReason2["CoopSandboxedIframeCannotNavigateToCoopPage"] = "coop-sandboxed-iframe-cannot-navigate-to-coop-page";
    BlockedReason2["CorpNotSameOrigin"] = "corp-not-same-origin";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-dip";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep-and-dip";
    BlockedReason2["CorpNotSameSite"] = "corp-not-same-site";
    BlockedReason2["SriMessageSignatureMismatch"] = "sri-message-signature-mismatch";
  })(BlockedReason = Network2.BlockedReason || (Network2.BlockedReason = {}));
  let CorsError;
  ((CorsError2) => {
    CorsError2["DisallowedByMode"] = "DisallowedByMode";
    CorsError2["InvalidResponse"] = "InvalidResponse";
    CorsError2["WildcardOriginNotAllowed"] = "WildcardOriginNotAllowed";
    CorsError2["MissingAllowOriginHeader"] = "MissingAllowOriginHeader";
    CorsError2["MultipleAllowOriginValues"] = "MultipleAllowOriginValues";
    CorsError2["InvalidAllowOriginValue"] = "InvalidAllowOriginValue";
    CorsError2["AllowOriginMismatch"] = "AllowOriginMismatch";
    CorsError2["InvalidAllowCredentials"] = "InvalidAllowCredentials";
    CorsError2["CorsDisabledScheme"] = "CorsDisabledScheme";
    CorsError2["PreflightInvalidStatus"] = "PreflightInvalidStatus";
    CorsError2["PreflightDisallowedRedirect"] = "PreflightDisallowedRedirect";
    CorsError2["PreflightWildcardOriginNotAllowed"] = "PreflightWildcardOriginNotAllowed";
    CorsError2["PreflightMissingAllowOriginHeader"] = "PreflightMissingAllowOriginHeader";
    CorsError2["PreflightMultipleAllowOriginValues"] = "PreflightMultipleAllowOriginValues";
    CorsError2["PreflightInvalidAllowOriginValue"] = "PreflightInvalidAllowOriginValue";
    CorsError2["PreflightAllowOriginMismatch"] = "PreflightAllowOriginMismatch";
    CorsError2["PreflightInvalidAllowCredentials"] = "PreflightInvalidAllowCredentials";
    CorsError2["PreflightMissingAllowExternal"] = "PreflightMissingAllowExternal";
    CorsError2["PreflightInvalidAllowExternal"] = "PreflightInvalidAllowExternal";
    CorsError2["InvalidAllowMethodsPreflightResponse"] = "InvalidAllowMethodsPreflightResponse";
    CorsError2["InvalidAllowHeadersPreflightResponse"] = "InvalidAllowHeadersPreflightResponse";
    CorsError2["MethodDisallowedByPreflightResponse"] = "MethodDisallowedByPreflightResponse";
    CorsError2["HeaderDisallowedByPreflightResponse"] = "HeaderDisallowedByPreflightResponse";
    CorsError2["RedirectContainsCredentials"] = "RedirectContainsCredentials";
    CorsError2["InsecureLocalNetwork"] = "InsecureLocalNetwork";
    CorsError2["InvalidLocalNetworkAccess"] = "InvalidLocalNetworkAccess";
    CorsError2["NoCorsRedirectModeNotFollow"] = "NoCorsRedirectModeNotFollow";
    CorsError2["LocalNetworkAccessPermissionDenied"] = "LocalNetworkAccessPermissionDenied";
  })(CorsError = Network2.CorsError || (Network2.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network2.ServiceWorkerResponseSource || (Network2.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network2.TrustTokenParamsRefreshPolicy || (Network2.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network2.TrustTokenOperationType || (Network2.TrustTokenOperationType = {}));
  let AlternateProtocolUsage;
  ((AlternateProtocolUsage2) => {
    AlternateProtocolUsage2["AlternativeJobWonWithoutRace"] = "alternativeJobWonWithoutRace";
    AlternateProtocolUsage2["AlternativeJobWonRace"] = "alternativeJobWonRace";
    AlternateProtocolUsage2["MainJobWonRace"] = "mainJobWonRace";
    AlternateProtocolUsage2["MappingMissing"] = "mappingMissing";
    AlternateProtocolUsage2["Broken"] = "broken";
    AlternateProtocolUsage2["DnsAlpnH3JobWonWithoutRace"] = "dnsAlpnH3JobWonWithoutRace";
    AlternateProtocolUsage2["DnsAlpnH3JobWonRace"] = "dnsAlpnH3JobWonRace";
    AlternateProtocolUsage2["UnspecifiedReason"] = "unspecifiedReason";
  })(AlternateProtocolUsage = Network2.AlternateProtocolUsage || (Network2.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network2.ServiceWorkerRouterSource || (Network2.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network2.InitiatorType || (Network2.InitiatorType = {}));
  let SetCookieBlockedReason;
  ((SetCookieBlockedReason2) => {
    SetCookieBlockedReason2["SecureOnly"] = "SecureOnly";
    SetCookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    SetCookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    SetCookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    SetCookieBlockedReason2["UserPreferences"] = "UserPreferences";
    SetCookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    SetCookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    SetCookieBlockedReason2["SyntaxError"] = "SyntaxError";
    SetCookieBlockedReason2["SchemeNotSupported"] = "SchemeNotSupported";
    SetCookieBlockedReason2["OverwriteSecure"] = "OverwriteSecure";
    SetCookieBlockedReason2["InvalidDomain"] = "InvalidDomain";
    SetCookieBlockedReason2["InvalidPrefix"] = "InvalidPrefix";
    SetCookieBlockedReason2["UnknownError"] = "UnknownError";
    SetCookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    SetCookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    SetCookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    SetCookieBlockedReason2["DisallowedCharacter"] = "DisallowedCharacter";
    SetCookieBlockedReason2["NoCookieContent"] = "NoCookieContent";
  })(SetCookieBlockedReason = Network2.SetCookieBlockedReason || (Network2.SetCookieBlockedReason = {}));
  let CookieBlockedReason;
  ((CookieBlockedReason2) => {
    CookieBlockedReason2["SecureOnly"] = "SecureOnly";
    CookieBlockedReason2["NotOnPath"] = "NotOnPath";
    CookieBlockedReason2["DomainMismatch"] = "DomainMismatch";
    CookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    CookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    CookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    CookieBlockedReason2["UserPreferences"] = "UserPreferences";
    CookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    CookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    CookieBlockedReason2["UnknownError"] = "UnknownError";
    CookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    CookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    CookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    CookieBlockedReason2["PortMismatch"] = "PortMismatch";
    CookieBlockedReason2["SchemeMismatch"] = "SchemeMismatch";
    CookieBlockedReason2["AnonymousContext"] = "AnonymousContext";
  })(CookieBlockedReason = Network2.CookieBlockedReason || (Network2.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network2.CookieExemptionReason || (Network2.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network2.AuthChallengeSource || (Network2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network2.AuthChallengeResponseResponse || (Network2.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network2.SignedExchangeErrorField || (Network2.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network2.DirectSocketDnsQueryType || (Network2.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network2.LocalNetworkAccessRequestPolicy || (Network2.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network2.IPAddressSpace || (Network2.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network2.CrossOriginOpenerPolicyValue || (Network2.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network2.CrossOriginEmbedderPolicyValue || (Network2.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network2.ContentSecurityPolicySource || (Network2.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network2.ReportStatus || (Network2.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network2.DeviceBoundSessionWithUsageUsage || (Network2.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network2.DeviceBoundSessionUrlRuleRuleType || (Network2.DeviceBoundSessionUrlRuleRuleType = {}));
  let DeviceBoundSessionFetchResult;
  ((DeviceBoundSessionFetchResult2) => {
    DeviceBoundSessionFetchResult2["Success"] = "Success";
    DeviceBoundSessionFetchResult2["SigningKeyGenerationError"] = "SigningKeyGenerationError";
    DeviceBoundSessionFetchResult2["AttestationKeyGenerationError"] = "AttestationKeyGenerationError";
    DeviceBoundSessionFetchResult2["SigningError"] = "SigningError";
    DeviceBoundSessionFetchResult2["TransientSigningError"] = "TransientSigningError";
    DeviceBoundSessionFetchResult2["ServerRequestedTermination"] = "ServerRequestedTermination";
    DeviceBoundSessionFetchResult2["InvalidSessionId"] = "InvalidSessionId";
    DeviceBoundSessionFetchResult2["InvalidChallenge"] = "InvalidChallenge";
    DeviceBoundSessionFetchResult2["TooManyChallenges"] = "TooManyChallenges";
    DeviceBoundSessionFetchResult2["InvalidFetcherUrl"] = "InvalidFetcherUrl";
    DeviceBoundSessionFetchResult2["InvalidRefreshUrl"] = "InvalidRefreshUrl";
    DeviceBoundSessionFetchResult2["TransientHttpError"] = "TransientHttpError";
    DeviceBoundSessionFetchResult2["ScopeOriginSameSiteMismatch"] = "ScopeOriginSameSiteMismatch";
    DeviceBoundSessionFetchResult2["RefreshUrlSameSiteMismatch"] = "RefreshUrlSameSiteMismatch";
    DeviceBoundSessionFetchResult2["MismatchedSessionId"] = "MismatchedSessionId";
    DeviceBoundSessionFetchResult2["MissingScope"] = "MissingScope";
    DeviceBoundSessionFetchResult2["NoCredentials"] = "NoCredentials";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownUnavailable"] = "SubdomainRegistrationWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationUnauthorized"] = "SubdomainRegistrationUnauthorized";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownMalformed"] = "SubdomainRegistrationWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownUnavailable"] = "SessionProviderWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownUnavailable"] = "RelyingPartyWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["FederatedKeyThumbprintMismatch"] = "FederatedKeyThumbprintMismatch";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionUrl"] = "InvalidFederatedSessionUrl";
    DeviceBoundSessionFetchResult2["InvalidFederatedKey"] = "InvalidFederatedKey";
    DeviceBoundSessionFetchResult2["TooManyRelyingOriginLabels"] = "TooManyRelyingOriginLabels";
    DeviceBoundSessionFetchResult2["BoundCookieSetForbidden"] = "BoundCookieSetForbidden";
    DeviceBoundSessionFetchResult2["NetError"] = "NetError";
    DeviceBoundSessionFetchResult2["ProxyError"] = "ProxyError";
    DeviceBoundSessionFetchResult2["EmptySessionConfig"] = "EmptySessionConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsConfig"] = "InvalidCredentialsConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsType"] = "InvalidCredentialsType";
    DeviceBoundSessionFetchResult2["InvalidCredentialsEmptyName"] = "InvalidCredentialsEmptyName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookie"] = "InvalidCredentialsCookie";
    DeviceBoundSessionFetchResult2["PersistentHttpError"] = "PersistentHttpError";
    DeviceBoundSessionFetchResult2["RegistrationAttemptedChallenge"] = "RegistrationAttemptedChallenge";
    DeviceBoundSessionFetchResult2["InvalidScopeOrigin"] = "InvalidScopeOrigin";
    DeviceBoundSessionFetchResult2["ScopeOriginContainsPath"] = "ScopeOriginContainsPath";
    DeviceBoundSessionFetchResult2["RefreshInitiatorNotString"] = "RefreshInitiatorNotString";
    DeviceBoundSessionFetchResult2["RefreshInitiatorInvalidHostPattern"] = "RefreshInitiatorInvalidHostPattern";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecification"] = "InvalidScopeSpecification";
    DeviceBoundSessionFetchResult2["MissingScopeSpecificationType"] = "MissingScopeSpecificationType";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationDomain"] = "EmptyScopeSpecificationDomain";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationPath"] = "EmptyScopeSpecificationPath";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecificationType"] = "InvalidScopeSpecificationType";
    DeviceBoundSessionFetchResult2["InvalidScopeIncludeSite"] = "InvalidScopeIncludeSite";
    DeviceBoundSessionFetchResult2["MissingScopeIncludeSite"] = "MissingScopeIncludeSite";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByProvider"] = "FederatedNotAuthorizedByProvider";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByRelyingParty"] = "FederatedNotAuthorizedByRelyingParty";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownMalformed"] = "SessionProviderWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownHasProviderOrigin"] = "SessionProviderWellKnownHasProviderOrigin";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownMalformed"] = "RelyingPartyWellKnownMalformed";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownHasRelyingOrigins"] = "RelyingPartyWellKnownHasRelyingOrigins";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderSessionMissing"] = "InvalidFederatedSessionProviderSessionMissing";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionWrongProviderOrigin"] = "InvalidFederatedSessionWrongProviderOrigin";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieCreationTime"] = "InvalidCredentialsCookieCreationTime";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieName"] = "InvalidCredentialsCookieName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieParsing"] = "InvalidCredentialsCookieParsing";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieUnpermittedAttribute"] = "InvalidCredentialsCookieUnpermittedAttribute";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieInvalidDomain"] = "InvalidCredentialsCookieInvalidDomain";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookiePrefix"] = "InvalidCredentialsCookiePrefix";
    DeviceBoundSessionFetchResult2["InvalidScopeRulePath"] = "InvalidScopeRulePath";
    DeviceBoundSessionFetchResult2["InvalidScopeRuleHostPattern"] = "InvalidScopeRuleHostPattern";
    DeviceBoundSessionFetchResult2["ScopeRuleOriginScopedHostPatternMismatch"] = "ScopeRuleOriginScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["ScopeRuleSiteScopedHostPatternMismatch"] = "ScopeRuleSiteScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    DeviceBoundSessionFetchResult2["InvalidConfigJson"] = "InvalidConfigJson";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderFailedToRestoreKey"] = "InvalidFederatedSessionProviderFailedToRestoreKey";
    DeviceBoundSessionFetchResult2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    DeviceBoundSessionFetchResult2["SessionDeletedDuringRefresh"] = "SessionDeletedDuringRefresh";
    DeviceBoundSessionFetchResult2["CrossOriginRegistrationSiteNotIncluded"] = "CrossOriginRegistrationSiteNotIncluded";
    DeviceBoundSessionFetchResult2["InvalidPreProvisionedKeyInitiatorMissing"] = "InvalidPreProvisionedKeyInitiatorMissing";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyAccessNotGranted"] = "PreProvisionedKeyAccessNotGranted";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyNotFound"] = "PreProvisionedKeyNotFound";
    DeviceBoundSessionFetchResult2["AttestationCertificationError"] = "AttestationCertificationError";
    DeviceBoundSessionFetchResult2["AttestationSigningError"] = "AttestationSigningError";
  })(DeviceBoundSessionFetchResult = Network2.DeviceBoundSessionFetchResult || (Network2.DeviceBoundSessionFetchResult = {}));
  let RefreshEventDetailsRefreshResult;
  ((RefreshEventDetailsRefreshResult2) => {
    RefreshEventDetailsRefreshResult2["Refreshed"] = "Refreshed";
    RefreshEventDetailsRefreshResult2["InitializedService"] = "InitializedService";
    RefreshEventDetailsRefreshResult2["Unreachable"] = "Unreachable";
    RefreshEventDetailsRefreshResult2["ServerError"] = "ServerError";
    RefreshEventDetailsRefreshResult2["FatalError"] = "FatalError";
    RefreshEventDetailsRefreshResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    RefreshEventDetailsRefreshResult2["RefreshedAsWaiter"] = "RefreshedAsWaiter";
    RefreshEventDetailsRefreshResult2["TransientSigningError"] = "TransientSigningError";
    RefreshEventDetailsRefreshResult2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
  })(RefreshEventDetailsRefreshResult = Network2.RefreshEventDetailsRefreshResult || (Network2.RefreshEventDetailsRefreshResult = {}));
  let TerminationEventDetailsDeletionReason;
  ((TerminationEventDetailsDeletionReason2) => {
    TerminationEventDetailsDeletionReason2["Expired"] = "Expired";
    TerminationEventDetailsDeletionReason2["FailedToRestoreKey"] = "FailedToRestoreKey";
    TerminationEventDetailsDeletionReason2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    TerminationEventDetailsDeletionReason2["StoragePartitionCleared"] = "StoragePartitionCleared";
    TerminationEventDetailsDeletionReason2["ClearBrowsingData"] = "ClearBrowsingData";
    TerminationEventDetailsDeletionReason2["ServerRequested"] = "ServerRequested";
    TerminationEventDetailsDeletionReason2["InvalidSessionParams"] = "InvalidSessionParams";
    TerminationEventDetailsDeletionReason2["RefreshFatalError"] = "RefreshFatalError";
    TerminationEventDetailsDeletionReason2["DevTools"] = "DevTools";
  })(TerminationEventDetailsDeletionReason = Network2.TerminationEventDetailsDeletionReason || (Network2.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network2.ChallengeEventDetailsChallengeResult || (Network2.ChallengeEventDetailsChallengeResult = {}));
  let TrustTokenOperationDoneEventStatus;
  ((TrustTokenOperationDoneEventStatus2) => {
    TrustTokenOperationDoneEventStatus2["Ok"] = "Ok";
    TrustTokenOperationDoneEventStatus2["InvalidArgument"] = "InvalidArgument";
    TrustTokenOperationDoneEventStatus2["MissingIssuerKeys"] = "MissingIssuerKeys";
    TrustTokenOperationDoneEventStatus2["FailedPrecondition"] = "FailedPrecondition";
    TrustTokenOperationDoneEventStatus2["ResourceExhausted"] = "ResourceExhausted";
    TrustTokenOperationDoneEventStatus2["AlreadyExists"] = "AlreadyExists";
    TrustTokenOperationDoneEventStatus2["ResourceLimited"] = "ResourceLimited";
    TrustTokenOperationDoneEventStatus2["Unauthorized"] = "Unauthorized";
    TrustTokenOperationDoneEventStatus2["BadResponse"] = "BadResponse";
    TrustTokenOperationDoneEventStatus2["InternalError"] = "InternalError";
    TrustTokenOperationDoneEventStatus2["UnknownError"] = "UnknownError";
    TrustTokenOperationDoneEventStatus2["FulfilledLocally"] = "FulfilledLocally";
    TrustTokenOperationDoneEventStatus2["SiteIssuerLimit"] = "SiteIssuerLimit";
  })(TrustTokenOperationDoneEventStatus = Network2.TrustTokenOperationDoneEventStatus || (Network2.TrustTokenOperationDoneEventStatus = {}));
})(Network || (Network = {}));
var Overlay;
((Overlay2) => {
  let LineStylePattern;
  ((LineStylePattern2) => {
    LineStylePattern2["Dashed"] = "dashed";
    LineStylePattern2["Dotted"] = "dotted";
  })(LineStylePattern = Overlay2.LineStylePattern || (Overlay2.LineStylePattern = {}));
  let ContrastAlgorithm;
  ((ContrastAlgorithm2) => {
    ContrastAlgorithm2["Aa"] = "aa";
    ContrastAlgorithm2["Aaa"] = "aaa";
    ContrastAlgorithm2["Apca"] = "apca";
  })(ContrastAlgorithm = Overlay2.ContrastAlgorithm || (Overlay2.ContrastAlgorithm = {}));
  let ColorFormat;
  ((ColorFormat2) => {
    ColorFormat2["Rgb"] = "rgb";
    ColorFormat2["Hsl"] = "hsl";
    ColorFormat2["Hwb"] = "hwb";
    ColorFormat2["Hex"] = "hex";
  })(ColorFormat = Overlay2.ColorFormat || (Overlay2.ColorFormat = {}));
  let DisplayCutoutShape;
  ((DisplayCutoutShape2) => {
    DisplayCutoutShape2["Pill"] = "pill";
    DisplayCutoutShape2["Notch"] = "notch";
    DisplayCutoutShape2["Circle"] = "circle";
    DisplayCutoutShape2["Rectangle"] = "rectangle";
  })(DisplayCutoutShape = Overlay2.DisplayCutoutShape || (Overlay2.DisplayCutoutShape = {}));
  let InspectMode;
  ((InspectMode2) => {
    InspectMode2["SearchForNode"] = "searchForNode";
    InspectMode2["SearchForUAShadowDOM"] = "searchForUAShadowDOM";
    InspectMode2["CaptureAreaScreenshot"] = "captureAreaScreenshot";
    InspectMode2["None"] = "none";
  })(InspectMode = Overlay2.InspectMode || (Overlay2.InspectMode = {}));
})(Overlay || (Overlay = {}));
var PWA;
((PWA2) => {
  let DisplayMode;
  ((DisplayMode2) => {
    DisplayMode2["Standalone"] = "standalone";
    DisplayMode2["Browser"] = "browser";
  })(DisplayMode = PWA2.DisplayMode || (PWA2.DisplayMode = {}));
})(PWA || (PWA = {}));
var Page;
((Page2) => {
  let AdFrameType;
  ((AdFrameType2) => {
    AdFrameType2["None"] = "none";
    AdFrameType2["Child"] = "child";
    AdFrameType2["Root"] = "root";
  })(AdFrameType = Page2.AdFrameType || (Page2.AdFrameType = {}));
  let AdFrameExplanation;
  ((AdFrameExplanation2) => {
    AdFrameExplanation2["ParentIsAd"] = "ParentIsAd";
    AdFrameExplanation2["CreatedByAdScript"] = "CreatedByAdScript";
    AdFrameExplanation2["MatchedBlockingRule"] = "MatchedBlockingRule";
  })(AdFrameExplanation = Page2.AdFrameExplanation || (Page2.AdFrameExplanation = {}));
  let SecureContextType;
  ((SecureContextType2) => {
    SecureContextType2["Secure"] = "Secure";
    SecureContextType2["SecureLocalhost"] = "SecureLocalhost";
    SecureContextType2["InsecureScheme"] = "InsecureScheme";
    SecureContextType2["InsecureAncestor"] = "InsecureAncestor";
  })(SecureContextType = Page2.SecureContextType || (Page2.SecureContextType = {}));
  let CrossOriginIsolatedContextType;
  ((CrossOriginIsolatedContextType2) => {
    CrossOriginIsolatedContextType2["Isolated"] = "Isolated";
    CrossOriginIsolatedContextType2["NotIsolated"] = "NotIsolated";
    CrossOriginIsolatedContextType2["NotIsolatedFeatureDisabled"] = "NotIsolatedFeatureDisabled";
  })(CrossOriginIsolatedContextType = Page2.CrossOriginIsolatedContextType || (Page2.CrossOriginIsolatedContextType = {}));
  let GatedAPIFeatures;
  ((GatedAPIFeatures2) => {
    GatedAPIFeatures2["SharedArrayBuffers"] = "SharedArrayBuffers";
    GatedAPIFeatures2["SharedArrayBuffersTransferAllowed"] = "SharedArrayBuffersTransferAllowed";
    GatedAPIFeatures2["PerformanceMeasureMemory"] = "PerformanceMeasureMemory";
    GatedAPIFeatures2["PerformanceProfile"] = "PerformanceProfile";
  })(GatedAPIFeatures = Page2.GatedAPIFeatures || (Page2.GatedAPIFeatures = {}));
  let PermissionsPolicyFeature;
  ((PermissionsPolicyFeature2) => {
    PermissionsPolicyFeature2["Accelerometer"] = "accelerometer";
    PermissionsPolicyFeature2["AllScreensCapture"] = "all-screens-capture";
    PermissionsPolicyFeature2["AmbientLightSensor"] = "ambient-light-sensor";
    PermissionsPolicyFeature2["AriaNotify"] = "aria-notify";
    PermissionsPolicyFeature2["Autofill"] = "autofill";
    PermissionsPolicyFeature2["Autoplay"] = "autoplay";
    PermissionsPolicyFeature2["Bluetooth"] = "bluetooth";
    PermissionsPolicyFeature2["BrowsingTopics"] = "browsing-topics";
    PermissionsPolicyFeature2["Camera"] = "camera";
    PermissionsPolicyFeature2["CapturedSurfaceControl"] = "captured-surface-control";
    PermissionsPolicyFeature2["ChDpr"] = "ch-dpr";
    PermissionsPolicyFeature2["ChDeviceMemory"] = "ch-device-memory";
    PermissionsPolicyFeature2["ChDownlink"] = "ch-downlink";
    PermissionsPolicyFeature2["ChEct"] = "ch-ect";
    PermissionsPolicyFeature2["ChPrefersColorScheme"] = "ch-prefers-color-scheme";
    PermissionsPolicyFeature2["ChPrefersReducedMotion"] = "ch-prefers-reduced-motion";
    PermissionsPolicyFeature2["ChPrefersReducedTransparency"] = "ch-prefers-reduced-transparency";
    PermissionsPolicyFeature2["ChRtt"] = "ch-rtt";
    PermissionsPolicyFeature2["ChSaveData"] = "ch-save-data";
    PermissionsPolicyFeature2["ChUa"] = "ch-ua";
    PermissionsPolicyFeature2["ChUaArch"] = "ch-ua-arch";
    PermissionsPolicyFeature2["ChUaBitness"] = "ch-ua-bitness";
    PermissionsPolicyFeature2["ChUaHighEntropyValues"] = "ch-ua-high-entropy-values";
    PermissionsPolicyFeature2["ChUaPlatform"] = "ch-ua-platform";
    PermissionsPolicyFeature2["ChUaModel"] = "ch-ua-model";
    PermissionsPolicyFeature2["ChUaMobile"] = "ch-ua-mobile";
    PermissionsPolicyFeature2["ChUaFormFactors"] = "ch-ua-form-factors";
    PermissionsPolicyFeature2["ChUaFullVersion"] = "ch-ua-full-version";
    PermissionsPolicyFeature2["ChUaFullVersionList"] = "ch-ua-full-version-list";
    PermissionsPolicyFeature2["ChUaPlatformVersion"] = "ch-ua-platform-version";
    PermissionsPolicyFeature2["ChUaWow64"] = "ch-ua-wow64";
    PermissionsPolicyFeature2["ChViewportHeight"] = "ch-viewport-height";
    PermissionsPolicyFeature2["ChViewportWidth"] = "ch-viewport-width";
    PermissionsPolicyFeature2["ChWidth"] = "ch-width";
    PermissionsPolicyFeature2["ClipboardRead"] = "clipboard-read";
    PermissionsPolicyFeature2["ClipboardWrite"] = "clipboard-write";
    PermissionsPolicyFeature2["ComputePressure"] = "compute-pressure";
    PermissionsPolicyFeature2["ControlledFrame"] = "controlled-frame";
    PermissionsPolicyFeature2["CrossOriginIsolated"] = "cross-origin-isolated";
    PermissionsPolicyFeature2["DeferredFetch"] = "deferred-fetch";
    PermissionsPolicyFeature2["DeferredFetchMinimal"] = "deferred-fetch-minimal";
    PermissionsPolicyFeature2["DeviceAttributes"] = "device-attributes";
    PermissionsPolicyFeature2["DigitalCredentialsCreate"] = "digital-credentials-create";
    PermissionsPolicyFeature2["DigitalCredentialsGet"] = "digital-credentials-get";
    PermissionsPolicyFeature2["DirectSockets"] = "direct-sockets";
    PermissionsPolicyFeature2["DirectSocketsMulticast"] = "direct-sockets-multicast";
    PermissionsPolicyFeature2["DisplayCapture"] = "display-capture";
    PermissionsPolicyFeature2["DocumentDomain"] = "document-domain";
    PermissionsPolicyFeature2["EncryptedMedia"] = "encrypted-media";
    PermissionsPolicyFeature2["ExecutionWhileOutOfViewport"] = "execution-while-out-of-viewport";
    PermissionsPolicyFeature2["ExecutionWhileNotRendered"] = "execution-while-not-rendered";
    PermissionsPolicyFeature2["FocusWithoutUserActivation"] = "focus-without-user-activation";
    PermissionsPolicyFeature2["Fullscreen"] = "fullscreen";
    PermissionsPolicyFeature2["Frobulate"] = "frobulate";
    PermissionsPolicyFeature2["Gamepad"] = "gamepad";
    PermissionsPolicyFeature2["Geolocation"] = "geolocation";
    PermissionsPolicyFeature2["Gyroscope"] = "gyroscope";
    PermissionsPolicyFeature2["Haptics"] = "haptics";
    PermissionsPolicyFeature2["Hid"] = "hid";
    PermissionsPolicyFeature2["IdentityCredentialsGet"] = "identity-credentials-get";
    PermissionsPolicyFeature2["IdleDetection"] = "idle-detection";
    PermissionsPolicyFeature2["InterestCohort"] = "interest-cohort";
    PermissionsPolicyFeature2["KeyboardMap"] = "keyboard-map";
    PermissionsPolicyFeature2["LanguageDetector"] = "language-detector";
    PermissionsPolicyFeature2["LanguageModel"] = "language-model";
    PermissionsPolicyFeature2["LocalFonts"] = "local-fonts";
    PermissionsPolicyFeature2["LocalNetwork"] = "local-network";
    PermissionsPolicyFeature2["LocalNetworkAccess"] = "local-network-access";
    PermissionsPolicyFeature2["LoopbackNetwork"] = "loopback-network";
    PermissionsPolicyFeature2["Magnetometer"] = "magnetometer";
    PermissionsPolicyFeature2["ManualText"] = "manual-text";
    PermissionsPolicyFeature2["MediaPlaybackWhileNotVisible"] = "media-playback-while-not-visible";
    PermissionsPolicyFeature2["Microphone"] = "microphone";
    PermissionsPolicyFeature2["Midi"] = "midi";
    PermissionsPolicyFeature2["OnDeviceSpeechRecognition"] = "on-device-speech-recognition";
    PermissionsPolicyFeature2["OtpCredentials"] = "otp-credentials";
    PermissionsPolicyFeature2["Payment"] = "payment";
    PermissionsPolicyFeature2["PictureInPicture"] = "picture-in-picture";
    PermissionsPolicyFeature2["PrivateStateTokenIssuance"] = "private-state-token-issuance";
    PermissionsPolicyFeature2["PrivateStateTokenRedemption"] = "private-state-token-redemption";
    PermissionsPolicyFeature2["PublickeyCredentialsCreate"] = "publickey-credentials-create";
    PermissionsPolicyFeature2["PublickeyCredentialsGet"] = "publickey-credentials-get";
    PermissionsPolicyFeature2["Rewriter"] = "rewriter";
    PermissionsPolicyFeature2["ScreenWakeLock"] = "screen-wake-lock";
    PermissionsPolicyFeature2["Serial"] = "serial";
    PermissionsPolicyFeature2["SharedStorage"] = "shared-storage";
    PermissionsPolicyFeature2["SharedStorageSelectUrl"] = "shared-storage-select-url";
    PermissionsPolicyFeature2["SmartCard"] = "smart-card";
    PermissionsPolicyFeature2["SpeakerSelection"] = "speaker-selection";
    PermissionsPolicyFeature2["StorageAccess"] = "storage-access";
    PermissionsPolicyFeature2["SubApps"] = "sub-apps";
    PermissionsPolicyFeature2["Summarizer"] = "summarizer";
    PermissionsPolicyFeature2["SyncXhr"] = "sync-xhr";
    PermissionsPolicyFeature2["Tools"] = "tools";
    PermissionsPolicyFeature2["Translator"] = "translator";
    PermissionsPolicyFeature2["Unload"] = "unload";
    PermissionsPolicyFeature2["Usb"] = "usb";
    PermissionsPolicyFeature2["UsbUnrestricted"] = "usb-unrestricted";
    PermissionsPolicyFeature2["VerticalScroll"] = "vertical-scroll";
    PermissionsPolicyFeature2["WebAppInstallation"] = "web-app-installation";
    PermissionsPolicyFeature2["Webnn"] = "webnn";
    PermissionsPolicyFeature2["WebPrinting"] = "web-printing";
    PermissionsPolicyFeature2["WebShare"] = "web-share";
    PermissionsPolicyFeature2["WindowManagement"] = "window-management";
    PermissionsPolicyFeature2["Writer"] = "writer";
    PermissionsPolicyFeature2["XrSpatialTracking"] = "xr-spatial-tracking";
  })(PermissionsPolicyFeature = Page2.PermissionsPolicyFeature || (Page2.PermissionsPolicyFeature = {}));
  let PermissionsPolicyBlockReason;
  ((PermissionsPolicyBlockReason2) => {
    PermissionsPolicyBlockReason2["Header"] = "Header";
    PermissionsPolicyBlockReason2["IframeAttribute"] = "IframeAttribute";
    PermissionsPolicyBlockReason2["InFencedFrameTree"] = "InFencedFrameTree";
    PermissionsPolicyBlockReason2["InIsolatedApp"] = "InIsolatedApp";
  })(PermissionsPolicyBlockReason = Page2.PermissionsPolicyBlockReason || (Page2.PermissionsPolicyBlockReason = {}));
  let OriginTrialTokenStatus;
  ((OriginTrialTokenStatus2) => {
    OriginTrialTokenStatus2["Success"] = "Success";
    OriginTrialTokenStatus2["NotSupported"] = "NotSupported";
    OriginTrialTokenStatus2["Insecure"] = "Insecure";
    OriginTrialTokenStatus2["Expired"] = "Expired";
    OriginTrialTokenStatus2["WrongOrigin"] = "WrongOrigin";
    OriginTrialTokenStatus2["InvalidSignature"] = "InvalidSignature";
    OriginTrialTokenStatus2["Malformed"] = "Malformed";
    OriginTrialTokenStatus2["WrongVersion"] = "WrongVersion";
    OriginTrialTokenStatus2["FeatureDisabled"] = "FeatureDisabled";
    OriginTrialTokenStatus2["TokenDisabled"] = "TokenDisabled";
    OriginTrialTokenStatus2["FeatureDisabledForUser"] = "FeatureDisabledForUser";
    OriginTrialTokenStatus2["UnknownTrial"] = "UnknownTrial";
  })(OriginTrialTokenStatus = Page2.OriginTrialTokenStatus || (Page2.OriginTrialTokenStatus = {}));
  let OriginTrialStatus;
  ((OriginTrialStatus2) => {
    OriginTrialStatus2["Enabled"] = "Enabled";
    OriginTrialStatus2["ValidTokenNotProvided"] = "ValidTokenNotProvided";
    OriginTrialStatus2["OSNotSupported"] = "OSNotSupported";
    OriginTrialStatus2["TrialNotAllowed"] = "TrialNotAllowed";
  })(OriginTrialStatus = Page2.OriginTrialStatus || (Page2.OriginTrialStatus = {}));
  let OriginTrialUsageRestriction;
  ((OriginTrialUsageRestriction2) => {
    OriginTrialUsageRestriction2["None"] = "None";
    OriginTrialUsageRestriction2["Subset"] = "Subset";
  })(OriginTrialUsageRestriction = Page2.OriginTrialUsageRestriction || (Page2.OriginTrialUsageRestriction = {}));
  let TransitionType;
  ((TransitionType2) => {
    TransitionType2["Link"] = "link";
    TransitionType2["Typed"] = "typed";
    TransitionType2["Address_bar"] = "address_bar";
    TransitionType2["Auto_bookmark"] = "auto_bookmark";
    TransitionType2["Auto_subframe"] = "auto_subframe";
    TransitionType2["Manual_subframe"] = "manual_subframe";
    TransitionType2["Generated"] = "generated";
    TransitionType2["Auto_toplevel"] = "auto_toplevel";
    TransitionType2["Form_submit"] = "form_submit";
    TransitionType2["Reload"] = "reload";
    TransitionType2["Keyword"] = "keyword";
    TransitionType2["Keyword_generated"] = "keyword_generated";
    TransitionType2["Other"] = "other";
  })(TransitionType = Page2.TransitionType || (Page2.TransitionType = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["Alert"] = "alert";
    DialogType2["Confirm"] = "confirm";
    DialogType2["Prompt"] = "prompt";
    DialogType2["Beforeunload"] = "beforeunload";
  })(DialogType = Page2.DialogType || (Page2.DialogType = {}));
  let ClientNavigationReason;
  ((ClientNavigationReason2) => {
    ClientNavigationReason2["AnchorClick"] = "anchorClick";
    ClientNavigationReason2["FormSubmissionGet"] = "formSubmissionGet";
    ClientNavigationReason2["FormSubmissionPost"] = "formSubmissionPost";
    ClientNavigationReason2["HttpHeaderRefresh"] = "httpHeaderRefresh";
    ClientNavigationReason2["InitialFrameNavigation"] = "initialFrameNavigation";
    ClientNavigationReason2["MetaTagRefresh"] = "metaTagRefresh";
    ClientNavigationReason2["Other"] = "other";
    ClientNavigationReason2["PageBlockInterstitial"] = "pageBlockInterstitial";
    ClientNavigationReason2["Reload"] = "reload";
    ClientNavigationReason2["ScriptInitiated"] = "scriptInitiated";
  })(ClientNavigationReason = Page2.ClientNavigationReason || (Page2.ClientNavigationReason = {}));
  let ClientNavigationDisposition;
  ((ClientNavigationDisposition2) => {
    ClientNavigationDisposition2["CurrentTab"] = "currentTab";
    ClientNavigationDisposition2["NewTab"] = "newTab";
    ClientNavigationDisposition2["NewWindow"] = "newWindow";
    ClientNavigationDisposition2["Download"] = "download";
  })(ClientNavigationDisposition = Page2.ClientNavigationDisposition || (Page2.ClientNavigationDisposition = {}));
  let ReferrerPolicy;
  ((ReferrerPolicy2) => {
    ReferrerPolicy2["NoReferrer"] = "noReferrer";
    ReferrerPolicy2["NoReferrerWhenDowngrade"] = "noReferrerWhenDowngrade";
    ReferrerPolicy2["Origin"] = "origin";
    ReferrerPolicy2["OriginWhenCrossOrigin"] = "originWhenCrossOrigin";
    ReferrerPolicy2["SameOrigin"] = "sameOrigin";
    ReferrerPolicy2["StrictOrigin"] = "strictOrigin";
    ReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strictOriginWhenCrossOrigin";
    ReferrerPolicy2["UnsafeUrl"] = "unsafeUrl";
  })(ReferrerPolicy = Page2.ReferrerPolicy || (Page2.ReferrerPolicy = {}));
  let NavigationType;
  ((NavigationType2) => {
    NavigationType2["Navigation"] = "Navigation";
    NavigationType2["BackForwardCacheRestore"] = "BackForwardCacheRestore";
  })(NavigationType = Page2.NavigationType || (Page2.NavigationType = {}));
  let BackForwardCacheNotRestoredReason;
  ((BackForwardCacheNotRestoredReason2) => {
    BackForwardCacheNotRestoredReason2["NotPrimaryMainFrame"] = "NotPrimaryMainFrame";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabled"] = "BackForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["RelatedActiveContentsExist"] = "RelatedActiveContentsExist";
    BackForwardCacheNotRestoredReason2["HTTPStatusNotOK"] = "HTTPStatusNotOK";
    BackForwardCacheNotRestoredReason2["SchemeNotHTTPOrHTTPS"] = "SchemeNotHTTPOrHTTPS";
    BackForwardCacheNotRestoredReason2["Loading"] = "Loading";
    BackForwardCacheNotRestoredReason2["WasGrantedMediaAccess"] = "WasGrantedMediaAccess";
    BackForwardCacheNotRestoredReason2["DisableForRenderFrameHostCalled"] = "DisableForRenderFrameHostCalled";
    BackForwardCacheNotRestoredReason2["DomainNotAllowed"] = "DomainNotAllowed";
    BackForwardCacheNotRestoredReason2["HTTPMethodNotGET"] = "HTTPMethodNotGET";
    BackForwardCacheNotRestoredReason2["SubframeIsNavigating"] = "SubframeIsNavigating";
    BackForwardCacheNotRestoredReason2["Timeout"] = "Timeout";
    BackForwardCacheNotRestoredReason2["CacheLimit"] = "CacheLimit";
    BackForwardCacheNotRestoredReason2["JavaScriptExecution"] = "JavaScriptExecution";
    BackForwardCacheNotRestoredReason2["RendererProcessKilled"] = "RendererProcessKilled";
    BackForwardCacheNotRestoredReason2["RendererProcessCrashed"] = "RendererProcessCrashed";
    BackForwardCacheNotRestoredReason2["SchedulerTrackedFeatureUsed"] = "SchedulerTrackedFeatureUsed";
    BackForwardCacheNotRestoredReason2["ConflictingBrowsingInstance"] = "ConflictingBrowsingInstance";
    BackForwardCacheNotRestoredReason2["CacheFlushed"] = "CacheFlushed";
    BackForwardCacheNotRestoredReason2["ServiceWorkerVersionActivation"] = "ServiceWorkerVersionActivation";
    BackForwardCacheNotRestoredReason2["SessionRestored"] = "SessionRestored";
    BackForwardCacheNotRestoredReason2["ServiceWorkerPostMessage"] = "ServiceWorkerPostMessage";
    BackForwardCacheNotRestoredReason2["EnteredBackForwardCacheBeforeServiceWorkerHostAdded"] = "EnteredBackForwardCacheBeforeServiceWorkerHostAdded";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_SameSite"] = "RenderFrameHostReused_SameSite";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_CrossSite"] = "RenderFrameHostReused_CrossSite";
    BackForwardCacheNotRestoredReason2["ServiceWorkerClaim"] = "ServiceWorkerClaim";
    BackForwardCacheNotRestoredReason2["IgnoreEventAndEvict"] = "IgnoreEventAndEvict";
    BackForwardCacheNotRestoredReason2["HaveInnerContents"] = "HaveInnerContents";
    BackForwardCacheNotRestoredReason2["TimeoutPuttingInCache"] = "TimeoutPuttingInCache";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByLowMemory"] = "BackForwardCacheDisabledByLowMemory";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByCommandLine"] = "BackForwardCacheDisabledByCommandLine";
    BackForwardCacheNotRestoredReason2["NetworkRequestDatAPIpeDrainedAsBytesConsumer"] = "NetworkRequestDatapipeDrainedAsBytesConsumer";
    BackForwardCacheNotRestoredReason2["NetworkRequestRedirected"] = "NetworkRequestRedirected";
    BackForwardCacheNotRestoredReason2["NetworkRequestTimeout"] = "NetworkRequestTimeout";
    BackForwardCacheNotRestoredReason2["NetworkExceedsBufferLimit"] = "NetworkExceedsBufferLimit";
    BackForwardCacheNotRestoredReason2["NavigationCancelledWhileRestoring"] = "NavigationCancelledWhileRestoring";
    BackForwardCacheNotRestoredReason2["NotMostRecentNavigationEntry"] = "NotMostRecentNavigationEntry";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForPrerender"] = "BackForwardCacheDisabledForPrerender";
    BackForwardCacheNotRestoredReason2["UserAgentOverrideDiffers"] = "UserAgentOverrideDiffers";
    BackForwardCacheNotRestoredReason2["ForegroundCacheLimit"] = "ForegroundCacheLimit";
    BackForwardCacheNotRestoredReason2["ForwardCacheDisabled"] = "ForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["BrowsingInstanceNotSwapped"] = "BrowsingInstanceNotSwapped";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForDelegate"] = "BackForwardCacheDisabledForDelegate";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInMainFrame"] = "UnloadHandlerExistsInMainFrame";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInSubFrame"] = "UnloadHandlerExistsInSubFrame";
    BackForwardCacheNotRestoredReason2["ServiceWorkerUnregistration"] = "ServiceWorkerUnregistration";
    BackForwardCacheNotRestoredReason2["CacheControlNoStore"] = "CacheControlNoStore";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreCookieModified"] = "CacheControlNoStoreCookieModified";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreHTTPOnlyCookieModified"] = "CacheControlNoStoreHTTPOnlyCookieModified";
    BackForwardCacheNotRestoredReason2["NoResponseHead"] = "NoResponseHead";
    BackForwardCacheNotRestoredReason2["Unknown"] = "Unknown";
    BackForwardCacheNotRestoredReason2["ActivationNavigationsDisallowedForBug1234857"] = "ActivationNavigationsDisallowedForBug1234857";
    BackForwardCacheNotRestoredReason2["ErrorDocument"] = "ErrorDocument";
    BackForwardCacheNotRestoredReason2["FencedFramesEmbedder"] = "FencedFramesEmbedder";
    BackForwardCacheNotRestoredReason2["CookieDisabled"] = "CookieDisabled";
    BackForwardCacheNotRestoredReason2["HTTPAuthRequired"] = "HTTPAuthRequired";
    BackForwardCacheNotRestoredReason2["CookieFlushed"] = "CookieFlushed";
    BackForwardCacheNotRestoredReason2["BroadcastChannelOnMessage"] = "BroadcastChannelOnMessage";
    BackForwardCacheNotRestoredReason2["WebViewSettingsChanged"] = "WebViewSettingsChanged";
    BackForwardCacheNotRestoredReason2["WebViewJavaScriptObjectChanged"] = "WebViewJavaScriptObjectChanged";
    BackForwardCacheNotRestoredReason2["WebViewMessageListenerInjected"] = "WebViewMessageListenerInjected";
    BackForwardCacheNotRestoredReason2["WebViewSafeBrowsingAllowlistChanged"] = "WebViewSafeBrowsingAllowlistChanged";
    BackForwardCacheNotRestoredReason2["WebViewDocumentStartJavascriptChanged"] = "WebViewDocumentStartJavascriptChanged";
    BackForwardCacheNotRestoredReason2["WebSocket"] = "WebSocket";
    BackForwardCacheNotRestoredReason2["WebTransport"] = "WebTransport";
    BackForwardCacheNotRestoredReason2["WebRTC"] = "WebRTC";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoStore"] = "MainResourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoCache"] = "MainResourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoStore"] = "SubresourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoCache"] = "SubresourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["ContainsPlugins"] = "ContainsPlugins";
    BackForwardCacheNotRestoredReason2["DocumentLoaded"] = "DocumentLoaded";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestOthers"] = "OutstandingNetworkRequestOthers";
    BackForwardCacheNotRestoredReason2["RequestedMIDIPermission"] = "RequestedMIDIPermission";
    BackForwardCacheNotRestoredReason2["RequestedAudioCapturePermission"] = "RequestedAudioCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedVideoCapturePermission"] = "RequestedVideoCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedBackForwardCacheBlockedSensors"] = "RequestedBackForwardCacheBlockedSensors";
    BackForwardCacheNotRestoredReason2["RequestedBackgroundWorkPermission"] = "RequestedBackgroundWorkPermission";
    BackForwardCacheNotRestoredReason2["BroadcastChannel"] = "BroadcastChannel";
    BackForwardCacheNotRestoredReason2["WebXR"] = "WebXR";
    BackForwardCacheNotRestoredReason2["SharedWorker"] = "SharedWorker";
    BackForwardCacheNotRestoredReason2["SharedWorkerMessage"] = "SharedWorkerMessage";
    BackForwardCacheNotRestoredReason2["SharedWorkerWithNoActiveClient"] = "SharedWorkerWithNoActiveClient";
    BackForwardCacheNotRestoredReason2["WebLocks"] = "WebLocks";
    BackForwardCacheNotRestoredReason2["WebLocksContention"] = "WebLocksContention";
    BackForwardCacheNotRestoredReason2["WebHID"] = "WebHID";
    BackForwardCacheNotRestoredReason2["WebBluetooth"] = "WebBluetooth";
    BackForwardCacheNotRestoredReason2["WebShare"] = "WebShare";
    BackForwardCacheNotRestoredReason2["RequestedStorageAccessGrant"] = "RequestedStorageAccessGrant";
    BackForwardCacheNotRestoredReason2["WebNfc"] = "WebNfc";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestFetch"] = "OutstandingNetworkRequestFetch";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestXHR"] = "OutstandingNetworkRequestXHR";
    BackForwardCacheNotRestoredReason2["AppBanner"] = "AppBanner";
    BackForwardCacheNotRestoredReason2["Printing"] = "Printing";
    BackForwardCacheNotRestoredReason2["WebDatabase"] = "WebDatabase";
    BackForwardCacheNotRestoredReason2["PictureInPicture"] = "PictureInPicture";
    BackForwardCacheNotRestoredReason2["SpeechRecognizer"] = "SpeechRecognizer";
    BackForwardCacheNotRestoredReason2["IdleManager"] = "IdleManager";
    BackForwardCacheNotRestoredReason2["PaymentManager"] = "PaymentManager";
    BackForwardCacheNotRestoredReason2["SpeechSynthesis"] = "SpeechSynthesis";
    BackForwardCacheNotRestoredReason2["KeyboardLock"] = "KeyboardLock";
    BackForwardCacheNotRestoredReason2["WebOTPService"] = "WebOTPService";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestDirectSocket"] = "OutstandingNetworkRequestDirectSocket";
    BackForwardCacheNotRestoredReason2["InjectedJavascript"] = "InjectedJavascript";
    BackForwardCacheNotRestoredReason2["InjectedStyleSheet"] = "InjectedStyleSheet";
    BackForwardCacheNotRestoredReason2["KeepaliveRequest"] = "KeepaliveRequest";
    BackForwardCacheNotRestoredReason2["IndexedDBEvent"] = "IndexedDBEvent";
    BackForwardCacheNotRestoredReason2["Dummy"] = "Dummy";
    BackForwardCacheNotRestoredReason2["JsNetworkRequestReceivedCacheControlNoStoreResource"] = "JsNetworkRequestReceivedCacheControlNoStoreResource";
    BackForwardCacheNotRestoredReason2["WebRTCUsedWithCCNS"] = "WebRTCUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebTransportUsedWithCCNS"] = "WebTransportUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebSocketUsedWithCCNS"] = "WebSocketUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["SmartCard"] = "SmartCard";
    BackForwardCacheNotRestoredReason2["LiveMediaStreamTrack"] = "LiveMediaStreamTrack";
    BackForwardCacheNotRestoredReason2["UnloadHandler"] = "UnloadHandler";
    BackForwardCacheNotRestoredReason2["ParserAborted"] = "ParserAborted";
    BackForwardCacheNotRestoredReason2["ContentSecurityHandler"] = "ContentSecurityHandler";
    BackForwardCacheNotRestoredReason2["ContentWebAuthenticationAPI"] = "ContentWebAuthenticationAPI";
    BackForwardCacheNotRestoredReason2["ContentFileChooser"] = "ContentFileChooser";
    BackForwardCacheNotRestoredReason2["ContentSerial"] = "ContentSerial";
    BackForwardCacheNotRestoredReason2["ContentFileSystemAccess"] = "ContentFileSystemAccess";
    BackForwardCacheNotRestoredReason2["ContentMediaDevicesDispatcherHost"] = "ContentMediaDevicesDispatcherHost";
    BackForwardCacheNotRestoredReason2["ContentWebBluetooth"] = "ContentWebBluetooth";
    BackForwardCacheNotRestoredReason2["ContentWebUSB"] = "ContentWebUSB";
    BackForwardCacheNotRestoredReason2["ContentMediaSessionService"] = "ContentMediaSessionService";
    BackForwardCacheNotRestoredReason2["ContentScreenReader"] = "ContentScreenReader";
    BackForwardCacheNotRestoredReason2["ContentDiscarded"] = "ContentDiscarded";
    BackForwardCacheNotRestoredReason2["EmbedderPopupBlockerTabHelper"] = "EmbedderPopupBlockerTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingTriggeredPopupBlocker"] = "EmbedderSafeBrowsingTriggeredPopupBlocker";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingThreatDetails"] = "EmbedderSafeBrowsingThreatDetails";
    BackForwardCacheNotRestoredReason2["EmbedderAppBannerManager"] = "EmbedderAppBannerManager";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerViewerSource"] = "EmbedderDomDistillerViewerSource";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerSelfDeletingRequestDelegate"] = "EmbedderDomDistillerSelfDeletingRequestDelegate";
    BackForwardCacheNotRestoredReason2["EmbedderOomInterventionTabHelper"] = "EmbedderOomInterventionTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderOfflinePage"] = "EmbedderOfflinePage";
    BackForwardCacheNotRestoredReason2["EmbedderChromePasswordManagerClientBindCredentialManager"] = "EmbedderChromePasswordManagerClientBindCredentialManager";
    BackForwardCacheNotRestoredReason2["EmbedderPermissionRequestManager"] = "EmbedderPermissionRequestManager";
    BackForwardCacheNotRestoredReason2["EmbedderModalDialog"] = "EmbedderModalDialog";
    BackForwardCacheNotRestoredReason2["EmbedderExtensions"] = "EmbedderExtensions";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessaging"] = "EmbedderExtensionMessaging";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessagingForOpenPort"] = "EmbedderExtensionMessagingForOpenPort";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionSentMessageToCachedFrame"] = "EmbedderExtensionSentMessageToCachedFrame";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionFrame"] = "EmbedderExtensionFrame";
    BackForwardCacheNotRestoredReason2["EmbedderPrivilegedWebContents"] = "EmbedderPrivilegedWebContents";
    BackForwardCacheNotRestoredReason2["RequestedByWebViewClient"] = "RequestedByWebViewClient";
    BackForwardCacheNotRestoredReason2["PostMessageByWebViewClient"] = "PostMessageByWebViewClient";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreDeviceBoundSessionTerminated"] = "CacheControlNoStoreDeviceBoundSessionTerminated";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnModerateMemoryPressure"] = "CacheLimitPrunedOnModerateMemoryPressure";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnCriticalMemoryPressure"] = "CacheLimitPrunedOnCriticalMemoryPressure";
  })(BackForwardCacheNotRestoredReason = Page2.BackForwardCacheNotRestoredReason || (Page2.BackForwardCacheNotRestoredReason = {}));
  let BackForwardCacheNotRestoredReasonType;
  ((BackForwardCacheNotRestoredReasonType2) => {
    BackForwardCacheNotRestoredReasonType2["SupportPending"] = "SupportPending";
    BackForwardCacheNotRestoredReasonType2["PageSupportNeeded"] = "PageSupportNeeded";
    BackForwardCacheNotRestoredReasonType2["Circumstantial"] = "Circumstantial";
  })(BackForwardCacheNotRestoredReasonType = Page2.BackForwardCacheNotRestoredReasonType || (Page2.BackForwardCacheNotRestoredReasonType = {}));
  let CaptureScreenshotRequestFormat;
  ((CaptureScreenshotRequestFormat2) => {
    CaptureScreenshotRequestFormat2["Jpeg"] = "jpeg";
    CaptureScreenshotRequestFormat2["Png"] = "png";
    CaptureScreenshotRequestFormat2["Webp"] = "webp";
  })(CaptureScreenshotRequestFormat = Page2.CaptureScreenshotRequestFormat || (Page2.CaptureScreenshotRequestFormat = {}));
  let CaptureSnapshotRequestFormat;
  ((CaptureSnapshotRequestFormat2) => {
    CaptureSnapshotRequestFormat2["MHTML"] = "mhtml";
  })(CaptureSnapshotRequestFormat = Page2.CaptureSnapshotRequestFormat || (Page2.CaptureSnapshotRequestFormat = {}));
  let PrintToPDFRequestTransferMode;
  ((PrintToPDFRequestTransferMode2) => {
    PrintToPDFRequestTransferMode2["ReturnAsBase64"] = "ReturnAsBase64";
    PrintToPDFRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(PrintToPDFRequestTransferMode = Page2.PrintToPDFRequestTransferMode || (Page2.PrintToPDFRequestTransferMode = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Page2.SetDownloadBehaviorRequestBehavior || (Page2.SetDownloadBehaviorRequestBehavior = {}));
  let SetTouchEmulationEnabledRequestConfiguration;
  ((SetTouchEmulationEnabledRequestConfiguration2) => {
    SetTouchEmulationEnabledRequestConfiguration2["Mobile"] = "mobile";
    SetTouchEmulationEnabledRequestConfiguration2["Desktop"] = "desktop";
  })(SetTouchEmulationEnabledRequestConfiguration = Page2.SetTouchEmulationEnabledRequestConfiguration || (Page2.SetTouchEmulationEnabledRequestConfiguration = {}));
  let StartScreencastRequestFormat;
  ((StartScreencastRequestFormat2) => {
    StartScreencastRequestFormat2["Jpeg"] = "jpeg";
    StartScreencastRequestFormat2["Png"] = "png";
  })(StartScreencastRequestFormat = Page2.StartScreencastRequestFormat || (Page2.StartScreencastRequestFormat = {}));
  let SetWebLifecycleStateRequestState;
  ((SetWebLifecycleStateRequestState2) => {
    SetWebLifecycleStateRequestState2["Frozen"] = "frozen";
    SetWebLifecycleStateRequestState2["Active"] = "active";
  })(SetWebLifecycleStateRequestState = Page2.SetWebLifecycleStateRequestState || (Page2.SetWebLifecycleStateRequestState = {}));
  let SetSPCTransactionModeRequestMode;
  ((SetSPCTransactionModeRequestMode2) => {
    SetSPCTransactionModeRequestMode2["None"] = "none";
    SetSPCTransactionModeRequestMode2["AutoAccept"] = "autoAccept";
    SetSPCTransactionModeRequestMode2["AutoChooseToAuthAnotherWay"] = "autoChooseToAuthAnotherWay";
    SetSPCTransactionModeRequestMode2["AutoReject"] = "autoReject";
    SetSPCTransactionModeRequestMode2["AutoOptOut"] = "autoOptOut";
  })(SetSPCTransactionModeRequestMode = Page2.SetSPCTransactionModeRequestMode || (Page2.SetSPCTransactionModeRequestMode = {}));
  let SetRPHRegistrationModeRequestMode;
  ((SetRPHRegistrationModeRequestMode2) => {
    SetRPHRegistrationModeRequestMode2["None"] = "none";
    SetRPHRegistrationModeRequestMode2["AutoAccept"] = "autoAccept";
    SetRPHRegistrationModeRequestMode2["AutoReject"] = "autoReject";
  })(SetRPHRegistrationModeRequestMode = Page2.SetRPHRegistrationModeRequestMode || (Page2.SetRPHRegistrationModeRequestMode = {}));
  let FileChooserOpenedEventMode;
  ((FileChooserOpenedEventMode2) => {
    FileChooserOpenedEventMode2["SelectSingle"] = "selectSingle";
    FileChooserOpenedEventMode2["SelectMultiple"] = "selectMultiple";
  })(FileChooserOpenedEventMode = Page2.FileChooserOpenedEventMode || (Page2.FileChooserOpenedEventMode = {}));
  let FrameDetachedEventReason;
  ((FrameDetachedEventReason2) => {
    FrameDetachedEventReason2["Remove"] = "remove";
    FrameDetachedEventReason2["Swap"] = "swap";
  })(FrameDetachedEventReason = Page2.FrameDetachedEventReason || (Page2.FrameDetachedEventReason = {}));
  let FrameStartedNavigatingEventNavigationType;
  ((FrameStartedNavigatingEventNavigationType2) => {
    FrameStartedNavigatingEventNavigationType2["Reload"] = "reload";
    FrameStartedNavigatingEventNavigationType2["ReloadBypassingCache"] = "reloadBypassingCache";
    FrameStartedNavigatingEventNavigationType2["Restore"] = "restore";
    FrameStartedNavigatingEventNavigationType2["RestoreWithPost"] = "restoreWithPost";
    FrameStartedNavigatingEventNavigationType2["HistorySameDocument"] = "historySameDocument";
    FrameStartedNavigatingEventNavigationType2["HistoryDifferentDocument"] = "historyDifferentDocument";
    FrameStartedNavigatingEventNavigationType2["SameDocument"] = "sameDocument";
    FrameStartedNavigatingEventNavigationType2["DifferentDocument"] = "differentDocument";
  })(FrameStartedNavigatingEventNavigationType = Page2.FrameStartedNavigatingEventNavigationType || (Page2.FrameStartedNavigatingEventNavigationType = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Page2.DownloadProgressEventState || (Page2.DownloadProgressEventState = {}));
  let NavigatedWithinDocumentEventNavigationType;
  ((NavigatedWithinDocumentEventNavigationType2) => {
    NavigatedWithinDocumentEventNavigationType2["Fragment"] = "fragment";
    NavigatedWithinDocumentEventNavigationType2["HistoryAPI"] = "historyApi";
    NavigatedWithinDocumentEventNavigationType2["Other"] = "other";
  })(NavigatedWithinDocumentEventNavigationType = Page2.NavigatedWithinDocumentEventNavigationType || (Page2.NavigatedWithinDocumentEventNavigationType = {}));
})(Page || (Page = {}));
var Performance;
((Performance2) => {
  let EnableRequestTimeDomain;
  ((EnableRequestTimeDomain2) => {
    EnableRequestTimeDomain2["TimeTicks"] = "timeTicks";
    EnableRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(EnableRequestTimeDomain = Performance2.EnableRequestTimeDomain || (Performance2.EnableRequestTimeDomain = {}));
  let SetTimeDomainRequestTimeDomain;
  ((SetTimeDomainRequestTimeDomain2) => {
    SetTimeDomainRequestTimeDomain2["TimeTicks"] = "timeTicks";
    SetTimeDomainRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(SetTimeDomainRequestTimeDomain = Performance2.SetTimeDomainRequestTimeDomain || (Performance2.SetTimeDomainRequestTimeDomain = {}));
})(Performance || (Performance = {}));
var Preload;
((Preload2) => {
  let RuleSetErrorType;
  ((RuleSetErrorType2) => {
    RuleSetErrorType2["SourceIsNotJsonObject"] = "SourceIsNotJsonObject";
    RuleSetErrorType2["InvalidRulesSkipped"] = "InvalidRulesSkipped";
    RuleSetErrorType2["InvalidRulesetLevelTag"] = "InvalidRulesetLevelTag";
  })(RuleSetErrorType = Preload2.RuleSetErrorType || (Preload2.RuleSetErrorType = {}));
  let SpeculationAction;
  ((SpeculationAction2) => {
    SpeculationAction2["Prefetch"] = "Prefetch";
    SpeculationAction2["Prerender"] = "Prerender";
    SpeculationAction2["PrerenderUntilScript"] = "PrerenderUntilScript";
  })(SpeculationAction = Preload2.SpeculationAction || (Preload2.SpeculationAction = {}));
  let SpeculationTargetHint;
  ((SpeculationTargetHint2) => {
    SpeculationTargetHint2["Blank"] = "Blank";
    SpeculationTargetHint2["Self"] = "Self";
  })(SpeculationTargetHint = Preload2.SpeculationTargetHint || (Preload2.SpeculationTargetHint = {}));
  let PrerenderFinalStatus;
  ((PrerenderFinalStatus2) => {
    PrerenderFinalStatus2["Activated"] = "Activated";
    PrerenderFinalStatus2["Destroyed"] = "Destroyed";
    PrerenderFinalStatus2["LowEndDevice"] = "LowEndDevice";
    PrerenderFinalStatus2["InvalidSchemeRedirect"] = "InvalidSchemeRedirect";
    PrerenderFinalStatus2["InvalidSchemeNavigation"] = "InvalidSchemeNavigation";
    PrerenderFinalStatus2["NavigationRequestBlockedByCsp"] = "NavigationRequestBlockedByCsp";
    PrerenderFinalStatus2["MojoBinderPolicy"] = "MojoBinderPolicy";
    PrerenderFinalStatus2["RendererProcessCrashed"] = "RendererProcessCrashed";
    PrerenderFinalStatus2["RendererProcessKilled"] = "RendererProcessKilled";
    PrerenderFinalStatus2["Download"] = "Download";
    PrerenderFinalStatus2["TriggerDestroyed"] = "TriggerDestroyed";
    PrerenderFinalStatus2["NavigationNotCommitted"] = "NavigationNotCommitted";
    PrerenderFinalStatus2["NavigationBadHttpStatus"] = "NavigationBadHttpStatus";
    PrerenderFinalStatus2["ClientCertRequested"] = "ClientCertRequested";
    PrerenderFinalStatus2["NavigationRequestNetworkError"] = "NavigationRequestNetworkError";
    PrerenderFinalStatus2["CancelAllHostsForTesting"] = "CancelAllHostsForTesting";
    PrerenderFinalStatus2["DidFailLoad"] = "DidFailLoad";
    PrerenderFinalStatus2["Stop"] = "Stop";
    PrerenderFinalStatus2["SslCertificateError"] = "SslCertificateError";
    PrerenderFinalStatus2["LoginAuthRequested"] = "LoginAuthRequested";
    PrerenderFinalStatus2["UaChangeRequiresReload"] = "UaChangeRequiresReload";
    PrerenderFinalStatus2["BlockedByClient"] = "BlockedByClient";
    PrerenderFinalStatus2["AudioOutputDeviceRequested"] = "AudioOutputDeviceRequested";
    PrerenderFinalStatus2["MixedContent"] = "MixedContent";
    PrerenderFinalStatus2["TriggerBackgrounded"] = "TriggerBackgrounded";
    PrerenderFinalStatus2["MemoryLimitExceeded"] = "MemoryLimitExceeded";
    PrerenderFinalStatus2["DataSaverEnabled"] = "DataSaverEnabled";
    PrerenderFinalStatus2["TriggerUrlHasEffectiveUrl"] = "TriggerUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivatedBeforeStarted"] = "ActivatedBeforeStarted";
    PrerenderFinalStatus2["InactivePageRestriction"] = "InactivePageRestriction";
    PrerenderFinalStatus2["StartFailed"] = "StartFailed";
    PrerenderFinalStatus2["TimeoutBackgrounded"] = "TimeoutBackgrounded";
    PrerenderFinalStatus2["CrossSiteRedirectInInitialNavigation"] = "CrossSiteRedirectInInitialNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInInitialNavigation"] = "CrossSiteNavigationInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInInitialNavigation"] = "SameSiteCrossOriginRedirectNotOptInInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInInitialNavigation"] = "SameSiteCrossOriginNavigationNotOptInInInitialNavigation";
    PrerenderFinalStatus2["ActivationNavigationParameterMismatch"] = "ActivationNavigationParameterMismatch";
    PrerenderFinalStatus2["ActivatedInBackground"] = "ActivatedInBackground";
    PrerenderFinalStatus2["EmbedderHostDisallowed"] = "EmbedderHostDisallowed";
    PrerenderFinalStatus2["ActivationNavigationDestroyedBeforeSuccess"] = "ActivationNavigationDestroyedBeforeSuccess";
    PrerenderFinalStatus2["TabClosedByUserGesture"] = "TabClosedByUserGesture";
    PrerenderFinalStatus2["TabClosedWithoutUserGesture"] = "TabClosedWithoutUserGesture";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessCrashed"] = "PrimaryMainFrameRendererProcessCrashed";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessKilled"] = "PrimaryMainFrameRendererProcessKilled";
    PrerenderFinalStatus2["ActivationFramePolicyNotCompatible"] = "ActivationFramePolicyNotCompatible";
    PrerenderFinalStatus2["PreloadingDisabled"] = "PreloadingDisabled";
    PrerenderFinalStatus2["BatterySaverEnabled"] = "BatterySaverEnabled";
    PrerenderFinalStatus2["ActivatedDuringMainFrameNavigation"] = "ActivatedDuringMainFrameNavigation";
    PrerenderFinalStatus2["PreloadingUnsupportedByWebContents"] = "PreloadingUnsupportedByWebContents";
    PrerenderFinalStatus2["CrossSiteRedirectInMainFrameNavigation"] = "CrossSiteRedirectInMainFrameNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInMainFrameNavigation"] = "CrossSiteNavigationInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["MemoryPressureOnTrigger"] = "MemoryPressureOnTrigger";
    PrerenderFinalStatus2["MemoryPressureAfterTriggered"] = "MemoryPressureAfterTriggered";
    PrerenderFinalStatus2["PrerenderingDisabledByDevTools"] = "PrerenderingDisabledByDevTools";
    PrerenderFinalStatus2["SpeculationRuleRemoved"] = "SpeculationRuleRemoved";
    PrerenderFinalStatus2["ActivatedWithAuxiliaryBrowsingContexts"] = "ActivatedWithAuxiliaryBrowsingContexts";
    PrerenderFinalStatus2["MaxNumOfRunningEagerPrerendersExceeded"] = "MaxNumOfRunningEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningNonEagerPrerendersExceeded"] = "MaxNumOfRunningNonEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningEmbedderPrerendersExceeded"] = "MaxNumOfRunningEmbedderPrerendersExceeded";
    PrerenderFinalStatus2["PrerenderingUrlHasEffectiveUrl"] = "PrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["RedirectedPrerenderingUrlHasEffectiveUrl"] = "RedirectedPrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivationUrlHasEffectiveUrl"] = "ActivationUrlHasEffectiveUrl";
    PrerenderFinalStatus2["JavaScriptInterfaceAdded"] = "JavaScriptInterfaceAdded";
    PrerenderFinalStatus2["JavaScriptInterfaceRemoved"] = "JavaScriptInterfaceRemoved";
    PrerenderFinalStatus2["AllPrerenderingCanceled"] = "AllPrerenderingCanceled";
    PrerenderFinalStatus2["WindowClosed"] = "WindowClosed";
    PrerenderFinalStatus2["SlowNetwork"] = "SlowNetwork";
    PrerenderFinalStatus2["OtherPrerenderedPageActivated"] = "OtherPrerenderedPageActivated";
    PrerenderFinalStatus2["V8OptimizerDisabled"] = "V8OptimizerDisabled";
    PrerenderFinalStatus2["PrerenderFailedDuringPrefetch"] = "PrerenderFailedDuringPrefetch";
    PrerenderFinalStatus2["BrowsingDataRemoved"] = "BrowsingDataRemoved";
    PrerenderFinalStatus2["PrerenderHostReused"] = "PrerenderHostReused";
    PrerenderFinalStatus2["FormSubmitWhenPrerendering"] = "FormSubmitWhenPrerendering";
    PrerenderFinalStatus2["CrossDocumentRestart"] = "CrossDocumentRestart";
  })(PrerenderFinalStatus = Preload2.PrerenderFinalStatus || (Preload2.PrerenderFinalStatus = {}));
  let PreloadingStatus;
  ((PreloadingStatus2) => {
    PreloadingStatus2["Pending"] = "Pending";
    PreloadingStatus2["Running"] = "Running";
    PreloadingStatus2["Ready"] = "Ready";
    PreloadingStatus2["Success"] = "Success";
    PreloadingStatus2["Failure"] = "Failure";
    PreloadingStatus2["NotSupported"] = "NotSupported";
  })(PreloadingStatus = Preload2.PreloadingStatus || (Preload2.PreloadingStatus = {}));
  let PrefetchStatus;
  ((PrefetchStatus2) => {
    PrefetchStatus2["PrefetchAllowed"] = "PrefetchAllowed";
    PrefetchStatus2["PrefetchFailedIneligibleRedirect"] = "PrefetchFailedIneligibleRedirect";
    PrefetchStatus2["PrefetchFailedInvalidRedirect"] = "PrefetchFailedInvalidRedirect";
    PrefetchStatus2["PrefetchFailedMIMENotSupported"] = "PrefetchFailedMIMENotSupported";
    PrefetchStatus2["PrefetchFailedNetError"] = "PrefetchFailedNetError";
    PrefetchStatus2["PrefetchFailedNon2XX"] = "PrefetchFailedNon2XX";
    PrefetchStatus2["PrefetchEvictedAfterBrowsingDataRemoved"] = "PrefetchEvictedAfterBrowsingDataRemoved";
    PrefetchStatus2["PrefetchEvictedAfterCandidateRemoved"] = "PrefetchEvictedAfterCandidateRemoved";
    PrefetchStatus2["PrefetchEvictedForNewerPrefetch"] = "PrefetchEvictedForNewerPrefetch";
    PrefetchStatus2["PrefetchHeldback"] = "PrefetchHeldback";
    PrefetchStatus2["PrefetchIneligibleRetryAfter"] = "PrefetchIneligibleRetryAfter";
    PrefetchStatus2["PrefetchIsPrivacyDecoy"] = "PrefetchIsPrivacyDecoy";
    PrefetchStatus2["PrefetchIsStale"] = "PrefetchIsStale";
    PrefetchStatus2["PrefetchNotEligibleBlockedByConnectionAllowlist"] = "PrefetchNotEligibleBlockedByConnectionAllowlist";
    PrefetchStatus2["PrefetchNotEligibleBrowserContextOffTheRecord"] = "PrefetchNotEligibleBrowserContextOffTheRecord";
    PrefetchStatus2["PrefetchNotEligibleCrossOrigin"] = "PrefetchNotEligibleCrossOrigin";
    PrefetchStatus2["PrefetchNotEligibleDataSaverEnabled"] = "PrefetchNotEligibleDataSaverEnabled";
    PrefetchStatus2["PrefetchNotEligibleExistingProxy"] = "PrefetchNotEligibleExistingProxy";
    PrefetchStatus2["PrefetchNotEligibleHostIsNonUnique"] = "PrefetchNotEligibleHostIsNonUnique";
    PrefetchStatus2["PrefetchNotEligibleNonDefaultStoragePartition"] = "PrefetchNotEligibleNonDefaultStoragePartition";
    PrefetchStatus2["PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy"] = "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy";
    PrefetchStatus2["PrefetchNotEligibleSchemeIsNotHttps"] = "PrefetchNotEligibleSchemeIsNotHttps";
    PrefetchStatus2["PrefetchNotEligibleUserHasCookies"] = "PrefetchNotEligibleUserHasCookies";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorker"] = "PrefetchNotEligibleUserHasServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler"] = "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler";
    PrefetchStatus2["PrefetchNotEligibleRedirectFromServiceWorker"] = "PrefetchNotEligibleRedirectFromServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleRedirectToServiceWorker"] = "PrefetchNotEligibleRedirectToServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleBatterySaverEnabled"] = "PrefetchNotEligibleBatterySaverEnabled";
    PrefetchStatus2["PrefetchNotEligiblePreloadingDisabled"] = "PrefetchNotEligiblePreloadingDisabled";
    PrefetchStatus2["PrefetchNotFinishedInTime"] = "PrefetchNotFinishedInTime";
    PrefetchStatus2["PrefetchNotStarted"] = "PrefetchNotStarted";
    PrefetchStatus2["PrefetchNotUsedCookiesChanged"] = "PrefetchNotUsedCookiesChanged";
    PrefetchStatus2["PrefetchProxyNotAvailable"] = "PrefetchProxyNotAvailable";
    PrefetchStatus2["PrefetchResponseUsed"] = "PrefetchResponseUsed";
    PrefetchStatus2["PrefetchSuccessfulButNotUsed"] = "PrefetchSuccessfulButNotUsed";
    PrefetchStatus2["PrefetchNotUsedProbeFailed"] = "PrefetchNotUsedProbeFailed";
    PrefetchStatus2["PrefetchCancelledOnUserNavigation"] = "PrefetchCancelledOnUserNavigation";
  })(PrefetchStatus = Preload2.PrefetchStatus || (Preload2.PrefetchStatus = {}));
})(Preload || (Preload = {}));
var Security;
((Security2) => {
  let MixedContentType;
  ((MixedContentType2) => {
    MixedContentType2["Blockable"] = "blockable";
    MixedContentType2["OptionallyBlockable"] = "optionally-blockable";
    MixedContentType2["None"] = "none";
  })(MixedContentType = Security2.MixedContentType || (Security2.MixedContentType = {}));
  let SecurityState;
  ((SecurityState2) => {
    SecurityState2["Unknown"] = "unknown";
    SecurityState2["Neutral"] = "neutral";
    SecurityState2["Insecure"] = "insecure";
    SecurityState2["Secure"] = "secure";
    SecurityState2["Info"] = "info";
    SecurityState2["InsecureBroken"] = "insecure-broken";
  })(SecurityState = Security2.SecurityState || (Security2.SecurityState = {}));
  let SafetyTipStatus;
  ((SafetyTipStatus2) => {
    SafetyTipStatus2["BadReputation"] = "badReputation";
    SafetyTipStatus2["Lookalike"] = "lookalike";
  })(SafetyTipStatus = Security2.SafetyTipStatus || (Security2.SafetyTipStatus = {}));
  let CertificateErrorAction;
  ((CertificateErrorAction2) => {
    CertificateErrorAction2["Continue"] = "continue";
    CertificateErrorAction2["Cancel"] = "cancel";
  })(CertificateErrorAction = Security2.CertificateErrorAction || (Security2.CertificateErrorAction = {}));
})(Security || (Security = {}));
var ServiceWorker;
((ServiceWorker2) => {
  let ServiceWorkerVersionRunningStatus;
  ((ServiceWorkerVersionRunningStatus2) => {
    ServiceWorkerVersionRunningStatus2["Stopped"] = "stopped";
    ServiceWorkerVersionRunningStatus2["Starting"] = "starting";
    ServiceWorkerVersionRunningStatus2["Running"] = "running";
    ServiceWorkerVersionRunningStatus2["Stopping"] = "stopping";
  })(ServiceWorkerVersionRunningStatus = ServiceWorker2.ServiceWorkerVersionRunningStatus || (ServiceWorker2.ServiceWorkerVersionRunningStatus = {}));
  let ServiceWorkerVersionStatus;
  ((ServiceWorkerVersionStatus2) => {
    ServiceWorkerVersionStatus2["New"] = "new";
    ServiceWorkerVersionStatus2["Installing"] = "installing";
    ServiceWorkerVersionStatus2["Installed"] = "installed";
    ServiceWorkerVersionStatus2["Activating"] = "activating";
    ServiceWorkerVersionStatus2["Activated"] = "activated";
    ServiceWorkerVersionStatus2["Redundant"] = "redundant";
  })(ServiceWorkerVersionStatus = ServiceWorker2.ServiceWorkerVersionStatus || (ServiceWorker2.ServiceWorkerVersionStatus = {}));
  let ServiceWorkerRouterSourceType;
  ((ServiceWorkerRouterSourceType2) => {
    ServiceWorkerRouterSourceType2["Cache"] = "cache";
    ServiceWorkerRouterSourceType2["FetchEvent"] = "fetchEvent";
    ServiceWorkerRouterSourceType2["Network"] = "network";
    ServiceWorkerRouterSourceType2["RaceNetworkAndFetchHandler"] = "raceNetworkAndFetchHandler";
    ServiceWorkerRouterSourceType2["RaceNetworkAndCache"] = "raceNetworkAndCache";
    ServiceWorkerRouterSourceType2["SourceDict"] = "sourceDict";
  })(ServiceWorkerRouterSourceType = ServiceWorker2.ServiceWorkerRouterSourceType || (ServiceWorker2.ServiceWorkerRouterSourceType = {}));
})(ServiceWorker || (ServiceWorker = {}));
var SmartCardEmulation;
((SmartCardEmulation2) => {
  let ResultCode;
  ((ResultCode2) => {
    ResultCode2["Success"] = "success";
    ResultCode2["RemovedCard"] = "removed-card";
    ResultCode2["ResetCard"] = "reset-card";
    ResultCode2["UnpoweredCard"] = "unpowered-card";
    ResultCode2["UnresponsiveCard"] = "unresponsive-card";
    ResultCode2["UnsupportedCard"] = "unsupported-card";
    ResultCode2["ReaderUnavailable"] = "reader-unavailable";
    ResultCode2["SharingViolation"] = "sharing-violation";
    ResultCode2["NotTransacted"] = "not-transacted";
    ResultCode2["NoSmartcard"] = "no-smartcard";
    ResultCode2["ProtoMismatch"] = "proto-mismatch";
    ResultCode2["SystemCancelled"] = "system-cancelled";
    ResultCode2["NotReady"] = "not-ready";
    ResultCode2["Cancelled"] = "cancelled";
    ResultCode2["InsufficientBuffer"] = "insufficient-buffer";
    ResultCode2["InvalidHandle"] = "invalid-handle";
    ResultCode2["InvalidParameter"] = "invalid-parameter";
    ResultCode2["InvalidValue"] = "invalid-value";
    ResultCode2["NoMemory"] = "no-memory";
    ResultCode2["Timeout"] = "timeout";
    ResultCode2["UnknownReader"] = "unknown-reader";
    ResultCode2["UnsupportedFeature"] = "unsupported-feature";
    ResultCode2["NoReadersAvailable"] = "no-readers-available";
    ResultCode2["ServiceStopped"] = "service-stopped";
    ResultCode2["NoService"] = "no-service";
    ResultCode2["CommError"] = "comm-error";
    ResultCode2["InternalError"] = "internal-error";
    ResultCode2["ServerTooBusy"] = "server-too-busy";
    ResultCode2["Unexpected"] = "unexpected";
    ResultCode2["Shutdown"] = "shutdown";
    ResultCode2["UnknownCard"] = "unknown-card";
    ResultCode2["Unknown"] = "unknown";
  })(ResultCode = SmartCardEmulation2.ResultCode || (SmartCardEmulation2.ResultCode = {}));
  let ShareMode;
  ((ShareMode2) => {
    ShareMode2["Shared"] = "shared";
    ShareMode2["Exclusive"] = "exclusive";
    ShareMode2["Direct"] = "direct";
  })(ShareMode = SmartCardEmulation2.ShareMode || (SmartCardEmulation2.ShareMode = {}));
  let Disposition;
  ((Disposition2) => {
    Disposition2["LeaveCard"] = "leave-card";
    Disposition2["ResetCard"] = "reset-card";
    Disposition2["UnpowerCard"] = "unpower-card";
    Disposition2["EjectCard"] = "eject-card";
  })(Disposition = SmartCardEmulation2.Disposition || (SmartCardEmulation2.Disposition = {}));
  let ConnectionState;
  ((ConnectionState2) => {
    ConnectionState2["Absent"] = "absent";
    ConnectionState2["Present"] = "present";
    ConnectionState2["Swallowed"] = "swallowed";
    ConnectionState2["Powered"] = "powered";
    ConnectionState2["Negotiable"] = "negotiable";
    ConnectionState2["Specific"] = "specific";
  })(ConnectionState = SmartCardEmulation2.ConnectionState || (SmartCardEmulation2.ConnectionState = {}));
  let Protocol;
  ((Protocol2) => {
    Protocol2["T0"] = "t0";
    Protocol2["T1"] = "t1";
    Protocol2["Raw"] = "raw";
  })(Protocol = SmartCardEmulation2.Protocol || (SmartCardEmulation2.Protocol = {}));
})(SmartCardEmulation || (SmartCardEmulation = {}));
var Storage;
((Storage2) => {
  let StorageType;
  ((StorageType2) => {
    StorageType2["Cookies"] = "cookies";
    StorageType2["File_systems"] = "file_systems";
    StorageType2["Indexeddb"] = "indexeddb";
    StorageType2["Local_storage"] = "local_storage";
    StorageType2["Shader_cache"] = "shader_cache";
    StorageType2["Websql"] = "websql";
    StorageType2["Service_workers"] = "service_workers";
    StorageType2["Cache_storage"] = "cache_storage";
    StorageType2["Storage_buckets"] = "storage_buckets";
    StorageType2["All"] = "all";
    StorageType2["Other"] = "other";
  })(StorageType = Storage2.StorageType || (Storage2.StorageType = {}));
  let StorageBucketsDurability;
  ((StorageBucketsDurability2) => {
    StorageBucketsDurability2["Relaxed"] = "relaxed";
    StorageBucketsDurability2["Strict"] = "strict";
  })(StorageBucketsDurability = Storage2.StorageBucketsDurability || (Storage2.StorageBucketsDurability = {}));
})(Storage || (Storage = {}));
var SystemInfo;
((SystemInfo2) => {
  let SubsamplingFormat;
  ((SubsamplingFormat2) => {
    SubsamplingFormat2["Yuv420"] = "yuv420";
    SubsamplingFormat2["Yuv422"] = "yuv422";
    SubsamplingFormat2["Yuv444"] = "yuv444";
  })(SubsamplingFormat = SystemInfo2.SubsamplingFormat || (SystemInfo2.SubsamplingFormat = {}));
  let ImageType;
  ((ImageType2) => {
    ImageType2["Jpeg"] = "jpeg";
    ImageType2["Webp"] = "webp";
    ImageType2["Unknown"] = "unknown";
  })(ImageType = SystemInfo2.ImageType || (SystemInfo2.ImageType = {}));
})(SystemInfo || (SystemInfo = {}));
var Target;
((Target2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Target2.WindowState || (Target2.WindowState = {}));
})(Target || (Target = {}));
var Tracing;
((Tracing2) => {
  let TraceConfigRecordMode;
  ((TraceConfigRecordMode2) => {
    TraceConfigRecordMode2["RecordUntilFull"] = "recordUntilFull";
    TraceConfigRecordMode2["RecordContinuously"] = "recordContinuously";
    TraceConfigRecordMode2["RecordAsMuchAsPossible"] = "recordAsMuchAsPossible";
    TraceConfigRecordMode2["EchoToConsole"] = "echoToConsole";
  })(TraceConfigRecordMode = Tracing2.TraceConfigRecordMode || (Tracing2.TraceConfigRecordMode = {}));
  let StreamFormat;
  ((StreamFormat2) => {
    StreamFormat2["Json"] = "json";
    StreamFormat2["Proto"] = "proto";
  })(StreamFormat = Tracing2.StreamFormat || (Tracing2.StreamFormat = {}));
  let StreamCompression;
  ((StreamCompression2) => {
    StreamCompression2["None"] = "none";
    StreamCompression2["Gzip"] = "gzip";
  })(StreamCompression = Tracing2.StreamCompression || (Tracing2.StreamCompression = {}));
  let MemoryDumpLevelOfDetail;
  ((MemoryDumpLevelOfDetail2) => {
    MemoryDumpLevelOfDetail2["Background"] = "background";
    MemoryDumpLevelOfDetail2["Light"] = "light";
    MemoryDumpLevelOfDetail2["Detailed"] = "detailed";
  })(MemoryDumpLevelOfDetail = Tracing2.MemoryDumpLevelOfDetail || (Tracing2.MemoryDumpLevelOfDetail = {}));
  let TracingBackend;
  ((TracingBackend2) => {
    TracingBackend2["Auto"] = "auto";
    TracingBackend2["Chrome"] = "chrome";
    TracingBackend2["System"] = "system";
  })(TracingBackend = Tracing2.TracingBackend || (Tracing2.TracingBackend = {}));
  let StartRequestTransferMode;
  ((StartRequestTransferMode2) => {
    StartRequestTransferMode2["ReportEvents"] = "ReportEvents";
    StartRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(StartRequestTransferMode = Tracing2.StartRequestTransferMode || (Tracing2.StartRequestTransferMode = {}));
})(Tracing || (Tracing = {}));
var WebAudio;
((WebAudio2) => {
  let ContextType;
  ((ContextType2) => {
    ContextType2["Realtime"] = "realtime";
    ContextType2["Offline"] = "offline";
  })(ContextType = WebAudio2.ContextType || (WebAudio2.ContextType = {}));
  let ContextState;
  ((ContextState2) => {
    ContextState2["Suspended"] = "suspended";
    ContextState2["Running"] = "running";
    ContextState2["Closed"] = "closed";
    ContextState2["Interrupted"] = "interrupted";
  })(ContextState = WebAudio2.ContextState || (WebAudio2.ContextState = {}));
  let ChannelCountMode;
  ((ChannelCountMode2) => {
    ChannelCountMode2["ClampedMax"] = "clamped-max";
    ChannelCountMode2["Explicit"] = "explicit";
    ChannelCountMode2["Max"] = "max";
  })(ChannelCountMode = WebAudio2.ChannelCountMode || (WebAudio2.ChannelCountMode = {}));
  let ChannelInterpretation;
  ((ChannelInterpretation2) => {
    ChannelInterpretation2["Discrete"] = "discrete";
    ChannelInterpretation2["Speakers"] = "speakers";
  })(ChannelInterpretation = WebAudio2.ChannelInterpretation || (WebAudio2.ChannelInterpretation = {}));
  let AutomationRate;
  ((AutomationRate2) => {
    AutomationRate2["ARate"] = "a-rate";
    AutomationRate2["KRate"] = "k-rate";
  })(AutomationRate = WebAudio2.AutomationRate || (WebAudio2.AutomationRate = {}));
})(WebAudio || (WebAudio = {}));
var WebAuthn;
((WebAuthn2) => {
  let AuthenticatorProtocol;
  ((AuthenticatorProtocol2) => {
    AuthenticatorProtocol2["U2f"] = "u2f";
    AuthenticatorProtocol2["Ctap2"] = "ctap2";
  })(AuthenticatorProtocol = WebAuthn2.AuthenticatorProtocol || (WebAuthn2.AuthenticatorProtocol = {}));
  let Ctap2Version;
  ((Ctap2Version2) => {
    Ctap2Version2["Ctap2_0"] = "ctap2_0";
    Ctap2Version2["Ctap2_1"] = "ctap2_1";
    Ctap2Version2["Ctap2_2"] = "ctap2_2";
  })(Ctap2Version = WebAuthn2.Ctap2Version || (WebAuthn2.Ctap2Version = {}));
  let AuthenticatorTransport;
  ((AuthenticatorTransport2) => {
    AuthenticatorTransport2["Usb"] = "usb";
    AuthenticatorTransport2["Nfc"] = "nfc";
    AuthenticatorTransport2["Ble"] = "ble";
    AuthenticatorTransport2["Cable"] = "cable";
    AuthenticatorTransport2["Hybrid"] = "hybrid";
    AuthenticatorTransport2["SmartCard"] = "smart-card";
    AuthenticatorTransport2["Internal"] = "internal";
  })(AuthenticatorTransport = WebAuthn2.AuthenticatorTransport || (WebAuthn2.AuthenticatorTransport = {}));
})(WebAuthn || (WebAuthn = {}));
var WebMCP;
((WebMCP2) => {
  let InvocationStatus;
  ((InvocationStatus2) => {
    InvocationStatus2["Completed"] = "Completed";
    InvocationStatus2["Canceled"] = "Canceled";
    InvocationStatus2["Error"] = "Error";
  })(InvocationStatus = WebMCP2.InvocationStatus || (WebMCP2.InvocationStatus = {}));
})(WebMCP || (WebMCP = {}));
var Debugger;
((Debugger2) => {
  let ScopeType;
  ((ScopeType2) => {
    ScopeType2["Global"] = "global";
    ScopeType2["Local"] = "local";
    ScopeType2["With"] = "with";
    ScopeType2["Closure"] = "closure";
    ScopeType2["Catch"] = "catch";
    ScopeType2["Block"] = "block";
    ScopeType2["Script"] = "script";
    ScopeType2["Eval"] = "eval";
    ScopeType2["Module"] = "module";
    ScopeType2["WasmExpressionStack"] = "wasm-expression-stack";
  })(ScopeType = Debugger2.ScopeType || (Debugger2.ScopeType = {}));
  let BreakLocationType;
  ((BreakLocationType2) => {
    BreakLocationType2["DebuggerStatement"] = "debuggerStatement";
    BreakLocationType2["Call"] = "call";
    BreakLocationType2["Return"] = "return";
  })(BreakLocationType = Debugger2.BreakLocationType || (Debugger2.BreakLocationType = {}));
  let ScriptLanguage;
  ((ScriptLanguage2) => {
    ScriptLanguage2["JavaScript"] = "JavaScript";
    ScriptLanguage2["WebAssembly"] = "WebAssembly";
  })(ScriptLanguage = Debugger2.ScriptLanguage || (Debugger2.ScriptLanguage = {}));
  let DebugSymbolsType;
  ((DebugSymbolsType2) => {
    DebugSymbolsType2["SourceMap"] = "SourceMap";
    DebugSymbolsType2["EmbeddedDWARF"] = "EmbeddedDWARF";
    DebugSymbolsType2["ExternalDWARF"] = "ExternalDWARF";
  })(DebugSymbolsType = Debugger2.DebugSymbolsType || (Debugger2.DebugSymbolsType = {}));
  let ContinueToLocationRequestTargetCallFrames;
  ((ContinueToLocationRequestTargetCallFrames2) => {
    ContinueToLocationRequestTargetCallFrames2["Any"] = "any";
    ContinueToLocationRequestTargetCallFrames2["Current"] = "current";
  })(ContinueToLocationRequestTargetCallFrames = Debugger2.ContinueToLocationRequestTargetCallFrames || (Debugger2.ContinueToLocationRequestTargetCallFrames = {}));
  let RestartFrameRequestMode;
  ((RestartFrameRequestMode2) => {
    RestartFrameRequestMode2["StepInto"] = "StepInto";
  })(RestartFrameRequestMode = Debugger2.RestartFrameRequestMode || (Debugger2.RestartFrameRequestMode = {}));
  let SetInstrumentationBreakpointRequestInstrumentation;
  ((SetInstrumentationBreakpointRequestInstrumentation2) => {
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptExecution"] = "beforeScriptExecution";
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptWithSourceMapExecution"] = "beforeScriptWithSourceMapExecution";
  })(SetInstrumentationBreakpointRequestInstrumentation = Debugger2.SetInstrumentationBreakpointRequestInstrumentation || (Debugger2.SetInstrumentationBreakpointRequestInstrumentation = {}));
  let SetPauseOnExceptionsRequestState;
  ((SetPauseOnExceptionsRequestState2) => {
    SetPauseOnExceptionsRequestState2["None"] = "none";
    SetPauseOnExceptionsRequestState2["Caught"] = "caught";
    SetPauseOnExceptionsRequestState2["Uncaught"] = "uncaught";
    SetPauseOnExceptionsRequestState2["All"] = "all";
  })(SetPauseOnExceptionsRequestState = Debugger2.SetPauseOnExceptionsRequestState || (Debugger2.SetPauseOnExceptionsRequestState = {}));
  let SetScriptSourceResponseStatus;
  ((SetScriptSourceResponseStatus2) => {
    SetScriptSourceResponseStatus2["Ok"] = "Ok";
    SetScriptSourceResponseStatus2["CompileError"] = "CompileError";
    SetScriptSourceResponseStatus2["BlockedByActiveGenerator"] = "BlockedByActiveGenerator";
    SetScriptSourceResponseStatus2["BlockedByActiveFunction"] = "BlockedByActiveFunction";
    SetScriptSourceResponseStatus2["BlockedByTopLevelEsModuleChange"] = "BlockedByTopLevelEsModuleChange";
  })(SetScriptSourceResponseStatus = Debugger2.SetScriptSourceResponseStatus || (Debugger2.SetScriptSourceResponseStatus = {}));
  let PausedEventReason;
  ((PausedEventReason2) => {
    PausedEventReason2["Ambiguous"] = "ambiguous";
    PausedEventReason2["Assert"] = "assert";
    PausedEventReason2["CSPViolation"] = "CSPViolation";
    PausedEventReason2["DebugCommand"] = "debugCommand";
    PausedEventReason2["DOM"] = "DOM";
    PausedEventReason2["EventListener"] = "EventListener";
    PausedEventReason2["Exception"] = "exception";
    PausedEventReason2["Instrumentation"] = "instrumentation";
    PausedEventReason2["OOM"] = "OOM";
    PausedEventReason2["Other"] = "other";
    PausedEventReason2["PromiseRejection"] = "promiseRejection";
    PausedEventReason2["XHR"] = "XHR";
    PausedEventReason2["Step"] = "step";
  })(PausedEventReason = Debugger2.PausedEventReason || (Debugger2.PausedEventReason = {}));
})(Debugger || (Debugger = {}));
var Runtime;
((Runtime2) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime2.SerializationOptionsSerialization || (Runtime2.SerializationOptionsSerialization = {}));
  let DeepSerializedValueType;
  ((DeepSerializedValueType2) => {
    DeepSerializedValueType2["Undefined"] = "undefined";
    DeepSerializedValueType2["Null"] = "null";
    DeepSerializedValueType2["String"] = "string";
    DeepSerializedValueType2["Number"] = "number";
    DeepSerializedValueType2["Boolean"] = "boolean";
    DeepSerializedValueType2["Bigint"] = "bigint";
    DeepSerializedValueType2["Regexp"] = "regexp";
    DeepSerializedValueType2["Date"] = "date";
    DeepSerializedValueType2["Symbol"] = "symbol";
    DeepSerializedValueType2["Array"] = "array";
    DeepSerializedValueType2["Object"] = "object";
    DeepSerializedValueType2["Function"] = "function";
    DeepSerializedValueType2["Map"] = "map";
    DeepSerializedValueType2["Set"] = "set";
    DeepSerializedValueType2["Weakmap"] = "weakmap";
    DeepSerializedValueType2["Weakset"] = "weakset";
    DeepSerializedValueType2["Error"] = "error";
    DeepSerializedValueType2["Proxy"] = "proxy";
    DeepSerializedValueType2["Promise"] = "promise";
    DeepSerializedValueType2["Typedarray"] = "typedarray";
    DeepSerializedValueType2["Arraybuffer"] = "arraybuffer";
    DeepSerializedValueType2["Node"] = "node";
    DeepSerializedValueType2["Window"] = "window";
    DeepSerializedValueType2["Generator"] = "generator";
  })(DeepSerializedValueType = Runtime2.DeepSerializedValueType || (Runtime2.DeepSerializedValueType = {}));
  let RemoteObjectType;
  ((RemoteObjectType2) => {
    RemoteObjectType2["Object"] = "object";
    RemoteObjectType2["Function"] = "function";
    RemoteObjectType2["Undefined"] = "undefined";
    RemoteObjectType2["String"] = "string";
    RemoteObjectType2["Number"] = "number";
    RemoteObjectType2["Boolean"] = "boolean";
    RemoteObjectType2["Symbol"] = "symbol";
    RemoteObjectType2["Bigint"] = "bigint";
  })(RemoteObjectType = Runtime2.RemoteObjectType || (Runtime2.RemoteObjectType = {}));
  let RemoteObjectSubtype;
  ((RemoteObjectSubtype2) => {
    RemoteObjectSubtype2["Array"] = "array";
    RemoteObjectSubtype2["Null"] = "null";
    RemoteObjectSubtype2["Node"] = "node";
    RemoteObjectSubtype2["Regexp"] = "regexp";
    RemoteObjectSubtype2["Date"] = "date";
    RemoteObjectSubtype2["Map"] = "map";
    RemoteObjectSubtype2["Set"] = "set";
    RemoteObjectSubtype2["Weakmap"] = "weakmap";
    RemoteObjectSubtype2["Weakset"] = "weakset";
    RemoteObjectSubtype2["Iterator"] = "iterator";
    RemoteObjectSubtype2["Generator"] = "generator";
    RemoteObjectSubtype2["Error"] = "error";
    RemoteObjectSubtype2["Proxy"] = "proxy";
    RemoteObjectSubtype2["Promise"] = "promise";
    RemoteObjectSubtype2["Typedarray"] = "typedarray";
    RemoteObjectSubtype2["Arraybuffer"] = "arraybuffer";
    RemoteObjectSubtype2["Dataview"] = "dataview";
    RemoteObjectSubtype2["Webassemblymemory"] = "webassemblymemory";
    RemoteObjectSubtype2["Wasmvalue"] = "wasmvalue";
    RemoteObjectSubtype2["Trustedtype"] = "trustedtype";
  })(RemoteObjectSubtype = Runtime2.RemoteObjectSubtype || (Runtime2.RemoteObjectSubtype = {}));
  let ObjectPreviewType;
  ((ObjectPreviewType2) => {
    ObjectPreviewType2["Object"] = "object";
    ObjectPreviewType2["Function"] = "function";
    ObjectPreviewType2["Undefined"] = "undefined";
    ObjectPreviewType2["String"] = "string";
    ObjectPreviewType2["Number"] = "number";
    ObjectPreviewType2["Boolean"] = "boolean";
    ObjectPreviewType2["Symbol"] = "symbol";
    ObjectPreviewType2["Bigint"] = "bigint";
  })(ObjectPreviewType = Runtime2.ObjectPreviewType || (Runtime2.ObjectPreviewType = {}));
  let ObjectPreviewSubtype;
  ((ObjectPreviewSubtype2) => {
    ObjectPreviewSubtype2["Array"] = "array";
    ObjectPreviewSubtype2["Null"] = "null";
    ObjectPreviewSubtype2["Node"] = "node";
    ObjectPreviewSubtype2["Regexp"] = "regexp";
    ObjectPreviewSubtype2["Date"] = "date";
    ObjectPreviewSubtype2["Map"] = "map";
    ObjectPreviewSubtype2["Set"] = "set";
    ObjectPreviewSubtype2["Weakmap"] = "weakmap";
    ObjectPreviewSubtype2["Weakset"] = "weakset";
    ObjectPreviewSubtype2["Iterator"] = "iterator";
    ObjectPreviewSubtype2["Generator"] = "generator";
    ObjectPreviewSubtype2["Error"] = "error";
    ObjectPreviewSubtype2["Proxy"] = "proxy";
    ObjectPreviewSubtype2["Promise"] = "promise";
    ObjectPreviewSubtype2["Typedarray"] = "typedarray";
    ObjectPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    ObjectPreviewSubtype2["Dataview"] = "dataview";
    ObjectPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    ObjectPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    ObjectPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(ObjectPreviewSubtype = Runtime2.ObjectPreviewSubtype || (Runtime2.ObjectPreviewSubtype = {}));
  let PropertyPreviewType;
  ((PropertyPreviewType2) => {
    PropertyPreviewType2["Object"] = "object";
    PropertyPreviewType2["Function"] = "function";
    PropertyPreviewType2["Undefined"] = "undefined";
    PropertyPreviewType2["String"] = "string";
    PropertyPreviewType2["Number"] = "number";
    PropertyPreviewType2["Boolean"] = "boolean";
    PropertyPreviewType2["Symbol"] = "symbol";
    PropertyPreviewType2["Accessor"] = "accessor";
    PropertyPreviewType2["Bigint"] = "bigint";
  })(PropertyPreviewType = Runtime2.PropertyPreviewType || (Runtime2.PropertyPreviewType = {}));
  let PropertyPreviewSubtype;
  ((PropertyPreviewSubtype2) => {
    PropertyPreviewSubtype2["Array"] = "array";
    PropertyPreviewSubtype2["Null"] = "null";
    PropertyPreviewSubtype2["Node"] = "node";
    PropertyPreviewSubtype2["Regexp"] = "regexp";
    PropertyPreviewSubtype2["Date"] = "date";
    PropertyPreviewSubtype2["Map"] = "map";
    PropertyPreviewSubtype2["Set"] = "set";
    PropertyPreviewSubtype2["Weakmap"] = "weakmap";
    PropertyPreviewSubtype2["Weakset"] = "weakset";
    PropertyPreviewSubtype2["Iterator"] = "iterator";
    PropertyPreviewSubtype2["Generator"] = "generator";
    PropertyPreviewSubtype2["Error"] = "error";
    PropertyPreviewSubtype2["Proxy"] = "proxy";
    PropertyPreviewSubtype2["Promise"] = "promise";
    PropertyPreviewSubtype2["Typedarray"] = "typedarray";
    PropertyPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    PropertyPreviewSubtype2["Dataview"] = "dataview";
    PropertyPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    PropertyPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    PropertyPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(PropertyPreviewSubtype = Runtime2.PropertyPreviewSubtype || (Runtime2.PropertyPreviewSubtype = {}));
  let ConsoleAPICalledEventType;
  ((ConsoleAPICalledEventType2) => {
    ConsoleAPICalledEventType2["Log"] = "log";
    ConsoleAPICalledEventType2["Debug"] = "debug";
    ConsoleAPICalledEventType2["Info"] = "info";
    ConsoleAPICalledEventType2["Error"] = "error";
    ConsoleAPICalledEventType2["Warning"] = "warning";
    ConsoleAPICalledEventType2["Dir"] = "dir";
    ConsoleAPICalledEventType2["DirXML"] = "dirxml";
    ConsoleAPICalledEventType2["Table"] = "table";
    ConsoleAPICalledEventType2["Trace"] = "trace";
    ConsoleAPICalledEventType2["Clear"] = "clear";
    ConsoleAPICalledEventType2["StartGroup"] = "startGroup";
    ConsoleAPICalledEventType2["StartGroupCollapsed"] = "startGroupCollapsed";
    ConsoleAPICalledEventType2["EndGroup"] = "endGroup";
    ConsoleAPICalledEventType2["Assert"] = "assert";
    ConsoleAPICalledEventType2["Profile"] = "profile";
    ConsoleAPICalledEventType2["ProfileEnd"] = "profileEnd";
    ConsoleAPICalledEventType2["Count"] = "count";
    ConsoleAPICalledEventType2["TimeEnd"] = "timeEnd";
  })(ConsoleAPICalledEventType = Runtime2.ConsoleAPICalledEventType || (Runtime2.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.ts
import { Directives, html, nothing, render } from "../../../lit/lit.js";
var { ifDefined, repeat } = Directives;
var UIStrings = {
  /**
   * @description Placeholder text shown in an object preview when there are multiple consecutive empty slots in an array.
   * @example {3} PH1
   */
  emptyD: "empty \xD7 {PH1}",
  /**
   * @description Placeholder text shown in an object preview when there is a single empty slot in an array.
   */
  empty: "empty",
  /**
   * @description Tooltip text for an accessor property in an object preview when its value needs to be evaluated via a getter.
   */
  thePropertyIsComputedWithAGetter: "The property is computed with a getter"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var RemoteObjectPreviewFormatter = class _RemoteObjectPreviewFormatter {
  static objectPropertyComparator(a, b) {
    return sortValue(a) - sortValue(b);
    function sortValue(property) {
      if (property.name === "[[PromiseState]]" /* PROMISE_STATE */) {
        return 1;
      }
      if (property.name === "[[PromiseResult]]" /* PROMISE_RESULT */) {
        return 2;
      }
      if (property.name === "[[GeneratorState]]" /* GENERATOR_STATE */ || property.name === "[[PrimitiveValue]]" /* PRIMITIVE_VALUE */ || property.name === "[[WeakRefTarget]]" /* WEAK_REF_TARGET */) {
        return 3;
      }
      if (property.type !== Runtime.PropertyPreviewType.Function && !property.name.startsWith("#")) {
        return 4;
      }
      return 5;
    }
  }
  renderObjectPreview(preview, includeNullOrUndefined = true) {
    const description = preview.description;
    const subTypesWithoutValuePreview = /* @__PURE__ */ new Set([
      Runtime.ObjectPreviewSubtype.Arraybuffer,
      Runtime.ObjectPreviewSubtype.Dataview,
      Runtime.ObjectPreviewSubtype.Error,
      Runtime.ObjectPreviewSubtype.Null,
      Runtime.ObjectPreviewSubtype.Regexp,
      Runtime.ObjectPreviewSubtype.Webassemblymemory,
      "internal#entry",
      "trustedtype"
    ]);
    if (preview.type !== Runtime.ObjectPreviewType.Object || preview.subtype && subTypesWithoutValuePreview.has(preview.subtype)) {
      return this.renderPropertyPreview(preview.type, preview.subtype, void 0, description);
    }
    const isArrayOrTypedArray = preview.subtype === Runtime.ObjectPreviewSubtype.Array || preview.subtype === Runtime.ObjectPreviewSubtype.Typedarray;
    let objectDescription = "";
    if (description) {
      if (isArrayOrTypedArray) {
        const arrayLength = SDK.RemoteObject.RemoteObject.arrayLength(preview);
        const arrayLengthText = arrayLength > 1 ? "(" + arrayLength + ")" : "";
        const arrayName = SDK.RemoteObject.RemoteObject.arrayNameFromDescription(description);
        objectDescription = arrayName === "Array" ? arrayLengthText : arrayName + arrayLengthText;
      } else {
        const hideDescription = description === "Object";
        objectDescription = hideDescription ? "" : description;
      }
    }
    const items = Array.from(
      preview.entries ? this.renderEntries(preview) : isArrayOrTypedArray ? this.renderArrayProperties(preview) : this.renderObjectProperties(preview, includeNullOrUndefined)
    );
    const renderName = (name) => html`<span class=name>${/^\s|\s$|^$|\n/.test(name) ? '"' + name.replace(/\n/g, "\u21B5") + '"' : name}</span>`;
    const renderPlaceholder = (placeholder) => html`<span class=object-value-undefined>${placeholder}</span>`;
    const renderValue = (value) => this.renderPropertyPreview(value.type, value.subtype, value.name, value.value);
    const renderEntry = (entry) => html`${entry.key && html`${this.renderPropertyPreview(entry.key.type, entry.key.subtype, void 0, entry.key.description)} => `}
          ${this.renderPropertyPreview(entry.value.type, entry.value.subtype, void 0, entry.value.description)}`;
    const renderItem = ({ name, entry, value, placeholder }, index) => html`${index > 0 ? ", " : ""}${placeholder !== void 0 ? renderPlaceholder(placeholder) : nothing}${name !== void 0 ? renderName(name) : nothing}${name !== void 0 && value ? ": " : ""}${value ? renderValue(value) : nothing}${entry ? renderEntry(entry) : nothing}`;
    return html`${objectDescription.length > 0 ? html`<span class=object-description>${objectDescription + "\xA0"}</span>` : nothing}<span class=object-properties-preview>${isArrayOrTypedArray ? "[" : "{"}${repeat(items, renderItem)}${preview.overflow ? html`<span>${items.length > 0 ? ",\xA0\u2026" : "\u2026"}</span>` : ""}
    ${isArrayOrTypedArray ? "]" : "}"}</span>`;
  }
  *renderObjectProperties(preview, includeNullOrUndefined) {
    const properties = preview.properties.filter((p) => p.type !== "accessor").sort(_RemoteObjectPreviewFormatter.objectPropertyComparator);
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      const name = property.name;
      if (!includeNullOrUndefined && (property.type === "undefined" || property.type === "object" && property.subtype === "null")) {
        continue;
      }
      if (preview.subtype === Runtime.ObjectPreviewSubtype.Promise && name === "[[PromiseState]]" /* PROMISE_STATE */) {
        const promiseResult = properties.at(i + 1)?.name === "[[PromiseResult]]" /* PROMISE_RESULT */ ? properties.at(i + 1) : void 0;
        if (promiseResult) {
          i++;
        }
        yield { name: "<" + property.value + ">", value: property.value !== "pending" ? promiseResult : void 0 };
      } else if (preview.subtype === "generator" && name === "[[GeneratorState]]" /* GENERATOR_STATE */) {
        yield { name: "<" + property.value + ">" };
      } else if (name === "[[PrimitiveValue]]" /* PRIMITIVE_VALUE */) {
        yield { value: property };
      } else if (name === "[[WeakRefTarget]]" /* WEAK_REF_TARGET */) {
        if (property.type === Runtime.PropertyPreviewType.Undefined) {
          yield { name: "<cleared>" };
        } else {
          yield { value: property };
        }
      } else {
        yield { name, value: property };
      }
    }
  }
  *renderArrayProperties(preview) {
    const arrayLength = SDK.RemoteObject.RemoteObject.arrayLength(preview);
    const indexProperties = preview.properties.filter((p) => toArrayIndex(p.name) !== -1).sort(arrayEntryComparator);
    const otherProperties = preview.properties.filter((p) => toArrayIndex(p.name) === -1).sort(_RemoteObjectPreviewFormatter.objectPropertyComparator);
    function arrayEntryComparator(a, b) {
      return toArrayIndex(a.name) - toArrayIndex(b.name);
    }
    function toArrayIndex(name) {
      const index = Number(name) >>> 0;
      if (String(index) === name && index < arrayLength) {
        return index;
      }
      return -1;
    }
    const canShowGaps = !preview.overflow;
    const indexedProperties = [];
    for (const property of indexProperties) {
      const index = toArrayIndex(property.name);
      const gap = index - (indexedProperties.at(-1)?.index ?? -1) - 1;
      const hasGaps = index !== indexedProperties.length;
      indexedProperties.push({ property, index, gap, hasGaps });
    }
    const trailingGap = arrayLength - (indexedProperties.at(-1)?.index ?? -1) - 1;
    const renderGap = (count) => ({ placeholder: count !== 1 ? i18nString(UIStrings.emptyD, { PH1: count }) : i18nString(UIStrings.empty) });
    for (const { property, gap, hasGaps } of indexedProperties) {
      if (canShowGaps && gap > 0) {
        yield renderGap(gap);
      }
      yield { name: !canShowGaps && hasGaps ? property.name : void 0, value: property };
    }
    if (canShowGaps && trailingGap > 0) {
      yield renderGap(trailingGap);
    }
    for (const property of otherProperties) {
      yield { name: property.name, value: property };
    }
  }
  *renderEntries(preview) {
    for (const entry of preview.entries ?? []) {
      yield { entry };
    }
  }
  renderPropertyPreview(type, subtype, className, description) {
    let title;
    switch (type) {
      case "accessor":
        title = i18nString(UIStrings.thePropertyIsComputedWithAGetter);
        break;
      case "string":
        title = description;
        break;
      case "object":
        if (!subtype) {
          title = description;
        }
        break;
    }
    const abbreviateFullQualifiedClassName = (description2) => {
      const abbreviatedDescription = description2.split(".");
      for (let i = 0; i < abbreviatedDescription.length - 1; ++i) {
        abbreviatedDescription[i] = Platform.StringUtilities.trimMiddle(abbreviatedDescription[i], 3);
      }
      return abbreviatedDescription.length === 1 && abbreviatedDescription[0] === "Object" ? "{\u2026}" : abbreviatedDescription.join(".");
    };
    const preview = () => type === "accessor" ? "(...)" : type === "function" ? "\u0192" : type === "object" && subtype === "trustedtype" && className ? renderTrustedType(description ?? "", className) : type === "object" && subtype === "node" && description ? renderNodeTitle(description) : type === "string" ? Platform.StringUtilities.formatAsJSLiteral(description ?? "") : type === "object" && !subtype ? abbreviateFullQualifiedClassName(description ?? "") : description;
    return html`<span class='object-value-${subtype || type}' title=${ifDefined(title)}>${preview()}</span>`;
  }
  renderEvaluationResultPreview(result, allowErrors) {
    if ("error" in result) {
      return nothing;
    }
    if (result.exceptionDetails?.exception?.description) {
      const exception = result.exceptionDetails.exception.description;
      if (exception.startsWith("TypeError: ") || allowErrors) {
        return html`<span>${result.exceptionDetails.text} ${exception}</span>`;
      }
      return nothing;
    }
    const { preview, type, subtype, className, description } = result.object;
    if (preview && type === "object" && subtype !== "node" && subtype !== "trustedtype") {
      return this.renderObjectPreview(preview);
    }
    return this.renderPropertyPreview(
      type,
      subtype,
      className,
      Platform.StringUtilities.trimEndWithMaxLength(description || "", 400)
    );
  }
  /** @deprecated (crbug.com/457388389) Use lit version instead */
  renderEvaluationResultPreviewFragment(result, allowErrors) {
    const fragment = document.createDocumentFragment();
    render(this.renderEvaluationResultPreview(result, allowErrors), fragment);
    return fragment;
  }
};
function renderNodeTitle(nodeTitle) {
  const match = nodeTitle.match(/([^#.]+)(#[^.]+)?(\..*)?/);
  if (!match) {
    return null;
  }
  return html`<span class=webkit-html-tag-name>${match[1]}</span>${match[2] && html`<span class=webkit-html-attribute-value>${match[2]}</span>`}${match[3] && html`<span class=webkit-html-attribute-name>${match[3]}</span>`}`;
}
function renderTrustedType(description, className) {
  return html`${className} <span class=object-value-string title=${description}>"${description.replace(/\n/g, "\u21B5")}"</span>`;
}

// ../../front_end/ui/legacy/components/object_ui/JavaScriptREPL.ts
var JavaScriptREPL = class _JavaScriptREPL {
  static wrapObjectLiteral(code) {
    const result = /^\s*\{\s*(.*)\s*\}[\s;]*$/.exec(code);
    if (result === null) {
      return code;
    }
    const [, body] = result;
    let level = 0;
    for (const c of body) {
      if (c === "{") {
        level++;
      } else if (c === "}" && --level < 0) {
        return code;
      }
    }
    const parse2 = (expression) => void Acorn.parse(
      expression,
      { ecmaVersion: 2022, allowAwaitOutsideFunction: true, ranges: false, allowReturnOutsideFunction: true }
    );
    try {
      parse2("return {" + body + "};");
      const wrappedCode = "({" + body + "})";
      parse2(wrappedCode);
      return wrappedCode;
    } catch {
      return code;
    }
  }
  static async evaluate(text, executionContext, throwOnSideEffect, replMode, timeout, objectGroup, awaitPromise = false, silent = false) {
    const isTextLong = text.length > maxLengthForEvaluation;
    if (!text || throwOnSideEffect && isTextLong) {
      return null;
    }
    let expression = text;
    const callFrame = executionContext.debuggerModel.selectedCallFrame();
    if (callFrame?.script.isJavaScript()) {
      const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(
        callFrame,
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
      );
      try {
        expression = await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, nameMap);
      } catch {
      }
    }
    expression = _JavaScriptREPL.wrapObjectLiteral(expression);
    const options = {
      expression,
      generatePreview: true,
      includeCommandLineAPI: true,
      throwOnSideEffect,
      timeout,
      objectGroup,
      disableBreaks: true,
      replMode,
      silent
    };
    return await executionContext.evaluateWithSelectedFrameFallback(options, false, awaitPromise);
  }
  static async evaluateAndBuildPreview(text, throwOnSideEffect, replMode, timeout, allowErrors, objectGroup, awaitPromise = false, silent = false) {
    const executionContext = UI.Context.Context.instance().flavor(SDK2.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return { preview: document.createDocumentFragment(), result: null };
    }
    const result = await _JavaScriptREPL.evaluate(
      text,
      executionContext,
      throwOnSideEffect,
      replMode,
      timeout,
      objectGroup,
      awaitPromise,
      silent
    );
    if (!result) {
      return { preview: document.createDocumentFragment(), result: null };
    }
    const formatter = new RemoteObjectPreviewFormatter();
    const preview = formatter.renderEvaluationResultPreviewFragment(result, allowErrors);
    return { preview, result };
  }
};
var maxLengthForEvaluation = 2e3;

// gen/front_end/ui/legacy/components/object_ui/objectPropertiesSection.css.js
var objectPropertiesSection_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.object-properties-section-dimmed {
  opacity: 60%;
}

:host {
  display: block;
}

.object-properties-section {
  padding: 0;
  margin: 0;
  color: var(--sys-color-on-surface);
  display: flex;
  flex-direction: column;
  overflow: auto hidden;
}

.object-properties-section li,
li.object-properties-section  {
  user-select: text;

  &::before {
    flex-shrink: 0;
    margin-right: var(--sys-size-2);
    align-self: flex-start;
  }
}

.object-properties-section li.editing-sub-part {
  padding: 3px var(--sys-size-6) var(--sys-size-5) var(--sys-size-4);
  margin: calc(-1 * var(--sys-size-1)) calc(-1 * var(--sys-size-4)) calc(-1 * var(--sys-size-5));
  text-overflow: clip;
}

.object-properties-section li.editing {
  margin-left: 10px;
  text-overflow: clip;
}

.tree-outline ol.title-less-mode {
  padding-left: 0;
}

.object-properties-section .own-property {
  font-weight: bold;
}

.object-properties-section .synthetic-property {
  color: var(--sys-color-token-subtle);
}

.object-properties-section .private-property-hash {
  color: var(--sys-color-on-surface);
}

.object-properties-section-root-element {
  display: flex;
  flex-direction: row;
}

.object-properties-section .editable-div {
  overflow: hidden;
}

.name-and-value {
  line-height: var(--sys-size-8);
  display: flex;
  white-space: nowrap;
}

.name-and-value .separator {
  white-space: pre;
  flex-shrink: 0;
}

.editing-sub-part .name-and-value {
  overflow: visible;
  display: inline-flex;
}

.property-prompt {
  margin-left: var(--sys-size-3);
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible {
  background: none;
  outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  outline-offset: calc(-1 * var(--sys-size-2));
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible ::slotted(*),
.tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
  background: var(--sys-color-state-focus-highlight);
  border-radius: var(--sys-size-2);
}

@media (forced-colors: active) {
  .object-properties-section-dimmed {
    opacity: 100%;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible {
    background: Highlight;
  }

  .tree-outline li:hover .tree-element-title,
  .tree-outline li.selected .tree-element-title {
    color: ButtonText;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value {
    background: transparent;
    box-shadow: none;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible span,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
    color: HighlightText;
  }

  .tree-outline-disclosure:hover li.parent::before {
    background-color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./objectPropertiesSection.css")} */`;

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
  unicode-bidi: isolate;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// ../../front_end/ui/legacy/components/object_ui/ObjectPropertiesSection.ts
var { widget, widgetRef } = UI2.Widget;
var { ref, repeat: repeat2, ifDefined: ifDefined2, classMap } = Directives2;
var UIStrings2 = {
  /**
   * @description Text shown in an object properties tree when evaluating a property throws an exception.
   * @example {function alert()  [native code] } PH1
   */
  exceptionS: "[Exception: {PH1}]",
  /**
   * @description Placeholder text shown for a property value whose type or value is unknown.
   */
  unknown: "unknown",
  /**
   * @description Context menu item to expand an object and all of its child properties recursively.
   */
  expandRecursively: "Expand recursively",
  /**
   * @description Context menu item to collapse all child properties of an object.
   */
  collapseChildren: "Collapse children",
  /**
   * @description Context menu item to sort object properties alphabetically.
   */
  sortPropertiesAlphabetically: "Sort properties alphabetically",
  /**
   * @description Message displayed in an object properties tree when an object has no properties.
   */
  noProperties: "No properties",
  /**
   * @description Placeholder text indicating more content or an invocable getter in an object properties tree.
   */
  dots: "(...)",
  /**
   * @description Tooltip text for the button that invokes an object property getter.
   */
  invokePropertyGetter: "Invoke property getter",
  /**
   * @description Tooltip text on a button to expand and show all hidden child properties.
   * @example {50} PH1
   */
  showAllD: "Show all {PH1}",
  /**
   * @description Context menu checkbox item to show all properties, including null and undefined values.
   */
  showAll: "Show all",
  /**
   * @description Text shown when a variable or property value is unavailable, such as when optimized out by the JavaScript engine or missing a getter.
   */
  valueUnavailable: "<value unavailable>",
  /**
   * @description Tooltip text for property values that aren't accessible to the debugger.
   */
  valueNotAccessibleToTheDebugger: "Value isn\u2019t accessible to the debugger",
  /**
   * @description Context menu item to copy the value of a property to the clipboard.
   */
  copyValue: "Copy value",
  /**
   * @description Context menu item to copy the property path of an object property to the clipboard.
   */
  copyPropertyPath: "Copy property path",
  /**
   * @description Placeholder text shown when a string property is too large to display in a text editor.
   */
  stringIsTooLargeToEdit: "<string is too large to edit>",
  /**
   * @description Context menu item and button text to expand truncated long text and show the remaining size.
   * @example {30 MB} PH1
   */
  showMoreS: "Show more ({PH1})",
  /**
   * @description Button text indicating that a long text string was truncated and showing its total size.
   * @example {30 MB} PH1
   */
  longTextWasTruncatedS: "Long text was truncated ({PH1})",
  /**
   * @description Button and context menu item to copy text to the clipboard.
   */
  copy: "Copy",
  /**
   * @description Tooltip text for the button to open a memory buffer object in the Memory inspector panel.
   */
  openInMemoryInpector: "Open in Memory inspector panel"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/object_ui/ObjectPropertiesSection.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var EXPANDABLE_MAX_DEPTH = 100;
var topLevelNodesCache = /* @__PURE__ */ new WeakMap();
function isWasmObject(object) {
  return object?.subtype === "webassemblymemory" || object?.subtype === "wasmvalue";
}
var NodeExpansionLog = class _NodeExpansionLog {
  properties = /* @__PURE__ */ new Map();
  internalProperties = /* @__PURE__ */ new Map();
  arrayRanges = /* @__PURE__ */ new Map();
  accessors = /* @__PURE__ */ new Map();
  remove(key) {
    return this[key.type].delete(_NodeExpansionLog.#serializeKey(key));
  }
  get(key) {
    return this[key.type].get(_NodeExpansionLog.#serializeKey(key));
  }
  getOrInsert(key) {
    const map = this[key.type];
    const serializedKey = _NodeExpansionLog.#serializeKey(key);
    const log = map.get(serializedKey) ?? new _NodeExpansionLog();
    if (!map.has(serializedKey)) {
      map.set(serializedKey, log);
    }
    return log;
  }
  clear(type) {
    this[type].clear();
  }
  clearMissing(type, seen) {
    const seenSet = new Set(seen.map(_NodeExpansionLog.#serializeKey));
    const map = this[type];
    for (const key of map.keys()) {
      if (!seenSet.has(key)) {
        map.delete(key);
      }
    }
  }
  get empty() {
    return this.properties.size === 0 && this.internalProperties.size === 0 && this.arrayRanges.size === 0 && this.accessors.size === 0;
  }
  static #serializeKey(key) {
    if (typeof key.key === "string") {
      return `${key.type}:${key.key}`;
    }
    return `${key.type}:${key.key.fromIndex}-${key.key.toIndex}`;
  }
};
var ObjectTreeExpansionTracker = class _ObjectTreeExpansionTracker {
  #log = null;
  /**
   * For nodes physically nested within a parent's [[Prototype]] internal property, the node's
   * parent property points to the logical parent (skipping the [[Prototype]] node). This helper
   * finds that skipped [[Prototype]] node if it contains the given node.
   */
  static #protoParent(node) {
    if (!(node instanceof ObjectTreeNode)) {
      return void 0;
    }
    return node.parent?.children?.internalProperties?.find((p) => p.name === "[[Prototype]]" && p.children?.properties?.includes(node));
  }
  static #keyType(node) {
    if (node instanceof ObjectTreeNode) {
      if (node.parent?.children?.properties?.includes(node)) {
        return "properties";
      }
      if (node.parent?.children?.internalProperties?.includes(node)) {
        return "internalProperties";
      }
      if (node.parent?.children?.accessors?.includes(node)) {
        return "accessors";
      }
      const proto = _ObjectTreeExpansionTracker.#protoParent(node);
      if (proto) {
        return "properties";
      }
    }
    if (node instanceof ArrayGroupTreeNode && node.parent?.children?.arrayRanges?.includes(node)) {
      return "arrayRanges";
    }
    return null;
  }
  static #key(type, node) {
    switch (type) {
      case "arrayRanges":
        return node instanceof ArrayGroupTreeNode ? { type, key: node.range } : null;
      default:
        return node instanceof ObjectTreeNode ? { type, key: node.name } : null;
    }
  }
  clear() {
    this.#log = null;
  }
  async #apply(log, node) {
    const apply = async (type) => {
      const nodes = node.children?.[type];
      if (!nodes) {
        log.clear(type);
        return;
      }
      const seen = [];
      for (const childNode of nodes) {
        const key = _ObjectTreeExpansionTracker.#key(type, childNode);
        if (!key) {
          continue;
        }
        const childLog = log.get(key);
        if (childLog) {
          await this.#apply(childLog, childNode);
          seen.push(key);
        }
      }
      log.clearMissing(type, seen);
    };
    node.expanded = true;
    await node.populateChildrenIfNeeded();
    await apply("properties");
    await apply("internalProperties");
    await apply("arrayRanges");
    await apply("accessors");
  }
  async apply(node) {
    if (this.#log) {
      return await this.#apply(this.#log, node);
    }
  }
  static *#path(node) {
    if (!node) {
      return;
    }
    const proto = _ObjectTreeExpansionTracker.#protoParent(node);
    if (proto) {
      yield* this.#path(proto);
    } else {
      yield* this.#path(node.parent);
    }
    const keyType = this.#keyType(node);
    const key = keyType && _ObjectTreeExpansionTracker.#key(keyType, node);
    if (key) {
      yield key;
    }
  }
  collapse(node) {
    if (!this.#log) {
      return;
    }
    if (node instanceof ObjectTree) {
      this.#log = null;
      return;
    }
    let lastKey;
    let parent = null;
    let log = this.#log;
    for (const key of _ObjectTreeExpansionTracker.#path(node)) {
      lastKey = key;
      parent = log;
      const nextLog = log.get(key);
      if (!nextLog) {
        return;
      }
      log = nextLog;
    }
    if (lastKey && parent) {
      parent.remove(lastKey);
    }
  }
  expand(node) {
    if (!this.#log) {
      this.#log = new NodeExpansionLog();
    }
    let log = this.#log;
    for (const key of _ObjectTreeExpansionTracker.#path(node)) {
      log = log.getOrInsert(key);
    }
  }
};
var ObjectTreeNodeBase = class _ObjectTreeNodeBase extends Common2.ObjectWrapper.ObjectWrapper {
  constructor(parent, options) {
    super();
    this.parent = parent;
    this.filter = parent?.filter ?? null;
    this.options = { ...options };
    this.#sortPropertiesAlphabeticallySetting = parent ? parent.#sortPropertiesAlphabeticallySetting : Common2.Settings.Settings.instance().createSetting("object-properties-sort-alphabetically", true);
  }
  parent;
  #children;
  options;
  filter = null;
  extraProperties = [];
  #expanded = false;
  #sortPropertiesAlphabeticallySetting;
  get isWasm() {
    return isWasmObject(this.object);
  }
  get expanded() {
    return this.#expanded;
  }
  set expanded(val) {
    if (val) {
      this.options.expansionTracker?.expand(this);
    } else {
      this.options.expansionTracker?.collapse(this);
    }
    if (this.#expanded !== val) {
      this.#expanded = val;
      this.dispatchEventToListeners(_ObjectTreeNodeBase.Events.EXPANDED_CHANGED, val);
    }
  }
  get readOnly() {
    return this.options.readOnly;
  }
  get propertiesMode() {
    return this.options.propertiesMode;
  }
  get search() {
    return this.options.search;
  }
  get includeNullOrUndefinedValues() {
    return this.filter?.includeNullOrUndefinedValues ?? true;
  }
  set includeNullOrUndefinedValues(value) {
    this.setFilter({ includeNullOrUndefinedValues: value, regex: this.filter?.regex ?? null });
  }
  get canExpandRecursively() {
    return true;
  }
  get sortPropertiesAlphabetically() {
    if (this.isWasm) {
      return false;
    }
    return this.#sortPropertiesAlphabeticallySetting.get();
  }
  set sortPropertiesAlphabetically(value) {
    if (this.isWasm || this.#sortPropertiesAlphabeticallySetting.get() === value) {
      return;
    }
    this.#sortPropertiesAlphabeticallySetting.set(value);
    this.removeChildren();
  }
  *treeNodeChildren() {
    if (this.#children) {
      yield* this.#children.properties ?? [];
      yield* this.#children.arrayRanges ?? [];
      yield* this.#children.internalProperties ?? [];
    }
  }
  // Performs a pre-order tree traversal over the populated children. If any children need to be populated, callers must
  // do that while walking (pre-order visitation enables that).
  *#walk(maxDepth = -1, filter) {
    if (filter && !filter(this)) {
      return;
    }
    yield this;
    if (maxDepth !== 0) {
      for (const child of this.treeNodeChildren()) {
        yield* child.#walk(Math.max(-1, maxDepth - 1), filter);
      }
    }
  }
  async expandRecursively(maxDepth) {
    for (const node of this.#walk(maxDepth, (n) => n.canExpandRecursively)) {
      await node.populateChildrenIfNeeded();
      node.expanded = true;
    }
  }
  collapseRecursively() {
    for (const node of this.#walk()) {
      node.expanded = false;
    }
  }
  setFilter(filter) {
    this.filter = filter;
    this.dispatchEventToListeners(_ObjectTreeNodeBase.Events.FILTER_CHANGED);
    this.#walk().forEach((c) => {
      c.filter = filter;
      c.dispatchEventToListeners(_ObjectTreeNodeBase.Events.FILTER_CHANGED);
    });
  }
  removeChildren() {
    this.#children = void 0;
    this.dispatchEventToListeners(_ObjectTreeNodeBase.Events.CHILDREN_CHANGED);
  }
  match(_regex) {
    return [];
  }
  removeChild(child) {
    remove(this.#children?.arrayRanges, child);
    remove(this.#children?.internalProperties, child);
    remove(this.#children?.properties, child);
    this.dispatchEventToListeners(_ObjectTreeNodeBase.Events.CHILDREN_CHANGED);
    function remove(array, element) {
      if (!array) {
        return;
      }
      const index = array.indexOf(element);
      if (index >= 0) {
        array.splice(index, 1);
      }
    }
  }
  selfOrParentIfInternal() {
    return this;
  }
  get children() {
    return this.#children;
  }
  #populatePromise;
  async populateChildrenIfNeeded() {
    if (this.#children) {
      return this.#children;
    }
    if (!this.#populatePromise) {
      this.#populatePromise = this.populateChildrenIfNeededImpl().then((children) => {
        this.#children = children;
        return children;
      }).finally(() => {
        this.#populatePromise = void 0;
      });
    }
    return await this.#populatePromise;
  }
  async populateChildrenIfNeededImpl() {
    const object = this.object;
    if (!object) {
      return {};
    }
    const effectiveParent = this.selfOrParentIfInternal();
    if (this.arrayLength > ARRAY_LOAD_THRESHOLD) {
      const ranges = await arrayRangeGroups(object, 0, this.arrayLength - 1);
      const arrayRanges = ranges?.ranges.map(([fromIndex, toIndex, count]) => new ArrayGroupTreeNode(
        object,
        { fromIndex, toIndex, count },
        effectiveParent,
        {
          ...this.options
        }
      ));
      if (!arrayRanges) {
        return {};
      }
      const { properties: objectProperties2, internalProperties: objectInternalProperties2 } = await SDK3.RemoteObject.RemoteObject.loadFromObjectPerProto(
        this.object,
        true,
        true
        /* nonIndexedPropertiesOnly */
      );
      const properties2 = objectProperties2?.map((p) => new ObjectTreeNode(p, effectiveParent, {
        ...this.options,
        propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
      }));
      const internalProperties2 = objectInternalProperties2?.map((p) => new ObjectTreeNode(p, effectiveParent, {
        ...this.options,
        propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
      }));
      return { arrayRanges, properties: properties2, internalProperties: internalProperties2 };
    }
    let objectProperties = null;
    let objectInternalProperties = null;
    switch (this.propertiesMode) {
      case 0 /* ALL */:
        ({ properties: objectProperties } = await object.getAllProperties(
          false,
          true
          /* generatePreview */
        ));
        break;
      case 1 /* OWN_AND_INTERNAL_AND_INHERITED */:
        ({ properties: objectProperties, internalProperties: objectInternalProperties } = await SDK3.RemoteObject.RemoteObject.loadFromObjectPerProto(
          object,
          true
          /* generatePreview */
        ));
        break;
    }
    const properties = objectProperties?.map((p) => new ObjectTreeNode(p, effectiveParent, {
      ...this.options,
      propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
    }));
    properties?.push(...this.extraProperties);
    properties?.sort((a, b) => compareProperties(a, b, this.sortPropertiesAlphabetically));
    const accessors = properties && _ObjectTreeNodeBase.getGettersAndSetters(properties, this.options);
    const internalProperties = objectInternalProperties?.map((p) => new ObjectTreeNode(p, effectiveParent, {
      ...this.options,
      propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
    }));
    return { properties, internalProperties, accessors };
  }
  get hasChildren() {
    return this.object?.hasChildren ?? false;
  }
  get arrayLength() {
    return this.object?.arrayLength() ?? 0;
  }
  // This is used in web tests
  async setPropertyValue(name, value) {
    return await this.object?.setPropertyValue(name, value);
  }
  addExtraProperties(...properties) {
    this.extraProperties.push(...properties.map((p) => new ObjectTreeNode(p, this, {
      ...this.options,
      propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
    })));
  }
  static getGettersAndSetters(properties, options) {
    const gettersAndSetters = [];
    for (const property of properties) {
      if (property.property.isOwn) {
        if (property.property.getter) {
          const getterProperty = new SDK3.RemoteObject.RemoteObjectProperty(
            "get " + property.property.name,
            property.property.getter,
            false
          );
          gettersAndSetters.push(new ObjectTreeNode(getterProperty, property.parent, {
            ...options,
            propertiesMode: property.propertiesMode,
            readOnly: property.readOnly
          }));
        }
        if (property.property.setter) {
          const setterProperty = new SDK3.RemoteObject.RemoteObjectProperty(
            "set " + property.property.name,
            property.property.setter,
            false
          );
          gettersAndSetters.push(new ObjectTreeNode(setterProperty, property.parent, {
            ...options,
            propertiesMode: property.propertiesMode,
            readOnly: property.readOnly
          }));
        }
      }
    }
    return gettersAndSetters;
  }
};
((ObjectTreeNodeBase2) => {
  let Events;
  ((Events2) => {
    Events2["VALUE_CHANGED"] = "value-changed";
    Events2["CHILDREN_CHANGED"] = "children-changed";
    Events2["FILTER_CHANGED"] = "filter-changed";
    Events2["EXPANDED_CHANGED"] = "expanded-changed";
  })(Events = ObjectTreeNodeBase2.Events || (ObjectTreeNodeBase2.Events = {}));
})(ObjectTreeNodeBase || (ObjectTreeNodeBase = {}));
var ObjectTree = class extends ObjectTreeNodeBase {
  #object;
  constructor(object, options) {
    super(void 0, options);
    this.#object = object;
  }
  get object() {
    return this.#object;
  }
};
var ArrayGroupTreeNode = class _ArrayGroupTreeNode extends ObjectTreeNodeBase {
  #object;
  #range;
  constructor(object, range, parent, options) {
    super(parent, options);
    this.#object = object;
    this.#range = range;
  }
  async populateChildrenIfNeededImpl() {
    if (this.#range.count > ArrayGroupingTreeElement.bucketThreshold) {
      const ranges = await arrayRangeGroups(this.object, this.#range.fromIndex, this.#range.toIndex);
      const arrayRanges = ranges?.ranges.map(
        ([fromIndex, toIndex, count]) => new _ArrayGroupTreeNode(this.object, { fromIndex, toIndex, count }, this, {
          readOnly: this.readOnly,
          propertiesMode: this.propertiesMode,
          expansionTracker: this.options.expansionTracker
        })
      );
      return { arrayRanges };
    }
    const result = await this.#object.callFunction(buildArrayFragment, [
      { value: this.#range.fromIndex },
      { value: this.#range.toIndex },
      { value: ArrayGroupingTreeElement.sparseIterationThreshold }
    ]);
    if (!result.object || result.wasThrown) {
      return {};
    }
    const arrayFragment = result.object;
    const allProperties = await arrayFragment.getAllProperties(
      false,
      true
      /* generatePreview */
    );
    arrayFragment.release();
    const properties = allProperties.properties?.map((p) => new ObjectTreeNode(p, this, {
      ...this.options
    }));
    properties?.push(...this.extraProperties);
    properties?.sort((a, b) => compareProperties(a, b, this.sortPropertiesAlphabetically));
    const accessors = properties && ObjectTreeNodeBase.getGettersAndSetters(properties, this.options);
    return { properties, accessors };
  }
  get singular() {
    return this.#range.fromIndex === this.#range.toIndex;
  }
  get range() {
    return this.#range;
  }
  get object() {
    return this.#object;
  }
};
var ObjectTreeNode = class _ObjectTreeNode extends ObjectTreeNodeBase {
  constructor(property, parent, options, nonSyntheticParent) {
    super(parent, options);
    this.property = property;
    this.nonSyntheticParent = nonSyntheticParent;
  }
  property;
  nonSyntheticParent;
  #path;
  get object() {
    return this.property.value;
  }
  get isFiltered() {
    return Boolean(this.filter && !this.property.match(this.filter));
  }
  get canExpandRecursively() {
    return this.property.name !== "[[Prototype]]";
  }
  get name() {
    return this.property.name;
  }
  get path() {
    if (!this.#path) {
      if (this.property.synthetic) {
        this.#path = this.name;
        return this.name;
      }
      const useDotNotation = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
      const isInteger = /^(?:0|[1-9]\d*)$/;
      const parentPath = this.parent instanceof _ObjectTreeNode && !this.parent.property.synthetic ? this.parent.path : "";
      if (this.property.private || useDotNotation.test(this.name)) {
        this.#path = parentPath ? `${parentPath}.${this.name}` : this.name;
      } else if (isInteger.test(this.name)) {
        this.#path = `${parentPath}[${this.name}]`;
      } else {
        this.#path = `${parentPath}[${Platform2.StringUtilities.formatAsJSLiteral(this.name)}]`;
      }
    }
    return this.#path;
  }
  selfOrParentIfInternal() {
    return this.name === "[[Prototype]]" ? this.parent ?? this : this;
  }
  async setValue(expression) {
    const property = SDK3.RemoteObject.RemoteObject.toCallArgument(this.property.symbol || this.name);
    expression = JavaScriptREPL.wrapObjectLiteral(expression.trim());
    if (this.property.synthetic) {
      let invalidate = false;
      if (expression) {
        invalidate = await this.property.setSyntheticValue(expression);
      }
      if (invalidate) {
        this.parent?.removeChildren();
      } else {
        this.dispatchEventToListeners("value-changed" /* VALUE_CHANGED */);
      }
      return;
    }
    const parentObject = this.parent?.object;
    const errorPromise = expression ? parentObject.setPropertyValue(property, expression) : parentObject.deleteProperty(property);
    const error = await errorPromise;
    if (error) {
      this.dispatchEventToListeners("value-changed" /* VALUE_CHANGED */);
      return;
    }
    if (!expression) {
      this.parent?.removeChild(this);
    } else {
      this.parent?.removeChildren();
    }
  }
  async invokeGetter(getter) {
    const invokeGetter = `
          function invokeGetter(getter) {
            return Reflect.apply(getter, this, []);
          }`;
    const result = await this.parent?.object?.callFunction(invokeGetter, [SDK3.RemoteObject.RemoteObject.toCallArgument(getter)]);
    if (!result?.object) {
      return;
    }
    this.property.value = result.object;
    this.property.wasThrown = result.wasThrown || false;
    this.dispatchEventToListeners("value-changed" /* VALUE_CHANGED */);
  }
  #getSearchableNameText() {
    return /^\s|\s$|^$|\n/.test(this.property.name) ? `"${this.property.name.replace(/\n/g, "\u21B5")}"` : this.property.name;
  }
  #getSearchableValueText() {
    const value = this.property.value;
    if (!value || value.type !== "string" && value.type !== "number" || value.description === void 0) {
      return "";
    }
    if (value.type === "string" && typeof value.description === "string") {
      const text = Platform2.StringUtilities.safeEscapeUnicode(JSON.stringify(value.description));
      if (value.description.length > maxRenderableStringLength) {
        return text.slice(0, ExpandableTextPropertyValue.EXPANDABLE_MAX_LENGTH);
      }
      return text;
    }
    return value.description;
  }
  match(regex) {
    const results = [];
    const nameText = this.#getSearchableNameText();
    const nameGlobalRegex = regex.global ? regex : new RegExp(regex.source, regex.flags + "g");
    for (const m of nameText.matchAll(nameGlobalRegex)) {
      results.push({
        node: this,
        isPostOrderMatch: false,
        matchIndexInNode: results.length,
        matchType: "name",
        range: new TextUtils.TextRange.SourceRange(m.index ?? 0, m[0].length)
      });
    }
    const valueText = this.#getSearchableValueText();
    if (valueText) {
      const valueGlobalRegex = regex.global ? regex : new RegExp(regex.source, regex.flags + "g");
      for (const m of valueText.matchAll(valueGlobalRegex)) {
        results.push({
          node: this,
          isPostOrderMatch: false,
          matchIndexInNode: results.length,
          matchType: "value",
          range: new TextUtils.TextRange.SourceRange(m.index ?? 0, m[0].length)
        });
      }
    }
    return results;
  }
};
function compareProperties(propertyA, propertyB, sortPropertiesAlphabetically = true) {
  if (propertyA instanceof ObjectTreeNode) {
    propertyA = propertyA.property;
  }
  if (propertyB instanceof ObjectTreeNode) {
    propertyB = propertyB.property;
  }
  if (!propertyA.synthetic && propertyB.synthetic) {
    return 1;
  }
  if (!propertyB.synthetic && propertyA.synthetic) {
    return -1;
  }
  if (!propertyA.isOwn && propertyB.isOwn) {
    return 1;
  }
  if (!propertyB.isOwn && propertyA.isOwn) {
    return -1;
  }
  if (!propertyA.enumerable && propertyB.enumerable) {
    return 1;
  }
  if (!propertyB.enumerable && propertyA.enumerable) {
    return -1;
  }
  if (propertyA.symbol && !propertyB.symbol) {
    return 1;
  }
  if (propertyB.symbol && !propertyA.symbol) {
    return -1;
  }
  if (propertyA.private && !propertyB.private) {
    return 1;
  }
  if (propertyB.private && !propertyA.private) {
    return -1;
  }
  if (sortPropertiesAlphabetically) {
    const nameA = propertyA.name;
    const nameB = propertyB.name;
    if (nameA.startsWith("_") && !nameB.startsWith("_")) {
      return 1;
    }
    if (nameB.startsWith("_") && !nameA.startsWith("_")) {
      return -1;
    }
    return Platform2.StringUtilities.naturalOrderComparator(nameA, nameB);
  }
  return 0;
}
function valueElementForFunctionDescription(description, includePreview, defaultName, details, linkify) {
  const contents = (description2, defaultName2) => {
    const text = description2.replace(/^function [gs]et /, "function ").replace(/^function [gs]et\(/, "function(").replace(/^[gs]et /, "");
    const asyncMatch = text.match(/^(async\s+function)/);
    const isGenerator = text.startsWith("function*");
    const isGeneratorShorthand = text.startsWith("*");
    const isBasic = !isGenerator && text.startsWith("function");
    const isClass = text.startsWith("class ") || text.startsWith("class{");
    const firstArrowIndex = text.indexOf("=>");
    const isArrow = !asyncMatch && !isGenerator && !isBasic && !isClass && firstArrowIndex > 0;
    if (isClass) {
      const body2 = text.substring("class".length);
      const classNameMatch = /^[^{\s]+/.exec(body2.trim());
      let className = defaultName2;
      if (classNameMatch) {
        className = classNameMatch[0].trim() || defaultName2;
      }
      return { prefix: "class", body: body2, abbreviation: className };
    }
    if (asyncMatch) {
      const body2 = text.substring(asyncMatch[1].length);
      return { prefix: "async \u0192", body: body2, abbreviation: nameAndArguments(body2) };
    }
    if (isGenerator) {
      const body2 = text.substring("function*".length);
      return { prefix: "\u0192*", body: body2, abbreviation: nameAndArguments(body2) };
    }
    if (isGeneratorShorthand) {
      const body2 = text.substring("*".length);
      return { prefix: "\u0192*", body: body2, abbreviation: nameAndArguments(body2) };
    }
    if (isBasic) {
      const body2 = text.substring("function".length);
      return { prefix: "\u0192", body: body2, abbreviation: nameAndArguments(body2) };
    }
    if (isArrow) {
      const maxArrowFunctionCharacterLength = 60;
      let abbreviation2 = text;
      if (defaultName2) {
        abbreviation2 = defaultName2 + "()";
      } else if (text.length > maxArrowFunctionCharacterLength) {
        abbreviation2 = text.substring(0, firstArrowIndex + 2) + " {\u2026}";
      }
      return { prefix: "", body: text, abbreviation: abbreviation2 };
    }
    return { prefix: "\u0192", body: text, abbreviation: nameAndArguments(text) };
  };
  const { prefix, body, abbreviation } = contents(description ?? "", defaultName ?? "");
  const maxFunctionBodyLength = 200;
  const location = details?.location;
  const clickHandler = linkify && location ? (event) => {
    void Common2.Revealer.reveal(location);
    event.consume(true);
  } : void 0;
  const classes = classMap({
    "object-value-function": true,
    linkified: Boolean(linkify && location)
  });
  const title = description ? Platform2.StringUtilities.trimEndWithMaxLength(description, 500) : void 0;
  return html2`<span
    class=${classes}
    @click=${clickHandler || nothing2}
    title=${ifDefined2(title)}>${prefix && html2`<span class=object-value-function-prefix>${prefix} </span>`}${includePreview ? Platform2.StringUtilities.trimEndWithMaxLength(body.trim(), maxFunctionBodyLength) : abbreviation.replace(/\n/g, " ")}</span>`;
  function nameAndArguments(contents2) {
    const startOfArgumentsIndex = contents2.indexOf("(");
    const endOfArgumentsMatch = contents2.match(/\)\s*{/);
    if (startOfArgumentsIndex !== -1 && endOfArgumentsMatch?.index !== void 0 && endOfArgumentsMatch.index > startOfArgumentsIndex) {
      const name = contents2.substring(0, startOfArgumentsIndex).trim() || (defaultName ?? "");
      const args = contents2.substring(startOfArgumentsIndex, endOfArgumentsMatch.index + 1);
      return name + args;
    }
    return defaultName + "()";
  }
}
function getMemoryIcon(object, expression) {
  return !object.isLinearMemoryInspectable() ? nothing2 : html2`<devtools-icon
    name=memory
    style="width: var(--sys-size-8); height: 13px; vertical-align: sub; cursor: pointer;"
    @click=${(event) => {
    event.consume();
    void Common2.Revealer.reveal(new SDK3.RemoteObject.LinearMemoryInspectable(object, expression));
  }}
    jslog=${VisualLogging.action("open-memory-inspector").track({ click: true })}
    title=${i18nString2(UIStrings2.openInMemoryInpector)}
    aria-label=${i18nString2(UIStrings2.openInMemoryInpector)}></devtools-icon>`;
}
function isDisplayableProperty(property, parentProperty) {
  if (!parentProperty?.synthetic) {
    return true;
  }
  const name = property.name;
  const useless = parentProperty.name === "[[Entries]]" && (name === "length" || name === "__proto__");
  return !useless;
}
var ObjectPropertiesSectionWidget = class extends UI2.Widget.Widget {
  #root;
  #title;
  #skipProto = false;
  #linkifier;
  #showOverflow = true;
  #view = OBJECT_PROPERTIES_SECTION_DEFAULT_VIEW;
  constructor(element, view = OBJECT_PROPERTIES_SECTION_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
  get root() {
    return this.#root?.object;
  }
  set root(val) {
    if (val === this.#root?.object) {
      return;
    }
    this.objectTree = new ObjectTree(val, {
      readOnly: false,
      propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
    });
  }
  get objectTree() {
    return this.#root;
  }
  set objectTree(val) {
    if (val === this.#root) {
      return;
    }
    this.#root?.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#root?.removeEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
    this.#root = val;
    this.#root?.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#root?.addEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
    this.requestUpdate();
  }
  get title() {
    return this.#title;
  }
  set title(val) {
    if (val === this.#title) {
      return;
    }
    this.#title = val;
    this.requestUpdate();
  }
  get skipProto() {
    return this.#skipProto;
  }
  set skipProto(val) {
    if (val === this.#skipProto) {
      return;
    }
    this.#skipProto = val;
    this.requestUpdate();
  }
  get linkifier() {
    return this.#linkifier;
  }
  set linkifier(val) {
    if (val === this.#linkifier) {
      return;
    }
    this.#linkifier = val;
    this.requestUpdate();
  }
  get showOverflow() {
    return this.#showOverflow;
  }
  set showOverflow(val) {
    if (val === this.#showOverflow) {
      return;
    }
    this.#showOverflow = val;
    this.requestUpdate();
  }
  onExpand = (expanded) => {
    if (this.#root) {
      this.#root.expanded = expanded;
    }
  };
  performUpdate() {
    if (!this.#root) {
      return;
    }
    this.#view(
      {
        objectTree: this.#root,
        title: this.#title,
        linkifier: this.#linkifier,
        skipProto: this.#skipProto,
        showOverflow: this.#showOverflow,
        onRootItemContextMenu: this.onRootItemContextMenu,
        onExpand: this.onExpand
      },
      {},
      this.contentElement
    );
  }
  onDetach() {
    this.#root?.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#root?.removeEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
  }
  wasShown() {
    super.wasShown();
    this.#root?.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#root?.removeEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
    this.#root?.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#root?.addEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
  }
  onRootItemContextMenu = (contextMenu) => {
    const root = this.#root;
    if (!root) {
      return;
    }
    populateObjectTreeContextMenu(
      contextMenu,
      root,
      root.expandRecursively.bind(root, EXPANDABLE_MAX_DEPTH),
      root.collapseRecursively.bind(root),
      () => {
        root.sortPropertiesAlphabetically = !root.sortPropertiesAlphabetically;
      },
      () => {
        root.includeNullOrUndefinedValues = !root.includeNullOrUndefinedValues;
      }
    );
  };
};
var ARRAY_LOAD_THRESHOLD = 100;
var maxRenderableStringLength = 1e4;
var ObjectPropertiesMode = /* @__PURE__ */ ((ObjectPropertiesMode2) => {
  ObjectPropertiesMode2[ObjectPropertiesMode2["ALL"] = 0] = "ALL";
  ObjectPropertiesMode2[ObjectPropertiesMode2["OWN_AND_INTERNAL_AND_INHERITED"] = 1] = "OWN_AND_INTERNAL_AND_INHERITED";
  return ObjectPropertiesMode2;
})(ObjectPropertiesMode || {});
function populateObjectTreeContextMenu(contextMenu, object, expandRecursively, collapseChildren, sortPropertiesAlphabetically, onShowAllToggled) {
  contextMenu.appendApplicableItems(object.object);
  if (object.object instanceof SDK3.RemoteObject.LocalJSONObject) {
    const { value } = object.object;
    const propertyValue = typeof value === "object" ? Platform2.StringUtilities.escapeUnicodeAsText(JSON.stringify(value, null, 2)) : value;
    const copyValueHandler = () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyValue);
    };
    contextMenu.clipboardSection().appendItem(
      i18nString2(UIStrings2.copyValue),
      copyValueHandler,
      { jslogContext: "copy-value" }
    );
  }
  contextMenu.viewSection().appendItem(
    i18nString2(UIStrings2.expandRecursively),
    expandRecursively,
    { jslogContext: "expand-recursively" }
  );
  contextMenu.viewSection().appendItem(
    i18nString2(UIStrings2.collapseChildren),
    collapseChildren,
    { jslogContext: "collapse-children" }
  );
  if (!object.isWasm) {
    contextMenu.viewSection().appendCheckboxItem(
      i18nString2(UIStrings2.sortPropertiesAlphabetically),
      sortPropertiesAlphabetically,
      {
        checked: object.sortPropertiesAlphabetically,
        jslogContext: "sort-properties-alphabetically"
      }
    );
  }
  contextMenu.viewSection().appendCheckboxItem(
    i18nString2(UIStrings2.showAll),
    onShowAllToggled,
    { checked: object.includeNullOrUndefinedValues, jslogContext: "show-all" }
  );
}
var OBJECT_TREE_DEFAULT_VIEW = (input, output, target) => {
  const objectTree = input.objectTree;
  if (!objectTree) {
    render2(nothing2, target);
    return;
  }
  const classes = input.renderAsSubtree ? ["source-code", "object-properties-section"] : [];
  let entry = topLevelNodesCache.get(objectTree);
  if (!entry || entry.linkifier !== input.linkifier || !entry.nodes.length && objectTree.children) {
    if (entry) {
      objectTree.removeEventListener("children-changed" /* CHILDREN_CHANGED */, entry.listener);
    }
    const nodes = Array.from(ObjectPropertyTreeElement.createNodes(
      objectTree,
      input.skipProto,
      false,
      input.linkifier,
      input.emptyPlaceholder
    ));
    const listener = () => {
      topLevelNodesCache.delete(objectTree);
      objectTree.removeEventListener("children-changed" /* CHILDREN_CHANGED */, listener);
    };
    entry = { linkifier: input.linkifier, nodes, listener };
    topLevelNodesCache.set(objectTree, entry);
    objectTree.addEventListener("children-changed" /* CHILDREN_CHANGED */, listener);
  }
  render2(entry.nodes.map((node) => html2`<devtools-tree-wrapper .treeElement=${node}></devtools-tree-wrapper>`), target, {
    container: {
      classes,
      interceptedListeners: {
        expand: (e) => input.onExpand(e.detail.expanded)
      }
    }
  });
};
var ObjectTreeWidget = class extends UI2.Widget.Widget {
  #objectTree = void 0;
  #linkifier = void 0;
  #emptyPlaceholder;
  #renderAsSubtree = false;
  #skipProto = false;
  #view;
  constructor(element, view = OBJECT_TREE_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
  onExpand = (expanded) => {
    if (this.#objectTree) {
      this.#objectTree.expanded = expanded;
    }
  };
  get skipProto() {
    return this.#skipProto;
  }
  set skipProto(val) {
    this.#skipProto = val;
    this.requestUpdate();
  }
  get objectTree() {
    return this.#objectTree;
  }
  set objectTree(val) {
    if (val === this.#objectTree) {
      return;
    }
    this.#objectTree?.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#objectTree?.removeEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
    this.#objectTree = val;
    this.#objectTree?.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#objectTree?.addEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
    this.requestUpdate();
  }
  get linkifier() {
    return this.#linkifier;
  }
  set linkifier(val) {
    if (val === this.#linkifier) {
      return;
    }
    this.#linkifier = val;
    this.requestUpdate();
  }
  get emptyPlaceholder() {
    return this.#emptyPlaceholder;
  }
  set emptyPlaceholder(val) {
    if (val === this.#emptyPlaceholder) {
      return;
    }
    this.#emptyPlaceholder = val;
    this.requestUpdate();
  }
  get renderAsSubtree() {
    return this.#renderAsSubtree;
  }
  set renderAsSubtree(val) {
    if (val === this.#renderAsSubtree) {
      return;
    }
    this.#renderAsSubtree = val;
    this.requestUpdate();
  }
  async performUpdate() {
    if (this.#objectTree?.expanded) {
      await ObjectPropertyTreeElement.populateChildrenIfNeeded(this.#objectTree);
    }
    this.#view(this, {}, this.contentElement);
  }
  onDetach() {
    this.#objectTree?.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#objectTree?.removeEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
  }
  wasShown() {
    super.wasShown();
    this.#objectTree?.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#objectTree?.removeEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
    this.#objectTree?.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#objectTree?.addEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.requestUpdate, this);
  }
};
function renderObjectTree(objectTree, linkifier, emptyPlaceholder) {
  return html2`<ul role="group" ${widget(ObjectTreeWidget, { objectTree, linkifier, emptyPlaceholder, renderAsSubtree: true })} ${/* The empty widgetRef forces the widget to be materialized in the template DOM */
  widgetRef(ObjectTreeWidget, () => {
  })}></ul>`;
}
var OBJECT_PROPERTIES_SECTION_DEFAULT_VIEW = (input, _output, target) => {
  const onRootItemContextMenuHandler = (event) => {
    event.consume(true);
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    input.onRootItemContextMenu(contextMenu);
    void contextMenu.show();
  };
  render2(
    html2`
    <devtools-tree
        class="object-properties-section"
        ?hide-overflow=${!input.showOverflow}
        show-selection-on-keyboard-focus
        .template=${input.title ? html2`
      <ul role="tree" class="source-code object-properties-section">
        <style>${objectValue_css_default}</style>
        <style>${objectPropertiesSection_css_default}</style>
        <li role="treeitem" class="object-properties-section-root-element" toggle-on-click ?open=${input.objectTree.expanded} @expand=${(e) => input.onExpand(e.detail.expanded)} @contextmenu=${onRootItemContextMenuHandler}>
          ${input.title}
          <ul role="group" ${widget(ObjectTreeWidget, {
      objectTree: input.objectTree,
      linkifier: input.linkifier,
      skipProto: input.skipProto
    })} ${widgetRef(ObjectTreeWidget, () => {
    })}></ul>
        </li>
      </ul>` : html2`
      <ul role="tree" class="source-code object-properties-section title-less-mode" open ${widget(
      ObjectTreeWidget,
      { objectTree: input.objectTree, linkifier: input.linkifier, skipProto: input.skipProto }
    )} ${/* The empty widgetRef forces the widget to be materialized in the template DOM */
    widgetRef(ObjectTreeWidget, () => {
    })}>
        <style>${objectValue_css_default}</style>
        <style>${objectPropertiesSection_css_default}</style>
      </ul>`}>
    </devtools-tree>`,
    target
  );
};
function renderPropertyName(name, isPrivate, title) {
  if (name === null) {
    return html2`<span class="name" title=${ifDefined2(title)}></span>`;
  }
  const escapedName = Platform2.StringUtilities.escapeUnicodeAsText(name);
  if (/^\s|\s$|^$|\n/.test(escapedName)) {
    return html2`<span class="name" title=${ifDefined2(title)}>"${escapedName.replace(/\n/g, "\u21B5")}"</span>`;
  }
  if (isPrivate) {
    return html2`<span class="name" title=${ifDefined2(title)}><span class="private-property-hash">${escapedName[0]}</span>${escapedName.substring(1)}</span>`;
  }
  return html2`<span class="name" title=${ifDefined2(title)}>${escapedName}</span>`;
}
async function formatObjectAsFunction(func, linkify, includePreview) {
  const details = await func.debuggerModel().functionDetailsPromise(func);
  const defaultName = details?.functionName ?? (includePreview ? "" : "anonymous");
  return valueElementForFunctionDescription(func.description, includePreview, defaultName, details, linkify);
}
function renderPropertyValue(value, wasThrown, showPreview, linkifier, isSyntheticProperty = false, variableName, includeNullOrUndefined, useCustomPreview = false, valueRef) {
  if (useCustomPreview && value.customPreview()) {
    return html2`<devtools-widget class="object-properties-section-custom-section" ${UI2.Widget.widget(
      CustomPreviewComponent,
      { object: value }
    )} ${valueRef ? Directives2.ref(valueRef) : nothing2}></devtools-widget>`;
  }
  const type = value.type;
  const subtype = value.subtype;
  const description = value.description || "";
  const className = value.className;
  const isInternalLocation = type === "object" && subtype === "internal#location";
  const isString = type === "string" && typeof description === "string";
  const isTrustedType = type === "object" && subtype === "trustedtype";
  const isFunction = type === "function";
  const isNode = type === "object" && subtype === "node" && Boolean(description);
  const isDefault = !isInternalLocation && !isString && !isTrustedType && !isFunction && !isNode;
  const classes = classMap({
    value: true,
    [`object-value-${subtype || type}`]: isDefault,
    "object-value-string": isString,
    "object-value-trustedtype": isTrustedType,
    "object-value-node": isNode
  });
  const onNodeClick = (event) => {
    void Common2.Revealer.reveal(value);
    event.consume(true);
  };
  const onNodeMouseMove = () => SDK3.OverlayModel.OverlayModel.highlightObjectAsDOMNode(value);
  const onNodeMouseLeave = () => SDK3.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK3.TargetManager.TargetManager.instance());
  let title;
  let content = description;
  if (isNode) {
    content = renderNodeTitle(description);
  } else if (isInternalLocation) {
    const rawLocation = value.debuggerModel().createRawLocationByScriptId(
      value.value.scriptId,
      value.value.lineNumber,
      value.value.columnNumber
    );
    const linkifiedLocation = rawLocation && linkifier ? linkifier.linkifyRawLocation(rawLocation, Platform2.DevToolsPath.EmptyUrlString, "value") : null;
    if (linkifiedLocation) {
      valueRef?.(linkifiedLocation);
      return html2`${linkifiedLocation}`;
    }
    title = description || void 0;
    content = "<" + i18nString2(UIStrings2.unknown) + ">";
  } else if (isString) {
    const text = Platform2.StringUtilities.escapeUnicodeAsText(JSON.stringify(description));
    const tooLong = description.length > maxRenderableStringLength;
    title = tooLong ? void 0 : description;
    content = tooLong ? widget(ExpandableTextPropertyValue, { text }) : text;
  } else if (isTrustedType) {
    const text = `${className} "${description}"`;
    const tooLong = text.length > maxRenderableStringLength;
    title = tooLong ? void 0 : text;
    content = tooLong ? widget(ExpandableTextPropertyValue, { text }) : renderTrustedType(description, className);
  } else if (isFunction) {
    content = valueElementForFunctionDescription(description);
  } else if (description.length > maxRenderableStringLength) {
    title = description;
    content = widget(ExpandableTextPropertyValue, { text: description });
  } else {
    title = description;
    const hasPreview = value.preview && showPreview;
    const previewContent = hasPreview ? new RemoteObjectPreviewFormatter().renderObjectPreview(value.preview, includeNullOrUndefined) : description;
    content = html2`${previewContent}${isSyntheticProperty ? nothing2 : getMemoryIcon(value, variableName)}`;
  }
  if (wasThrown) {
    return html2`<span ${valueRef ? ref(valueRef) : nothing2} class="error value">${uiI18n.getFormatLocalizedStringTemplate(str_2, UIStrings2.exceptionS, {
      PH1: html2`<span
        class=${classes}
        title=${ifDefined2(title)}
        @click=${isNode ? onNodeClick : nothing2}
        @mousemove=${isNode ? onNodeMouseMove : nothing2}
        @mouseleave=${isNode ? onNodeMouseLeave : nothing2}>${content}</span>`
    })}</span>`;
  }
  return html2`<span
      ${valueRef ? ref(valueRef) : nothing2}
      class=${classes}
      title=${ifDefined2(title)}
      @click=${isNode ? onNodeClick : nothing2}
      @mousemove=${isNode ? onNodeMouseMove : nothing2}
      @mouseleave=${isNode ? onNodeMouseLeave : nothing2}>${content}</span>`;
}
function defaultObjectPresentation(objectOrTree, linkifier, skipProto, readOnly, extraClasses) {
  const objectTree = objectOrTree instanceof ObjectTree ? objectOrTree : new ObjectTree(objectOrTree, {
    readOnly: Boolean(readOnly),
    propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
  });
  const object = objectTree.object;
  const title = html2`<span class=${classMap({ "source-code": true, ...!object.hasChildren ? extraClasses : void 0 })}><style>${objectValue_css_default}</style>${renderPropertyValue(
    object,
    /* wasThrown= */
    false,
    /* showPreview= */
    true
  )}</span>`;
  if (!object.hasChildren) {
    return title;
  }
  return html2`<devtools-widget class=${classMap(extraClasses ?? {})} ${widget(
    ObjectPropertiesSectionWidget,
    { objectTree, title, linkifier, skipProto: Boolean(skipProto), showOverflow: !readOnly }
  )}></devtools-widget>`;
}
var InitialVisibleChildrenLimit = 200;
var OBJECT_PROPERTY_DEFAULT_VIEW = (input, output, target) => {
  const { property } = input.node;
  const isInternalEntries = property.synthetic && input.node.name === "[[Entries]]";
  const completionsId = `completions-${input.node.parent?.object?.objectId?.replaceAll(".", "-")}-${input.node.name}`;
  const onAutoComplete = async (e) => {
    if (!(e.target instanceof UI2.TextPrompt.TextPromptElement)) {
      return;
    }
    input.onAutoComplete(e.detail.expression, e.detail.filter, e.detail.force);
  };
  const nameClasses = classMap({
    name: true,
    "object-properties-section-dimmed": !property.enumerable,
    "own-property": property.isOwn,
    "synthetic-property": property.synthetic
  });
  const quotedName = /^\s|\s$|^$|\n/.test(property.name) ? `"${property.name.replace(/\n/g, "\u21B5")}"` : property.name;
  const isExpandable = !isInternalEntries && property.value && !property.wasThrown && property.value.hasChildren && !property.value.customPreview() && property.value.subtype !== "node" && property.value.type !== "function" && (property.value.type !== "object" || property.value.preview);
  const search = input.search;
  const entries = search?.getResults(input.node);
  const currentMatch = search?.currentMatch();
  const isCurrentNode = currentMatch?.node === input.node;
  const nameCurrent = isCurrentNode && currentMatch?.matchType === "name" ? currentMatch.range.cssValue() : "";
  const valueCurrent = isCurrentNode && currentMatch?.matchType === "value" ? currentMatch.range.cssValue() : "";
  const nameRanges = (entries ?? []).filter((e) => e !== currentMatch && e.matchType === "name").map((e) => e.range.cssValue()).join(" ");
  const valueRanges = (entries ?? []).filter((e) => e !== currentMatch && e.matchType === "value").map((e) => e.range.cssValue()).join(" ");
  const value = () => {
    const valueRef = ref((e) => {
      output.valueElement = e;
    });
    if (isInternalEntries) {
      return html2`<span ${valueRef} class=value></span>`;
    }
    if (property.value) {
      const showPreview = property.name !== "[[Prototype]]";
      return renderPropertyValue(
        property.value,
        property.wasThrown,
        showPreview,
        input.linkifier,
        property.synthetic,
        input.node.path,
        input.node.includeNullOrUndefinedValues,
        /* useCustomPreview */
        true,
        (e) => {
          output.valueElement = e;
        }
      );
    }
    if (property.getter) {
      const getter = property.getter;
      const invokeGetter = (event) => {
        event.consume();
        input.invokeGetter(getter);
      };
      return html2`<span ${valueRef}><span
        class=object-value-calculate-value-button
        title=${i18nString2(UIStrings2.invokePropertyGetter)}
        @click=${invokeGetter}
        >${i18nString2(UIStrings2.dots)}</span></span>`;
    }
    return html2`<span ${valueRef}
        class=object-value-unavailable
        title=${i18nString2(UIStrings2.valueNotAccessibleToTheDebugger)}>${i18nString2(UIStrings2.valueUnavailable)}</span>`;
  };
  const onActivate = (event) => {
    if (event instanceof KeyboardEvent && !Platform2.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      return;
    }
    event.consume(true);
    if (input.editable && property.value && !property.value.customPreview() && (property.writable || property.setter)) {
      input.startEditing();
    }
  };
  render2(
    html2`<span class=name-and-value><span
          ${ref((e) => {
      output.nameElement = e;
    })}
          class=${nameClasses}
          title=${input.node.path}><devtools-highlight ranges=${nameRanges} current-range=${nameCurrent}>${property.private ? html2`<span class="private-property-hash">${property.name[0]}</span>${property.name.substring(1)}` : quotedName}</devtools-highlight></span>${isInternalEntries ? nothing2 : html2`<span class='separator'>: </span><devtools-prompt
                @commit=${(e) => input.editingCommitted(e.detail)}
                @cancel=${() => input.editingEnded()}
                @beforeautocomplete=${onAutoComplete}
                @dblclick=${onActivate}
                @keydown=${onActivate}
                completions=${completionsId}
                placeholder=${i18nString2(UIStrings2.stringIsTooLargeToEdit)}
                ?editing=${input.editing}>
                  <devtools-highlight ranges=${valueRanges} current-range=${valueCurrent}>${input.expanded && isExpandable && property.value ? html2`<span
                      class="value object-value-${property.value.subtype || property.value.type}"
                      title=${ifDefined2(property.value.description)}>${property.value.description === "Object" ? "" : Platform2.StringUtilities.trimMiddle(
      property.value.description ?? "",
      maxRenderableStringLength
    )}${property.synthetic ? nothing2 : getMemoryIcon(property.value)}</span>` : value()}</devtools-highlight>
                  <datalist id=${completionsId}>${repeat2(input.completions, (c) => html2`<option>${c}</option>`)}</datalist>
                </devtools-prompt></span>`}</span>`,
    target
  );
};
var ObjectPropertyWidget = class extends UI2.Widget.Widget {
  #highlightChanges = [];
  #property;
  #nameElement;
  #valueElement;
  #completions = [];
  #editing = false;
  #view;
  #expanded = false;
  #linkifier;
  #editable = false;
  #search;
  constructor(target, view = OBJECT_PROPERTY_DEFAULT_VIEW) {
    super(target);
    this.#view = view;
  }
  get property() {
    return this.#property;
  }
  set property(property) {
    if (this.#property) {
      this.#property.removeEventListener("value-changed" /* VALUE_CHANGED */, this.requestUpdate, this);
      this.#property.removeEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
      this.#property.removeEventListener("filter-changed" /* FILTER_CHANGED */, this.requestUpdate, this);
    }
    this.#search?.removeEventListener(UI2.TreeOutline.TreeSearch.Events.SEARCH_CHANGED, this.requestUpdate, this);
    this.#property = property;
    this.#property.addEventListener("value-changed" /* VALUE_CHANGED */, this.requestUpdate, this);
    this.#property.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.requestUpdate, this);
    this.#property.addEventListener("filter-changed" /* FILTER_CHANGED */, this.requestUpdate, this);
    this.#search = property.search;
    this.#search?.addEventListener(UI2.TreeOutline.TreeSearch.Events.SEARCH_CHANGED, this.requestUpdate, this);
    this.requestUpdate();
  }
  get expanded() {
    return this.#expanded;
  }
  set expanded(expanded) {
    this.#expanded = expanded;
    this.requestUpdate();
  }
  get linkifier() {
    return this.#linkifier;
  }
  set linkifier(linkifier) {
    this.#linkifier = linkifier;
    this.requestUpdate();
  }
  get editable() {
    return this.#editable;
  }
  set editable(val) {
    this.#editable = val;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#property) {
      return;
    }
    const input = {
      editable: this.#editable,
      expanded: this.#expanded,
      editing: this.#editing,
      editingEnded: this.#editingEnded.bind(this),
      editingCommitted: this.#editingCommitted.bind(this),
      node: this.#property,
      linkifier: this.#linkifier,
      completions: this.#editing ? this.#completions : [],
      onAutoComplete: this.#updateCompletions.bind(this),
      invokeGetter: this.#invokeGetter.bind(this),
      startEditing: this.startEditing.bind(this),
      search: this.#search
    };
    const that = this;
    const output = {
      set nameElement(e) {
        that.#nameElement = e;
      },
      set valueElement(e) {
        that.#valueElement = e;
      }
    };
    this.#view(input, output, this.element);
  }
  setSearchRegex(regex, additionalCssClassName) {
    let cssClasses = Highlighting.highlightedSearchResultClassName;
    if (additionalCssClassName) {
      cssClasses += " " + additionalCssClassName;
    }
    this.revertHighlightChanges();
    if (this.#nameElement) {
      this.#applySearch(regex, this.#nameElement, cssClasses);
    }
    if (this.property?.object) {
      const valueType = this.property?.object.type;
      if (valueType !== "object" && this.#valueElement) {
        this.#applySearch(regex, this.#valueElement, cssClasses);
      }
    }
    return Boolean(this.#highlightChanges.length);
  }
  #applySearch(regex, element, cssClassName) {
    const ranges = [];
    const content = element.textContent || "";
    regex.lastIndex = 0;
    let match = regex.exec(content);
    while (match) {
      ranges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
      match = regex.exec(content);
    }
    if (ranges.length) {
      Highlighting.highlightRangesWithStyleClass(element, ranges, cssClassName, this.#highlightChanges);
    }
  }
  revertHighlightChanges() {
    Highlighting.revertDomChanges(this.#highlightChanges);
    this.#highlightChanges = [];
  }
  async #updateCompletions(expression, filter, force) {
    const suggestions = await TextEditor.JavaScript.completeInContext(expression, filter, force);
    this.#completions = suggestions.map((v) => v.text);
    this.requestUpdate();
  }
  get editing() {
    return this.#editing;
  }
  startEditing() {
    this.#editing = true;
    this.requestUpdate();
  }
  #editingEnded() {
    this.#completions = [];
    this.#editing = false;
    this.requestUpdate();
  }
  async #editingCommitted(newContent) {
    this.#editingEnded();
    await this.#property?.setValue(newContent);
  }
  #invokeGetter(getter) {
    void this.#property?.invokeGetter(getter);
  }
};
var ObjectPropertyTreeElement = class _ObjectPropertyTreeElement extends UI2.TreeOutline.TreeElement {
  property;
  toggleOnClick;
  linkifier;
  maxNumPropertiesToShow;
  #widget;
  constructor(property, linkifier) {
    super();
    this.#widget = new ObjectPropertyWidget();
    this.#widget.markAsRoot();
    this.property = property;
    this.hidden = property.isFiltered;
    this.property.addEventListener("value-changed" /* VALUE_CHANGED */, this.#updateValue, this);
    this.property.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.#updateChildren, this);
    this.property.addEventListener("filter-changed" /* FILTER_CHANGED */, this.#updateFilter, this);
    this.property.addEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.#onExpandedChanged, this);
    this.toggleOnClick = true;
    this.linkifier = linkifier;
    this.maxNumPropertiesToShow = InitialVisibleChildrenLimit;
    this.listItemElement.addEventListener("contextmenu", this.contextMenuFired.bind(this), false);
    this.listItemElement.dataset.objectPropertyNameForTest = property.name;
    this.updateExpandable();
    this.setExpandRecursively(property.name !== "[[Prototype]]");
    if (property.expanded) {
      this.expand();
    }
  }
  static async populate(treeElement, value, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
    await _ObjectPropertyTreeElement.populateChildrenIfNeeded(value);
    _ObjectPropertyTreeElement.populateImpl(
      treeElement,
      value,
      skipProto,
      skipGettersAndSetters,
      linkifier,
      emptyPlaceholder
    );
  }
  static async populateChildrenIfNeeded(value) {
    const children = await value.populateChildrenIfNeeded();
    await ArrayGroupingTreeElement.populateChildrenIfNeeded(children);
  }
  static populateImpl(treeElement, value, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
    for (const childNode of _ObjectPropertyTreeElement.createNodes(
      value,
      skipProto,
      skipGettersAndSetters,
      linkifier,
      emptyPlaceholder,
      (property) => treeElement instanceof _ObjectPropertyTreeElement && !isDisplayableProperty(property, treeElement.property?.property)
    )) {
      treeElement.appendChild(childNode);
    }
  }
  static *createNodes(value, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder, isNotDisplayablePropertyCallback) {
    const properties = value.children;
    if (!properties) {
      return;
    }
    if (properties.arrayRanges) {
      yield* ArrayGroupingTreeElement.createNodes(properties, linkifier, isNotDisplayablePropertyCallback);
    } else {
      yield* _ObjectPropertyTreeElement.createPropertyNodes(
        properties,
        skipProto,
        skipGettersAndSetters,
        linkifier,
        emptyPlaceholder,
        isNotDisplayablePropertyCallback
      );
    }
  }
  static *createPropertyNodes({ properties, internalProperties, accessors, arrayRanges }, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder, isNotDisplayablePropertyCallback) {
    let empty = true;
    if (arrayRanges && arrayRanges.length > 0) {
      empty = false;
    }
    const sortPropertiesAlphabetically = properties?.[0]?.parent?.sortPropertiesAlphabetically ?? true;
    properties?.sort((a, b) => compareProperties(a, b, sortPropertiesAlphabetically));
    const entriesProperty = internalProperties?.find(({ property }) => property.name === "[[Entries]]");
    if (entriesProperty) {
      const treeElement = new _ObjectPropertyTreeElement(entriesProperty, linkifier);
      treeElement.setExpandable(true);
      treeElement.expand();
      empty = false;
      yield treeElement;
    }
    for (const property of properties ?? []) {
      if (isNotDisplayablePropertyCallback?.(property.property)) {
        continue;
      }
      const canShowProperty = property.property.getter || !property.property.isAccessorProperty();
      if (canShowProperty) {
        const element = new _ObjectPropertyTreeElement(property, linkifier);
        if (property.property.name === "memories" && property.object?.className === "Memories") {
          element.updateExpandable();
          if (element.isExpandable()) {
            element.expand();
          }
        }
        empty = false;
        yield element;
      }
    }
    for (const accessor of accessors ?? []) {
      yield new _ObjectPropertyTreeElement(accessor, linkifier);
    }
    for (const property of internalProperties ?? []) {
      const treeElement = new _ObjectPropertyTreeElement(property, linkifier);
      if (property.property.name === "[[Entries]]") {
        continue;
      }
      if (property.property.name === "[[Prototype]]" && skipProto) {
        continue;
      }
      empty = false;
      yield treeElement;
    }
    if (empty) {
      const title = document.createElement("div");
      title.classList.add("gray-info-message");
      title.textContent = emptyPlaceholder || i18nString2(UIStrings2.noProperties);
      const infoElement = new UI2.TreeOutline.TreeElement(title);
      yield infoElement;
    }
  }
  static populateWithProperties(treeNode, children, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
    for (const childNode of this.createPropertyNodes(
      children,
      skipProto,
      skipGettersAndSetters,
      linkifier,
      emptyPlaceholder,
      (property) => treeNode instanceof _ObjectPropertyTreeElement && !isDisplayableProperty(property, treeNode.property?.property)
    )) {
      treeNode.appendChild(childNode);
    }
  }
  revertHighlightChanges() {
    this.#widget.revertHighlightChanges();
  }
  setSearchRegex(regex, additionalCssClassName) {
    return this.#widget.setSearchRegex(regex, additionalCssClassName);
  }
  // This is called by layout tests
  startEditing() {
    this.#widget.startEditing();
  }
  // This is called by layout tests
  get editing() {
    return this.#widget.editing;
  }
  get editable() {
    return this.#widget.editable;
  }
  set editable(val) {
    this.#widget.editable = val;
  }
  // This is called by layout tests
  async applyExpression(expression) {
    await this.property.setValue(expression);
  }
  showAllPropertiesElementSelected(element) {
    this.removeChild(element);
    this.children().forEach((x) => {
      x.hidden = false;
    });
    return false;
  }
  createShowAllPropertiesButton() {
    const element = document.createElement("div");
    element.classList.add("object-value-calculate-value-button");
    element.textContent = i18nString2(UIStrings2.dots);
    UI2.Tooltip.Tooltip.install(element, i18nString2(UIStrings2.showAllD, { PH1: this.childCount() }));
    const children = this.children();
    for (let i = this.maxNumPropertiesToShow; i < this.childCount(); ++i) {
      children[i].hidden = true;
    }
    const showAllPropertiesButton = new UI2.TreeOutline.TreeElement(element);
    showAllPropertiesButton.onselect = this.showAllPropertiesElementSelected.bind(this, showAllPropertiesButton);
    this.appendChild(showAllPropertiesButton);
  }
  async onpopulate() {
    this.removeChildren();
    if (this.property.object) {
      await _ObjectPropertyTreeElement.populate(this, this.property, false, false, this.linkifier);
      if (this.childCount() > this.maxNumPropertiesToShow) {
        this.createShowAllPropertiesButton();
      }
    }
  }
  onattach() {
    this.updateExpandable();
    this.#widget.show(this.listItemElement);
    this.#widget.property = this.property;
    this.#widget.linkifier = this.linkifier;
    this.#widget.editable = !this.property.readOnly;
  }
  onexpand() {
    this.property.expanded = true;
    this.#widget.expanded = true;
  }
  oncollapse() {
    this.property.expanded = false;
    this.#widget.expanded = false;
  }
  #updateValue() {
    this.updateExpandable();
  }
  #updateChildren() {
    this.removeChildren();
    void this.onpopulate();
  }
  #updateFilter() {
    this.hidden = this.property.isFiltered;
  }
  #onExpandedChanged(event) {
    const expanded = event.data;
    if (expanded) {
      this.expand();
    } else {
      this.collapse();
    }
  }
  getContextMenu(event) {
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this);
    if (this.property.property.symbol) {
      contextMenu.appendApplicableItems(this.property.property.symbol);
    }
    if (this.property.object) {
      contextMenu.appendApplicableItems(this.property.object);
      if (this.property.parent?.object instanceof SDK3.RemoteObject.LocalJSONObject) {
        const { object: { value } } = this.property;
        const propertyValue = typeof value === "object" ? Platform2.StringUtilities.escapeUnicodeAsText(JSON.stringify(value, null, 2)) : value;
        const copyValueHandler = () => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyValue);
        };
        contextMenu.clipboardSection().appendItem(
          i18nString2(UIStrings2.copyValue),
          copyValueHandler,
          { jslogContext: "copy-value" }
        );
      }
    }
    if (!this.property.property.synthetic && this.property.path) {
      const copyPathHandler = Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        this.property.path
      );
      contextMenu.clipboardSection().appendItem(
        i18nString2(UIStrings2.copyPropertyPath),
        copyPathHandler,
        { jslogContext: "copy-property-path" }
      );
    }
    if (this.property.parent?.object instanceof SDK3.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
        i18nString2(UIStrings2.expandRecursively),
        this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH),
        { jslogContext: "expand-recursively" }
      );
      contextMenu.viewSection().appendItem(
        i18nString2(UIStrings2.collapseChildren),
        this.collapseChildren.bind(this),
        { jslogContext: "collapse-children" }
      );
    }
    let root = this.property;
    while (root.parent) {
      root = root.parent;
    }
    if (!root.isWasm) {
      contextMenu.viewSection().appendCheckboxItem(i18nString2(UIStrings2.sortPropertiesAlphabetically), () => {
        root.sortPropertiesAlphabetically = !root.sortPropertiesAlphabetically;
      }, {
        checked: root.sortPropertiesAlphabetically,
        jslogContext: "sort-properties-alphabetically"
      });
    }
    contextMenu.viewSection().appendCheckboxItem(i18nString2(UIStrings2.showAll), () => {
      root.includeNullOrUndefinedValues = !root.includeNullOrUndefinedValues;
    }, { checked: root.includeNullOrUndefinedValues, jslogContext: "show-all" });
    return contextMenu;
  }
  contextMenuFired(event) {
    const contextMenu = this.getContextMenu(event);
    void contextMenu.show();
  }
  updateExpandable() {
    if (this.property.object) {
      this.setExpandable(
        !this.property.object.customPreview() && this.property.object.hasChildren && !this.property.property.wasThrown
      );
    } else {
      this.setExpandable(false);
    }
  }
  path() {
    return this.property.path;
  }
};
async function arrayRangeGroups(object, fromIndex, toIndex) {
  return await object.callFunctionJSON(packArrayRanges, [
    { value: fromIndex },
    { value: toIndex },
    { value: ArrayGroupingTreeElement.bucketThreshold },
    { value: ArrayGroupingTreeElement.sparseIterationThreshold }
  ]);
  function packArrayRanges(fromIndex2, toIndex2, bucketThreshold, sparseIterationThreshold) {
    if (fromIndex2 === void 0 || toIndex2 === void 0 || sparseIterationThreshold === void 0 || bucketThreshold === void 0) {
      return;
    }
    let ownPropertyNames = null;
    const consecutiveRange = toIndex2 - fromIndex2 >= sparseIterationThreshold && ArrayBuffer.isView(this);
    function* arrayIndexes(object2) {
      if (fromIndex2 === void 0 || toIndex2 === void 0 || sparseIterationThreshold === void 0) {
        return;
      }
      if (toIndex2 - fromIndex2 < sparseIterationThreshold) {
        for (let i = fromIndex2; i <= toIndex2; ++i) {
          if (i in object2) {
            yield i;
          }
        }
      } else {
        ownPropertyNames = ownPropertyNames || Object.getOwnPropertyNames(object2);
        for (let i = 0; i < ownPropertyNames.length; ++i) {
          const name = ownPropertyNames[i];
          const index = Number(name) >>> 0;
          if (String(index) === name && fromIndex2 <= index && index <= toIndex2) {
            yield index;
          }
        }
      }
    }
    let count = 0;
    if (consecutiveRange) {
      count = toIndex2 - fromIndex2 + 1;
    } else {
      for (const ignored of arrayIndexes(this)) {
        ++count;
      }
    }
    let bucketSize = count;
    if (count <= bucketThreshold) {
      bucketSize = count;
    } else {
      bucketSize = Math.pow(bucketThreshold, Math.ceil(Math.log(count) / Math.log(bucketThreshold)) - 1);
    }
    const ranges = [];
    if (consecutiveRange) {
      for (let i = fromIndex2; i <= toIndex2; i += bucketSize) {
        const groupStart = i;
        let groupEnd = groupStart + bucketSize - 1;
        if (groupEnd > toIndex2) {
          groupEnd = toIndex2;
        }
        ranges.push([groupStart, groupEnd, groupEnd - groupStart + 1]);
      }
    } else {
      count = 0;
      let groupStart = -1;
      let groupEnd = 0;
      for (const i of arrayIndexes(this)) {
        if (groupStart === -1) {
          groupStart = i;
        }
        groupEnd = i;
        if (++count === bucketSize) {
          ranges.push([groupStart, groupEnd, count]);
          count = 0;
          groupStart = -1;
        }
      }
      if (count > 0) {
        ranges.push([groupStart, groupEnd, count]);
      }
    }
    return { ranges };
  }
}
function buildArrayFragment(fromIndex, toIndex, sparseIterationThreshold) {
  const result = /* @__PURE__ */ Object.create(null);
  if (fromIndex === void 0 || toIndex === void 0 || sparseIterationThreshold === void 0) {
    return;
  }
  if (toIndex - fromIndex < sparseIterationThreshold) {
    for (let i = fromIndex; i <= toIndex; ++i) {
      if (i in this) {
        result[i] = this[i];
      }
    }
  } else {
    const ownPropertyNames = Object.getOwnPropertyNames(this);
    for (let i = 0; i < ownPropertyNames.length; ++i) {
      const name = ownPropertyNames[i];
      const index = Number(name) >>> 0;
      if (String(index) === name && fromIndex <= index && index <= toIndex) {
        result[index] = this[index];
      }
    }
  }
  return result;
}
var ArrayGroupingTreeElement = class _ArrayGroupingTreeElement extends UI2.TreeOutline.TreeElement {
  toggleOnClick;
  linkifier;
  #child;
  constructor(child, linkifier) {
    super(Platform2.StringUtilities.sprintf("[%d \u2026 %d]", child.range.fromIndex, child.range.toIndex), true);
    this.#child = child;
    this.#child.addEventListener("children-changed" /* CHILDREN_CHANGED */, this.onpopulate, this);
    this.#child.addEventListener("expanded-changed" /* EXPANDED_CHANGED */, this.#onExpandedChanged, this);
    this.toggleOnClick = true;
    this.linkifier = linkifier;
    if (child.expanded) {
      this.expand();
    }
  }
  #onExpandedChanged(event) {
    const expanded = event.data;
    if (expanded) {
      this.expand();
    } else {
      this.collapse();
    }
  }
  static *createNodes(children, linkifier, isNotDisplayablePropertyCallback) {
    if (!children.arrayRanges) {
      return;
    }
    if (children.arrayRanges.length === 1) {
      yield* ObjectPropertyTreeElement.createNodes(
        children.arrayRanges[0],
        false,
        false,
        linkifier,
        null,
        isNotDisplayablePropertyCallback
      );
    } else {
      for (const child of children.arrayRanges) {
        if (child.singular) {
          yield* ObjectPropertyTreeElement.createNodes(
            child,
            false,
            false,
            linkifier,
            null,
            isNotDisplayablePropertyCallback
          );
        } else {
          yield new _ArrayGroupingTreeElement(child, linkifier);
        }
      }
    }
    yield* ObjectPropertyTreeElement.createPropertyNodes(
      children,
      false,
      false,
      linkifier,
      null,
      isNotDisplayablePropertyCallback
    );
  }
  static async populateChildrenIfNeeded(children) {
    if (!children.arrayRanges) {
      return;
    }
    if (children.arrayRanges.length === 1) {
      await ObjectPropertyTreeElement.populateChildrenIfNeeded(children.arrayRanges[0]);
    } else {
      await Promise.all(children.arrayRanges.filter((child) => child.singular).map((child) => ObjectPropertyTreeElement.populateChildrenIfNeeded(child)));
    }
  }
  onexpand() {
    this.#child.expanded = true;
  }
  oncollapse() {
    this.#child.expanded = false;
  }
  async onpopulate() {
    this.removeChildren();
    await ObjectPropertyTreeElement.populate(this, this.#child, false, false, this.linkifier);
  }
  onattach() {
    this.listItemElement.classList.add("object-properties-section-name");
  }
  // These should be module constants but they are modified by layout tests.
  static bucketThreshold = 100;
  static sparseIterationThreshold = 25e4;
};
var EXPANDABLE_TEXT_DEFAULT_VIEW = (input, output, target) => {
  const totalBytesText = i18n3.ByteUtilities.bytesToString(input.byteCount);
  const canExpand = input.text.length < ExpandableTextPropertyValue.MAX_DISPLAYABLE_TEXT_LENGTH;
  const onContextMenu = (e) => {
    const { target: target2 } = e;
    if (!(target2 instanceof Element)) {
      return;
    }
    const listItem = target2.closest("li");
    const element = listItem && UI2.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
    if (!(element instanceof ObjectPropertyTreeElement)) {
      return;
    }
    const contextMenu = element.getContextMenu(e);
    if (canExpand && !input.expanded) {
      contextMenu.clipboardSection().appendItem(
        i18nString2(UIStrings2.showMoreS, { PH1: totalBytesText }),
        input.expandText,
        { jslogContext: "show-more" }
      );
    }
    contextMenu.clipboardSection().appendItem(i18nString2(UIStrings2.copy), input.copyText, { jslogContext: "copy" });
    void contextMenu.show();
    e.consume(true);
  };
  const croppedText = input.text.slice(0, input.maxLength);
  render2(
    // clang-format off
    html2`<span title=${croppedText + "\u2026"} @contextmenu=${onContextMenu}>
               ${input.expanded ? input.text : croppedText}
               <button
                 ?hidden=${input.expanded}
                 @click=${canExpand ? input.expandText : void 0}
                 jslog=${ifDefined2(canExpand ? VisualLogging.action("expand").track({ click: true }) : void 0)}
                 class=${canExpand ? "expandable-inline-button" : "undisplayable-text"}
                 data-text=${canExpand ? i18nString2(UIStrings2.showMoreS, { PH1: totalBytesText }) : i18nString2(UIStrings2.longTextWasTruncatedS, { PH1: totalBytesText })}
                 ></button>
               <button
                 class=expandable-inline-button
                 @click=${input.copyText}
                 data-text=${i18nString2(UIStrings2.copy)}
                 jslog=${VisualLogging.action("copy").track({ click: true })}
                 ></button>
              </span>`,
    // clang-format on
    target
  );
};
var ExpandableTextPropertyValue = class _ExpandableTextPropertyValue extends UI2.Widget.Widget {
  static MAX_DISPLAYABLE_TEXT_LENGTH = 1e7;
  static EXPANDABLE_MAX_LENGTH = 50;
  #text = "";
  #byteCount = 0;
  #expanded = false;
  #maxLength = _ExpandableTextPropertyValue.EXPANDABLE_MAX_LENGTH;
  #view;
  constructor(target, view = EXPANDABLE_TEXT_DEFAULT_VIEW) {
    super(target);
    this.#view = view;
  }
  set text(text) {
    this.#text = text;
    this.#byteCount = Platform2.StringUtilities.countWtf8Bytes(text);
    this.requestUpdate();
  }
  set maxLength(maxLength) {
    this.#maxLength = maxLength;
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      copyText: () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#text),
      expandText: () => {
        if (!this.#expanded) {
          this.#expanded = true;
          this.requestUpdate();
        }
      },
      expanded: this.#expanded,
      byteCount: this.#byteCount,
      maxLength: this.#maxLength,
      text: this.#text
    };
    this.#view(input, {}, this.contentElement);
  }
};

// ../../front_end/ui/legacy/components/object_ui/CustomPreviewComponent.ts
var UIStrings3 = {
  /**
   * @description Context menu item to show a custom formatted object as a standard JavaScript object.
   */
  showAsJavascriptObject: "Show as JavaScript object"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/object_ui/CustomPreviewComponent.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var CustomPreviewSection = class extends UI3.Widget.Widget {
  #object;
  #expanded = false;
  cachedContent;
  headerJsonML;
  view;
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.view = view;
  }
  get object() {
    return this.#object;
  }
  set object(object) {
    if (this.#object === object) {
      return;
    }
    this.#object = object;
    this.headerJsonML = void 0;
    this.cachedContent = void 0;
    this.#expanded = false;
    this.parseHeader();
    this.performUpdate();
  }
  get expanded() {
    return this.#expanded;
  }
  set expanded(expanded) {
    if (this.#expanded === expanded) {
      return;
    }
    this.#expanded = expanded;
    if (this.#expanded && !this.cachedContent) {
      void this.loadBody();
    }
    this.performUpdate();
  }
  parseHeader() {
    const customPreview = this.#object?.customPreview();
    if (!customPreview) {
      return;
    }
    try {
      this.headerJsonML = JSON.parse(customPreview.header);
    } catch (e) {
      Common3.Console.Console.instance().error("Broken formatter: header is invalid json " + e);
    }
  }
  performUpdate() {
    this.view(
      {
        object: this.#object,
        headerJsonML: this.headerJsonML,
        expanded: this.#expanded,
        cachedContent: this.cachedContent,
        toggleExpanded: this.toggleExpanded
      },
      void 0,
      this.contentElement
    );
  }
  toggleExpanded = () => {
    this.expanded = !this.expanded;
  };
  async loadBody() {
    const customPreview = this.#object?.customPreview();
    if (!this.#object || !customPreview?.bodyGetterId) {
      return;
    }
    const bodyJsonML = await this.#object.callFunctionJSON((bodyGetter) => bodyGetter(), [{ objectId: customPreview.bodyGetterId }]);
    if (bodyJsonML === null) {
      const objectTree = new ObjectTree(this.#object, {
        readOnly: true,
        propertiesMode: 1 /* OWN_AND_INTERNAL_AND_INHERITED */
      });
      objectTree.expanded = true;
      this.cachedContent = objectTree;
    } else {
      this.cachedContent = bodyJsonML;
    }
    this.performUpdate();
  }
};
var ALLOWED_TAGS = ["span", "div", "ol", "li", "table", "tr", "td"];
var remoteObjectCache = /* @__PURE__ */ new WeakMap();
var DEFAULT_VIEW = (input, _output, target) => {
  const renderJSONMLTag = (object2, jsonML) => {
    if (!Array.isArray(jsonML)) {
      return html3`${String(jsonML)}`;
    }
    if (jsonML[0] !== "object") {
      return renderElement(object2, jsonML);
    }
    if (jsonML.length !== 2) {
      Common3.Console.Console.instance().error("Broken formatter: object reference must contain exactly two elements");
      return html3`<span></span>`;
    }
    return layoutObjectTag(object2, jsonML);
  };
  const renderElement = (object2, jsonML) => {
    const it = jsonML[Symbol.iterator]();
    const tagName = it.next().value;
    if (!ALLOWED_TAGS.includes(tagName)) {
      Common3.Console.Console.instance().error("Broken formatter: element " + tagName + " is not allowed!");
      return html3`<span></span>`;
    }
    let next = it.next();
    const stylePropertyMap = {};
    if (typeof next.value === "object" && !Array.isArray(next.value) && next.value !== null) {
      const attributes = next.value;
      for (const key in attributes) {
        const value = attributes[key];
        if (key !== "style" || typeof value !== "string") {
          continue;
        }
        const sanitizedStyle = /* @__PURE__ */ new Map();
        sanitizeStyle(sanitizedStyle, value);
        for (const [property, { value: propertyValue, priority }] of sanitizedStyle) {
          stylePropertyMap[property] = priority ? `${propertyValue} !${priority}` : propertyValue;
        }
      }
      next = it.next();
    }
    const children = [];
    while (!next.done) {
      children.push(renderJSONMLTag(object2, next.value));
      next = it.next();
    }
    const style = Directives3.styleMap(stylePropertyMap);
    switch (tagName) {
      case "span":
        return html3`<span style=${style}>${children}</span>`;
      case "div":
        return html3`<div style=${style}>${children}</div>`;
      case "ol":
        return html3`<ol style=${style}>${children}</ol>`;
      case "li":
        return html3`<li style=${style}>${children}</li>`;
      case "table":
        return html3`<table style=${style}>${children}</table>`;
      case "tr":
        return html3`<tr style=${style}>${children}</tr>`;
      case "td":
        return html3`<td style=${style}>${children}</td>`;
      default:
        return html3`<span>${children}</span>`;
    }
  };
  const layoutObjectTag = (object2, objectTag) => {
    const it = objectTag[Symbol.iterator]();
    it.next();
    const attributes = it.next().value;
    let remoteObject = typeof attributes === "object" && attributes !== null ? remoteObjectCache.get(attributes) : void 0;
    if (!remoteObject) {
      remoteObject = object2.runtimeModel().createRemoteObject(attributes);
      if (typeof attributes === "object" && attributes !== null) {
        remoteObjectCache.set(attributes, remoteObject);
      }
    }
    if (remoteObject.customPreview()) {
      return html3`${UI3.Widget.widget(CustomPreviewSection, { object: remoteObject })}`;
    }
    return defaultObjectPresentation(
      remoteObject,
      void 0,
      void 0,
      void 0,
      { "custom-expandable-section-standard-section": remoteObject.hasChildren }
    );
  };
  const onClick = (event) => {
    event.consume(true);
    input.toggleExpanded();
  };
  const object = input.object;
  const customPreview = object?.customPreview();
  if (!object || !customPreview || !input.headerJsonML) {
    render3(nothing3, target);
    return;
  }
  const headerTemplate = renderJSONMLTag(object, input.headerJsonML);
  if (customPreview.bodyGetterId) {
    let bodyContent;
    if (input.cachedContent instanceof ObjectTree) {
      bodyContent = html3`<devtools-widget class="custom-expandable-section-default-body" ${UI3.Widget.widget(ObjectPropertiesSectionWidget, {
        objectTree: input.cachedContent,
        showOverflow: false
      })}></devtools-widget>`;
    } else if (input.cachedContent) {
      bodyContent = renderJSONMLTag(object, input.cachedContent);
    }
    render3(
      html3`
      <span class=${Directives3.classMap({
        "custom-expandable-section-header": true,
        expanded: input.expanded
      })} @click=${onClick}>
        <devtools-icon name=${input.expanded ? "triangle-down" : "triangle-right"} class="custom-expand-icon"></devtools-icon>
        ${headerTemplate}
      </span>
      ${bodyContent ? html3`<span class="custom-expandable-section-body" ?hidden=${!input.expanded}>${bodyContent}</span>` : nothing3}
    `,
      target,
      { container: { classes: ["custom-expandable-section"] } }
    );
  } else {
    render3(html3`${headerTemplate}`, target, { container: { classes: ["custom-expandable-section"] } });
  }
};
var CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW = (input, _output, target) => {
  if (!input.object) {
    render3(nothing3, target);
    return;
  }
  render3(
    html3`<style>${customPreviewComponent_css_default}</style>${input.disassembled ? defaultObjectPresentation(input.object) : UI3.Widget.widget(CustomPreviewSection, { object: input.object, expanded: input.expanded })}`,
    target,
    {
      container: {
        classes: ["source-code"],
        listeners: { contextmenu: input.onContextMenu }
      }
    }
  );
};
var CustomPreviewComponent = class extends UI3.Widget.Widget {
  #object;
  #expanded = false;
  #disassembled = false;
  #view;
  constructor(element, view = CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW) {
    super(element, { useShadowDom: "pure" });
    this.#view = view;
  }
  get object() {
    return this.#object;
  }
  set object(object) {
    if (this.#object === object) {
      return;
    }
    this.#object = object;
    this.#disassembled = false;
    this.performUpdate();
  }
  get expanded() {
    return this.#expanded;
  }
  set expanded(expanded) {
    if (this.#expanded === expanded) {
      return;
    }
    this.#expanded = expanded;
    this.performUpdate();
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    this.#view(
      {
        object: this.#object,
        expanded: this.#expanded,
        disassembled: this.#disassembled,
        onContextMenu: this.#onContextMenu
      },
      void 0,
      this.contentElement
    );
  }
  #onContextMenu = (event) => {
    const contextMenu = new UI3.ContextMenu.ContextMenu(event);
    if (!this.#disassembled) {
      contextMenu.revealSection().appendItem(
        i18nString3(UIStrings3.showAsJavascriptObject),
        this.#disassemble.bind(this),
        { jslogContext: "show-as-javascript-object" }
      );
    }
    if (this.#object) {
      contextMenu.appendApplicableItems(this.#object);
    }
    void contextMenu.show();
  };
  #disassemble() {
    this.#disassembled = true;
    this.requestUpdate();
  }
};

// ../../front_end/ui/legacy/components/object_ui/ObjectPopoverHelper.ts
var ObjectPopoverHelper_exports = {};
__export(ObjectPopoverHelper_exports, {
  ObjectPopoverHelper: () => ObjectPopoverHelper
});
import * as i18n7 from "../../../../core/i18n/i18n.js";
import * as Platform3 from "../../../../core/platform/platform.js";
import * as SDK4 from "../../../../core/sdk/sdk.js";
import * as Geometry from "../../../../models/geometry/geometry.js";
import { Link } from "../../../kit/kit.js";
import { render as render4 } from "../../../lit/lit.js";
import * as UI4 from "../../legacy.js";
import * as Components from "../utils/utils.js";

// gen/front_end/ui/legacy/components/object_ui/objectPopover.css.js
var objectPopover_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.widget:has(.object-popover-tree) {
  padding: 0;
  border-radius: var(--sys-shape-corner-extra-small);
}

.object-popover-content {
  display: flex;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  flex-direction: column;
}

.object-popover-title {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  font-weight: bold;
  padding-left: 18px;
  padding-bottom: var(--sys-size-2);
  padding-top: var(--sys-size-3);
  flex-shrink: 0;
}

.object-popover-tree {
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
  overflow: auto;
  width: 100%;
  height: calc(100% - 13px);
}

.object-popover-container {
  display: inline-block;
}

.object-popover-description-box {
  padding: var(--sys-size-4);
  max-width: 350px;
  line-height: 1.4;
}

.object-popover-footer {
  margin-top: var(--sys-size-5);
}

/*# sourceURL=${import.meta.resolve("./objectPopover.css")} */`;

// ../../front_end/ui/legacy/components/object_ui/ObjectPopoverHelper.ts
var UIStrings4 = {
  /**
   * @description Link text for opening documentation in an object popover.
   */
  learnMore: "Learn more"
};
var str_4 = i18n7.i18n.registerUIStrings("ui/legacy/components/object_ui/ObjectPopoverHelper.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var ObjectPopoverHelper = class _ObjectPopoverHelper {
  linkifier;
  resultHighlightedAsDOM;
  constructor(linkifier, resultHighlightedAsDOM) {
    this.linkifier = linkifier;
    this.resultHighlightedAsDOM = resultHighlightedAsDOM;
  }
  dispose() {
    if (this.resultHighlightedAsDOM) {
      SDK4.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK4.TargetManager.TargetManager.instance());
    }
    if (this.linkifier) {
      this.linkifier.dispose();
    }
  }
  static async buildObjectPopover(result, popover) {
    const description = Platform3.StringUtilities.trimEndWithMaxLength(result.description || "", MaxPopoverTextLength);
    let popoverContentElement = null;
    if (result.type === "function" || result.type === "object") {
      let linkifier = null;
      let resultHighlightedAsDOM = false;
      if (result.subtype === "node") {
        SDK4.OverlayModel.OverlayModel.highlightObjectAsDOMNode(result);
        resultHighlightedAsDOM = true;
      }
      popover.setMaxContentSize(new Geometry.Size(300, 250));
      popover.setSizeBehavior(UI4.GlassPane.SizeBehavior.SET_EXACT_SIZE);
      if (result.customPreview()) {
        const customPreviewComponent = new CustomPreviewComponent();
        customPreviewComponent.object = result;
        customPreviewComponent.expanded = true;
        customPreviewComponent.element.dataset.stableNameForTest = "object-popover-content";
        customPreviewComponent.show(popover.contentElement);
      } else {
        popoverContentElement = document.createElement("div");
        popoverContentElement.classList.add("object-popover-content");
        popover.registerRequiredCSS(objectValue_css_default, objectPopover_css_default);
        const titleElement = popoverContentElement.createChild("div", "object-popover-title");
        if (result.type === "function") {
          titleElement.classList.add("source-code");
          render4(valueElementForFunctionDescription(result.description), titleElement);
        } else {
          titleElement.classList.add("monospace");
          titleElement.createChild("span").textContent = description;
        }
        linkifier = new Components.Linkifier.Linkifier();
        const section = new ObjectPropertiesSectionWidget();
        section.element.classList.add("object-popover-tree");
        section.root = result;
        if (section.objectTree) {
          section.objectTree.expanded = true;
        }
        section.linkifier = linkifier;
        section.showOverflow = true;
        section.show(popoverContentElement, null, true);
        popoverContentElement.dataset.stableNameForTest = "object-popover-content";
        popover.contentElement.appendChild(popoverContentElement);
      }
      return new _ObjectPopoverHelper(linkifier, resultHighlightedAsDOM);
    }
    popoverContentElement = document.createElement("span");
    popoverContentElement.dataset.stableNameForTest = "object-popover-content";
    popover.registerRequiredCSS(objectValue_css_default, objectPopover_css_default);
    const valueElement = popoverContentElement.createChild("span", "monospace object-value-" + result.type);
    valueElement.style.whiteSpace = "pre";
    if (result.type === "string") {
      UI4.UIUtils.createTextChildren(valueElement, `"${description}"`);
    } else {
      valueElement.textContent = description;
    }
    popover.contentElement.appendChild(popoverContentElement);
    return new _ObjectPopoverHelper(null, false);
  }
  static buildDescriptionPopover(description, link, popover) {
    const popoverContentElement = document.createElement("div");
    popoverContentElement.classList.add("object-popover-description-box");
    const descriptionDiv = document.createElement("div");
    descriptionDiv.dataset.stableNameForTest = "object-popover-content";
    popover.registerRequiredCSS(objectPopover_css_default);
    descriptionDiv.textContent = description;
    const learnMoreLink = Link.create(link, i18nString4(UIStrings4.learnMore), void 0, "learn-more");
    const footerDiv = document.createElement("div");
    footerDiv.classList.add("object-popover-footer");
    footerDiv.appendChild(learnMoreLink);
    popoverContentElement.appendChild(descriptionDiv);
    popoverContentElement.appendChild(footerDiv);
    popover.contentElement.appendChild(popoverContentElement);
    return new _ObjectPopoverHelper(null, false);
  }
};
var MaxPopoverTextLength = 1e4;
export {
  CSSStyleSanitizer_exports as CSSStyleSanitizer,
  CustomPreviewComponent_exports as CustomPreviewComponent,
  JavaScriptREPL_exports as JavaScriptREPL,
  ObjectPopoverHelper_exports as ObjectPopoverHelper,
  ObjectPropertiesSection_exports as ObjectPropertiesSection,
  RemoteObjectPreviewFormatter_exports as RemoteObjectPreviewFormatter
};
//# sourceMappingURL=object_ui.js.map
