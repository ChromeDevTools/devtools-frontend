var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/trace/insights/Cache.ts
var Cache_exports = {};
__export(Cache_exports, {
  UIStrings: () => UIStrings,
  cachingDisabled: () => cachingDisabled,
  computeCacheLifetimeInSeconds: () => computeCacheLifetimeInSeconds,
  createOverlayForRequest: () => createOverlayForRequest,
  createOverlays: () => createOverlays,
  generateInsight: () => generateInsight,
  getCombinedHeaders: () => getCombinedHeaders,
  i18nString: () => i18nString,
  isCacheInsight: () => isCacheInsight,
  isCacheable: () => isCacheable
});
import * as i18n from "../../../core/i18n/i18n.js";

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
((Network6) => {
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
  })(ResourceType = Network6.ResourceType || (Network6.ResourceType = {}));
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
  })(ErrorReason = Network6.ErrorReason || (Network6.ErrorReason = {}));
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
  })(ConnectionType = Network6.ConnectionType || (Network6.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network6.CookieSameSite || (Network6.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network6.CookiePriority || (Network6.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network6.CookieSourceScheme || (Network6.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network6.ResourcePriority || (Network6.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network6.RenderBlockingBehavior || (Network6.RenderBlockingBehavior = {}));
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
  })(RequestReferrerPolicy = Network6.RequestReferrerPolicy || (Network6.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network6.CertificateTransparencyCompliance || (Network6.CertificateTransparencyCompliance = {}));
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
  })(BlockedReason = Network6.BlockedReason || (Network6.BlockedReason = {}));
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
  })(CorsError = Network6.CorsError || (Network6.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network6.ServiceWorkerResponseSource || (Network6.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network6.TrustTokenParamsRefreshPolicy || (Network6.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network6.TrustTokenOperationType || (Network6.TrustTokenOperationType = {}));
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
  })(AlternateProtocolUsage = Network6.AlternateProtocolUsage || (Network6.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network6.ServiceWorkerRouterSource || (Network6.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network6.InitiatorType || (Network6.InitiatorType = {}));
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
  })(SetCookieBlockedReason = Network6.SetCookieBlockedReason || (Network6.SetCookieBlockedReason = {}));
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
  })(CookieBlockedReason = Network6.CookieBlockedReason || (Network6.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network6.CookieExemptionReason || (Network6.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network6.AuthChallengeSource || (Network6.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network6.AuthChallengeResponseResponse || (Network6.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network6.SignedExchangeErrorField || (Network6.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network6.DirectSocketDnsQueryType || (Network6.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network6.LocalNetworkAccessRequestPolicy || (Network6.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network6.IPAddressSpace || (Network6.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network6.CrossOriginOpenerPolicyValue || (Network6.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network6.CrossOriginEmbedderPolicyValue || (Network6.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network6.ContentSecurityPolicySource || (Network6.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network6.ReportStatus || (Network6.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network6.DeviceBoundSessionWithUsageUsage || (Network6.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network6.DeviceBoundSessionUrlRuleRuleType || (Network6.DeviceBoundSessionUrlRuleRuleType = {}));
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
  })(DeviceBoundSessionFetchResult = Network6.DeviceBoundSessionFetchResult || (Network6.DeviceBoundSessionFetchResult = {}));
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
  })(RefreshEventDetailsRefreshResult = Network6.RefreshEventDetailsRefreshResult || (Network6.RefreshEventDetailsRefreshResult = {}));
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
  })(TerminationEventDetailsDeletionReason = Network6.TerminationEventDetailsDeletionReason || (Network6.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network6.ChallengeEventDetailsChallengeResult || (Network6.ChallengeEventDetailsChallengeResult = {}));
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
  })(TrustTokenOperationDoneEventStatus = Network6.TrustTokenOperationDoneEventStatus || (Network6.TrustTokenOperationDoneEventStatus = {}));
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

// ../../front_end/models/trace/insights/Cache.ts
import * as Helpers2 from "../helpers/helpers.js";

// ../../front_end/models/trace/insights/Common.ts
var Common_exports = {};
__export(Common_exports, {
  calculateDocFirstByteTs: () => calculateDocFirstByteTs,
  calculateMetricWeightsForSorting: () => calculateMetricWeightsForSorting,
  estimateCompressedContentSize: () => estimateCompressedContentSize,
  estimateCompressionRatioForScript: () => estimateCompressionRatioForScript,
  evaluateCLSMetricScore: () => evaluateCLSMetricScore,
  evaluateINPMetricScore: () => evaluateINPMetricScore,
  evaluateLCPMetricScore: () => evaluateLCPMetricScore,
  getCLS: () => getCLS,
  getFieldMetricsForInsightSet: () => getFieldMetricsForInsightSet,
  getINP: () => getINP,
  getInsight: () => getInsight,
  getLCP: () => getLCP,
  insightBounds: () => insightBounds,
  isInsightKey: () => isInsightKey,
  isRequestCompressed: () => isRequestCompressed,
  isRequestServedFromBrowserCache: () => isRequestServedFromBrowserCache,
  metricSavingsForWastedBytes: () => metricSavingsForWastedBytes
});
import * as Helpers from "../helpers/helpers.js";
import * as Types from "../types/types.js";

// ../../front_end/models/trace/insights/Statistics.ts
var Statistics_exports = {};
__export(Statistics_exports, {
  getLogNormalScore: () => getLogNormalScore,
  linearInterpolation: () => linearInterpolation
});
var MIN_PASSING_SCORE = 0.9;
var MAX_AVERAGE_SCORE = 0.8999999999999999;
var MIN_AVERAGE_SCORE = 0.5;
var MAX_FAILING_SCORE = 0.49999999999999994;
function erf(x) {
  const sign = Math.sign(x);
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return sign * (1 - y * Math.exp(-x * x));
}
function getLogNormalScore({ median, p10 }, value) {
  if (median <= 0) {
    throw new Error("median must be greater than zero");
  }
  if (p10 <= 0) {
    throw new Error("p10 must be greater than zero");
  }
  if (p10 >= median) {
    throw new Error("p10 must be less than the median");
  }
  if (value <= 0) {
    return 1;
  }
  const INVERSE_ERFC_ONE_FIFTH = 0.9061938024368232;
  const xRatio = Math.max(Number.MIN_VALUE, value / median);
  const xLogRatio = Math.log(xRatio);
  const p10Ratio = Math.max(Number.MIN_VALUE, p10 / median);
  const p10LogRatio = -Math.log(p10Ratio);
  const standardizedX = xLogRatio * INVERSE_ERFC_ONE_FIFTH / p10LogRatio;
  const complementaryPercentile = (1 - erf(standardizedX)) / 2;
  let score;
  if (value <= p10) {
    score = Math.max(MIN_PASSING_SCORE, Math.min(1, complementaryPercentile));
  } else if (value <= median) {
    score = Math.max(MIN_AVERAGE_SCORE, Math.min(MAX_AVERAGE_SCORE, complementaryPercentile));
  } else {
    score = Math.max(0, Math.min(MAX_FAILING_SCORE, complementaryPercentile));
  }
  return score;
}
function linearInterpolation(x0, y0, x1, y1, x) {
  const slope = (y1 - y0) / (x1 - x0);
  return y0 + (x - x0) * slope;
}

// ../../front_end/models/trace/insights/types.ts
var types_exports = {};
__export(types_exports, {
  InsightCategory: () => InsightCategory,
  InsightKeys: () => InsightKeys,
  InsightWarning: () => InsightWarning
});
var InsightWarning = /* @__PURE__ */ ((InsightWarning2) => {
  InsightWarning2["NO_FP"] = "NO_FP";
  InsightWarning2["NO_LCP"] = "NO_LCP";
  InsightWarning2["NO_DOCUMENT_REQUEST"] = "NO_DOCUMENT_REQUEST";
  InsightWarning2["NO_LAYOUT"] = "NO_LAYOUT";
  return InsightWarning2;
})(InsightWarning || {});
var InsightCategory = /* @__PURE__ */ ((InsightCategory2) => {
  InsightCategory2["ALL"] = "All";
  InsightCategory2["INP"] = "INP";
  InsightCategory2["LCP"] = "LCP";
  InsightCategory2["CLS"] = "CLS";
  return InsightCategory2;
})(InsightCategory || {});
var InsightKeys = /* @__PURE__ */ ((InsightKeys2) => {
  InsightKeys2["LCP_BREAKDOWN"] = "LCPBreakdown";
  InsightKeys2["INP_BREAKDOWN"] = "INPBreakdown";
  InsightKeys2["CLS_CULPRITS"] = "CLSCulprits";
  InsightKeys2["THIRD_PARTIES"] = "ThirdParties";
  InsightKeys2["DOCUMENT_LATENCY"] = "DocumentLatency";
  InsightKeys2["DOM_SIZE"] = "DOMSize";
  InsightKeys2["DUPLICATE_JAVASCRIPT"] = "DuplicatedJavaScript";
  InsightKeys2["FONT_DISPLAY"] = "FontDisplay";
  InsightKeys2["FORCED_REFLOW"] = "ForcedReflow";
  InsightKeys2["IMAGE_DELIVERY"] = "ImageDelivery";
  InsightKeys2["LCP_DISCOVERY"] = "LCPDiscovery";
  InsightKeys2["LEGACY_JAVASCRIPT"] = "LegacyJavaScript";
  InsightKeys2["NETWORK_DEPENDENCY_TREE"] = "NetworkDependencyTree";
  InsightKeys2["RENDER_BLOCKING"] = "RenderBlocking";
  InsightKeys2["SLOW_CSS_SELECTOR"] = "SlowCSSSelector";
  InsightKeys2["VIEWPORT"] = "Viewport";
  InsightKeys2["MODERN_HTTP"] = "ModernHTTP";
  InsightKeys2["CACHE"] = "Cache";
  InsightKeys2["CHARACTER_SET"] = "CharacterSet";
  return InsightKeys2;
})(InsightKeys || {});

// ../../front_end/models/trace/insights/Common.ts
var GRAPH_SAVINGS_PRECISION = 50;
function getInsight(insightName, insightSet) {
  return insightSet.model[insightName];
}
function isInsightKey(key) {
  return Object.values(InsightKeys).includes(key);
}
function getLCP(insightSet) {
  const insight = getInsight("LCPBreakdown" /* LCP_BREAKDOWN */, insightSet);
  if (!insight || !insight.lcpMs || !insight.lcpEvent) {
    return null;
  }
  const value = Helpers.Timing.milliToMicro(insight.lcpMs);
  return { value, event: insight.lcpEvent };
}
function getINP(insightSet) {
  const insight = getInsight("INPBreakdown" /* INP_BREAKDOWN */, insightSet);
  if (!insight?.longestInteractionEvent?.dur) {
    return null;
  }
  const value = insight.longestInteractionEvent.dur;
  return { value, event: insight.longestInteractionEvent };
}
function getCLS(insightSet) {
  const insight = getInsight("CLSCulprits" /* CLS_CULPRITS */, insightSet);
  if (!insight) {
    return { value: 0, worstClusterEvent: null };
  }
  let maxScore = 0;
  let worstCluster;
  for (const cluster of insight.clusters) {
    if (cluster.clusterCumulativeScore > maxScore) {
      maxScore = cluster.clusterCumulativeScore;
      worstCluster = cluster;
    }
  }
  return { value: maxScore, worstClusterEvent: worstCluster ?? null };
}
function evaluateLCPMetricScore(value) {
  return getLogNormalScore({ p10: 2500, median: 4e3 }, value);
}
function evaluateINPMetricScore(value) {
  return getLogNormalScore({ p10: 200, median: 500 }, value);
}
function evaluateCLSMetricScore(value) {
  return getLogNormalScore({ p10: 0.1, median: 0.25 }, value);
}
function getPageResult(cruxFieldData, url, origin, scope = null) {
  return cruxFieldData.find((result) => {
    const key = scope ? result[`${scope.pageScope}-${scope.deviceScope}`]?.record.key : (result["url-ALL"] || result["origin-ALL"])?.record.key;
    return key?.url && key.url === url || key?.origin && key.origin === origin;
  });
}
function getMetricResult(pageResult, name, scope = null) {
  const scopes = [];
  if (scope) {
    scopes.push(scope);
  } else {
    scopes.push({ pageScope: "url", deviceScope: "ALL" });
    scopes.push({ pageScope: "origin", deviceScope: "ALL" });
  }
  for (const scope2 of scopes) {
    const key = `${scope2.pageScope}-${scope2.deviceScope}`;
    let value = pageResult[key]?.record.metrics[name]?.percentiles?.p75;
    if (typeof value === "string") {
      value = Number(value);
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return { value, pageScope: scope2.pageScope };
    }
  }
  return null;
}
function getMetricTimingResult(pageResult, name, scope = null) {
  const result = getMetricResult(pageResult, name, scope);
  if (result) {
    const valueMs = result.value;
    return { value: Helpers.Timing.milliToMicro(valueMs), pageScope: result.pageScope };
  }
  return null;
}
function getFieldMetricsForInsightSet(insightSet, metadata, scope = null) {
  const cruxFieldData = metadata?.cruxFieldData;
  if (!cruxFieldData) {
    return null;
  }
  let pageResult = getPageResult(cruxFieldData, insightSet.url.href, insightSet.url.origin, scope);
  if (!pageResult && insightSet.navigation && Types.Events.isSoftNavigationStart(insightSet.navigation)) {
    pageResult = cruxFieldData.find((result) => {
      const key = scope ? result[`${scope.pageScope}-${scope.deviceScope}`]?.record.key : (result["url-ALL"] || result["origin-ALL"])?.record.key;
      if (!key) {
        return false;
      }
      if (key.url) {
        try {
          return new URL(key.url).origin === insightSet.url.origin;
        } catch {
          return false;
        }
      }
      return key.origin === insightSet.url.origin;
    });
  }
  if (!pageResult) {
    return null;
  }
  return {
    fcp: getMetricTimingResult(pageResult, "first_contentful_paint", scope),
    lcp: getMetricTimingResult(pageResult, "largest_contentful_paint", scope),
    inp: getMetricTimingResult(pageResult, "interaction_to_next_paint", scope),
    cls: getMetricResult(pageResult, "cumulative_layout_shift", scope),
    lcpBreakdown: {
      ttfb: getMetricTimingResult(pageResult, "largest_contentful_paint_image_time_to_first_byte", scope),
      loadDelay: getMetricTimingResult(pageResult, "largest_contentful_paint_image_resource_load_delay", scope),
      loadDuration: getMetricTimingResult(pageResult, "largest_contentful_paint_image_resource_load_duration", scope),
      renderDelay: getMetricTimingResult(pageResult, "largest_contentful_paint_image_element_render_delay", scope)
    }
  };
}
function calculateMetricWeightsForSorting(insightSet, metadata) {
  const weights = {
    lcp: 1 / 3,
    inp: 1 / 3,
    cls: 1 / 3
  };
  const cruxFieldData = metadata?.cruxFieldData;
  if (!cruxFieldData) {
    return weights;
  }
  const fieldMetrics = getFieldMetricsForInsightSet(insightSet, metadata);
  if (!fieldMetrics) {
    return weights;
  }
  const fieldLcp = fieldMetrics.lcp?.value ?? null;
  const fieldInp = fieldMetrics.inp?.value ?? null;
  const fieldCls = fieldMetrics.cls?.value ?? null;
  const fieldLcpScore = fieldLcp !== null ? evaluateLCPMetricScore(Helpers.Timing.microToMilli(fieldLcp)) : 0;
  const fieldInpScore = fieldInp !== null ? evaluateINPMetricScore(Helpers.Timing.microToMilli(fieldInp)) : 0;
  const fieldClsScore = fieldCls !== null ? evaluateCLSMetricScore(fieldCls) : 0;
  const fieldLcpScoreInverted = 1 - fieldLcpScore;
  const fieldInpScoreInverted = 1 - fieldInpScore;
  const fieldClsScoreInverted = 1 - fieldClsScore;
  const invertedSum = fieldLcpScoreInverted + fieldInpScoreInverted + fieldClsScoreInverted;
  if (!invertedSum) {
    return weights;
  }
  weights.lcp = fieldLcpScoreInverted / invertedSum;
  weights.inp = fieldInpScoreInverted / invertedSum;
  weights.cls = fieldClsScoreInverted / invertedSum;
  return weights;
}
function estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, graph) {
  const simulationBeforeChanges = simulator.simulate(graph);
  const originalTransferSizes = /* @__PURE__ */ new Map();
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    const wastedBytes = wastedBytesByRequestId.get(node.request.requestId);
    if (!wastedBytes) {
      return;
    }
    const original = node.request.transferSize;
    originalTransferSizes.set(node.request.requestId, original);
    node.request.transferSize = Math.max(original - wastedBytes, 0);
  });
  const simulationAfterChanges = simulator.simulate(graph);
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    const originalTransferSize = originalTransferSizes.get(node.request.requestId);
    if (originalTransferSize === void 0) {
      return;
    }
    node.request.transferSize = originalTransferSize;
  });
  let savings = simulationBeforeChanges.timeInMs - simulationAfterChanges.timeInMs;
  savings = Math.round(savings / GRAPH_SAVINGS_PRECISION) * GRAPH_SAVINGS_PRECISION;
  return Types.Timing.Milli(savings);
}
function metricSavingsForWastedBytes(wastedBytesByRequestId, context) {
  if (!context.navigation || !("lantern" in context) || !context.lantern) {
    return;
  }
  if (!wastedBytesByRequestId.size) {
    return { FCP: Types.Timing.Milli(0), LCP: Types.Timing.Milli(0) };
  }
  const simulator = context.lantern.simulator;
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.optimisticGraph;
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.optimisticGraph;
  return {
    FCP: estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, fcpGraph),
    LCP: estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, lcpGraph)
  };
}
function isRequestCompressed(request) {
  if (!request.args.data.responseHeaders) {
    return false;
  }
  const patterns = [
    /^content-encoding$/i,
    /^x-content-encoding-over-network$/i,
    /^x-original-content-encoding$/i
    // Lightrider.
  ];
  const compressionTypes = ["gzip", "br", "deflate", "zstd"];
  return request.args.data.responseHeaders.some(
    (header) => patterns.some((p) => header.name.match(p)) && compressionTypes.includes(header.value)
  );
}
function isRequestServedFromBrowserCache(request) {
  if (!request.args.data.responseHeaders || request.args.data.failed) {
    return false;
  }
  if (request.args.data.statusCode === 304) {
    return true;
  }
  const { transferSize, resourceSize } = getRequestSizes(request);
  const ratio = resourceSize ? transferSize / resourceSize : 0;
  if (ratio < 0.01) {
    return true;
  }
  return false;
}
function getRequestSizes(request) {
  const resourceSize = request.args.data.decodedBodyLength;
  const transferSize = request.args.data.encodedDataLength;
  return { resourceSize, transferSize };
}
function estimateCompressedContentSize(request, totalBytes, resourceType) {
  if (!request || isRequestServedFromBrowserCache(request)) {
    switch (resourceType) {
      case "Stylesheet":
        return Math.round(totalBytes * 0.2);
      case "Script":
      case "Document":
        return Math.round(totalBytes * 0.33);
      default:
        return Math.round(totalBytes * 0.5);
    }
  }
  const { transferSize, resourceSize } = getRequestSizes(request);
  let contentTransferSize = transferSize;
  if (!isRequestCompressed(request)) {
    contentTransferSize = resourceSize;
  }
  if (request.args.data.resourceType === resourceType) {
    return contentTransferSize;
  }
  const compressionRatio = Number.isFinite(resourceSize) && resourceSize > 0 ? contentTransferSize / resourceSize : 1;
  return Math.round(totalBytes * compressionRatio);
}
function estimateCompressionRatioForScript(script) {
  if (!script.request) {
    return 1;
  }
  const request = script.request;
  const contentLength = request.args.data.decodedBodyLength ?? script.content?.length ?? 0;
  const compressedSize = estimateCompressedContentSize(request, contentLength, Network.ResourceType.Script);
  if (contentLength === 0 || compressedSize === 0) {
    return 1;
  }
  const compressionRatio = compressedSize / contentLength;
  return compressionRatio;
}
function calculateDocFirstByteTs(docRequest) {
  if (docRequest.args.data.protocol === "file") {
    return docRequest.ts;
  }
  const isLightrider = globalThis.isLightrider;
  if (isLightrider) {
    const lrServerResponseTime = docRequest.args.data.lrServerResponseTime;
    if (lrServerResponseTime !== void 0) {
      return Types.Timing.Micro(docRequest.ts + Helpers.Timing.milliToMicro(lrServerResponseTime));
    }
  }
  const timing = docRequest.args.data.timing;
  if (!timing) {
    return null;
  }
  return Types.Timing.Micro(
    Helpers.Timing.secondsToMicro(timing.requestTime) + Helpers.Timing.milliToMicro(timing.receiveHeadersStart ?? timing.receiveHeadersEnd)
  );
}
function insightBounds(insight, insightSetBounds) {
  const overlays = insight.createOverlays?.() ?? [];
  const windows = overlays.map(Helpers.Timing.traceWindowFromOverlay).filter((bounds) => !!bounds);
  const overlaysBounds = Helpers.Timing.combineTraceWindowsMicro(windows);
  if (overlaysBounds) {
    return overlaysBounds;
  }
  return insightSetBounds;
}

