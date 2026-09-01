var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/issues_manager/ClientHintIssue.ts
var ClientHintIssue_exports = {};
__export(ClientHintIssue_exports, {
  ClientHintIssue: () => ClientHintIssue
});
import * as i18n3 from "../../core/i18n/i18n.js";

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

// ../../front_end/models/issues_manager/Issue.ts
var Issue_exports = {};
__export(Issue_exports, {
  Issue: () => Issue,
  IssueCategory: () => IssueCategory,
  IssueKind: () => IssueKind,
  getIssueKindDescription: () => getIssueKindDescription,
  getIssueKindName: () => getIssueKindName,
  getShowThirdPartyIssuesSetting: () => getShowThirdPartyIssuesSetting,
  toZeroBasedLocation: () => toZeroBasedLocation,
  unionIssueKind: () => unionIssueKind
});
import * as Host from "../../core/host/host.js";
import * as i18n from "../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description The kind of an issue (plural, issues are categorized into kinds).
   */
  improvements: "Improvements",
  /**
   * @description The kind of an issue (plural, issues are categorized into kinds).
   */
  pageErrors: "Page errors",
  /**
   * @description The kind of an issue (plural, issues are categorized into kinds).
   */
  breakingChanges: "Breaking changes",
  /**
   * @description A description for a kind of issue we display in the Issues tab.
   */
  pageErrorIssue: "A page error issue: the page is not working correctly",
  /**
   * @description A description for a kind of issue we display in the Issues tab.
   */
  breakingChangeIssue: "A breaking change issue: the page may stop working in an upcoming version of Chrome",
  /**
   * @description A description for a kind of issue we display in the Issues tab.
   */
  improvementIssue: "An improvement issue: there is an opportunity to improve the page"
};
var str_ = i18n.i18n.registerUIStrings("models/issues_manager/Issue.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var IssueCategory = /* @__PURE__ */ ((IssueCategory2) => {
  IssueCategory2["CROSS_ORIGIN_EMBEDDER_POLICY"] = "CrossOriginEmbedderPolicy";
  IssueCategory2["GENERIC"] = "Generic";
  IssueCategory2["MIXED_CONTENT"] = "MixedContent";
  IssueCategory2["COOKIE"] = "Cookie";
  IssueCategory2["HEAVY_AD"] = "HeavyAd";
  IssueCategory2["CONTENT_SECURITY_POLICY"] = "ContentSecurityPolicy";
  IssueCategory2["LOW_TEXT_CONTRAST"] = "LowTextContrast";
  IssueCategory2["CORS"] = "Cors";
  IssueCategory2["QUIRKS_MODE"] = "QuirksMode";
  IssueCategory2["PERMISSION_ELEMENT"] = "PermissionElement";
  IssueCategory2["SELECTIVE_PERMISSIONS_INTERVENTION"] = "SelectivePermissionsIntervention";
  IssueCategory2["OTHER"] = "Other";
  return IssueCategory2;
})(IssueCategory || {});
var IssueKind = /* @__PURE__ */ ((IssueKind2) => {
  IssueKind2["PAGE_ERROR"] = "PageError";
  IssueKind2["BREAKING_CHANGE"] = "BreakingChange";
  IssueKind2["IMPROVEMENT"] = "Improvement";
  return IssueKind2;
})(IssueKind || {});
function getIssueKindName(issueKind) {
  switch (issueKind) {
    case "BreakingChange" /* BREAKING_CHANGE */:
      return i18nString(UIStrings.breakingChanges);
    case "Improvement" /* IMPROVEMENT */:
      return i18nString(UIStrings.improvements);
    case "PageError" /* PAGE_ERROR */:
      return i18nString(UIStrings.pageErrors);
  }
}
function getIssueKindDescription(issueKind) {
  switch (issueKind) {
    case "PageError" /* PAGE_ERROR */:
      return i18nString(UIStrings.pageErrorIssue);
    case "BreakingChange" /* BREAKING_CHANGE */:
      return i18nString(UIStrings.breakingChangeIssue);
    case "Improvement" /* IMPROVEMENT */:
      return i18nString(UIStrings.improvementIssue);
  }
}
function unionIssueKind(a, b) {
  if (a === "PageError" /* PAGE_ERROR */ || b === "PageError" /* PAGE_ERROR */) {
    return "PageError" /* PAGE_ERROR */;
  }
  if (a === "BreakingChange" /* BREAKING_CHANGE */ || b === "BreakingChange" /* BREAKING_CHANGE */) {
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  return "Improvement" /* IMPROVEMENT */;
}
function getShowThirdPartyIssuesSetting(settings) {
  return settings.createSetting("show-third-party-issues", true);
}
var Issue = class {
  #issueCode;
  #issuesModel;
  issueId = void 0;
  #issueDetails;
  #hidden;
  constructor(code, issueDetails, issuesModel = null, issueId) {
    this.#issueCode = typeof code === "object" ? code.code : code;
    this.#issueDetails = issueDetails;
    this.#issuesModel = issuesModel;
    this.issueId = issueId;
    Host.userMetrics.issueCreated(typeof code === "string" ? code : code.umaCode);
    this.#hidden = false;
  }
  code() {
    return this.#issueCode;
  }
  details() {
    return this.#issueDetails;
  }
  getBlockedByResponseDetails() {
    return [];
  }
  cookies() {
    return [];
  }
  rawCookieLines() {
    return [];
  }
  elements() {
    return [];
  }
  requests() {
    return [];
  }
  sources() {
    return [];
  }
  trackingSites() {
    return [];
  }
  isAssociatedWithRequestId(requestId) {
    for (const request of this.requests()) {
      if (request.requestId === requestId) {
        return true;
      }
    }
    return false;
  }
  /**
   * The model might be unavailable or belong to a target that has already been disposed.
   */
  model() {
    return this.#issuesModel;
  }
  isCausedByThirdParty() {
    return false;
  }
  getIssueId() {
    return this.issueId;
  }
  isHidden() {
    return this.#hidden;
  }
  setHidden(hidden) {
    this.#hidden = hidden;
  }
  maybeCreateConsoleMessage() {
    return;
  }
};
function toZeroBasedLocation(location) {
  if (!location) {
    return void 0;
  }
  return {
    url: location.url,
    scriptId: location.scriptId,
    lineNumber: location.lineNumber,
    columnNumber: location.columnNumber === 0 ? void 0 : location.columnNumber - 1
  };
}

// ../../front_end/models/issues_manager/MarkdownIssueDescription.ts
var MarkdownIssueDescription_exports = {};
__export(MarkdownIssueDescription_exports, {
  createIssueDescriptionFromMarkdown: () => createIssueDescriptionFromMarkdown,
  createIssueDescriptionFromRawMarkdown: () => createIssueDescriptionFromRawMarkdown,
  findTitleFromMarkdownAst: () => findTitleFromMarkdownAst,
  getFileContent: () => getFileContent,
  getIssueTitleFromMarkdownDescription: () => getIssueTitleFromMarkdownDescription,
  getMarkdownFileContent: () => getMarkdownFileContent,
  resolveLazyDescription: () => resolveLazyDescription,
  substitutePlaceholders: () => substitutePlaceholders
});
import * as Marked from "../../third_party/marked/marked.js";
function resolveLazyDescription(lazyDescription) {
  function linksMap(currentLink) {
    return { link: currentLink.link, linkTitle: currentLink.linkTitle() };
  }
  const substitutionMap = /* @__PURE__ */ new Map();
  lazyDescription.substitutions?.forEach((value, key) => {
    substitutionMap.set(key, value());
  });
  const description = {
    file: lazyDescription.file,
    links: lazyDescription.links.map(linksMap),
    substitutions: substitutionMap
  };
  return description;
}
async function getFileContent(url) {
  try {
    const response = await fetch(url.toString());
    return await response.text();
  } catch {
    throw new Error(
      `Markdown file ${url.toString()} not found. Make sure it is correctly listed in the relevant BUILD.gn files.`
    );
  }
}
async function getMarkdownFileContent(filename) {
  return await getFileContent(new URL(`descriptions/${filename}`, import.meta.url));
}
async function createIssueDescriptionFromMarkdown(description) {
  const rawMarkdown = await getMarkdownFileContent(description.file);
  const rawMarkdownWithPlaceholdersReplaced = substitutePlaceholders(rawMarkdown, description.substitutions);
  return createIssueDescriptionFromRawMarkdown(rawMarkdownWithPlaceholdersReplaced, description);
}
function createIssueDescriptionFromRawMarkdown(markdown, description) {
  const markdownAst = Marked.Marked.lexer(markdown);
  const title = findTitleFromMarkdownAst(markdownAst);
  if (!title) {
    throw new Error("Markdown issue descriptions must start with a heading");
  }
  return {
    title,
    markdown: markdownAst.slice(1),
    links: description.links
  };
}
var validPlaceholderMatchPattern = /\{(PLACEHOLDER_[a-zA-Z][a-zA-Z0-9]*)\}/g;
var validPlaceholderNamePattern = /PLACEHOLDER_[a-zA-Z][a-zA-Z0-9]*/;
function substitutePlaceholders(markdown, substitutions) {
  const unusedPlaceholders = new Set(substitutions ? substitutions.keys() : []);
  validatePlaceholders(unusedPlaceholders);
  const result = markdown.replace(validPlaceholderMatchPattern, (_, placeholder) => {
    const replacement = substitutions ? substitutions.get(placeholder) : void 0;
    if (replacement === void 0) {
      throw new Error(`No replacement provided for placeholder '${placeholder}'.`);
    }
    unusedPlaceholders.delete(placeholder);
    return replacement;
  });
  if (unusedPlaceholders.size > 0) {
    throw new Error(`Unused replacements provided: ${[...unusedPlaceholders]}`);
  }
  return result;
}
function validatePlaceholders(placeholders) {
  const invalidPlaceholders = [...placeholders].filter((placeholder) => !validPlaceholderNamePattern.test(placeholder));
  if (invalidPlaceholders.length > 0) {
    throw new Error(`Invalid placeholders provided in the substitutions map: ${invalidPlaceholders}`);
  }
}
function findTitleFromMarkdownAst(markdownAst) {
  if (markdownAst.length === 0 || markdownAst[0].type !== "heading" || markdownAst[0].depth !== 1) {
    return null;
  }
  return markdownAst[0].text;
}
async function getIssueTitleFromMarkdownDescription(description) {
  const rawMarkdown = await getMarkdownFileContent(description.file);
  const markdownAst = Marked.Marked.lexer(rawMarkdown);
  return findTitleFromMarkdownAst(markdownAst);
}

// ../../front_end/models/issues_manager/ClientHintIssue.ts
var UIStrings2 = {
  /**
   * @description Title for Client Hint specification URL link.
   */
  clientHintsInfrastructure: "Client Hints Infrastructure"
};
var str_2 = i18n3.i18n.registerUIStrings("models/issues_manager/ClientHintIssue.ts", UIStrings2);
var i18nLazyString = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var ClientHintIssue = class _ClientHintIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: Audits.InspectorIssueCode.ClientHintIssue,
        umaCode: [Audits.InspectorIssueCode.ClientHintIssue, issueDetails.clientHintIssueReason].join("::")
      },
      issueDetails,
      issuesModel
    );
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const description = issueDescriptions.get(this.details().clientHintIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  sources() {
    return [this.details().sourceCodeLocation];
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.clientHintIssueDetails;
    if (!details) {
      console.warn("Client Hint issue without details received.");
      return [];
    }
    return [new _ClientHintIssue(details, issuesModel)];
  }
};
var issueDescriptions = /* @__PURE__ */ new Map([
  [
    Audits.ClientHintIssueReason.MetaTagAllowListInvalidOrigin,
    {
      file: "clientHintMetaTagAllowListInvalidOrigin.md",
      links: [{
        link: "https://wicg.github.io/client-hints-infrastructure/",
        linkTitle: i18nLazyString(UIStrings2.clientHintsInfrastructure)
      }]
    }
  ],
  [
    Audits.ClientHintIssueReason.MetaTagModifiedHTML,
    {
      file: "clientHintMetaTagModifiedHTML.md",
      links: [{
        link: "https://wicg.github.io/client-hints-infrastructure/",
        linkTitle: i18nLazyString(UIStrings2.clientHintsInfrastructure)
      }]
    }
  ]
]);

