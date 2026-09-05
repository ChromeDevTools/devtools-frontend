var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/emulation/DeviceModeModel.ts
var DeviceModeModel_exports = {};
__export(DeviceModeModel_exports, {
  DeviceModeModel: () => DeviceModeModel,
  Events: () => Events2,
  Insets: () => Insets,
  MaxDeviceNameLength: () => MaxDeviceNameLength,
  MaxDeviceScaleFactor: () => MaxDeviceScaleFactor,
  MaxDeviceSize: () => MaxDeviceSize,
  MinDeviceScaleFactor: () => MinDeviceScaleFactor,
  MinDeviceSize: () => MinDeviceSize,
  Rect: () => Rect,
  Type: () => Type2,
  UA: () => UA,
  defaultMobileScaleFactor: () => defaultMobileScaleFactor
});
import * as Common2 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n3 from "../../core/i18n/i18n.js";
import * as Platform from "../../core/platform/platform.js";
import * as Root2 from "../../core/root/root.js";
import * as SDK2 from "../../core/sdk/sdk.js";

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
((Runtime3) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime3.SerializationOptionsSerialization || (Runtime3.SerializationOptionsSerialization = {}));
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
  })(DeepSerializedValueType = Runtime3.DeepSerializedValueType || (Runtime3.DeepSerializedValueType = {}));
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
  })(RemoteObjectType = Runtime3.RemoteObjectType || (Runtime3.RemoteObjectType = {}));
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
  })(RemoteObjectSubtype = Runtime3.RemoteObjectSubtype || (Runtime3.RemoteObjectSubtype = {}));
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
  })(ObjectPreviewType = Runtime3.ObjectPreviewType || (Runtime3.ObjectPreviewType = {}));
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
  })(ObjectPreviewSubtype = Runtime3.ObjectPreviewSubtype || (Runtime3.ObjectPreviewSubtype = {}));
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
  })(PropertyPreviewType = Runtime3.PropertyPreviewType || (Runtime3.PropertyPreviewType = {}));
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
  })(PropertyPreviewSubtype = Runtime3.PropertyPreviewSubtype || (Runtime3.PropertyPreviewSubtype = {}));
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
  })(ConsoleAPICalledEventType = Runtime3.ConsoleAPICalledEventType || (Runtime3.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/models/emulation/DeviceModeModel.ts
import * as Geometry from "../geometry/geometry.js";

// ../../front_end/models/emulation/EmulatedDevices.ts
var EmulatedDevices_exports = {};
__export(EmulatedDevices_exports, {
  CATEGORY_ORDER: () => CATEGORY_ORDER,
  Capability: () => Capability,
  Category: () => Category,
  CutoutShape: () => CutoutShape,
  EmulatedDevice: () => EmulatedDevice,
  EmulatedDevicesList: () => EmulatedDevicesList,
  Events: () => Events,
  Horizontal: () => Horizontal,
  HorizontalSpanned: () => HorizontalSpanned,
  Type: () => Type,
  Vertical: () => Vertical,
  VerticalSpanned: () => VerticalSpanned,
  deviceCategory: () => deviceCategory,
  getCategoryTitle: () => getCategoryTitle
});
import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as Root from "../../core/root/root.js";
import * as SDK from "../../core/sdk/sdk.js";
var UIStrings = {
  /**
   * @description Title of the Laptop with touch device.
   */
  laptopWithTouch: "Laptop with touch",
  /**
   * @description Title of the Laptop with HiDPI screen device.
   */
  laptopWithHiDPIScreen: "Laptop with HiDPI screen",
  /**
   * @description Title of the Laptop with MDPI screen device.
   */
  laptopWithMDPIScreen: "Laptop with MDPI screen",
  /**
   * @description Label for mobile category in emulation devices.
   */
  mobileGroup: "Mobile",
  /**
   * @description Label for foldables category in emulation devices.
   */
  foldablesGroup: "Foldables",
  /**
   * @description Label for tablets and desktops category in emulation devices.
   */
  tabletsAndDesktopsGroup: "Tablets & Desktops",
  /**
   * @description Label for smart displays category in emulation devices.
   */
  smartDisplaysGroup: "Smart Displays"
};
var str_ = i18n.i18n.registerUIStrings("models/emulation/EmulatedDevices.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var EmulatedDevice = class _EmulatedDevice {
  title = "";
  type = "unknown" /* Unknown */;
  order;
  vertical = { width: 0, height: 0, hinge: null };
  horizontal = { width: 0, height: 0, hinge: null };
  deviceScaleFactor = 1;
  capabilities = ["touch" /* TOUCH */, "mobile" /* MOBILE */];
  userAgent = "";
  userAgentMetadata = null;
  modes = [];
  isDualScreen = false;
  isFoldableScreen = false;
  verticalSpanned = { width: 0, height: 0, hinge: null };
  horizontalSpanned = { width: 0, height: 0, hinge: null };
  #show = "Default" /* Default */;
  #showByDefault = true;
  static fromJSONV1(json) {
    try {
      let parseValue = function(object, key, type2, defaultValue) {
        if (typeof object !== "object" || object === null || !object.hasOwnProperty(key)) {
          if (typeof defaultValue !== "undefined") {
            return defaultValue;
          }
          throw new Error("Emulated device is missing required property '" + key + "'");
        }
        const value = object[key];
        if (typeof value !== type2 || value === null) {
          throw new Error("Emulated device property '" + key + "' has wrong type '" + typeof value + "'");
        }
        return value;
      }, parseIntValue = function(object, key) {
        const value = parseValue(object, key, "number");
        if (value !== Math.abs(value)) {
          throw new Error("Emulated device value '" + key + "' must be integer");
        }
        return value;
      }, parseInsets = function(json2) {
        return new Insets(
          parseIntValue(json2, "left"),
          parseIntValue(json2, "top"),
          parseIntValue(json2, "right"),
          parseIntValue(json2, "bottom")
        );
      }, parseCutoutShape = function(json2) {
        const shape = parseValue(json2, "shape", "string");
        if (shape !== "pill" /* PILL */ && shape !== "notch" /* NOTCH */ && shape !== "circle" /* CIRCLE */ && shape !== "rectangle" /* RECTANGLE */) {
          throw new Error("Emulated device mode has unsupported cutout shape: " + shape);
        }
        return shape;
      }, parseRGBA = function(json2) {
        const result2 = {};
        result2.r = parseIntValue(json2, "r");
        if (result2.r < 0 || result2.r > 255) {
          throw new Error("color has wrong r value: " + result2.r);
        }
        result2.g = parseIntValue(json2, "g");
        if (result2.g < 0 || result2.g > 255) {
          throw new Error("color has wrong g value: " + result2.g);
        }
        result2.b = parseIntValue(json2, "b");
        if (result2.b < 0 || result2.b > 255) {
          throw new Error("color has wrong b value: " + result2.b);
        }
        result2.a = parseValue(json2, "a", "number");
        if (result2.a < 0 || result2.a > 1) {
          throw new Error("color has wrong a value: " + result2.a);
        }
        return result2;
      }, parseHinge = function(json2) {
        const result2 = {};
        result2.width = parseIntValue(json2, "width");
        if (result2.width < 0 || result2.width > MaxDeviceSize) {
          throw new Error("Emulated device has wrong hinge width: " + result2.width);
        }
        result2.height = parseIntValue(json2, "height");
        if (result2.height < 0 || result2.height > MaxDeviceSize) {
          throw new Error("Emulated device has wrong hinge height: " + result2.height);
        }
        result2.x = parseIntValue(json2, "x");
        if (result2.x < 0 || result2.x > MaxDeviceSize) {
          throw new Error("Emulated device has wrong x offset: " + result2.height);
        }
        result2.y = parseIntValue(json2, "y");
        if (result2.x < 0 || result2.x > MaxDeviceSize) {
          throw new Error("Emulated device has wrong y offset: " + result2.height);
        }
        if (json2["contentColor"]) {
          result2.contentColor = parseRGBA(json2["contentColor"]);
        }
        if (json2["outlineColor"]) {
          result2.outlineColor = parseRGBA(json2["outlineColor"]);
        }
        return result2;
      }, parseOrientation = function(json2) {
        const result2 = {};
        result2.width = parseIntValue(json2, "width");
        if (result2.width < 0 || result2.width > MaxDeviceSize || result2.width < MinDeviceSize) {
          throw new Error("Emulated device has wrong width: " + result2.width);
        }
        result2.height = parseIntValue(json2, "height");
        if (result2.height < 0 || result2.height > MaxDeviceSize || result2.height < MinDeviceSize) {
          throw new Error("Emulated device has wrong height: " + result2.height);
        }
        if (json2["hinge"]) {
          result2.hinge = parseHinge(parseValue(json2, "hinge", "object", void 0));
        }
        return result2;
      };
      const result = new _EmulatedDevice();
      result.title = parseValue(json, "title", "string");
      const type = parseValue(json, "type", "string");
      if (!Object.values(Type).includes(type)) {
        throw new Error("Emulated device has wrong type: " + type);
      }
      result.type = type;
      result.order = parseValue(json, "order", "number", 0);
      const rawUserAgent = parseValue(json, "user-agent", "string");
      result.userAgent = SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(rawUserAgent);
      const userAgentMetadata = parseValue(json, "user-agent-metadata", "object", null);
      result.userAgentMetadata = result.userAgent ? userAgentMetadata : null;
      const capabilities = parseValue(json, "capabilities", "object", []);
      if (!Array.isArray(capabilities)) {
        throw new Error("Emulated device capabilities must be an array");
      }
      result.capabilities = [];
      for (let i = 0; i < capabilities.length; ++i) {
        if (typeof capabilities[i] !== "string") {
          throw new Error("Emulated device capability must be a string");
        }
        result.capabilities.push(capabilities[i]);
      }
      result.deviceScaleFactor = parseValue(json["screen"], "device-pixel-ratio", "number");
      if (result.deviceScaleFactor < 0 || result.deviceScaleFactor > 100) {
        throw new Error("Emulated device has wrong deviceScaleFactor: " + result.deviceScaleFactor);
      }
      result.vertical = parseOrientation(parseValue(json["screen"], "vertical", "object"));
      result.horizontal = parseOrientation(parseValue(json["screen"], "horizontal", "object"));
      result.isDualScreen = parseValue(json, "dual-screen", "boolean", false);
      result.isFoldableScreen = parseValue(json, "foldable-screen", "boolean", false);
      if (result.isDualScreen || result.isFoldableScreen) {
        result.verticalSpanned = parseOrientation(parseValue(json["screen"], "vertical-spanned", "object", null));
        result.horizontalSpanned = parseOrientation(parseValue(json["screen"], "horizontal-spanned", "object", null));
      }
      if ((result.isDualScreen || result.isFoldableScreen) && (!result.verticalSpanned || !result.horizontalSpanned)) {
        throw new Error("Emulated device '" + result.title + "'has dual screen without spanned orientations");
      }
      const modes = parseValue(json, "modes", "object", [
        { title: "default", orientation: "vertical" },
        { title: "default", orientation: "horizontal" }
      ]);
      if (!Array.isArray(modes)) {
        throw new Error("Emulated device modes must be an array");
      }
      result.modes = [];
      for (let i = 0; i < modes.length; ++i) {
        const mode = {};
        mode.title = parseValue(modes[i], "title", "string");
        mode.orientation = parseValue(modes[i], "orientation", "string");
        if (mode.orientation !== Vertical && mode.orientation !== Horizontal && mode.orientation !== VerticalSpanned && mode.orientation !== HorizontalSpanned) {
          throw new Error("Emulated device mode has wrong orientation '" + mode.orientation + "'");
        }
        const safeAreaInsets = parseValue(modes[i], "safe-area-insets", "object", null);
        if (safeAreaInsets) {
          mode.safeAreaInsets = parseInsets(safeAreaInsets);
        }
        const cutout = parseValue(modes[i], "cutout", "object", null);
        if (cutout) {
          const shape = parseCutoutShape(cutout);
          const baseCutout = {
            x: parseIntValue(cutout, "x"),
            y: parseIntValue(cutout, "y"),
            width: parseIntValue(cutout, "width"),
            height: parseIntValue(cutout, "height")
          };
          if (shape === "pill" /* PILL */) {
            mode.cutout = { shape, ...baseCutout, borderRadius: parseIntValue(cutout, "border-radius") };
          } else if (shape === "notch" /* NOTCH */) {
            mode.cutout = {
              shape,
              ...baseCutout,
              upperRadius: parseIntValue(cutout, "upper-radius"),
              lowerRadius: parseIntValue(cutout, "lower-radius")
            };
          } else if (shape === "circle" /* CIRCLE */) {
            mode.cutout = {
              shape,
              ...baseCutout,
              cx: parseIntValue(cutout, "cx"),
              cy: parseIntValue(cutout, "cy"),
              radius: parseIntValue(cutout, "radius")
            };
          } else {
            mode.cutout = { shape, ...baseCutout };
          }
        }
        result.modes.push(mode);
      }
      result.#showByDefault = parseValue(json, "show-by-default", "boolean", void 0);
      const show = parseValue(json, "show", "string", "Default" /* Default */);
      if (!Object.values(Show).includes(show)) {
        throw new Error("Emulated device has wrong show mode: " + show);
      }
      result.#show = show;
      return result;
    } catch {
      return null;
    }
  }
  static deviceComparator(device1, device2) {
    const order1 = device1.order || 0;
    const order2 = device2.order || 0;
    if (order1 > order2) {
      return 1;
    }
    if (order2 > order1) {
      return -1;
    }
    return device1.title < device2.title ? -1 : device1.title > device2.title ? 1 : 0;
  }
  modesForOrientation(orientation) {
    const result = [];
    for (let index = 0; index < this.modes.length; index++) {
      if (this.modes[index].orientation === orientation) {
        result.push(this.modes[index]);
      }
    }
    return result;
  }
  getSpanPartner(mode) {
    switch (mode.orientation) {
      case Vertical:
        return this.modesForOrientation(VerticalSpanned)[0];
      case Horizontal:
        return this.modesForOrientation(HorizontalSpanned)[0];
      case VerticalSpanned:
        return this.modesForOrientation(Vertical)[0];
      default:
        return this.modesForOrientation(Horizontal)[0];
    }
  }
  getRotationPartner(mode) {
    switch (mode.orientation) {
      case HorizontalSpanned:
        return this.modesForOrientation(VerticalSpanned)[0];
      case VerticalSpanned:
        return this.modesForOrientation(HorizontalSpanned)[0];
      case Horizontal:
        return this.modesForOrientation(Vertical)[0];
      default:
        return this.modesForOrientation(Horizontal)[0];
    }
  }
  toJSON() {
    const json = {};
    json["title"] = this.title;
    json["type"] = this.type;
    json["user-agent"] = this.userAgent;
    json["capabilities"] = this.capabilities;
    json["screen"] = {
      "device-pixel-ratio": this.deviceScaleFactor,
      vertical: this.orientationToJSON(this.vertical),
      horizontal: this.orientationToJSON(this.horizontal),
      "vertical-spanned": void 0,
      "horizontal-spanned": void 0
    };
    if (this.isDualScreen || this.isFoldableScreen) {
      json["screen"]["vertical-spanned"] = this.orientationToJSON(this.verticalSpanned);
      json["screen"]["horizontal-spanned"] = this.orientationToJSON(this.horizontalSpanned);
    }
    json["modes"] = [];
    for (let i = 0; i < this.modes.length; ++i) {
      const mode = {
        title: this.modes[i].title,
        orientation: this.modes[i].orientation
      };
      const safeAreaInsets = this.modes[i].safeAreaInsets;
      if (safeAreaInsets) {
        mode["safe-area-insets"] = {
          left: safeAreaInsets.left,
          top: safeAreaInsets.top,
          right: safeAreaInsets.right,
          bottom: safeAreaInsets.bottom
        };
      }
      const cutout = this.modes[i].cutout;
      if (cutout) {
        mode.cutout = {
          shape: cutout.shape,
          x: cutout.x,
          y: cutout.y,
          width: cutout.width,
          height: cutout.height
        };
        if (cutout.shape === "pill" /* PILL */) {
          mode.cutout["border-radius"] = cutout.borderRadius;
        } else if (cutout.shape === "notch" /* NOTCH */) {
          mode.cutout["upper-radius"] = cutout.upperRadius;
          mode.cutout["lower-radius"] = cutout.lowerRadius;
        } else if (cutout.shape === "circle" /* CIRCLE */) {
          mode.cutout.cx = cutout.cx;
          mode.cutout.cy = cutout.cy;
          mode.cutout.radius = cutout.radius;
        }
      }
      json["modes"].push(mode);
    }
    json["show-by-default"] = this.#showByDefault;
    json["dual-screen"] = this.isDualScreen;
    json["foldable-screen"] = this.isFoldableScreen;
    json["show"] = this.#show;
    if (this.userAgent && this.userAgentMetadata) {
      json["user-agent-metadata"] = this.userAgentMetadata;
    }
    return json;
  }
  orientationToJSON(orientation) {
    const json = {};
    json["width"] = orientation.width;
    json["height"] = orientation.height;
    if (orientation.hinge) {
      json.hinge = {
        width: orientation.hinge.width,
        height: orientation.hinge.height,
        x: orientation.hinge.x,
        y: orientation.hinge.y
      };
      if (orientation.hinge.contentColor) {
        json.hinge.contentColor = {
          r: orientation.hinge.contentColor.r,
          g: orientation.hinge.contentColor.g,
          b: orientation.hinge.contentColor.b,
          a: orientation.hinge.contentColor.a
        };
      }
      if (orientation.hinge.outlineColor) {
        json.hinge.outlineColor = {
          r: orientation.hinge.outlineColor.r,
          g: orientation.hinge.outlineColor.g,
          b: orientation.hinge.outlineColor.b,
          a: orientation.hinge.outlineColor.a
        };
      }
    }
    return json;
  }
  orientationByName(name) {
    switch (name) {
      case VerticalSpanned:
        return this.verticalSpanned;
      case HorizontalSpanned:
        return this.horizontalSpanned;
      case Vertical:
        return this.vertical;
      default:
        return this.horizontal;
    }
  }
  show() {
    if (this.#show === "Default" /* Default */) {
      return this.#showByDefault;
    }
    return this.#show === "Always" /* Always */;
  }
  setShow(show) {
    this.#show = show ? "Always" /* Always */ : "Never" /* Never */;
  }
  copyShowFrom(other) {
    this.#show = other.#show;
  }
  touch() {
    return this.capabilities.indexOf("touch" /* TOUCH */) !== -1;
  }
  mobile() {
    return this.capabilities.indexOf("mobile" /* MOBILE */) !== -1;
  }
};
var Horizontal = "horizontal";
var Vertical = "vertical";
var HorizontalSpanned = "horizontal-spanned";
var VerticalSpanned = "vertical-spanned";
var Type = /* @__PURE__ */ ((Type3) => {
  Type3["Phone"] = "phone";
  Type3["Tablet"] = "tablet";
  Type3["Notebook"] = "notebook";
  Type3["Desktop"] = "desktop";
  Type3["Foldable"] = "foldable";
  Type3["SmartDisplay"] = "smart-display";
  Type3["Unknown"] = "unknown";
  return Type3;
})(Type || {});
var Category = /* @__PURE__ */ ((Category2) => {
  Category2["MOBILE"] = "mobile";
  Category2["FOLDABLE"] = "foldable";
  Category2["TABLET_DESKTOP"] = "tablet_desktop";
  Category2["SMART_DISPLAY"] = "smart_display";
  return Category2;
})(Category || {});
function deviceCategory(device) {
  if (device.type === "foldable" /* Foldable */ || device.isFoldableScreen || device.isDualScreen) {
    return "foldable" /* FOLDABLE */;
  }
  if (device.type === "smart-display" /* SmartDisplay */) {
    return "smart_display" /* SMART_DISPLAY */;
  }
  if (device.type === "tablet" /* Tablet */ || device.type === "notebook" /* Notebook */ || device.type === "desktop" /* Desktop */) {
    return "tablet_desktop" /* TABLET_DESKTOP */;
  }
  return "mobile" /* MOBILE */;
}
var CATEGORY_ORDER = [
  "mobile" /* MOBILE */,
  "foldable" /* FOLDABLE */,
  "tablet_desktop" /* TABLET_DESKTOP */,
  "smart_display" /* SMART_DISPLAY */
];
function getCategoryTitle(category) {
  switch (category) {
    case "mobile" /* MOBILE */:
      return i18nString(UIStrings.mobileGroup);
    case "foldable" /* FOLDABLE */:
      return i18nString(UIStrings.foldablesGroup);
    case "tablet_desktop" /* TABLET_DESKTOP */:
      return i18nString(UIStrings.tabletsAndDesktopsGroup);
    case "smart_display" /* SMART_DISPLAY */:
      return i18nString(UIStrings.smartDisplaysGroup);
  }
}
var Capability = /* @__PURE__ */ ((Capability2) => {
  Capability2["TOUCH"] = "touch";
  Capability2["MOBILE"] = "mobile";
  return Capability2;
})(Capability || {});
var Show = /* @__PURE__ */ ((Show2) => {
  Show2["Always"] = "Always";
  Show2["Default"] = "Default";
  Show2["Never"] = "Never";
  return Show2;
})(Show || {});
var EmulatedDevicesList = class _EmulatedDevicesList extends Common.ObjectWrapper.ObjectWrapper {
  #standardSetting;
  #standard;
  #customSetting;
  #custom;
  constructor(settings) {
    super();
    this.#standardSetting = settings.createSetting("standard-emulated-device-list", []);
    this.#standard = /* @__PURE__ */ new Set();
    this.listFromJSONV1(this.#standardSetting.get(), this.#standard);
    this.updateStandardDevices();
    this.#customSetting = settings.createSetting("custom-emulated-device-list", []);
    this.#custom = /* @__PURE__ */ new Set();
    if (!this.listFromJSONV1(this.#customSetting.get(), this.#custom)) {
      this.saveCustomDevices();
    }
  }
  static instance() {
    if (!Root.DevToolsContext.globalInstance().has(_EmulatedDevicesList)) {
      Root.DevToolsContext.globalInstance().set(
        _EmulatedDevicesList,
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        new _EmulatedDevicesList(Common.Settings.Settings.instance())
      );
    }
    return Root.DevToolsContext.globalInstance().get(_EmulatedDevicesList);
  }
  updateStandardDevices() {
    const devices = /* @__PURE__ */ new Set();
    for (const emulatedDevice of emulatedDevices) {
      const device = EmulatedDevice.fromJSONV1(emulatedDevice);
      if (device) {
        devices.add(device);
      }
    }
    this.copyShowValues(this.#standard, devices);
    this.#standard = devices;
    this.saveStandardDevices();
  }
  listFromJSONV1(jsonArray, result) {
    if (!Array.isArray(jsonArray)) {
      return false;
    }
    let success = true;
    for (let i = 0; i < jsonArray.length; ++i) {
      const device = EmulatedDevice.fromJSONV1(jsonArray[i]);
      if (device) {
        result.add(device);
        if (!device.modes.length) {
          device.modes.push({
            title: "",
            orientation: Horizontal
          });
          device.modes.push({
            title: "",
            orientation: Vertical
          });
        }
      } else {
        success = false;
      }
    }
    return success;
  }
  static rawEmulatedDevicesForTest() {
    return emulatedDevices;
  }
  standard() {
    return [...this.#standard];
  }
  custom() {
    return [...this.#custom];
  }
  revealCustomSetting() {
    void Common.Revealer.reveal(this.#customSetting);
  }
  addCustomDevice(device) {
    this.#custom.add(device);
    this.saveCustomDevices();
  }
  removeCustomDevice(device) {
    this.#custom.delete(device);
    this.saveCustomDevices();
  }
  saveCustomDevices() {
    const json = [];
    this.#custom.forEach((device) => json.push(device.toJSON()));
    this.#customSetting.set(json);
    this.dispatchEventToListeners("CustomDevicesUpdated" /* CUSTOM_DEVICES_UPDATED */);
  }
  saveStandardDevices() {
    const json = [];
    this.#standard.forEach((device) => json.push(device.toJSON()));
    this.#standardSetting.set(json);
    this.dispatchEventToListeners("StandardDevicesUpdated" /* STANDARD_DEVICES_UPDATED */);
  }
  copyShowValues(from, to) {
    const fromDeviceById = /* @__PURE__ */ new Map();
    for (const device of from) {
      fromDeviceById.set(device.title, device);
    }
    for (const toDevice of to) {
      const fromDevice = fromDeviceById.get(toDevice.title);
      if (fromDevice) {
        toDevice.copyShowFrom(fromDevice);
      }
    }
  }
};
var Events = /* @__PURE__ */ ((Events3) => {
  Events3["CUSTOM_DEVICES_UPDATED"] = "CustomDevicesUpdated";
  Events3["STANDARD_DEVICES_UPDATED"] = "StandardDevicesUpdated";
  return Events3;
})(Events || {});
var CutoutShape = /* @__PURE__ */ ((CutoutShape2) => {
  CutoutShape2["PILL"] = "pill";
  CutoutShape2["NOTCH"] = "notch";
  CutoutShape2["CIRCLE"] = "circle";
  CutoutShape2["RECTANGLE"] = "rectangle";
  return CutoutShape2;
})(CutoutShape || {});
var emulatedDevices = [
  // This is used by a python script to keep this list up-to-date with
  // chromedriver native code.
  // See //chrome/test/chromedriver/embed_mobile_devices_in_cpp.py in Chromium.
  // DEVICE-LIST-BEGIN
  {
    "order": 10,
    "show-by-default": true,
    "title": "iPhone SE",
    "screen": {
      "horizontal": {
        "width": 667,
        "height": 375
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 375,
        "height": 667
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone"
  },
  {
    "order": 12,
    "show-by-default": false,
    "title": "iPhone XR",
    "screen": {
      "horizontal": {
        "width": 896,
        "height": 414
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 414,
        "height": 896
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 44, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 92, "y": 0, "width": 231, "height": 33, "upper-radius": 6, "lower-radius": 25 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 44, "top": 0, "right": 44, "bottom": 21 }
      }
    ]
  },
  {
    "order": 14,
    "show-by-default": false,
    "title": "iPhone 12 Pro",
    "screen": {
      "horizontal": {
        "width": 844,
        "height": 390
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 390,
        "height": 844
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 90, "y": 0, "width": 210, "height": 32, "upper-radius": 6, "lower-radius": 23 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 15,
    "show-by-default": false,
    "title": "iPhone 14",
    "screen": {
      "horizontal": {
        "width": 844,
        "height": 390
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 390,
        "height": 844
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 114, "y": 0, "width": 162, "height": 34, "upper-radius": 5, "lower-radius": 22 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 16,
    "show-by-default": false,
    "title": "iPhone 14 Plus",
    "screen": {
      "horizontal": {
        "width": 926,
        "height": 428
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 428,
        "height": 926
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 133, "y": 0, "width": 161, "height": 34, "upper-radius": 5, "lower-radius": 22 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 17,
    "show-by-default": false,
    "title": "iPhone 14 Pro",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 18,
    "show-by-default": false,
    "title": "iPhone 14 Pro Max",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 19,
    "show-by-default": false,
    "title": "iPhone 15",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 20,
    "show-by-default": false,
    "title": "iPhone 15 Plus",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 21,
    "show-by-default": false,
    "title": "iPhone 15 Pro",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 22,
    "show-by-default": false,
    "title": "iPhone 15 Pro Max",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 23,
    "show-by-default": false,
    "title": "iPhone 16e",
    "screen": {
      "horizontal": {
        "width": 844,
        "height": 390
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 390,
        "height": 844
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 114, "y": 0, "width": 162, "height": 34, "upper-radius": 5, "lower-radius": 22 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 24,
    "show-by-default": true,
    "title": "iPhone 16",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 25,
    "show-by-default": false,
    "title": "iPhone 16 Plus",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 26,
    "show-by-default": false,
    "title": "iPhone 16 Pro",
    "screen": {
      "horizontal": {
        "width": 874,
        "height": 402
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 402,
        "height": 874
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 62, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 139, "y": 14, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 62, "top": 0, "right": 62, "bottom": 21 }
      }
    ]
  },
  {
    "order": 27,
    "show-by-default": true,
    "title": "iPhone 16 Pro Max",
    "screen": {
      "horizontal": {
        "width": 956,
        "height": 440
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 440,
        "height": 956
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 62, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 158, "y": 14, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 62, "top": 0, "right": 62, "bottom": 21 }
      }
    ]
  },
  {
    "order": 30,
    "show-by-default": false,
    "title": "Pixel 7",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "13", "architecture": "", "model": "Pixel 7", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 52, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 183, "y": 0, "width": 55, "height": 52, "cx": 206, "cy": 26, "radius": 13 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 52, "bottom": 0 }
      }
    ]
  },
  {
    "order": 31,
    "show-by-default": false,
    "title": "Pixel 8",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 8", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 50, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 182, "y": 0, "width": 46, "height": 50, "cx": 206, "cy": 25, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 50, "bottom": 0 }
      }
    ]
  },
  {
    "order": 32,
    "show-by-default": false,
    "title": "Pixel 8 Pro",
    "screen": {
      "horizontal": {
        "width": 997,
        "height": 448
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 448,
        "height": 997
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 8 Pro", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 50, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 205, "y": 0, "width": 37, "height": 50, "cx": 224, "cy": 25, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 50, "bottom": 0 }
      }
    ]
  },
  {
    "order": 33,
    "show-by-default": false,
    "title": "Pixel 8a",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 8a", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 46, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 185, "y": 0, "width": 42, "height": 46, "cx": 206, "cy": 26, "radius": 13 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 46, "bottom": 0 }
      }
    ]
  },
  {
    "order": 34,
    "show-by-default": true,
    "title": "Pixel 9",
    "screen": {
      "horizontal": {
        "width": 924,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 924
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 9", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 58, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 188, "y": 0, "width": 37, "height": 58, "cx": 206, "cy": 29, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 58, "bottom": 0 }
      }
    ]
  },
  {
    "order": 35,
    "show-by-default": true,
    "title": "Pixel 9 Pro",
    "screen": {
      "horizontal": {
        "width": 952,
        "height": 427
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 427,
        "height": 952
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 9 Pro", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 68, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 195, "y": 0, "width": 36, "height": 68, "cx": 213, "cy": 34, "radius": 16 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 68, "bottom": 0 }
      }
    ]
  },
  {
    "order": 36,
    "show-by-default": false,
    "title": "Pixel 9 Pro XL",
    "screen": {
      "horizontal": {
        "width": 997,
        "height": 448
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 448,
        "height": 997
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 9 Pro XL", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 66, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 205, "y": 0, "width": 38, "height": 66, "cx": 224, "cy": 33, "radius": 16 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 66, "bottom": 0 }
      }
    ]
  },
  {
    "order": 37,
    "show-by-default": true,
    "title": "Pixel 10",
    "screen": {
      "horizontal": {
        "width": 924,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 924
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "16", "architecture": "", "model": "Pixel 10", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "safe-area-insets": { "left": 0, "top": 58, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 188, "y": 0, "width": 37, "height": 58, "cx": 206, "cy": 29, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "safe-area-insets": { "left": 0, "top": 0, "right": 58, "bottom": 0 }
      }
    ]
  },
  {
    "order": 38,
    "show-by-default": false,
    "title": "Samsung Galaxy S8+",
    "screen": {
      "horizontal": {
        "width": 740,
        "height": 360
      },
      "device-pixel-ratio": 4,
      "vertical": {
        "width": 360,
        "height": 740
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "SM-G955U", "mobile": true },
    "type": "phone"
  },
  {
    "order": 39,
    "show-by-default": false,
    "title": "Samsung Galaxy S20 Ultra",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 3.5,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "13", "architecture": "", "model": "SM-G981B", "mobile": true },
    "type": "phone"
  },
  {
    "order": 43,
    "show-by-default": false,
    "title": "Surface Pro 7",
    "screen": {
      "horizontal": {
        "width": 1368,
        "height": 912
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 912,
        "height": 1368
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "type": "tablet"
  },
  {
    "order": 40,
    "show-by-default": true,
    "title": "iPad Mini",
    "screen": {
      "horizontal": {
        "width": 1024,
        "height": 768
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 768,
        "height": 1024
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPad", "mobile": true },
    "type": "tablet"
  },
  {
    "order": 42,
    "show-by-default": true,
    "title": "iPad Pro 13",
    "screen": {
      "horizontal": {
        "width": 1376,
        "height": 1032
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 1032,
        "height": 1376
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPad", "mobile": true },
    "type": "tablet"
  },
  {
    "order": 43,
    "show-by-default": true,
    "title": "Surface Pro 10",
    "screen": {
      "horizontal": {
        "width": 1440,
        "height": 960
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 960,
        "height": 1440
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "type": "tablet"
  },
  {
    "order": 44,
    "show-by-default": false,
    "dual-screen": true,
    "title": "Surface Duo",
    "screen": {
      "horizontal": { "width": 720, "height": 540 },
      "device-pixel-ratio": 2.5,
      "vertical": { "width": 540, "height": 720 },
      "vertical-spanned": {
        "width": 1114,
        "height": 720,
        "hinge": { "width": 34, "height": 720, "x": 540, "y": 0, "contentColor": { "r": 38, "g": 38, "b": 38, "a": 1 } }
      },
      "horizontal-spanned": {
        "width": 720,
        "height": 1114,
        "hinge": { "width": 720, "height": 34, "x": 0, "y": 540, "contentColor": { "r": 38, "g": 38, "b": 38, "a": 1 } }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 11.0; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "11.0", "architecture": "", "model": "Surface Duo", "mobile": true },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical" },
      { "title": "default", "orientation": "horizontal" },
      { "title": "spanned", "orientation": "vertical-spanned" },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned"
      }
    ]
  },
  {
    "order": 38,
    "show-by-default": true,
    "title": "Samsung Galaxy A55",
    "screen": {
      "horizontal": { "width": 800, "height": 360 },
      "device-pixel-ratio": 2.25,
      "vertical": { "width": 360, "height": 800 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "SM-A556B", "mobile": true },
    "type": "phone"
  },
  {
    "order": 45,
    "show-by-default": true,
    "foldable-screen": true,
    "title": "Pixel 9 Pro Fold",
    "screen": {
      "horizontal": { "width": 922, "height": 412 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 412, "height": 922 },
      "vertical-spanned": {
        "width": 836,
        "height": 842,
        "hinge": {
          "width": 0,
          "height": 842,
          "x": 418,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 842,
        "height": 836,
        "hinge": {
          "width": 842,
          "height": 0,
          "x": 0,
          "y": 418,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro Fold) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": {
      "platform": "Android",
      "platformVersion": "14",
      "architecture": "",
      "model": "Pixel 9 Pro Fold",
      "mobile": true
    },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical" },
      { "title": "default", "orientation": "horizontal" },
      { "title": "spanned", "orientation": "vertical-spanned" },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned"
      }
    ]
  },
  {
    "order": 46,
    "show-by-default": true,
    "foldable-screen": true,
    "title": "Galaxy Z Fold 6",
    "screen": {
      "horizontal": { "width": 968, "height": 412 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 412, "height": 968 },
      "vertical-spanned": {
        "width": 744,
        "height": 860,
        "hinge": {
          "width": 0,
          "height": 860,
          "x": 372,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 860,
        "height": 744,
        "hinge": {
          "width": 860,
          "height": 0,
          "x": 0,
          "y": 372,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "SM-F956U", "mobile": true },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical" },
      { "title": "default", "orientation": "horizontal" },
      { "title": "spanned", "orientation": "vertical-spanned" },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned"
      }
    ]
  },
  {
    "order": 46,
    "show-by-default": false,
    "foldable-screen": true,
    "title": "Galaxy Z Fold 5",
    "screen": {
      "horizontal": { "width": 882, "height": 344 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 344, "height": 882 },
      "vertical-spanned": {
        "width": 690,
        "height": 829,
        "hinge": {
          "width": 0,
          "height": 829,
          "x": 345,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 829,
        "height": 690,
        "hinge": {
          "width": 829,
          "height": 0,
          "x": 0,
          "y": 345,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "10.0", "architecture": "", "model": "SM-F946U", "mobile": true },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical" },
      { "title": "default", "orientation": "horizontal" },
      { "title": "spanned", "orientation": "vertical-spanned" },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned"
      }
    ]
  },
  {
    "order": 47,
    "show-by-default": false,
    "foldable-screen": true,
    "title": "Asus Zenbook Fold",
    "screen": {
      "horizontal": { "width": 1280, "height": 853 },
      "device-pixel-ratio": 1.5,
      "vertical": { "width": 853, "height": 1280 },
      "vertical-spanned": {
        "width": 1706,
        "height": 1280,
        "hinge": {
          "width": 107,
          "height": 1280,
          "x": 800,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 1280,
        "height": 1706,
        "hinge": {
          "width": 1706,
          "height": 107,
          "x": 0,
          "y": 800,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch"],
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "user-agent-metadata": { "platform": "Windows", "platformVersion": "11.0", "architecture": "", "model": "UX9702AA", "mobile": false },
    "type": "tablet",
    "modes": [
      { "title": "default", "orientation": "vertical" },
      { "title": "default", "orientation": "horizontal" },
      {
        "title": "spanned",
        "orientation": "vertical-spanned"
      },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned"
      }
    ]
  },
  {
    "order": 48,
    "show-by-default": false,
    "title": "Samsung Galaxy A51/71",
    "screen": {
      "horizontal": {
        "width": 914,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 914
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "SM-G955U", "mobile": true },
    "type": "phone"
  },
  {
    "order": 52,
    "show-by-default": true,
    "title": "Nest Hub Max",
    "screen": {
      "horizontal": {
        "width": 1280,
        "height": 800
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 1280,
        "height": 800
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 CrKey/1.54.250320",
    "type": "smart-display",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    "title": "Galaxy Tab S4",
    "screen": {
      "horizontal": { "width": 1138, "height": 712 },
      "device-pixel-ratio": 2.25,
      "vertical": { "width": 712, "height": 1138 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.1.0", "architecture": "", "model": "SM-T837A", "mobile": false },
    "type": "phone"
  },
  {
    "order": 1,
    "show-by-default": false,
    "title": "JioPhone 2",
    "screen": {
      "horizontal": { "width": 320, "height": 240 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 240, "height": 320 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5",
    "user-agent-metadata": {
      "platform": "Android",
      "platformVersion": "",
      "architecture": "",
      "model": "LYF/F300B/LYF-F300B-001-01-15-130718-i",
      "mobile": true
    },
    "type": "phone"
  },
  {
    "show-by-default": false,
    /* DEVICE-LIST-IF-JS */
    "title": i18nLazyString(UIStrings.laptopWithTouch),
    /* DEVICE-LIST-ELSE
    'title': 'Laptop with touch',
    DEVICE-LIST-END-IF */
    "screen": {
      "horizontal": { "width": 1280, "height": 950 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 950, "height": 1280 }
    },
    "capabilities": ["touch"],
    "user-agent": "",
    "type": "notebook",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    /* DEVICE-LIST-IF-JS */
    "title": i18nLazyString(UIStrings.laptopWithHiDPIScreen),
    /* DEVICE-LIST-ELSE
    'title': 'Laptop with HiDPI screen',
    DEVICE-LIST-END-IF */
    "screen": {
      "horizontal": { "width": 1440, "height": 900 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 900, "height": 1440 }
    },
    "capabilities": [],
    "user-agent": "",
    "type": "notebook",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    /* DEVICE-LIST-IF-JS */
    "title": i18nLazyString(UIStrings.laptopWithMDPIScreen),
    /* DEVICE-LIST-ELSE
    'title': 'Laptop with MDPI screen',
    DEVICE-LIST-END-IF */
    "screen": {
      "horizontal": { "width": 1280, "height": 800 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 800, "height": 1280 }
    },
    "capabilities": [],
    "user-agent": "",
    "type": "notebook",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    "title": "Moto G4",
    "screen": {
      "horizontal": {
        "width": 640,
        "height": 360
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 360,
        "height": 640
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "6.0.1", "architecture": "", "model": "Moto G (4)", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Moto G Power",
    "screen": {
      "device-pixel-ratio": 1.75,
      "horizontal": {
        "width": 823,
        "height": 412
      },
      "vertical": {
        "width": 412,
        "height": 823
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": {
      "platform": "Android",
      "platformVersion": "11",
      "architecture": "",
      "model": "moto g power (2022)",
      "mobile": true
    },
    "type": "phone"
  },
  {
    "order": 200,
    "show-by-default": false,
    "title": "Facebook on Android",
    "screen": {
      "horizontal": {
        "width": 892,
        "height": 412
      },
      "device-pixel-ratio": 3.5,
      "vertical": {
        "width": 412,
        "height": 892
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/%s Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/407.0.0.0.65;]",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "12", "architecture": "", "model": "Pixel 6", "mobile": true },
    "type": "phone"
  }
  // DEVICE-LIST-END
];

// ../../front_end/models/emulation/DeviceModeModel.ts
var UIStrings2 = {
  /**
   * @description Error message shown on the Devices settings tab when the user enters an empty
   * width for a custom device.
   */
  widthCannotBeEmpty: "Width can\u2019t be empty.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an invalid
   * width for a custom device.
   */
  widthMustBeANumber: "Width must be a number.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a width
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  widthMustBeLessThanOrEqualToS: "Width must be less than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a width
   * for a custom device that is too small.
   * @example {50} PH1
   */
  widthMustBeGreaterThanOrEqualToS: "Width must be greater than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an empty
   * height for a custom device.
   */
  heightCannotBeEmpty: "Height can\u2019t be empty.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an invalid
   * height for a custom device.
   */
  heightMustBeANumber: "Height must be a number.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a height
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  heightMustBeLessThanOrEqualToS: "Height must be less than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a height
   * for a custom device that is too small.
   * @example {50} PH1
   */
  heightMustBeGreaterThanOrEqualTo: "Height must be greater than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an invalid
   * device pixel ratio for a custom device.
   */
  devicePixelRatioMustBeANumberOr: "Device pixel ratio must be a number or blank.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters a device
   * pixel ratio for a custom device that is too large.
   * @example {10} PH1
   */
  devicePixelRatioMustBeLessThanOr: "Device pixel ratio must be less than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters a device
   * pixel ratio for a custom device that is too small.
   * @example {0} PH1
   */
  devicePixelRatioMustBeGreater: "Device pixel ratio must be greater than or equal to {PH1}."
};
var str_2 = i18n3.i18n.registerUIStrings("models/emulation/DeviceModeModel.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var CUTOUT_SHAPE_TO_PROTOCOL = {
  ["pill" /* PILL */]: Overlay.DisplayCutoutShape.Pill,
  ["notch" /* NOTCH */]: Overlay.DisplayCutoutShape.Notch,
  ["circle" /* CIRCLE */]: Overlay.DisplayCutoutShape.Circle,
  ["rectangle" /* RECTANGLE */]: Overlay.DisplayCutoutShape.Rectangle
};
var DeviceModeModel = class _DeviceModeModel extends Common2.ObjectWrapper.ObjectWrapper {
  #screenRect;
  #visiblePageRect;
  #availableSize;
  #preferredSize;
  #initialized;
  #autoFitScaleOnInitialize;
  #appliedDeviceSize;
  #appliedDeviceScaleFactor;
  #appliedUserAgentType;
  #scaleSetting;
  #scale;
  #widthSetting;
  #heightSetting;
  #uaSetting;
  #deviceScaleFactorSetting;
  #toolbarControlsEnabledSetting;
  #type;
  #device;
  #mode;
  #fitScale;
  #touchEnabled;
  #touchMobile;
  #emulationModel;
  #onModelAvailable;
  #screenOrientationLocked;
  #targetManager;
  #settings;
  #multitargetNetworkManager;
  #lastScreenshotBlobUrl = null;
  constructor(targetManager, settings, multitargetNetworkManager) {
    super();
    this.#targetManager = targetManager;
    this.#settings = settings;
    this.#multitargetNetworkManager = multitargetNetworkManager;
    this.#screenRect = new Rect(0, 0, 1, 1);
    this.#visiblePageRect = new Rect(0, 0, 1, 1);
    this.#availableSize = new Geometry.Size(1, 1);
    this.#preferredSize = new Geometry.Size(1, 1);
    this.#initialized = false;
    this.#autoFitScaleOnInitialize = false;
    this.#appliedDeviceSize = new Geometry.Size(1, 1);
    this.#appliedDeviceScaleFactor = globalThis.devicePixelRatio;
    this.#appliedUserAgentType = "Desktop" /* DESKTOP */;
    this.#scaleSetting = this.#settings.createSetting("emulation.device-scale", 1);
    if (!this.#scaleSetting.get()) {
      this.#scaleSetting.set(1);
    }
    this.#scaleSetting.addChangeListener(this.scaleSettingChanged, this);
    this.#scale = 1;
    this.#widthSetting = this.#settings.createSetting("emulation.device-width", 400);
    if (this.#widthSetting.get() < MinDeviceSize) {
      this.#widthSetting.set(MinDeviceSize);
    }
    if (this.#widthSetting.get() > MaxDeviceSize) {
      this.#widthSetting.set(MaxDeviceSize);
    }
    this.#widthSetting.addChangeListener(this.widthSettingChanged, this);
    this.#heightSetting = this.#settings.createSetting("emulation.device-height", 0);
    if (this.#heightSetting.get() && this.#heightSetting.get() < MinDeviceSize) {
      this.#heightSetting.set(MinDeviceSize);
    }
    if (this.#heightSetting.get() > MaxDeviceSize) {
      this.#heightSetting.set(MaxDeviceSize);
    }
    this.#heightSetting.addChangeListener(this.heightSettingChanged, this);
    this.#uaSetting = this.#settings.createSetting("emulation.device-ua", "Mobile" /* MOBILE */);
    this.#uaSetting.addChangeListener(this.uaSettingChanged, this);
    this.#deviceScaleFactorSetting = this.#settings.createSetting("emulation.device-scale-factor", 0);
    this.#deviceScaleFactorSetting.addChangeListener(this.deviceScaleFactorSettingChanged, this);
    this.#toolbarControlsEnabledSetting = this.#settings.createSetting(
      "emulation.toolbar-controls-enabled",
      true,
      Common2.Settings.SettingStorageType.SESSION
    );
    this.#type = "None" /* None */;
    this.#device = null;
    this.#mode = null;
    this.#fitScale = 1;
    this.#touchEnabled = false;
    this.#touchMobile = false;
    this.#emulationModel = null;
    this.#onModelAvailable = null;
    this.#screenOrientationLocked = false;
    this.#targetManager.observeModels(SDK2.EmulationModel.EmulationModel, this);
  }
  static instance(opts) {
    if (!Root2.DevToolsContext.globalInstance().has(_DeviceModeModel) || opts?.forceNew) {
      Root2.DevToolsContext.globalInstance().set(
        _DeviceModeModel,
        new _DeviceModeModel(
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          SDK2.TargetManager.TargetManager.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          Common2.Settings.Settings.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          SDK2.NetworkManager.MultitargetNetworkManager.instance()
        )
      );
    }
    return Root2.DevToolsContext.globalInstance().get(_DeviceModeModel);
  }
  /**
   * This wraps `instance()` in a try/catch because in some DevTools entry points
   * (such as worker_app.ts) the Emulation panel is not included and as such
   * the below code fails; it tries to instantiate the model which requires
   * reading the value of a setting which has not been registered.
   * See crbug.com/361515458 for an example bug that this resolves.
   */
  static tryInstance(opts) {
    try {
      return this.instance(opts);
    } catch {
      return null;
    }
  }
  static removeInstance() {
    if (Root2.DevToolsContext.globalInstance().has(_DeviceModeModel)) {
      Root2.DevToolsContext.globalInstance().get(_DeviceModeModel).dispose();
    }
    Root2.DevToolsContext.globalInstance().delete(_DeviceModeModel);
  }
  dispose() {
    this.#targetManager.unobserveModels(SDK2.EmulationModel.EmulationModel, this);
    this.#revokeLastScreenshotBlobUrl();
  }
  static widthValidator(value) {
    let valid = false;
    let errorMessage;
    if (!value) {
      errorMessage = i18nString2(UIStrings2.widthCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString2(UIStrings2.widthMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString2(UIStrings2.widthMustBeLessThanOrEqualToS, { PH1: MaxDeviceSize });
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString2(UIStrings2.widthMustBeGreaterThanOrEqualToS, { PH1: MinDeviceSize });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  static heightValidator(value) {
    let valid = false;
    let errorMessage;
    if (!value) {
      errorMessage = i18nString2(UIStrings2.heightCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString2(UIStrings2.heightMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString2(UIStrings2.heightMustBeLessThanOrEqualToS, { PH1: MaxDeviceSize });
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString2(UIStrings2.heightMustBeGreaterThanOrEqualTo, { PH1: MinDeviceSize });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  static scaleValidator(value) {
    let valid = false;
    let errorMessage;
    const parsedValue = Number(value.trim());
    if (!value) {
      valid = true;
    } else if (Number.isNaN(parsedValue)) {
      errorMessage = i18nString2(UIStrings2.devicePixelRatioMustBeANumberOr);
    } else if (Number(value) > MaxDeviceScaleFactor) {
      errorMessage = i18nString2(UIStrings2.devicePixelRatioMustBeLessThanOr, { PH1: MaxDeviceScaleFactor });
    } else if (Number(value) < MinDeviceScaleFactor) {
      errorMessage = i18nString2(UIStrings2.devicePixelRatioMustBeGreater, { PH1: MinDeviceScaleFactor });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  get scaleSettingInternal() {
    return this.#scaleSetting;
  }
  #updateFitScale() {
    if (this.#type === "Device" /* Device */ && this.#device && this.#mode) {
      const orientation = this.#device.orientationByName(this.#mode.orientation);
      this.#scaleSetting.set(this.calculateFitScale(orientation.width, orientation.height));
    }
  }
  setAvailableSize(availableSize, preferredSize) {
    this.#availableSize = availableSize;
    this.#preferredSize = preferredSize;
    this.#initialized = true;
    if (this.#autoFitScaleOnInitialize) {
      this.#autoFitScaleOnInitialize = false;
      this.#updateFitScale();
    }
    this.calculateAndEmulate(false);
  }
  emulate(type, device, mode, scale) {
    const resetPageScaleFactor = this.#type !== type || this.#device !== device || this.#mode !== mode;
    this.#type = type;
    if (type === "Device" /* Device */ && device && mode) {
      console.assert(Boolean(device) && Boolean(mode), "Must pass device and mode for device emulation");
      this.#mode = mode;
      this.#device = device;
      if (scale !== void 0) {
        this.#autoFitScaleOnInitialize = false;
        this.#scaleSetting.set(scale);
      } else if (this.#initialized) {
        this.#autoFitScaleOnInitialize = false;
        this.#updateFitScale();
      } else {
        this.#autoFitScaleOnInitialize = true;
      }
    } else {
      this.#device = null;
      this.#mode = null;
      this.#autoFitScaleOnInitialize = false;
    }
    if (type !== "None" /* None */) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.DeviceModeEnabled);
    } else {
      this.#revokeLastScreenshotBlobUrl();
    }
    this.calculateAndEmulate(resetPageScaleFactor);
  }
  setWidth(width) {
    const max = Math.min(MaxDeviceSize, this.preferredScaledWidth());
    width = Math.max(Math.min(width, max), 1);
    this.#widthSetting.set(width);
  }
  setWidthAndScaleToFit(width) {
    width = Math.max(Math.min(width, MaxDeviceSize), 1);
    this.#scaleSetting.set(this.calculateFitScale(width, this.#heightSetting.get()));
    this.#widthSetting.set(width);
  }
  setHeight(height) {
    const max = Math.min(MaxDeviceSize, this.preferredScaledHeight());
    height = Math.max(Math.min(height, max), 0);
    if (height === this.preferredScaledHeight()) {
      height = 0;
    }
    this.#heightSetting.set(height);
  }
  setHeightAndScaleToFit(height) {
    height = Math.max(Math.min(height, MaxDeviceSize), 0);
    this.#scaleSetting.set(this.calculateFitScale(this.#widthSetting.get(), height));
    this.#heightSetting.set(height);
  }
  setScale(scale) {
    this.#scaleSetting.set(scale);
  }
  device() {
    return this.#device;
  }
  mode() {
    return this.#mode;
  }
  type() {
    return this.#type;
  }
  screenRect() {
    return this.#screenRect;
  }
  visiblePageRect() {
    return this.#visiblePageRect;
  }
  scale() {
    return this.#scale;
  }
  fitScale() {
    return this.#fitScale;
  }
  appliedDeviceSize() {
    return this.#appliedDeviceSize;
  }
  appliedDeviceScaleFactor() {
    return this.#appliedDeviceScaleFactor;
  }
  appliedUserAgentType() {
    return this.#appliedUserAgentType;
  }
  isFullHeight() {
    return !this.#heightSetting.get();
  }
  isMobile() {
    switch (this.#type) {
      case "Device" /* Device */:
        return this.#device ? this.#device.mobile() : false;
      case "None" /* None */:
        return false;
      case "Responsive" /* Responsive */:
        return this.#uaSetting.get() === "Mobile" /* MOBILE */ || this.#uaSetting.get() === "Mobile (no touch)" /* MOBILE_NO_TOUCH */;
    }
    return false;
  }
  enabledSetting() {
    return this.#settings.createSetting("emulation.show-device-mode", false);
  }
  isDeviceModeOn() {
    return this.enabledSetting().get();
  }
  toggleDeviceMode() {
    this.enabledSetting().set(!this.enabledSetting().get());
  }
  scaleSetting() {
    return this.#scaleSetting;
  }
  uaSetting() {
    return this.#uaSetting;
  }
  deviceScaleFactorSetting() {
    return this.#deviceScaleFactorSetting;
  }
  toolbarControlsEnabledSetting() {
    return this.#toolbarControlsEnabledSetting;
  }
  reset() {
    this.#deviceScaleFactorSetting.set(0);
    this.#scaleSetting.set(1);
    this.setWidth(400);
    this.setHeight(0);
    this.#uaSetting.set("Mobile" /* MOBILE */);
  }
  modelAdded(emulationModel) {
    if (emulationModel.target() === this.#targetManager.primaryPageTarget() && emulationModel.supportsDeviceEmulation()) {
      this.#emulationModel = emulationModel;
      if (this.#onModelAvailable) {
        const callback = this.#onModelAvailable;
        this.#onModelAvailable = null;
        callback();
      }
      emulationModel.addEventListener(
        SDK2.EmulationModel.EmulationModelEvents.SCREEN_ORIENTATION_LOCK_CHANGED,
        this.onScreenOrientationLockChanged,
        this
      );
      const resourceTreeModel = emulationModel.target().model(SDK2.ResourceTreeModel.ResourceTreeModel);
      if (resourceTreeModel) {
        resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.FrameResized, this.onFrameChange, this);
        resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.FrameNavigated, this.onFrameNavigated, this);
      }
    } else {
      void emulationModel.emulateTouch(this.#touchEnabled, this.#touchMobile);
    }
  }
  modelRemoved(emulationModel) {
    if (this.#emulationModel === emulationModel) {
      emulationModel.removeEventListener(
        SDK2.EmulationModel.EmulationModelEvents.SCREEN_ORIENTATION_LOCK_CHANGED,
        this.onScreenOrientationLockChanged,
        this
      );
      const resourceTreeModel = emulationModel.target().model(SDK2.ResourceTreeModel.ResourceTreeModel);
      if (resourceTreeModel) {
        resourceTreeModel.removeEventListener(SDK2.ResourceTreeModel.Events.FrameResized, this.onFrameChange, this);
        resourceTreeModel.removeEventListener(SDK2.ResourceTreeModel.Events.FrameNavigated, this.onFrameNavigated, this);
      }
      this.#emulationModel = null;
      this.#screenOrientationLocked = false;
      this.#revokeLastScreenshotBlobUrl();
      this.dispatchEventToListeners("Updated" /* UPDATED */);
    }
  }
  inspectedURL() {
    return this.#emulationModel ? this.#emulationModel.target().inspectedURL() : null;
  }
  onFrameChange() {
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (!overlayModel) {
      return;
    }
    this.showDeviceOverlaysIfApplicable(overlayModel);
  }
  onFrameNavigated(event) {
    if (event.data.isMainFrame()) {
      this.#revokeLastScreenshotBlobUrl();
    }
    this.onFrameChange();
  }
  onScreenOrientationLockChanged(event) {
    this.#screenOrientationLocked = event.data.locked;
    if (event.data.locked && event.data.orientation) {
      this.applyOrientationLock(event.data.orientation);
    }
    this.dispatchEventToListeners("Updated" /* UPDATED */);
  }
  applyOrientationLock(orientation) {
    const wantsLandscape = orientation.type === Emulation.ScreenOrientationType.LandscapePrimary || orientation.type === Emulation.ScreenOrientationType.LandscapeSecondary;
    if (this.#type === "Device" /* Device */ && this.#device && this.#mode) {
      const isCurrentlyLandscape = this.#mode.orientation === Horizontal || this.#mode.orientation === HorizontalSpanned;
      if (wantsLandscape !== isCurrentlyLandscape) {
        const rotationPartner = this.#device.getRotationPartner(this.#mode);
        if (rotationPartner) {
          this.emulate(this.#type, this.#device, rotationPartner);
        }
      }
    } else if (this.#type === "Responsive" /* Responsive */) {
      const appliedSize = this.appliedDeviceSize();
      const isCurrentlyLandscape = appliedSize.width > appliedSize.height;
      if (wantsLandscape !== isCurrentlyLandscape) {
        this.setSizeAndScaleToFit(appliedSize.height, appliedSize.width);
      }
    }
  }
  isScreenOrientationLocked() {
    return this.#screenOrientationLocked;
  }
  scaleSettingChanged() {
    this.calculateAndEmulate(false);
  }
  widthSettingChanged() {
    this.calculateAndEmulate(false);
  }
  heightSettingChanged() {
    this.calculateAndEmulate(false);
  }
  uaSettingChanged() {
    this.calculateAndEmulate(true);
  }
  deviceScaleFactorSettingChanged() {
    this.calculateAndEmulate(false);
  }
  preferredScaledWidth() {
    return Math.floor(this.#preferredSize.width / (this.#scaleSetting.get() || 1));
  }
  preferredScaledHeight() {
    return Math.floor(this.#preferredSize.height / (this.#scaleSetting.get() || 1));
  }
  currentSafeAreaInsets() {
    if (!Root2.Runtime.hostConfig.devToolsMobileSafeAreaEmulation?.enabled) {
      return null;
    }
    if (this.#type !== "Device" /* Device */ || !this.#mode) {
      return null;
    }
    return this.#mode.safeAreaInsets ?? null;
  }
  applySafeAreaInsets(insets) {
    if (!this.#emulationModel) {
      return;
    }
    if (insets && Root2.Runtime.hostConfig.devToolsMobileSafeAreaEmulation?.enabled) {
      void this.#emulationModel.setSafeAreaInsets(
        { top: insets.top, left: insets.left, bottom: insets.bottom, right: insets.right }
      );
    } else {
      void this.#emulationModel.setSafeAreaInsets({});
    }
  }
  getScreenOrientationType() {
    if (!this.#mode) {
      throw new Error("Mode required to get orientation type.");
    }
    switch (this.#mode.orientation) {
      case VerticalSpanned:
      case Vertical:
        return Emulation.ScreenOrientationType.PortraitPrimary;
      case HorizontalSpanned:
      case Horizontal:
      default:
        return Emulation.ScreenOrientationType.LandscapePrimary;
    }
  }
  calculateAndEmulate(resetPageScaleFactor) {
    if (!this.#emulationModel) {
      this.#onModelAvailable = this.calculateAndEmulate.bind(this, resetPageScaleFactor);
    }
    const mobile = this.isMobile();
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      this.showDeviceOverlaysIfApplicable(overlayModel);
    }
    if (this.#type === "Device" /* Device */ && this.#device && this.#mode) {
      const orientation = this.#device.orientationByName(this.#mode.orientation);
      this.#fitScale = this.calculateFitScale(orientation.width, orientation.height);
      if (mobile) {
        this.#appliedUserAgentType = this.#device.touch() ? "Mobile" /* MOBILE */ : "Mobile (no touch)" /* MOBILE_NO_TOUCH */;
      } else {
        this.#appliedUserAgentType = this.#device.touch() ? "Desktop (touch)" /* DESKTOP_TOUCH */ : "Desktop" /* DESKTOP */;
      }
      this.applyDeviceMetrics(
        new Geometry.Size(orientation.width, orientation.height),
        this.#scaleSetting.get(),
        this.#device.deviceScaleFactor,
        mobile,
        this.getScreenOrientationType(),
        resetPageScaleFactor
      );
      this.applyUserAgent(this.#device.userAgent, this.#device.userAgentMetadata);
      this.applyTouch(this.#device.touch(), mobile);
    } else if (this.#type === "None" /* None */) {
      this.#fitScale = this.calculateFitScale(this.#availableSize.width, this.#availableSize.height);
      this.#appliedUserAgentType = "Desktop" /* DESKTOP */;
      this.applyDeviceMetrics(this.#availableSize, 1, 0, mobile, null, resetPageScaleFactor);
      this.applyUserAgent("", null);
      this.applyTouch(false, false);
    } else if (this.#type === "Responsive" /* Responsive */) {
      let screenWidth = this.#widthSetting.get();
      if (!screenWidth || screenWidth > this.preferredScaledWidth()) {
        screenWidth = this.preferredScaledWidth();
      }
      let screenHeight = this.#heightSetting.get();
      if (!screenHeight || screenHeight > this.preferredScaledHeight()) {
        screenHeight = this.preferredScaledHeight();
      }
      const defaultDeviceScaleFactor = mobile ? defaultMobileScaleFactor : 0;
      this.#fitScale = this.calculateFitScale(this.#widthSetting.get(), this.#heightSetting.get());
      this.#appliedUserAgentType = this.#uaSetting.get();
      this.applyDeviceMetrics(
        new Geometry.Size(screenWidth, screenHeight),
        this.#scaleSetting.get(),
        this.#deviceScaleFactorSetting.get() || defaultDeviceScaleFactor,
        mobile,
        screenHeight >= screenWidth ? Emulation.ScreenOrientationType.PortraitPrimary : Emulation.ScreenOrientationType.LandscapePrimary,
        resetPageScaleFactor
      );
      this.applyUserAgent(
        mobile ? _DeviceModeModel.defaultMobileUserAgent() : "",
        mobile ? _DeviceModeModel.defaultMobileUserAgentMetadata() : null
      );
      this.applyTouch(
        this.#uaSetting.get() === "Desktop (touch)" /* DESKTOP_TOUCH */ || this.#uaSetting.get() === "Mobile" /* MOBILE */,
        this.#uaSetting.get() === "Mobile" /* MOBILE */
      );
    }
    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(this.#type === "None" /* None */);
    }
    this.applySafeAreaInsets(this.currentSafeAreaInsets());
    this.dispatchEventToListeners("Updated" /* UPDATED */);
  }
  calculateFitScale(screenWidth, screenHeight) {
    let scale = Math.min(
      screenWidth ? this.#preferredSize.width / screenWidth : 1,
      screenHeight ? this.#preferredSize.height / screenHeight : 1
    );
    scale = Math.min(Math.floor(scale * 100), 100);
    let sharpScale = scale;
    while (sharpScale > scale * 0.7) {
      let sharp = true;
      if (screenWidth) {
        sharp = sharp && Number.isInteger(screenWidth * sharpScale / 100);
      }
      if (screenHeight) {
        sharp = sharp && Number.isInteger(screenHeight * sharpScale / 100);
      }
      if (sharp) {
        return sharpScale / 100;
      }
      sharpScale -= 1;
    }
    return scale / 100;
  }
  setSizeAndScaleToFit(width, height) {
    this.#scaleSetting.set(this.calculateFitScale(width, height));
    this.setWidth(width);
    this.setHeight(height);
  }
  applyUserAgent(userAgent, userAgentMetadata) {
    this.#multitargetNetworkManager.setUserAgentOverride(userAgent, userAgent ? userAgentMetadata : null);
  }
  applyDeviceMetrics(screenSize, scale, deviceScaleFactor, mobile, screenOrientation, resetPageScaleFactor) {
    screenSize.width = Math.max(1, Math.floor(screenSize.width));
    screenSize.height = Math.max(1, Math.floor(screenSize.height));
    let pageWidth = screenSize.width;
    let pageHeight = screenSize.height;
    const positionX = 0;
    const positionY = 0;
    const screenOrientationAngle = screenOrientation === Emulation.ScreenOrientationType.LandscapePrimary ? 90 : 0;
    this.#appliedDeviceSize = screenSize;
    this.#appliedDeviceScaleFactor = deviceScaleFactor || window.devicePixelRatio;
    this.#screenRect = new Rect(
      Math.max(0, (this.#availableSize.width - screenSize.width * scale) / 2),
      0,
      screenSize.width * scale,
      screenSize.height * scale
    );
    this.#visiblePageRect = new Rect(
      positionX * scale,
      positionY * scale,
      Math.min(pageWidth * scale, this.#availableSize.width - this.#screenRect.left - positionX * scale),
      Math.min(pageHeight * scale, this.#availableSize.height - this.#screenRect.top - positionY * scale)
    );
    this.#scale = scale;
    const displayFeature = this.getDisplayFeature();
    if (!displayFeature) {
      if (scale === 1 && this.#availableSize.width >= screenSize.width && this.#availableSize.height >= screenSize.height) {
        pageWidth = 0;
        pageHeight = 0;
      }
      if (this.#visiblePageRect.width === pageWidth * scale && this.#visiblePageRect.height === pageHeight * scale && Number.isInteger(pageWidth * scale) && Number.isInteger(pageHeight * scale)) {
        pageWidth = 0;
        pageHeight = 0;
      }
    }
    if (!this.#emulationModel) {
      return;
    }
    if (resetPageScaleFactor) {
      void this.#emulationModel.resetPageScaleFactor();
    }
    if (pageWidth || pageHeight || mobile || deviceScaleFactor || scale !== 1 || screenOrientation || displayFeature) {
      const metrics = {
        width: pageWidth,
        height: pageHeight,
        deviceScaleFactor,
        mobile,
        scale,
        screenWidth: screenSize.width,
        screenHeight: screenSize.height,
        positionX,
        positionY,
        dontSetVisibleSize: true
      };
      if (displayFeature) {
        metrics.displayFeature = displayFeature;
        metrics.devicePosture = { type: Emulation.DevicePostureType.Folded };
      } else {
        metrics.devicePosture = { type: Emulation.DevicePostureType.Continuous };
      }
      if (screenOrientation) {
        metrics.screenOrientation = { type: screenOrientation, angle: screenOrientationAngle };
      }
      void this.#emulationModel.emulateDevice(metrics);
    } else {
      void this.#emulationModel.emulateDevice(null);
    }
  }
  exitHingeMode() {
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      overlayModel.showHingeForDualScreen(null);
    }
  }
  async #captureScreenshot(fullSize, clip) {
    const screenCaptureModel = this.#emulationModel ? this.#emulationModel.target().model(SDK2.ScreenCaptureModel.ScreenCaptureModel) : null;
    if (!screenCaptureModel) {
      return null;
    }
    let screenshotMode;
    if (clip) {
      screenshotMode = SDK2.ScreenCaptureModel.ScreenshotMode.FROM_CLIP;
    } else if (fullSize) {
      screenshotMode = SDK2.ScreenCaptureModel.ScreenshotMode.FULLPAGE;
    } else {
      screenshotMode = SDK2.ScreenCaptureModel.ScreenshotMode.FROM_VIEWPORT;
    }
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(false);
    }
    if (this.#emulationModel && this.#device && this.#mode) {
      const orientation = this.#device.orientationByName(this.#mode.orientation);
      const deviceMetrics = {
        width: orientation.width,
        height: orientation.height,
        deviceScaleFactor: this.#device.deviceScaleFactor,
        mobile: this.isMobile()
      };
      const dispFeature = this.getDisplayFeature();
      if (dispFeature) {
        deviceMetrics.displayFeature = dispFeature;
      }
      await this.#emulationModel.emulateDevice(deviceMetrics);
    }
    try {
      const screenshot = await screenCaptureModel.captureScreenshot(
        Page.CaptureScreenshotRequestFormat.Png,
        100,
        screenshotMode,
        clip
      );
      return screenshot;
    } finally {
      await this.#emulationModel?.emulateDevice(null);
      overlayModel?.setShowViewportSizeOnResize(this.#type === "None" /* None */);
      this.calculateAndEmulate(false);
    }
  }
  async captureScreenshot() {
    const screenshot = await this.#captureScreenshot(false);
    if (screenshot === null) {
      return;
    }
    const pageImage = new Image();
    pageImage.src = "data:image/png;base64," + screenshot;
    pageImage.onload = async () => {
      const scale = pageImage.naturalWidth / this.screenRect().width;
      const screenRect = this.screenRect().scale(scale);
      const visiblePageRect = this.visiblePageRect().scale(scale);
      const contentLeft = visiblePageRect.left;
      const contentTop = visiblePageRect.top;
      const canvas = new OffscreenCanvas(
        Math.floor(screenRect.width),
        // Cap the height to not hit the GPU limit.
        // https://crbug.com/1260828
        Math.min(1 << 14, Math.floor(screenRect.height))
      );
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2d context from canvas.");
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pageImage, Math.floor(contentLeft), Math.floor(contentTop));
      void this.saveScreenshot(canvas);
    };
  }
  async captureFullSizeScreenshot() {
    const screenshot = await this.#captureScreenshot(true);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }
  async captureAreaScreenshot(clip) {
    const screenshot = await this.#captureScreenshot(false, clip);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }
  saveScreenshotBase64(screenshot) {
    const pageImage = new Image();
    pageImage.src = "data:image/png;base64," + screenshot;
    pageImage.onload = () => {
      const canvas = new OffscreenCanvas(
        pageImage.naturalWidth,
        // Cap the height to not hit the GPU limit.
        // https://crbug.com/1260828
        Math.min(1 << 14, Math.floor(pageImage.naturalHeight))
      );
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2d context for base64 screenshot.");
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pageImage, 0, 0);
      void this.saveScreenshot(canvas);
    };
  }
  paintImage(ctx, src, rect) {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.srcset = src;
      image.onerror = () => resolve();
      image.onload = () => {
        ctx.drawImage(image, rect.left, rect.top, rect.width, rect.height);
        resolve();
      };
    });
  }
  async saveScreenshot(canvas) {
    const url = this.inspectedURL();
    let fileName = "";
    if (url) {
      const withoutFragment = Platform.StringUtilities.removeURLFragment(url);
      fileName = Platform.StringUtilities.trimURL(withoutFragment);
    }
    const device = this.device();
    if (device && this.type() === "Device" /* Device */) {
      fileName += `(${device.title})`;
    }
    this.#revokeLastScreenshotBlobUrl();
    const link = document.createElement("a");
    link.download = fileName + ".png";
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const blobUrl = URL.createObjectURL(blob);
    this.#lastScreenshotBlobUrl = blobUrl;
    link.href = blobUrl;
    link.click();
  }
  #revokeLastScreenshotBlobUrl() {
    if (this.#lastScreenshotBlobUrl) {
      URL.revokeObjectURL(this.#lastScreenshotBlobUrl);
      this.#lastScreenshotBlobUrl = null;
    }
  }
  applyTouch(touchEnabled, mobile) {
    this.#touchEnabled = touchEnabled;
    this.#touchMobile = mobile;
    for (const emulationModel of this.#targetManager.models(SDK2.EmulationModel.EmulationModel)) {
      void emulationModel.emulateTouch(touchEnabled, mobile);
    }
  }
  showDeviceOverlaysIfApplicable(overlayModel) {
    const orientation = this.#device && this.#mode ? this.#device.orientationByName(this.#mode.orientation) : null;
    if (orientation?.hinge) {
      overlayModel.showHingeForDualScreen(orientation.hinge);
    } else {
      overlayModel.showHingeForDualScreen(null);
    }
    overlayModel.showDisplayCutout(
      Root2.Runtime.hostConfig.devToolsMobileSafeAreaEmulation?.enabled ? this.currentDisplayCutout() : null
    );
  }
  currentDisplayCutout() {
    if (!Root2.Runtime.hostConfig.devToolsMobileSafeAreaEmulation?.enabled) {
      return null;
    }
    const device = this.#device;
    const mode = this.#mode;
    if (!device || !mode || !device.modes.includes(mode)) {
      return null;
    }
    const cutout = mode.cutout;
    if (cutout) {
      return this.toDisplayCutout(cutout);
    }
    if (mode.orientation !== Horizontal) {
      return null;
    }
    const rotationPartner = device.getRotationPartner(mode);
    const rotatedCutout = rotationPartner?.cutout;
    if (rotationPartner?.orientation !== Vertical || !rotatedCutout) {
      return null;
    }
    const orientation = device.orientationByName(mode.orientation);
    if (rotatedCutout.shape === "circle" /* CIRCLE */) {
      return this.toDisplayCutout({
        ...rotatedCutout,
        x: orientation.width - rotatedCutout.y - rotatedCutout.height,
        y: rotatedCutout.x,
        width: rotatedCutout.height,
        height: rotatedCutout.width,
        cx: orientation.width - rotatedCutout.cy,
        cy: rotatedCutout.cx
      });
    }
    return this.toDisplayCutout({
      ...rotatedCutout,
      x: orientation.width - rotatedCutout.y - rotatedCutout.height,
      y: rotatedCutout.x,
      width: rotatedCutout.height,
      height: rotatedCutout.width
    });
  }
  toDisplayCutout(cutout) {
    const { shape, ...rest } = cutout;
    return {
      ...rest,
      shape: CUTOUT_SHAPE_TO_PROTOCOL[shape],
      contentColor: { r: 0, g: 0, b: 0, a: 1 }
    };
  }
  getDisplayFeatureOrientation() {
    if (!this.#mode) {
      throw new Error("Mode required to get display feature orientation.");
    }
    switch (this.#mode.orientation) {
      case VerticalSpanned:
      case Vertical:
        return Emulation.DisplayFeatureOrientation.Vertical;
      case HorizontalSpanned:
      case Horizontal:
      default:
        return Emulation.DisplayFeatureOrientation.Horizontal;
    }
  }
  getDisplayFeature() {
    if (!this.#device || !this.#mode || this.#mode.orientation !== VerticalSpanned && this.#mode.orientation !== HorizontalSpanned) {
      return null;
    }
    const orientation = this.#device.orientationByName(this.#mode.orientation);
    if (!orientation?.hinge) {
      return null;
    }
    const hinge = orientation.hinge;
    return {
      orientation: this.getDisplayFeatureOrientation(),
      offset: this.#mode.orientation === VerticalSpanned ? hinge.x : hinge.y,
      maskLength: this.#mode.orientation === VerticalSpanned ? hinge.width : hinge.height
    };
  }
  /**
   * Heuristic to keep the default mobile User Agent fresh and aligned with the adoption bell curve.
   * Android: We target N-1 versions (where N is the latest) to represent the plurality of global users.
   * iOS: We follow the calendar year (starting from the 2025 shift to year-based versioning).
   * Data sources:
   * - StatCounter Global Stats: https://gs.statcounter.com/os-version-market-share/android
   * - Android adoption typically lags by ~12-18 months for plurality.
   * - iOS adoption typically reaches majority within ~3-6 months.
   */
  static getDynamicMobileUA() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const isLateInYear = now.getMonth() >= 9;
    const androidVersion = isLateInYear ? year - 2010 : year - 2011;
    const pixelModel = isLateInYear ? year - 2016 : year - 2017;
    const ua = `Mozilla/5.0 (Linux; Android ${androidVersion}; Pixel ${pixelModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36`;
    const metadata = {
      platform: "Android",
      platformVersion: androidVersion.toString(),
      architecture: "",
      model: `Pixel ${pixelModel}`,
      mobile: true
    };
    return { userAgent: ua, metadata };
  }
  static defaultMobileUserAgent() {
    return SDK2.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(
      _DeviceModeModel.getDynamicMobileUA().userAgent
    );
  }
  static defaultMobileUserAgentMetadata() {
    return _DeviceModeModel.getDynamicMobileUA().metadata;
  }
};
var Insets = class {
  constructor(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }
  left;
  top;
  right;
  bottom;
  isEqual(insets) {
    return insets !== null && this.left === insets.left && this.top === insets.top && this.right === insets.right && this.bottom === insets.bottom;
  }
};
var Rect = class _Rect {
  constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }
  left;
  top;
  width;
  height;
  isEqual(rect) {
    return rect !== null && this.left === rect.left && this.top === rect.top && this.width === rect.width && this.height === rect.height;
  }
  scale(scale) {
    return new _Rect(this.left * scale, this.top * scale, this.width * scale, this.height * scale);
  }
  relativeTo(origin) {
    return new _Rect(this.left - origin.left, this.top - origin.top, this.width, this.height);
  }
  rebaseTo(origin) {
    return new _Rect(this.left + origin.left, this.top + origin.top, this.width, this.height);
  }
};
var Events2 = /* @__PURE__ */ ((Events3) => {
  Events3["UPDATED"] = "Updated";
  return Events3;
})(Events2 || {});
var Type2 = /* @__PURE__ */ ((Type3) => {
  Type3["None"] = "None";
  Type3["Responsive"] = "Responsive";
  Type3["Device"] = "Device";
  return Type3;
})(Type2 || {});
var UA = /* @__PURE__ */ ((UA2) => {
  UA2["MOBILE"] = "Mobile";
  UA2["MOBILE_NO_TOUCH"] = "Mobile (no touch)";
  UA2["DESKTOP"] = "Desktop";
  UA2["DESKTOP_TOUCH"] = "Desktop (touch)";
  return UA2;
})(UA || {});
var MinDeviceSize = 50;
var MaxDeviceSize = 9999;
var MinDeviceScaleFactor = 0;
var MaxDeviceScaleFactor = 10;
var MaxDeviceNameLength = 50;
var defaultMobileScaleFactor = 2;
export {
  DeviceModeModel_exports as DeviceModeModel,
  EmulatedDevices_exports as EmulatedDevices
};
//# sourceMappingURL=emulation.js.map