// ../../front_end/models/trace/insights/Cache.ts
var UIStrings = {
  /**
   * @description Title of an insight that provides information and suggestions of resources that could improve their caching.
   */
  title: "Use efficient cache lifetimes",
  /**
   * @description Text to tell the user about how caching can help improve performance.
   */
  description: "A long cache lifetime can speed up repeat visits to your page. [Learn more about caching](https://developer.chrome.com/docs/performance/insights/cache).",
  /**
   * @description Column for a font loaded by the page to render text.
   */
  requestColumn: "Request",
  /**
   * @description Column for a resource cache's Time To Live.
   */
  cacheTTL: "Cache TTL",
  /**
   * @description Text describing that there were no requests found that need caching.
   */
  noRequestsToCache: "No requests with inefficient cache policies",
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: "{PH1} others"
};
var str_ = i18n.i18n.registerUIStrings("models/trace/insights/Cache.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var IGNORE_THRESHOLD_IN_PERCENT = 0.925;
function finalize(partialModel) {
  return {
    insightKey: "Cache" /* CACHE */,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    docs: "https://developer.chrome.com/docs/performance/insights/cache",
    category: "All" /* ALL */,
    state: partialModel.requests.length > 0 ? "fail" : "pass",
    ...partialModel
  };
}
function isCacheable(request) {
  if (Helpers2.Network.NON_NETWORK_SCHEMES.includes(request.args.data.protocol)) {
    return false;
  }
  return Boolean(
    Helpers2.Network.CACHEABLE_STATUS_CODES.has(request.args.data.statusCode) && Helpers2.Network.STATIC_RESOURCE_TYPES.has(request.args.data.resourceType || Network.ResourceType.Other)
  );
}
function computeCacheLifetimeInSeconds(headers, cacheControl) {
  if (cacheControl?.["max-age"] !== void 0) {
    return cacheControl["max-age"];
  }
  const expiresHeaders = headers.find((h) => h.name === "expires")?.value ?? null;
  if (expiresHeaders) {
    const expires = new Date(expiresHeaders).getTime();
    if (!expires) {
      return 0;
    }
    return Math.ceil((expires - Date.now()) / 1e3);
  }
  return null;
}
function getCacheHitProbability(maxAgeInSeconds) {
  const RESOURCE_AGE_IN_HOURS_DECILES = [0, 0.2, 1, 3, 8, 12, 24, 48, 72, 168, 8760, Infinity];
  const maxAgeInHours = maxAgeInSeconds / 3600;
  const upperDecileIndex = RESOURCE_AGE_IN_HOURS_DECILES.findIndex((decile) => decile >= maxAgeInHours);
  if (upperDecileIndex === RESOURCE_AGE_IN_HOURS_DECILES.length - 1) {
    return 1;
  }
  if (upperDecileIndex === 0) {
    return 0;
  }
  const upperDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex];
  const lowerDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex - 1];
  const upperDecile = upperDecileIndex / 10;
  const lowerDecile = (upperDecileIndex - 1) / 10;
  return linearInterpolation(lowerDecileValue, lowerDecile, upperDecileValue, upperDecile, maxAgeInHours);
}
function getCombinedHeaders(responseHeaders) {
  const headers = /* @__PURE__ */ new Map();
  for (const header of responseHeaders) {
    const name = header.name.toLowerCase();
    if (headers.get(name)) {
      headers.set(name, `${headers.get(name)}, ${header.value}`);
    } else {
      headers.set(name, header.value);
    }
  }
  return headers;
}
function cachingDisabled(headers, parsedCacheControl) {
  const cacheControl = headers?.get("cache-control") ?? null;
  const pragma = headers?.get("pragma") ?? null;
  if (!cacheControl && pragma?.includes("no-cache")) {
    return true;
  }
  if (parsedCacheControl && (parsedCacheControl["must-revalidate"] || parsedCacheControl["no-cache"] || parsedCacheControl["no-store"] || parsedCacheControl["private"])) {
    return true;
  }
  return false;
}
function isCacheInsight(model) {
  return model.insightKey === "Cache" /* CACHE */;
}
function generateInsight(data, context) {
  const isWithinContext = (event) => Helpers2.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const results = [];
  let totalWastedBytes = 0;
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const req of contextRequests) {
    if (!req.args.data.responseHeaders || !isCacheable(req)) {
      continue;
    }
    const headers = getCombinedHeaders(req.args.data.responseHeaders);
    const cacheControl = headers.get("cache-control") ?? null;
    const parsedDirectives = Helpers2.Network.parseCacheControl(cacheControl);
    if (cachingDisabled(headers, parsedDirectives)) {
      continue;
    }
    let ttl = computeCacheLifetimeInSeconds(req.args.data.responseHeaders, parsedDirectives);
    if (ttl !== null && (!Number.isFinite(ttl) || ttl <= 0)) {
      continue;
    }
    ttl = ttl || 0;
    const ttlDays = ttl / 86400;
    if (ttlDays >= 30) {
      continue;
    }
    const cacheHitProbability = getCacheHitProbability(ttl);
    if (cacheHitProbability > IGNORE_THRESHOLD_IN_PERCENT) {
      continue;
    }
    const transferSize = req.args.data.encodedDataLength || 0;
    const wastedBytes = (1 - cacheHitProbability) * transferSize;
    wastedBytesByRequestId.set(req.args.data.requestId, wastedBytes);
    totalWastedBytes += wastedBytes;
    results.push({ request: req, ttl, wastedBytes });
  }
  results.sort((a, b) => {
    return b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength || a.ttl - b.ttl;
  });
  return finalize({
    relatedEvents: results.map((r) => r.request),
    requests: results,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: totalWastedBytes
  });
}
function createOverlayForRequest(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays(model) {
  return model.requests.map((req) => createOverlayForRequest(req.request));
}

// ../../front_end/models/trace/insights/Models.ts
var Models_exports = {};
__export(Models_exports, {
  CLSCulprits: () => CLSCulprits_exports,
  Cache: () => Cache_exports,
  CharacterSet: () => CharacterSet_exports,
  DOMSize: () => DOMSize_exports,
  DocumentLatency: () => DocumentLatency_exports,
  DuplicatedJavaScript: () => DuplicatedJavaScript_exports,
  FontDisplay: () => FontDisplay_exports,
  ForcedReflow: () => ForcedReflow_exports,
  INPBreakdown: () => INPBreakdown_exports,
  ImageDelivery: () => ImageDelivery_exports,
  LCPBreakdown: () => LCPBreakdown_exports,
  LCPDiscovery: () => LCPDiscovery_exports,
  LegacyJavaScript: () => LegacyJavaScript_exports,
  ModernHTTP: () => ModernHTTP_exports,
  NetworkDependencyTree: () => NetworkDependencyTree_exports,
  RenderBlocking: () => RenderBlocking_exports,
  SlowCSSSelector: () => SlowCSSSelector_exports,
  ThirdParties: () => ThirdParties_exports,
  Viewport: () => Viewport_exports
});

// ../../front_end/models/trace/insights/CharacterSet.ts
var CharacterSet_exports = {};
__export(CharacterSet_exports, {
  UIStrings: () => UIStrings2,
  createOverlays: () => createOverlays2,
  generateInsight: () => generateInsight2,
  i18nString: () => i18nString2,
  isCharacterSetInsight: () => isCharacterSetInsight
});
import * as i18n3 from "../../../core/i18n/i18n.js";
var UIStrings2 = {
  /**
   * @description Title of an insight that checks whether the page declares a character encoding early enough.
   */
  title: "Declare a character encoding",
  /**
   * @description Description of an insight that checks whether the page has a proper character encoding declaration via HTTP header or early meta tag.
   */
  description: "A character encoding declaration is required. It can be done with a meta charset tag in the first 1024 bytes of the HTML or in the Content-Type HTTP response header. [Learn more about declaring the character encoding](https://developer.chrome.com/docs/insights/charset/).",
  /**
   * @description Text to tell the user that the charset is declared in the Content-Type HTTP response header.
   */
  passingHttpHeader: "Declares charset in HTTP header",
  /**
   * @description Text to tell the user that the charset is NOT declared in the Content-Type HTTP response header.
   */
  failedHttpHeader: "Doesn\u2019t declare charset in HTTP header",
  /**
   * @description Text to tell the user that a meta charset tag was found in the first 1024 bytes of the HTML.
   */
  passingMetaCharsetEarly: "Declares charset using a meta tag in the first 1024 bytes",
  /**
   * @description Text to tell the user that a meta charset tag was found, but too late in the HTML.
   */
  failedMetaCharsetLate: "Declares charset using a meta tag after the first 1024 bytes",
  /**
   * @description Text to tell the user that no meta charset tag was found in the HTML.
   */
  failedMetaCharsetMissing: "Doesn\u2019t declare charset using a meta tag",
  /**
   * @description Text to tell the user that trace data did not include the Blink signal for meta charset.
   */
  failedMetaCharsetUnknown: "Couldn\u2019t determine meta charset declaration from trace"
};
var str_2 = i18n3.i18n.registerUIStrings("models/trace/insights/CharacterSet.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var CHARSET_HTTP_REGEX = /charset\s*=\s*[a-zA-Z0-9\-_:.()]{2,}/i;
function isCharacterSetInsight(model) {
  return model.insightKey === "CharacterSet" /* CHARACTER_SET */;
}
function finalize2(partialModel) {
  let hasFailure = false;
  if (partialModel.data) {
    hasFailure = !partialModel.data.checklist.httpCharset.value && !partialModel.data.checklist.metaCharset.value;
  }
  return {
    insightKey: "CharacterSet" /* CHARACTER_SET */,
    strings: UIStrings2,
    title: i18nString2(UIStrings2.title),
    description: i18nString2(UIStrings2.description),
    docs: "https://developer.chrome.com/docs/insights/charset/",
    category: "All" /* ALL */,
    state: hasFailure ? "fail" : "pass",
    ...partialModel
  };
}
function hasCharsetInContentType(request) {
  if (!request.args.data.responseHeaders) {
    return false;
  }
  for (const header of request.args.data.responseHeaders) {
    if (header.name.toLowerCase() === "content-type") {
      return CHARSET_HTTP_REGEX.test(header.value);
    }
  }
  return false;
}
function findMetaCharsetDisposition(data, context) {
  if (!context.navigation) {
    return void 0;
  }
  return data.PageLoadMetrics.metaCharsetCheckEventsByNavigation.get(context.navigation)?.at(-1)?.args.data?.disposition;
}
function metaCharsetLabel(disposition) {
  switch (disposition) {
    case "found-in-first-1024-bytes":
      return i18nString2(UIStrings2.passingMetaCharsetEarly);
    case "found-after-first-1024-bytes":
      return i18nString2(UIStrings2.failedMetaCharsetLate);
    case "not-found":
      return i18nString2(UIStrings2.failedMetaCharsetMissing);
    default:
      return i18nString2(UIStrings2.failedMetaCharsetUnknown);
  }
}
function generateInsight2(data, context) {
  if (!context.navigation || !("navigationId" in context)) {
    return finalize2({});
  }
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  if (!documentRequest) {
    return finalize2({ warnings: ["NO_DOCUMENT_REQUEST" /* NO_DOCUMENT_REQUEST */] });
  }
  const hasHttpCharset = hasCharsetInContentType(documentRequest);
  const metaCharsetDisposition = findMetaCharsetDisposition(data, context);
  const hasMetaCharsetInFirst1024Bytes = metaCharsetDisposition === "found-in-first-1024-bytes";
  return finalize2({
    relatedEvents: [documentRequest],
    data: {
      hasHttpCharset,
      metaCharsetDisposition,
      documentRequest,
      checklist: {
        httpCharset: {
          label: hasHttpCharset ? i18nString2(UIStrings2.passingHttpHeader) : i18nString2(UIStrings2.failedHttpHeader),
          value: hasHttpCharset
        },
        metaCharset: {
          label: metaCharsetLabel(metaCharsetDisposition),
          value: hasMetaCharsetInFirst1024Bytes
        }
      }
    }
  });
}
function createOverlays2(model) {
  if (!model.data?.documentRequest) {
    return [];
  }
  return [{
    type: "ENTRY_SELECTED",
    entry: model.data.documentRequest
  }];
}

// ../../front_end/models/trace/insights/CLSCulprits.ts
var CLSCulprits_exports = {};
__export(CLSCulprits_exports, {
  AnimationFailureReasons: () => AnimationFailureReasons,
  LayoutShiftType: () => LayoutShiftType,
  UIStrings: () => UIStrings3,
  createOverlays: () => createOverlays3,
  generateInsight: () => generateInsight3,
  getNonCompositedFailure: () => getNonCompositedFailure,
  i18nString: () => i18nString3,
  isCLSCulpritsInsight: () => isCLSCulpritsInsight
});
import * as i18n5 from "../../../core/i18n/i18n.js";
import * as Platform from "../../../core/platform/platform.js";
import * as Handlers from "../handlers/handlers.js";
import * as Helpers3 from "../helpers/helpers.js";
import * as Types2 from "../types/types.js";
var UIStrings3 = {
  /**
   * @description Title of an insight that provides details about why elements shift/move on the page. The causes for these shifts are referred to as culprits ("reasons").
   */
  title: "Layout shift culprits",
  /**
   * @description Description of a DevTools insight that identifies the reasons that elements shift on the page.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: "Layout shifts occur when elements move absent any user interaction. [Investigate the causes of layout shifts](https://developer.chrome.com/docs/performance/insights/cls-culprit), such as elements being added, removed, or their fonts changing as the page loads.",
  /**
   * @description Text indicating the worst layout shift cluster.
   */
  worstLayoutShiftCluster: "Worst layout shift cluster",
  /**
   * @description Text indicating the worst layout shift cluster.
   */
  worstCluster: "Worst cluster",
  /**
   * @description Text indicating a layout shift cluster and its start time.
   * @example {32 ms} PH1
   */
  layoutShiftCluster: "Layout shift cluster @ {PH1}",
  /**
   * @description Text indicating the biggest reasons for the layout shifts.
   */
  topCulprits: "Top layout shift culprits",
  /**
   * @description Text for a culprit type of Injected iframe.
   */
  injectedIframe: "Injected iframe",
  /**
   * @description Text for a culprit type of web font request.
   */
  webFont: "Web font",
  /**
   * @description Text for a culprit type of Animation.
   */
  animation: "Animation",
  /**
   * @description Text for a culprit type of Unsized image.
   */
  unsizedImage: "Unsized image element",
  /**
   * @description Text status when there were no layout shifts detected.
   */
  noLayoutShifts: "No layout shifts",
  /**
   * @description Text status when no layout shift culprits or root causes were found.
   */
  noCulprits: "Could not detect any layout shift culprits"
};
var str_3 = i18n5.i18n.registerUIStrings("models/trace/insights/CLSCulprits.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var AnimationFailureReasons = /* @__PURE__ */ ((AnimationFailureReasons2) => {
  AnimationFailureReasons2["ACCELERATED_ANIMATIONS_DISABLED"] = "ACCELERATED_ANIMATIONS_DISABLED";
  AnimationFailureReasons2["EFFECT_SUPPRESSED_BY_DEVTOOLS"] = "EFFECT_SUPPRESSED_BY_DEVTOOLS";
  AnimationFailureReasons2["INVALID_ANIMATION_OR_EFFECT"] = "INVALID_ANIMATION_OR_EFFECT";
  AnimationFailureReasons2["EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS"] = "EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS";
  AnimationFailureReasons2["EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE"] = "EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE";
  AnimationFailureReasons2["TARGET_HAS_INVALID_COMPOSITING_STATE"] = "TARGET_HAS_INVALID_COMPOSITING_STATE";
  AnimationFailureReasons2["TARGET_HAS_INCOMPATIBLE_ANIMATIONS"] = "TARGET_HAS_INCOMPATIBLE_ANIMATIONS";
  AnimationFailureReasons2["TARGET_HAS_CSS_OFFSET"] = "TARGET_HAS_CSS_OFFSET";
  AnimationFailureReasons2["ANIMATION_AFFECTS_NON_CSS_PROPERTIES"] = "ANIMATION_AFFECTS_NON_CSS_PROPERTIES";
  AnimationFailureReasons2["TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET"] = "TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET";
  AnimationFailureReasons2["TRANSFROM_BOX_SIZE_DEPENDENT"] = "TRANSFROM_BOX_SIZE_DEPENDENT";
  AnimationFailureReasons2["FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS"] = "FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS";
  AnimationFailureReasons2["UNSUPPORTED_CSS_PROPERTY"] = "UNSUPPORTED_CSS_PROPERTY";
  AnimationFailureReasons2["MIXED_KEYFRAME_VALUE_TYPES"] = "MIXED_KEYFRAME_VALUE_TYPES";
  AnimationFailureReasons2["TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE"] = "TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE";
  AnimationFailureReasons2["ANIMATION_HAS_NO_VISIBLE_CHANGE"] = "ANIMATION_HAS_NO_VISIBLE_CHANGE";
  AnimationFailureReasons2["AFFECTS_IMPORTANT_PROPERTY"] = "AFFECTS_IMPORTANT_PROPERTY";
  AnimationFailureReasons2["SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY"] = "SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY";
  return AnimationFailureReasons2;
})(AnimationFailureReasons || {});
var LayoutShiftType = /* @__PURE__ */ ((LayoutShiftType2) => {
  LayoutShiftType2[LayoutShiftType2["WEB_FONT"] = 0] = "WEB_FONT";
  LayoutShiftType2[LayoutShiftType2["IFRAMES"] = 1] = "IFRAMES";
  LayoutShiftType2[LayoutShiftType2["ANIMATIONS"] = 2] = "ANIMATIONS";
  LayoutShiftType2[LayoutShiftType2["UNSIZED_IMAGE"] = 3] = "UNSIZED_IMAGE";
  return LayoutShiftType2;
})(LayoutShiftType || {});
var ACTIONABLE_FAILURE_REASONS = [
  {
    flag: 1 << 0,
    failure: "ACCELERATED_ANIMATIONS_DISABLED" /* ACCELERATED_ANIMATIONS_DISABLED */
  },
  {
    flag: 1 << 1,
    failure: "EFFECT_SUPPRESSED_BY_DEVTOOLS" /* EFFECT_SUPPRESSED_BY_DEVTOOLS */
  },
  {
    flag: 1 << 2,
    failure: "INVALID_ANIMATION_OR_EFFECT" /* INVALID_ANIMATION_OR_EFFECT */
  },
  {
    flag: 1 << 3,
    failure: "EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS" /* EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS */
  },
  {
    flag: 1 << 4,
    failure: "EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE" /* EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE */
  },
  {
    flag: 1 << 5,
    failure: "TARGET_HAS_INVALID_COMPOSITING_STATE" /* TARGET_HAS_INVALID_COMPOSITING_STATE */
  },
  {
    flag: 1 << 6,
    failure: "TARGET_HAS_INCOMPATIBLE_ANIMATIONS" /* TARGET_HAS_INCOMPATIBLE_ANIMATIONS */
  },
  {
    flag: 1 << 7,
    failure: "TARGET_HAS_CSS_OFFSET" /* TARGET_HAS_CSS_OFFSET */
  },
  // The failure 1 << 8 is marked as obsolete in Blink
  {
    flag: 1 << 9,
    failure: "ANIMATION_AFFECTS_NON_CSS_PROPERTIES" /* ANIMATION_AFFECTS_NON_CSS_PROPERTIES */
  },
  {
    flag: 1 << 10,
    failure: "TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET" /* TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET */
  },
  {
    flag: 1 << 11,
    failure: "TRANSFROM_BOX_SIZE_DEPENDENT" /* TRANSFROM_BOX_SIZE_DEPENDENT */
  },
  {
    flag: 1 << 12,
    failure: "FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS" /* FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS */
  },
  {
    flag: 1 << 13,
    failure: "UNSUPPORTED_CSS_PROPERTY" /* UNSUPPORTED_CSS_PROPERTY */
  },
  // The failure 1 << 14 is marked as obsolete in Blink
  {
    flag: 1 << 15,
    failure: "MIXED_KEYFRAME_VALUE_TYPES" /* MIXED_KEYFRAME_VALUE_TYPES */
  },
  {
    flag: 1 << 16,
    failure: "TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE" /* TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE */
  },
  {
    flag: 1 << 17,
    failure: "ANIMATION_HAS_NO_VISIBLE_CHANGE" /* ANIMATION_HAS_NO_VISIBLE_CHANGE */
  },
  {
    flag: 1 << 18,
    failure: "AFFECTS_IMPORTANT_PROPERTY" /* AFFECTS_IMPORTANT_PROPERTY */
  },
  {
    flag: 1 << 19,
    failure: "SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY" /* SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY */
  }
];
var ROOT_CAUSE_WINDOW = Helpers3.Timing.secondsToMicro(Types2.Timing.Seconds(0.5));
function isInRootCauseWindow(event, targetEvent) {
  const eventEnd = event.dur ? event.ts + event.dur : event.ts;
  return eventEnd < targetEvent.ts && eventEnd >= targetEvent.ts - ROOT_CAUSE_WINDOW;
}
function getNonCompositedFailure(animationEvent) {
  const failures = [];
  const beginEvent = animationEvent.args.data.beginEvent;
  const instantEvents = animationEvent.args.data.instantEvents || [];
  for (const event of instantEvents) {
    const failureMask = event.args.data.compositeFailed;
    const unsupportedProperties = event.args.data.unsupportedProperties;
    if (!failureMask) {
      continue;
    }
    const failureReasons = ACTIONABLE_FAILURE_REASONS.filter((reason) => failureMask & reason.flag).map((reason) => reason.failure);
    const failure = {
      name: beginEvent.args.data.displayName,
      failureReasons,
      unsupportedProperties,
      animation: animationEvent
    };
    failures.push(failure);
  }
  return failures;
}
function getNonCompositedFailureRootCauses(animationEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift) {
  const allAnimationFailures = [];
  for (const animation of animationEvents) {
    const failures = getNonCompositedFailure(animation);
    if (!failures) {
      continue;
    }
    allAnimationFailures.push(...failures);
    const nextPrePaint = getNextEvent(prePaintEvents, animation);
    if (!nextPrePaint) {
      continue;
    }
    if (!isInRootCauseWindow(animation, nextPrePaint)) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      rootCausesForShift.nonCompositedAnimations.push(...failures);
    }
  }
  return allAnimationFailures;
}
function getShiftsByPrePaintEvents(layoutShifts, prePaintEvents) {
  const shiftsByPrePaint = /* @__PURE__ */ new Map();
  for (const prePaintEvent of prePaintEvents) {
    const firstShiftIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(layoutShifts, (shift) => shift.ts >= prePaintEvent.ts);
    if (firstShiftIndex === null) {
      continue;
    }
    for (let i = firstShiftIndex; i < layoutShifts.length; i++) {
      const shift = layoutShifts[i];
      if (shift.ts >= prePaintEvent.ts && shift.ts <= prePaintEvent.ts + prePaintEvent.dur) {
        const shiftsInPrePaint = Platform.MapUtilities.getWithDefault(shiftsByPrePaint, prePaintEvent, () => []);
        shiftsInPrePaint.push(shift);
      }
      if (shift.ts > prePaintEvent.ts + prePaintEvent.dur) {
        break;
      }
    }
  }
  return shiftsByPrePaint;
}
function getNextEvent(sourceEvents, targetEvent) {
  const index = Platform.ArrayUtilities.nearestIndexFromBeginning(
    sourceEvents,
    (source) => source.ts > targetEvent.ts + (targetEvent.dur || 0)
  );
  if (index === null) {
    return void 0;
  }
  return sourceEvents[index];
}
function getIframeRootCauses(data, iframeCreatedEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift, domLoadingEvents) {
  for (const iframeEvent of iframeCreatedEvents) {
    const nextPrePaint = getNextEvent(prePaintEvents, iframeEvent);
    if (!nextPrePaint) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      const domEvent = domLoadingEvents.find((e) => {
        const maxIframe = Types2.Timing.Micro(iframeEvent.ts + (iframeEvent.dur ?? 0));
        return e.ts >= iframeEvent.ts && e.ts <= maxIframe;
      });
      if (domEvent?.args.frame) {
        const frame = domEvent.args.frame;
        let url;
        const processes = data.Meta.rendererProcessesByFrame.get(frame);
        if (processes && processes.size > 0) {
          url = [...processes.values()][0]?.[0].frame.url;
        }
        rootCausesForShift.iframes.push({ frame, url });
      }
    }
  }
  return rootCausesByShift;
}
function getUnsizedImageRootCauses(unsizedImageEvents, paintImageEvents, shiftsByPrePaint, rootCausesByShift) {
  shiftsByPrePaint.forEach((shifts, prePaint) => {
    const paintImage = getNextEvent(paintImageEvents, prePaint);
    if (!paintImage) {
      return;
    }
    const matchingNode = unsizedImageEvents.find((unsizedImage) => unsizedImage.args.data.nodeId === paintImage.args.data.nodeId);
    if (!matchingNode) {
      return;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      rootCausesForShift.unsizedImages.push({
        backendNodeId: matchingNode.args.data.nodeId,
        paintImageEvent: paintImage
      });
    }
  });
  return rootCausesByShift;
}
function isCLSCulpritsInsight(insight) {
  return insight.insightKey === "CLSCulprits" /* CLS_CULPRITS */;
}
function getFontRootCauses(networkRequests, prePaintEvents, shiftsByPrePaint, rootCausesByShift) {
  const fontRequests = networkRequests.filter((req) => req.args.data.resourceType === "Font" && req.args.data.mimeType.startsWith("font"));
  for (const req of fontRequests) {
    const nextPrePaint = getNextEvent(prePaintEvents, req);
    if (!nextPrePaint) {
      continue;
    }
    if (!isInRootCauseWindow(req, nextPrePaint)) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      rootCausesForShift.webFonts.push(req);
    }
  }
  return rootCausesByShift;
}
function getTopCulprits(cluster, culpritsByShift) {
  const MAX_TOP_CULPRITS = 3;
  const causes = [];
  const shifts = cluster.events;
  for (const shift of shifts) {
    const culprits = culpritsByShift.get(shift);
    if (!culprits) {
      continue;
    }
    const fontReq = culprits.webFonts;
    const iframes = culprits.iframes;
    const animations = culprits.nonCompositedAnimations;
    const unsizedImages = culprits.unsizedImages;
    for (let i = 0; i < fontReq.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({ type: 0 /* WEB_FONT */, description: i18nString3(UIStrings3.webFont) });
    }
    for (let i = 0; i < iframes.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({ type: 1 /* IFRAMES */, description: i18nString3(UIStrings3.injectedIframe) });
    }
    for (let i = 0; i < animations.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({ type: 2 /* ANIMATIONS */, description: i18nString3(UIStrings3.animation) });
    }
    for (let i = 0; i < unsizedImages.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({
        type: 3 /* UNSIZED_IMAGE */,
        description: i18nString3(UIStrings3.unsizedImage),
        url: unsizedImages[i].paintImageEvent.args.data.url || "",
        backendNodeId: unsizedImages[i].backendNodeId,
        frame: unsizedImages[i].paintImageEvent.args.data.frame || ""
      });
    }
    if (causes.length >= MAX_TOP_CULPRITS) {
      break;
    }
  }
  return causes.slice(0, MAX_TOP_CULPRITS);
}
function finalize3(partialModel) {
  let state = "pass";
  if (partialModel.worstCluster) {
    const classification = Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(
      partialModel.worstCluster.clusterCumulativeScore
    );
    if (classification === Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD) {
      state = "informative";
    } else {
      state = "fail";
    }
  }
  return {
    insightKey: "CLSCulprits" /* CLS_CULPRITS */,
    strings: UIStrings3,
    title: i18nString3(UIStrings3.title),
    description: i18nString3(UIStrings3.description),
    docs: "https://developer.chrome.com/docs/performance/insights/cls-culprit",
    category: "CLS" /* CLS */,
    state,
    ...partialModel
  };
}
function generateInsight3(data, context) {
  const isWithinContext = (event) => Helpers3.Timing.eventIsInBounds(event, context.bounds);
  const compositeAnimationEvents = data.Animations.animations.filter(isWithinContext);
  const iframeEvents = data.LayoutShifts.renderFrameImplCreateChildFrameEvents.filter(isWithinContext);
  const networkRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const domLoadingEvents = data.LayoutShifts.domLoadingEvents.filter(isWithinContext);
  const unsizedImageEvents = data.LayoutShifts.layoutImageUnsizedEvents.filter(isWithinContext);
  const clusters = data.LayoutShifts.clusters.filter(isWithinContext);
  const clustersByScore = clusters.toSorted((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore);
  const worstCluster = clustersByScore.at(0);
  const layoutShifts = clusters.flatMap((cluster) => cluster.events);
  const prePaintEvents = data.LayoutShifts.prePaintEvents.filter(isWithinContext);
  const paintImageEvents = data.LayoutShifts.paintImageEvents.filter(isWithinContext);
  const rootCausesByShift = /* @__PURE__ */ new Map();
  const shiftsByPrePaint = getShiftsByPrePaintEvents(layoutShifts, prePaintEvents);
  for (const shift of layoutShifts) {
    rootCausesByShift.set(shift, { iframes: [], webFonts: [], nonCompositedAnimations: [], unsizedImages: [] });
  }
  getIframeRootCauses(data, iframeEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift, domLoadingEvents);
  getFontRootCauses(networkRequests, prePaintEvents, shiftsByPrePaint, rootCausesByShift);
  getUnsizedImageRootCauses(unsizedImageEvents, paintImageEvents, shiftsByPrePaint, rootCausesByShift);
  const animationFailures = getNonCompositedFailureRootCauses(compositeAnimationEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift);
  const relatedEvents = [...layoutShifts];
  if (worstCluster) {
    relatedEvents.push(worstCluster);
  }
  const topCulpritsByCluster = /* @__PURE__ */ new Map();
  for (const cluster of clusters) {
    topCulpritsByCluster.set(cluster, getTopCulprits(cluster, rootCausesByShift));
  }
  return finalize3({
    relatedEvents,
    animationFailures,
    shifts: rootCausesByShift,
    clusters,
    worstCluster,
    topCulpritsByCluster
  });
}
function createOverlays3(model) {
  const clustersByScore = model.clusters.toSorted((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore) ?? [];
  const worstCluster = clustersByScore[0];
  if (!worstCluster) {
    return [];
  }
  const range = Types2.Timing.Micro(worstCluster.dur ?? 0);
  const max = Types2.Timing.Micro(worstCluster.ts + range);
  return [{
    type: "TIMESPAN_BREAKDOWN",
    sections: [
      {
        bounds: { min: worstCluster.ts, range, max },
        label: i18nString3(UIStrings3.worstLayoutShiftCluster),
        showDuration: false
      }
    ],
    // This allows for the overlay to sit over the layout shift.
    entry: worstCluster.events[0],
    renderLocation: "ABOVE_EVENT"
  }];
}

// ../../front_end/models/trace/insights/DocumentLatency.ts
var DocumentLatency_exports = {};
__export(DocumentLatency_exports, {
  UIStrings: () => UIStrings4,
  createOverlays: () => createOverlays4,
  generateInsight: () => generateInsight4,
  i18nString: () => i18nString4,
  isDocumentLatencyInsight: () => isDocumentLatencyInsight
});
import * as i18n7 from "../../../core/i18n/i18n.js";
import * as Helpers4 from "../helpers/helpers.js";
import * as Types3 from "../types/types.js";
var UIStrings4 = {
  /**
   * @description Title of an insight that provides a breakdown for how long it took to download the main document.
   */
  title: "Document request latency",
  /**
   * @description Description of an insight that provides a breakdown for how long it took to download the main document.
   */
  description: "Your first network request is the most important. [Reduce its latency](https://developer.chrome.com/docs/performance/insights/document-latency) by avoiding redirects, ensuring a fast server response, and enabling text compression.",
  /**
   * @description Text to tell the user that the document request does not have redirects.
   */
  passingRedirects: "Avoids redirects",
  /**
   * @description Text to tell the user that the document request had redirects.
   * @example {3} PH1
   * @example {1000 ms} PH2
   */
  failedRedirects: "Had redirects ({PH1} redirects, +{PH2})",
  /**
   * @description Text to tell the user that the time starting the document request to when the server started responding is acceptable.
   * @example {600 ms} PH1
   */
  passingServerResponseTime: "Server responds quickly (observed {PH1})",
  /**
   * @description Text to tell the user that the time starting the document request to when the server started responding is not acceptable.
   * @example {601 ms} PH1
   */
  failedServerResponseTime: "Server responded slowly (observed {PH1})",
  /**
   * @description Text to tell the user that text compression (like gzip) was applied.
   */
  passingTextCompression: "Applies text compression",
  /**
   * @description Text to tell the user that text compression (like gzip) was not applied.
   */
  failedTextCompression: "No compression applied",
  /**
   * @description Text for a label describing a network request event as having redirects.
   */
  redirectsLabel: "Redirects",
  /**
   * @description Text for a label describing a network request event as taking too long to start delivery by the server.
   */
  serverResponseTimeLabel: "Server response time",
  /**
   * @description Text for a label describing a network request event as taking longer to download because it wasn't compressed.
   */
  uncompressedDownload: "Uncompressed download"
};
var str_4 = i18n7.i18n.registerUIStrings("models/trace/insights/DocumentLatency.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var TOO_SLOW_THRESHOLD_MS = 600;
var TARGET_MS = 100;
var IGNORE_THRESHOLD_IN_BYTES = 1400;
function isDocumentLatencyInsight(x) {
  return x.insightKey === "DocumentLatency";
}
function getServerResponseTime(request) {
  const isLightrider = globalThis.isLightrider;
  if (isLightrider) {
    return request.args.data.lrServerResponseTime ?? null;
  }
  const timing = request.args.data.timing;
  if (!timing) {
    return null;
  }
  const ms = Helpers4.Timing.microToMilli(request.args.data.syntheticData.serverResponseTime);
  return Math.round(ms);
}
function getCompressionSavings(request) {
  const isCompressed = isRequestCompressed(request);
  if (isCompressed) {
    return 0;
  }
  const originalSize = request.args.data.decodedBodyLength;
  let estimatedSavings = 0;
  switch (request.args.data.mimeType) {
    case "text/css":
      estimatedSavings = Math.round(originalSize * 0.8);
      break;
    case "text/html":
    case "text/javascript":
      estimatedSavings = Math.round(originalSize * 0.67);
      break;
    case "text/plain":
    case "text/xml":
    case "text/x-component":
    case "application/javascript":
    case "application/json":
    case "application/manifest+json":
    case "application/vnd.api+json":
    case "application/xml":
    case "application/xhtml+xml":
    case "application/rss+xml":
    case "application/atom+xml":
    case "application/vnd.ms-fontobject":
    case "application/x-font-ttf":
    case "application/x-font-opentype":
    case "application/x-font-truetype":
    case "image/svg+xml":
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
    case "font/ttf":
    case "font/eot":
    case "font/otf":
    case "font/opentype":
      estimatedSavings = Math.round(originalSize * 0.5);
      break;
    default:
  }
  return estimatedSavings < IGNORE_THRESHOLD_IN_BYTES ? 0 : estimatedSavings;
}
function finalize4(partialModel) {
  let hasFailure = false;
  if (partialModel.data) {
    hasFailure = !partialModel.data.checklist.usesCompression.value || !partialModel.data.checklist.serverResponseIsFast.value || !partialModel.data.checklist.noRedirects.value;
  }
  return {
    insightKey: "DocumentLatency" /* DOCUMENT_LATENCY */,
    strings: UIStrings4,
    title: i18nString4(UIStrings4.title),
    description: i18nString4(UIStrings4.description),
    docs: "https://developer.chrome.com/docs/performance/insights/document-latency",
    category: "All" /* ALL */,
    state: hasFailure ? "fail" : "pass",
    ...partialModel
  };
}
function generateInsight4(data, context) {
  if (!context.navigation || !("navigationId" in context)) {
    return finalize4({});
  }
  const millisToString = context.options.insightTimeFormatters?.milli ?? i18n7.TimeUtilities.millisToString;
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  if (!documentRequest) {
    return finalize4({ warnings: ["NO_DOCUMENT_REQUEST" /* NO_DOCUMENT_REQUEST */] });
  }
  const serverResponseTime = getServerResponseTime(documentRequest);
  if (serverResponseTime === null) {
    throw new Error("missing document request timing");
  }
  const serverResponseTooSlow = serverResponseTime > TOO_SLOW_THRESHOLD_MS;
  let overallSavingsMs = 0;
  if (serverResponseTime > TOO_SLOW_THRESHOLD_MS) {
    overallSavingsMs = Math.max(serverResponseTime - TARGET_MS, 0);
  }
  const redirectDuration = Math.round(documentRequest.args.data.syntheticData.redirectionDuration / 1e3);
  overallSavingsMs += redirectDuration;
  const metricSavings = {
    FCP: overallSavingsMs,
    LCP: overallSavingsMs
  };
  const uncompressedResponseBytes = getCompressionSavings(documentRequest);
  const noRedirects = redirectDuration === 0;
  const serverResponseIsFast = !serverResponseTooSlow;
  const usesCompression = uncompressedResponseBytes === 0;
  return finalize4({
    relatedEvents: [documentRequest],
    data: {
      serverResponseTime,
      redirectDuration: Types3.Timing.Milli(redirectDuration),
      uncompressedResponseBytes,
      documentRequest,
      checklist: {
        noRedirects: {
          label: noRedirects ? i18nString4(UIStrings4.passingRedirects) : i18nString4(UIStrings4.failedRedirects, {
            PH1: documentRequest.args.data.redirects.length,
            PH2: millisToString(redirectDuration)
          }),
          value: noRedirects
        },
        serverResponseIsFast: {
          label: serverResponseIsFast ? i18nString4(UIStrings4.passingServerResponseTime, { PH1: millisToString(serverResponseTime) }) : i18nString4(UIStrings4.failedServerResponseTime, { PH1: millisToString(serverResponseTime) }),
          value: serverResponseIsFast
        },
        usesCompression: {
          label: usesCompression ? i18nString4(UIStrings4.passingTextCompression) : i18nString4(UIStrings4.failedTextCompression),
          value: usesCompression
        }
      }
    },
    metricSavings,
    wastedBytes: uncompressedResponseBytes
  });
}
function createOverlays4(model) {
  if (!model.data?.documentRequest) {
    return [];
  }
  const overlays = [];
  const event = model.data.documentRequest;
  const redirectDurationMicro = Helpers4.Timing.milliToMicro(model.data.redirectDuration);
  const sections = [];
  if (model.data.redirectDuration) {
    const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(
      event.ts,
      event.ts + redirectDurationMicro
    );
    sections.push({ bounds, label: i18nString4(UIStrings4.redirectsLabel), showDuration: true });
    overlays.push({ type: "CANDY_STRIPED_TIME_RANGE", bounds, entry: event });
  }
  if (!model.data.checklist.serverResponseIsFast.value) {
    const serverResponseTimeMicro = Helpers4.Timing.milliToMicro(model.data.serverResponseTime);
    const sendEnd = event.args.data.timing?.sendEnd ?? Types3.Timing.Milli(0);
    const sendEndMicro = Helpers4.Timing.milliToMicro(sendEnd);
    const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(
      sendEndMicro,
      sendEndMicro + serverResponseTimeMicro
    );
    sections.push({ bounds, label: i18nString4(UIStrings4.serverResponseTimeLabel), showDuration: true });
  }
  if (model.data.uncompressedResponseBytes) {
    const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(
      event.args.data.syntheticData.downloadStart,
      event.args.data.syntheticData.downloadStart + event.args.data.syntheticData.download
    );
    sections.push({ bounds, label: i18nString4(UIStrings4.uncompressedDownload), showDuration: true });
    overlays.push({ type: "CANDY_STRIPED_TIME_RANGE", bounds, entry: event });
  }
  if (sections.length) {
    overlays.push({
      type: "TIMESPAN_BREAKDOWN",
      sections,
      entry: model.data.documentRequest,
      // Always render below because the document request is guaranteed to be
      // the first request in the network track.
      renderLocation: "BELOW_EVENT"
    });
  }
  overlays.push({
    type: "ENTRY_SELECTED",
    entry: model.data.documentRequest
  });
  return overlays;
}

// ../../front_end/models/trace/insights/DOMSize.ts
var DOMSize_exports = {};
__export(DOMSize_exports, {
  UIStrings: () => UIStrings5,
  createOverlays: () => createOverlays5,
  generateInsight: () => generateInsight5,
  i18nString: () => i18nString5,
  isDomSizeInsight: () => isDomSizeInsight
});
import * as i18n9 from "../../../core/i18n/i18n.js";
import * as Handlers2 from "../handlers/handlers.js";
import * as Helpers5 from "../helpers/helpers.js";
import * as Types4 from "../types/types.js";
var UIStrings5 = {
  /**
   * @description Title of an insight that recommends reducing the size of the DOM tree as a means to improve page responsiveness. "DOM" is an acronym and should not be translated.
   */
  title: "Optimize DOM size",
  /**
   * @description Description of an insight that recommends reducing the size of the DOM tree as a means to improve page responsiveness. "DOM" is an acronym and should not be translated. "layout reflows" are when the browser will recompute the layout of content on the page.
   */
  description: "A large DOM can increase the duration of style calculations and layout reflows, impacting page responsiveness. A large DOM will also increase memory usage. [Learn how to avoid an excessive DOM size](https://developer.chrome.com/docs/performance/insights/dom-size).",
  /**
   * @description Header for a column containing the names of statistics as opposed to the actual statistic values.
   */
  statistic: "Statistic",
  /**
   * @description Header for a column containing the value of a statistic.
   */
  value: "Value",
  /**
   * @description Header for a column containing the page element related to a statistic.
   */
  element: "Element",
  /**
   * @description Label for a value representing the total number of elements on the page.
   */
  totalElements: "Total elements",
  /**
   * @description Label for a value representing the maximum depth of the Document Object Model (DOM). "DOM" is an acronym and should not be translated.
   */
  maxDOMDepth: "DOM depth",
  /**
   * @description Label for a value representing the maximum number of child elements of any parent element on the page.
   */
  maxChildren: "Most children",
  /**
   * @description Text for a section.
   */
  topUpdatesDescription: "These are the largest layout and style recalculation events. Their performance impact may be reduced by making the DOM simpler.",
  /**
   * @description Label used for a time duration.
   */
  duration: "Duration",
  /**
   * @description Message displayed in a table detailing how big a layout (rendering) is.
   * @example {134} PH1
   */
  largeLayout: "Layout ({PH1} objects)",
  /**
   * @description Message displayed in a table detailing how big a style recalculation (rendering) is.
   * @example {134} PH1
   */
  largeStyleRecalc: "Style recalculation ({PH1} elements)"
};
var str_5 = i18n9.i18n.registerUIStrings("models/trace/insights/DOMSize.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var DOM_SIZE_DURATION_THRESHOLD = Helpers5.Timing.milliToMicro(Types4.Timing.Milli(40));
var LAYOUT_OBJECTS_THRESHOLD = 100;
var STYLE_RECALC_ELEMENTS_THRESHOLD = 300;
function finalize5(partialModel) {
  const relatedEvents = [...partialModel.largeLayoutUpdates, ...partialModel.largeStyleRecalcs];
  return {
    insightKey: "DOMSize" /* DOM_SIZE */,
    strings: UIStrings5,
    title: i18nString5(UIStrings5.title),
    description: i18nString5(UIStrings5.description),
    docs: "https://developer.chrome.com/docs/performance/insights/dom-size",
    category: "INP" /* INP */,
    state: relatedEvents.length > 0 ? "informative" : "pass",
    ...partialModel,
    relatedEvents
  };
}
function isDomSizeInsight(model) {
  return model.insightKey === "DOMSize" /* DOM_SIZE */;
}
function generateInsight5(data, context) {
  const isWithinContext = (event) => Helpers5.Timing.eventIsInBounds(event, context.bounds);
  const mainTid = context.navigation?.tid;
  const largeLayoutUpdates = [];
  const largeStyleRecalcs = [];
  const threads = Handlers2.Threads.threadsInRenderer(data.Renderer);
  for (const thread of threads) {
    if (thread.type !== Handlers2.Threads.ThreadType.MAIN_THREAD) {
      continue;
    }
    if (mainTid === void 0) {
      if (!thread.processIsOnMainFrame) {
        continue;
      }
    } else if (thread.tid !== mainTid) {
      continue;
    }
    const rendererThread = data.Renderer.processes.get(thread.pid)?.threads.get(thread.tid);
    if (!rendererThread) {
      continue;
    }
    const { entries, layoutEvents, recalcStyleEvents } = rendererThread;
    if (!entries.length) {
      continue;
    }
    const first = entries[0];
    const last = entries[entries.length - 1];
    const timeRange = Helpers5.Timing.traceWindowFromMicroSeconds(first.ts, Types4.Timing.Micro(last.ts + (last.dur ?? 0)));
    if (!Helpers5.Timing.boundsIncludeTimeRange({ timeRange, bounds: context.bounds })) {
      continue;
    }
    for (const event of layoutEvents) {
      if (event.dur < DOM_SIZE_DURATION_THRESHOLD || !isWithinContext(event)) {
        continue;
      }
      const { dirtyObjects } = event.args.beginData;
      if (dirtyObjects > LAYOUT_OBJECTS_THRESHOLD) {
        largeLayoutUpdates.push(event);
      }
    }
    for (const event of recalcStyleEvents) {
      if (event.dur < DOM_SIZE_DURATION_THRESHOLD || !isWithinContext(event)) {
        continue;
      }
      const { elementCount } = event.args;
      if (elementCount > STYLE_RECALC_ELEMENTS_THRESHOLD) {
        largeStyleRecalcs.push(event);
      }
    }
  }
  const largeUpdates = [
    ...largeLayoutUpdates.map((event) => {
      const duration = event.dur / 1e3;
      const size = event.args.beginData.dirtyObjects;
      const label = i18nString5(UIStrings5.largeLayout, { PH1: size });
      return { label, duration, size, event };
    }),
    ...largeStyleRecalcs.map((event) => {
      const duration = event.dur / 1e3;
      const size = event.args.elementCount;
      const label = i18nString5(UIStrings5.largeStyleRecalc, { PH1: size });
      return { label, duration, size, event };
    })
  ].sort((a, b) => b.duration - a.duration).slice(0, 5);
  const domStatsEvents = data.DOMStats.domStatsByFrameId.get(context.frameId)?.filter(isWithinContext) ?? [];
  let maxDOMStats;
  for (const domStats of domStatsEvents) {
    const navigationPid = context.navigation?.pid;
    if (navigationPid && domStats.pid !== navigationPid) {
      continue;
    }
    if (!maxDOMStats || domStats.args.data.totalElements > maxDOMStats.args.data.totalElements) {
      maxDOMStats = domStats;
    }
  }
  return finalize5({
    largeLayoutUpdates,
    largeStyleRecalcs,
    largeUpdates,
    maxDOMStats
  });
}
function createOverlays5(model) {
  const entries = [...model.largeStyleRecalcs, ...model.largeLayoutUpdates];
  return entries.map((entry) => ({
    type: "ENTRY_OUTLINE",
    entry,
    outlineReason: "ERROR"
  }));
}

// ../../front_end/models/trace/insights/DuplicatedJavaScript.ts
var DuplicatedJavaScript_exports = {};
__export(DuplicatedJavaScript_exports, {
  UIStrings: () => UIStrings6,
  createOverlays: () => createOverlays6,
  generateInsight: () => generateInsight6,
  i18nString: () => i18nString6,
  isDuplicatedJavaScriptInsight: () => isDuplicatedJavaScriptInsight
});
import * as i18n11 from "../../../core/i18n/i18n.js";
import * as Extras from "../extras/extras.js";
import * as Helpers6 from "../helpers/helpers.js";
var UIStrings6 = {
  /**
   * @description Title of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  title: "Duplicated JavaScript",
  /**
   * @description Description of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  description: "Remove large, [duplicate JavaScript modules](https://developer.chrome.com/docs/performance/insights/duplicated-javascript) from bundles to reduce unnecessary bytes consumed by network activity.",
  /**
   * @description Label for a column in a data table; entries will be the locations of JavaScript or CSS code, e.g. the name of a JavaScript package or module.
   */
  columnSource: "Source",
  /**
   * @description Label for a column in a data table; entries will be the number of wasted bytes due to duplication of a web resource.
   */
  columnDuplicatedBytes: "Duplicated bytes",
  /**
   * @description Message shown when no duplicated JavaScript is found.
   */
  noDuplicatedJavaScript: "No duplicated JavaScript found"
};
var str_6 = i18n11.i18n.registerUIStrings("models/trace/insights/DuplicatedJavaScript.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
function finalize6(partialModel) {
  const requests = partialModel.scriptsWithDuplication.map((script) => script.request).filter((e) => !!e);
  return {
    insightKey: "DuplicatedJavaScript" /* DUPLICATE_JAVASCRIPT */,
    strings: UIStrings6,
    title: i18nString6(UIStrings6.title),
    description: i18nString6(UIStrings6.description),
    docs: "https://developer.chrome.com/docs/performance/insights/duplicated-javascript",
    category: "LCP" /* LCP */,
    state: Boolean(partialModel.duplication.values().next().value) ? "fail" : "pass",
    relatedEvents: [...new Set(requests)],
    ...partialModel
  };
}
function isDuplicatedJavaScriptInsight(model) {
  return model.insightKey === "DuplicatedJavaScript" /* DUPLICATE_JAVASCRIPT */;
}
function generateInsight6(data, context) {
  const scripts = data.Scripts.scripts.filter((script) => {
    if (script.frame !== context.frameId) {
      return false;
    }
    if (script.url?.startsWith("chrome-extension://")) {
      return false;
    }
    return Helpers6.Timing.timestampIsInBounds(context.bounds, script.ts);
  });
  const compressionRatios = /* @__PURE__ */ new Map();
  for (const script of scripts) {
    if (script.request) {
      compressionRatios.set(script.request.args.data.requestId, estimateCompressionRatioForScript(script));
    }
  }
  const { duplication, duplicationGroupedByNodeModules } = Extras.ScriptDuplication.computeScriptDuplication({ scripts }, compressionRatios);
  const scriptsWithDuplication = [...duplication.values().flatMap((data2) => data2.duplicates.map((d) => d.script))];
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const { duplicates } of duplication.values()) {
    for (let i = 1; i < duplicates.length; i++) {
      const sourceData = duplicates[i];
      if (!sourceData.script.request) {
        continue;
      }
      const transferSize = sourceData.attributedSize;
      const requestId = sourceData.script.request.args.data.requestId;
      wastedBytesByRequestId.set(requestId, (wastedBytesByRequestId.get(requestId) || 0) + transferSize);
    }
  }
  return finalize6({
    duplication,
    duplicationGroupedByNodeModules,
    scriptsWithDuplication: [...new Set(scriptsWithDuplication)],
    scripts,
    mainDocumentUrl: context.navigation?.args.data?.url ?? data.Meta.mainFrameURL,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: wastedBytesByRequestId.values().reduce((acc, cur) => acc + cur, 0)
  });
}
function createOverlays6(model) {
  return model.scriptsWithDuplication.map((script) => script.request).filter((e) => !!e).map((request) => {
    return {
      type: "ENTRY_OUTLINE",
      entry: request,
      outlineReason: "ERROR"
    };
  });
}

// ../../front_end/models/trace/insights/FontDisplay.ts
var FontDisplay_exports = {};
__export(FontDisplay_exports, {
  UIStrings: () => UIStrings7,
  createOverlays: () => createOverlays7,
  generateInsight: () => generateInsight7,
  i18nString: () => i18nString7,
  isFontDisplayInsight: () => isFontDisplayInsight
});
import * as i18n13 from "../../../core/i18n/i18n.js";
import * as Platform2 from "../../../core/platform/platform.js";
import * as Helpers7 from "../helpers/helpers.js";
import * as Types5 from "../types/types.js";
var UIStrings7 = {
  /**
   * @description Title of an insight that provides details about the fonts used on the page, and the value of their `font-display` properties.
   */
  title: "Font display",
  /**
   * @description Text to tell the user about the font-display CSS feature to help improve a the UX of a page.
   */
  description: "Consider setting [`font-display`](https://developer.chrome.com/docs/performance/insights/font-display) to `swap` or `optional` to ensure text is consistently visible. `swap` can be further optimized to mitigate layout shifts with [font metric overrides](https://developer.chrome.com/blog/font-fallbacks).",
  /**
   * @description Column for a font loaded by the page to render text.
   */
  fontColumn: "Font",
  /**
   * @description Column for the amount of time wasted.
   */
  wastedTimeColumn: "Wasted time",
  /**
   * @description Message shown when no fonts with suboptimal font-display are found.
   */
  noFonts: "No fonts with suboptimal font-display found"
};
var str_7 = i18n13.i18n.registerUIStrings("models/trace/insights/FontDisplay.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
function finalize7(partialModel) {
  return {
    insightKey: "FontDisplay" /* FONT_DISPLAY */,
    strings: UIStrings7,
    title: i18nString7(UIStrings7.title),
    description: i18nString7(UIStrings7.description),
    docs: "https://developer.chrome.com/docs/performance/insights/font-display",
    category: "INP" /* INP */,
    state: partialModel.fonts.find((font) => font.wastedTime > 0) ? "fail" : "pass",
    ...partialModel
  };
}
function isFontDisplayInsight(model) {
  return model.insightKey === "FontDisplay" /* FONT_DISPLAY */;
}
function generateInsight7(data, context) {
  const fonts = [];
  for (const remoteFont of data.LayoutShifts.remoteFonts) {
    const event = remoteFont.beginRemoteFontLoadEvent;
    if (!Helpers7.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }
    const requestId = `${event.pid}.${event.args.id}`;
    const request = data.NetworkRequests.byId.get(requestId);
    if (!request) {
      continue;
    }
    if (!/^(block|fallback|auto)$/.test(remoteFont.display)) {
      continue;
    }
    const wastedTimeMicro = Types5.Timing.Micro(request.args.data.syntheticData.finishTime - request.args.data.syntheticData.sendStartTime);
    let wastedTime = Platform2.NumberUtilities.floor(Helpers7.Timing.microToMilli(wastedTimeMicro), 1 / 5);
    if (wastedTime === 0) {
      continue;
    }
    wastedTime = Math.min(wastedTime, 3e3);
    fonts.push({
      name: remoteFont.name,
      request,
      display: remoteFont.display,
      wastedTime
    });
  }
  fonts.sort((a, b) => b.wastedTime - a.wastedTime);
  const savings = Math.max(...fonts.map((f) => f.wastedTime));
  return finalize7({
    relatedEvents: fonts.map((f) => f.request),
    fonts,
    metricSavings: { FCP: savings }
  });
}
function createOverlays7(model) {
  return model.fonts.map((font) => ({
    type: "ENTRY_OUTLINE",
    entry: font.request,
    outlineReason: font.wastedTime ? "ERROR" : "INFO"
  }));
}

// ../../front_end/models/trace/insights/ForcedReflow.ts
var ForcedReflow_exports = {};
__export(ForcedReflow_exports, {
  UIStrings: () => UIStrings8,
  createOverlayForEvents: () => createOverlayForEvents,
  createOverlays: () => createOverlays8,
  generateInsight: () => generateInsight8,
  i18nString: () => i18nString8,
  isForcedReflowInsight: () => isForcedReflowInsight
});
import * as i18n15 from "../../../core/i18n/i18n.js";
import * as Platform3 from "../../../core/platform/platform.js";
import * as Extras2 from "../extras/extras.js";
import * as Helpers8 from "../helpers/helpers.js";
import * as Types6 from "../types/types.js";
var UIStrings8 = {
  /**
   * @description Title of an insight that provides details about Forced reflow.
   */
  title: "Forced reflow",
  /**
   * @description Text to describe the forced reflow.
   */
  description: "A forced reflow occurs when JavaScript queries geometric properties (such as `offsetWidth`) after styles have been invalidated by a change to the DOM state. This can result in poor performance. Learn more about [forced reflows](https://developer.chrome.com/docs/performance/insights/forced-reflow) and possible mitigations.",
  /**
   * @description Title of a list to provide related stack trace data.
   */
  reflowCallFrames: "Call frames that trigger reflow",
  /**
   * @description Text to describe the top time-consuming function call.
   */
  topTimeConsumingFunctionCall: "Top function call",
  /**
   * @description Text to describe the total reflow time.
   */
  totalReflowTime: "Total reflow time",
  /**
   * @description Text to describe CPU processor tasks that could not be attributed to any specific source code.
   */
  unattributed: "[unattributed]",
  /**
   * @description Text for the name of anonymous functions.
   */
  anonymous: "(anonymous)"
};
var str_8 = i18n15.i18n.registerUIStrings("models/trace/insights/ForcedReflow.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
function getCallFrameId(callFrame) {
  return callFrame.scriptId + ":" + callFrame.lineNumber + ":" + callFrame.columnNumber;
}
function getLargestTopLevelFunctionData(forcedReflowEvents, traceParsedData) {
  const entryToNodeMap = traceParsedData.Renderer.entryToNode;
  const dataByTopLevelFunction = /* @__PURE__ */ new Map();
  if (forcedReflowEvents.length === 0) {
    return;
  }
  for (const event of forcedReflowEvents) {
    const traceNode = entryToNodeMap.get(event);
    if (!traceNode) {
      continue;
    }
    let node = traceNode.parent;
    let topLevelFunctionCall;
    let topLevelFunctionCallEvent;
    while (node) {
      const eventData = node.entry;
      if (Types6.Events.isProfileCall(eventData)) {
        topLevelFunctionCall = eventData.callFrame;
        topLevelFunctionCallEvent = eventData;
      } else {
        if (Types6.Events.isFunctionCall(eventData) && eventData.args.data && Types6.Events.objectIsCallFrame(eventData.args.data)) {
          topLevelFunctionCall = eventData.args.data;
          topLevelFunctionCallEvent = eventData;
        }
        break;
      }
      node = node.parent;
    }
    if (!topLevelFunctionCall || !topLevelFunctionCallEvent) {
      continue;
    }
    const aggregatedDataId = getCallFrameId(topLevelFunctionCall);
    const aggregatedData = Platform3.MapUtilities.getWithDefault(dataByTopLevelFunction, aggregatedDataId, () => ({
      topLevelFunctionCall,
      totalReflowTime: 0,
      topLevelFunctionCallEvents: []
    }));
    aggregatedData.totalReflowTime += event.dur ?? 0;
    aggregatedData.topLevelFunctionCallEvents.push(topLevelFunctionCallEvent);
  }
  let topTimeConsumingData = void 0;
  dataByTopLevelFunction.forEach((data) => {
    if (!topTimeConsumingData || data.totalReflowTime > topTimeConsumingData.totalReflowTime) {
      topTimeConsumingData = data;
    }
  });
  return topTimeConsumingData;
}
function finalize8(partialModel) {
  return {
    insightKey: "ForcedReflow" /* FORCED_REFLOW */,
    strings: UIStrings8,
    title: i18nString8(UIStrings8.title),
    description: i18nString8(UIStrings8.description),
    docs: "https://developer.chrome.com/docs/performance/insights/forced-reflow",
    category: "All" /* ALL */,
    state: partialModel.aggregatedBottomUpData.length !== 0 ? "fail" : "pass",
    ...partialModel
  };
}
function getBottomCallFrameForEvent(event, traceParsedData) {
  const profileStackTrace = Extras2.StackTraceForEvent.get(event, traceParsedData);
  const eventTopCallFrame = Helpers8.Trace.getStackTraceTopCallFrameInEventPayload(event);
  return profileStackTrace?.callFrames[0] ?? eventTopCallFrame ?? null;
}
function isForcedReflowInsight(model) {
  return model.insightKey === "ForcedReflow" /* FORCED_REFLOW */;
}
function generateInsight8(traceParsedData, context) {
  const isWithinContext = (event) => {
    const frameId = Helpers8.Trace.frameIDForEvent(event);
    if (frameId !== context.frameId) {
      return false;
    }
    return Helpers8.Timing.eventIsInBounds(event, context.bounds);
  };
  const bottomUpDataMap = /* @__PURE__ */ new Map();
  const events = traceParsedData.Warnings.perWarning.get("FORCED_REFLOW")?.filter(isWithinContext) ?? [];
  for (const event of events) {
    const bottomCallFrame = getBottomCallFrameForEvent(event, traceParsedData);
    const bottomCallId = bottomCallFrame ? getCallFrameId(bottomCallFrame) : "UNATTRIBUTED";
    const bottomUpData = Platform3.MapUtilities.getWithDefault(bottomUpDataMap, bottomCallId, () => ({
      bottomUpData: bottomCallFrame,
      totalTime: 0,
      relatedEvents: []
    }));
    bottomUpData.totalTime += event.dur ?? 0;
    bottomUpData.relatedEvents.push(event);
  }
  const topLevelFunctionCallData = getLargestTopLevelFunctionData(events, traceParsedData);
  return finalize8({
    relatedEvents: events,
    topLevelFunctionCallData,
    aggregatedBottomUpData: [...bottomUpDataMap.values()]
  });
}
function createOverlays8(model) {
  if (!model.topLevelFunctionCallData) {
    return [];
  }
  const allBottomUpEvents = [...model.aggregatedBottomUpData.values().flatMap((data) => data.relatedEvents)];
  return [
    ...createOverlayForEvents(model.topLevelFunctionCallData.topLevelFunctionCallEvents, "INFO"),
    ...createOverlayForEvents(allBottomUpEvents)
  ];
}
function createOverlayForEvents(events, outlineReason = "ERROR") {
  return events.map((e) => ({
    type: "ENTRY_OUTLINE",
    entry: e,
    outlineReason
  }));
}

// ../../front_end/models/trace/insights/ImageDelivery.ts
var ImageDelivery_exports = {};
__export(ImageDelivery_exports, {
  ImageOptimizationType: () => ImageOptimizationType,
  UIStrings: () => UIStrings9,
  createOverlayForRequest: () => createOverlayForRequest2,
  createOverlays: () => createOverlays9,
  generateInsight: () => generateInsight9,
  getOptimizationMessage: () => getOptimizationMessage,
  getOptimizationMessageWithBytes: () => getOptimizationMessageWithBytes,
  i18nString: () => i18nString9,
  isImageDeliveryInsight: () => isImageDeliveryInsight
});
import * as i18n17 from "../../../core/i18n/i18n.js";
import * as Helpers9 from "../helpers/helpers.js";
var UIStrings9 = {
  /**
   * @description Title of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  title: "Improve image delivery",
  /**
   * @description Description of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  description: "Reducing the download time of images can improve the perceived load time of the page and LCP. [Learn more about optimizing image size](https://developer.chrome.com/docs/performance/insights/image-delivery).",
  /**
   * @description Message displayed in a chip explaining that an image file size is large for the # of pixels it has and recommends possible adjustments to improve the image size.
   */
  useCompression: "Increasing the image compression factor could improve this image\u2019s download size.",
  /**
   * @description Message displayed in a chip explaining that an image file size is large for the # of pixels it has and recommends possible adjustments to improve the image size.
   */
  useModernFormat: "Using a modern image format (WebP, AVIF) or increasing the image compression could improve this image\u2019s download size.",
  /**
   * @description Message displayed in a chip advising the user to use video formats instead of GIFs because videos generally have smaller file sizes.
   */
  useVideoFormat: "Using video formats instead of GIFs can improve the download size of animated content.",
  /**
   * @description Message displayed in a chip explaining that an image was displayed on the page with dimensions much smaller than the image file dimensions.
   * @example {1000x500} PH1
   * @example {100x50} PH2
   */
  useResponsiveSize: "This image file is larger than it needs to be ({PH1}) for its displayed dimensions ({PH2}). Use responsive images to reduce the image download size.",
  /**
   * @description Column header for a table column containing network requests for images which can improve their file size (e.g. use a different format, increase compression, etc).
   */
  optimizeFile: "Optimize file size",
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: "{PH1} others",
  /**
   * @description Text status indicating that no potential optimizations were found for any image file.
   */
  noOptimizableImages: "No optimizable images",
  /**
   * @description Text describing the estimated number of bytes that an image file optimization can save. This text is appended to another block of text describing the image optimization in more detail. "Est" means "Estimated".
   * @example {Use the correct image dimensions to reduce the image file size.} PH1
   * @example {50 MB} PH2
   */
  estimatedSavings: "{PH1} (Est {PH2})"
};
var str_9 = i18n17.i18n.registerUIStrings("models/trace/insights/ImageDelivery.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var TARGET_BYTES_PER_PIXEL_AVIF = 2 * 1 / 12;
var GIF_SIZE_THRESHOLD = 100 * 1024;
var BYTE_SAVINGS_THRESHOLD = 4096;
var BYTE_SAVINGS_THRESHOLD_RESPONSIVE_BREAKPOINTS = 12288;
var ImageOptimizationType = /* @__PURE__ */ ((ImageOptimizationType2) => {
  ImageOptimizationType2["ADJUST_COMPRESSION"] = "ADJUST_COMPRESSION";
  ImageOptimizationType2["MODERN_FORMAT_OR_COMPRESSION"] = "MODERN_FORMAT_OR_COMPRESSION";
  ImageOptimizationType2["VIDEO_FORMAT"] = "VIDEO_FORMAT";
  ImageOptimizationType2["RESPONSIVE_SIZE"] = "RESPONSIVE_SIZE";
  return ImageOptimizationType2;
})(ImageOptimizationType || {});
function isImageDeliveryInsight(model) {
  return model.insightKey === "ImageDelivery";
}
function getOptimizationMessage(optimization) {
  switch (optimization.type) {
    case "ADJUST_COMPRESSION" /* ADJUST_COMPRESSION */:
      return i18nString9(UIStrings9.useCompression);
    case "MODERN_FORMAT_OR_COMPRESSION" /* MODERN_FORMAT_OR_COMPRESSION */:
      return i18nString9(UIStrings9.useModernFormat);
    case "VIDEO_FORMAT" /* VIDEO_FORMAT */:
      return i18nString9(UIStrings9.useVideoFormat);
    case "RESPONSIVE_SIZE" /* RESPONSIVE_SIZE */:
      return i18nString9(UIStrings9.useResponsiveSize, {
        PH1: `${optimization.fileDimensions.width}x${optimization.fileDimensions.height}`,
        PH2: `${optimization.displayDimensions.width}x${optimization.displayDimensions.height}`
      });
  }
}
function getOptimizationMessageWithBytes(optimization) {
  const byteSavingsText = i18n17.ByteUtilities.bytesToString(optimization.byteSavings);
  const optimizationMessage = getOptimizationMessage(optimization);
  return i18nString9(UIStrings9.estimatedSavings, { PH1: optimizationMessage, PH2: byteSavingsText });
}
function finalize9(partialModel) {
  return {
    insightKey: "ImageDelivery" /* IMAGE_DELIVERY */,
    strings: UIStrings9,
    title: i18nString9(UIStrings9.title),
    description: i18nString9(UIStrings9.description),
    docs: "https://developer.chrome.com/docs/performance/insights/image-delivery",
    category: "LCP" /* LCP */,
    state: partialModel.optimizableImages.length > 0 ? "fail" : "pass",
    ...partialModel,
    relatedEvents: new Map(partialModel.optimizableImages.map(
      (image) => [image.request, image.optimizations.map(getOptimizationMessageWithBytes)]
    ))
  };
}
function estimateGIFPercentSavings(request) {
  return Math.round(29.1 * Math.log10(request.args.data.decodedBodyLength) - 100.7) / 100;
}
function getDisplayedSize(data, paintImage) {
  return data.ImagePainting.paintEventToCorrectedDisplaySize.get(paintImage) ?? {
    width: paintImage.args.data.width,
    height: paintImage.args.data.height
  };
}
function getPixelCounts(data, paintImage) {
  const { width, height } = getDisplayedSize(data, paintImage);
  return {
    filePixels: paintImage.args.data.srcWidth * paintImage.args.data.srcHeight,
    displayedPixels: width * height
  };
}
function generateInsight9(data, context) {
  const isWithinContext = (event) => Helpers9.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const optimizableImages = [];
  for (const request of contextRequests) {
    if (request.args.data.resourceType !== "Image") {
      continue;
    }
    if (request.args.data.mimeType === "image/svg+xml") {
      continue;
    }
    const url = request.args.data.redirects[0]?.url ?? request.args.data.url;
    const imagePaints = data.ImagePainting.paintImageEventForUrl.get(url)?.filter(isWithinContext);
    if (!imagePaints?.length) {
      continue;
    }
    const largestImagePaint = imagePaints.reduce((prev, curr) => {
      const prevPixels = getPixelCounts(data, prev).displayedPixels;
      const currPixels = getPixelCounts(data, curr).displayedPixels;
      return prevPixels > currPixels ? prev : curr;
    });
    const {
      filePixels: imageFilePixels,
      displayedPixels: largestImageDisplayPixels
    } = getPixelCounts(data, largestImagePaint);
    const imageBytes = Math.min(request.args.data.decodedBodyLength, request.args.data.encodedDataLength);
    const bytesPerPixel = imageBytes / imageFilePixels;
    let optimizations = [];
    if (request.args.data.mimeType === "image/gif") {
      if (imageBytes > GIF_SIZE_THRESHOLD) {
        const percentSavings = estimateGIFPercentSavings(request);
        const byteSavings = Math.round(imageBytes * percentSavings);
        optimizations.push({ type: "VIDEO_FORMAT" /* VIDEO_FORMAT */, byteSavings });
      }
    } else if (bytesPerPixel > TARGET_BYTES_PER_PIXEL_AVIF) {
      const idealAvifImageSize = Math.round(TARGET_BYTES_PER_PIXEL_AVIF * imageFilePixels);
      const byteSavings = imageBytes - idealAvifImageSize;
      if (request.args.data.mimeType !== "image/webp" && request.args.data.mimeType !== "image/avif") {
        optimizations.push({ type: "MODERN_FORMAT_OR_COMPRESSION" /* MODERN_FORMAT_OR_COMPRESSION */, byteSavings });
      } else {
        optimizations.push({ type: "ADJUST_COMPRESSION" /* ADJUST_COMPRESSION */, byteSavings });
      }
    }
    const imageByteSavingsFromFormat = Math.max(0, ...optimizations.map((o) => o.byteSavings));
    let imageByteSavings = imageByteSavingsFromFormat;
    const wastedPixelRatio = 1 - largestImageDisplayPixels / imageFilePixels;
    if (wastedPixelRatio > 0 && !largestImagePaint.args.data.isCSS) {
      const byteSavings = Math.round(wastedPixelRatio * imageBytes);
      const hadBreakpoints = largestImagePaint.args.data.isPicture || largestImagePaint.args.data.srcsetAttribute;
      if (!hadBreakpoints || byteSavings > BYTE_SAVINGS_THRESHOLD_RESPONSIVE_BREAKPOINTS) {
        imageByteSavings += Math.round(wastedPixelRatio * (imageBytes - imageByteSavingsFromFormat));
        const { width, height } = getDisplayedSize(data, largestImagePaint);
        optimizations.push({
          type: "RESPONSIVE_SIZE" /* RESPONSIVE_SIZE */,
          byteSavings,
          fileDimensions: {
            width: Math.round(largestImagePaint.args.data.srcWidth),
            height: Math.round(largestImagePaint.args.data.srcHeight)
          },
          displayDimensions: {
            width: Math.round(width),
            height: Math.round(height)
          }
        });
      }
    }
    optimizations = optimizations.filter((optimization) => optimization.byteSavings > BYTE_SAVINGS_THRESHOLD);
    if (optimizations.length > 0) {
      optimizableImages.push({
        request,
        largestImagePaint,
        optimizations,
        byteSavings: imageByteSavings
      });
    }
  }
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const image of optimizableImages) {
    wastedBytesByRequestId.set(image.request.args.data.requestId, image.byteSavings);
  }
  optimizableImages.sort((a, b) => {
    if (b.byteSavings !== a.byteSavings) {
      return b.byteSavings - a.byteSavings;
    }
    return b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength;
  });
  return finalize9({
    optimizableImages,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: optimizableImages.reduce((total, img) => total + img.byteSavings, 0)
  });
}
function createOverlayForRequest2(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays9(model) {
  return model.optimizableImages.map((image) => createOverlayForRequest2(image.request));
}

// ../../front_end/models/trace/insights/INPBreakdown.ts
var INPBreakdown_exports = {};
__export(INPBreakdown_exports, {
  UIStrings: () => UIStrings10,
  createOverlays: () => createOverlays10,
  createOverlaysForSubpart: () => createOverlaysForSubpart,
  generateInsight: () => generateInsight10,
  i18nString: () => i18nString10,
  isINPBreakdownInsight: () => isINPBreakdownInsight
});
import * as i18n19 from "../../../core/i18n/i18n.js";
import * as Handlers3 from "../handlers/handlers.js";
import * as Helpers10 from "../helpers/helpers.js";
var UIStrings10 = {
  /**
   * @description Text to tell the user about the longest user interaction.
   */
  description: "Start investigating [how to improve INP](https://developer.chrome.com/docs/performance/insights/inp-breakdown) by looking at the longest subpart.",
  /**
   * @description Title for the performance insight "INP breakdown", which shows a breakdown of INP by subparts / sections.
   */
  title: "INP breakdown",
  /**
   * @description Label used for the subpart/component/stage/section of a larger duration.
   */
  subpart: "Subpart",
  /**
   * @description Label used for a time duration.
   */
  duration: "Duration",
  // TODO: these are repeated in InteractionBreakdown. Add a place for common strings?
  /**
   * @description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: "Input delay",
  /**
   * @description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: "Processing duration",
  /**
   * @description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: "Presentation delay",
  /**
   * @description Text status indicating that no user interactions were detected.
   */
  noInteractions: "No interactions detected"
};
var str_10 = i18n19.i18n.registerUIStrings("models/trace/insights/INPBreakdown.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
function isINPBreakdownInsight(insight) {
  return insight.insightKey === "INPBreakdown" /* INP_BREAKDOWN */;
}
function finalize10(partialModel) {
  let state = "pass";
  if (partialModel.longestInteractionEvent) {
    const classification = Handlers3.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(
      partialModel.longestInteractionEvent.dur
    );
    if (classification === Handlers3.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD) {
      state = "informative";
    } else {
      state = "fail";
    }
  }
  return {
    insightKey: "INPBreakdown" /* INP_BREAKDOWN */,
    strings: UIStrings10,
    title: i18nString10(UIStrings10.title),
    description: i18nString10(UIStrings10.description),
    docs: "https://developer.chrome.com/docs/performance/insights/inp-breakdown",
    category: "INP" /* INP */,
    state,
    ...partialModel
  };
}
function generateInsight10(data, context) {
  const interactionEvents = data.UserInteractions.interactionEventsWithNoNesting.filter((event) => {
    return Helpers10.Timing.eventIsInBounds(event, context.bounds);
  });
  if (!interactionEvents.length) {
    return finalize10({});
  }
  const longestByInteractionId = /* @__PURE__ */ new Map();
  for (const event of interactionEvents) {
    const key = event.interactionId;
    const longest = longestByInteractionId.get(key);
    if (!longest || event.dur > longest.dur) {
      longestByInteractionId.set(key, event);
    }
  }
  const normalizedInteractionEvents = [...longestByInteractionId.values()];
  normalizedInteractionEvents.sort((a, b) => b.dur - a.dur);
  const highPercentileIndex = Math.min(9, Math.floor(normalizedInteractionEvents.length / 50));
  return finalize10({
    relatedEvents: [normalizedInteractionEvents[0]],
    longestInteractionEvent: normalizedInteractionEvents[0],
    highPercentileInteractionEvent: normalizedInteractionEvents[highPercentileIndex]
  });
}
function createOverlaysForSubpart(event, subpartIndex = -1) {
  const p1 = Helpers10.Timing.traceWindowFromMicroSeconds(
    event.ts,
    event.ts + event.inputDelay
  );
  const p2 = Helpers10.Timing.traceWindowFromMicroSeconds(
    p1.max,
    p1.max + event.mainThreadHandling
  );
  const p3 = Helpers10.Timing.traceWindowFromMicroSeconds(
    p2.max,
    p2.max + event.presentationDelay
  );
  let sections = [
    { bounds: p1, label: i18nString10(UIStrings10.inputDelay), showDuration: true },
    { bounds: p2, label: i18nString10(UIStrings10.processingDuration), showDuration: true },
    { bounds: p3, label: i18nString10(UIStrings10.presentationDelay), showDuration: true }
  ];
  if (subpartIndex !== -1) {
    sections = [sections[subpartIndex]];
  }
  return [
    {
      type: "TIMESPAN_BREAKDOWN",
      sections,
      renderLocation: "BELOW_EVENT",
      entry: event
    }
  ];
}
function createOverlays10(model) {
  const event = model.longestInteractionEvent;
  if (!event) {
    return [];
  }
  return createOverlaysForSubpart(event);
}

// ../../front_end/models/trace/insights/LCPBreakdown.ts
var LCPBreakdown_exports = {};
__export(LCPBreakdown_exports, {
  UIStrings: () => UIStrings11,
  createOverlays: () => createOverlays11,
  generateInsight: () => generateInsight11,
  i18nString: () => i18nString11,
  isLCPBreakdownInsight: () => isLCPBreakdownInsight
});
import * as i18n21 from "../../../core/i18n/i18n.js";
import * as Handlers4 from "../handlers/handlers.js";
import * as Helpers11 from "../helpers/helpers.js";
import * as Types7 from "../types/types.js";
var UIStrings11 = {
  /**
   * @description Title of an insight that provides details about the LCP metric, broken down by parts.
   */
  title: "LCP breakdown",
  /**
   * @description Description of a DevTools insight that presents a breakdown for the LCP metric by subparts.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: "Each [subpart has specific improvement strategies](https://developer.chrome.com/docs/performance/insights/lcp-breakdown). Ideally, most of the LCP time should be spent on loading the resources, not within delays.",
  /**
   * @description Time to first byte title for the Largest Contentful Paint's subparts timespan breakdown.
   */
  timeToFirstByte: "Time to first byte",
  /**
   * @description Resource load delay title for the Largest Contentful Paint subparts timespan breakdown.
   */
  resourceLoadDelay: "Resource load delay",
  /**
   * @description Resource load duration title for the Largest Contentful Paint subparts timespan breakdown.
   */
  resourceLoadDuration: "Resource load duration",
  /**
   * @description Element render delay title for the Largest Contentful Paint subparts timespan breakdown.
   */
  elementRenderDelay: "Element render delay",
  /**
   * @description Label used for the subpart (section) of a larger duration.
   */
  subpart: "Subpart",
  /**
   * @description Label used for the duration a single subpart (section) takes up of a larger duration.
   */
  duration: "Duration",
  /**
   * @description Label used for the duration a single subpart (section) takes up of a larger duration. The value will be the 75th percentile of aggregate data. "Field" means that the data was collected from real users in the field as opposed to the developers local environment. "Field" is synonymous with "Real user data".
   */
  fieldDuration: "Field p75",
  /**
   * @description Text status indicating that the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: "No LCP detected"
};
var str_11 = i18n21.i18n.registerUIStrings("models/trace/insights/LCPBreakdown.ts", UIStrings11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
function isLCPBreakdownInsight(model) {
  return model.insightKey === "LCPBreakdown";
}
function anyValuesNaN(...values) {
  return values.some((v) => Number.isNaN(v));
}
function determineSubparts(nav, docRequest, lcpEvent, lcpRequest) {
  const firstDocByteTs = calculateDocFirstByteTs(docRequest);
  if (firstDocByteTs === null) {
    return null;
  }
  const ttfb = Helpers11.Timing.traceWindowFromMicroSeconds(nav.ts, firstDocByteTs);
  ttfb.label = i18nString11(UIStrings11.timeToFirstByte);
  let renderDelay = Helpers11.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpEvent.ts);
  renderDelay.label = i18nString11(UIStrings11.elementRenderDelay);
  if (!lcpRequest) {
    if (anyValuesNaN(ttfb.range, renderDelay.range)) {
      return null;
    }
    return { ttfb, renderDelay };
  }
  const lcpStartTs = lcpRequest.ts;
  const lcpReqEndTs = lcpRequest.args.data.syntheticData.finishTime;
  const loadDelay = Helpers11.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpStartTs);
  const loadDuration = Helpers11.Timing.traceWindowFromMicroSeconds(lcpStartTs, lcpReqEndTs);
  renderDelay = Helpers11.Timing.traceWindowFromMicroSeconds(lcpReqEndTs, lcpEvent.ts);
  loadDelay.label = i18nString11(UIStrings11.resourceLoadDelay);
  loadDuration.label = i18nString11(UIStrings11.resourceLoadDuration);
  renderDelay.label = i18nString11(UIStrings11.elementRenderDelay);
  if (anyValuesNaN(ttfb.range, loadDelay.range, loadDuration.range, renderDelay.range)) {
    return null;
  }
  return {
    ttfb,
    loadDelay,
    loadDuration,
    renderDelay
  };
}
function finalize11(partialModel) {
  const relatedEvents = [];
  if (partialModel.lcpEvent) {
    relatedEvents.push(partialModel.lcpEvent);
  }
  if (partialModel.lcpRequest) {
    relatedEvents.push(partialModel.lcpRequest);
  }
  let state = "pass";
  if (partialModel.lcpMs !== void 0) {
    const classification = Handlers4.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(
      Helpers11.Timing.milliToMicro(partialModel.lcpMs)
    );
    if (classification === Handlers4.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD) {
      state = "informative";
    } else {
      state = "fail";
    }
  }
  return {
    insightKey: "LCPBreakdown" /* LCP_BREAKDOWN */,
    strings: UIStrings11,
    title: i18nString11(UIStrings11.title),
    description: i18nString11(UIStrings11.description),
    docs: "https://developer.chrome.com/docs/performance/insights/lcp-breakdown",
    category: "LCP" /* LCP */,
    state,
    ...partialModel,
    relatedEvents
  };
}
function generateInsight11(data, context) {
  if (!context.navigation) {
    return finalize11({});
  }
  const networkRequests = data.NetworkRequests;
  const frameMetrics = data.PageLoadMetrics.metricScoresByFrameId.get(context.frameId);
  if (!frameMetrics) {
    throw new Error("no frame metrics");
  }
  const navMetrics = frameMetrics.get(context.navigation);
  if (!navMetrics) {
    throw new Error("no navigation metrics");
  }
  const metricScore = navMetrics.get(Handlers4.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  const lcpEvent = metricScore?.event;
  if (!lcpEvent || !Types7.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
    return finalize11({ warnings: ["NO_LCP" /* NO_LCP */] });
  }
  const lcpMs = Helpers11.Timing.microToMilli(metricScore.timing);
  const lcpTs = metricScore.event?.ts ? Helpers11.Timing.microToMilli(metricScore.event?.ts) : void 0;
  const lcpRequest = "navigationId" in context ? data.LargestImagePaint.lcpRequestByNavigationId.get(context.navigationId) : void 0;
  const docRequest = "navigationId" in context ? networkRequests.byId.get(context.navigationId) : void 0;
  if (!docRequest) {
    return finalize11({ lcpMs, lcpTs, lcpEvent, lcpRequest, warnings: ["NO_DOCUMENT_REQUEST" /* NO_DOCUMENT_REQUEST */] });
  }
  return finalize11({
    lcpMs,
    lcpTs,
    lcpEvent,
    lcpRequest,
    subparts: determineSubparts(context.navigation, docRequest, lcpEvent, lcpRequest) ?? void 0
  });
}
function createOverlays11(model) {
  if (!model.subparts || !model.lcpTs) {
    return [];
  }
  const overlays = [
    {
      type: "TIMESPAN_BREAKDOWN",
      sections: Object.values(model.subparts).map((subpart) => ({ bounds: subpart, label: subpart.label, showDuration: true }))
    }
  ];
  if (model.lcpRequest) {
    overlays.push({ type: "ENTRY_OUTLINE", entry: model.lcpRequest, outlineReason: "INFO" });
  }
  return overlays;
}

// ../../front_end/models/trace/insights/LCPDiscovery.ts
var LCPDiscovery_exports = {};
__export(LCPDiscovery_exports, {
  UIStrings: () => UIStrings12,
  createOverlays: () => createOverlays12,
  generateInsight: () => generateInsight12,
  getImageData: () => getImageData,
  i18nString: () => i18nString12,
  isLCPDiscoveryInsight: () => isLCPDiscoveryInsight
});
import * as i18n23 from "../../../core/i18n/i18n.js";
import * as Handlers5 from "../handlers/handlers.js";
import * as Helpers12 from "../helpers/helpers.js";
import * as Types8 from "../types/types.js";
var UIStrings12 = {
  /**
   * @description Title of an insight that provides details about the LCP metric, and the network requests necessary to load it. Details how the LCP request was discoverable - in other words, the path necessary to load it (ex: network requests, JavaScript).
   */
  title: "LCP request discovery",
  /**
   * @description Description of an insight that provides details about the LCP metric, and the network requests necessary to load it.
   */
  description: "[Optimize LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery) by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading.",
  /**
   * @description Text to tell the user how long after the earliest discovery time their LCP element loaded.
   * @example {401ms} PH1
   */
  lcpLoadDelay: "LCP image loaded {PH1} after earliest start point.",
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" is applied to the LCP request.
   */
  fetchPriorityApplied: "fetchpriority=high applied",
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" should be applied to the LCP request.
   */
  fetchPriorityShouldBeApplied: "fetchpriority=high should be applied",
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" should be applied to the preload request that loads the LCP image.
   */
  fetchPriorityShouldBeAppliedToImagePreload: "fetchpriority=high should be applied to the image preload request",
  /**
   * @description Text to tell the user that the LCP request is discoverable in the initial document.
   */
  requestDiscoverable: "Request is discoverable in initial document",
  /**
   * @description Text to tell the user that LCP resources should avoid using loading=lazy.
   */
  lazyLoadNotApplied: "LCP resources shouldn\u2019t use loading=lazy",
  /**
   * @description Text status indicating that the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: "No LCP detected",
  /**
   * @description Text status indicating that the Largest Contentful Paint (LCP) metric was text rather than an image. "LCP" is an acronym and should not be translated.
   */
  noLcpResource: "No LCP resource detected because the LCP isn\u2019t an image"
};
var str_12 = i18n23.i18n.registerUIStrings("models/trace/insights/LCPDiscovery.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
function isLCPDiscoveryInsight(model) {
  return model.insightKey === "LCPDiscovery";
}
function finalize12(partialModel) {
  const relatedEvents = partialModel.lcpEvent && partialModel.lcpRequest ? (
    // TODO: add entire request initiator chain?
    [partialModel.lcpEvent, partialModel.lcpRequest]
  ) : [];
  return {
    insightKey: "LCPDiscovery" /* LCP_DISCOVERY */,
    strings: UIStrings12,
    title: i18nString12(UIStrings12.title),
    description: i18nString12(UIStrings12.description),
    docs: "https://developer.chrome.com/docs/performance/insights/lcp-discovery",
    category: "LCP" /* LCP */,
    state: partialModel.lcpRequest && partialModel.checklist && (!partialModel.checklist.eagerlyLoaded.value || !partialModel.checklist.requestDiscoverable.value || !partialModel.checklist.priorityHinted.value) ? "fail" : "pass",
    ...partialModel,
    relatedEvents
  };
}
function generateInsight12(data, context) {
  if (!context.navigation || !("navigationId" in context)) {
    return finalize12({});
  }
  const networkRequests = data.NetworkRequests;
  const frameMetrics = data.PageLoadMetrics.metricScoresByFrameId.get(context.frameId);
  if (!frameMetrics) {
    throw new Error("no frame metrics");
  }
  const navMetrics = frameMetrics.get(context.navigation);
  if (!navMetrics) {
    throw new Error("no navigation metrics");
  }
  const metricScore = navMetrics.get(Handlers5.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  const lcpEvent = metricScore?.event;
  if (!lcpEvent || !Types8.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
    return finalize12({ warnings: ["NO_LCP" /* NO_LCP */] });
  }
  const docRequest = networkRequests.byId.get(context.navigationId);
  if (!docRequest) {
    return finalize12({ warnings: ["NO_DOCUMENT_REQUEST" /* NO_DOCUMENT_REQUEST */] });
  }
  const lcpRequest = data.LargestImagePaint.lcpRequestByNavigationId.get(context.navigationId);
  if (!lcpRequest) {
    return finalize12({ lcpEvent });
  }
  const initiatorUrl = lcpRequest.args.data.initiator?.url;
  const initiatedByMainDoc = lcpRequest?.args.data.initiator?.type === "parser" && docRequest.args.data.url === initiatorUrl;
  const imgPreloadedOrFoundInHTML = lcpRequest?.args.data.isLinkPreload || initiatedByMainDoc;
  const imageFetchPriorityHint = lcpRequest?.args.data.fetchPriorityHint;
  const earliestDiscoveryTime = calculateDocFirstByteTs(docRequest);
  const priorityHintFound = imageFetchPriorityHint === "high";
  const missingPriorityHintLabel = lcpRequest.args.data.isLinkPreload ? i18nString12(UIStrings12.fetchPriorityShouldBeAppliedToImagePreload) : i18nString12(UIStrings12.fetchPriorityShouldBeApplied);
  const lcpNotLazyLoaded = lcpEvent.args.data?.loadingAttr !== "lazy" || lcpRequest.args.data.isLinkPreload;
  return finalize12({
    lcpEvent,
    lcpRequest,
    earliestDiscoveryTimeTs: earliestDiscoveryTime ? Types8.Timing.Micro(earliestDiscoveryTime) : void 0,
    checklist: {
      priorityHinted: {
        label: priorityHintFound ? i18nString12(UIStrings12.fetchPriorityApplied) : missingPriorityHintLabel,
        value: priorityHintFound
      },
      requestDiscoverable: { label: i18nString12(UIStrings12.requestDiscoverable), value: imgPreloadedOrFoundInHTML },
      eagerlyLoaded: { label: i18nString12(UIStrings12.lazyLoadNotApplied), value: lcpNotLazyLoaded }
    }
  });
}
function getImageData(model) {
  if (!model.lcpRequest || !model.checklist) {
    return null;
  }
  const shouldIncreasePriorityHint = !model.checklist.priorityHinted.value;
  const shouldPreloadImage = !model.checklist.requestDiscoverable.value;
  const shouldRemoveLazyLoading = !model.checklist.eagerlyLoaded.value;
  const imageLCP = shouldIncreasePriorityHint !== void 0 && shouldPreloadImage !== void 0 && shouldRemoveLazyLoading !== void 0;
  if (!imageLCP) {
    return null;
  }
  const data = {
    checklist: model.checklist,
    request: model.lcpRequest,
    discoveryDelay: null,
    estimatedSavings: model.metricSavings?.LCP ?? null
  };
  if (model.earliestDiscoveryTimeTs && model.lcpRequest) {
    const discoveryDelay = model.lcpRequest.ts - model.earliestDiscoveryTimeTs;
    data.discoveryDelay = Types8.Timing.Micro(discoveryDelay);
  }
  return data;
}
function createOverlays12(model) {
  const imageResults = getImageData(model);
  if (!imageResults?.discoveryDelay) {
    return [];
  }
  const delay = Helpers12.Timing.traceWindowFromMicroSeconds(
    Types8.Timing.Micro(imageResults.request.ts - imageResults.discoveryDelay),
    imageResults.request.ts
  );
  return [
    {
      type: "ENTRY_OUTLINE",
      entry: imageResults.request,
      outlineReason: "ERROR"
    },
    {
      type: "CANDY_STRIPED_TIME_RANGE",
      bounds: delay,
      entry: imageResults.request
    },
    {
      type: "TIMESPAN_BREAKDOWN",
      sections: [{
        bounds: delay,
        // This is overridden in the component.
        label: `${imageResults.discoveryDelay} microseconds`,
        showDuration: false
      }],
      entry: imageResults.request,
      renderLocation: "ABOVE_EVENT"
    }
  ];
}

// ../../front_end/models/trace/insights/LegacyJavaScript.ts
var LegacyJavaScript_exports = {};
__export(LegacyJavaScript_exports, {
  UIStrings: () => UIStrings13,
  createOverlays: () => createOverlays13,
  generateInsight: () => generateInsight13,
  i18nString: () => i18nString13,
  isLegacyJavaScript: () => isLegacyJavaScript
});
import * as i18n25 from "../../../core/i18n/i18n.js";
import * as LegacyJavaScriptLib from "../../../third_party/legacy-javascript/legacy-javascript.js";
import * as Helpers13 from "../helpers/helpers.js";
var { detectLegacyJavaScript } = LegacyJavaScriptLib.LegacyJavaScript;
var UIStrings13 = {
  /**
   * @description Title of an insight that identifies polyfills for modern JavaScript features, and recommends their removal.
   */
  title: "Legacy JavaScript",
  /**
   * @description Description of an insight that identifies polyfills for modern JavaScript features, and recommends their removal.
   */
  description: "Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren\u2019t necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/articles/baseline-and-polyfills) features, unless you know you must support older browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://developer.chrome.com/docs/performance/insights/legacy-javascript).",
  /**
   * @description Label for a column in a data table; entries will be the individual JavaScript scripts.
   */
  columnScript: "Script",
  /**
   * @description Label for a column in a data table; entries will be the number of wasted bytes (aka the estimated savings in terms of bytes).
   */
  columnWastedBytes: "Wasted bytes",
  /**
   * @description Message shown when no legacy JavaScript is found.
   */
  noLegacyJavaScript: "No legacy JavaScript found"
};
var str_13 = i18n25.i18n.registerUIStrings("models/trace/insights/LegacyJavaScript.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var BYTE_THRESHOLD = 5e3;
function finalize13(partialModel) {
  const requests = [...partialModel.legacyJavaScriptResults.keys()].map((script) => script.request).filter((e) => !!e);
  return {
    insightKey: "LegacyJavaScript" /* LEGACY_JAVASCRIPT */,
    strings: UIStrings13,
    title: i18nString13(UIStrings13.title),
    description: i18nString13(UIStrings13.description),
    docs: "https://developer.chrome.com/docs/performance/insights/legacy-javascript",
    category: "All" /* ALL */,
    state: requests.length ? "fail" : "pass",
    relatedEvents: [...new Set(requests)],
    ...partialModel
  };
}
function isLegacyJavaScript(model) {
  return model.insightKey === "LegacyJavaScript" /* LEGACY_JAVASCRIPT */;
}
function generateInsight13(data, context) {
  const scripts = data.Scripts.scripts.filter((script) => {
    if (script.frame !== context.frameId) {
      return false;
    }
    if (script.url?.startsWith("chrome-extension://")) {
      return false;
    }
    return Helpers13.Timing.timestampIsInBounds(context.bounds, script.ts) || script.request && Helpers13.Timing.eventIsInBounds(script.request, context.bounds);
  });
  const legacyJavaScriptResults = /* @__PURE__ */ new Map();
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const script of scripts) {
    if (!script.content || script.content.length < BYTE_THRESHOLD) {
      continue;
    }
    const result = detectLegacyJavaScript(script.content, script.sourceMap);
    if (result.estimatedByteSavings < BYTE_THRESHOLD) {
      continue;
    }
    const compressionRatio = estimateCompressionRatioForScript(script);
    const transferSize = Math.round(result.estimatedByteSavings * compressionRatio);
    result.estimatedByteSavings = transferSize;
    legacyJavaScriptResults.set(script, result);
    if (script.request) {
      const requestId = script.request.args.data.requestId;
      wastedBytesByRequestId.set(requestId, transferSize);
    }
  }
  const sorted = new Map([...legacyJavaScriptResults].sort((a, b) => b[1].estimatedByteSavings - a[1].estimatedByteSavings));
  return finalize13({
    legacyJavaScriptResults: sorted,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: wastedBytesByRequestId.values().reduce((acc, cur) => acc + cur, 0)
  });
}
function createOverlays13(model) {
  return [...model.legacyJavaScriptResults.keys()].map((script) => script.request).filter((e) => !!e).map((request) => {
    return {
      type: "ENTRY_OUTLINE",
      entry: request,
      outlineReason: "ERROR"
    };
  });
}

// ../../front_end/models/trace/insights/ModernHTTP.ts
var ModernHTTP_exports = {};
__export(ModernHTTP_exports, {
  UIStrings: () => UIStrings14,
  createOverlayForRequest: () => createOverlayForRequest3,
  createOverlays: () => createOverlays14,
  determineHttp1Requests: () => determineHttp1Requests,
  generateInsight: () => generateInsight14,
  i18nString: () => i18nString14,
  isModernHTTPInsight: () => isModernHTTPInsight
});
import * as i18n27 from "../../../core/i18n/i18n.js";
import * as Platform4 from "../../../core/platform/platform.js";
import * as Handlers6 from "../handlers/handlers.js";
import * as Helpers15 from "../helpers/helpers.js";
import * as Types9 from "../types/types.js";
var UIStrings14 = {
  /**
   * @description Title of an insight that recommends using HTTP/2 over HTTP/1.1 because of the performance benefits. "HTTP" should not be translated.
   */
  title: "Modern HTTP",
  /**
   * @description Description of an insight that recommends using HTTP/2 over HTTP/1.1 because of the performance benefits. "HTTP" should not be translated.
   */
  description: "HTTP/2 and HTTP/3 offer many benefits over HTTP/1.1, such as multiplexing. [Learn more about using modern HTTP](https://developer.chrome.com/docs/performance/insights/modern-http).",
  /**
   * @description Column header for a table where each cell represents a network request.
   */
  request: "Request",
  /**
   * @description Column header for a table where each cell represents the protocol of a network request.
   */
  protocol: "Protocol",
  /**
   * @description Text explaining that there were no requests that were slowed down by using HTTP/1.1. "HTTP/1.1" should not be translated.
   */
  noOldProtocolRequests: "No requests used HTTP/1.1, or its current use of HTTP/1.1 doesn\u2019t present a significant optimization opportunity. HTTP/1.1 requests are only flagged if six or more static assets originate from the same origin, and they aren\u2019t served from a local development environment or a third-party source."
};
var str_14 = i18n27.i18n.registerUIStrings("models/trace/insights/ModernHTTP.ts", UIStrings14);
var i18nString14 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
function isModernHTTPInsight(model) {
  return model.insightKey === "ModernHTTP" /* MODERN_HTTP */;
}
function isMultiplexableStaticAsset(request, entityMappings, firstPartyEntity) {
  if (!Helpers15.Network.STATIC_RESOURCE_TYPES.has(request.args.data.resourceType)) {
    return false;
  }
  if (request.args.data.decodedBodyLength < 100) {
    const entity = entityMappings.entityByEvent.get(request);
    if (entity) {
      if (firstPartyEntity?.name === entity.name) {
        return true;
      }
      if (!entity.isUnrecognized) {
        return false;
      }
    }
  }
  return true;
}
function determineHttp1Requests(requests, entityMappings, firstPartyEntity) {
  const http1Requests = [];
  const groupedByOrigin = /* @__PURE__ */ new Map();
  for (const record of requests) {
    const url = new URL(record.args.data.url);
    if (!isMultiplexableStaticAsset(record, entityMappings, firstPartyEntity)) {
      continue;
    }
    if (Helpers15.Network.isSyntheticNetworkRequestLocalhost(record)) {
      continue;
    }
    const originRequests = Platform4.MapUtilities.getWithDefault(groupedByOrigin, url.origin, () => []);
    originRequests.push(record);
  }
  const seenURLs = /* @__PURE__ */ new Set();
  for (const request of requests) {
    if (seenURLs.has(request.args.data.url)) {
      continue;
    }
    if (request.args.data.fromServiceWorker) {
      continue;
    }
    const isOldHttp = /HTTP\/[01][.\d]?/i.test(request.args.data.protocol);
    if (!isOldHttp) {
      continue;
    }
    const url = new URL(request.args.data.url);
    const group = groupedByOrigin.get(url.origin) || [];
    if (group.length < 6) {
      continue;
    }
    seenURLs.add(request.args.data.url);
    http1Requests.push(request);
  }
  return http1Requests;
}
function computeWasteWithGraph(urlsToChange, graph, simulator) {
  const simulationBefore = simulator.simulate(graph);
  const originalProtocols = /* @__PURE__ */ new Map();
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    if (!urlsToChange.has(node.request.url)) {
      return;
    }
    originalProtocols.set(node.request.requestId, node.request.protocol);
    node.request.protocol = "h2";
  });
  const simulationAfter = simulator.simulate(graph);
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    const originalProtocol = originalProtocols.get(node.request.requestId);
    if (originalProtocol === void 0) {
      return;
    }
    node.request.protocol = originalProtocol;
  });
  const savings = simulationBefore.timeInMs - simulationAfter.timeInMs;
  return Platform4.NumberUtilities.floor(savings, 1 / 10);
}
function computeMetricSavings(http1Requests, context) {
  if (!context.navigation || !("lantern" in context) || !context.lantern) {
    return;
  }
  const urlsToChange = new Set(http1Requests.map((r) => r.args.data.url));
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.optimisticGraph;
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.optimisticGraph;
  return {
    FCP: computeWasteWithGraph(urlsToChange, fcpGraph, context.lantern.simulator),
    LCP: computeWasteWithGraph(urlsToChange, lcpGraph, context.lantern.simulator)
  };
}
function finalize14(partialModel) {
  return {
    insightKey: "ModernHTTP" /* MODERN_HTTP */,
    strings: UIStrings14,
    title: i18nString14(UIStrings14.title),
    description: i18nString14(UIStrings14.description),
    docs: "https://developer.chrome.com/docs/performance/insights/modern-http",
    category: "LCP" /* LCP */,
    state: partialModel.http1Requests.length > 0 ? "fail" : "pass",
    ...partialModel,
    relatedEvents: partialModel.http1Requests
  };
}
function generateInsight14(data, context) {
  const isWithinContext = (event) => Helpers15.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const entityMappings = data.NetworkRequests.entityMappings;
  let firstPartyUrl = data.Meta.mainFrameURL;
  if (context.navigation && !Types9.Events.isSoftNavigationStart(context.navigation)) {
    firstPartyUrl = context.navigation.args.data?.documentLoaderURL ?? firstPartyUrl;
  }
  const firstPartyEntity = Handlers6.Helpers.getEntityForUrl(firstPartyUrl, entityMappings);
  const http1Requests = determineHttp1Requests(contextRequests, entityMappings, firstPartyEntity ?? null);
  return finalize14({
    http1Requests,
    metricSavings: computeMetricSavings(http1Requests, context)
  });
}
function createOverlayForRequest3(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays14(model) {
  return model.http1Requests.map((req) => createOverlayForRequest3(req)) ?? [];
}

// ../../front_end/models/trace/insights/NetworkDependencyTree.ts
var NetworkDependencyTree_exports = {};
__export(NetworkDependencyTree_exports, {
  TOO_MANY_PRECONNECTS_THRESHOLD: () => TOO_MANY_PRECONNECTS_THRESHOLD,
  UIStrings: () => UIStrings15,
  createOverlays: () => createOverlays15,
  generateInsight: () => generateInsight15,
  generatePreconnectCandidates: () => generatePreconnectCandidates,
  generatePreconnectedOrigins: () => generatePreconnectedOrigins,
  handleLinkResponseHeader: () => handleLinkResponseHeader,
  i18nString: () => i18nString15,
  isNetworkDependencyTreeInsight: () => isNetworkDependencyTreeInsight
});
import * as Common from "../../../core/common/common.js";
import * as i18n29 from "../../../core/i18n/i18n.js";
import * as Platform5 from "../../../core/platform/platform.js";
import * as Extras3 from "../extras/extras.js";
import * as Helpers16 from "../helpers/helpers.js";
import * as Types10 from "../types/types.js";
var UIStrings15 = {
  /**
   * @description Title of an insight that recommends avoiding chaining critical requests.
   */
  title: "Network dependency tree",
  /**
   * @description Description of an insight that recommends avoiding chaining critical requests.
   */
  description: "[Avoid chaining critical requests](https://developer.chrome.com/docs/performance/insights/network-dependency-tree) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.",
  /**
   * @description Description of the warning that recommends avoiding chaining critical requests.
   */
  warningDescription: "Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.",
  /**
   * @description Text status indicating that there aren’t long chaining critical network requests.
   */
  noNetworkDependencyTree: "No rendering tasks impacted by network dependencies",
  /**
   * @description Text for the maximum critical path latency. This refers to the longest chain of network requests that
   * the browser must download before it can render the page.
   */
  maxCriticalPathLatency: "Max critical path latency:",
  /**
   * @description Label for a column in a data table; entries will be the network request.
   */
  columnRequest: "Request",
  /**
   * @description Label for a column in a data table; entries will be the time from main document till current network request.
   */
  columnTime: "Time",
  /**
   * @description Title of the table of the detected preconnect origins.
   */
  preconnectOriginsTableTitle: "Preconnected origins",
  /**
   * @description Description of the table of the detected preconnect origins.
   */
  preconnectOriginsTableDescription: "[preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints help the browser establish a connection earlier in the page load, saving time when the first request for that origin is made. The following are the origins that the page preconnected to.",
  /**
   * @description Text status indicating that no origins were preconnected.
   */
  noPreconnectOrigins: "No origins were preconnected",
  /**
   * @description A warning message that is shown when found more than 4 preconnected links. "preconnect" should not be translated.
   */
  tooManyPreconnectLinksWarning: "More than 4 `preconnect` connections were found. These should be used sparingly and only to the most important origins.",
  /**
   * @description A warning message that is shown when the user added preconnect for some unnecessary origins. "preconnect" should not be translated.
   */
  unusedWarning: "Unused preconnect. Only use `preconnect` for origins that the page is likely to request.",
  /**
   * @description A warning message that is shown when the user forgets to set the `crossorigin` HTML attribute, or setting it to an incorrect value, on the link is a common mistake when adding preconnect links. "preconnect" should not be translated.
   */
  crossoriginWarning: "Unused preconnect. Check that the `crossorigin` attribute is used properly.",
  /**
   * @description Label for a column in a data table; entries will be the source of the origin.
   */
  columnSource: "Source",
  /**
   * @description Text status indicating that there aren’t preconnect candidates.
   */
  noPreconnectCandidates: "No additional origins are good candidates for preconnecting",
  /**
   * @description Title of the table that shows the origins that the page should have preconnected to.
   */
  estSavingTableTitle: "Preconnect candidates",
  /**
   * @description Description of the table that recommends preconnecting to the origins to save time. "preconnect" should not be translated.
   */
  estSavingTableDescription: "Add [preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints to your most important origins, but try to use no more than 4.",
  /**
   * @description Label for a column in a data table; entries will be the origin of a web resource.
   */
  columnOrigin: "Origin",
  /**
   * @description Label for a column in a data table; entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions.
   */
  columnWastedMs: "Est LCP savings"
};
var str_15 = i18n29.i18n.registerUIStrings("models/trace/insights/NetworkDependencyTree.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var nonCriticalResourceTypes = /* @__PURE__ */ new Set([
  Network.ResourceType.Image,
  Network.ResourceType.XHR,
  Network.ResourceType.Fetch,
  Network.ResourceType.EventSource
]);
var PRECONNECT_SOCKET_MAX_IDLE_IN_MS = Types10.Timing.Milli(15e3);
var IGNORE_THRESHOLD_IN_MILLISECONDS = Types10.Timing.Milli(50);
var TOO_MANY_PRECONNECTS_THRESHOLD = 4;
function finalize15(partialModel) {
  return {
    insightKey: "NetworkDependencyTree" /* NETWORK_DEPENDENCY_TREE */,
    strings: UIStrings15,
    title: i18nString15(UIStrings15.title),
    description: i18nString15(UIStrings15.description),
    docs: "https://developer.chrome.com/docs/performance/insights/network-dependency-tree",
    category: "LCP" /* LCP */,
    state: partialModel.fail ? "fail" : "pass",
    ...partialModel
  };
}
function isCritical(request, context) {
  if (request.args.data.requestId === context.navigationId) {
    return true;
  }
  if (request.args.data.isLinkPreload) {
    return false;
  }
  const isIframe = request.args.data.resourceType === Network.ResourceType.Document && request.args.data.frame !== context.frameId;
  if (nonCriticalResourceTypes.has(request.args.data.resourceType) || isIframe || // Treat any missed images, primarily favicons, as non-critical resources
  request.args.data.mimeType.startsWith("image/")) {
    return false;
  }
  const initiatorUrl = request.args.data.initiator?.url || Helpers16.Trace.getStackTraceTopCallFrameInEventPayload(request)?.url;
  if (!initiatorUrl) {
    return false;
  }
  const isBlocking = Helpers16.Network.isSyntheticNetworkRequestEventRenderBlocking(request);
  const isHighPriority = Helpers16.Network.isSyntheticNetworkRequestHighPriority(request);
  return isHighPriority || isBlocking;
}
function findMaxLeafNode(node) {
  if (node.children.length === 0) {
    return node;
  }
  let maxLeaf = node.children[0];
  for (const child of node.children) {
    const leaf = findMaxLeafNode(child);
    if (leaf.timeFromInitialRequest > maxLeaf.timeFromInitialRequest) {
      maxLeaf = leaf;
    }
  }
  return maxLeaf;
}
function sortRecursively(nodes) {
  for (const node of nodes) {
    if (node.children.length > 0) {
      node.children.sort((nodeA, nodeB) => {
        const leafA = findMaxLeafNode(nodeA);
        const leafB = findMaxLeafNode(nodeB);
        return leafB.timeFromInitialRequest - leafA.timeFromInitialRequest;
      });
      sortRecursively(node.children);
    }
  }
}
function generateNetworkDependencyTree(context) {
  const rootNodes = [];
  const relatedEvents = /* @__PURE__ */ new Map();
  let maxTime = Types10.Timing.Micro(0);
  let fail = false;
  let longestChain = [];
  function addChain(path) {
    if (path.length === 0) {
      return;
    }
    if (path.length >= 2) {
      fail = true;
    }
    const initialRequest = path[0];
    const lastRequest = path[path.length - 1];
    const totalChainTime = Types10.Timing.Micro(lastRequest.ts + lastRequest.dur - initialRequest.ts);
    if (totalChainTime > maxTime) {
      maxTime = totalChainTime;
      longestChain = path;
    }
    let currentNodes = rootNodes;
    for (let depth = 0; depth < path.length; ++depth) {
      const request = path[depth];
      let found = currentNodes.find((node) => node.request === request);
      if (!found) {
        const timeFromInitialRequest = Types10.Timing.Micro(request.ts + request.dur - initialRequest.ts);
        found = {
          request,
          timeFromInitialRequest,
          children: [],
          relatedRequests: /* @__PURE__ */ new Set()
        };
        currentNodes.push(found);
      }
      path.forEach((request2) => found?.relatedRequests.add(request2));
      relatedEvents.set(request, depth < 2 ? [] : [i18nString15(UIStrings15.warningDescription)]);
      currentNodes = found.children;
    }
  }
  const seenNodes = /* @__PURE__ */ new Set();
  function getNextNodes(node) {
    return node.getDependents().filter((n) => n.getDependencies().every((d) => seenNodes.has(d)));
  }
  context.lantern?.graph.traverse((node, traversalPath) => {
    seenNodes.add(node);
    if (node.type !== "network") {
      return;
    }
    const networkNode = node;
    if (!isCritical(networkNode.rawRequest, context)) {
      return;
    }
    const networkPath = traversalPath.filter((node2) => node2.type === "network").reverse().map((node2) => node2.rawRequest);
    if (networkPath.some((request) => !isCritical(request, context))) {
      return;
    }
    if (node.isNonNetworkProtocol) {
      return;
    }
    addChain(networkPath);
  }, getNextNodes);
  if (longestChain.length > 0) {
    let currentNodes = rootNodes;
    for (const request of longestChain) {
      const found = currentNodes.find((node) => node.request === request);
      if (found) {
        found.isLongest = true;
        currentNodes = found.children;
      } else {
        console.error("Some request in the longest chain is not found");
      }
    }
  }
  sortRecursively(rootNodes);
  return {
    rootNodes,
    maxTime,
    fail,
    relatedEvents
  };
}
function getSecurityOrigin(url) {
  const parsedURL = new Common.ParsedURL.ParsedURL(url);
  return parsedURL.securityOrigin();
}
function handleLinkResponseHeaderPart(trimmedPart) {
  if (!trimmedPart) {
    return null;
  }
  const urlStart = trimmedPart.indexOf("<");
  const urlEnd = trimmedPart.indexOf(">");
  if (urlStart !== 0 || urlEnd === -1 || urlEnd <= urlStart) {
    return null;
  }
  const url = trimmedPart.substring(urlStart + 1, urlEnd).trim();
  if (!url) {
    return null;
  }
  const paramsString = trimmedPart.substring(urlEnd + 1).trim();
  if (paramsString) {
    const params = paramsString.split(";");
    for (const param of params) {
      const trimmedParam = param.trim();
      if (!trimmedParam) {
        continue;
      }
      const eqIndex = trimmedParam.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }
      const paramName = trimmedParam.substring(0, eqIndex).trim().toLowerCase();
      let paramValue = trimmedParam.substring(eqIndex + 1).trim();
      if (paramValue.startsWith('"') && paramValue.endsWith('"')) {
        paramValue = paramValue.substring(1, paramValue.length - 1);
      }
      if (paramName === "rel" && paramValue === "preconnect") {
        return { url, headerText: trimmedPart };
      }
    }
  }
  return null;
}
function handleLinkResponseHeader(linkHeaderValue) {
  if (!linkHeaderValue) {
    return [];
  }
  const preconnectedOrigins = [];
  for (let i = 0; i < linkHeaderValue.length; ) {
    const firstUrlEnd = linkHeaderValue.indexOf(">", i);
    if (firstUrlEnd === -1) {
      break;
    }
    const commaIndex = linkHeaderValue.indexOf(",", firstUrlEnd);
    const partEnd = commaIndex !== -1 ? commaIndex : linkHeaderValue.length;
    const part = linkHeaderValue.substring(i, partEnd);
    if (partEnd + 1 <= i) {
      console.warn("unexpected infinite loop, bailing");
      break;
    }
    i = partEnd + 1;
    const preconnectedOrigin = handleLinkResponseHeaderPart(part.trim());
    if (preconnectedOrigin) {
      preconnectedOrigins.push(preconnectedOrigin);
    }
  }
  return preconnectedOrigins;
}
function generatePreconnectedOrigins(data, context, contextRequests, preconnectCandidates) {
  const preconnectedOrigins = [];
  for (const event of data.NetworkRequests.linkPreconnectEvents) {
    preconnectedOrigins.push({
      node_id: event.args.data.node_id,
      frame: event.args.data.frame,
      url: event.args.data.url,
      // For each origin the page wanted to preconnect to:
      // - if we found no network requests to that origin at all then we issue a unused warning
      unused: !contextRequests.some(
        (request) => getSecurityOrigin(event.args.data.url) === getSecurityOrigin(request.args.data.url)
      ),
      // - else (we found network requests to the same origin) and if some of those network requests is too slow (if
      //   they are preconnect candidates), then we issue a unused warning with crossorigin hint
      crossorigin: preconnectCandidates.some((candidate) => candidate.origin === getSecurityOrigin(event.args.data.url)),
      source: "DOM"
    });
  }
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  documentRequest?.args.data.responseHeaders?.forEach((header) => {
    if (header.name.toLowerCase() === "link") {
      const preconnectedOriginsFromResponseHeader = handleLinkResponseHeader(header.value);
      preconnectedOriginsFromResponseHeader?.forEach((origin) => preconnectedOrigins.push({
        url: origin.url,
        headerText: origin.headerText,
        request: documentRequest,
        // For each origin the page wanted to preconnect to:
        // - if we found no network requests to that origin at all then we issue a unused warning
        unused: !contextRequests.some(
          (request) => getSecurityOrigin(origin.url) === getSecurityOrigin(request.args.data.url)
        ),
        // - else (we found network requests to the same origin) and if some of those network requests is too slow (if
        //   they are preconnect candidates), then we issue a unused warning with crossorigin hint
        crossorigin: preconnectCandidates.some((candidate) => candidate.origin === getSecurityOrigin(origin.url)),
        source: "ResponseHeader"
      }));
    }
  });
  return preconnectedOrigins;
}
function hasValidTiming(request) {
  return !!request.args.data.timing && request.args.data.timing.connectEnd >= 0 && request.args.data.timing.connectStart >= 0;
}
function hasAlreadyConnectedToOrigin(request) {
  const { timing } = request.args.data;
  if (!timing) {
    return false;
  }
  if (timing.dnsStart === -1 && timing.dnsEnd === -1 && timing.connectStart === -1 && timing.connectEnd === -1) {
    return true;
  }
  if (timing.dnsEnd - timing.dnsStart === 0 && timing.connectEnd - timing.connectStart === 0) {
    return true;
  }
  return false;
}
function socketStartTimeIsBelowThreshold(request, mainResource) {
  const timeSinceMainEnd = Math.max(0, request.args.data.syntheticData.sendStartTime - mainResource.args.data.syntheticData.finishTime);
  return Helpers16.Timing.microToMilli(timeSinceMainEnd) < PRECONNECT_SOCKET_MAX_IDLE_IN_MS;
}
function candidateRequestsByOrigin(data, mainResource, contextRequests, lcpGraphURLs) {
  const origins = /* @__PURE__ */ new Map();
  contextRequests.forEach((request) => {
    if (!hasValidTiming(request)) {
      return;
    }
    const initiator = Extras3.Initiators.getNetworkInitiator(data, request);
    if (initiator === mainResource) {
      return;
    }
    const url = new URL(request.args.data.url);
    if (url.origin === "null") {
      return;
    }
    const mainOrigin = new URL(mainResource.args.data.url).origin;
    if (url.origin === mainOrigin) {
      return;
    }
    if (!lcpGraphURLs.has(request.args.data.url)) {
      return;
    }
    if (hasAlreadyConnectedToOrigin(request)) {
      return;
    }
    if (!socketStartTimeIsBelowThreshold(request, mainResource)) {
      return;
    }
    const originRequests = Platform5.MapUtilities.getWithDefault(origins, url.origin, () => []);
    originRequests.push(request);
  });
  return origins;
}
function generatePreconnectCandidates(data, context, contextRequests) {
  if (!context.lantern) {
    return [];
  }
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  if (!documentRequest) {
    return [];
  }
  const { rtt, additionalRttByOrigin } = context.lantern.simulator.getOptions();
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.pessimisticGraph;
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.pessimisticGraph;
  const lcpGraphURLs = /* @__PURE__ */ new Set();
  lcpGraph.traverse((node) => {
    if (node.type === "network") {
      lcpGraphURLs.add(node.request.url);
    }
  });
  const fcpGraphURLs = /* @__PURE__ */ new Set();
  fcpGraph.traverse((node) => {
    if (node.type === "network") {
      fcpGraphURLs.add(node.request.url);
    }
  });
  const groupedOrigins = candidateRequestsByOrigin(data, documentRequest, contextRequests, lcpGraphURLs);
  let maxWastedLcp = Types10.Timing.Milli(0);
  let maxWastedFcp = Types10.Timing.Milli(0);
  let preconnectCandidates = [];
  groupedOrigins.forEach((requests) => {
    const firstRequestOfOrigin = requests[0];
    if (!firstRequestOfOrigin.args.data.timing) {
      return;
    }
    const firstRequestOfOriginParsedURL = new Common.ParsedURL.ParsedURL(firstRequestOfOrigin.args.data.url);
    const origin = firstRequestOfOriginParsedURL.securityOrigin();
    const additionalRtt = additionalRttByOrigin.get(origin) ?? 0;
    let connectionTime = Types10.Timing.Milli(rtt + additionalRtt);
    if (firstRequestOfOriginParsedURL.scheme === "https") {
      connectionTime = Types10.Timing.Milli(connectionTime * 2);
    }
    const timeBetweenMainResourceAndDnsStart = Types10.Timing.Micro(
      firstRequestOfOrigin.args.data.syntheticData.sendStartTime - documentRequest.args.data.syntheticData.finishTime + Helpers16.Timing.milliToMicro(firstRequestOfOrigin.args.data.timing.dnsStart)
    );
    const wastedMs = Math.min(connectionTime, Helpers16.Timing.microToMilli(timeBetweenMainResourceAndDnsStart));
    if (wastedMs < IGNORE_THRESHOLD_IN_MILLISECONDS) {
      return;
    }
    maxWastedLcp = Math.max(wastedMs, maxWastedLcp);
    if (fcpGraphURLs.has(firstRequestOfOrigin.args.data.url)) {
      maxWastedFcp = Math.max(wastedMs, maxWastedFcp);
    }
    preconnectCandidates.push({
      origin,
      wastedMs
    });
  });
  preconnectCandidates = preconnectCandidates.sort((a, b) => b.wastedMs - a.wastedMs);
  return preconnectCandidates.slice(0, TOO_MANY_PRECONNECTS_THRESHOLD);
}
function isNetworkDependencyTreeInsight(model) {
  return model.insightKey === "NetworkDependencyTree" /* NETWORK_DEPENDENCY_TREE */;
}
function generateInsight15(data, context) {
  if (!context.navigation || !("navigationId" in context)) {
    return finalize15({
      rootNodes: [],
      maxTime: 0,
      fail: false,
      preconnectedOrigins: [],
      preconnectCandidates: []
    });
  }
  const {
    rootNodes,
    maxTime,
    fail,
    relatedEvents
  } = generateNetworkDependencyTree(context);
  const isWithinContext = (event) => Helpers16.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const preconnectCandidates = generatePreconnectCandidates(data, context, contextRequests);
  const preconnectedOrigins = generatePreconnectedOrigins(data, context, contextRequests, preconnectCandidates);
  return finalize15({
    rootNodes,
    maxTime,
    fail,
    relatedEvents,
    preconnectedOrigins,
    preconnectCandidates
  });
}
function createOverlays15(model) {
  function walk(nodes, overlays2) {
    nodes.forEach((node) => {
      overlays2.push({
        type: "ENTRY_OUTLINE",
        entry: node.request,
        outlineReason: "ERROR"
      });
      walk(node.children, overlays2);
    });
  }
  const overlays = [];
  walk(model.rootNodes, overlays);
  return overlays;
}

// ../../front_end/models/trace/insights/RenderBlocking.ts
var RenderBlocking_exports = {};
__export(RenderBlocking_exports, {
  UIStrings: () => UIStrings16,
  createOverlayForRequest: () => createOverlayForRequest4,
  createOverlays: () => createOverlays16,
  generateInsight: () => generateInsight16,
  i18nString: () => i18nString16,
  isRenderBlockingInsight: () => isRenderBlockingInsight
});
import * as i18n31 from "../../../core/i18n/i18n.js";
import * as Handlers7 from "../handlers/handlers.js";
import * as Helpers17 from "../helpers/helpers.js";
var UIStrings16 = {
  /**
   * @description Title of an insight that provides the user with the list of network requests that blocked and therefore slowed down the page rendering and becoming visible to the user.
   */
  title: "Render-blocking requests",
  /**
   * @description Text to describe that there are requests blocking rendering, which may affect LCP.
   */
  description: `Requests are blocking the page\u2019s initial render, which may delay LCP. [Deferring or inlining](https://developer.chrome.com/docs/performance/insights/render-blocking) can move these network requests out of the critical path.`,
  /**
   * @description Label to describe a network request (that happens to be render-blocking).
   */
  renderBlockingRequest: "Request",
  /**
   * @description Label used for a time duration.
   */
  duration: "Duration",
  /**
   * @description Text status indicating that no requests blocked the initial render of a navigation.
   */
  noRenderBlocking: "No render-blocking requests for this navigation"
};
var str_16 = i18n31.i18n.registerUIStrings("models/trace/insights/RenderBlocking.ts", UIStrings16);
var i18nString16 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
function isRenderBlockingInsight(insight) {
  return insight.insightKey === "RenderBlocking";
}
var MINIMUM_WASTED_MS = 50;
function getNodesAndTimingByRequestId(nodeTimings) {
  const requestIdToNode = /* @__PURE__ */ new Map();
  for (const [node, nodeTiming] of nodeTimings) {
    if (node.type !== "network") {
      continue;
    }
    requestIdToNode.set(node.request.requestId, { node, nodeTiming });
  }
  return requestIdToNode;
}
function estimateSavingsWithGraphs2(deferredIds, lanternContext) {
  const simulator = lanternContext.simulator;
  const fcpGraph = lanternContext.metrics.firstContentfulPaint.optimisticGraph;
  const { nodeTimings } = lanternContext.simulator.simulate(fcpGraph);
  const adjustedNodeTimings = new Map(nodeTimings);
  const totalChildNetworkBytes = 0;
  const minimalFCPGraph = fcpGraph.cloneWithRelationships((node) => {
    const canDeferRequest = deferredIds.has(node.id);
    return !canDeferRequest;
  });
  if (minimalFCPGraph.type !== "network") {
    throw new Error("minimalFCPGraph not a NetworkNode");
  }
  const estimateBeforeInline = Math.max(...Array.from(
    Array.from(adjustedNodeTimings).map((timing) => timing[1].endTime)
  ));
  const originalTransferSize = minimalFCPGraph.request.transferSize;
  const safeTransferSize = originalTransferSize || 0;
  minimalFCPGraph.request.transferSize = safeTransferSize + totalChildNetworkBytes;
  const estimateAfterInline = simulator.simulate(minimalFCPGraph).timeInMs;
  minimalFCPGraph.request.transferSize = originalTransferSize;
  return Math.round(Math.max(estimateBeforeInline - estimateAfterInline, 0));
}
function hasImageLCP(data, context) {
  return data.LargestImagePaint.lcpRequestByNavigationId.has(context.navigationId);
}
function computeSavings(data, context, renderBlockingRequests) {
  if (!context.lantern) {
    return;
  }
  const nodesAndTimingsByRequestId = getNodesAndTimingByRequestId(context.lantern.metrics.firstContentfulPaint.optimisticEstimate.nodeTimings);
  const metricSavings = { FCP: 0, LCP: 0 };
  const requestIdToWastedMs = /* @__PURE__ */ new Map();
  const deferredNodeIds = /* @__PURE__ */ new Set();
  for (const request of renderBlockingRequests) {
    const nodeAndTiming = nodesAndTimingsByRequestId.get(request.args.data.requestId);
    if (!nodeAndTiming) {
      continue;
    }
    const { node, nodeTiming } = nodeAndTiming;
    node.traverse((node2) => deferredNodeIds.add(node2.id));
    const wastedMs = Math.round(nodeTiming.duration);
    if (wastedMs < MINIMUM_WASTED_MS) {
      continue;
    }
    requestIdToWastedMs.set(node.id, wastedMs);
  }
  if (requestIdToWastedMs.size) {
    metricSavings.FCP = estimateSavingsWithGraphs2(deferredNodeIds, context.lantern);
    if (!hasImageLCP(data, context)) {
      metricSavings.LCP = metricSavings.FCP;
    }
  }
  return { metricSavings, requestIdToWastedMs };
}
function finalize16(partialModel) {
  return {
    insightKey: "RenderBlocking" /* RENDER_BLOCKING */,
    strings: UIStrings16,
    title: i18nString16(UIStrings16.title),
    description: i18nString16(UIStrings16.description),
    docs: "https://developer.chrome.com/docs/performance/insights/render-blocking",
    category: "LCP" /* LCP */,
    state: partialModel.renderBlockingRequests.length > 0 ? "fail" : "pass",
    ...partialModel
  };
}
function generateInsight16(data, context) {
  if (!context.navigation || !("navigationId" in context)) {
    return finalize16({
      renderBlockingRequests: []
    });
  }
  const firstPaintTs = data.PageLoadMetrics.metricScoresByFrameId.get(context.frameId)?.get(context.navigation)?.get(Handlers7.ModelHandlers.PageLoadMetrics.MetricName.FP)?.event?.ts;
  if (!firstPaintTs) {
    return finalize16({
      renderBlockingRequests: [],
      warnings: ["NO_FP" /* NO_FP */]
    });
  }
  let renderBlockingRequests = [];
  for (const req of data.NetworkRequests.byTime) {
    if (req.args.data.frame !== context.frameId) {
      continue;
    }
    if (!Helpers17.Network.isSyntheticNetworkRequestEventRenderBlocking(req)) {
      continue;
    }
    if (req.args.data.syntheticData.finishTime > firstPaintTs) {
      continue;
    }
    if (req.args.data.renderBlocking === "in_body_parser_blocking") {
      const priority = req.args.data.priority;
      const isScript = req.args.data.resourceType === Network.ResourceType.Script;
      const isBlockingScript = isScript && priority === Network.ResourcePriority.High;
      if (priority !== Network.ResourcePriority.VeryHigh && !isBlockingScript) {
        continue;
      }
    }
    const navigation = Helpers17.Trace.getNavigationForTraceEvent(req, context.frameId, data.Meta.navigationsByFrameId);
    if (navigation === context.navigation) {
      renderBlockingRequests.push(req);
    }
  }
  const savings = computeSavings(data, context, renderBlockingRequests);
  renderBlockingRequests = renderBlockingRequests.sort((a, b) => {
    return b.dur - a.dur;
  });
  return finalize16({
    relatedEvents: renderBlockingRequests,
    renderBlockingRequests,
    ...savings
  });
}
function createOverlayForRequest4(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays16(model) {
  return model.renderBlockingRequests.map((request) => createOverlayForRequest4(request));
}

// ../../front_end/models/trace/insights/SlowCSSSelector.ts
var SlowCSSSelector_exports = {};
__export(SlowCSSSelector_exports, {
  UIStrings: () => UIStrings17,
  createOverlays: () => createOverlays17,
  generateInsight: () => generateInsight17,
  i18nString: () => i18nString17,
  isSlowCSSSelectorInsight: () => isSlowCSSSelectorInsight
});
import * as i18n33 from "../../../core/i18n/i18n.js";
import * as Helpers18 from "../helpers/helpers.js";
import * as Types11 from "../types/types.js";
var UIStrings17 = {
  /**
   * @description Title of an insight that provides details about slow CSS selectors.
   */
  title: "CSS selector costs",
  /**
   * @description Text to describe how to improve the performance of CSS selectors.
   */
  description: "If recalculate style costs remain high, selector optimization can reduce them. [Optimize the selectors](https://developer.chrome.com/docs/performance/insights/slow-css-selector) with both high elapsed time and high slow-path %. Simpler selectors, fewer selectors, a smaller DOM, and a shallower DOM will all reduce matching costs.",
  /**
   * @description Column name for count of elements that the engine attempted to match against a style rule.
   */
  matchAttempts: "Match attempts",
  /**
   * @description Column name for count of elements that matched a style rule.
   */
  matchCount: "Match count",
  /**
   * @description Column name for elapsed time spent computing a style rule.
   */
  elapsed: "Elapsed time",
  /**
   * @description Column name for the selectors that took the longest amount of time/effort.
   */
  topSelectors: "Top selectors",
  /**
   * @description Column name for a total sum.
   */
  total: "Total",
  /**
   * @description Text status indicating that no CSS selector data was found.
   */
  enableSelectorData: "No CSS selector data was found. CSS selector stats need to be enabled in the Performance panel settings.",
  /**
   * @description Top CSS selector when ranked by elapsed time in ms.
   */
  topSelectorElapsedTime: "Top selector elapsed time",
  /**
   * @description Top CSS selector when ranked by match attempt.
   */
  topSelectorMatchAttempt: "Top selector match attempt"
};
var str_17 = i18n33.i18n.registerUIStrings("models/trace/insights/SlowCSSSelector.ts", UIStrings17);
var i18nString17 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var slowCSSSelectorThreshold = 500;
function aggregateSelectorStats(data, context) {
  const selectorMap = /* @__PURE__ */ new Map();
  for (const [event, value] of data.dataForRecalcStyleEvent) {
    if (event.args.beginData?.frame !== context.frameId) {
      continue;
    }
    if (!Helpers18.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }
    for (const timing of value.timings) {
      const key = timing[Types11.Events.SelectorTimingsKey.Selector] + "_" + timing[Types11.Events.SelectorTimingsKey.StyleSheetId];
      const findTiming = selectorMap.get(key);
      if (findTiming !== void 0) {
        findTiming[Types11.Events.SelectorTimingsKey.Elapsed] += timing[Types11.Events.SelectorTimingsKey.Elapsed];
        findTiming[Types11.Events.SelectorTimingsKey.FastRejectCount] += timing[Types11.Events.SelectorTimingsKey.FastRejectCount];
        findTiming[Types11.Events.SelectorTimingsKey.MatchAttempts] += timing[Types11.Events.SelectorTimingsKey.MatchAttempts];
        findTiming[Types11.Events.SelectorTimingsKey.MatchCount] += timing[Types11.Events.SelectorTimingsKey.MatchCount];
      } else {
        selectorMap.set(key, { ...timing });
      }
    }
  }
  return [...selectorMap.values()];
}
function finalize17(partialModel) {
  return {
    insightKey: "SlowCSSSelector" /* SLOW_CSS_SELECTOR */,
    strings: UIStrings17,
    title: i18nString17(UIStrings17.title),
    description: i18nString17(UIStrings17.description),
    docs: "https://developer.chrome.com/docs/performance/insights/slow-css-selector",
    category: "All" /* ALL */,
    state: partialModel.topSelectorElapsedMs && partialModel.topSelectorMatchAttempts ? "informative" : "pass",
    ...partialModel
  };
}
function isSlowCSSSelectorInsight(model) {
  return model.insightKey === "SlowCSSSelector" /* SLOW_CSS_SELECTOR */;
}
function generateInsight17(data, context) {
  const selectorStatsData = data.SelectorStats;
  if (!selectorStatsData) {
    throw new Error("no selector stats data");
  }
  const selectorTimings = aggregateSelectorStats(selectorStatsData, context);
  let totalElapsedUs = 0;
  let totalMatchAttempts = 0;
  let totalMatchCount = 0;
  selectorTimings.map((timing) => {
    totalElapsedUs += timing[Types11.Events.SelectorTimingsKey.Elapsed];
    totalMatchAttempts += timing[Types11.Events.SelectorTimingsKey.MatchAttempts];
    totalMatchCount += timing[Types11.Events.SelectorTimingsKey.MatchCount];
  });
  let topSelectorElapsedMs = null;
  let topSelectorMatchAttempts = null;
  if (selectorTimings.length > 0) {
    topSelectorElapsedMs = selectorTimings.reduce((a, b) => {
      return a[Types11.Events.SelectorTimingsKey.Elapsed] > b[Types11.Events.SelectorTimingsKey.Elapsed] ? a : b;
    });
    if (topSelectorElapsedMs && topSelectorElapsedMs[Types11.Events.SelectorTimingsKey.Elapsed] < slowCSSSelectorThreshold) {
      topSelectorElapsedMs = null;
    }
    topSelectorMatchAttempts = selectorTimings.reduce((a, b) => {
      return a[Types11.Events.SelectorTimingsKey.MatchAttempts] > b[Types11.Events.SelectorTimingsKey.MatchAttempts] ? a : b;
    });
  }
  return finalize17({
    // TODO: should we identify RecalcStyle events as linked to this insight?
    relatedEvents: [],
    totalElapsedMs: Types11.Timing.Milli(totalElapsedUs / 1e3),
    totalMatchAttempts,
    totalMatchCount,
    topSelectorElapsedMs,
    topSelectorMatchAttempts
  });
}
function createOverlays17(_) {
  return [];
}

// ../../front_end/models/trace/insights/ThirdParties.ts
var ThirdParties_exports = {};
__export(ThirdParties_exports, {
  UIStrings: () => UIStrings18,
  createOverlays: () => createOverlays18,
  createOverlaysForSummary: () => createOverlaysForSummary,
  generateInsight: () => generateInsight18,
  i18nString: () => i18nString18,
  isThirdPartyInsight: () => isThirdPartyInsight
});
import * as i18n35 from "../../../core/i18n/i18n.js";
import * as ThirdPartyWeb from "../../../third_party/third-party-web/third-party-web.js";
import * as Extras4 from "../extras/extras.js";
import * as Handlers8 from "../handlers/handlers.js";
import * as Types12 from "../types/types.js";
var UIStrings18 = {
  /**
   * @description Title of an insight that provides details about the code on a web page that the user doesn't control (referred to as "third-party code").
   */
  title: "3rd parties",
  /**
   * @description Description of a DevTools insight that identifies the code on the page that the user doesn't control.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: `3rd party code can significantly impact load performance. [Reduce and defer loading of 3rd party code](https://developer.chrome.com/docs/performance/insights/third-parties) to prioritize your page\u2019s content.`,
  /**
   * @description Label for a table column that displays the name of a third-party provider.
   */
  columnThirdParty: "3rd party",
  /**
   * @description Label for a column in a data table; entries will be the download size of a web resource in kilobytes.
   */
  columnTransferSize: "Transfer size",
  /**
   * @description Label for a table column that displays how much time each row spent running on the main thread, entries will be the number of milliseconds spent.
   */
  columnMainThreadTime: "Main thread time",
  /**
   * @description Text block indicating that no third party content was detected on the page.
   */
  noThirdParties: "No third parties found"
};
var str_18 = i18n35.i18n.registerUIStrings("models/trace/insights/ThirdParties.ts", UIStrings18);
var i18nString18 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
function getRelatedEvents(summaries, firstPartyEntity) {
  const relatedEvents = [];
  for (const summary of summaries) {
    if (summary.entity !== firstPartyEntity) {
      relatedEvents.push(...summary.relatedEvents);
    }
  }
  return relatedEvents;
}
function finalize18(partialModel) {
  return {
    insightKey: "ThirdParties" /* THIRD_PARTIES */,
    strings: UIStrings18,
    title: i18nString18(UIStrings18.title),
    description: i18nString18(UIStrings18.description),
    docs: "https://developer.chrome.com/docs/performance/insights/third-parties",
    category: "All" /* ALL */,
    state: partialModel.entitySummaries.find((summary) => summary.entity !== partialModel.firstPartyEntity) ? "informative" : "pass",
    ...partialModel
  };
}
function isThirdPartyInsight(model) {
  return model.insightKey === "ThirdParties" /* THIRD_PARTIES */;
}
function generateInsight18(data, context) {
  const entitySummaries = Extras4.ThirdParties.summarizeByThirdParty(data, context.bounds);
  let firstPartyUrl = data.Meta.mainFrameURL;
  if (context.navigation && !Types12.Events.isSoftNavigationStart(context.navigation)) {
    firstPartyUrl = context.navigation.args.data?.documentLoaderURL ?? firstPartyUrl;
  }
  const firstPartyEntity = ThirdPartyWeb.ThirdPartyWeb.getEntity(firstPartyUrl) || Handlers8.Helpers.makeUpEntity(data.Renderer.entityMappings.createdEntityCache, firstPartyUrl);
  return finalize18({
    relatedEvents: getRelatedEvents(entitySummaries, firstPartyEntity),
    firstPartyEntity,
    entitySummaries
  });
}
function createOverlaysForSummary(summary) {
  const overlays = [];
  for (const event of summary.relatedEvents) {
    if (event.dur === void 0 || event.dur < 1e3) {
      continue;
    }
    const overlay = {
      type: "ENTRY_OUTLINE",
      entry: event,
      outlineReason: "INFO"
    };
    overlays.push(overlay);
  }
  return overlays;
}
function createOverlays18(model) {
  const overlays = [];
  const summaries = model.entitySummaries ?? [];
  for (const summary of summaries) {
    if (summary.entity === model.firstPartyEntity) {
      continue;
    }
    const summaryOverlays = createOverlaysForSummary(summary);
    overlays.push(...summaryOverlays);
  }
  return overlays;
}

// ../../front_end/models/trace/insights/Viewport.ts
var Viewport_exports = {};
__export(Viewport_exports, {
  UIStrings: () => UIStrings19,
  createOverlays: () => createOverlays19,
  generateInsight: () => generateInsight19,
  i18nString: () => i18nString19,
  isViewportInsight: () => isViewportInsight
});
import * as i18n37 from "../../../core/i18n/i18n.js";
import * as Platform6 from "../../../core/platform/platform.js";
import * as Handlers9 from "../handlers/handlers.js";
import * as Helpers20 from "../helpers/helpers.js";
import * as Types13 from "../types/types.js";
var UIStrings19 = {
  /**
   * @description Title of an insight that provides details about if the page's viewport is optimized for mobile viewing.
   */
  title: "Optimize viewport for mobile",
  /**
   * @description Text to tell the user how a viewport meta element can improve performance. \xa0 is a non-breaking space
   */
  description: "Tap interactions may be [delayed by up to 300\xA0ms](https://developer.chrome.com/docs/performance/insights/viewport) if the viewport isn\u2019t optimized for mobile.",
  /**
   * @description Text for a label describing the portion of an interaction event that was delayed due to a bad mobile viewport.
   */
  mobileTapDelayLabel: "Mobile tap delay"
};
var str_19 = i18n37.i18n.registerUIStrings("models/trace/insights/Viewport.ts", UIStrings19);
var i18nString19 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
function finalize19(partialModel) {
  return {
    insightKey: "Viewport" /* VIEWPORT */,
    strings: UIStrings19,
    title: i18nString19(UIStrings19.title),
    description: i18nString19(UIStrings19.description),
    docs: "https://developer.chrome.com/docs/performance/insights/viewport",
    category: "INP" /* INP */,
    state: partialModel.mobileOptimized === false ? "fail" : "pass",
    ...partialModel
  };
}
function isViewportInsight(model) {
  return model.insightKey === "Viewport" /* VIEWPORT */;
}
function generateInsight19(data, context) {
  const viewportEvent = data.UserInteractions.parseMetaViewportEvents.find((event) => {
    if (event.args.data.frame !== context.frameId) {
      return false;
    }
    return Helpers20.Timing.eventIsInBounds(event, context.bounds);
  });
  const compositorEvents = data.UserInteractions.beginCommitCompositorFrameEvents.filter((event) => {
    if (event.args.frame !== context.frameId) {
      return false;
    }
    if (viewportEvent && event.ts < viewportEvent.ts) {
      return false;
    }
    return Helpers20.Timing.eventIsInBounds(event, context.bounds);
  });
  if (!compositorEvents.length) {
    return finalize19({
      mobileOptimized: null,
      warnings: ["NO_LAYOUT" /* NO_LAYOUT */]
    });
  }
  for (const event of compositorEvents) {
    if (!event.args.is_mobile_optimized) {
      const longPointerInteractions = [...data.UserInteractions.interactionsOverThreshold.values()].filter(
        (interaction) => Handlers9.ModelHandlers.UserInteractions.categoryOfInteraction(interaction) === "POINTER" && interaction.inputDelay >= 5e4
      );
      const inputDelay = Math.max(0, ...longPointerInteractions.map((interaction) => interaction.inputDelay)) / 1e3;
      const inpMetricSavings = Platform6.NumberUtilities.clamp(inputDelay, 0, 300);
      return finalize19({
        mobileOptimized: false,
        viewportEvent,
        longPointerInteractions,
        metricSavings: { INP: inpMetricSavings }
      });
    }
  }
  return finalize19({
    mobileOptimized: true,
    viewportEvent
  });
}
function createOverlays19(model) {
  if (!model.longPointerInteractions) {
    return [];
  }
  return model.longPointerInteractions.map((interaction) => {
    const delay = Math.min(interaction.inputDelay, 300 * 1e3);
    const bounds = Helpers20.Timing.traceWindowFromMicroSeconds(
      Types13.Timing.Micro(interaction.ts),
      Types13.Timing.Micro(interaction.ts + delay)
    );
    return {
      type: "TIMESPAN_BREAKDOWN",
      entry: interaction,
      sections: [{ bounds, label: i18nString19(UIStrings19.mobileTapDelayLabel), showDuration: true }],
      renderLocation: "ABOVE_EVENT"
    };
  });
}
export {
  Cache_exports as Cache,
  Common_exports as Common,
  Models_exports as Models,
  ModernHTTP_exports as ModernHTTP,
  Statistics_exports as Statistics,
  types_exports as Types
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=insights.js.map