// ../../front_end/models/issues_manager/ConnectionAllowlistIssue.ts
var ConnectionAllowlistIssue_exports = {};
__export(ConnectionAllowlistIssue_exports, {
  ConnectionAllowlistIssue: () => ConnectionAllowlistIssue
});
import * as i18n5 from "../../core/i18n/i18n.js";
var UIStrings3 = {
  /**
   * @description Title for Connection-Allowlist specification URL.
   */
  connectionAllowlistHeader: "Connection-Allowlist specification"
};
var str_3 = i18n5.i18n.registerUIStrings("models/issues_manager/ConnectionAllowlistIssue.ts", UIStrings3);
var i18nLazyString2 = i18n5.i18n.getLazilyComputedLocalizedString.bind(void 0, str_3);
var ConnectionAllowlistIssue = class _ConnectionAllowlistIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: `${Audits.InspectorIssueCode.ConnectionAllowlistIssue}::${issueDetails.error}`,
        umaCode: `${Audits.InspectorIssueCode.ConnectionAllowlistIssue}::${issueDetails.error}`
      },
      issueDetails,
      issuesModel
    );
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getDescription() {
    const description = {
      file: `connectionAllowlist${this.details().error}.md`,
      links: [
        {
          link: "https://wicg.github.io/private-network-access/#connection-allowlist",
          linkTitle: i18nLazyString2(UIStrings3.connectionAllowlistHeader)
        }
      ]
    };
    return resolveLazyDescription(description);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  requests() {
    return this.details().request ? [this.details().request] : [];
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.connectionAllowlistIssueDetails;
    if (!details) {
      console.warn("Connection-Allowlist issue without details received.");
      return [];
    }
    return [new _ConnectionAllowlistIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/ContentSecurityPolicyIssue.ts
var ContentSecurityPolicyIssue_exports = {};
__export(ContentSecurityPolicyIssue_exports, {
  ContentSecurityPolicyIssue: () => ContentSecurityPolicyIssue,
  evalViolationCode: () => evalViolationCode,
  inlineViolationCode: () => inlineViolationCode,
  trustedTypesPolicyViolationCode: () => trustedTypesPolicyViolationCode,
  trustedTypesSinkViolationCode: () => trustedTypesSinkViolationCode,
  urlViolationCode: () => urlViolationCode
});
import * as i18n7 from "../../core/i18n/i18n.js";
var UIStrings4 = {
  /**
   * @description Title for CSP URL link.
   */
  contentSecurityPolicySource: "Content Security Policy - Source allowlists",
  /**
   * @description Title for CSP inline issue link.
   */
  contentSecurityPolicyInlineCode: "Content Security Policy - Inline code",
  /**
   * @description Title for the CSP eval link.
   */
  contentSecurityPolicyEval: "Content Security Policy - Eval",
  /**
   * @description Title for Trusted Types policy violation issue link (https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API).
   */
  trustedTypesFixViolations: "Trusted Types - Fix violations",
  /**
   * @description Title for Trusted Types policy violation issue link (https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API).
   */
  trustedTypesPolicyViolation: "Trusted Types - Policy violation"
};
var str_4 = i18n7.i18n.registerUIStrings("models/issues_manager/ContentSecurityPolicyIssue.ts", UIStrings4);
var i18nLazyString3 = i18n7.i18n.getLazilyComputedLocalizedString.bind(void 0, str_4);
var ContentSecurityPolicyIssue = class _ContentSecurityPolicyIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    const issueCode = [
      Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
      issueDetails.contentSecurityPolicyViolationType
    ].join("::");
    super(issueCode, issueDetails, issuesModel, issueId);
  }
  getCategory() {
    return "ContentSecurityPolicy" /* CONTENT_SECURITY_POLICY */;
  }
  primaryKey() {
    return JSON.stringify(this.details(), [
      "blockedURL",
      "contentSecurityPolicyViolationType",
      "violatedDirective",
      "isReportOnly",
      "sourceCodeLocation",
      "url",
      "lineNumber",
      "columnNumber",
      "violatingNodeId"
    ]);
  }
  getDescription() {
    const description = issueDescriptions2.get(this.details().contentSecurityPolicyViolationType);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  getKind() {
    if (this.details().isReportOnly) {
      return "Improvement" /* IMPROVEMENT */;
    }
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const cspDetails = inspectorIssue.details.contentSecurityPolicyIssueDetails;
    if (!cspDetails) {
      console.warn("Content security policy issue without details received.");
      return [];
    }
    return [new _ContentSecurityPolicyIssue(cspDetails, issuesModel, inspectorIssue.issueId)];
  }
};
var cspURLViolation = {
  file: "cspURLViolation.md",
  links: [{
    link: "https://developers.google.com/web/fundamentals/security/csp#source_allowlists",
    linkTitle: i18nLazyString3(UIStrings4.contentSecurityPolicySource)
  }]
};
var cspInlineViolation = {
  file: "cspInlineViolation.md",
  links: [{
    link: "https://developers.google.com/web/fundamentals/security/csp#inline_code_is_considered_harmful",
    linkTitle: i18nLazyString3(UIStrings4.contentSecurityPolicyInlineCode)
  }]
};
var cspEvalViolation = {
  file: "cspEvalViolation.md",
  links: [{
    link: "https://developers.google.com/web/fundamentals/security/csp#eval_too",
    linkTitle: i18nLazyString3(UIStrings4.contentSecurityPolicyEval)
  }]
};
var cspTrustedTypesSinkViolation = {
  file: "cspTrustedTypesSinkViolation.md",
  links: [{
    link: "https://web.dev/trusted-types/#fix-the-violations",
    linkTitle: i18nLazyString3(UIStrings4.trustedTypesFixViolations)
  }]
};
var cspTrustedTypesPolicyViolation = {
  file: "cspTrustedTypesPolicyViolation.md",
  links: [{ link: "https://web.dev/trusted-types/", linkTitle: i18nLazyString3(UIStrings4.trustedTypesPolicyViolation) }]
};
var urlViolationCode = [
  Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Audits.ContentSecurityPolicyViolationType.KURLViolation
].join("::");
var inlineViolationCode = [
  Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Audits.ContentSecurityPolicyViolationType.KInlineViolation
].join("::");
var evalViolationCode = [
  Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Audits.ContentSecurityPolicyViolationType.KEvalViolation
].join("::");
var trustedTypesSinkViolationCode = [
  Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Audits.ContentSecurityPolicyViolationType.KTrustedTypesSinkViolation
].join("::");
var trustedTypesPolicyViolationCode = [
  Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Audits.ContentSecurityPolicyViolationType.KTrustedTypesPolicyViolation
].join("::");
var issueDescriptions2 = /* @__PURE__ */ new Map([
  [Audits.ContentSecurityPolicyViolationType.KURLViolation, cspURLViolation],
  [Audits.ContentSecurityPolicyViolationType.KInlineViolation, cspInlineViolation],
  [Audits.ContentSecurityPolicyViolationType.KEvalViolation, cspEvalViolation],
  [Audits.ContentSecurityPolicyViolationType.KTrustedTypesSinkViolation, cspTrustedTypesSinkViolation],
  [Audits.ContentSecurityPolicyViolationType.KTrustedTypesPolicyViolation, cspTrustedTypesPolicyViolation]
]);

// ../../front_end/models/issues_manager/CookieDeprecationMetadataIssue.ts
var CookieDeprecationMetadataIssue_exports = {};
__export(CookieDeprecationMetadataIssue_exports, {
  CookieDeprecationMetadataIssue: () => CookieDeprecationMetadataIssue
});
import * as i18n9 from "../../core/i18n/i18n.js";
var UIStrings5 = {
  /**
   * @description Label for a link for third-party cookie issues.
   */
  thirdPartyPhaseoutExplained: "Changes to Chrome\u2019s treatment of third-party cookies"
};
var str_5 = i18n9.i18n.registerUIStrings("models/issues_manager/CookieDeprecationMetadataIssue.ts", UIStrings5);
var i18nString2 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var CookieDeprecationMetadataIssue = class _CookieDeprecationMetadataIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const issueCode = Audits.InspectorIssueCode.CookieDeprecationMetadataIssue + "_" + issueDetails.operation;
    super(issueCode, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const fileName = this.details().operation === "SetCookie" ? "cookieWarnMetadataGrantSet.md" : "cookieWarnMetadataGrantRead.md";
    let optOutText = "";
    if (this.details().isOptOutTopLevel) {
      optOutText = "\n\n (Top level site opt-out: " + this.details().optOutPercentage + "% - [learn more](gracePeriodStagedControlExplainer))";
    }
    return {
      file: fileName,
      substitutions: /* @__PURE__ */ new Map([
        ["PLACEHOLDER_topleveloptout", optOutText]
      ]),
      links: [
        {
          link: "https://goo.gle/changes-to-chrome-browsing",
          linkTitle: i18nString2(UIStrings5.thirdPartyPhaseoutExplained)
        }
      ]
    };
  }
  getKind() {
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.cookieDeprecationMetadataIssueDetails;
    if (!details) {
      console.warn("Cookie deprecation metadata issue without details received.");
      return [];
    }
    return [new _CookieDeprecationMetadataIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/CookieIssue.ts
var CookieIssue_exports = {};
__export(CookieIssue_exports, {
  CookieIssue: () => CookieIssue,
  CookieIssueSubCategory: () => CookieIssueSubCategory,
  CookieStatus: () => CookieStatus,
  isCausedByThirdParty: () => isCausedByThirdParty
});
import * as Common from "../../core/common/common.js";
import * as i18n11 from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
var UIStrings6 = {
  /**
   * @description Label for the link for SameSite cookie issues.
   */
  samesiteCookiesExplained: "SameSite cookies explained",
  /**
   * @description Label for a link for cross-site redirect issues.
   */
  fileCrosSiteRedirectBug: "File a bug",
  /**
   * @description Text to show in Console panel when a third-party cookie is blocked in Chrome.
   */
  consoleTpcdErrorMessage: "Third-party cookie blocked in Chrome due to Chrome flags or browser settings."
};
var str_6 = i18n11.i18n.registerUIStrings("models/issues_manager/CookieIssue.ts", UIStrings6);
var i18nLazyString4 = i18n11.i18n.getLazilyComputedLocalizedString.bind(void 0, str_6);
var CookieIssueSubCategory = /* @__PURE__ */ ((CookieIssueSubCategory2) => {
  CookieIssueSubCategory2["GENERIC_COOKIE"] = "GenericCookie";
  CookieIssueSubCategory2["SAME_SITE_COOKIE"] = "SameSiteCookie";
  return CookieIssueSubCategory2;
})(CookieIssueSubCategory || {});
var CookieStatus = /* @__PURE__ */ ((CookieStatus2) => {
  CookieStatus2[CookieStatus2["BLOCKED"] = 0] = "BLOCKED";
  CookieStatus2[CookieStatus2["ALLOWED"] = 1] = "ALLOWED";
  CookieStatus2[CookieStatus2["ALLOWED_BY_GRACE_PERIOD"] = 2] = "ALLOWED_BY_GRACE_PERIOD";
  CookieStatus2[CookieStatus2["ALLOWED_BY_HEURISTICS"] = 3] = "ALLOWED_BY_HEURISTICS";
  return CookieStatus2;
})(CookieStatus || {});
var CookieIssue = class _CookieIssue extends Issue {
  #frameManager;
  constructor(code, issueDetails, issuesModel, issueId, frameManager) {
    super(code, issueDetails, issuesModel, issueId);
    this.#frameManager = frameManager;
  }
  cookieId() {
    const details = this.details();
    if (details.cookie) {
      const { domain, path, name } = details.cookie;
      const cookieId = `${domain};${path};${name}`;
      return cookieId;
    }
    return this.details().rawCookieLine ?? "no-cookie-info";
  }
  primaryKey() {
    const details = this.details();
    const requestId = details.request ? details.request.requestId : "no-request";
    return `${this.code()}-(${this.cookieId()})-(${requestId})`;
  }
  /**
   * Returns an array of issues from a given CookieIssueDetails.
   */
  static createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel, issueId, frameManager) {
    const issues = [];
    if (cookieIssueDetails.cookieExclusionReasons && cookieIssueDetails.cookieExclusionReasons.length > 0) {
      for (const exclusionReason of cookieIssueDetails.cookieExclusionReasons) {
        const code = _CookieIssue.codeForCookieIssueDetails(
          exclusionReason,
          cookieIssueDetails.cookieWarningReasons,
          cookieIssueDetails.operation
        );
        if (code) {
          issues.push(new _CookieIssue(code, cookieIssueDetails, issuesModel, issueId, frameManager));
        }
      }
      return issues;
    }
    if (cookieIssueDetails.cookieWarningReasons) {
      for (const warningReason of cookieIssueDetails.cookieWarningReasons) {
        const code = _CookieIssue.codeForCookieIssueDetails(warningReason, [], cookieIssueDetails.operation);
        if (code) {
          issues.push(new _CookieIssue(code, cookieIssueDetails, issuesModel, issueId, frameManager));
        }
      }
    }
    return issues;
  }
  /**
   * Calculates an issue code from a reason, an operation, and an array of warningReasons. All these together
   * can uniquely identify a specific cookie issue.
   * warningReasons is only needed for some CookieExclusionReason in order to determine if an issue should be raised.
   * It is not required if reason is a CookieWarningReason.
   *
   * The issue code will be mapped to a CookieIssueSubCategory enum for metric purpose.
   */
  static codeForCookieIssueDetails(reason, warningReasons, operation) {
    if (reason === Audits.CookieExclusionReason.ExcludeSameSiteStrict || reason === Audits.CookieExclusionReason.ExcludeSameSiteLax || reason === Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
      if (warningReasons.includes(Audits.CookieWarningReason.WarnCrossSiteRedirectDowngradeChangesInclusion)) {
        return [
          Audits.InspectorIssueCode.CookieIssue,
          "CrossSiteRedirectDowngradeChangesInclusion"
        ].join("::");
      }
      if (reason === Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
        return [Audits.InspectorIssueCode.CookieIssue, reason, operation].join("::");
      }
      return null;
    }
    if (reason === Audits.CookieExclusionReason.ExcludePortMismatch) {
      return [Audits.InspectorIssueCode.CookieIssue, "ExcludePortMismatch"].join("::");
    }
    if (reason === Audits.CookieExclusionReason.ExcludeSchemeMismatch) {
      return [Audits.InspectorIssueCode.CookieIssue, "ExcludeSchemeMismatch"].join("::");
    }
    return [Audits.InspectorIssueCode.CookieIssue, reason, operation].join("::");
  }
  cookies() {
    const details = this.details();
    if (details.cookie) {
      return [details.cookie];
    }
    return [];
  }
  rawCookieLines() {
    const details = this.details();
    if (details.rawCookieLine) {
      return [details.rawCookieLine];
    }
    return [];
  }
  requests() {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }
  getCategory() {
    return "Cookie" /* COOKIE */;
  }
  getDescription() {
    const description = issueDescriptions3.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  isCausedByThirdParty() {
    const outermostFrame = this.#frameManager.getOutermostFrame();
    return isCausedByThirdParty(outermostFrame, this.details().cookieUrl, this.details().siteForCookies);
  }
  getKind() {
    if (this.details().cookieExclusionReasons?.length > 0) {
      return "PageError" /* PAGE_ERROR */;
    }
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  static getCookieStatus(cookieIssueDetails) {
    if (cookieIssueDetails.cookieExclusionReasons.includes(
      Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout
    )) {
      return 0 /* BLOCKED */;
    }
    if (cookieIssueDetails.cookieWarningReasons.includes(
      Audits.CookieWarningReason.WarnDeprecationTrialMetadata
    )) {
      return 2 /* ALLOWED_BY_GRACE_PERIOD */;
    }
    if (cookieIssueDetails.cookieWarningReasons.includes(
      Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic
    )) {
      return 3 /* ALLOWED_BY_HEURISTICS */;
    }
    if (cookieIssueDetails.cookieWarningReasons.includes(Audits.CookieWarningReason.WarnThirdPartyPhaseout)) {
      return 1 /* ALLOWED */;
    }
    return;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue, frameManager) {
    const cookieIssueDetails = inspectorIssue.details.cookieIssueDetails;
    if (!cookieIssueDetails) {
      console.warn("Cookie issue without details received.");
      return [];
    }
    return _CookieIssue.createIssuesFromCookieIssueDetails(
      cookieIssueDetails,
      issuesModel,
      inspectorIssue.issueId,
      frameManager
    );
  }
  static getSubCategory(code) {
    if (code.includes("SameSite") || code.includes("Downgrade")) {
      return "SameSiteCookie" /* SAME_SITE_COOKIE */;
    }
    return "GenericCookie" /* GENERIC_COOKIE */;
  }
  static isThirdPartyCookiePhaseoutRelatedIssue(issue) {
    const excludeFromAggregate = [
      Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic,
      Audits.CookieWarningReason.WarnDeprecationTrialMetadata,
      Audits.CookieWarningReason.WarnThirdPartyPhaseout,
      Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout
    ];
    return excludeFromAggregate.some((exclude) => issue.code().includes(exclude));
  }
  maybeCreateConsoleMessage() {
    const issuesModel = this.model();
    if (issuesModel && this.code().includes(Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout)) {
      return new SDK.ConsoleModel.ConsoleMessage(
        issuesModel.target().model(SDK.RuntimeModel.RuntimeModel),
        Common.Console.FrontendMessageSource.ISSUE_PANEL,
        Log.LogEntryLevel.Warning,
        UIStrings6.consoleTpcdErrorMessage,
        {
          url: this.details().request?.url,
          affectedResources: { requestId: this.details().request?.requestId, issueId: this.issueId }
        }
      );
    }
    return;
  }
};
function isCausedByThirdParty(outermostFrame, cookieUrl, siteForCookies) {
  if (!outermostFrame) {
    return true;
  }
  if (!siteForCookies) {
    return true;
  }
  if (!cookieUrl || outermostFrame.domainAndRegistry() === "") {
    return false;
  }
  const parsedCookieUrl = Common.ParsedURL.ParsedURL.fromString(cookieUrl);
  if (!parsedCookieUrl) {
    return false;
  }
  return !isSubdomainOf(parsedCookieUrl.domain(), outermostFrame.domainAndRegistry());
}
function isSubdomainOf(subdomain, superdomain) {
  if (subdomain.length <= superdomain.length) {
    return subdomain === superdomain;
  }
  if (!subdomain.endsWith(superdomain)) {
    return false;
  }
  const subdomainWithoutSuperdomian = subdomain.substr(0, subdomain.length - superdomain.length);
  return subdomainWithoutSuperdomian.endsWith(".");
}
var sameSiteUnspecifiedWarnRead = {
  file: "SameSiteUnspecifiedLaxAllowUnsafeRead.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString4(UIStrings6.samesiteCookiesExplained)
    }
  ]
};
var sameSiteUnspecifiedWarnSet = {
  file: "SameSiteUnspecifiedLaxAllowUnsafeSet.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString4(UIStrings6.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureErrorRead = {
  file: "SameSiteNoneInsecureErrorRead.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString4(UIStrings6.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureErrorSet = {
  file: "SameSiteNoneInsecureErrorSet.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString4(UIStrings6.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureWarnRead = {
  file: "SameSiteNoneInsecureWarnRead.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString4(UIStrings6.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureWarnSet = {
  file: "SameSiteNoneInsecureWarnSet.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString4(UIStrings6.samesiteCookiesExplained)
    }
  ]
};
var attributeValueExceedsMaxSize = {
  file: "CookieAttributeValueExceedsMaxSize.md",
  links: []
};
var warnDomainNonAscii = {
  file: "cookieWarnDomainNonAscii.md",
  links: []
};
var excludeDomainNonAscii = {
  file: "cookieExcludeDomainNonAscii.md",
  links: []
};
var excludeBlockedWithinRelatedWebsiteSet = {
  file: "cookieExcludeBlockedWithinRelatedWebsiteSet.md",
  links: []
};
var cookieCrossSiteRedirectDowngrade = {
  file: "cookieCrossSiteRedirectDowngrade.md",
  links: [{
    link: "https://bugs.chromium.org/p/chromium/issues/entry?template=Defect%20report%20from%20user&summary=[Cross-Site Redirect Chain] <INSERT BUG SUMMARY HERE>&comment=Chrome Version: (copy from chrome://version)%0AChannel: (e.g. Canary, Dev, Beta, Stable)%0A%0AAffected URLs:%0A%0AWhat is the expected result?%0A%0AWhat happens instead?%0A%0AWhat is the purpose of the cross-site redirect?:%0A%0AWhat steps will reproduce the problem?:%0A(1)%0A(2)%0A(3)%0A%0APlease provide any additional information below.&components=Internals%3ENetwork%3ECookies",
    linkTitle: i18nLazyString4(UIStrings6.fileCrosSiteRedirectBug)
  }]
};
var ExcludePortMismatch = {
  file: "cookieExcludePortMismatch.md",
  links: []
};
var ExcludeSchemeMismatch = {
  file: "cookieExcludeSchemeMismatch.md",
  links: []
};
var placeholderDescriptionForInvisibleIssues = {
  file: "placeholderDescriptionForInvisibleIssues.md",
  links: []
};
var issueDescriptions3 = /* @__PURE__ */ new Map([
  // These two don't have a deprecation date yet, but they need to be fixed eventually.
  ["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie", sameSiteUnspecifiedWarnRead],
  ["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie", sameSiteUnspecifiedWarnSet],
  ["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie", sameSiteUnspecifiedWarnRead],
  ["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie", sameSiteUnspecifiedWarnSet],
  ["CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie", sameSiteNoneInsecureErrorRead],
  ["CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie", sameSiteNoneInsecureErrorSet],
  ["CookieIssue::WarnSameSiteNoneInsecure::ReadCookie", sameSiteNoneInsecureWarnRead],
  ["CookieIssue::WarnSameSiteNoneInsecure::SetCookie", sameSiteNoneInsecureWarnSet],
  ["CookieIssue::WarnAttributeValueExceedsMaxSize::ReadCookie", attributeValueExceedsMaxSize],
  ["CookieIssue::WarnAttributeValueExceedsMaxSize::SetCookie", attributeValueExceedsMaxSize],
  ["CookieIssue::WarnDomainNonASCII::ReadCookie", warnDomainNonAscii],
  ["CookieIssue::WarnDomainNonASCII::SetCookie", warnDomainNonAscii],
  ["CookieIssue::ExcludeDomainNonASCII::ReadCookie", excludeDomainNonAscii],
  ["CookieIssue::ExcludeDomainNonASCII::SetCookie", excludeDomainNonAscii],
  [
    "CookieIssue::ExcludeThirdPartyCookieBlockedInRelatedWebsiteSet::ReadCookie",
    excludeBlockedWithinRelatedWebsiteSet
  ],
  [
    "CookieIssue::ExcludeThirdPartyCookieBlockedInRelatedWebsiteSet::SetCookie",
    excludeBlockedWithinRelatedWebsiteSet
  ],
  ["CookieIssue::WarnThirdPartyPhaseout::ReadCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::WarnThirdPartyPhaseout::SetCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::WarnDeprecationTrialMetadata::ReadCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::WarnDeprecationTrialMetadata::SetCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::WarnThirdPartyCookieHeuristic::ReadCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::WarnThirdPartyCookieHeuristic::SetCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::ExcludeThirdPartyPhaseout::SetCookie", placeholderDescriptionForInvisibleIssues],
  ["CookieIssue::CrossSiteRedirectDowngradeChangesInclusion", cookieCrossSiteRedirectDowngrade],
  ["CookieIssue::ExcludePortMismatch", ExcludePortMismatch],
  ["CookieIssue::ExcludeSchemeMismatch", ExcludeSchemeMismatch]
]);

// ../../front_end/models/issues_manager/CorsIssue.ts
var CorsIssue_exports = {};
__export(CorsIssue_exports, {
  CorsIssue: () => CorsIssue,
  IssueCode: () => IssueCode
});
import * as i18n13 from "../../core/i18n/i18n.js";
var UIStrings7 = {
  /**
   * @description Label for the link for CORS Local Network Access issues.
   */
  corsLocalNetworkAccess: "Local Network Access",
  /**
   * @description Label for the link for CORS network issues.
   */
  CORS: "Cross-Origin Resource Sharing (CORS)"
};
var str_7 = i18n13.i18n.registerUIStrings("models/issues_manager/CorsIssue.ts", UIStrings7);
var i18nString3 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var IssueCode = /* @__PURE__ */ ((IssueCode3) => {
  IssueCode3["INSECURE_LOCAL_NETWORK"] = "CorsIssue::InsecureLocalNetwork";
  IssueCode3["INVALID_HEADER_VALUES"] = "CorsIssue::InvalidHeaders";
  IssueCode3["WILDCARD_ORIGN_NOT_ALLOWED"] = "CorsIssue::WildcardOriginWithCredentials";
  IssueCode3["PREFLIGHT_RESPONSE_INVALID"] = "CorsIssue::PreflightResponseInvalid";
  IssueCode3["ORIGIN_MISMATCH"] = "CorsIssue::OriginMismatch";
  IssueCode3["ALLOW_CREDENTIALS_REQUIRED"] = "CorsIssue::AllowCredentialsRequired";
  IssueCode3["METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE"] = "CorsIssue::MethodDisallowedByPreflightResponse";
  IssueCode3["HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE"] = "CorsIssue::HeaderDisallowedByPreflightResponse";
  IssueCode3["REDIRECT_CONTAINS_CREDENTIALS"] = "CorsIssue::RedirectContainsCredentials";
  IssueCode3["DISALLOWED_BY_MODE"] = "CorsIssue::DisallowedByMode";
  IssueCode3["CORS_DISABLED_SCHEME"] = "CorsIssue::CorsDisabledScheme";
  IssueCode3["PREFLIGHT_MISSING_ALLOW_EXTERNAL"] = "CorsIssue::PreflightMissingAllowExternal";
  IssueCode3["PREFLIGHT_INVALID_ALLOW_EXTERNAL"] = "CorsIssue::PreflightInvalidAllowExternal";
  IssueCode3["NO_CORS_REDIRECT_MODE_NOT_FOLLOW"] = "CorsIssue::NoCorsRedirectModeNotFollow";
  IssueCode3["INVALID_LOCAL_NETWORK_ACCESS"] = "CorsIssue::InvalidLocalNetworkAccess";
  IssueCode3["LOCAL_NETWORK_ACCESS_PERMISSION_DENIED"] = "CorsIssue::LocalNetworkAccessPermissionDenied";
  return IssueCode3;
})(IssueCode || {});
function getIssueCode(details) {
  switch (details.corsErrorStatus.corsError) {
    case Network.CorsError.InvalidAllowMethodsPreflightResponse:
    case Network.CorsError.InvalidAllowHeadersPreflightResponse:
    case Network.CorsError.PreflightMissingAllowOriginHeader:
    case Network.CorsError.PreflightMultipleAllowOriginValues:
    case Network.CorsError.PreflightInvalidAllowOriginValue:
    case Network.CorsError.MissingAllowOriginHeader:
    case Network.CorsError.MultipleAllowOriginValues:
    case Network.CorsError.InvalidAllowOriginValue:
      return "CorsIssue::InvalidHeaders" /* INVALID_HEADER_VALUES */;
    case Network.CorsError.PreflightWildcardOriginNotAllowed:
    case Network.CorsError.WildcardOriginNotAllowed:
      return "CorsIssue::WildcardOriginWithCredentials" /* WILDCARD_ORIGN_NOT_ALLOWED */;
    case Network.CorsError.PreflightInvalidStatus:
    case Network.CorsError.PreflightDisallowedRedirect:
    case Network.CorsError.InvalidResponse:
      return "CorsIssue::PreflightResponseInvalid" /* PREFLIGHT_RESPONSE_INVALID */;
    case Network.CorsError.AllowOriginMismatch:
    case Network.CorsError.PreflightAllowOriginMismatch:
      return "CorsIssue::OriginMismatch" /* ORIGIN_MISMATCH */;
    case Network.CorsError.InvalidAllowCredentials:
    case Network.CorsError.PreflightInvalidAllowCredentials:
      return "CorsIssue::AllowCredentialsRequired" /* ALLOW_CREDENTIALS_REQUIRED */;
    case Network.CorsError.MethodDisallowedByPreflightResponse:
      return "CorsIssue::MethodDisallowedByPreflightResponse" /* METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE */;
    case Network.CorsError.HeaderDisallowedByPreflightResponse:
      return "CorsIssue::HeaderDisallowedByPreflightResponse" /* HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE */;
    case Network.CorsError.RedirectContainsCredentials:
      return "CorsIssue::RedirectContainsCredentials" /* REDIRECT_CONTAINS_CREDENTIALS */;
    case Network.CorsError.DisallowedByMode:
      return "CorsIssue::DisallowedByMode" /* DISALLOWED_BY_MODE */;
    case Network.CorsError.CorsDisabledScheme:
      return "CorsIssue::CorsDisabledScheme" /* CORS_DISABLED_SCHEME */;
    case Network.CorsError.PreflightMissingAllowExternal:
      return "CorsIssue::PreflightMissingAllowExternal" /* PREFLIGHT_MISSING_ALLOW_EXTERNAL */;
    case Network.CorsError.PreflightInvalidAllowExternal:
      return "CorsIssue::PreflightInvalidAllowExternal" /* PREFLIGHT_INVALID_ALLOW_EXTERNAL */;
    case Network.CorsError.InsecureLocalNetwork:
      return "CorsIssue::InsecureLocalNetwork" /* INSECURE_LOCAL_NETWORK */;
    case Network.CorsError.NoCorsRedirectModeNotFollow:
      return "CorsIssue::NoCorsRedirectModeNotFollow" /* NO_CORS_REDIRECT_MODE_NOT_FOLLOW */;
    case Network.CorsError.InvalidLocalNetworkAccess:
      return "CorsIssue::InvalidLocalNetworkAccess" /* INVALID_LOCAL_NETWORK_ACCESS */;
    case Network.CorsError.LocalNetworkAccessPermissionDenied:
      return "CorsIssue::LocalNetworkAccessPermissionDenied" /* LOCAL_NETWORK_ACCESS_PERMISSION_DENIED */;
  }
}
var CorsIssue = class _CorsIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    super(getIssueCode(issueDetails), issueDetails, issuesModel, issueId);
  }
  getCategory() {
    return "Cors" /* CORS */;
  }
  getDescription() {
    switch (getIssueCode(this.details())) {
      case "CorsIssue::InvalidHeaders" /* INVALID_HEADER_VALUES */:
        return {
          file: "corsInvalidHeaderValues.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::WildcardOriginWithCredentials" /* WILDCARD_ORIGN_NOT_ALLOWED */:
        return {
          file: "corsWildcardOriginNotAllowed.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::PreflightResponseInvalid" /* PREFLIGHT_RESPONSE_INVALID */:
        return {
          file: "corsPreflightResponseInvalid.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::OriginMismatch" /* ORIGIN_MISMATCH */:
        return {
          file: "corsOriginMismatch.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::AllowCredentialsRequired" /* ALLOW_CREDENTIALS_REQUIRED */:
        return {
          file: "corsAllowCredentialsRequired.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::MethodDisallowedByPreflightResponse" /* METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE */:
        return {
          file: "corsMethodDisallowedByPreflightResponse.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::HeaderDisallowedByPreflightResponse" /* HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE */:
        return {
          file: "corsHeaderDisallowedByPreflightResponse.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::RedirectContainsCredentials" /* REDIRECT_CONTAINS_CREDENTIALS */:
        return {
          file: "corsRedirectContainsCredentials.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::DisallowedByMode" /* DISALLOWED_BY_MODE */:
        return {
          file: "corsDisallowedByMode.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::CorsDisabledScheme" /* CORS_DISABLED_SCHEME */:
        return {
          file: "corsDisabledScheme.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::NoCorsRedirectModeNotFollow" /* NO_CORS_REDIRECT_MODE_NOT_FOLLOW */:
        return {
          file: "corsNoCorsRedirectModeNotFollow.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings7.CORS)
          }]
        };
      case "CorsIssue::InsecureLocalNetwork" /* INSECURE_LOCAL_NETWORK */:
      case "CorsIssue::LocalNetworkAccessPermissionDenied" /* LOCAL_NETWORK_ACCESS_PERMISSION_DENIED */:
        return {
          file: "corsLocalNetworkAccessPermissionDenied.md",
          links: [{
            link: "https://developer.chrome.com/blog/local-network-access",
            linkTitle: i18nString3(UIStrings7.corsLocalNetworkAccess)
          }]
        };
      case "CorsIssue::PreflightMissingAllowExternal" /* PREFLIGHT_MISSING_ALLOW_EXTERNAL */:
      case "CorsIssue::PreflightInvalidAllowExternal" /* PREFLIGHT_INVALID_ALLOW_EXTERNAL */:
      case "CorsIssue::InvalidLocalNetworkAccess" /* INVALID_LOCAL_NETWORK_ACCESS */:
        return null;
    }
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    if (this.details().isWarning && this.details().corsErrorStatus.corsError === Network.CorsError.InsecureLocalNetwork) {
      return "BreakingChange" /* BREAKING_CHANGE */;
    }
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const corsIssueDetails = inspectorIssue.details.corsIssueDetails;
    if (!corsIssueDetails) {
      console.warn("Cors issue without details received.");
      return [];
    }
    return [new _CorsIssue(corsIssueDetails, issuesModel, inspectorIssue.issueId)];
  }
};

// ../../front_end/models/issues_manager/CrossOriginEmbedderPolicyIssue.ts
var CrossOriginEmbedderPolicyIssue_exports = {};
__export(CrossOriginEmbedderPolicyIssue_exports, {
  CrossOriginEmbedderPolicyIssue: () => CrossOriginEmbedderPolicyIssue,
  isCrossOriginEmbedderPolicyIssue: () => isCrossOriginEmbedderPolicyIssue
});
import * as i18n15 from "../../core/i18n/i18n.js";
var UIStrings8 = {
  /**
   * @description Link text for a link to external documentation.
   */
  coopAndCoep: "COOP and COEP",
  /**
   * @description Title for an external link to more information in the Issues view.
   */
  samesiteAndSameorigin: "Same-Site and Same-Origin"
};
var str_8 = i18n15.i18n.registerUIStrings("models/issues_manager/CrossOriginEmbedderPolicyIssue.ts", UIStrings8);
var i18nLazyString5 = i18n15.i18n.getLazilyComputedLocalizedString.bind(void 0, str_8);
function isCrossOriginEmbedderPolicyIssue(reason) {
  switch (reason) {
    case Audits.BlockedByResponseReason.CoepFrameResourceNeedsCoepHeader:
      return true;
    case Audits.BlockedByResponseReason.CoopSandboxedIFrameCannotNavigateToCoopPage:
      return true;
    case Audits.BlockedByResponseReason.CorpNotSameOrigin:
      return true;
    case Audits.BlockedByResponseReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep:
      return true;
    case Audits.BlockedByResponseReason.CorpNotSameSite:
      return true;
  }
  return false;
}
var CrossOriginEmbedderPolicyIssue = class extends Issue {
  constructor(issueDetails, issuesModel) {
    super(`CrossOriginEmbedderPolicyIssue::${issueDetails.reason}`, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${this.code()}-(${this.details().request.requestId})`;
  }
  getBlockedByResponseDetails() {
    return [this.details()];
  }
  requests() {
    return [this.details().request];
  }
  getCategory() {
    return "CrossOriginEmbedderPolicy" /* CROSS_ORIGIN_EMBEDDER_POLICY */;
  }
  getDescription() {
    const description = issueDescriptions4.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
};
var issueDescriptions4 = /* @__PURE__ */ new Map([
  [
    "CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep",
    {
      file: "CoepCorpNotSameOriginAfterDefaultedToSameOriginByCoep.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString5(UIStrings8.coopAndCoep) },
        { link: "https://web.dev/same-site-same-origin/", linkTitle: i18nLazyString5(UIStrings8.samesiteAndSameorigin) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader",
    {
      file: "CoepFrameResourceNeedsCoepHeader.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString5(UIStrings8.coopAndCoep) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CoopSandboxedIframeCannotNavigateToCoopPage",
    {
      file: "CoepCoopSandboxedIframeCannotNavigateToCoopPage.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString5(UIStrings8.coopAndCoep) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CorpNotSameSite",
    {
      file: "CoepCorpNotSameSite.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString5(UIStrings8.coopAndCoep) },
        { link: "https://web.dev/same-site-same-origin/", linkTitle: i18nLazyString5(UIStrings8.samesiteAndSameorigin) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin",
    {
      file: "CoepCorpNotSameOrigin.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString5(UIStrings8.coopAndCoep) },
        { link: "https://web.dev/same-site-same-origin/", linkTitle: i18nLazyString5(UIStrings8.samesiteAndSameorigin) }
      ]
    }
  ]
]);

// ../../front_end/models/issues_manager/DeprecationIssue.ts
var DeprecationIssue_exports = {};
__export(DeprecationIssue_exports, {
  DeprecationIssue: () => DeprecationIssue
});
import * as i18n17 from "../../core/i18n/i18n.js";

// ../../front_end/generated/Deprecation.ts
var UIStrings9 = {
  /**
   * @description This warning occurs when the website uses Attribution Reporting.
   */
  AttributionReporting: "Attribution Reporting is deprecated and will be removed. See https://goo.gle/ps-status for details.",
  /**
   * @description We show this warning when 1) an 'authorization' header is attached to the request by scripts, 2) there is no 'authorization' in the 'access-control-allow-headers' header in the response, and 3) there is a wildcard symbol ('*') in the 'access-control-allow-header' header in the response. This is allowed now, but we're planning to reject such responses and require responses to have an 'access-control-allow-headers' containing 'authorization'.
   */
  AuthorizationCoveredByWildcard: "Authorization will not be covered by the wildcard symbol (*) in CORS `Access-Control-Allow-Headers` handling.",
  /**
   * @description This warning occurs when a page attempts to request a resource whose URL contained both a newline character (`\n` or `\r`), and a less-than character (`<`). These resources are blocked.
   */
  CanRequestURLHTTPContainingNewline: "Resource requests whose URLs contained both removed whitespace `\\(n|r|t)` characters and less-than characters (`<`) are blocked. Please remove newlines and encode less-than characters from places like element attribute values in order to load these resources.",
  /**
   * @description This warning occurs when the website attempts to invoke the deprecated `chrome.loadTimes().connectionInfo` API.
   */
  ChromeLoadTimesConnectionInfo: "`chrome.loadTimes()` is deprecated, instead use standardized API: Navigation Timing 2.",
  /**
   * @description This warning occurs when the website attempts to invoke the deprecated `chrome.loadTimes().firstPaintAfterLoadTime` API.
   */
  ChromeLoadTimesFirstPaintAfterLoadTime: "`chrome.loadTimes()` is deprecated, instead use standardized API: Paint Timing.",
  /**
   * @description This warning occurs when the website attempts to invoke the deprecated `chrome.loadTimes().wasAlternateProtocolAvailable` API.
   */
  ChromeLoadTimesWasAlternateProtocolAvailable: "`chrome.loadTimes()` is deprecated, instead use standardized API: `nextHopProtocol` in Navigation Timing 2.",
  /**
   * @description This warning occurs when a frame accesses another frame's data after having set `document.domain` without having set the `Origin-Agent-Cluster` http header. This is a companion warning to `documentDomainSettingWithoutOriginAgentClusterHeader`, where that warning occurs when `document.domain` is set, and this warning occurs when an access has been made, based on that previous `document.domain` setting.
   */
  CrossOriginAccessBasedOnDocumentDomain: "Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. This deprecation warning is for a cross-origin access that was enabled by setting `document.domain`.",
  /**
   * @description Issue text shown when the web page uses a deprecated web API. The window.alert is the deprecated web API function.
   */
  CrossOriginWindowAlert: "Triggering window.alert from cross origin iframes has been deprecated and will be removed in the future.",
  /**
   * @description Issue text shown when the web page uses a deprecated web API. The window.confirm is the deprecated web API function.
   */
  CrossOriginWindowConfirm: "Triggering window.confirm from cross origin iframes has been deprecated and will be removed in the future.",
  /**
   * @description Warning displayed to developers when they hide the Cast button on a video element using the deprecated CSS selector instead of using the disableRemotePlayback attribute on the element.
   */
  CSSSelectorInternalMediaControlsOverlayCastButton: "The `disableRemotePlayback` attribute should be used in order to disable the default Cast integration instead of using `-internal-media-controls-overlay-cast-button` selector.",
  /**
   * @description Warning displayed to developers to let them know the CSS appearance property value they used is not standard and will be removed.
   */
  CSSValueAppearanceSliderVertical: "CSS appearance value `slider-vertical` is not standardized and will be removed.",
  /**
   * @description Warning displayed to developers when a data: URL is assigned to SVGUseElement to let them know that the support is deprecated.
   */
  DataUrlInSvgUse: "Support for data: URLs in SVGUseElement is deprecated and it will be removed in the future.",
  /**
   * @description Warning displayed to developers when an unknown protocol string is used in a call to navigator.credentials.get() or create() with the 'digital' option.
   */
  DigitalCredentialsUnknownProtocol: "An unknown Digital Credentials protocol was requested in navigator.credentials.get() or create(). In a future release, unrecognized protocols will be blocked.",
  /**
   * @description Warning displayed to developers when document.createEvent() is called with 'KeyboardEvents', which is a non-standard event interface that will be removed.
   */
  DocumentCreateEventKeyboardEvents: "document.createEvent('KeyboardEvents') is deprecated and will be removed. Use `new KeyboardEvent()` instead.",
  /**
   * @description Warning displayed to developers when document.createEvent() is called with 'TransitionEvent', which is a non-standard event interface that will be removed.
   */
  DocumentCreateEventTransitionEvent: "document.createEvent('TransitionEvent') is deprecated and will be removed. Use `new TransitionEvent()` instead.",
  /**
   * @description Translation is not needed, this will never be exposed in production code.
   */
  ExampleBrowserProcessDeprecation: "This is an example for showing the code required for a browser process reported deprecation.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when one of the Protected Audience APIs like `navigator.joinAdInterestGroup`, `navigator.getInterestGroupAdAuctionData` or `navigator.runAdAuction` are called.
   */
  Fledge: "The Protected Audience API is deprecated and will be removed in a future release.",
  /**
   * @description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
   */
  GeolocationInsecureOrigin: "`getCurrentPosition()` and `watchPosition()` no longer work on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://www.chromium.org/Home/chromium-security/deprecating-powerful-features-on-insecure-origins/ for more details.",
  /**
   * @description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is deprecated.
   */
  GeolocationInsecureOriginDeprecatedNotRemoved: "`getCurrentPosition()` and `watchPosition()` are deprecated on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://www.chromium.org/Home/chromium-security/deprecating-powerful-features-on-insecure-origins/ for more details.",
  /**
   * @description This warning occurs when the `getUserMedia()` API is invoked on an insecure (e.g., HTTP) site. This is only permitted on secure sites (e.g., HTTPS).
   */
  GetUserMediaInsecureOrigin: "`getUserMedia()` no longer works on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://www.chromium.org/Home/chromium-security/deprecating-powerful-features-on-insecure-origins/ for more details.",
  /**
   * @description A deprecation warning shown to developers in the DevTools Issues tab when code tries to use the deprecated hostCandidate field, guiding developers to use the equivalent information in the .address and .port fields instead.
   */
  HostCandidateAttributeGetter: "`RTCPeerConnectionIceErrorEvent.hostCandidate` is deprecated. Please use `RTCPeerConnectionIceErrorEvent.address` or `RTCPeerConnectionIceErrorEvent.port` instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab, when a service worker reads one of the fields from an event named 'canmakepayment'.
   */
  IdentityInCanMakePaymentEvent: "The merchant origin and arbitrary data from the `canmakepayment` service worker event are deprecated and will be removed: `topOrigin`, `paymentRequestOrigin`, `methodData`, `modifiers`.",
  /**
   * @description This warning occurs when an insecure context (e.g., HTTP) requests a private resource (not on open internet). This is done to mitigate the potential for CSRF and other attacks.
   */
  InsecurePrivateNetworkSubresourceRequest: "The website requested a subresource from a network that it could only access because of its users' privileged network position. These requests expose non-public devices and servers to the internet, increasing the risk of a cross-site request forgery (CSRF) attack, and/or information leakage. To mitigate these risks, Chrome deprecates requests to non-public subresources when initiated from non-secure contexts, and will start blocking them.",
  /**
   * @description This is a deprecated warning to developers that a field in a structure has been renamed.
   */
  InterestGroupDailyUpdateUrl: "The `dailyUpdateUrl` field of `InterestGroups` passed to `joinAdInterestGroup()` has been renamed to `updateUrl`, to more accurately reflect its behavior.",
  /**
   * @description Warning displayed to developers that instead of calling the `Intl.v8BreakIterator` constructor, which is not a standard JavaScript API, use ECMA402 standard API Intl.Segmenter shipped in end of 2020 instead.
   */
  IntlV8BreakIterator: "`Intl.v8BreakIterator` is deprecated. Please use `Intl.Segmenter` instead.",
  /**
   * @description Warning for using deprecated 'inputQuota' attribute.
   */
  LanguageModel_InputQuota: "LanguageModel.inputQuota is deprecated. Please use LanguageModel.contextWindow instead. This alias is only available in extensions.",
  /**
   * @description Warning for using deprecated 'inputUsage' attribute.
   */
  LanguageModel_InputUsage: "LanguageModel.inputUsage is deprecated. Please use LanguageModel.contextUsage instead. This alias is only available in extensions.",
  /**
   * @description Warning for using deprecated 'measureInputUsage' method.
   */
  LanguageModel_MeasureInputUsage: "LanguageModel.measureInputUsage() is deprecated. Please use LanguageModel.measureContextUsage() instead. This alias is only available in extensions.",
  /**
   * @description Warning for using deprecated 'onquotaoverflow' event handler.
   */
  LanguageModel_OnQuotaOverflow: "LanguageModel.onquotaoverflow is deprecated. Please use LanguageModel.oncontextoverflow instead. The LanguageModel.onquotaoverflow alias is only available in extensions.",
  /**
   * @description Warning message for web developers when they call the deprecated LanguageModel.params() method.
   */
  LanguageModelParams: "LanguageModel.params() is deprecated and now only available in extension contexts. The topK and temperature related fields within its result are also deprecated.",
  /**
   * @description Warning message for web developers when they use the deprecated 'temperature' option in LanguageModel.create() or access the .temperature attribute.
   */
  LanguageModelTemperature: "The 'temperature' parameter/attribute for LanguageModel is deprecated. It is only functional within extensions and may be removed in the future.",
  /**
   * @description Warning message for web developers when they use the deprecated 'topK' option in LanguageModel.create() or access the .topK attribute.
   */
  LanguageModelTopK: "The 'topK' parameter/attribute for LanguageModel is deprecated. It is only functional within extensions and may be removed in the future.",
  /**
   * @description This warning occurs when a stylesheet loaded from a local file directive does not end in the file type `.css`.
   */
  LocalCSSFileExtensionRejected: "CSS cannot be loaded from `file:` URLs unless they end in a `.css` file extension.",
  /**
   * @description This warning occurs when the browser requests Web MIDI access as sysex (system exclusive messages) can be allowed via prompt even if the browser did not specifically request it.
   */
  NoSysexWebMIDIWithoutPermission: "Web MIDI will ask a permission to use even if the sysex is not specified in the `MIDIOptions`.",
  /**
   * @description Warning displayed to developers when the Notification API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
   */
  NotificationInsecureOrigin: "The Notification API may no longer be used from insecure origins. You should consider switching your application to a secure origin, such as HTTPS. See https://www.chromium.org/Home/chromium-security/deprecating-powerful-features-on-insecure-origins/ for more details.",
  /**
   * @description Warning displayed to developers when permission to use notifications has been requested by a cross-origin iframe, to notify them that this use is no longer supported.
   */
  NotificationPermissionRequestedIframe: "Permission for the Notification API may no longer be requested from a cross-origin iframe. You should consider requesting permission from a top-level frame or opening a new window instead.",
  /**
   * @description Warning displayed to developers when CreateImageBitmap is used with the newly deprecated option imageOrientation: 'none'.
   */
  ObsoleteCreateImageBitmapImageOrientationNone: "Option `imageOrientation: 'none'` in createImageBitmap is deprecated. Please use createImageBitmap with option '{imageOrientation: 'from-image'}' instead.",
  /**
   * @description This warning occurs when the WebRTC protocol attempts to negotiate a connection using an obsolete cipher and risks connection security.
   */
  ObsoleteWebRtcCipherSuite: "Your partner is negotiating an obsolete (D)TLS version. Please check with your partner to have this fixed.",
  /**
   * @description Warning displayed to developers that use overflow:visible for replaced elements. This declaration was earlier ignored but will now change the element's painting based on whether the overflow value allows the element to paint outside its bounds.
   */
  OverflowVisibleOnReplacedElement: "Specifying `overflow: visible` on img, video and canvas tags may cause them to produce visual content outside of the element bounds. See https://github.com/WICG/shared-element-transitions/blob/main/debugging_overflow_on_images.md.",
  /**
   * @description Warning displayed to developers when they use a Flash Embed URLS to let them know that the browser will not automatically link to their equivalent HTML5 link.
   */
  OverrideFlashEmbedwithHTML: "Legacy flash video embed has been rewritten to HTML iframe. Flash is long gone, this rewriting hack is deprecated and may be removed in the future.",
  /**
   * @description Warning displayed to developers when they use the PaymentInstruments API to let them know this API is deprecated.
   */
  PaymentInstruments: "`paymentManager.instruments` is deprecated. Please use just-in-time install for payment handlers instead.",
  /**
   * @description Warning displayed to developers when their Web Payment API usage violates their Content-Security-Policy (CSP) connect-src directive to let them know this CSP bypass has been deprecated.
   */
  PaymentRequestCSPViolation: "Your `PaymentRequest` call bypassed Content-Security-Policy (CSP) `connect-src` directive. This bypass is deprecated. Please add the payment method identifier from the `PaymentRequest` API (in `supportedMethods` field) to your CSP `connect-src` directive.",
  /**
   * @description Warning displayed to developers when persistent storage type is used to notify that storage type is deprecated.
   */
  PersistentQuotaType: "`StorageType.persistent` is deprecated. Please use standardized `navigator.storage` instead.",
  /**
   * @description This issue indicates that a `<source>` element with a `<picture>` parent was using an `src` attribute, which is not valid and is ignored by the browser. The `srcset` attribute should be used instead.
   */
  PictureSourceSrc: "`<source src>` with a `<picture>` parent is invalid and therefore ignored. Please use `<source srcset>` instead.",
  /**
   * @description Warning displayed to developers when the vendor-prefixed method (webkitCancelAnimationFrame) is used rather than the equivalent unprefixed method (cancelAnimationFrame).
   */
  PrefixedCancelAnimationFrame: "webkitCancelAnimationFrame is vendor-specific. Please use the standard cancelAnimationFrame instead.",
  /**
   * @description Warning displayed to developers when the vendor-prefixed method (webkitRequestAnimationFrame) is used rather than the equivalent unprefixed method (requestAnimationFrame).
   */
  PrefixedRequestAnimationFrame: "webkitRequestAnimationFrame is vendor-specific. Please use the standard requestAnimationFrame instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoDisplayingFullscreen: "HTMLVideoElement.webkitDisplayingFullscreen is deprecated. Please use Document.fullscreenElement instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoEnterFullScreen: "HTMLVideoElement.webkitEnterFullScreen() is deprecated. Please use Element.requestFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoEnterFullscreen: "HTMLVideoElement.webkitEnterFullscreen() is deprecated. Please use Element.requestFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoExitFullScreen: "HTMLVideoElement.webkitExitFullScreen() is deprecated. Please use Document.exitFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoExitFullscreen: "HTMLVideoElement.webkitExitFullscreen() is deprecated. Please use Document.exitFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoSupportsFullscreen: "HTMLVideoElement.webkitSupportsFullscreen is deprecated. Please use Document.fullscreenEnabled instead.",
  /**
   * @description Warning displayed to developers when an SVG filter is applied to a disallowed content type.
   */
  PreventSvgFilterPaint: "SVG filters cannot be applied to cross-origin iframes, restricted iframes (e.g., sandboxed), or plugins.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  RangeExpand: "Range.expand() is deprecated. Please use Selection.modify() instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when the Storage Access API is automatically granted by Related Website Sets. The placeholder will always be the string `Related Website Sets`.
   */
  RelatedWebsiteSets: "`Related Website Sets` is deprecated and will be removed. See https://privacysandbox.com/news/update-on-plans-for-privacy-sandbox-technologies/ for more details.",
  /**
   * @description This warning occurs when a subresource loaded by a page has a URL with an authority portion. These are disallowed.
   */
  RequestedSubresourceWithEmbeddedCredentials: "Subresource requests whose URLs contain embedded credentials (e.g. `https://user:pass@host/`) are blocked.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when a video conferencing website attempts to use a non-standard crypto method when performing a handshake to set up a connection with another endpoint.
   */
  RTCConstraintEnableDtlsSrtpFalse: "The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `false` value for this constraint, which is interpreted as an attempt to use the removed `SDES key negotiation` method. This functionality is removed; use a service that supports `DTLS key negotiation` instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when a video conferencing website uses a non-standard API for controlling the crypto method used, but is not having an effect because the desired behavior is already enabled-by-default.
   */
  RTCConstraintEnableDtlsSrtpTrue: "The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `true` value for this constraint, which had no effect, but you can remove this constraint for tidiness.",
  /**
   * @description WebRTC is set of JavaScript APIs for sending and receiving data, audio and video. getStats() is a method used to obtain network and quality metrics. There are two versions of this method, one is being deprecated because it is non-standard.
   */
  RTCPeerConnectionGetStatsLegacyNonCompliant: "The callback-based getStats() is deprecated and will be removed. Use the spec-compliant getStats() instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown then a video conferencing website attempts to use the `RTCP MUX` policy.
   */
  RtcpMuxPolicyNegotiate: "The `rtcpMuxPolicy` option is deprecated and will be removed.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. The placeholder is always the noun 'SharedArrayBuffer' which refers to a JavaScript construct.
   */
  SharedArrayBufferConstructedWithoutIsolation: "`SharedArrayBuffer` will require cross-origin isolation. See https://developer.chrome.com/blog/enabling-shared-array-buffer/ for more details.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when one of the Shared Storage APIs like `sharedStorage.set()`, `sharedStorage.worklet.addModule()`, `sharedStorage.selectURL()`, etc., along with `<img sharedstoragewritable>`, `<iframe sharedstoragewritable>`, or `fetch(url, {sharedStorageWritable: true})` are used.
   */
  SharedStorage: "The Shared Storage API is deprecated and will be removed in a future release.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when the `document.requestStorageAccessFor` API is called. The placeholder will always be the string `document.requestStorageAccessFor`.
   */
  StorageAccessAPI_requestStorageAccessFor_Method: "`document.requestStorageAccessFor` is deprecated and will be removed. See https://privacysandbox.com/news/update-on-plans-for-privacy-sandbox-technologies/ for more details.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when the speech synthesis API is called before the page receives a user activation.
   */
  TextToSpeech_DisallowedByAutoplay: "`speechSynthesis.speak()` without user activation is deprecated and will be removed.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when one of the Topics APIs like `document.browsingTopics()`, `<img browsingtopics>`, `<iframe browsingtopics>`, or `fetch(url, {browsingTopics: true})` are used.
   */
  Topics: "The Topics API is deprecated and will be removed in a future release.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when a listener for the `unload` event is added.
   */
  UnloadHandler: "Unload event listeners are deprecated and will be removed.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. The placeholder is always the noun 'SharedArrayBuffer' which refers to a JavaScript construct. 'Extensions' refers to Chrome extensions. The warning is shown when Chrome Extensions attempt to use 'SharedArrayBuffer's under insecure circumstances.
   */
  V8SharedArrayBufferConstructedInExtensionWithoutIsolation: "Extensions should opt into cross-origin isolation to continue using `SharedArrayBuffer`. See https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/.",
  /**
   * @description This warning occurs when the deprecated `BluetoothRemoteGATTCharacteristic.writeValue()` method is used. Developers should use `writeValueWithResponse()` or `writeValueWithoutResponse()` instead.
   */
  WebBluetoothRemoteCharacteristicWriteValue: "`BluetoothRemoteGATTCharacteristic.writeValue()` is deprecated. Use `writeValueWithResponse()` or `writeValueWithoutResponse()` instead.",
  /**
   * @description Warning for using the deprecated 'incomingHighWaterMark' attribute on WebTransportDatagramDuplexStream. Developers should use 'incomingMaxBufferedDatagrams' instead.
   */
  WebTransportDatagramDuplexStreamIncomingHighWaterMark: "WebTransportDatagramDuplexStream.incomingHighWaterMark has been renamed to incomingMaxBufferedDatagrams. incomingHighWaterMark will be removed in a future version of Chrome.",
  /**
   * @description Warning for using the deprecated 'outgoingHighWaterMark' attribute on WebTransportDatagramDuplexStream. Developers should use 'outgoingMaxBufferedDatagrams' instead.
   */
  WebTransportDatagramDuplexStreamOutgoingHighWaterMark: "WebTransportDatagramDuplexStream.outgoingHighWaterMark has been renamed to outgoingMaxBufferedDatagrams. outgoingHighWaterMark will be removed in a future version of Chrome.",
  /**
   * @description Warning displayed to developers that they are using `XMLHttpRequest` API in a way that they expect an unsupported character encoding `UTF-16` could be used in the server reply.
   */
  XHRJSONEncodingDetection: "UTF-16 is not supported by response json in `XMLHttpRequest`",
  /**
   * @description Warning displayed to developers. It is shown when the `XMLHttpRequest` API is used in a way that it slows down the page load of the next page. The `main thread` refers to an operating systems thread used to run most of the processing of HTML documents, so please use a consistent wording.
   */
  XMLHttpRequestSynchronousInNonWorkerOutsideBeforeUnload: "Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
  /**
   * @description Warning displayed to developers that they are using either the XSLTProcessor API, or XSLT processing instructions, both of which have been deprecated and are scheduled to be removed.
   */
  XSLT: "XSLTProcessor and XSLT Processing Instructions have been deprecated by all browsers. These features will be removed from this browser soon."
};
var DEPRECATIONS_METADATA = {
  "AttributionReporting": {
    "chromeStatusFeature": 6320639375966208
  },
  "AuthorizationCoveredByWildcard": {
    "milestone": 97
  },
  "CSSSelectorInternalMediaControlsOverlayCastButton": {
    "chromeStatusFeature": 5714245488476160
  },
  "CSSValueAppearanceSliderVertical": {
    "chromeStatusFeature": 6001359429566464
  },
  "CanRequestURLHTTPContainingNewline": {
    "chromeStatusFeature": 5735596811091968
  },
  "ChromeLoadTimesConnectionInfo": {
    "chromeStatusFeature": 5637885046816768
  },
  "ChromeLoadTimesFirstPaintAfterLoadTime": {
    "chromeStatusFeature": 5637885046816768
  },
  "ChromeLoadTimesWasAlternateProtocolAvailable": {
    "chromeStatusFeature": 5637885046816768
  },
  "CrossOriginAccessBasedOnDocumentDomain": {
    "milestone": 115
  },
  "DataUrlInSvgUse": {
    "chromeStatusFeature": 5128825141198848,
    "milestone": 119
  },
  "DigitalCredentialsUnknownProtocol": {
    "chromeStatusFeature": 6492906882990080,
    "milestone": 160
  },
  "DocumentCreateEventKeyboardEvents": {
    "chromeStatusFeature": 5095987863486464,
    "milestone": 151
  },
  "DocumentCreateEventTransitionEvent": {
    "chromeStatusFeature": 5095987863486464,
    "milestone": 151
  },
  "IdentityInCanMakePaymentEvent": {
    "chromeStatusFeature": 5190978431352832
  },
  "InsecurePrivateNetworkSubresourceRequest": {
    "chromeStatusFeature": 5436853517811712,
    "milestone": 92
  },
  "LanguageModelParams": {
    "chromeStatusFeature": 5134603979063296
  },
  "LanguageModelTemperature": {
    "chromeStatusFeature": 5134603979063296
  },
  "LanguageModelTopK": {
    "chromeStatusFeature": 5134603979063296
  },
  "LanguageModel_InputQuota": {
    "chromeStatusFeature": 5134603979063296
  },
  "LanguageModel_InputUsage": {
    "chromeStatusFeature": 5134603979063296
  },
  "LanguageModel_MeasureInputUsage": {
    "chromeStatusFeature": 5134603979063296
  },
  "LanguageModel_OnQuotaOverflow": {
    "chromeStatusFeature": 5134603979063296
  },
  "LocalCSSFileExtensionRejected": {
    "milestone": 64
  },
  "NoSysexWebMIDIWithoutPermission": {
    "chromeStatusFeature": 5138066234671104,
    "milestone": 82
  },
  "NotificationPermissionRequestedIframe": {
    "chromeStatusFeature": 6451284559265792
  },
  "ObsoleteCreateImageBitmapImageOrientationNone": {
    "milestone": 111
  },
  "ObsoleteWebRtcCipherSuite": {
    "milestone": 81
  },
  "OverflowVisibleOnReplacedElement": {
    "chromeStatusFeature": 5137515594383360,
    "milestone": 108
  },
  "OverrideFlashEmbedwithHTML": {
    "milestone": 140
  },
  "PaymentInstruments": {
    "chromeStatusFeature": 5099285054488576
  },
  "PaymentRequestCSPViolation": {
    "chromeStatusFeature": 6286595631087616
  },
  "PersistentQuotaType": {
    "chromeStatusFeature": 5176235376246784,
    "milestone": 106
  },
  "PreventSvgFilterPaint": {
    "chromeStatusFeature": 5117170452398080
  },
  "RTCConstraintEnableDtlsSrtpFalse": {
    "milestone": 97
  },
  "RTCConstraintEnableDtlsSrtpTrue": {
    "milestone": 97
  },
  "RTCPeerConnectionGetStatsLegacyNonCompliant": {
    "chromeStatusFeature": 4631626228695040,
    "milestone": 117
  },
  "RelatedWebsiteSets": {
    "chromeStatusFeature": 5194473869017088
  },
  "RequestedSubresourceWithEmbeddedCredentials": {
    "chromeStatusFeature": 5669008342777856
  },
  "RtcpMuxPolicyNegotiate": {
    "chromeStatusFeature": 5654810086866944,
    "milestone": 62
  },
  "SharedArrayBufferConstructedWithoutIsolation": {
    "milestone": 106
  },
  "SharedStorage": {
    "chromeStatusFeature": 5076349064708096
  },
  "StorageAccessAPI_requestStorageAccessFor_Method": {
    "chromeStatusFeature": 5162221567082496
  },
  "TextToSpeech_DisallowedByAutoplay": {
    "chromeStatusFeature": 5687444770914304,
    "milestone": 71
  },
  "UnloadHandler": {
    "chromeStatusFeature": 5579556305502208
  },
  "V8SharedArrayBufferConstructedInExtensionWithoutIsolation": {
    "milestone": 96
  },
  "WebBluetoothRemoteCharacteristicWriteValue": {
    "chromeStatusFeature": 5088568590598144
  },
  "WebTransportDatagramDuplexStreamIncomingHighWaterMark": {
    "chromeStatusFeature": 5143839699501056,
    "milestone": 156
  },
  "WebTransportDatagramDuplexStreamOutgoingHighWaterMark": {
    "chromeStatusFeature": 5143839699501056,
    "milestone": 156
  },
  "XHRJSONEncodingDetection": {
    "milestone": 93
  },
  "XSLT": {
    "chromeStatusFeature": 4709671889534976,
    "milestone": 143
  }
};

// ../../front_end/models/issues_manager/DeprecationIssue.ts
var UIStrings10 = {
  /**
   * @description This links to the Chrome feature status page when one exists.
   */
  feature: "Check the feature status page for more details.",
  /**
   * @description This links to the Chromium Dash schedule when a milestone is set.
   * @example {100} milestone
   */
  milestone: "This change will go into effect with milestone {milestone}.",
  /**
   * @description Title of issue raised when a deprecated feature is used.
   */
  title: "Deprecated feature used"
};
var str_9 = i18n17.i18n.registerUIStrings("models/issues_manager/DeprecationIssue.ts", UIStrings10);
var i18nLazyString6 = i18n17.i18n.getLazilyComputedLocalizedString.bind(void 0, str_9);
var strDeprecation = i18n17.i18n.registerUIStrings("generated/Deprecation.ts", UIStrings9);
var i18nLazyDeprecationString = i18n17.i18n.getLazilyComputedLocalizedString.bind(void 0, strDeprecation);
var DeprecationIssue = class _DeprecationIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const issueCode = [
      Audits.InspectorIssueCode.DeprecationIssue,
      issueDetails.type
    ].join("::");
    super({ code: issueCode, umaCode: "DeprecationIssue" }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    let messageFunction = () => "";
    const maybeEnglishMessage = UIStrings9[this.details().type];
    if (maybeEnglishMessage) {
      messageFunction = i18nLazyDeprecationString(maybeEnglishMessage);
    }
    const links = [];
    const deprecationMeta = DEPRECATIONS_METADATA[this.details().type];
    const feature = deprecationMeta?.chromeStatusFeature ?? 0;
    if (feature !== 0) {
      links.push({
        link: `https://chromestatus.com/feature/${feature}`,
        linkTitle: i18nLazyString6(UIStrings10.feature)
      });
    }
    const milestone = deprecationMeta?.milestone ?? 0;
    if (milestone !== 0) {
      links.push({
        link: "https://chromiumdash.appspot.com/schedule",
        linkTitle: i18nLazyString6(UIStrings10.milestone, { milestone })
      });
    }
    return resolveLazyDescription({
      file: "deprecation.md",
      substitutions: /* @__PURE__ */ new Map([
        ["PLACEHOLDER_title", i18nLazyString6(UIStrings10.title)],
        ["PLACEHOLDER_message", messageFunction]
      ]),
      links
    });
  }
  sources() {
    if (this.details().sourceCodeLocation) {
      return [this.details().sourceCodeLocation];
    }
    return [];
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.deprecationIssueDetails;
    if (!details) {
      console.warn("Deprecation issue without details received.");
      return [];
    }
    return [new _DeprecationIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/DOMIssuesManager.ts
var DOMIssuesManager_exports = {};
__export(DOMIssuesManager_exports, {
  DOMIssuesManager: () => DOMIssuesManager,
  Events: () => Events2
});
import * as Common2 from "../../core/common/common.js";
import * as Platform from "../../core/platform/platform.js";
import * as SDK2 from "../../core/sdk/sdk.js";

// ../../front_end/models/issues_manager/IssuesManagerEvents.ts
var Events = /* @__PURE__ */ ((Events4) => {
  Events4["ISSUES_COUNT_UPDATED"] = "IssuesCountUpdated";
  Events4["ISSUE_ADDED"] = "IssueAdded";
  Events4["FULL_UPDATE_REQUIRED"] = "FullUpdateRequired";
  Events4["ISSUE_HIDDEN_STATUS_UPDATED"] = "IssueHiddenStatusUpdated";
  return Events4;
})(Events || {});

// ../../front_end/models/issues_manager/DOMIssuesManager.ts
var Events2 = /* @__PURE__ */ ((Events4) => {
  Events4["DOM_ISSUE_ADDED"] = "DOMIssueAdded";
  Events4["DOM_ISSUE_REMOVED"] = "DOMIssueRemoved";
  return Events4;
})(Events2 || {});
var DOMIssuesManager = class extends Common2.ObjectWrapper.ObjectWrapper {
  #issuesManager;
  #targetManager;
  #currentIssues = /* @__PURE__ */ new Set();
  #nodeToIssues = new Platform.MapUtilities.Multimap();
  #nodeIdSubscribers = new Platform.MapUtilities.Multimap();
  constructor(issuesManager, targetManager) {
    super();
    this.#issuesManager = issuesManager;
    this.#targetManager = targetManager;
    this.#issuesManager.addEventListener("IssueAdded" /* ISSUE_ADDED */, this.#onIssueAdded, this);
    this.#issuesManager.addEventListener(
      "IssueHiddenStatusUpdated" /* ISSUE_HIDDEN_STATUS_UPDATED */,
      this.#onIssueHiddenStatusUpdated,
      this
    );
    this.#issuesManager.addEventListener("FullUpdateRequired" /* FULL_UPDATE_REQUIRED */, this.#onFullUpdateRequired, this);
    this.#targetManager.addModelListener(
      SDK2.DOMModel.DOMModel,
      SDK2.DOMModel.Events.DocumentUpdated,
      this.#onDocumentUpdated,
      this,
      { scoped: true }
    );
  }
  subscribeByNodeId(nodeId, callback) {
    this.#nodeIdSubscribers.set(nodeId, callback);
  }
  unsubscribeByNodeId(nodeId, callback) {
    this.#nodeIdSubscribers.delete(nodeId, callback);
  }
  issuesForNode(node) {
    return Array.from(this.#nodeToIssues.get(node));
  }
  #onIssueAdded(event) {
    void this.#addIssue(event.data.issue);
  }
  #onIssueHiddenStatusUpdated(event) {
    const { issue } = event.data;
    if (issue.isHidden()) {
      void this.#removeIssue(issue);
    } else {
      void this.#addIssue(issue);
    }
  }
  #onFullUpdateRequired() {
    const newIssues = new Set(this.#issuesManager.issues());
    for (const issue of this.#currentIssues) {
      if (!newIssues.has(issue) || issue.isHidden()) {
        void this.#removeIssue(issue);
      }
    }
    for (const issue of newIssues) {
      if (!issue.isHidden()) {
        void this.#addIssue(issue);
      }
    }
  }
  #onDocumentUpdated(_event) {
    this.#nodeToIssues.clear();
    for (const issue of this.#issuesManager.issues()) {
      if (!issue.isHidden()) {
        void this.#addIssue(issue);
      }
    }
  }
  async #resolveNodesForIssue(issue) {
    const primaryTarget = this.#targetManager.primaryPageTarget() ?? this.#targetManager.targets()[0];
    const nodes = [];
    for (const element of issue.elements()) {
      const elementTarget = element.target && typeof element.target.model === "function" ? element.target : primaryTarget;
      if (!elementTarget) {
        continue;
      }
      const domModel = elementTarget.model(SDK2.DOMModel.DOMModel);
      if (!domModel) {
        continue;
      }
      const deferredDOMNode = new SDK2.DOMModel.DeferredDOMNode(elementTarget, element.backendNodeId);
      const node = await deferredDOMNode.resolvePromise();
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  }
  async #addIssue(issue) {
    if (issue.isHidden()) {
      return;
    }
    this.#currentIssues.add(issue);
    const nodes = await this.#resolveNodesForIssue(issue);
    for (const node of nodes) {
      if (!this.#nodeToIssues.hasValue(node, issue)) {
        this.#nodeToIssues.set(node, issue);
        this.dispatchEventToListeners("DOMIssueAdded" /* DOM_ISSUE_ADDED */, { node, issue });
        for (const callback of this.#nodeIdSubscribers.get(node.id)) {
          callback();
        }
      }
    }
  }
  async #removeIssue(issue) {
    this.#currentIssues.delete(issue);
    const nodes = await this.#resolveNodesForIssue(issue);
    for (const node of nodes) {
      if (this.#nodeToIssues.hasValue(node, issue)) {
        this.#nodeToIssues.delete(node, issue);
        this.dispatchEventToListeners("DOMIssueRemoved" /* DOM_ISSUE_REMOVED */, { node, issue });
        for (const callback of this.#nodeIdSubscribers.get(node.id)) {
          callback();
        }
      }
    }
  }
};

// ../../front_end/models/issues_manager/ElementAccessibilityIssue.ts
var ElementAccessibilityIssue_exports = {};
__export(ElementAccessibilityIssue_exports, {
  ElementAccessibilityIssue: () => ElementAccessibilityIssue
});
var ElementAccessibilityIssue = class _ElementAccessibilityIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    const issueCode = [
      Audits.InspectorIssueCode.ElementAccessibilityIssue,
      issueDetails.elementAccessibilityIssueReason
    ].join("::");
    super(issueCode, issueDetails, issuesModel, issueId);
  }
  elements() {
    const details = this.details();
    if (details.nodeId) {
      return [{
        backendNodeId: details.nodeId,
        nodeName: "",
        target: this.model()?.target() ?? null
      }];
    }
    return [];
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getDescription() {
    if (this.isInteractiveContentAttributesSelectDescendantIssue()) {
      return {
        file: "selectElementAccessibilityInteractiveContentAttributesSelectDescendant.md",
        links: []
      };
    }
    const description = issueDescriptions5.get(this.details().elementAccessibilityIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  isInteractiveContentAttributesSelectDescendantIssue() {
    return this.details().hasDisallowedAttributes && (this.details().elementAccessibilityIssueReason !== Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild && this.details().elementAccessibilityIssueReason !== Audits.ElementAccessibilityIssueReason.InteractiveContentSummaryDescendant);
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const elementAccessibilityIssueDetails = inspectorIssue.details.elementAccessibilityIssueDetails;
    if (!elementAccessibilityIssueDetails) {
      console.warn("Element Accessibility issue without details received.");
      return [];
    }
    return [new _ElementAccessibilityIssue(elementAccessibilityIssueDetails, issuesModel, inspectorIssue.issueId)];
  }
};
var issueDescriptions5 = /* @__PURE__ */ new Map([
  [
    Audits.ElementAccessibilityIssueReason.DisallowedSelectChild,
    {
      file: "selectElementAccessibilityDisallowedSelectChild.md",
      links: []
    }
  ],
  [
    Audits.ElementAccessibilityIssueReason.DisallowedOptGroupChild,
    {
      file: "selectElementAccessibilityDisallowedOptGroupChild.md",
      links: []
    }
  ],
  [
    Audits.ElementAccessibilityIssueReason.NonPhrasingContentOptionChild,
    {
      file: "selectElementAccessibilityNonPhrasingContentOptionChild.md",
      links: []
    }
  ],
  [
    Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild,
    {
      file: "selectElementAccessibilityInteractiveContentOptionChild.md",
      links: []
    }
  ],
  [
    Audits.ElementAccessibilityIssueReason.InteractiveContentLegendChild,
    {
      file: "selectElementAccessibilityInteractiveContentLegendChild.md",
      links: []
    }
  ],
  [
    Audits.ElementAccessibilityIssueReason.InteractiveContentSummaryDescendant,
    {
      file: "summaryElementAccessibilityInteractiveContentSummaryDescendant.md",
      links: []
    }
  ]
]);

// ../../front_end/models/issues_manager/EmailVerificationRequestIssue.ts
var EmailVerificationRequestIssue_exports = {};
__export(EmailVerificationRequestIssue_exports, {
  EmailVerificationRequestIssue: () => EmailVerificationRequestIssue
});
import * as i18n19 from "../../core/i18n/i18n.js";
var UIStrings11 = {
  /**
   * @description Title for Email Verification Protocol specification URL link.
   */
  emailVerification: "Email Verification Protocol"
};
var str_10 = i18n19.i18n.registerUIStrings("models/issues_manager/EmailVerificationRequestIssue.ts", UIStrings11);
var i18nLazyString7 = i18n19.i18n.getLazilyComputedLocalizedString.bind(void 0, str_10);
var EmailVerificationRequestIssue = class _EmailVerificationRequestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: Audits.InspectorIssueCode.EmailVerificationRequestIssue,
        umaCode: [
          Audits.InspectorIssueCode.EmailVerificationRequestIssue,
          issueDetails.emailVerificationRequestIssueReason
        ].join("::")
      },
      issueDetails,
      issuesModel
    );
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const description = issueDescriptions6.get(this.details().emailVerificationRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.emailVerificationRequestIssueDetails;
    if (!details) {
      console.warn("Email verification request issue without details received.");
      return [];
    }
    return [new _EmailVerificationRequestIssue(details, issuesModel)];
  }
};
var issueDescriptions6 = /* @__PURE__ */ new Map([
  [
    Audits.EmailVerificationRequestIssueReason.InvalidEmail,
    {
      file: "emailVerificationRequestInvalidEmail.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.DnsFetchFailed,
    {
      file: "emailVerificationRequestDnsFetchFailed.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.DnsInvalidRecord,
    {
      file: "emailVerificationRequestDnsInvalidRecord.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownHttpNotFound,
    {
      file: "emailVerificationRequestWellKnownHttpNotFound.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownNoResponse,
    {
      file: "emailVerificationRequestWellKnownNoResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownInvalidResponse,
    {
      file: "emailVerificationRequestWellKnownInvalidResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownListEmpty,
    {
      file: "emailVerificationRequestWellKnownListEmpty.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownInvalidContentType,
    {
      file: "emailVerificationRequestWellKnownInvalidContentType.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownMissingIssuanceEndpoint,
    {
      file: "emailVerificationRequestWellKnownMissingIssuanceEndpoint.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownIssuanceEndpointCrossOrigin,
    {
      file: "emailVerificationRequestWellKnownIssuanceEndpointCrossOrigin.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownUnsupportedSigningAlgorithm,
    {
      file: "emailVerificationRequestWellKnownUnsupportedSigningAlgorithm.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenHttpNotFound,
    {
      file: "emailVerificationRequestTokenHttpNotFound.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenNoResponse,
    {
      file: "emailVerificationRequestTokenNoResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenInvalidResponse,
    {
      file: "emailVerificationRequestTokenInvalidResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenInvalidContentType,
    {
      file: "emailVerificationRequestTokenInvalidContentType.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenMalformedSdJwt,
    {
      file: "emailVerificationRequestTokenMalformedSdJwt.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenInvalidSdJwt,
    {
      file: "emailVerificationRequestTokenInvalidSdJwt.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.KeyBindingSigningFailed,
    {
      file: "emailVerificationRequestKeyBindingSigningFailed.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.RpOriginIsOpaque,
    {
      file: "emailVerificationRequestRpOriginIsOpaque.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownMissingAccountsEndpoint,
    {
      file: "emailVerificationRequestWellKnownMissingAccountsEndpoint.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.UserLoggedOut,
    {
      file: "emailVerificationRequestUserLoggedOut.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.WellKnownAccountsEndpointCrossOrigin,
    {
      file: "emailVerificationRequestWellKnownAccountsEndpointCrossOrigin.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.AccountsHttpNotFound,
    {
      file: "emailVerificationRequestAccountsHttpNotFound.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.AccountsNoResponse,
    {
      file: "emailVerificationRequestAccountsNoResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.AccountsInvalidResponse,
    {
      file: "emailVerificationRequestAccountsInvalidResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.AccountsInvalidContentType,
    {
      file: "emailVerificationRequestAccountsInvalidContentType.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.AccountsEmptyList,
    {
      file: "emailVerificationRequestAccountsEmptyList.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownHttpNotFound,
    {
      file: "emailVerificationRequestEmailVerificationWellKnownHttpNotFound.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownNoResponse,
    {
      file: "emailVerificationRequestEmailVerificationWellKnownNoResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownInvalidResponse,
    {
      file: "emailVerificationRequestEmailVerificationWellKnownInvalidResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownInvalidContentType,
    {
      file: "emailVerificationRequestEmailVerificationWellKnownInvalidContentType.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.JwksHttpNotFound,
    {
      file: "emailVerificationRequestJwksHttpNotFound.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.JwksInvalidResponse,
    {
      file: "emailVerificationRequestJwksInvalidResponse.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtUnsupportedHeaderAlg,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtUnsupportedHeaderAlg.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingIss,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtMissingIss.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingIat,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtMissingIat.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingCnf,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtMissingCnf.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingEmail,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtMissingEmail.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidIssuedAt,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtInvalidIssuedAt.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidIssuer,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtInvalidIssuer.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtJwksMissingKeys,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtJwksMissingKeys.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtSignatureFailed,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtSignatureFailed.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidEmailVerified,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtInvalidEmailVerified.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidEmail,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtInvalidEmail.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidHolderKey,
    {
      file: "emailVerificationRequestTokenVerificationSdJwtInvalidHolderKey.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidTyp,
    {
      file: "emailVerificationRequestTokenVerificationKbInvalidTyp.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingAud,
    {
      file: "emailVerificationRequestTokenVerificationKbMissingAud.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingNonce,
    {
      file: "emailVerificationRequestTokenVerificationKbMissingNonce.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingIat,
    {
      file: "emailVerificationRequestTokenVerificationKbMissingIat.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingSdHash,
    {
      file: "emailVerificationRequestTokenVerificationKbMissingSdHash.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidIssuedAt,
    {
      file: "emailVerificationRequestTokenVerificationKbInvalidIssuedAt.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidAudience,
    {
      file: "emailVerificationRequestTokenVerificationKbInvalidAudience.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidNonce,
    {
      file: "emailVerificationRequestTokenVerificationKbInvalidNonce.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidSdHash,
    {
      file: "emailVerificationRequestTokenVerificationKbInvalidSdHash.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingCnf,
    {
      file: "emailVerificationRequestTokenVerificationKbMissingCnf.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ],
  [
    Audits.EmailVerificationRequestIssueReason.TokenVerificationKbSignatureFailed,
    {
      file: "emailVerificationRequestTokenVerificationKbSignatureFailed.md",
      links: [{
        link: "https://github.com/WICG/email-verification-protocol",
        linkTitle: i18nLazyString7(UIStrings11.emailVerification)
      }]
    }
  ]
]);

// ../../front_end/models/issues_manager/FederatedAuthRequestIssue.ts
var FederatedAuthRequestIssue_exports = {};
__export(FederatedAuthRequestIssue_exports, {
  FederatedAuthRequestIssue: () => FederatedAuthRequestIssue
});
import * as i18n21 from "../../core/i18n/i18n.js";
var UIStrings12 = {
  /**
   * @description Title for Federated Credential Management API specification URL link.
   */
  fedCm: "Federated Credential Management API",
  /**
   * @description Title for Connection Allowlists API specification URL link.
   */
  connectionAllowlist: "Connection Allowlists API"
};
var str_11 = i18n21.i18n.registerUIStrings("models/issues_manager/FederatedAuthRequestIssue.ts", UIStrings12);
var i18nLazyString8 = i18n21.i18n.getLazilyComputedLocalizedString.bind(void 0, str_11);
var FederatedAuthRequestIssue = class _FederatedAuthRequestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: Audits.InspectorIssueCode.FederatedAuthRequestIssue,
        umaCode: [
          Audits.InspectorIssueCode.FederatedAuthRequestIssue,
          issueDetails.federatedAuthRequestIssueReason
        ].join("::")
      },
      issueDetails,
      issuesModel
    );
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const description = issueDescriptions7.get(this.details().federatedAuthRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.federatedAuthRequestIssueDetails;
    if (!details) {
      console.warn("Federated auth request issue without details received.");
      return [];
    }
    return [new _FederatedAuthRequestIssue(details, issuesModel)];
  }
};
var issueDescriptions7 = /* @__PURE__ */ new Map([
  [
    Audits.FederatedAuthRequestIssueReason.TooManyRequests,
    {
      file: "federatedAuthRequestTooManyRequests.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.WellKnownBlockedByConnectionAllowlist,
    {
      file: "federatedAuthRequestWellKnownBlockedByConnectionAllowlist.md",
      links: [{
        // TODO(crbug.com/543660447): Update this link once connection allowlist is moved out of WICG repo.
        link: "https://github.com/WICG/connection-allowlists",
        linkTitle: i18nLazyString8(UIStrings12.connectionAllowlist)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.ConfigHttpNotFound,
    {
      file: "federatedAuthRequestManifestHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.ConfigNoResponse,
    {
      file: "federatedAuthRequestManifestNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.ConfigBlockedByConnectionAllowlist,
    {
      file: "federatedAuthRequestConfigBlockedByConnectionAllowlist.md",
      links: [{
        // TODO(crbug.com/543660447): Update this link once connection allowlist is moved out of WICG repo.
        link: "https://github.com/WICG/connection-allowlists",
        linkTitle: i18nLazyString8(UIStrings12.connectionAllowlist)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.ConfigInvalidResponse,
    {
      file: "federatedAuthRequestManifestInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.ErrorFetchingSignin,
    {
      file: "federatedAuthRequestErrorFetchingSignin.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.InvalidSigninResponse,
    {
      file: "federatedAuthRequestInvalidSigninResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.AccountsHttpNotFound,
    {
      file: "federatedAuthRequestAccountsHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.AccountsNoResponse,
    {
      file: "federatedAuthRequestAccountsNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.AccountsBlockedByConnectionAllowlist,
    {
      file: "federatedAuthRequestAccountsBlockedByConnectionAllowlist.md",
      links: [{
        // TODO(crbug.com/543660447): Update this link once connection allowlist is moved out of WICG repo.
        link: "https://github.com/WICG/connection-allowlists",
        linkTitle: i18nLazyString8(UIStrings12.connectionAllowlist)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.AccountsInvalidResponse,
    {
      file: "federatedAuthRequestAccountsInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.IdTokenHttpNotFound,
    {
      file: "federatedAuthRequestIdTokenHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.IdTokenNoResponse,
    {
      file: "federatedAuthRequestIdTokenNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.IdTokenBlockedByConnectionAllowlist,
    {
      file: "federatedAuthRequestIdTokenBlockedByConnectionAllowlist.md",
      links: [{
        // TODO(crbug.com/543660447): Update this link once connection allowlist is moved out of WICG repo.
        link: "https://github.com/WICG/connection-allowlists",
        linkTitle: i18nLazyString8(UIStrings12.connectionAllowlist)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.IdTokenInvalidResponse,
    {
      file: "federatedAuthRequestIdTokenInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.IdTokenInvalidRequest,
    {
      file: "federatedAuthRequestIdTokenInvalidRequest.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.ErrorIdToken,
    {
      file: "federatedAuthRequestErrorIdToken.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ],
  [
    Audits.FederatedAuthRequestIssueReason.Canceled,
    {
      file: "federatedAuthRequestCanceled.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings12.fedCm)
      }]
    }
  ]
]);

// ../../front_end/models/issues_manager/FederatedAuthUserInfoRequestIssue.ts
var FederatedAuthUserInfoRequestIssue_exports = {};
__export(FederatedAuthUserInfoRequestIssue_exports, {
  FederatedAuthUserInfoRequestIssue: () => FederatedAuthUserInfoRequestIssue
});
import * as i18n23 from "../../core/i18n/i18n.js";
var UIStrings13 = {
  /**
   * @description Title for Federated Credential Management User Info API specification URL link.
   */
  fedCmUserInfo: "Federated Credential Management User Info API"
};
var str_12 = i18n23.i18n.registerUIStrings("models/issues_manager/FederatedAuthUserInfoRequestIssue.ts", UIStrings13);
var i18nLazyString9 = i18n23.i18n.getLazilyComputedLocalizedString.bind(void 0, str_12);
var FederatedAuthUserInfoRequestIssue = class _FederatedAuthUserInfoRequestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: Audits.InspectorIssueCode.FederatedAuthUserInfoRequestIssue,
        umaCode: [
          Audits.InspectorIssueCode.FederatedAuthUserInfoRequestIssue,
          issueDetails.federatedAuthUserInfoRequestIssueReason
        ].join("::")
      },
      issueDetails,
      issuesModel
    );
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const description = issueDescriptions8.get(this.details().federatedAuthUserInfoRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.federatedAuthUserInfoRequestIssueDetails;
    if (!details) {
      console.warn("Federated auth user info request issue without details received.");
      return [];
    }
    return [new _FederatedAuthUserInfoRequestIssue(details, issuesModel)];
  }
};
var issueDescriptions8 = /* @__PURE__ */ new Map([
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NotSameOrigin,
    {
      file: "federatedAuthUserInfoRequestNotSameOrigin.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NotIframe,
    {
      file: "federatedAuthUserInfoRequestNotIframe.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NotPotentiallyTrustworthy,
    {
      file: "federatedAuthUserInfoRequestNotPotentiallyTrustworthy.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NoAPIPermission,
    {
      file: "federatedAuthUserInfoRequestNoApiPermission.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NotSignedInWithIdp,
    {
      file: "federatedAuthUserInfoRequestNotSignedInWithIdp.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NoAccountSharingPermission,
    {
      file: "federatedAuthUserInfoRequestNoAccountSharingPermission.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.InvalidConfigOrWellKnown,
    {
      file: "federatedAuthUserInfoRequestInvalidConfigOrWellKnown.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.InvalidAccountsResponse,
    {
      file: "federatedAuthUserInfoRequestInvalidAccountsResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ],
  [
    Audits.FederatedAuthUserInfoRequestIssueReason.NoReturningUserFromFetchedAccounts,
    {
      file: "federatedAuthUserInfoRequestNoReturningUserFromFetchedAccounts.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString9(UIStrings13.fedCmUserInfo)
      }]
    }
  ]
]);

// ../../front_end/models/issues_manager/GenericIssue.ts
var GenericIssue_exports = {};
__export(GenericIssue_exports, {
  GenericIssue: () => GenericIssue,
  genericBackUINavigationWouldSkipAd: () => genericBackUINavigationWouldSkipAd,
  genericFormAriaLabelledByToNonExistingIdError: () => genericFormAriaLabelledByToNonExistingIdError,
  genericFormAutocompleteAttributeEmptyError: () => genericFormAutocompleteAttributeEmptyError,
  genericFormDuplicateIdForInputError: () => genericFormDuplicateIdForInputError,
  genericFormEmptyIdAndNameAttributesForInputError: () => genericFormEmptyIdAndNameAttributesForInputError,
  genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError: () => genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError,
  genericFormInputHasWrongButWellIntendedAutocompleteValue: () => genericFormInputHasWrongButWellIntendedAutocompleteValue,
  genericFormInputWithNoLabelError: () => genericFormInputWithNoLabelError,
  genericFormLabelForMatchesNonExistingIdError: () => genericFormLabelForMatchesNonExistingIdError,
  genericFormLabelForNameError: () => genericFormLabelForNameError,
  genericFormLabelHasNeitherForNorNestedInputError: () => genericFormLabelHasNeitherForNorNestedInputError,
  genericFormModelContextMissingToolDescription: () => genericFormModelContextMissingToolDescription,
  genericFormModelContextMissingToolName: () => genericFormModelContextMissingToolName,
  genericFormModelContextParameterMissingName: () => genericFormModelContextParameterMissingName,
  genericFormModelContextParameterMissingTitleAndDescription: () => genericFormModelContextParameterMissingTitleAndDescription,
  genericFormModelContextRequiredParameterMissingName: () => genericFormModelContextRequiredParameterMissingName,
  genericNavigationEntryMarkedSkippable: () => genericNavigationEntryMarkedSkippable,
  genericResponseWasBlockedbyORB: () => genericResponseWasBlockedbyORB
});
import * as i18n25 from "../../core/i18n/i18n.js";
var UIStrings14 = {
  /**
   * @description Title for autofill documentation page.
   */
  howDoesAutofillWorkPageTitle: "How does autofill work?",
  /**
   * @description Title for label form elements usage example page.
   */
  labelFormlementsPageTitle: "The label elements",
  /**
   * @description Title for input form elements usage example page.
   */
  inputFormElementPageTitle: "The form input element",
  /**
   * @description Title for autocomplete attribute documentation page.
   */
  autocompleteAttributePageTitle: "HTML attribute: autocomplete",
  /**
   * @description Title for CORB explainer.
   */
  corbExplainerPageTitle: "CORB explainer",
  /**
   * @description Title for history intervention documentation page.
   */
  historyManipulationInterventionPageTitle: "History manipulation intervention explainer",
  /**
   * @description Title for back-to-ad intervention documentation page.
   */
  backToAdInterventionPageTitle: "Back-to-ad intervention explainer"
};
var str_13 = i18n25.i18n.registerUIStrings("models/issues_manager/GenericIssue.ts", UIStrings14);
var i18nLazyString10 = i18n25.i18n.getLazilyComputedLocalizedString.bind(void 0, str_13);
var GenericIssue = class _GenericIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    const issueCode = [
      Audits.InspectorIssueCode.GenericIssue,
      issueDetails.errorType
    ].join("::");
    super(issueCode, issueDetails, issuesModel, issueId);
  }
  requests() {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }
  elements() {
    const details = this.details();
    if (details.violatingNodeId) {
      return [{
        backendNodeId: details.violatingNodeId,
        nodeName: "",
        target: this.model()?.target() ?? null
      }];
    }
    return [];
  }
  getCategory() {
    return "Generic" /* GENERIC */;
  }
  primaryKey() {
    const details = this.details();
    const requestId = details.request ? details.request.requestId : "no-request";
    return `${this.code()}-(${details.frameId})-(${details.violatingNodeId})-(${details.violatingNodeAttribute})-(${requestId})`;
  }
  getDescription() {
    const description = issueDescriptions9.get(this.details().errorType);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  getKind() {
    return issueTypes.get(this.details().errorType) || "Improvement" /* IMPROVEMENT */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const genericDetails = inspectorIssue.details.genericIssueDetails;
    if (!genericDetails) {
      console.warn("Generic issue without details received.");
      return [];
    }
    return [new _GenericIssue(genericDetails, issuesModel, inspectorIssue.issueId)];
  }
};
var genericFormLabelForNameError = {
  file: "genericFormLabelForNameError.md",
  links: [{
    link: "https://html.spec.whatwg.org/multipage/forms.html#attr-label-for",
    // Since the link points to a page with the same title, the 'HTML Standard'
    // string doesn't need to be translated.
    linkTitle: i18n25.i18n.lockedLazyString("HTML Standard")
  }]
};
var genericFormInputWithNoLabelError = {
  file: "genericFormInputWithNoLabelError.md",
  links: []
};
var genericFormAutocompleteAttributeEmptyError = {
  file: "genericFormAutocompleteAttributeEmptyError.md",
  links: []
};
var genericFormDuplicateIdForInputError = {
  file: "genericFormDuplicateIdForInputError.md",
  links: [{
    link: "https://web.dev/learn/forms/autofill/#how-does-autofill-work",
    linkTitle: i18nLazyString10(UIStrings14.howDoesAutofillWorkPageTitle)
  }]
};
var genericFormAriaLabelledByToNonExistingIdError = {
  file: "genericFormAriaLabelledByToNonExistingIdError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
    linkTitle: i18nLazyString10(UIStrings14.labelFormlementsPageTitle)
  }]
};
var genericFormEmptyIdAndNameAttributesForInputError = {
  file: "genericFormEmptyIdAndNameAttributesForInputError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input",
    linkTitle: i18nLazyString10(UIStrings14.inputFormElementPageTitle)
  }]
};
var genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError = {
  file: "genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values",
    linkTitle: i18nLazyString10(UIStrings14.autocompleteAttributePageTitle)
  }]
};
var genericFormInputHasWrongButWellIntendedAutocompleteValue = {
  file: "genericFormInputHasWrongButWellIntendedAutocompleteValueError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values",
    linkTitle: i18nLazyString10(UIStrings14.autocompleteAttributePageTitle)
  }]
};
var genericFormLabelForMatchesNonExistingIdError = {
  file: "genericFormLabelForMatchesNonExistingIdError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
    linkTitle: i18nLazyString10(UIStrings14.labelFormlementsPageTitle)
  }]
};
var genericFormLabelHasNeitherForNorNestedInputError = {
  file: "genericFormLabelHasNeitherForNorNestedInputError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
    linkTitle: i18nLazyString10(UIStrings14.labelFormlementsPageTitle)
  }]
};
var genericResponseWasBlockedbyORB = {
  file: "genericResponseWasBlockedByORB.md",
  links: [{
    link: "https://www.chromium.org/Home/chromium-security/corb-for-developers/",
    linkTitle: i18nLazyString10(UIStrings14.corbExplainerPageTitle)
  }]
};
var genericNavigationEntryMarkedSkippable = {
  file: "genericNavigationEntryMarkedSkippable.md",
  links: [{
    link: "https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md",
    linkTitle: i18nLazyString10(UIStrings14.historyManipulationInterventionPageTitle)
  }]
};
var genericBackUINavigationWouldSkipAd = {
  file: "genericBackUINavigationWouldSkipAd.md",
  links: [{
    link: "https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md",
    linkTitle: i18nLazyString10(UIStrings14.backToAdInterventionPageTitle)
  }]
};
var genericFormModelContextMissingToolName = {
  file: "genericFormModelContextMissingToolName.md",
  links: []
};
var genericFormModelContextMissingToolDescription = {
  file: "genericFormModelContextMissingToolDescription.md",
  links: []
};
var genericFormModelContextParameterMissingTitleAndDescription = {
  file: "genericFormModelContextParameterMissingTitleAndDescription.md",
  links: []
};
var genericFormModelContextRequiredParameterMissingName = {
  file: "genericFormModelContextRequiredParameterMissingName.md",
  links: []
};
var genericFormModelContextParameterMissingName = {
  file: "genericFormModelContextParameterMissingName.md",
  links: []
};
var issueDescriptions9 = /* @__PURE__ */ new Map([
  [Audits.GenericIssueErrorType.FormLabelForNameError, genericFormLabelForNameError],
  [Audits.GenericIssueErrorType.FormInputWithNoLabelError, genericFormInputWithNoLabelError],
  [
    Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError,
    genericFormAutocompleteAttributeEmptyError
  ],
  [Audits.GenericIssueErrorType.FormDuplicateIdForInputError, genericFormDuplicateIdForInputError],
  [
    Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingIdError,
    genericFormAriaLabelledByToNonExistingIdError
  ],
  [
    Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError,
    genericFormEmptyIdAndNameAttributesForInputError
  ],
  [
    Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError,
    genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError
  ],
  [
    Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError,
    genericFormLabelForMatchesNonExistingIdError
  ],
  [
    Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInputError,
    genericFormLabelHasNeitherForNorNestedInputError
  ],
  [
    Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError,
    genericFormInputHasWrongButWellIntendedAutocompleteValue
  ],
  [
    Audits.GenericIssueErrorType.ResponseWasBlockedByORB,
    genericResponseWasBlockedbyORB
  ],
  [
    Audits.GenericIssueErrorType.NavigationEntryMarkedSkippable,
    genericNavigationEntryMarkedSkippable
  ],
  [
    Audits.GenericIssueErrorType.BackUINavigationWouldSkipAd,
    genericBackUINavigationWouldSkipAd
  ],
  [
    Audits.GenericIssueErrorType.FormModelContextMissingToolName,
    genericFormModelContextMissingToolName
  ],
  [
    Audits.GenericIssueErrorType.FormModelContextMissingToolDescription,
    genericFormModelContextMissingToolDescription
  ],
  [
    Audits.GenericIssueErrorType.FormModelContextParameterMissingTitleAndDescription,
    genericFormModelContextParameterMissingTitleAndDescription
  ],
  [
    Audits.GenericIssueErrorType.FormModelContextRequiredParameterMissingName,
    genericFormModelContextRequiredParameterMissingName
  ],
  [
    Audits.GenericIssueErrorType.FormModelContextParameterMissingName,
    genericFormModelContextParameterMissingName
  ]
]);
var issueTypes = /* @__PURE__ */ new Map([
  [Audits.GenericIssueErrorType.FormLabelForNameError, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormInputWithNoLabelError, "Improvement" /* IMPROVEMENT */],
  [Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormDuplicateIdForInputError, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingIdError, "Improvement" /* IMPROVEMENT */],
  [Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError, "Improvement" /* IMPROVEMENT */],
  [
    Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError,
    "Improvement" /* IMPROVEMENT */
  ],
  [Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInputError, "Improvement" /* IMPROVEMENT */],
  [Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError, "Improvement" /* IMPROVEMENT */],
  [Audits.GenericIssueErrorType.FormModelContextMissingToolName, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormModelContextMissingToolDescription, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormModelContextParameterMissingTitleAndDescription, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormModelContextRequiredParameterMissingName, "PageError" /* PAGE_ERROR */],
  [Audits.GenericIssueErrorType.FormModelContextParameterMissingName, "PageError" /* PAGE_ERROR */]
]);

// ../../front_end/models/issues_manager/HeavyAdIssue.ts
var HeavyAdIssue_exports = {};
__export(HeavyAdIssue_exports, {
  HeavyAdIssue: () => HeavyAdIssue
});
import * as i18n27 from "../../core/i18n/i18n.js";
var UIStrings15 = {
  /**
   * @description Title for a learn more link in heavy ads issue description.
   */
  handlingHeavyAdInterventions: "Handling heavy ad interventions"
};
var str_14 = i18n27.i18n.registerUIStrings("models/issues_manager/HeavyAdIssue.ts", UIStrings15);
var i18nString4 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var HeavyAdIssue = class _HeavyAdIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const umaCode = [Audits.InspectorIssueCode.HeavyAdIssue, issueDetails.reason].join("::");
    super({ code: Audits.InspectorIssueCode.HeavyAdIssue, umaCode }, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${Audits.InspectorIssueCode.HeavyAdIssue}-${JSON.stringify(this.details())}`;
  }
  getDescription() {
    return {
      file: "heavyAd.md",
      links: [
        {
          link: "https://developers.google.com/web/updates/2020/05/heavy-ad-interventions",
          linkTitle: i18nString4(UIStrings15.handlingHeavyAdInterventions)
        }
      ]
    };
  }
  getCategory() {
    return "HeavyAd" /* HEAVY_AD */;
  }
  getKind() {
    switch (this.details().resolution) {
      case Audits.HeavyAdResolutionStatus.HeavyAdBlocked:
        return "PageError" /* PAGE_ERROR */;
      case Audits.HeavyAdResolutionStatus.HeavyAdWarning:
        return "BreakingChange" /* BREAKING_CHANGE */;
    }
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const heavyAdIssueDetails = inspectorIssue.details.heavyAdIssueDetails;
    if (!heavyAdIssueDetails) {
      console.warn("Heavy ad issue without details received.");
      return [];
    }
    return [new _HeavyAdIssue(heavyAdIssueDetails, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/IssueAggregator.ts
var IssueAggregator_exports = {};
__export(IssueAggregator_exports, {
  AggregatedIssue: () => AggregatedIssue,
  Events: () => Events3,
  IssueAggregator: () => IssueAggregator
});
import * as Common3 from "../../core/common/common.js";

// ../../front_end/models/issues_manager/LazyLoadImageIssue.ts
var LazyLoadImageIssue_exports = {};
__export(LazyLoadImageIssue_exports, {
  LazyLoadImageIssue: () => LazyLoadImageIssue
});
import * as i18n29 from "../../core/i18n/i18n.js";
var UIStrings16 = {
  /**
   * @description Link title for the lazy-loaded image with zero size issue in the Issues panel.
   */
  lazyLoadImageZeroSize: "Lazy-loaded images should have explicit dimensions"
};
var str_15 = i18n29.i18n.registerUIStrings("models/issues_manager/LazyLoadImageIssue.ts", UIStrings16);
var i18nString5 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var LazyLoadImageIssue = class _LazyLoadImageIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const umaCode = [Audits.InspectorIssueCode.LazyLoadImageIssue, "ZeroSize"].join("::");
    super({ code: Audits.InspectorIssueCode.LazyLoadImageIssue, umaCode }, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${this.code()}-(${this.details().nodeId})-(${this.details().url})`;
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    return {
      file: "lazyLoadImageZeroSize.md",
      links: [
        {
          link: "https://web.dev/articles/browser-level-image-lazy-loading/#dimension-attributes",
          linkTitle: i18nString5(UIStrings16.lazyLoadImageZeroSize)
        }
      ]
    };
  }
  elementCount() {
    return this.details().nodeId ? 1 : 0;
  }
  elements() {
    if (this.details().nodeId) {
      const target = this.model()?.target();
      return [{
        backendNodeId: this.details().nodeId,
        nodeName: "img",
        target: target || null
      }];
    }
    return [];
  }
  getKind() {
    return "Improvement" /* IMPROVEMENT */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.lazyLoadImageIssueDetails;
    if (!details) {
      console.warn("Lazy-loaded image issue without details received.");
      return [];
    }
    return [new _LazyLoadImageIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/MixedContentIssue.ts
var MixedContentIssue_exports = {};
__export(MixedContentIssue_exports, {
  MixedContentIssue: () => MixedContentIssue
});
import * as i18n31 from "../../core/i18n/i18n.js";
var UIStrings17 = {
  /**
   * @description Label for the link for mixed content issues.
   */
  preventingMixedContent: "Preventing mixed content"
};
var str_16 = i18n31.i18n.registerUIStrings("models/issues_manager/MixedContentIssue.ts", UIStrings17);
var i18nString6 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var MixedContentIssue = class _MixedContentIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(Audits.InspectorIssueCode.MixedContentIssue, issueDetails, issuesModel);
  }
  requests() {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }
  getCategory() {
    return "MixedContent" /* MIXED_CONTENT */;
  }
  getDescription() {
    return {
      file: "mixedContent.md",
      links: [{ link: "https://web.dev/what-is-mixed-content/", linkTitle: i18nString6(UIStrings17.preventingMixedContent) }]
    };
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    switch (this.details().resolutionStatus) {
      case Audits.MixedContentResolutionStatus.MixedContentAutomaticallyUpgraded:
        return "Improvement" /* IMPROVEMENT */;
      case Audits.MixedContentResolutionStatus.MixedContentBlocked:
        return "PageError" /* PAGE_ERROR */;
      case Audits.MixedContentResolutionStatus.MixedContentWarning:
        return "Improvement" /* IMPROVEMENT */;
    }
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const mixedContentDetails = inspectorIssue.details.mixedContentIssueDetails;
    if (!mixedContentDetails) {
      console.warn("Mixed content issue without details received.");
      return [];
    }
    return [new _MixedContentIssue(mixedContentDetails, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/PartitioningBlobURLIssue.ts
var PartitioningBlobURLIssue_exports = {};
__export(PartitioningBlobURLIssue_exports, {
  PartitioningBlobURLIssue: () => PartitioningBlobURLIssue
});
import * as i18n33 from "../../core/i18n/i18n.js";
var UIStrings18 = {
  /**
   * @description Title for Partitioning BlobURL explainer URL link.
   */
  partitioningBlobURL: "Partitioning BlobURL",
  /**
   * @description Title for Chrome Status entry URL link.
   */
  chromeStatusEntry: "Chrome Status entry"
};
var str_17 = i18n33.i18n.registerUIStrings("models/issues_manager/PartitioningBlobURLIssue.ts", UIStrings18);
var i18nString7 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var PartitioningBlobURLIssue = class _PartitioningBlobURLIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(Audits.InspectorIssueCode.PartitioningBlobURLIssue, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const fileName = this.details().partitioningBlobURLInfo === Audits.PartitioningBlobURLInfo.BlockedCrossPartitionFetching ? "fetchingPartitionedBlobURL.md" : "navigatingPartitionedBlobURL.md";
    return {
      file: fileName,
      links: [
        {
          link: "https://developers.google.com/privacy-sandbox/cookies/storage-partitioning",
          linkTitle: i18nString7(UIStrings18.partitioningBlobURL)
        },
        {
          link: "https://chromestatus.com/feature/5130361898795008",
          linkTitle: i18nString7(UIStrings18.chromeStatusEntry)
        }
      ]
    };
  }
  getKind() {
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.partitioningBlobURLIssueDetails;
    if (!details) {
      console.warn("Partitioning BlobURL issue without details received.");
      return [];
    }
    return [new _PartitioningBlobURLIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/PermissionElementIssue.ts
var PermissionElementIssue_exports = {};
__export(PermissionElementIssue_exports, {
  PermissionElementIssue: () => PermissionElementIssue
});
var PermissionElementIssue = class _PermissionElementIssue extends Issue {
  #issueDetails;
  constructor(issueDetails, issuesModel) {
    const issueCode = [
      Audits.InspectorIssueCode.PermissionElementIssue,
      issueDetails.issueType
    ].join("::");
    super(issueCode, issueDetails, issuesModel);
    this.#issueDetails = issueDetails;
  }
  getCategory() {
    return "PermissionElement" /* PERMISSION_ELEMENT */;
  }
  getDescription() {
    const issueType = this.#issueDetails.issueType;
    switch (issueType) {
      case Audits.PermissionElementIssueType.InvalidType:
        return {
          file: "permissionElementInvalidType.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.FencedFrameDisallowed:
        return {
          file: "permissionElementFencedFrameDisallowed.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.CspFrameAncestorsMissing:
        return {
          file: "permissionElementCspFrameAncestorsMissing.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.PermissionsPolicyBlocked:
        return {
          file: "permissionElementPermissionsPolicyBlocked.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""],
            ["PLACEHOLDER_PermissionName", this.#issueDetails.permissionName || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.PaddingRightUnsupported:
        return {
          file: "permissionElementPaddingRightUnsupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.PaddingBottomUnsupported:
        return {
          file: "permissionElementPaddingBottomUnsupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.InsetBoxShadowUnsupported:
        return {
          file: "permissionElementInsetBoxShadowUnsupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.RequestInProgress:
        return {
          file: "permissionElementRequestInProgress.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.UntrustedEvent:
        return {
          file: "permissionElementUntrustedEvent.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.RegistrationFailed:
        return {
          file: "permissionElementRegistrationFailed.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.TypeNotSupported:
        return {
          file: "permissionElementTypeNotSupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.InvalidTypeActivation:
        return {
          file: "permissionElementInvalidTypeActivation.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.SecurityChecksFailed:
        return {
          file: "permissionElementSecurityChecksFailed.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.ActivationDisabled: {
        if (this.#issueDetails.occluderNodeInfo && this.#issueDetails.occluderParentNodeInfo) {
          return {
            file: "permissionElementActivationDisabledWithOccluderParent.md",
            substitutions: /* @__PURE__ */ new Map([
              ["PLACEHOLDER_DisableReason", this.#issueDetails.disableReason || ""],
              ["PLACEHOLDER_OccluderInfo", this.#issueDetails.occluderNodeInfo || ""],
              ["PLACEHOLDER_Type", this.#issueDetails.type || ""],
              ["PLACEHOLDER_OccluderParentInfo", this.#issueDetails.occluderParentNodeInfo || ""]
            ]),
            links: []
          };
        }
        if (this.#issueDetails.occluderNodeInfo) {
          return {
            file: "permissionElementActivationDisabledWithOccluder.md",
            substitutions: /* @__PURE__ */ new Map([
              ["PLACEHOLDER_DisableReason", this.#issueDetails.disableReason || ""],
              ["PLACEHOLDER_OccluderInfo", this.#issueDetails.occluderNodeInfo || ""],
              ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
            ]),
            links: []
          };
        }
        return {
          file: "permissionElementActivationDisabled.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_DisableReason", this.#issueDetails.disableReason || ""],
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      }
      case Audits.PermissionElementIssueType.GeolocationDeprecated:
        return {
          file: "permissionElementGeolocationDeprecated.md",
          links: []
        };
      case Audits.PermissionElementIssueType.InvalidDisplayStyle:
        return {
          file: "permissionElementInvalidDisplayStyle.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.NonOpaqueColor:
        return {
          file: "permissionElementNonOpaqueColor.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.LowContrast:
        return {
          file: "permissionElementLowContrast.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.FontSizeTooSmall:
        return {
          file: "permissionElementFontSizeTooSmall.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.FontSizeTooLarge:
        return {
          file: "permissionElementFontSizeTooLarge.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case Audits.PermissionElementIssueType.InvalidSizeValue:
        return {
          file: "permissionElementInvalidSizeValue.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      default:
        console.warn("Unknown PermissionElementIssueType:", issueType);
        return null;
    }
  }
  elements() {
    if (this.#issueDetails.nodeId) {
      const target = this.model()?.target();
      const result = [{
        backendNodeId: this.#issueDetails.nodeId,
        nodeName: this.#issueDetails.type || "Affected element",
        target: target || null
      }];
      return result;
    }
    return [];
  }
  getKind() {
    return this.#issueDetails.isWarning ? "Improvement" /* IMPROVEMENT */ : "PageError" /* PAGE_ERROR */;
  }
  primaryKey() {
    return `${Audits.InspectorIssueCode.PermissionElementIssue}-${JSON.stringify(this.#issueDetails)}`;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const permissionElementIssueDetails = inspectorIssue.details.permissionElementIssueDetails;
    if (!permissionElementIssueDetails) {
      console.warn("Permission element issue without details received.");
      return [];
    }
    return [new _PermissionElementIssue(permissionElementIssueDetails, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/QuirksModeIssue.ts
var QuirksModeIssue_exports = {};
__export(QuirksModeIssue_exports, {
  QuirksModeIssue: () => QuirksModeIssue
});
import * as i18n35 from "../../core/i18n/i18n.js";
var UIStrings19 = {
  /**
   * @description Link title for the Quirks Mode issue in the Issues panel.
   */
  documentCompatibilityMode: "Document compatibility mode"
};
var str_18 = i18n35.i18n.registerUIStrings("models/issues_manager/QuirksModeIssue.ts", UIStrings19);
var i18nString8 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var QuirksModeIssue = class _QuirksModeIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const mode = issueDetails.isLimitedQuirksMode ? "LimitedQuirksMode" : "QuirksMode";
    const umaCode = [Audits.InspectorIssueCode.QuirksModeIssue, mode].join("::");
    super({ code: Audits.InspectorIssueCode.QuirksModeIssue, umaCode }, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${this.code()}-(${this.details().documentNodeId})-(${this.details().url})`;
  }
  getCategory() {
    return "QuirksMode" /* QUIRKS_MODE */;
  }
  getDescription() {
    return {
      file: "CompatibilityModeQuirks.md",
      links: [
        {
          link: "https://web.dev/doctype/",
          linkTitle: i18nString8(UIStrings19.documentCompatibilityMode)
        }
      ]
    };
  }
  getKind() {
    return "Improvement" /* IMPROVEMENT */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const quirksModeIssueDetails = inspectorIssue.details.quirksModeIssueDetails;
    if (!quirksModeIssueDetails) {
      console.warn("Quirks Mode issue without details received.");
      return [];
    }
    return [new _QuirksModeIssue(quirksModeIssueDetails, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/SelectivePermissionsInterventionIssue.ts
var SelectivePermissionsInterventionIssue_exports = {};
__export(SelectivePermissionsInterventionIssue_exports, {
  SelectivePermissionsInterventionIssue: () => SelectivePermissionsInterventionIssue
});
import * as i18n37 from "../../core/i18n/i18n.js";
var UIStrings20 = {
  /**
   * @description Title for a learn more link in selective permissions intervention issue description.
   */
  selectivePermissionsIntervention: "Selective permissions intervention"
};
var str_19 = i18n37.i18n.registerUIStrings("models/issues_manager/SelectivePermissionsInterventionIssue.ts", UIStrings20);
var i18nString9 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var SelectivePermissionsInterventionIssue = class _SelectivePermissionsInterventionIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue}-${JSON.stringify(this.details())}`;
  }
  getDescription() {
    return {
      file: "selectivePermissionsIntervention.md",
      links: [
        {
          link: "https://crbug.com/435223477",
          linkTitle: i18nString9(UIStrings20.selectivePermissionsIntervention)
        }
      ]
    };
  }
  getCategory() {
    return "SelectivePermissionsIntervention" /* SELECTIVE_PERMISSIONS_INTERVENTION */;
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const selectivePermissionsInterventionIssueDetails = inspectorIssue.details.selectivePermissionsInterventionIssueDetails;
    if (!selectivePermissionsInterventionIssueDetails) {
      console.warn("Selective Permissions Intervention issue without details received.");
      return [];
    }
    return [new _SelectivePermissionsInterventionIssue(selectivePermissionsInterventionIssueDetails, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/SharedArrayBufferIssue.ts
var SharedArrayBufferIssue_exports = {};
__export(SharedArrayBufferIssue_exports, {
  SharedArrayBufferIssue: () => SharedArrayBufferIssue
});
import * as i18n39 from "../../core/i18n/i18n.js";
var UIStrings21 = {
  /**
   * @description Label for the link for SharedArrayBuffer issues. The full text reads "Enabling SharedArrayBuffer"
   * and is the title of an article that describes how to enable a JavaScript feature called SharedArrayBuffer.
   */
  enablingSharedArrayBuffer: "Enabling SharedArrayBuffer"
};
var str_20 = i18n39.i18n.registerUIStrings("models/issues_manager/SharedArrayBufferIssue.ts", UIStrings21);
var i18nString10 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
var SharedArrayBufferIssue = class _SharedArrayBufferIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const umaCode = [Audits.InspectorIssueCode.SharedArrayBufferIssue, issueDetails.type].join("::");
    super({ code: Audits.InspectorIssueCode.SharedArrayBufferIssue, umaCode }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    return {
      file: "sharedArrayBuffer.md",
      links: [{
        link: "https://developer.chrome.com/blog/enabling-shared-array-buffer/",
        linkTitle: i18nString10(UIStrings21.enablingSharedArrayBuffer)
      }]
    };
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    if (this.details().isWarning) {
      return "BreakingChange" /* BREAKING_CHANGE */;
    }
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const sabIssueDetails = inspectorIssue.details.sharedArrayBufferIssueDetails;
    if (!sabIssueDetails) {
      console.warn("SAB transfer issue without details received.");
      return [];
    }
    return [new _SharedArrayBufferIssue(sabIssueDetails, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/IssueAggregator.ts
var AggregatedIssue = class extends Issue {
  #allIssues = /* @__PURE__ */ new Set();
  #affectedCookies = /* @__PURE__ */ new Map();
  #affectedRawCookieLines = /* @__PURE__ */ new Map();
  #affectedRequests = [];
  #affectedRequestIds = /* @__PURE__ */ new Set();
  #affectedLocations = /* @__PURE__ */ new Map();
  #heavyAdIssues = /* @__PURE__ */ new Set();
  #blockedByResponseDetails = /* @__PURE__ */ new Map();
  #bounceTrackingSites = /* @__PURE__ */ new Set();
  #corsIssues = /* @__PURE__ */ new Set();
  #cspIssues = /* @__PURE__ */ new Set();
  #deprecationIssues = /* @__PURE__ */ new Set();
  #issueKind = "Improvement" /* IMPROVEMENT */;
  #cookieDeprecationMetadataIssues = /* @__PURE__ */ new Set();
  #mixedContentIssues = /* @__PURE__ */ new Set();
  #partitioningBlobURLIssues = /* @__PURE__ */ new Set();
  #permissionElementIssues = /* @__PURE__ */ new Set();
  #lazyLoadImageIssues = /* @__PURE__ */ new Set();
  #selectivePermissionsInterventionIssues = /* @__PURE__ */ new Set();
  #sharedArrayBufferIssues = /* @__PURE__ */ new Set();
  #quirksModeIssues = /* @__PURE__ */ new Set();
  #genericIssues = /* @__PURE__ */ new Set();
  #elementAccessibilityIssues = /* @__PURE__ */ new Set();
  #representative;
  #aggregatedIssuesCount = 0;
  #key;
  constructor(code, aggregationKey) {
    super(code, null);
    this.#key = aggregationKey;
  }
  primaryKey() {
    throw new Error("This should never be called");
  }
  aggregationKey() {
    return this.#key;
  }
  getBlockedByResponseDetails() {
    return this.#blockedByResponseDetails.values();
  }
  cookies() {
    return Array.from(this.#affectedCookies.values()).map((x) => x.cookie);
  }
  getRawCookieLines() {
    return this.#affectedRawCookieLines.values();
  }
  sources() {
    return this.#affectedLocations.values();
  }
  getBounceTrackingSites() {
    return this.#bounceTrackingSites.values();
  }
  cookiesWithRequestIndicator() {
    return this.#affectedCookies.values();
  }
  getHeavyAdIssues() {
    return this.#heavyAdIssues;
  }
  getCookieDeprecationMetadataIssues() {
    return this.#cookieDeprecationMetadataIssues;
  }
  getMixedContentIssues() {
    return this.#mixedContentIssues;
  }
  getCorsIssues() {
    return this.#corsIssues;
  }
  getCspIssues() {
    return this.#cspIssues;
  }
  getDeprecationIssues() {
    return this.#deprecationIssues;
  }
  requests() {
    return this.#affectedRequests.values();
  }
  getSelectivePermissionsInterventionIssues() {
    return this.#selectivePermissionsInterventionIssues;
  }
  getSharedArrayBufferIssues() {
    return this.#sharedArrayBufferIssues;
  }
  getQuirksModeIssues() {
    return this.#quirksModeIssues;
  }
  getGenericIssues() {
    return this.#genericIssues;
  }
  getElementAccessibilityIssues() {
    return this.#elementAccessibilityIssues;
  }
  getDescription() {
    if (this.#representative) {
      return this.#representative.getDescription();
    }
    return null;
  }
  getCategory() {
    if (this.#representative) {
      return this.#representative.getCategory();
    }
    return "Other" /* OTHER */;
  }
  getAggregatedIssuesCount() {
    return this.#aggregatedIssuesCount;
  }
  getPartitioningBlobURLIssues() {
    return this.#partitioningBlobURLIssues;
  }
  getPermissionElementIssues() {
    return this.#permissionElementIssues;
  }
  getLazyLoadImageIssues() {
    return this.#lazyLoadImageIssues;
  }
  /**
   * Produces a primary key for a cookie. Use this instead of `JSON.stringify` in
   * case new fields are added to `AffectedCookie`.
   */
  #keyForCookie(cookie) {
    const { domain, path, name } = cookie;
    return `${domain};${path};${name}`;
  }
  addInstance(issue) {
    this.#aggregatedIssuesCount++;
    if (!this.#representative) {
      this.#representative = issue;
    }
    this.#allIssues.add(issue);
    this.#issueKind = unionIssueKind(this.#issueKind, issue.getKind());
    let hasRequest = false;
    for (const request of issue.requests()) {
      const { requestId } = request;
      hasRequest = true;
      if (requestId === void 0) {
        this.#affectedRequests.push(request);
      } else if (!this.#affectedRequestIds.has(requestId)) {
        this.#affectedRequests.push(request);
        this.#affectedRequestIds.add(requestId);
      }
    }
    for (const cookie of issue.cookies()) {
      const key = this.#keyForCookie(cookie);
      if (!this.#affectedCookies.has(key)) {
        this.#affectedCookies.set(key, { cookie, hasRequest });
      }
    }
    for (const rawCookieLine of issue.rawCookieLines()) {
      if (!this.#affectedRawCookieLines.has(rawCookieLine)) {
        this.#affectedRawCookieLines.set(rawCookieLine, { rawCookieLine, hasRequest });
      }
    }
    for (const site of issue.trackingSites()) {
      if (!this.#bounceTrackingSites.has(site)) {
        this.#bounceTrackingSites.add(site);
      }
    }
    for (const location of issue.sources()) {
      const key = JSON.stringify(location);
      if (!this.#affectedLocations.has(key)) {
        this.#affectedLocations.set(key, location);
      }
    }
    if (issue instanceof CookieDeprecationMetadataIssue) {
      this.#cookieDeprecationMetadataIssues.add(issue);
    }
    if (issue instanceof MixedContentIssue) {
      this.#mixedContentIssues.add(issue);
    }
    if (issue instanceof HeavyAdIssue) {
      this.#heavyAdIssues.add(issue);
    }
    for (const details of issue.getBlockedByResponseDetails()) {
      const key = JSON.stringify(details, ["parentFrame", "blockedFrame", "requestId", "frameId", "reason", "request"]);
      this.#blockedByResponseDetails.set(key, details);
    }
    if (issue instanceof ContentSecurityPolicyIssue) {
      this.#cspIssues.add(issue);
    }
    if (issue instanceof DeprecationIssue) {
      this.#deprecationIssues.add(issue);
    }
    if (issue instanceof SharedArrayBufferIssue) {
      this.#sharedArrayBufferIssues.add(issue);
    }
    if (issue instanceof CorsIssue) {
      this.#corsIssues.add(issue);
    }
    if (issue instanceof QuirksModeIssue) {
      this.#quirksModeIssues.add(issue);
    }
    if (issue instanceof GenericIssue) {
      this.#genericIssues.add(issue);
    }
    if (issue instanceof ElementAccessibilityIssue) {
      this.#elementAccessibilityIssues.add(issue);
    }
    if (issue instanceof PartitioningBlobURLIssue) {
      this.#partitioningBlobURLIssues.add(issue);
    }
    if (issue instanceof PermissionElementIssue) {
      this.#permissionElementIssues.add(issue);
    }
    if (issue instanceof LazyLoadImageIssue) {
      this.#lazyLoadImageIssues.add(issue);
    }
    if (issue instanceof SelectivePermissionsInterventionIssue) {
      this.#selectivePermissionsInterventionIssues.add(issue);
    }
  }
  getKind() {
    return this.#issueKind;
  }
  getAllIssues() {
    return Array.from(this.#allIssues);
  }
  isHidden() {
    return this.#representative?.isHidden() || false;
  }
  setHidden(_value) {
    throw new Error("Should not call setHidden on aggregatedIssue");
  }
};
var IssueAggregator = class extends Common3.ObjectWrapper.ObjectWrapper {
  constructor(issuesManager) {
    super();
    this.issuesManager = issuesManager;
    this.issuesManager.addEventListener("IssueAdded" /* ISSUE_ADDED */, this.#onIssueAdded, this);
    this.issuesManager.addEventListener("FullUpdateRequired" /* FULL_UPDATE_REQUIRED */, this.#onFullUpdateRequired, this);
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
  }
  #aggregatedIssuesByKey = /* @__PURE__ */ new Map();
  #hiddenAggregatedIssuesByKey = /* @__PURE__ */ new Map();
  #onIssueAdded(event) {
    this.#aggregateIssue(event.data.issue);
  }
  #onFullUpdateRequired() {
    this.#aggregatedIssuesByKey.clear();
    this.#hiddenAggregatedIssuesByKey.clear();
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
    this.dispatchEventToListeners("FullUpdateRequired" /* FULL_UPDATE_REQUIRED */);
  }
  #aggregateIssue(issue) {
    if (CookieIssue.isThirdPartyCookiePhaseoutRelatedIssue(issue)) {
      return;
    }
    const map = issue.isHidden() ? this.#hiddenAggregatedIssuesByKey : this.#aggregatedIssuesByKey;
    const aggregatedIssue = this.#aggregateIssueByStatus(map, issue);
    this.dispatchEventToListeners("AggregatedIssueUpdated" /* AGGREGATED_ISSUE_UPDATED */, aggregatedIssue);
    return aggregatedIssue;
  }
  #aggregateIssueByStatus(aggregatedIssuesMap, issue) {
    const key = issue.code();
    let aggregatedIssue = aggregatedIssuesMap.get(key);
    if (!aggregatedIssue) {
      aggregatedIssue = new AggregatedIssue(issue.code(), key);
      aggregatedIssuesMap.set(key, aggregatedIssue);
    }
    aggregatedIssue.addInstance(issue);
    return aggregatedIssue;
  }
  aggregatedIssues() {
    return [...this.#aggregatedIssuesByKey.values(), ...this.#hiddenAggregatedIssuesByKey.values()];
  }
  aggregatedIssueCodes() {
    return /* @__PURE__ */ new Set([...this.#aggregatedIssuesByKey.keys(), ...this.#hiddenAggregatedIssuesByKey.keys()]);
  }
  aggregatedIssueCategories() {
    const result = /* @__PURE__ */ new Set();
    for (const issue of this.#aggregatedIssuesByKey.values()) {
      result.add(issue.getCategory());
    }
    return result;
  }
  aggregatedIssueKinds() {
    const result = /* @__PURE__ */ new Set();
    for (const issue of this.#aggregatedIssuesByKey.values()) {
      result.add(issue.getKind());
    }
    return result;
  }
  numberOfAggregatedIssues() {
    return this.#aggregatedIssuesByKey.size;
  }
  numberOfHiddenAggregatedIssues() {
    return this.#hiddenAggregatedIssuesByKey.size;
  }
  keyForIssue(issue) {
    return issue.code();
  }
};
var Events3 = /* @__PURE__ */ ((Events4) => {
  Events4["AGGREGATED_ISSUE_UPDATED"] = "AggregatedIssueUpdated";
  Events4["FULL_UPDATE_REQUIRED"] = "FullUpdateRequired";
  return Events4;
})(Events3 || {});

// ../../front_end/models/issues_manager/IssueResolver.ts
var IssueResolver_exports = {};
__export(IssueResolver_exports, {
  IssueResolver: () => IssueResolver
});
import * as Common6 from "../../core/common/common.js";

// ../../front_end/models/issues_manager/IssuesManager.ts
var IssuesManager_exports = {};
__export(IssuesManager_exports, {
  Events: () => Events,
  IssueStatus: () => IssueStatus,
  IssuesManager: () => IssuesManager,
  createIssuesFromProtocolIssue: () => createIssuesFromProtocolIssue,
  defaultHideIssueByCodeSetting: () => defaultHideIssueByCodeSetting,
  getHideIssueByCodeSetting: () => getHideIssueByCodeSetting,
  isIssueCodeSupported: () => isIssueCodeSupported
});
import * as Common5 from "../../core/common/common.js";
import * as Root from "../../core/root/root.js";
import * as SDK3 from "../../core/sdk/sdk.js";
import * as Bindings2 from "../bindings/bindings.js";
import * as Workspace2 from "../workspace/workspace.js";

// ../../front_end/models/issues_manager/BounceTrackingIssue.ts
import * as i18n41 from "../../core/i18n/i18n.js";
var UIStrings22 = {
  /**
   * @description Title for Bounce Tracking Mitigation explainer URL link.
   */
  bounceTrackingMitigations: "Bounce tracking mitigations"
};
var str_21 = i18n41.i18n.registerUIStrings("models/issues_manager/BounceTrackingIssue.ts", UIStrings22);
var i18nString11 = i18n41.i18n.getLocalizedString.bind(void 0, str_21);
var BounceTrackingIssue = class _BounceTrackingIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(Audits.InspectorIssueCode.BounceTrackingIssue, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    return {
      file: "bounceTrackingMitigations.md",
      links: [
        {
          link: "https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations",
          linkTitle: i18nString11(UIStrings22.bounceTrackingMitigations)
        }
      ]
    };
  }
  getKind() {
    return "BreakingChange" /* BREAKING_CHANGE */;
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  trackingSites() {
    return this.details().trackingSites;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.bounceTrackingIssueDetails;
    if (!details) {
      console.warn("Bounce tracking issue without details received.");
      return [];
    }
    return [new _BounceTrackingIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/PropertyRuleIssue.ts
var PropertyRuleIssue_exports = {};
__export(PropertyRuleIssue_exports, {
  PropertyRuleIssue: () => PropertyRuleIssue
});
var PropertyRuleIssue = class _PropertyRuleIssue extends Issue {
  #primaryKey;
  constructor(issueDetails, issuesModel) {
    const code = JSON.stringify(issueDetails);
    super(code, issueDetails, issuesModel);
    this.#primaryKey = code;
  }
  sources() {
    return [this.details().sourceCodeLocation];
  }
  primaryKey() {
    return this.#primaryKey;
  }
  getPropertyName() {
    switch (this.details().propertyRuleIssueReason) {
      case Audits.PropertyRuleIssueReason.InvalidInherits:
        return "inherits";
      case Audits.PropertyRuleIssueReason.InvalidInitialValue:
        return "initial-value";
      case Audits.PropertyRuleIssueReason.InvalidSyntax:
        return "syntax";
    }
    return "";
  }
  getDescription() {
    if (this.details().propertyRuleIssueReason === Audits.PropertyRuleIssueReason.InvalidName) {
      return {
        file: "propertyRuleInvalidNameIssue.md",
        links: []
      };
    }
    const value = this.details().propertyValue ? `: ${this.details().propertyValue}` : "";
    const property = `${this.getPropertyName()}${value}`;
    return {
      file: "propertyRuleIssue.md",
      substitutions: /* @__PURE__ */ new Map([["PLACEHOLDER_property", property]]),
      links: []
    };
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issueModel, inspectorIssue) {
    const propertyRuleIssueDetails = inspectorIssue.details.propertyRuleIssueDetails;
    if (!propertyRuleIssueDetails) {
      console.warn("Property rule issue without details received");
      return [];
    }
    return [new _PropertyRuleIssue(propertyRuleIssueDetails, issueModel)];
  }
};

// ../../front_end/models/issues_manager/SharedDictionaryIssue.ts
var SharedDictionaryIssue_exports = {};
__export(SharedDictionaryIssue_exports, {
  IssueCode: () => IssueCode2,
  SharedDictionaryIssue: () => SharedDictionaryIssue
});
import * as i18n43 from "../../core/i18n/i18n.js";
var UIStrings23 = {
  /**
   * @description Title for Compression Dictionary Transport specification URL link.
   */
  compressionDictionaryTransport: "Compression Dictionary Transport"
};
var str_22 = i18n43.i18n.registerUIStrings("models/issues_manager/SharedDictionaryIssue.ts", UIStrings23);
var i18nLazyString11 = i18n43.i18n.getLazilyComputedLocalizedString.bind(void 0, str_22);
var IssueCode2 = /* @__PURE__ */ ((IssueCode3) => {
  IssueCode3["USE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST"] = "SharedDictionaryIssue::UseErrorCrossOriginNoCorsRequest";
  IssueCode3["USE_ERROR_DICTIONARY_LOAD_FAILURE"] = "SharedDictionaryIssue::UseErrorDictionaryLoadFailure";
  IssueCode3["USE_ERROR_MATCHING_DICTIONARY_NOT_USED"] = "SharedDictionaryIssue::UseErrorMatchingDictionaryNotUsed";
  IssueCode3["USE_ERROR_UNEXPECTED_CONTENT_DICTIONARY_HEADER"] = "SharedDictionaryIssue::UseErrorUnexpectedContentDictionaryHeader";
  IssueCode3["WRITE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST"] = "SharedDictionaryIssue::WriteErrorCossOriginNoCorsRequest";
  IssueCode3["WRITE_ERROR_DISALLOWED_BY_SETTINGS"] = "SharedDictionaryIssue::WriteErrorDisallowedBySettings";
  IssueCode3["WRITE_ERROR_EXPIRED_RESPONSE"] = "SharedDictionaryIssue::WriteErrorExpiredResponse";
  IssueCode3["WRITE_ERROR_FEATURE_DISABLED"] = "SharedDictionaryIssue::WriteErrorFeatureDisabled";
  IssueCode3["WRITE_ERROR_INSUFFICIENT_RESOURCES"] = "SharedDictionaryIssue::WriteErrorInsufficientResources";
  IssueCode3["WRITE_ERROR_INVALID_MATCH_FIELD"] = "SharedDictionaryIssue::WriteErrorInvalidMatchField";
  IssueCode3["WRITE_ERROR_INVALID_STRUCTURED_HEADER"] = "SharedDictionaryIssue::WriteErrorInvalidStructuredHeader";
  IssueCode3["WRITE_ERROR_INVALID_TTL_FIELD"] = "SharedDictionaryIssue::WriteErrorInvalidTTLField";
  IssueCode3["WRITE_ERROR_NAVIGATION_REQUEST"] = "SharedDictionaryIssue::WriteErrorNavigationRequest";
  IssueCode3["WRITE_ERROR_NO_MATCH_FIELD"] = "SharedDictionaryIssue::WriteErrorNoMatchField";
  IssueCode3["WRITE_ERROR_NON_INTEGER_TTL_FIELD"] = "SharedDictionaryIssue::WriteErrorNonIntegerTTLField";
  IssueCode3["WRITE_ERROR_NON_LIST_MATCH_DEST_FIELD"] = "SharedDictionaryIssue::WriteErrorNonListMatchDestField";
  IssueCode3["WRITE_ERROR_NON_SECURE_CONTEXT"] = "SharedDictionaryIssue::WriteErrorNonSecureContext";
  IssueCode3["WRITE_ERROR_NON_STRING_ID_FIELD"] = "SharedDictionaryIssue::WriteErrorNonStringIdField";
  IssueCode3["WRITE_ERROR_NON_STRING_IN_MATCH_DEST_LIST"] = "SharedDictionaryIssue::WriteErrorNonStringInMatchDestList";
  IssueCode3["WRITE_ERROR_NON_STRING_MATCH_FIELD"] = "SharedDictionaryIssue::WriteErrorNonStringMatchField";
  IssueCode3["WRITE_ERROR_NON_TOKEN_TYPE_FIELD"] = "SharedDictionaryIssue::WriteErrorNonTokenTypeField";
  IssueCode3["WRITE_ERROR_REQUEST_ABORTED"] = "SharedDictionaryIssue::WriteErrorRequestAborted";
  IssueCode3["WRITE_ERROR_SHUTTING_DOWN"] = "SharedDictionaryIssue::WriteErrorShuttingDown";
  IssueCode3["WRITE_ERROR_TOO_LONG_ID_FIELD"] = "SharedDictionaryIssue::WriteErrorTooLongIdField";
  IssueCode3["WRITE_ERROR_UNSUPPORTED_TYPE"] = "SharedDictionaryIssue::WriteErrorUnsupportedType";
  IssueCode3["UNKNOWN"] = "SharedDictionaryIssue::WriteErrorUnknown";
  return IssueCode3;
})(IssueCode2 || {});
function getIssueCode2(details) {
  switch (details.sharedDictionaryError) {
    case Audits.SharedDictionaryError.UseErrorCrossOriginNoCorsRequest:
      return "SharedDictionaryIssue::UseErrorCrossOriginNoCorsRequest" /* USE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST */;
    case Audits.SharedDictionaryError.UseErrorDictionaryLoadFailure:
      return "SharedDictionaryIssue::UseErrorDictionaryLoadFailure" /* USE_ERROR_DICTIONARY_LOAD_FAILURE */;
    case Audits.SharedDictionaryError.UseErrorMatchingDictionaryNotUsed:
      return "SharedDictionaryIssue::UseErrorMatchingDictionaryNotUsed" /* USE_ERROR_MATCHING_DICTIONARY_NOT_USED */;
    case Audits.SharedDictionaryError.UseErrorUnexpectedContentDictionaryHeader:
      return "SharedDictionaryIssue::UseErrorUnexpectedContentDictionaryHeader" /* USE_ERROR_UNEXPECTED_CONTENT_DICTIONARY_HEADER */;
    case Audits.SharedDictionaryError.WriteErrorCossOriginNoCorsRequest:
      return "SharedDictionaryIssue::WriteErrorCossOriginNoCorsRequest" /* WRITE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST */;
    case Audits.SharedDictionaryError.WriteErrorDisallowedBySettings:
      return "SharedDictionaryIssue::WriteErrorDisallowedBySettings" /* WRITE_ERROR_DISALLOWED_BY_SETTINGS */;
    case Audits.SharedDictionaryError.WriteErrorExpiredResponse:
      return "SharedDictionaryIssue::WriteErrorExpiredResponse" /* WRITE_ERROR_EXPIRED_RESPONSE */;
    case Audits.SharedDictionaryError.WriteErrorFeatureDisabled:
      return "SharedDictionaryIssue::WriteErrorFeatureDisabled" /* WRITE_ERROR_FEATURE_DISABLED */;
    case Audits.SharedDictionaryError.WriteErrorInsufficientResources:
      return "SharedDictionaryIssue::WriteErrorInsufficientResources" /* WRITE_ERROR_INSUFFICIENT_RESOURCES */;
    case Audits.SharedDictionaryError.WriteErrorInvalidMatchField:
      return "SharedDictionaryIssue::WriteErrorInvalidMatchField" /* WRITE_ERROR_INVALID_MATCH_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorInvalidStructuredHeader:
      return "SharedDictionaryIssue::WriteErrorInvalidStructuredHeader" /* WRITE_ERROR_INVALID_STRUCTURED_HEADER */;
    case Audits.SharedDictionaryError.WriteErrorInvalidTTLField:
      return "SharedDictionaryIssue::WriteErrorInvalidTTLField" /* WRITE_ERROR_INVALID_TTL_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorNavigationRequest:
      return "SharedDictionaryIssue::WriteErrorNavigationRequest" /* WRITE_ERROR_NAVIGATION_REQUEST */;
    case Audits.SharedDictionaryError.WriteErrorNoMatchField:
      return "SharedDictionaryIssue::WriteErrorNoMatchField" /* WRITE_ERROR_NO_MATCH_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorNonIntegerTTLField:
      return "SharedDictionaryIssue::WriteErrorNonIntegerTTLField" /* WRITE_ERROR_NON_INTEGER_TTL_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorNonListMatchDestField:
      return "SharedDictionaryIssue::WriteErrorNonListMatchDestField" /* WRITE_ERROR_NON_LIST_MATCH_DEST_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorNonSecureContext:
      return "SharedDictionaryIssue::WriteErrorNonSecureContext" /* WRITE_ERROR_NON_SECURE_CONTEXT */;
    case Audits.SharedDictionaryError.WriteErrorNonStringIdField:
      return "SharedDictionaryIssue::WriteErrorNonStringIdField" /* WRITE_ERROR_NON_STRING_ID_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorNonStringInMatchDestList:
      return "SharedDictionaryIssue::WriteErrorNonStringInMatchDestList" /* WRITE_ERROR_NON_STRING_IN_MATCH_DEST_LIST */;
    case Audits.SharedDictionaryError.WriteErrorNonStringMatchField:
      return "SharedDictionaryIssue::WriteErrorNonStringMatchField" /* WRITE_ERROR_NON_STRING_MATCH_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorNonTokenTypeField:
      return "SharedDictionaryIssue::WriteErrorNonTokenTypeField" /* WRITE_ERROR_NON_TOKEN_TYPE_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorRequestAborted:
      return "SharedDictionaryIssue::WriteErrorRequestAborted" /* WRITE_ERROR_REQUEST_ABORTED */;
    case Audits.SharedDictionaryError.WriteErrorShuttingDown:
      return "SharedDictionaryIssue::WriteErrorShuttingDown" /* WRITE_ERROR_SHUTTING_DOWN */;
    case Audits.SharedDictionaryError.WriteErrorTooLongIdField:
      return "SharedDictionaryIssue::WriteErrorTooLongIdField" /* WRITE_ERROR_TOO_LONG_ID_FIELD */;
    case Audits.SharedDictionaryError.WriteErrorUnsupportedType:
      return "SharedDictionaryIssue::WriteErrorUnsupportedType" /* WRITE_ERROR_UNSUPPORTED_TYPE */;
    default:
      return "SharedDictionaryIssue::WriteErrorUnknown" /* UNKNOWN */;
  }
}
var SharedDictionaryIssue = class _SharedDictionaryIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: getIssueCode2(issueDetails),
        umaCode: [
          Audits.InspectorIssueCode.SharedDictionaryIssue,
          issueDetails.sharedDictionaryError
        ].join("::")
      },
      issueDetails,
      issuesModel
    );
  }
  requests() {
    if (this.details().request) {
      return [this.details().request];
    }
    return [];
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getDescription() {
    const description = issueDescriptions10.get(this.details().sharedDictionaryError);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.sharedDictionaryIssueDetails;
    if (!details) {
      console.warn("Shared Dictionary issue without details received.");
      return [];
    }
    return [new _SharedDictionaryIssue(details, issuesModel)];
  }
};
var specLinks = [{
  link: "https://datatracker.ietf.org/doc/draft-ietf-httpbis-compression-dictionary/",
  linkTitle: i18nLazyString11(UIStrings23.compressionDictionaryTransport)
}];
var issueDescriptions10 = /* @__PURE__ */ new Map([
  [
    Audits.SharedDictionaryError.UseErrorCrossOriginNoCorsRequest,
    {
      file: "sharedDictionaryUseErrorCrossOriginNoCorsRequest.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.UseErrorDictionaryLoadFailure,
    {
      file: "sharedDictionaryUseErrorDictionaryLoadFailure.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.UseErrorMatchingDictionaryNotUsed,
    {
      file: "sharedDictionaryUseErrorMatchingDictionaryNotUsed.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.UseErrorUnexpectedContentDictionaryHeader,
    {
      file: "sharedDictionaryUseErrorUnexpectedContentDictionaryHeader.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorCossOriginNoCorsRequest,
    {
      file: "sharedDictionaryWriteErrorCossOriginNoCorsRequest.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorDisallowedBySettings,
    {
      file: "sharedDictionaryWriteErrorDisallowedBySettings.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorExpiredResponse,
    {
      file: "sharedDictionaryWriteErrorExpiredResponse.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorFeatureDisabled,
    {
      file: "sharedDictionaryWriteErrorFeatureDisabled.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorInsufficientResources,
    {
      file: "sharedDictionaryWriteErrorInsufficientResources.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorInvalidMatchField,
    {
      file: "sharedDictionaryWriteErrorInvalidMatchField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorInvalidStructuredHeader,
    {
      file: "sharedDictionaryWriteErrorInvalidStructuredHeader.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorInvalidTTLField,
    {
      file: "sharedDictionaryWriteErrorInvalidTTLField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNavigationRequest,
    {
      file: "sharedDictionaryWriteErrorNavigationRequest.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNoMatchField,
    {
      file: "sharedDictionaryWriteErrorNoMatchField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonIntegerTTLField,
    {
      file: "sharedDictionaryWriteErrorNonIntegerTTLField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonListMatchDestField,
    {
      file: "sharedDictionaryWriteErrorNonListMatchDestField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonSecureContext,
    {
      file: "sharedDictionaryWriteErrorNonSecureContext.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonStringIdField,
    {
      file: "sharedDictionaryWriteErrorNonStringIdField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonStringInMatchDestList,
    {
      file: "sharedDictionaryWriteErrorNonStringInMatchDestList.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonStringMatchField,
    {
      file: "sharedDictionaryWriteErrorNonStringMatchField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorNonTokenTypeField,
    {
      file: "sharedDictionaryWriteErrorNonTokenTypeField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorRequestAborted,
    {
      file: "sharedDictionaryWriteErrorRequestAborted.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorShuttingDown,
    {
      file: "sharedDictionaryWriteErrorShuttingDown.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorTooLongIdField,
    {
      file: "sharedDictionaryWriteErrorTooLongIdField.md",
      links: specLinks
    }
  ],
  [
    Audits.SharedDictionaryError.WriteErrorUnsupportedType,
    {
      file: "sharedDictionaryWriteErrorUnsupportedType.md",
      links: specLinks
    }
  ]
]);

// ../../front_end/models/issues_manager/SourceFrameIssuesManager.ts
var SourceFrameIssuesManager_exports = {};
__export(SourceFrameIssuesManager_exports, {
  IssueMessage: () => IssueMessage,
  SourceFrameIssuesManager: () => SourceFrameIssuesManager
});
import * as Common4 from "../../core/common/common.js";
import * as Bindings from "../bindings/bindings.js";
import * as Workspace from "../workspace/workspace.js";

// ../../front_end/models/issues_manager/StylesheetLoadingIssue.ts
var StylesheetLoadingIssue_exports = {};
__export(StylesheetLoadingIssue_exports, {
  StylesheetLoadingIssue: () => StylesheetLoadingIssue,
  lateImportStylesheetLoadingCode: () => lateImportStylesheetLoadingCode
});
var lateImportStylesheetLoadingCode = [
  Audits.InspectorIssueCode.StylesheetLoadingIssue,
  Audits.StyleSheetLoadingIssueReason.LateImportRule
].join("::");
var StylesheetLoadingIssue = class _StylesheetLoadingIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const code = `${Audits.InspectorIssueCode.StylesheetLoadingIssue}::${issueDetails.styleSheetLoadingIssueReason}`;
    super(code, issueDetails, issuesModel);
  }
  sources() {
    return [this.details().sourceCodeLocation];
  }
  requests() {
    const details = this.details();
    if (!details.failedRequestInfo) {
      return [];
    }
    const { url, requestId } = details.failedRequestInfo;
    if (!requestId) {
      return [];
    }
    return [{ url, requestId }];
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getDescription() {
    switch (this.details().styleSheetLoadingIssueReason) {
      case Audits.StyleSheetLoadingIssueReason.LateImportRule:
        return {
          file: "stylesheetLateImport.md",
          links: []
        };
      case Audits.StyleSheetLoadingIssueReason.RequestFailed:
        return {
          file: "stylesheetRequestFailed.md",
          links: []
        };
    }
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  static fromInspectorIssue(issueModel, inspectorIssue) {
    const stylesheetLoadingDetails = inspectorIssue.details.stylesheetLoadingIssueDetails;
    if (!stylesheetLoadingDetails) {
      console.warn("Stylesheet loading issue without details received");
      return [];
    }
    return [new _StylesheetLoadingIssue(stylesheetLoadingDetails, issueModel)];
  }
};

// ../../front_end/models/issues_manager/SourceFrameIssuesManager.ts
var SourceFrameIssuesManager = class {
  constructor(issuesManager, targetManager, workspace, debuggerWorkspaceBinding, cssWorkspaceBinding) {
    this.issuesManager = issuesManager;
    this.#sourceFrameMessageManager = new Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageManager(
      targetManager,
      workspace,
      debuggerWorkspaceBinding,
      cssWorkspaceBinding
    );
    this.#sourceFrameMessageManager.enable();
    this.issuesManager.addEventListener("IssueAdded" /* ISSUE_ADDED */, this.#onIssueAdded, this);
    this.issuesManager.addEventListener("FullUpdateRequired" /* FULL_UPDATE_REQUIRED */, this.#onFullUpdateRequired, this);
  }
  #sourceFrameMessageManager;
  #onIssueAdded(event) {
    const { issue } = event.data;
    void this.#addIssue(issue);
  }
  async #addIssue(issue) {
    if (!this.#isTrustedTypeIssue(issue) && !this.#isLateImportIssue(issue) && !this.#isPropertyRuleIssue(issue)) {
      return;
    }
    const issuesModel = issue.model();
    if (!issuesModel) {
      return;
    }
    const srcLocation = toZeroBasedLocation(issue.details().sourceCodeLocation);
    const description = issue.getDescription();
    if (!description || !srcLocation) {
      return;
    }
    const messageText = await getIssueTitleFromMarkdownDescription(description);
    if (!messageText) {
      return;
    }
    const clickHandler = () => {
      void Common4.Revealer.reveal(issue);
    };
    this.#sourceFrameMessageManager.addMessage(
      new IssueMessage(messageText, issue.getKind(), clickHandler),
      {
        line: srcLocation.lineNumber,
        column: srcLocation.columnNumber ?? -1,
        url: srcLocation.url,
        scriptId: srcLocation.scriptId
      },
      issuesModel.target()
    );
  }
  #onFullUpdateRequired() {
    this.#resetMessages();
    const issues = this.issuesManager.issues();
    for (const issue of issues) {
      void this.#addIssue(issue);
    }
  }
  #isTrustedTypeIssue(issue) {
    return issue instanceof ContentSecurityPolicyIssue && issue.code() === trustedTypesSinkViolationCode || issue.code() === trustedTypesPolicyViolationCode;
  }
  #isPropertyRuleIssue(issue) {
    return issue instanceof PropertyRuleIssue;
  }
  #isLateImportIssue(issue) {
    return issue.code() === lateImportStylesheetLoadingCode;
  }
  #resetMessages() {
    this.#sourceFrameMessageManager.clear();
  }
};
var IssueMessage = class extends Workspace.UISourceCode.Message {
  #kind;
  constructor(title, kind, clickHandler) {
    super(Workspace.UISourceCode.Message.Level.ISSUE, title, clickHandler);
    this.#kind = kind;
  }
  getIssueKind() {
    return this.#kind;
  }
};

// ../../front_end/models/issues_manager/SRIMessageSignatureIssue.ts
var SRIMessageSignatureIssue_exports = {};
__export(SRIMessageSignatureIssue_exports, {
  SRIMessageSignatureIssue: () => SRIMessageSignatureIssue
});
import * as i18n45 from "../../core/i18n/i18n.js";
var UIStrings24 = {
  /**
   * @description Title for HTTP Message Signatures specification URL.
   */
  httpMessageSignatures: "HTTP Message Signatures (RFC9421)",
  /**
   * @description Title for Signature-based Integrity specification URL.
   */
  signatureBasedIntegrity: "Signature-based Integrity"
};
var str_23 = i18n45.i18n.registerUIStrings("models/issues_manager/SRIMessageSignatureIssue.ts", UIStrings24);
var i18nLazyString12 = i18n45.i18n.getLazilyComputedLocalizedString.bind(void 0, str_23);
function generateGroupingIssueCode(details) {
  const issueCode = `${Audits.InspectorIssueCode.SRIMessageSignatureIssue}::${details.error}`;
  if (details.error === Audits.SRIMessageSignatureError.ValidationFailedSignatureMismatch) {
    return issueCode + details.signatureBase;
  }
  if (details.error === Audits.SRIMessageSignatureError.ValidationFailedIntegrityMismatch) {
    return issueCode + details.integrityAssertions.join();
  }
  return issueCode;
}
var SRIMessageSignatureIssue = class _SRIMessageSignatureIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: generateGroupingIssueCode(issueDetails),
        umaCode: `${Audits.InspectorIssueCode.SRIMessageSignatureIssue}::${issueDetails.error}`
      },
      issueDetails,
      issuesModel
    );
  }
  // Overriding `Issue<String>`:
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getDescription() {
    const details = this.details();
    const description = {
      file: `sri${details.error}.md`,
      links: [
        {
          link: "https://www.rfc-editor.org/rfc/rfc9421.html",
          linkTitle: i18nLazyString12(UIStrings24.httpMessageSignatures)
        },
        {
          link: "https://wicg.github.io/signature-based-sri/",
          linkTitle: i18nLazyString12(UIStrings24.signatureBasedIntegrity)
        }
      ],
      substitutions: /* @__PURE__ */ new Map()
    };
    if (details.error === Audits.SRIMessageSignatureError.ValidationFailedSignatureMismatch) {
      description.substitutions?.set("PLACEHOLDER_signatureBase", () => details.signatureBase);
    }
    if (details.error === Audits.SRIMessageSignatureError.ValidationFailedIntegrityMismatch) {
      description.substitutions?.set("PLACEHOLDER_integrityAssertions", () => {
        const prefix = "\n* ";
        return prefix + this.details().integrityAssertions.join(prefix);
      });
    }
    return resolveLazyDescription(description);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  requests() {
    return this.details().request ? [this.details().request] : [];
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.sriMessageSignatureIssueDetails;
    if (!details) {
      console.warn("SRI Message Signature issue without details received.");
      return [];
    }
    return [new _SRIMessageSignatureIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/UnencodedDigestIssue.ts
var UnencodedDigestIssue_exports = {};
__export(UnencodedDigestIssue_exports, {
  UnencodedDigestIssue: () => UnencodedDigestIssue
});
import * as i18n47 from "../../core/i18n/i18n.js";
var UIStrings25 = {
  /**
   * @description Title for HTTP Unencoded Digest specification URL.
   */
  unencodedDigestHeader: "HTTP Unencoded Digest specification",
  /**
   * @description Title for the URL of the integration of unencoded-digest and SRI.
   */
  integrityIntegration: "Server-initiated integrity checks"
};
var str_24 = i18n47.i18n.registerUIStrings("models/issues_manager/UnencodedDigestIssue.ts", UIStrings25);
var i18nLazyString13 = i18n47.i18n.getLazilyComputedLocalizedString.bind(void 0, str_24);
var UnencodedDigestIssue = class _UnencodedDigestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(
      {
        code: `${Audits.InspectorIssueCode.UnencodedDigestIssue}::${issueDetails.error}`,
        umaCode: `${Audits.InspectorIssueCode.UnencodedDigestIssue}::${issueDetails.error}`
      },
      issueDetails,
      issuesModel
    );
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getDescription() {
    const description = {
      file: `unencodedDigest${this.details().error}.md`,
      links: [
        {
          link: "https://www.ietf.org/archive/id/draft-ietf-httpbis-unencoded-digest-01.html",
          linkTitle: i18nLazyString13(UIStrings25.unencodedDigestHeader)
        },
        {
          link: "https://wicg.github.io/signature-based-sri/#unencoded-digest-validation",
          linkTitle: i18nLazyString13(UIStrings25.integrityIntegration)
        }
      ]
    };
    return resolveLazyDescription(description);
  }
  getCategory() {
    return "Other" /* OTHER */;
  }
  getKind() {
    return "PageError" /* PAGE_ERROR */;
  }
  requests() {
    return this.details().request ? [this.details().request] : [];
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const details = inspectorIssue.details.unencodedDigestIssueDetails;
    if (!details) {
      console.warn("Unencoded-Digest issue without details received.");
      return [];
    }
    return [new _UnencodedDigestIssue(details, issuesModel)];
  }
};

// ../../front_end/models/issues_manager/IssuesManager.ts
function createIssuesForBlockedByResponseIssue(issuesModel, inspectorIssue) {
  const blockedByResponseIssueDetails = inspectorIssue.details.blockedByResponseIssueDetails;
  if (!blockedByResponseIssueDetails) {
    console.warn("BlockedByResponse issue without details received.");
    return [];
  }
  if (isCrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails.reason)) {
    return [new CrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails, issuesModel)];
  }
  return [];
}
var issueCodeHandlers = /* @__PURE__ */ new Map(
  [
    [
      Audits.InspectorIssueCode.CookieIssue,
      CookieIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.MixedContentIssue,
      MixedContentIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.HeavyAdIssue,
      HeavyAdIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
      ContentSecurityPolicyIssue.fromInspectorIssue
    ],
    [Audits.InspectorIssueCode.BlockedByResponseIssue, createIssuesForBlockedByResponseIssue],
    [
      Audits.InspectorIssueCode.SharedArrayBufferIssue,
      SharedArrayBufferIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.SharedDictionaryIssue,
      SharedDictionaryIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.CorsIssue,
      CorsIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.QuirksModeIssue,
      QuirksModeIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.GenericIssue,
      GenericIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.DeprecationIssue,
      DeprecationIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.ClientHintIssue,
      ClientHintIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.EmailVerificationRequestIssue,
      EmailVerificationRequestIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.FederatedAuthRequestIssue,
      FederatedAuthRequestIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.BounceTrackingIssue,
      BounceTrackingIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.StylesheetLoadingIssue,
      StylesheetLoadingIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.PartitioningBlobURLIssue,
      PartitioningBlobURLIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.PropertyRuleIssue,
      PropertyRuleIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.CookieDeprecationMetadataIssue,
      CookieDeprecationMetadataIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.ElementAccessibilityIssue,
      ElementAccessibilityIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.SRIMessageSignatureIssue,
      SRIMessageSignatureIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.UnencodedDigestIssue,
      UnencodedDigestIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.ConnectionAllowlistIssue,
      ConnectionAllowlistIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.PermissionElementIssue,
      PermissionElementIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue,
      SelectivePermissionsInterventionIssue.fromInspectorIssue
    ],
    [
      Audits.InspectorIssueCode.LazyLoadImageIssue,
      LazyLoadImageIssue.fromInspectorIssue
    ]
  ]
);
function isIssueCodeSupported(code) {
  return issueCodeHandlers.has(code);
}
function createIssuesFromProtocolIssue(issuesModel, inspectorIssue, frameManager = SDK3.FrameManager.FrameManager.instance()) {
  const handler = issueCodeHandlers.get(inspectorIssue.code);
  if (handler) {
    return handler(issuesModel, inspectorIssue, frameManager);
  }
  console.warn(`No handler registered for issue code ${inspectorIssue.code}`);
  return [];
}
var IssueStatus = /* @__PURE__ */ ((IssueStatus2) => {
  IssueStatus2["HIDDEN"] = "Hidden";
  IssueStatus2["UNHIDDEN"] = "Unhidden";
  return IssueStatus2;
})(IssueStatus || {});
function defaultHideIssueByCodeSetting() {
  const setting = {};
  return setting;
}
function getHideIssueByCodeSetting(settings = Common5.Settings.Settings.instance()) {
  return settings.createSetting("hide-issue-by-code-setting-experiment-2021", defaultHideIssueByCodeSetting());
}
var IssuesManager = class _IssuesManager extends Common5.ObjectWrapper.ObjectWrapper {
  constructor(showThirdPartyIssuesSetting, hideIssueSetting, frameManager = SDK3.FrameManager.FrameManager.instance(), targetManager = SDK3.TargetManager.TargetManager.instance(), workspace = Workspace2.Workspace.WorkspaceImpl.instance(), debuggerWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
  ), cssWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings2.CSSWorkspaceBinding.CSSWorkspaceBinding.instance()
  )) {
    super();
    this.showThirdPartyIssuesSetting = showThirdPartyIssuesSetting;
    this.hideIssueSetting = hideIssueSetting;
    this.#frameManager = frameManager;
    this.#targetManager = targetManager;
    new SourceFrameIssuesManager(this, targetManager, workspace, debuggerWorkspaceBinding, cssWorkspaceBinding);
    this.#targetManager.observeModels(SDK3.IssuesModel.IssuesModel, this);
    this.#targetManager.addModelListener(
      SDK3.ResourceTreeModel.ResourceTreeModel,
      SDK3.ResourceTreeModel.Events.PrimaryPageChanged,
      this.#onPrimaryPageChanged,
      this
    );
    this.#frameManager.addEventListener(
      SDK3.FrameManager.Events.FRAME_ADDED_TO_TARGET,
      this.#onFrameAddedToTarget,
      this
    );
    this.showThirdPartyIssuesSetting?.addChangeListener(() => this.#updateFilteredIssues());
    this.hideIssueSetting?.addChangeListener(() => this.#updateFilteredIssues());
    this.#targetManager.observeTargets(
      {
        targetAdded: (target) => {
          if (target.outermostTarget() === target) {
            this.#updateFilteredIssues();
          }
        },
        targetRemoved: (_) => {
        }
      },
      { scoped: true }
    );
  }
  #eventListeners = /* @__PURE__ */ new WeakMap();
  #allIssues = /* @__PURE__ */ new Map();
  #filteredIssues = /* @__PURE__ */ new Map();
  #issueCounts = /* @__PURE__ */ new Map();
  #hiddenIssueCount = /* @__PURE__ */ new Map();
  #thirdPartyCookiePhaseoutIssueCount = /* @__PURE__ */ new Map();
  #issuesById = /* @__PURE__ */ new Map();
  #issuesByOutermostTarget = /* @__PURE__ */ new Map();
  #frameManager;
  #targetManager;
  static instance(opts = {
    forceNew: false,
    ensureFirst: false
  }) {
    if (Root.DevToolsContext.globalInstance().has(_IssuesManager) && opts.ensureFirst) {
      throw new Error(
        'IssuesManager was already created. Either set "ensureFirst" to false or make sure that this invocation is really the first one.'
      );
    }
    if (!Root.DevToolsContext.globalInstance().has(_IssuesManager) || opts.forceNew) {
      Root.DevToolsContext.globalInstance().set(
        _IssuesManager,
        new _IssuesManager(opts.showThirdPartyIssuesSetting, opts.hideIssueSetting, opts.frameManager)
      );
    }
    return Root.DevToolsContext.globalInstance().get(_IssuesManager);
  }
  static removeInstance() {
    Root.DevToolsContext.globalInstance().delete(_IssuesManager);
  }
  #onPrimaryPageChanged(event) {
    const { frame, type } = event.data;
    const keptIssues = /* @__PURE__ */ new Map();
    for (const [key, issue] of this.#allIssues.entries()) {
      if (issue.isAssociatedWithRequestId(frame.loaderId)) {
        keptIssues.set(key, issue);
      } else if (type === SDK3.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION && frame.resourceTreeModel().target() === issue.model()?.target()) {
        keptIssues.set(key, issue);
      } else if (issue.code() === Audits.InspectorIssueCode.BounceTrackingIssue || issue.code() === Audits.InspectorIssueCode.CookieIssue) {
        const networkManager = frame.resourceTreeModel().target().model(SDK3.NetworkManager.NetworkManager);
        if (networkManager?.requestForLoaderId(frame.loaderId)?.hasUserGesture() === false) {
          keptIssues.set(key, issue);
        }
      }
    }
    this.#allIssues = keptIssues;
    this.#updateFilteredIssues();
  }
  #onFrameAddedToTarget(event) {
    const { frame } = event.data;
    if (frame.isOutermostFrame() && this.#targetManager.isInScope(frame.resourceTreeModel())) {
      this.#updateFilteredIssues();
    }
  }
  modelAdded(issuesModel) {
    const listener = issuesModel.addEventListener(SDK3.IssuesModel.Events.ISSUE_ADDED, this.#onIssueAddedEvent, this);
    this.#eventListeners.set(issuesModel, listener);
  }
  modelRemoved(issuesModel) {
    const listener = this.#eventListeners.get(issuesModel);
    if (listener) {
      Common5.EventTarget.removeEventListeners([listener]);
    }
  }
  #onIssueAddedEvent(event) {
    const { issuesModel, inspectorIssue } = event.data;
    const issues = createIssuesFromProtocolIssue(issuesModel, inspectorIssue, this.#frameManager);
    for (const issue of issues) {
      this.addIssue(issuesModel, issue);
      const message = issue.maybeCreateConsoleMessage();
      if (!message) {
        continue;
      }
      issuesModel.target().model(SDK3.ConsoleModel.ConsoleModel)?.addMessage(message);
    }
  }
  addIssue(issuesModel, issue) {
    if (!issue.getDescription()) {
      return;
    }
    const primaryKey = issue.primaryKey();
    if (this.#allIssues.has(primaryKey)) {
      return;
    }
    this.#allIssues.set(primaryKey, issue);
    const outermostTarget = issuesModel.target().outermostTarget();
    if (outermostTarget) {
      let issuesForTarget = this.#issuesByOutermostTarget.get(outermostTarget);
      if (!issuesForTarget) {
        issuesForTarget = /* @__PURE__ */ new Set();
        this.#issuesByOutermostTarget.set(outermostTarget, issuesForTarget);
      }
      issuesForTarget.add(issue);
    }
    if (this.#issueFilter(issue)) {
      this.#filteredIssues.set(primaryKey, issue);
      this.#issueCounts.set(issue.getKind(), 1 + (this.#issueCounts.get(issue.getKind()) || 0));
      const issueId = issue.getIssueId();
      if (issueId) {
        this.#issuesById.set(issueId, issue);
      }
      const values = this.hideIssueSetting?.get();
      this.#updateIssueHiddenStatus(issue, values);
      if (CookieIssue.isThirdPartyCookiePhaseoutRelatedIssue(issue)) {
        this.#thirdPartyCookiePhaseoutIssueCount.set(
          issue.getKind(),
          1 + (this.#thirdPartyCookiePhaseoutIssueCount.get(issue.getKind()) || 0)
        );
      } else if (issue.isHidden()) {
        this.#hiddenIssueCount.set(issue.getKind(), 1 + (this.#hiddenIssueCount.get(issue.getKind()) || 0));
      }
      this.dispatchEventToListeners("IssueAdded" /* ISSUE_ADDED */, { issuesModel, issue });
    }
    this.dispatchEventToListeners("IssuesCountUpdated" /* ISSUES_COUNT_UPDATED */);
  }
  issues() {
    return this.#filteredIssues.values();
  }
  numberOfIssues(kind) {
    if (kind) {
      return (this.#issueCounts.get(kind) ?? 0) - this.numberOfHiddenIssues(kind) - this.numberOfThirdPartyCookiePhaseoutIssues(kind);
    }
    return this.#filteredIssues.size - this.numberOfHiddenIssues() - this.numberOfThirdPartyCookiePhaseoutIssues();
  }
  numberOfHiddenIssues(kind) {
    if (kind) {
      return this.#hiddenIssueCount.get(kind) ?? 0;
    }
    let count = 0;
    for (const num of this.#hiddenIssueCount.values()) {
      count += num;
    }
    return count;
  }
  numberOfThirdPartyCookiePhaseoutIssues(kind) {
    if (kind) {
      return this.#thirdPartyCookiePhaseoutIssueCount.get(kind) ?? 0;
    }
    let count = 0;
    for (const num of this.#thirdPartyCookiePhaseoutIssueCount.values()) {
      count += num;
    }
    return count;
  }
  numberOfAllStoredIssues() {
    return this.#allIssues.size;
  }
  #issueFilter(issue) {
    const scopeTarget = this.#targetManager.scopeTarget();
    if (!scopeTarget) {
      return false;
    }
    if (!this.#issuesByOutermostTarget.get(scopeTarget)?.has(issue)) {
      return false;
    }
    return this.showThirdPartyIssuesSetting?.get() || !issue.isCausedByThirdParty();
  }
  #updateIssueHiddenStatus(issue, values) {
    const code = issue.code();
    if (values?.[code]) {
      const isHidden = values[code] === "Hidden" /* HIDDEN */;
      if (issue.isHidden() !== isHidden) {
        issue.setHidden(isHidden);
        this.dispatchEventToListeners("IssueHiddenStatusUpdated" /* ISSUE_HIDDEN_STATUS_UPDATED */, { issue });
      }
    }
  }
  #updateFilteredIssues() {
    this.#filteredIssues.clear();
    this.#issueCounts.clear();
    this.#issuesById.clear();
    this.#hiddenIssueCount.clear();
    this.#thirdPartyCookiePhaseoutIssueCount.clear();
    const values = this.hideIssueSetting?.get();
    for (const [key, issue] of this.#allIssues) {
      if (this.#issueFilter(issue)) {
        this.#updateIssueHiddenStatus(issue, values);
        this.#filteredIssues.set(key, issue);
        this.#issueCounts.set(issue.getKind(), 1 + (this.#issueCounts.get(issue.getKind()) ?? 0));
        if (issue.isHidden()) {
          this.#hiddenIssueCount.set(issue.getKind(), 1 + (this.#hiddenIssueCount.get(issue.getKind()) || 0));
        }
        const issueId = issue.getIssueId();
        if (issueId) {
          this.#issuesById.set(issueId, issue);
        }
      }
    }
    this.dispatchEventToListeners("FullUpdateRequired" /* FULL_UPDATE_REQUIRED */);
    this.dispatchEventToListeners("IssuesCountUpdated" /* ISSUES_COUNT_UPDATED */);
  }
  unhideAllIssues() {
    for (const issue of this.#allIssues.values()) {
      if (issue.isHidden()) {
        issue.setHidden(false);
        this.dispatchEventToListeners("IssueHiddenStatusUpdated" /* ISSUE_HIDDEN_STATUS_UPDATED */, { issue });
      }
    }
    this.hideIssueSetting?.set(defaultHideIssueByCodeSetting());
  }
  getIssueById(id) {
    return this.#issuesById.get(id);
  }
};
globalThis.addIssueForTest = (issue) => {
  const mainTarget = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
  const issuesModel = mainTarget?.model(SDK3.IssuesModel.IssuesModel);
  issuesModel?.issueAdded({ issue });
};

// ../../front_end/models/issues_manager/IssueResolver.ts
var IssueResolver = class extends Common6.ResolverBase.ResolverBase {
  #issuesListener = null;
  #issuesManager;
  constructor(issuesManager) {
    super();
    this.#issuesManager = issuesManager;
  }
  getForId(id) {
    return this.#issuesManager.getIssueById(id) || null;
  }
  #onIssueAdded(event) {
    const { issue } = event.data;
    const id = issue.getIssueId();
    if (id) {
      this.onResolve(id, issue);
    }
  }
  startListening() {
    if (this.#issuesListener) {
      return;
    }
    this.#issuesListener = this.#issuesManager.addEventListener("IssueAdded" /* ISSUE_ADDED */, this.#onIssueAdded, this);
  }
  stopListening() {
    if (!this.#issuesListener) {
      return;
    }
    Common6.EventTarget.removeEventListeners([this.#issuesListener]);
    this.#issuesListener = null;
  }
};

// ../../front_end/models/issues_manager/RelatedIssue.ts
var RelatedIssue_exports = {};
__export(RelatedIssue_exports, {
  hasIssueOfCategory: () => hasIssueOfCategory,
  hasIssues: () => hasIssues,
  issuesAssociatedWith: () => issuesAssociatedWith,
  reveal: () => reveal
});
import * as Common7 from "../../core/common/common.js";
import * as SDK4 from "../../core/sdk/sdk.js";
function issuesAssociatedWithNetworkRequest(issues, request) {
  return issues.filter((issue) => {
    for (const affectedRequest of issue.requests()) {
      if (affectedRequest.requestId === request.requestId()) {
        return true;
      }
    }
    return false;
  });
}
function issuesAssociatedWithCookie(issues, domain, name, path) {
  return issues.filter((issue) => {
    for (const cookie of issue.cookies()) {
      if (cookie.domain === domain && cookie.name === name && cookie.path === path) {
        return true;
      }
    }
    return false;
  });
}
function issuesAssociatedWith(issues, obj) {
  if (obj instanceof SDK4.NetworkRequest.NetworkRequest) {
    return issuesAssociatedWithNetworkRequest(issues, obj);
  }
  if (obj instanceof SDK4.Cookie.Cookie) {
    return issuesAssociatedWithCookie(issues, obj.domain(), obj.name(), obj.path());
  }
  throw new Error(`issues can not be associated with ${JSON.stringify(obj)}`);
}
function hasIssues(obj, issuesManager) {
  const issues = Array.from(issuesManager.issues());
  return issuesAssociatedWith(issues, obj).length > 0;
}
function hasIssueOfCategory(obj, category, issuesManager) {
  const issues = Array.from(issuesManager.issues());
  return issuesAssociatedWith(issues, obj).some((issue) => issue.getCategory() === category);
}
async function reveal(obj, issuesManager, category) {
  if (typeof obj === "string") {
    const issue = issuesManager.getIssueById(obj);
    if (issue) {
      return await Common7.Revealer.reveal(issue);
    }
  }
  const issues = Array.from(issuesManager.issues());
  const candidates = issuesAssociatedWith(issues, obj).filter((issue) => !category || issue.getCategory() === category);
  if (candidates.length > 0) {
    return await Common7.Revealer.reveal(candidates[0]);
  }
}
export {
  ClientHintIssue_exports as ClientHintIssue,
  ConnectionAllowlistIssue_exports as ConnectionAllowlistIssue,
  ContentSecurityPolicyIssue_exports as ContentSecurityPolicyIssue,
  CookieDeprecationMetadataIssue_exports as CookieDeprecationMetadataIssue,
  CookieIssue_exports as CookieIssue,
  CorsIssue_exports as CorsIssue,
  CrossOriginEmbedderPolicyIssue_exports as CrossOriginEmbedderPolicyIssue,
  DOMIssuesManager_exports as DOMIssuesManager,
  DeprecationIssue_exports as DeprecationIssue,
  ElementAccessibilityIssue_exports as ElementAccessibilityIssue,
  EmailVerificationRequestIssue_exports as EmailVerificationRequestIssue,
  FederatedAuthRequestIssue_exports as FederatedAuthRequestIssue,
  FederatedAuthUserInfoRequestIssue_exports as FederatedAuthUserInfoRequestIssue,
  GenericIssue_exports as GenericIssue,
  HeavyAdIssue_exports as HeavyAdIssue,
  Issue_exports as Issue,
  IssueAggregator_exports as IssueAggregator,
  IssueResolver_exports as IssueResolver,
  IssuesManager_exports as IssuesManager,
  LazyLoadImageIssue_exports as LazyLoadImageIssue,
  MarkdownIssueDescription_exports as MarkdownIssueDescription,
  MixedContentIssue_exports as MixedContentIssue,
  PartitioningBlobURLIssue_exports as PartitioningBlobURLIssue,
  PermissionElementIssue_exports as PermissionElementIssue,
  PropertyRuleIssue_exports as PropertyRuleIssue,
  QuirksModeIssue_exports as QuirksModeIssue,
  RelatedIssue_exports as RelatedIssue,
  SRIMessageSignatureIssue_exports as SRIMessageSignatureIssue,
  SelectivePermissionsInterventionIssue_exports as SelectivePermissionsInterventionIssue,
  SharedArrayBufferIssue_exports as SharedArrayBufferIssue,
  SharedDictionaryIssue_exports as SharedDictionaryIssue,
  SourceFrameIssuesManager_exports as SourceFrameIssuesManager,
  StylesheetLoadingIssue_exports as StylesheetLoadingIssue,
  UnencodedDigestIssue_exports as UnencodedDigestIssue
};
//# sourceMappingURL=issues_manager.js.map
