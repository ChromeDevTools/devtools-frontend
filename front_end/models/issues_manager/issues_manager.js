var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/issues_manager/AttributionReportingIssue.js
var AttributionReportingIssue_exports = {};
__export(AttributionReportingIssue_exports, {
  AttributionReportingIssue: () => AttributionReportingIssue
});

// gen/front_end/models/issues_manager/Issue.js
var Issue_exports = {};
__export(Issue_exports, {
  Issue: () => Issue,
  getIssueKindDescription: () => getIssueKindDescription,
  getIssueKindName: () => getIssueKindName,
  getShowThirdPartyIssuesSetting: () => getShowThirdPartyIssuesSetting,
  toZeroBasedLocation: () => toZeroBasedLocation,
  unionIssueKind: () => unionIssueKind
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description The kind of an issue (plural) (Issues are categorized into kinds).
   */
  improvements: "Improvements",
  /**
   * @description The kind of an issue (plural) (Issues are categorized into kinds).
   */
  pageErrors: "Page Errors",
  /**
   * @description The kind of an issue (plural) (Issues are categorized into kinds).
   */
  breakingChanges: "Breaking Changes",
  /**
   * @description A description for a kind of issue we display in the issues tab.
   */
  pageErrorIssue: "A page error issue: the page is not working correctly",
  /**
   * @description A description for a kind of issue we display in the issues tab.
   */
  breakingChangeIssue: "A breaking change issue: the page may stop working in an upcoming version of Chrome",
  /**
   * @description A description for a kind of issue we display in the issues tab.
   */
  improvementIssue: "An improvement issue: there is an opportunity to improve the page"
};
var str_ = i18n.i18n.registerUIStrings("models/issues_manager/Issue.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function getIssueKindName(issueKind) {
  switch (issueKind) {
    case "BreakingChange":
      return i18nString(UIStrings.breakingChanges);
    case "Improvement":
      return i18nString(UIStrings.improvements);
    case "PageError":
      return i18nString(UIStrings.pageErrors);
  }
}
function getIssueKindDescription(issueKind) {
  switch (issueKind) {
    case "PageError":
      return i18nString(UIStrings.pageErrorIssue);
    case "BreakingChange":
      return i18nString(UIStrings.breakingChangeIssue);
    case "Improvement":
      return i18nString(UIStrings.improvementIssue);
  }
}
function unionIssueKind(a, b) {
  if (a === "PageError" || b === "PageError") {
    return "PageError";
  }
  if (a === "BreakingChange" || b === "BreakingChange") {
    return "BreakingChange";
  }
  return "Improvement";
}
function getShowThirdPartyIssuesSetting() {
  return Common.Settings.Settings.instance().createSetting("show-third-party-issues", true);
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

// gen/front_end/models/issues_manager/AttributionReportingIssue.js
function getIssueCode(details) {
  switch (details.violationType) {
    case "PermissionPolicyDisabled":
      return "AttributionReportingIssue::PermissionPolicyDisabled";
    case "UntrustworthyReportingOrigin":
      return "AttributionReportingIssue::UntrustworthyReportingOrigin";
    case "InsecureContext":
      return "AttributionReportingIssue::InsecureContext";
    case "InvalidHeader":
      return "AttributionReportingIssue::InvalidRegisterSourceHeader";
    case "InvalidRegisterTriggerHeader":
      return "AttributionReportingIssue::InvalidRegisterTriggerHeader";
    case "SourceAndTriggerHeaders":
      return "AttributionReportingIssue::SourceAndTriggerHeaders";
    case "SourceIgnored":
      return "AttributionReportingIssue::SourceIgnored";
    case "TriggerIgnored":
      return "AttributionReportingIssue::TriggerIgnored";
    case "OsSourceIgnored":
      return "AttributionReportingIssue::OsSourceIgnored";
    case "OsTriggerIgnored":
      return "AttributionReportingIssue::OsTriggerIgnored";
    case "InvalidRegisterOsSourceHeader":
      return "AttributionReportingIssue::InvalidRegisterOsSourceHeader";
    case "InvalidRegisterOsTriggerHeader":
      return "AttributionReportingIssue::InvalidRegisterOsTriggerHeader";
    case "WebAndOsHeaders":
      return "AttributionReportingIssue::WebAndOsHeaders";
    case "NoWebOrOsSupport":
      return "AttributionReportingIssue::NoWebOrOsSupport";
    case "NavigationRegistrationWithoutTransientUserActivation":
      return "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation";
    case "InvalidInfoHeader":
      return "AttributionReportingIssue::InvalidInfoHeader";
    case "NoRegisterSourceHeader":
      return "AttributionReportingIssue::NoRegisterSourceHeader";
    case "NoRegisterTriggerHeader":
      return "AttributionReportingIssue::NoRegisterTriggerHeader";
    case "NoRegisterOsSourceHeader":
      return "AttributionReportingIssue::NoRegisterOsSourceHeader";
    case "NoRegisterOsTriggerHeader":
      return "AttributionReportingIssue::NoRegisterOsTriggerHeader";
    case "NavigationRegistrationUniqueScopeAlreadySet":
      return "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet";
    default:
      return "AttributionReportingIssue::Unknown";
  }
}
var structuredHeaderLink = {
  link: "https://tools.ietf.org/id/draft-ietf-httpbis-header-structure-15.html#rfc.section.4.2.2",
  linkTitle: "Structured Headers RFC"
};
var AttributionReportingIssue = class _AttributionReportingIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super(getIssueCode(issueDetails), issueDetails, issuesModel);
  }
  getCategory() {
    return "AttributionReporting";
  }
  getHeaderValidatorLink(name) {
    const url = new URL("https://wicg.github.io/attribution-reporting-api/validate-headers");
    url.searchParams.set("header", name);
    const details = this.details();
    if (details.invalidParameter) {
      url.searchParams.set("json", details.invalidParameter);
    }
    return {
      link: url.toString(),
      linkTitle: "Header Validator"
    };
  }
  getDescription() {
    switch (this.code()) {
      case "AttributionReportingIssue::PermissionPolicyDisabled":
        return {
          file: "arPermissionPolicyDisabled.md",
          links: []
        };
      case "AttributionReportingIssue::UntrustworthyReportingOrigin":
        return {
          file: "arUntrustworthyReportingOrigin.md",
          links: []
        };
      case "AttributionReportingIssue::InsecureContext":
        return {
          file: "arInsecureContext.md",
          links: []
        };
      case "AttributionReportingIssue::InvalidRegisterSourceHeader":
        return {
          file: "arInvalidRegisterSourceHeader.md",
          links: [this.getHeaderValidatorLink("source")]
        };
      case "AttributionReportingIssue::InvalidRegisterTriggerHeader":
        return {
          file: "arInvalidRegisterTriggerHeader.md",
          links: [this.getHeaderValidatorLink("trigger")]
        };
      case "AttributionReportingIssue::InvalidRegisterOsSourceHeader":
        return {
          file: "arInvalidRegisterOsSourceHeader.md",
          links: [this.getHeaderValidatorLink("os-source")]
        };
      case "AttributionReportingIssue::InvalidRegisterOsTriggerHeader":
        return {
          file: "arInvalidRegisterOsTriggerHeader.md",
          links: [this.getHeaderValidatorLink("os-trigger")]
        };
      case "AttributionReportingIssue::SourceAndTriggerHeaders":
        return {
          file: "arSourceAndTriggerHeaders.md",
          links: []
        };
      case "AttributionReportingIssue::WebAndOsHeaders":
        return {
          file: "arWebAndOsHeaders.md",
          links: []
        };
      case "AttributionReportingIssue::SourceIgnored":
        return {
          file: "arSourceIgnored.md",
          links: [structuredHeaderLink]
        };
      case "AttributionReportingIssue::TriggerIgnored":
        return {
          file: "arTriggerIgnored.md",
          links: [structuredHeaderLink]
        };
      case "AttributionReportingIssue::OsSourceIgnored":
        return {
          file: "arOsSourceIgnored.md",
          links: [structuredHeaderLink]
        };
      case "AttributionReportingIssue::OsTriggerIgnored":
        return {
          file: "arOsTriggerIgnored.md",
          links: [structuredHeaderLink]
        };
      case "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation":
        return {
          file: "arNavigationRegistrationWithoutTransientUserActivation.md",
          links: []
        };
      case "AttributionReportingIssue::NoWebOrOsSupport":
        return {
          file: "arNoWebOrOsSupport.md",
          links: []
        };
      case "AttributionReportingIssue::InvalidInfoHeader":
        return {
          file: "arInvalidInfoHeader.md",
          links: []
        };
      case "AttributionReportingIssue::NoRegisterSourceHeader":
        return {
          file: "arNoRegisterSourceHeader.md",
          links: []
        };
      case "AttributionReportingIssue::NoRegisterTriggerHeader":
        return {
          file: "arNoRegisterTriggerHeader.md",
          links: []
        };
      case "AttributionReportingIssue::NoRegisterOsSourceHeader":
        return {
          file: "arNoRegisterOsSourceHeader.md",
          links: []
        };
      case "AttributionReportingIssue::NoRegisterOsTriggerHeader":
        return {
          file: "arNoRegisterOsTriggerHeader.md",
          links: []
        };
      case "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet":
        return {
          file: "arNavigationRegistrationUniqueScopeAlreadySet.md",
          links: []
        };
      case "AttributionReportingIssue::Unknown":
        return null;
    }
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError";
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const { attributionReportingIssueDetails } = inspectorIssue.details;
    if (!attributionReportingIssueDetails) {
      console.warn("Attribution Reporting issue without details received.");
      return [];
    }
    return [new _AttributionReportingIssue(attributionReportingIssueDetails, issuesModel)];
  }
};

// gen/front_end/models/issues_manager/CheckFormsIssuesTrigger.js
var CheckFormsIssuesTrigger_exports = {};
__export(CheckFormsIssuesTrigger_exports, {
  CheckFormsIssuesTrigger: () => CheckFormsIssuesTrigger
});
import * as SDK from "./../../core/sdk/sdk.js";
var checkFormsIssuesTriggerInstance = null;
var CheckFormsIssuesTrigger = class _CheckFormsIssuesTrigger {
  constructor() {
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.#pageLoaded, this, { scoped: true });
    for (const model of SDK.TargetManager.TargetManager.instance().models(SDK.ResourceTreeModel.ResourceTreeModel)) {
      if (model.target().outermostTarget() !== model.target()) {
        continue;
      }
      this.#checkFormsIssues(model);
    }
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!checkFormsIssuesTriggerInstance || forceNew) {
      checkFormsIssuesTriggerInstance = new _CheckFormsIssuesTrigger();
    }
    return checkFormsIssuesTriggerInstance;
  }
  // TODO(crbug.com/1399414): Handle response by dropping current issues in favor of new ones.
  #checkFormsIssues(resourceTreeModel) {
    void resourceTreeModel.target().auditsAgent().invoke_checkFormsIssues();
  }
  #pageLoaded(event) {
    const { resourceTreeModel } = event.data;
    this.#checkFormsIssues(resourceTreeModel);
  }
};

// gen/front_end/models/issues_manager/ClientHintIssue.js
var ClientHintIssue_exports = {};
__export(ClientHintIssue_exports, {
  ClientHintIssue: () => ClientHintIssue
});
import * as i18n3 from "./../../core/i18n/i18n.js";

// gen/front_end/models/issues_manager/MarkdownIssueDescription.js
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
import * as Marked from "./../../third_party/marked/marked.js";
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
    throw new Error(`Markdown file ${url.toString()} not found. Make sure it is correctly listed in the relevant BUILD.gn files.`);
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

// gen/front_end/models/issues_manager/ClientHintIssue.js
var UIStrings2 = {
  /**
   * @description Title for Client Hint specification url link
   */
  clientHintsInfrastructure: "Client Hints Infrastructure"
};
var str_2 = i18n3.i18n.registerUIStrings("models/issues_manager/ClientHintIssue.ts", UIStrings2);
var i18nLazyString = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var ClientHintIssue = class _ClientHintIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super({
      code: "ClientHintIssue",
      umaCode: ["ClientHintIssue", issueDetails.clientHintIssueReason].join("::")
    }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
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
    return "BreakingChange";
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
    "MetaTagAllowListInvalidOrigin",
    {
      file: "clientHintMetaTagAllowListInvalidOrigin.md",
      links: [{
        link: "https://wicg.github.io/client-hints-infrastructure/",
        linkTitle: i18nLazyString(UIStrings2.clientHintsInfrastructure)
      }]
    }
  ],
  [
    "MetaTagModifiedHTML",
    {
      file: "clientHintMetaTagModifiedHTML.md",
      links: [{
        link: "https://wicg.github.io/client-hints-infrastructure/",
        linkTitle: i18nLazyString(UIStrings2.clientHintsInfrastructure)
      }]
    }
  ]
]);

// gen/front_end/models/issues_manager/ContentSecurityPolicyIssue.js
var ContentSecurityPolicyIssue_exports = {};
__export(ContentSecurityPolicyIssue_exports, {
  ContentSecurityPolicyIssue: () => ContentSecurityPolicyIssue,
  evalViolationCode: () => evalViolationCode,
  inlineViolationCode: () => inlineViolationCode,
  trustedTypesPolicyViolationCode: () => trustedTypesPolicyViolationCode,
  trustedTypesSinkViolationCode: () => trustedTypesSinkViolationCode,
  urlViolationCode: () => urlViolationCode
});
import * as i18n5 from "./../../core/i18n/i18n.js";
var UIStrings3 = {
  /**
   * @description Title for CSP url link
   */
  contentSecurityPolicySource: "Content Security Policy - Source Allowlists",
  /**
   * @description Title for CSP inline issue link
   */
  contentSecurityPolicyInlineCode: "Content Security Policy - Inline Code",
  /**
   * @description Title for the CSP eval link
   */
  contentSecurityPolicyEval: "Content Security Policy - Eval",
  /**
   * @description Title for Trusted Types policy violation issue link. https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
   */
  trustedTypesFixViolations: "Trusted Types - Fix violations",
  /**
   * @description Title for Trusted Types policy violation issue link. https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
   */
  trustedTypesPolicyViolation: "Trusted Types - Policy violation"
};
var str_3 = i18n5.i18n.registerUIStrings("models/issues_manager/ContentSecurityPolicyIssue.ts", UIStrings3);
var i18nLazyString2 = i18n5.i18n.getLazilyComputedLocalizedString.bind(void 0, str_3);
var ContentSecurityPolicyIssue = class _ContentSecurityPolicyIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    const issueCode = [
      "ContentSecurityPolicyIssue",
      issueDetails.contentSecurityPolicyViolationType
    ].join("::");
    super(issueCode, issueDetails, issuesModel, issueId);
  }
  getCategory() {
    return "ContentSecurityPolicy";
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
      return "Improvement";
    }
    return "PageError";
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
    linkTitle: i18nLazyString2(UIStrings3.contentSecurityPolicySource)
  }]
};
var cspInlineViolation = {
  file: "cspInlineViolation.md",
  links: [{
    link: "https://developers.google.com/web/fundamentals/security/csp#inline_code_is_considered_harmful",
    linkTitle: i18nLazyString2(UIStrings3.contentSecurityPolicyInlineCode)
  }]
};
var cspEvalViolation = {
  file: "cspEvalViolation.md",
  links: [{
    link: "https://developers.google.com/web/fundamentals/security/csp#eval_too",
    linkTitle: i18nLazyString2(UIStrings3.contentSecurityPolicyEval)
  }]
};
var cspTrustedTypesSinkViolation = {
  file: "cspTrustedTypesSinkViolation.md",
  links: [{
    link: "https://web.dev/trusted-types/#fix-the-violations",
    linkTitle: i18nLazyString2(UIStrings3.trustedTypesFixViolations)
  }]
};
var cspTrustedTypesPolicyViolation = {
  file: "cspTrustedTypesPolicyViolation.md",
  links: [{ link: "https://web.dev/trusted-types/", linkTitle: i18nLazyString2(UIStrings3.trustedTypesPolicyViolation) }]
};
var urlViolationCode = [
  "ContentSecurityPolicyIssue",
  "kURLViolation"
].join("::");
var inlineViolationCode = [
  "ContentSecurityPolicyIssue",
  "kInlineViolation"
].join("::");
var evalViolationCode = [
  "ContentSecurityPolicyIssue",
  "kEvalViolation"
].join("::");
var trustedTypesSinkViolationCode = [
  "ContentSecurityPolicyIssue",
  "kTrustedTypesSinkViolation"
].join("::");
var trustedTypesPolicyViolationCode = [
  "ContentSecurityPolicyIssue",
  "kTrustedTypesPolicyViolation"
].join("::");
var issueDescriptions2 = /* @__PURE__ */ new Map([
  ["kURLViolation", cspURLViolation],
  ["kInlineViolation", cspInlineViolation],
  ["kEvalViolation", cspEvalViolation],
  ["kTrustedTypesSinkViolation", cspTrustedTypesSinkViolation],
  ["kTrustedTypesPolicyViolation", cspTrustedTypesPolicyViolation]
]);

// gen/front_end/models/issues_manager/ContrastCheckTrigger.js
var ContrastCheckTrigger_exports = {};
__export(ContrastCheckTrigger_exports, {
  ContrastCheckTrigger: () => ContrastCheckTrigger
});
import * as Common2 from "./../../core/common/common.js";
import * as Root from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
var contrastCheckTriggerInstance = null;
var ContrastCheckTrigger = class _ContrastCheckTrigger {
  #pageLoadListeners = /* @__PURE__ */ new WeakMap();
  #frameAddedListeners = /* @__PURE__ */ new WeakMap();
  constructor() {
    SDK2.TargetManager.TargetManager.instance().observeModels(SDK2.ResourceTreeModel.ResourceTreeModel, this);
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!contrastCheckTriggerInstance || forceNew) {
      contrastCheckTriggerInstance = new _ContrastCheckTrigger();
    }
    return contrastCheckTriggerInstance;
  }
  async modelAdded(resourceTreeModel) {
    this.#pageLoadListeners.set(resourceTreeModel, resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.Load, this.#pageLoaded, this));
    this.#frameAddedListeners.set(resourceTreeModel, resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.FrameAdded, this.#frameAdded, this));
  }
  modelRemoved(resourceTreeModel) {
    const pageLoadListener = this.#pageLoadListeners.get(resourceTreeModel);
    if (pageLoadListener) {
      Common2.EventTarget.removeEventListeners([pageLoadListener]);
    }
    const frameAddedListeners = this.#frameAddedListeners.get(resourceTreeModel);
    if (frameAddedListeners) {
      Common2.EventTarget.removeEventListeners([frameAddedListeners]);
    }
  }
  #checkContrast(resourceTreeModel) {
    if (!Root.Runtime.experiments.isEnabled("contrast-issues")) {
      return;
    }
    void resourceTreeModel.target().auditsAgent().invoke_checkContrast({});
  }
  #pageLoaded(event) {
    const { resourceTreeModel } = event.data;
    this.#checkContrast(resourceTreeModel);
  }
  async #frameAdded(event) {
    if (!Root.Runtime.experiments.isEnabled("contrast-issues")) {
      return;
    }
    const frame = event.data;
    if (!frame.isMainFrame()) {
      return;
    }
    const response = await frame.resourceTreeModel().target().runtimeAgent().invoke_evaluate({ expression: "document.readyState", returnByValue: true });
    if (response.result?.value === "complete") {
      this.#checkContrast(frame.resourceTreeModel());
    }
  }
};

// gen/front_end/models/issues_manager/CookieDeprecationMetadataIssue.js
var CookieDeprecationMetadataIssue_exports = {};
__export(CookieDeprecationMetadataIssue_exports, {
  CookieDeprecationMetadataIssue: () => CookieDeprecationMetadataIssue
});
import * as i18n7 from "./../../core/i18n/i18n.js";
var UIStrings4 = {
  /**
   * @description Label for a link for third-party cookie Issues.
   */
  thirdPartyPhaseoutExplained: "Changes to Chrome's treatment of third-party cookies"
};
var str_4 = i18n7.i18n.registerUIStrings("models/issues_manager/CookieDeprecationMetadataIssue.ts", UIStrings4);
var i18nString2 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var CookieDeprecationMetadataIssue = class _CookieDeprecationMetadataIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const issueCode = "CookieDeprecationMetadataIssue_" + issueDetails.operation;
    super(issueCode, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
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
          linkTitle: i18nString2(UIStrings4.thirdPartyPhaseoutExplained)
        }
      ]
    };
  }
  getKind() {
    return "BreakingChange";
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

// gen/front_end/models/issues_manager/CookieIssue.js
var CookieIssue_exports = {};
__export(CookieIssue_exports, {
  CookieIssue: () => CookieIssue,
  isCausedByThirdParty: () => isCausedByThirdParty
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as ThirdPartyWeb from "./../../third_party/third-party-web/third-party-web.js";
var UIStrings5 = {
  /**
   * @description Label for the link for SameSiteCookies Issues
   */
  samesiteCookiesExplained: "SameSite cookies explained",
  /**
   * @description Label for the link for Schemeful Same-Site Issues
   */
  howSchemefulSamesiteWorks: "How Schemeful Same-Site Works",
  /**
   * @description Label for a link for SameParty Issues. 'Attribute' refers to a cookie attribute.
   */
  firstPartySetsExplained: "`First-Party Sets` and the `SameParty` attribute",
  /**
   * @description Label for a link for cross-site redirect Issues.
   */
  fileCrosSiteRedirectBug: "File a bug",
  /**
   * @description text to show in Console panel when a third-party cookie is blocked in Chrome.
   */
  consoleTpcdErrorMessage: "Third-party cookie is blocked in Chrome either because of Chrome flags or browser configuration."
};
var str_5 = i18n9.i18n.registerUIStrings("models/issues_manager/CookieIssue.ts", UIStrings5);
var i18nLazyString3 = i18n9.i18n.getLazilyComputedLocalizedString.bind(void 0, str_5);
var CookieIssue = class _CookieIssue extends Issue {
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
  static createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel, issueId) {
    const issues = [];
    if (cookieIssueDetails.cookieExclusionReasons && cookieIssueDetails.cookieExclusionReasons.length > 0) {
      for (const exclusionReason of cookieIssueDetails.cookieExclusionReasons) {
        const code = _CookieIssue.codeForCookieIssueDetails(exclusionReason, cookieIssueDetails.cookieWarningReasons, cookieIssueDetails.operation, cookieIssueDetails.cookieUrl);
        if (code) {
          issues.push(new _CookieIssue(code, cookieIssueDetails, issuesModel, issueId));
        }
      }
      return issues;
    }
    if (cookieIssueDetails.cookieWarningReasons) {
      for (const warningReason of cookieIssueDetails.cookieWarningReasons) {
        const code = _CookieIssue.codeForCookieIssueDetails(warningReason, [], cookieIssueDetails.operation, cookieIssueDetails.cookieUrl);
        if (code) {
          issues.push(new _CookieIssue(code, cookieIssueDetails, issuesModel, issueId));
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
  static codeForCookieIssueDetails(reason, warningReasons, operation, cookieUrl) {
    const isURLSecure = cookieUrl && (Common3.ParsedURL.schemeIs(cookieUrl, "https:") || Common3.ParsedURL.schemeIs(cookieUrl, "wss:"));
    const secure = isURLSecure ? "Secure" : "Insecure";
    if (reason === "ExcludeSameSiteStrict" || reason === "ExcludeSameSiteLax" || reason === "ExcludeSameSiteUnspecifiedTreatedAsLax") {
      if (warningReasons && warningReasons.length > 0) {
        if (warningReasons.includes(
          "WarnSameSiteStrictLaxDowngradeStrict"
          /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict */
        )) {
          return [
            "CookieIssue",
            "ExcludeNavigationContextDowngrade",
            secure
          ].join("::");
        }
        if (warningReasons.includes(
          "WarnSameSiteStrictCrossDowngradeStrict"
          /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict */
        ) || warningReasons.includes(
          "WarnSameSiteStrictCrossDowngradeLax"
          /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeLax */
        ) || warningReasons.includes(
          "WarnSameSiteLaxCrossDowngradeStrict"
          /* Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict */
        ) || warningReasons.includes(
          "WarnSameSiteLaxCrossDowngradeLax"
          /* Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeLax */
        )) {
          return [
            "CookieIssue",
            "ExcludeContextDowngrade",
            operation,
            secure
          ].join("::");
        }
      }
      if (warningReasons.includes(
        "WarnCrossSiteRedirectDowngradeChangesInclusion"
        /* Protocol.Audits.CookieWarningReason.WarnCrossSiteRedirectDowngradeChangesInclusion */
      )) {
        return [
          "CookieIssue",
          "CrossSiteRedirectDowngradeChangesInclusion"
        ].join("::");
      }
      if (reason === "ExcludeSameSiteUnspecifiedTreatedAsLax") {
        return ["CookieIssue", reason, operation].join("::");
      }
      return null;
    }
    if (reason === "WarnSameSiteStrictLaxDowngradeStrict") {
      return ["CookieIssue", reason, secure].join("::");
    }
    if (reason === "WarnSameSiteStrictCrossDowngradeStrict" || reason === "WarnSameSiteStrictCrossDowngradeLax" || reason === "WarnSameSiteLaxCrossDowngradeLax" || reason === "WarnSameSiteLaxCrossDowngradeStrict") {
      return ["CookieIssue", "WarnCrossDowngrade", operation, secure].join("::");
    }
    if (reason === "ExcludePortMismatch") {
      return ["CookieIssue", "ExcludePortMismatch"].join("::");
    }
    if (reason === "ExcludeSchemeMismatch") {
      return ["CookieIssue", "ExcludeSchemeMismatch"].join("::");
    }
    return ["CookieIssue", reason, operation].join("::");
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
    return "Cookie";
  }
  getDescription() {
    const description = issueDescriptions3.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  isCausedByThirdParty() {
    const outermostFrame = SDK3.FrameManager.FrameManager.instance().getOutermostFrame();
    return isCausedByThirdParty(outermostFrame, this.details().cookieUrl, this.details().siteForCookies);
  }
  getKind() {
    if (this.details().cookieExclusionReasons?.length > 0) {
      return "PageError";
    }
    return "BreakingChange";
  }
  makeCookieReportEntry() {
    const status = _CookieIssue.getCookieStatus(this.details());
    const details = this.details();
    if (details.cookie && details.cookieUrl && status !== void 0) {
      const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(details.cookieUrl);
      return {
        name: details.cookie.name,
        domain: details.cookie.domain,
        type: entity?.category,
        platform: entity?.name,
        status,
        insight: this.details().insight
      };
    }
    return;
  }
  static getCookieStatus(cookieIssueDetails) {
    if (cookieIssueDetails.cookieExclusionReasons.includes(
      "ExcludeThirdPartyPhaseout"
      /* Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout */
    )) {
      return 0;
    }
    if (cookieIssueDetails.cookieWarningReasons.includes(
      "WarnDeprecationTrialMetadata"
      /* Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata */
    )) {
      return 2;
    }
    if (cookieIssueDetails.cookieWarningReasons.includes(
      "WarnThirdPartyCookieHeuristic"
      /* Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic */
    )) {
      return 3;
    }
    if (cookieIssueDetails.cookieWarningReasons.includes(
      "WarnThirdPartyPhaseout"
      /* Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout */
    )) {
      return 1;
    }
    return;
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const cookieIssueDetails = inspectorIssue.details.cookieIssueDetails;
    if (!cookieIssueDetails) {
      console.warn("Cookie issue without details received.");
      return [];
    }
    return _CookieIssue.createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel, inspectorIssue.issueId);
  }
  static getSubCategory(code) {
    if (code.includes("SameSite") || code.includes("Downgrade")) {
      return "SameSiteCookie";
    }
    if (code.includes("ThirdPartyPhaseout")) {
      return "ThirdPartyPhaseoutCookie";
    }
    return "GenericCookie";
  }
  static isThirdPartyCookiePhaseoutRelatedIssue(issue) {
    const excludeFromAggregate = [
      "WarnThirdPartyCookieHeuristic",
      "WarnDeprecationTrialMetadata",
      "WarnThirdPartyPhaseout",
      "ExcludeThirdPartyPhaseout"
    ];
    return excludeFromAggregate.some((exclude) => issue.code().includes(exclude));
  }
  maybeCreateConsoleMessage() {
    const issuesModel = this.model();
    if (issuesModel && this.code().includes(
      "ExcludeThirdPartyPhaseout"
      /* Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout */
    )) {
      return new SDK3.ConsoleModel.ConsoleMessage(issuesModel.target().model(SDK3.RuntimeModel.RuntimeModel), Common3.Console.FrontendMessageSource.ISSUE_PANEL, "warning", UIStrings5.consoleTpcdErrorMessage, {
        url: this.details().request?.url,
        affectedResources: { requestId: this.details().request?.requestId, issueId: this.issueId },
        isCookieReportIssue: true
      });
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
  const parsedCookieUrl = Common3.ParsedURL.ParsedURL.fromString(cookieUrl);
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
      linkTitle: i18nLazyString3(UIStrings5.samesiteCookiesExplained)
    }
  ]
};
var sameSiteUnspecifiedWarnSet = {
  file: "SameSiteUnspecifiedLaxAllowUnsafeSet.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString3(UIStrings5.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureErrorRead = {
  file: "SameSiteNoneInsecureErrorRead.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString3(UIStrings5.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureErrorSet = {
  file: "SameSiteNoneInsecureErrorSet.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString3(UIStrings5.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureWarnRead = {
  file: "SameSiteNoneInsecureWarnRead.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString3(UIStrings5.samesiteCookiesExplained)
    }
  ]
};
var sameSiteNoneInsecureWarnSet = {
  file: "SameSiteNoneInsecureWarnSet.md",
  links: [
    {
      link: "https://web.dev/samesite-cookies-explained/",
      linkTitle: i18nLazyString3(UIStrings5.samesiteCookiesExplained)
    }
  ]
};
var schemefulSameSiteArticles = [{ link: "https://web.dev/schemeful-samesite/", linkTitle: i18nLazyString3(UIStrings5.howSchemefulSamesiteWorks) }];
function schemefulSameSiteSubstitutions({ isDestinationSecure, isOriginSecure }) {
  return /* @__PURE__ */ new Map([
    // TODO(crbug.com/1168438): Use translated phrases once the issue description is localized.
    ["PLACEHOLDER_destination", () => isDestinationSecure ? "a secure" : "an insecure"],
    ["PLACEHOLDER_origin", () => isOriginSecure ? "a secure" : "an insecure"]
  ]);
}
function sameSiteWarnStrictLaxDowngradeStrict(isSecure) {
  return {
    file: "SameSiteWarnStrictLaxDowngradeStrict.md",
    substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
    links: schemefulSameSiteArticles
  };
}
function sameSiteExcludeNavigationContextDowngrade(isSecure) {
  return {
    file: "SameSiteExcludeNavigationContextDowngrade.md",
    substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
    links: schemefulSameSiteArticles
  };
}
function sameSiteWarnCrossDowngradeRead(isSecure) {
  return {
    file: "SameSiteWarnCrossDowngradeRead.md",
    substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
    links: schemefulSameSiteArticles
  };
}
function sameSiteExcludeContextDowngradeRead(isSecure) {
  return {
    file: "SameSiteExcludeContextDowngradeRead.md",
    substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
    links: schemefulSameSiteArticles
  };
}
function sameSiteWarnCrossDowngradeSet(isSecure) {
  return {
    file: "SameSiteWarnCrossDowngradeSet.md",
    substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: !isSecure, isOriginSecure: isSecure }),
    links: schemefulSameSiteArticles
  };
}
function sameSiteExcludeContextDowngradeSet(isSecure) {
  return {
    file: "SameSiteExcludeContextDowngradeSet.md",
    substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
    links: schemefulSameSiteArticles
  };
}
var sameSiteInvalidSameParty = {
  file: "SameSiteInvalidSameParty.md",
  links: [{
    link: "https://developer.chrome.com/blog/first-party-sets-sameparty/",
    linkTitle: i18nLazyString3(UIStrings5.firstPartySetsExplained)
  }]
};
var samePartyCrossPartyContextSet = {
  file: "SameSiteSamePartyCrossPartyContextSet.md",
  links: [{
    link: "https://developer.chrome.com/blog/first-party-sets-sameparty/",
    linkTitle: i18nLazyString3(UIStrings5.firstPartySetsExplained)
  }]
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
    linkTitle: i18nLazyString3(UIStrings5.fileCrosSiteRedirectBug)
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
  ["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure", sameSiteWarnStrictLaxDowngradeStrict(true)],
  ["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure", sameSiteWarnStrictLaxDowngradeStrict(false)],
  ["CookieIssue::WarnCrossDowngrade::ReadCookie::Secure", sameSiteWarnCrossDowngradeRead(true)],
  ["CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure", sameSiteWarnCrossDowngradeRead(false)],
  ["CookieIssue::WarnCrossDowngrade::SetCookie::Secure", sameSiteWarnCrossDowngradeSet(true)],
  ["CookieIssue::WarnCrossDowngrade::SetCookie::Insecure", sameSiteWarnCrossDowngradeSet(false)],
  ["CookieIssue::ExcludeNavigationContextDowngrade::Secure", sameSiteExcludeNavigationContextDowngrade(true)],
  [
    "CookieIssue::ExcludeNavigationContextDowngrade::Insecure",
    sameSiteExcludeNavigationContextDowngrade(false)
  ],
  ["CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure", sameSiteExcludeContextDowngradeRead(true)],
  ["CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure", sameSiteExcludeContextDowngradeRead(false)],
  ["CookieIssue::ExcludeContextDowngrade::SetCookie::Secure", sameSiteExcludeContextDowngradeSet(true)],
  ["CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure", sameSiteExcludeContextDowngradeSet(false)],
  ["CookieIssue::ExcludeInvalidSameParty::SetCookie", sameSiteInvalidSameParty],
  ["CookieIssue::ExcludeSamePartyCrossPartyContext::SetCookie", samePartyCrossPartyContextSet],
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

// gen/front_end/models/issues_manager/CorsIssue.js
var CorsIssue_exports = {};
__export(CorsIssue_exports, {
  CorsIssue: () => CorsIssue
});
import * as i18n11 from "./../../core/i18n/i18n.js";
var UIStrings6 = {
  /**
   * @description Label for the link for CORS Local Network Access issues
   */
  corsLocalNetworkAccess: "Local Network Access",
  /**
   * @description Label for the link for CORS private network issues
   */
  corsPrivateNetworkAccess: "Private Network Access",
  /**
   * @description Label for the link for CORS network issues
   */
  CORS: "Cross-Origin Resource Sharing (`CORS`)"
};
var str_6 = i18n11.i18n.registerUIStrings("models/issues_manager/CorsIssue.ts", UIStrings6);
var i18nString3 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
function getIssueCode2(details) {
  switch (details.corsErrorStatus.corsError) {
    case "InvalidAllowMethodsPreflightResponse":
    case "InvalidAllowHeadersPreflightResponse":
    case "PreflightMissingAllowOriginHeader":
    case "PreflightMultipleAllowOriginValues":
    case "PreflightInvalidAllowOriginValue":
    case "MissingAllowOriginHeader":
    case "MultipleAllowOriginValues":
    case "InvalidAllowOriginValue":
      return "CorsIssue::InvalidHeaders";
    case "PreflightWildcardOriginNotAllowed":
    case "WildcardOriginNotAllowed":
      return "CorsIssue::WildcardOriginWithCredentials";
    case "PreflightInvalidStatus":
    case "PreflightDisallowedRedirect":
    case "InvalidResponse":
      return "CorsIssue::PreflightResponseInvalid";
    case "AllowOriginMismatch":
    case "PreflightAllowOriginMismatch":
      return "CorsIssue::OriginMismatch";
    case "InvalidAllowCredentials":
    case "PreflightInvalidAllowCredentials":
      return "CorsIssue::AllowCredentialsRequired";
    case "MethodDisallowedByPreflightResponse":
      return "CorsIssue::MethodDisallowedByPreflightResponse";
    case "HeaderDisallowedByPreflightResponse":
      return "CorsIssue::HeaderDisallowedByPreflightResponse";
    case "RedirectContainsCredentials":
      return "CorsIssue::RedirectContainsCredentials";
    case "DisallowedByMode":
      return "CorsIssue::DisallowedByMode";
    case "CorsDisabledScheme":
      return "CorsIssue::CorsDisabledScheme";
    case "PreflightMissingAllowExternal":
      return "CorsIssue::PreflightMissingAllowExternal";
    case "PreflightInvalidAllowExternal":
      return "CorsIssue::PreflightInvalidAllowExternal";
    case "InsecurePrivateNetwork":
      return "CorsIssue::InsecurePrivateNetwork";
    case "NoCorsRedirectModeNotFollow":
      return "CorsIssue::NoCorsRedirectModeNotFollow";
    case "InvalidPrivateNetworkAccess":
      return "CorsIssue::InvalidPrivateNetworkAccess";
    case "UnexpectedPrivateNetworkAccess":
      return "CorsIssue::UnexpectedPrivateNetworkAccess";
    case "PreflightMissingAllowPrivateNetwork":
    case "PreflightInvalidAllowPrivateNetwork":
      return "CorsIssue::PreflightAllowPrivateNetworkError";
    case "PreflightMissingPrivateNetworkAccessId":
      return "CorsIssue::PreflightMissingPrivateNetworkAccessId";
    case "PreflightMissingPrivateNetworkAccessName":
      return "CorsIssue::PreflightMissingPrivateNetworkAccessName";
    case "PrivateNetworkAccessPermissionUnavailable":
      return "CorsIssue::PrivateNetworkAccessPermissionUnavailable";
    case "PrivateNetworkAccessPermissionDenied":
      return "CorsIssue::PrivateNetworkAccessPermissionDenied";
    case "LocalNetworkAccessPermissionDenied":
      return "CorsIssue::LocalNetworkAccessPermissionDenied";
  }
}
var CorsIssue = class _CorsIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    super(getIssueCode2(issueDetails), issueDetails, issuesModel, issueId);
  }
  getCategory() {
    return "Cors";
  }
  getDescription() {
    switch (getIssueCode2(this.details())) {
      case "CorsIssue::InsecurePrivateNetwork":
        return {
          file: "corsInsecurePrivateNetwork.md",
          links: [{
            link: "https://developer.chrome.com/blog/private-network-access-update",
            linkTitle: i18nString3(UIStrings6.corsPrivateNetworkAccess)
          }]
        };
      case "CorsIssue::PreflightAllowPrivateNetworkError":
        return {
          file: "corsPreflightAllowPrivateNetworkError.md",
          links: [{
            link: "https://developer.chrome.com/blog/private-network-access-update",
            linkTitle: i18nString3(UIStrings6.corsPrivateNetworkAccess)
          }]
        };
      case "CorsIssue::InvalidHeaders":
        return {
          file: "corsInvalidHeaderValues.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::WildcardOriginWithCredentials":
        return {
          file: "corsWildcardOriginNotAllowed.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::PreflightResponseInvalid":
        return {
          file: "corsPreflightResponseInvalid.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::OriginMismatch":
        return {
          file: "corsOriginMismatch.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::AllowCredentialsRequired":
        return {
          file: "corsAllowCredentialsRequired.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::MethodDisallowedByPreflightResponse":
        return {
          file: "corsMethodDisallowedByPreflightResponse.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::HeaderDisallowedByPreflightResponse":
        return {
          file: "corsHeaderDisallowedByPreflightResponse.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::RedirectContainsCredentials":
        return {
          file: "corsRedirectContainsCredentials.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::DisallowedByMode":
        return {
          file: "corsDisallowedByMode.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::CorsDisabledScheme":
        return {
          file: "corsDisabledScheme.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      case "CorsIssue::NoCorsRedirectModeNotFollow":
        return {
          file: "corsNoCorsRedirectModeNotFollow.md",
          links: [{
            link: "https://web.dev/cross-origin-resource-sharing",
            linkTitle: i18nString3(UIStrings6.CORS)
          }]
        };
      // TODO(1462857): Change the link after we have a blog post for PNA
      // permission prompt.
      case "CorsIssue::PreflightMissingPrivateNetworkAccessId":
      case "CorsIssue::PreflightMissingPrivateNetworkAccessName":
        return {
          file: "corsPrivateNetworkPermissionDenied.md",
          links: [{
            link: "https://developer.chrome.com/blog/private-network-access-update",
            linkTitle: i18nString3(UIStrings6.corsPrivateNetworkAccess)
          }]
        };
      case "CorsIssue::LocalNetworkAccessPermissionDenied":
        return {
          file: "corsLocalNetworkAccessPermissionDenied.md",
          links: [{
            link: "https://chromestatus.com/feature/5152728072060928",
            linkTitle: i18nString3(UIStrings6.corsLocalNetworkAccess)
          }]
        };
      case "CorsIssue::PreflightMissingAllowExternal":
      case "CorsIssue::PreflightInvalidAllowExternal":
      case "CorsIssue::InvalidPrivateNetworkAccess":
      case "CorsIssue::UnexpectedPrivateNetworkAccess":
      case "CorsIssue::PrivateNetworkAccessPermissionUnavailable":
      case "CorsIssue::PrivateNetworkAccessPermissionDenied":
        return null;
    }
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    if (this.details().isWarning && (this.details().corsErrorStatus.corsError === "InsecurePrivateNetwork" || this.details().corsErrorStatus.corsError === "PreflightMissingAllowPrivateNetwork" || this.details().corsErrorStatus.corsError === "PreflightInvalidAllowPrivateNetwork")) {
      return "BreakingChange";
    }
    return "PageError";
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

// gen/front_end/models/issues_manager/CrossOriginEmbedderPolicyIssue.js
var CrossOriginEmbedderPolicyIssue_exports = {};
__export(CrossOriginEmbedderPolicyIssue_exports, {
  CrossOriginEmbedderPolicyIssue: () => CrossOriginEmbedderPolicyIssue,
  isCrossOriginEmbedderPolicyIssue: () => isCrossOriginEmbedderPolicyIssue
});
import * as i18n13 from "./../../core/i18n/i18n.js";
var UIStrings7 = {
  /**
   * @description Link text for a link to external documentation
   */
  coopAndCoep: "COOP and COEP",
  /**
   * @description Title for an external link to more information in the issues view
   */
  samesiteAndSameorigin: "Same-Site and Same-Origin"
};
var str_7 = i18n13.i18n.registerUIStrings("models/issues_manager/CrossOriginEmbedderPolicyIssue.ts", UIStrings7);
var i18nLazyString4 = i18n13.i18n.getLazilyComputedLocalizedString.bind(void 0, str_7);
function isCrossOriginEmbedderPolicyIssue(reason) {
  switch (reason) {
    case "CoepFrameResourceNeedsCoepHeader":
      return true;
    case "CoopSandboxedIFrameCannotNavigateToCoopPage":
      return true;
    case "CorpNotSameOrigin":
      return true;
    case "CorpNotSameOriginAfterDefaultedToSameOriginByCoep":
      return true;
    case "CorpNotSameSite":
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
    return "CrossOriginEmbedderPolicy";
  }
  getDescription() {
    const description = issueDescriptions4.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  getKind() {
    return "PageError";
  }
};
var issueDescriptions4 = /* @__PURE__ */ new Map([
  [
    "CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep",
    {
      file: "CoepCorpNotSameOriginAfterDefaultedToSameOriginByCoep.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString4(UIStrings7.coopAndCoep) },
        { link: "https://web.dev/same-site-same-origin/", linkTitle: i18nLazyString4(UIStrings7.samesiteAndSameorigin) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader",
    {
      file: "CoepFrameResourceNeedsCoepHeader.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString4(UIStrings7.coopAndCoep) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CoopSandboxedIframeCannotNavigateToCoopPage",
    {
      file: "CoepCoopSandboxedIframeCannotNavigateToCoopPage.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString4(UIStrings7.coopAndCoep) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CorpNotSameSite",
    {
      file: "CoepCorpNotSameSite.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString4(UIStrings7.coopAndCoep) },
        { link: "https://web.dev/same-site-same-origin/", linkTitle: i18nLazyString4(UIStrings7.samesiteAndSameorigin) }
      ]
    }
  ],
  [
    "CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin",
    {
      file: "CoepCorpNotSameOrigin.md",
      links: [
        { link: "https://web.dev/coop-coep/", linkTitle: i18nLazyString4(UIStrings7.coopAndCoep) },
        { link: "https://web.dev/same-site-same-origin/", linkTitle: i18nLazyString4(UIStrings7.samesiteAndSameorigin) }
      ]
    }
  ]
]);

// gen/front_end/models/issues_manager/DeprecationIssue.js
var DeprecationIssue_exports = {};
__export(DeprecationIssue_exports, {
  DeprecationIssue: () => DeprecationIssue
});
import * as i18n15 from "./../../core/i18n/i18n.js";

// gen/front_end/generated/Deprecation.js
var UIStrings8 = {
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
   * @description This warning occurs when the browser attempts to store a cookie containing a banned character. Rather than the cookie string being truncated at the banned character, the entire cookie will be rejected now.
   */
  CookieWithTruncatingChar: "Cookies containing a `\\(0|r|n)` character will be rejected instead of truncated.",
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
   * @description Warning displayed to developers that they are using `XMLHttpRequest` API in a way that they expect an unsupported character encoding `UTF-16` could be used in the server reply.
   */
  XHRJSONEncodingDetection: "UTF-16 is not supported by response json in `XMLHttpRequest`",
  /**
   * @description Warning displayed to developers. It is shown when the `XMLHttpRequest` API is used in a way that it slows down the page load of the next page. The `main thread` refers to an operating systems thread used to run most of the processing of HTML documents, so please use a consistent wording.
   */
  XMLHttpRequestSynchronousInNonWorkerOutsideBeforeUnload: "Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
  /**
   * @description Warning displayed to developers that they are using externally loaded entities in an XML document that constitutes a part of the web page. Externally loaded entities are a technical concept of XML document processing.
   */
  XMLNoExternalEntities: "Externally loaded entities in XML parsing have been deprecated and will be removed from this browser soon.",
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
  "CookieWithTruncatingChar": {
    "milestone": 103
  },
  "CrossOriginAccessBasedOnDocumentDomain": {
    "milestone": 115
  },
  "DataUrlInSvgUse": {
    "chromeStatusFeature": 5128825141198848,
    "milestone": 119
  },
  "IdentityInCanMakePaymentEvent": {
    "chromeStatusFeature": 5190978431352832
  },
  "InsecurePrivateNetworkSubresourceRequest": {
    "chromeStatusFeature": 5436853517811712,
    "milestone": 92
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
  "XHRJSONEncodingDetection": {
    "milestone": 93
  },
  "XMLNoExternalEntities": {
    "chromeStatusFeature": 6734457763659776,
    "milestone": 144
  },
  "XSLT": {
    "chromeStatusFeature": 4709671889534976,
    "milestone": 143
  }
};

// gen/front_end/models/issues_manager/DeprecationIssue.js
var UIStrings9 = {
  /**
   * @description This links to the chrome feature status page when one exists.
   */
  feature: "Check the feature status page for more details.",
  /**
   * @description This links to the chromium dash schedule when a milestone is set.
   * @example {100} milestone
   */
  milestone: "This change will go into effect with milestone {milestone}.",
  /**
   * @description Title of issue raised when a deprecated feature is used
   */
  title: "Deprecated feature used"
};
var str_8 = i18n15.i18n.registerUIStrings("models/issues_manager/DeprecationIssue.ts", UIStrings9);
var i18nLazyString5 = i18n15.i18n.getLazilyComputedLocalizedString.bind(void 0, str_8);
var strDeprecation = i18n15.i18n.registerUIStrings("generated/Deprecation.ts", UIStrings8);
var i18nLazyDeprecationString = i18n15.i18n.getLazilyComputedLocalizedString.bind(void 0, strDeprecation);
var DeprecationIssue = class _DeprecationIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const issueCode = [
      "DeprecationIssue",
      issueDetails.type
    ].join("::");
    super({ code: issueCode, umaCode: "DeprecationIssue" }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    let messageFunction = () => "";
    const maybeEnglishMessage = UIStrings8[this.details().type];
    if (maybeEnglishMessage) {
      messageFunction = i18nLazyDeprecationString(maybeEnglishMessage);
    }
    const links = [];
    const deprecationMeta = DEPRECATIONS_METADATA[this.details().type];
    const feature = deprecationMeta?.chromeStatusFeature ?? 0;
    if (feature !== 0) {
      links.push({
        link: `https://chromestatus.com/feature/${feature}`,
        linkTitle: i18nLazyString5(UIStrings9.feature)
      });
    }
    const milestone = deprecationMeta?.milestone ?? 0;
    if (milestone !== 0) {
      links.push({
        link: "https://chromiumdash.appspot.com/schedule",
        linkTitle: i18nLazyString5(UIStrings9.milestone, { milestone })
      });
    }
    return resolveLazyDescription({
      file: "deprecation.md",
      substitutions: /* @__PURE__ */ new Map([
        ["PLACEHOLDER_title", i18nLazyString5(UIStrings9.title)],
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
    return "BreakingChange";
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

// gen/front_end/models/issues_manager/ElementAccessibilityIssue.js
var ElementAccessibilityIssue_exports = {};
__export(ElementAccessibilityIssue_exports, {
  ElementAccessibilityIssue: () => ElementAccessibilityIssue
});
var ElementAccessibilityIssue = class _ElementAccessibilityIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    const issueCode = [
      "ElementAccessibilityIssue",
      issueDetails.elementAccessibilityIssueReason
    ].join("::");
    super(issueCode, issueDetails, issuesModel, issueId);
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
    return "PageError";
  }
  getCategory() {
    return "Other";
  }
  isInteractiveContentAttributesSelectDescendantIssue() {
    return this.details().hasDisallowedAttributes && (this.details().elementAccessibilityIssueReason !== "InteractiveContentOptionChild" && this.details().elementAccessibilityIssueReason !== "InteractiveContentSummaryDescendant");
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
    "DisallowedSelectChild",
    {
      file: "selectElementAccessibilityDisallowedSelectChild.md",
      links: []
    }
  ],
  [
    "DisallowedOptGroupChild",
    {
      file: "selectElementAccessibilityDisallowedOptGroupChild.md",
      links: []
    }
  ],
  [
    "NonPhrasingContentOptionChild",
    {
      file: "selectElementAccessibilityNonPhrasingContentOptionChild.md",
      links: []
    }
  ],
  [
    "InteractiveContentOptionChild",
    {
      file: "selectElementAccessibilityInteractiveContentOptionChild.md",
      links: []
    }
  ],
  [
    "InteractiveContentLegendChild",
    {
      file: "selectElementAccessibilityInteractiveContentLegendChild.md",
      links: []
    }
  ],
  [
    "InteractiveContentSummaryDescendant",
    {
      file: "summaryElementAccessibilityInteractiveContentSummaryDescendant.md",
      links: []
    }
  ]
]);

// gen/front_end/models/issues_manager/FederatedAuthUserInfoRequestIssue.js
var FederatedAuthUserInfoRequestIssue_exports = {};
__export(FederatedAuthUserInfoRequestIssue_exports, {
  FederatedAuthUserInfoRequestIssue: () => FederatedAuthUserInfoRequestIssue
});
import * as i18n17 from "./../../core/i18n/i18n.js";
var UIStrings10 = {
  /**
   * @description Title for Client Hint specification url link
   */
  fedCmUserInfo: "Federated Credential Management User Info API"
};
var str_9 = i18n17.i18n.registerUIStrings("models/issues_manager/FederatedAuthUserInfoRequestIssue.ts", UIStrings10);
var i18nLazyString6 = i18n17.i18n.getLazilyComputedLocalizedString.bind(void 0, str_9);
var FederatedAuthUserInfoRequestIssue = class _FederatedAuthUserInfoRequestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super({
      code: "FederatedAuthUserInfoRequestIssue",
      umaCode: [
        "FederatedAuthUserInfoRequestIssue",
        issueDetails.federatedAuthUserInfoRequestIssueReason
      ].join("::")
    }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    const description = issueDescriptions6.get(this.details().federatedAuthUserInfoRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError";
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
var issueDescriptions6 = /* @__PURE__ */ new Map([
  [
    "NotSameOrigin",
    {
      file: "federatedAuthUserInfoRequestNotSameOrigin.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "NotIframe",
    {
      file: "federatedAuthUserInfoRequestNotIframe.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "NotPotentiallyTrustworthy",
    {
      file: "federatedAuthUserInfoRequestNotPotentiallyTrustworthy.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "NoApiPermission",
    {
      file: "federatedAuthUserInfoRequestNoApiPermission.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "NotSignedInWithIdp",
    {
      file: "federatedAuthUserInfoRequestNotSignedInWithIdp.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "NoAccountSharingPermission",
    {
      file: "federatedAuthUserInfoRequestNoAccountSharingPermission.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "InvalidConfigOrWellKnown",
    {
      file: "federatedAuthUserInfoRequestInvalidConfigOrWellKnown.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "InvalidAccountsResponse",
    {
      file: "federatedAuthUserInfoRequestInvalidAccountsResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ],
  [
    "NoReturningUserFromFetchedAccounts",
    {
      file: "federatedAuthUserInfoRequestNoReturningUserFromFetchedAccounts.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString6(UIStrings10.fedCmUserInfo)
      }]
    }
  ]
]);

// gen/front_end/models/issues_manager/GenericIssue.js
var GenericIssue_exports = {};
__export(GenericIssue_exports, {
  GenericIssue: () => GenericIssue,
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
  genericNavigationEntryMarkedSkippable: () => genericNavigationEntryMarkedSkippable,
  genericResponseWasBlockedbyORB: () => genericResponseWasBlockedbyORB
});
import * as i18n19 from "./../../core/i18n/i18n.js";
var UIStrings11 = {
  /**
   * @description title for autofill documentation page
   */
  howDoesAutofillWorkPageTitle: "How does autofill work?",
  /**
   * @description title for label form elements usage example page
   */
  labelFormlementsPageTitle: "The label elements",
  /**
   * @description title for input form elements usage example page
   */
  inputFormElementPageTitle: "The form input element",
  /**
   * @description title for autocomplete attribute documentation page.
   */
  autocompleteAttributePageTitle: "HTML attribute: autocomplete",
  /**
   * @description title for CORB explainer.
   */
  corbExplainerPageTitle: "CORB explainer",
  /**
   * @description title for history intervention documentation page.
   */
  historyManipulationInterventionPageTitle: "History manipulation intervention explainer"
};
var str_10 = i18n19.i18n.registerUIStrings("models/issues_manager/GenericIssue.ts", UIStrings11);
var i18nLazyString7 = i18n19.i18n.getLazilyComputedLocalizedString.bind(void 0, str_10);
var GenericIssue = class _GenericIssue extends Issue {
  constructor(issueDetails, issuesModel, issueId) {
    const issueCode = [
      "GenericIssue",
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
  getCategory() {
    return "Generic";
  }
  primaryKey() {
    const details = this.details();
    const requestId = details.request ? details.request.requestId : "no-request";
    return `${this.code()}-(${details.frameId})-(${details.violatingNodeId})-(${details.violatingNodeAttribute})-(${requestId})`;
  }
  getDescription() {
    const description = issueDescriptions7.get(this.details().errorType);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  getKind() {
    return issueTypes.get(this.details().errorType) || "Improvement";
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
    linkTitle: i18n19.i18n.lockedLazyString("HTML Standard")
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
    linkTitle: i18nLazyString7(UIStrings11.howDoesAutofillWorkPageTitle)
  }]
};
var genericFormAriaLabelledByToNonExistingIdError = {
  file: "genericFormAriaLabelledByToNonExistingIdError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
    linkTitle: i18nLazyString7(UIStrings11.labelFormlementsPageTitle)
  }]
};
var genericFormEmptyIdAndNameAttributesForInputError = {
  file: "genericFormEmptyIdAndNameAttributesForInputError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input",
    linkTitle: i18nLazyString7(UIStrings11.inputFormElementPageTitle)
  }]
};
var genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError = {
  file: "genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values",
    linkTitle: i18nLazyString7(UIStrings11.autocompleteAttributePageTitle)
  }]
};
var genericFormInputHasWrongButWellIntendedAutocompleteValue = {
  file: "genericFormInputHasWrongButWellIntendedAutocompleteValueError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values",
    linkTitle: i18nLazyString7(UIStrings11.autocompleteAttributePageTitle)
  }]
};
var genericFormLabelForMatchesNonExistingIdError = {
  file: "genericFormLabelForMatchesNonExistingIdError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
    linkTitle: i18nLazyString7(UIStrings11.labelFormlementsPageTitle)
  }]
};
var genericFormLabelHasNeitherForNorNestedInputError = {
  file: "genericFormLabelHasNeitherForNorNestedInputError.md",
  links: [{
    link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
    linkTitle: i18nLazyString7(UIStrings11.labelFormlementsPageTitle)
  }]
};
var genericResponseWasBlockedbyORB = {
  file: "genericResponseWasBlockedByORB.md",
  links: [{
    link: "https://www.chromium.org/Home/chromium-security/corb-for-developers/",
    linkTitle: i18nLazyString7(UIStrings11.corbExplainerPageTitle)
  }]
};
var genericNavigationEntryMarkedSkippable = {
  file: "genericNavigationEntryMarkedSkippable.md",
  links: [{
    link: "https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md",
    linkTitle: i18nLazyString7(UIStrings11.historyManipulationInterventionPageTitle)
  }]
};
var issueDescriptions7 = /* @__PURE__ */ new Map([
  ["FormLabelForNameError", genericFormLabelForNameError],
  ["FormInputWithNoLabelError", genericFormInputWithNoLabelError],
  [
    "FormAutocompleteAttributeEmptyError",
    genericFormAutocompleteAttributeEmptyError
  ],
  ["FormDuplicateIdForInputError", genericFormDuplicateIdForInputError],
  [
    "FormAriaLabelledByToNonExistingIdError",
    genericFormAriaLabelledByToNonExistingIdError
  ],
  [
    "FormEmptyIdAndNameAttributesForInputError",
    genericFormEmptyIdAndNameAttributesForInputError
  ],
  [
    "FormInputAssignedAutocompleteValueToIdOrNameAttributeError",
    genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError
  ],
  [
    "FormLabelForMatchesNonExistingIdError",
    genericFormLabelForMatchesNonExistingIdError
  ],
  [
    "FormLabelHasNeitherForNorNestedInputError",
    genericFormLabelHasNeitherForNorNestedInputError
  ],
  [
    "FormInputHasWrongButWellIntendedAutocompleteValueError",
    genericFormInputHasWrongButWellIntendedAutocompleteValue
  ],
  [
    "ResponseWasBlockedByORB",
    genericResponseWasBlockedbyORB
  ],
  [
    "NavigationEntryMarkedSkippable",
    genericNavigationEntryMarkedSkippable
  ]
]);
var issueTypes = /* @__PURE__ */ new Map([
  [
    "FormLabelForNameError",
    "PageError"
    /* IssueKind.PAGE_ERROR */
  ],
  [
    "FormInputWithNoLabelError",
    "Improvement"
    /* IssueKind.IMPROVEMENT */
  ],
  [
    "FormAutocompleteAttributeEmptyError",
    "PageError"
    /* IssueKind.PAGE_ERROR */
  ],
  [
    "FormDuplicateIdForInputError",
    "PageError"
    /* IssueKind.PAGE_ERROR */
  ],
  [
    "FormAriaLabelledByToNonExistingIdError",
    "Improvement"
    /* IssueKind.IMPROVEMENT */
  ],
  [
    "FormEmptyIdAndNameAttributesForInputError",
    "Improvement"
    /* IssueKind.IMPROVEMENT */
  ],
  [
    "FormInputAssignedAutocompleteValueToIdOrNameAttributeError",
    "Improvement"
  ],
  [
    "FormLabelForMatchesNonExistingIdError",
    "PageError"
    /* IssueKind.PAGE_ERROR */
  ],
  [
    "FormLabelHasNeitherForNorNestedInputError",
    "Improvement"
    /* IssueKind.IMPROVEMENT */
  ],
  [
    "FormInputHasWrongButWellIntendedAutocompleteValueError",
    "Improvement"
    /* IssueKind.IMPROVEMENT */
  ]
]);

// gen/front_end/models/issues_manager/HeavyAdIssue.js
var HeavyAdIssue_exports = {};
__export(HeavyAdIssue_exports, {
  HeavyAdIssue: () => HeavyAdIssue
});
import * as i18n21 from "./../../core/i18n/i18n.js";
var UIStrings12 = {
  /**
   * @description Title for a learn more link in Heavy Ads issue description
   */
  handlingHeavyAdInterventions: "Handling Heavy Ad Interventions"
};
var str_11 = i18n21.i18n.registerUIStrings("models/issues_manager/HeavyAdIssue.ts", UIStrings12);
var i18nString4 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var HeavyAdIssue = class _HeavyAdIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const umaCode = ["HeavyAdIssue", issueDetails.reason].join("::");
    super({ code: "HeavyAdIssue", umaCode }, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${"HeavyAdIssue"}-${JSON.stringify(this.details())}`;
  }
  getDescription() {
    return {
      file: "heavyAd.md",
      links: [
        {
          link: "https://developers.google.com/web/updates/2020/05/heavy-ad-interventions",
          linkTitle: i18nString4(UIStrings12.handlingHeavyAdInterventions)
        }
      ]
    };
  }
  getCategory() {
    return "HeavyAd";
  }
  getKind() {
    switch (this.details().resolution) {
      case "HeavyAdBlocked":
        return "PageError";
      case "HeavyAdWarning":
        return "BreakingChange";
    }
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const heavyAdIssueDetails = inspectorIssue.details.heavyAdIssueDetails;
    if (!heavyAdIssueDetails) {
      console.warn("Heavy Ad issue without details received.");
      return [];
    }
    return [new _HeavyAdIssue(heavyAdIssueDetails, issuesModel)];
  }
};

// gen/front_end/models/issues_manager/IssueAggregator.js
var IssueAggregator_exports = {};
__export(IssueAggregator_exports, {
  AggregatedIssue: () => AggregatedIssue,
  IssueAggregator: () => IssueAggregator
});
import * as Common4 from "./../../core/common/common.js";

// gen/front_end/models/issues_manager/LowTextContrastIssue.js
var LowTextContrastIssue_exports = {};
__export(LowTextContrastIssue_exports, {
  LowTextContrastIssue: () => LowTextContrastIssue
});
import * as i18n23 from "./../../core/i18n/i18n.js";
var UIStrings13 = {
  /**
   * @description Link title for the Low Text Contrast issue in the Issues panel
   */
  colorAndContrastAccessibility: "Color and contrast accessibility"
};
var str_12 = i18n23.i18n.registerUIStrings("models/issues_manager/LowTextContrastIssue.ts", UIStrings13);
var i18nString5 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var LowTextContrastIssue = class _LowTextContrastIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super("LowTextContrastIssue", issueDetails, issuesModel);
  }
  primaryKey() {
    return `${this.code()}-(${this.details().violatingNodeId})`;
  }
  getCategory() {
    return "LowTextContrast";
  }
  getDescription() {
    return {
      file: "LowTextContrast.md",
      links: [
        {
          link: "https://web.dev/color-and-contrast-accessibility/",
          linkTitle: i18nString5(UIStrings13.colorAndContrastAccessibility)
        }
      ]
    };
  }
  getKind() {
    return "Improvement";
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const lowTextContrastIssueDetails = inspectorIssue.details.lowTextContrastIssueDetails;
    if (!lowTextContrastIssueDetails) {
      console.warn("LowTextContrast issue without details received.");
      return [];
    }
    return [new _LowTextContrastIssue(lowTextContrastIssueDetails, issuesModel)];
  }
};

// gen/front_end/models/issues_manager/MixedContentIssue.js
var MixedContentIssue_exports = {};
__export(MixedContentIssue_exports, {
  MixedContentIssue: () => MixedContentIssue
});
import * as i18n25 from "./../../core/i18n/i18n.js";
var UIStrings14 = {
  /**
   * @description Label for the link for Mixed Content Issues
   */
  preventingMixedContent: "Preventing mixed content"
};
var str_13 = i18n25.i18n.registerUIStrings("models/issues_manager/MixedContentIssue.ts", UIStrings14);
var i18nString6 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var MixedContentIssue = class _MixedContentIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super("MixedContentIssue", issueDetails, issuesModel);
  }
  requests() {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }
  getCategory() {
    return "MixedContent";
  }
  getDescription() {
    return {
      file: "mixedContent.md",
      links: [{ link: "https://web.dev/what-is-mixed-content/", linkTitle: i18nString6(UIStrings14.preventingMixedContent) }]
    };
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    switch (this.details().resolutionStatus) {
      case "MixedContentAutomaticallyUpgraded":
        return "Improvement";
      case "MixedContentBlocked":
        return "PageError";
      case "MixedContentWarning":
        return "Improvement";
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

// gen/front_end/models/issues_manager/PartitioningBlobURLIssue.js
var PartitioningBlobURLIssue_exports = {};
__export(PartitioningBlobURLIssue_exports, {
  PartitioningBlobURLIssue: () => PartitioningBlobURLIssue
});
import * as i18n27 from "./../../core/i18n/i18n.js";
var UIStrings15 = {
  /**
   * @description Title for Partitioning BlobURL explainer url link.
   */
  partitioningBlobURL: "Partitioning BlobURL",
  /**
   * @description Title for Chrome Status Entry url link.
   */
  chromeStatusEntry: "Chrome Status Entry"
};
var str_14 = i18n27.i18n.registerUIStrings("models/issues_manager/PartitioningBlobURLIssue.ts", UIStrings15);
var i18nString7 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var PartitioningBlobURLIssue = class _PartitioningBlobURLIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super("PartitioningBlobURLIssue", issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    const fileName = this.details().partitioningBlobURLInfo === "BlockedCrossPartitionFetching" ? "fetchingPartitionedBlobURL.md" : "navigatingPartitionedBlobURL.md";
    return {
      file: fileName,
      links: [
        {
          link: "https://developers.google.com/privacy-sandbox/cookies/storage-partitioning",
          linkTitle: i18nString7(UIStrings15.partitioningBlobURL)
        },
        {
          link: "https://chromestatus.com/feature/5130361898795008",
          linkTitle: i18nString7(UIStrings15.chromeStatusEntry)
        }
      ]
    };
  }
  getKind() {
    return "BreakingChange";
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

// gen/front_end/models/issues_manager/PermissionElementIssue.js
var PermissionElementIssue_exports = {};
__export(PermissionElementIssue_exports, {
  PermissionElementIssue: () => PermissionElementIssue
});
var PermissionElementIssue = class _PermissionElementIssue extends Issue {
  #issueDetails;
  constructor(issueDetails, issuesModel) {
    const issueCode = [
      "PermissionElementIssue",
      issueDetails.issueType
    ].join("::");
    super(issueCode, issueDetails, issuesModel);
    this.#issueDetails = issueDetails;
  }
  getCategory() {
    return "PermissionElement";
  }
  getDescription() {
    const issueType = this.#issueDetails.issueType;
    switch (issueType) {
      case "InvalidType":
        return {
          file: "permissionElementInvalidType.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "FencedFrameDisallowed":
        return {
          file: "permissionElementFencedFrameDisallowed.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "CspFrameAncestorsMissing":
        return {
          file: "permissionElementCspFrameAncestorsMissing.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "PermissionsPolicyBlocked":
        return {
          file: "permissionElementPermissionsPolicyBlocked.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""],
            ["PLACEHOLDER_PermissionName", this.#issueDetails.permissionName || ""]
          ]),
          links: []
        };
      case "PaddingRightUnsupported":
        return {
          file: "permissionElementPaddingRightUnsupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "PaddingBottomUnsupported":
        return {
          file: "permissionElementPaddingBottomUnsupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "InsetBoxShadowUnsupported":
        return {
          file: "permissionElementInsetBoxShadowUnsupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "RequestInProgress":
        return {
          file: "permissionElementRequestInProgress.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "UntrustedEvent":
        return {
          file: "permissionElementUntrustedEvent.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "RegistrationFailed":
        return {
          file: "permissionElementRegistrationFailed.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "TypeNotSupported":
        return {
          file: "permissionElementTypeNotSupported.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "InvalidTypeActivation":
        return {
          file: "permissionElementInvalidTypeActivation.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "SecurityChecksFailed":
        return {
          file: "permissionElementSecurityChecksFailed.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "ActivationDisabled": {
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
      case "GeolocationDeprecated":
        return {
          file: "permissionElementGeolocationDeprecated.md",
          links: []
        };
      case "InvalidDisplayStyle":
        return {
          file: "permissionElementInvalidDisplayStyle.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "NonOpaqueColor":
        return {
          file: "permissionElementNonOpaqueColor.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "LowContrast":
        return {
          file: "permissionElementLowContrast.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "FontSizeTooSmall":
        return {
          file: "permissionElementFontSizeTooSmall.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "FontSizeTooLarge":
        return {
          file: "permissionElementFontSizeTooLarge.md",
          substitutions: /* @__PURE__ */ new Map([
            ["PLACEHOLDER_Type", this.#issueDetails.type || ""]
          ]),
          links: []
        };
      case "InvalidSizeValue":
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
    return this.#issueDetails.isWarning ? "Improvement" : "PageError";
  }
  primaryKey() {
    return `${"PermissionElementIssue"}-${JSON.stringify(this.#issueDetails)}`;
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

// gen/front_end/models/issues_manager/QuirksModeIssue.js
var QuirksModeIssue_exports = {};
__export(QuirksModeIssue_exports, {
  QuirksModeIssue: () => QuirksModeIssue
});
import * as i18n29 from "./../../core/i18n/i18n.js";
var UIStrings16 = {
  /**
   * @description Link title for the Quirks Mode issue in the Issues panel
   */
  documentCompatibilityMode: "Document compatibility mode"
};
var str_15 = i18n29.i18n.registerUIStrings("models/issues_manager/QuirksModeIssue.ts", UIStrings16);
var i18nString8 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var QuirksModeIssue = class _QuirksModeIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const mode = issueDetails.isLimitedQuirksMode ? "LimitedQuirksMode" : "QuirksMode";
    const umaCode = ["QuirksModeIssue", mode].join("::");
    super({ code: "QuirksModeIssue", umaCode }, issueDetails, issuesModel);
  }
  primaryKey() {
    return `${this.code()}-(${this.details().documentNodeId})-(${this.details().url})`;
  }
  getCategory() {
    return "QuirksMode";
  }
  getDescription() {
    return {
      file: "CompatibilityModeQuirks.md",
      links: [
        {
          link: "https://web.dev/doctype/",
          linkTitle: i18nString8(UIStrings16.documentCompatibilityMode)
        }
      ]
    };
  }
  getKind() {
    return "Improvement";
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

// gen/front_end/models/issues_manager/SharedArrayBufferIssue.js
var SharedArrayBufferIssue_exports = {};
__export(SharedArrayBufferIssue_exports, {
  SharedArrayBufferIssue: () => SharedArrayBufferIssue
});
import * as i18n31 from "./../../core/i18n/i18n.js";
var UIStrings17 = {
  /**
   * @description Label for the link for SharedArrayBuffer Issues. The full text reads "Enabling `SharedArrayBuffer`"
   * and is the title of an article that describes how to enable a JavaScript feature called SharedArrayBuffer.
   */
  enablingSharedArrayBuffer: "Enabling `SharedArrayBuffer`"
};
var str_16 = i18n31.i18n.registerUIStrings("models/issues_manager/SharedArrayBufferIssue.ts", UIStrings17);
var i18nString9 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var SharedArrayBufferIssue = class _SharedArrayBufferIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const umaCode = ["SharedArrayBufferIssue", issueDetails.type].join("::");
    super({ code: "SharedArrayBufferIssue", umaCode }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    return {
      file: "sharedArrayBuffer.md",
      links: [{
        link: "https://developer.chrome.com/blog/enabling-shared-array-buffer/",
        linkTitle: i18nString9(UIStrings17.enablingSharedArrayBuffer)
      }]
    };
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    if (this.details().isWarning) {
      return "BreakingChange";
    }
    return "PageError";
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

// gen/front_end/models/issues_manager/IssueAggregator.js
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
  #issueKind = "Improvement";
  #lowContrastIssues = /* @__PURE__ */ new Set();
  #cookieDeprecationMetadataIssues = /* @__PURE__ */ new Set();
  #mixedContentIssues = /* @__PURE__ */ new Set();
  #partitioningBlobURLIssues = /* @__PURE__ */ new Set();
  #permissionElementIssues = /* @__PURE__ */ new Set();
  #sharedArrayBufferIssues = /* @__PURE__ */ new Set();
  #quirksModeIssues = /* @__PURE__ */ new Set();
  #attributionReportingIssues = /* @__PURE__ */ new Set();
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
  getLowContrastIssues() {
    return this.#lowContrastIssues;
  }
  requests() {
    return this.#affectedRequests.values();
  }
  getSharedArrayBufferIssues() {
    return this.#sharedArrayBufferIssues;
  }
  getQuirksModeIssues() {
    return this.#quirksModeIssues;
  }
  getAttributionReportingIssues() {
    return this.#attributionReportingIssues;
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
    return "Other";
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
    if (issue instanceof LowTextContrastIssue) {
      this.#lowContrastIssues.add(issue);
    }
    if (issue instanceof CorsIssue) {
      this.#corsIssues.add(issue);
    }
    if (issue instanceof QuirksModeIssue) {
      this.#quirksModeIssues.add(issue);
    }
    if (issue instanceof AttributionReportingIssue) {
      this.#attributionReportingIssues.add(issue);
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
var IssueAggregator = class extends Common4.ObjectWrapper.ObjectWrapper {
  issuesManager;
  #aggregatedIssuesByKey = /* @__PURE__ */ new Map();
  #hiddenAggregatedIssuesByKey = /* @__PURE__ */ new Map();
  constructor(issuesManager) {
    super();
    this.issuesManager = issuesManager;
    this.issuesManager.addEventListener("IssueAdded", this.#onIssueAdded, this);
    this.issuesManager.addEventListener("FullUpdateRequired", this.#onFullUpdateRequired, this);
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
  }
  #onIssueAdded(event) {
    this.#aggregateIssue(event.data.issue);
  }
  #onFullUpdateRequired() {
    this.#aggregatedIssuesByKey.clear();
    this.#hiddenAggregatedIssuesByKey.clear();
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
    this.dispatchEventToListeners(
      "FullUpdateRequired"
      /* Events.FULL_UPDATE_REQUIRED */
    );
  }
  #aggregateIssue(issue) {
    if (CookieIssue.isThirdPartyCookiePhaseoutRelatedIssue(issue)) {
      return;
    }
    const map = issue.isHidden() ? this.#hiddenAggregatedIssuesByKey : this.#aggregatedIssuesByKey;
    const aggregatedIssue = this.#aggregateIssueByStatus(map, issue);
    this.dispatchEventToListeners("AggregatedIssueUpdated", aggregatedIssue);
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

// gen/front_end/models/issues_manager/IssueResolver.js
var IssueResolver_exports = {};
__export(IssueResolver_exports, {
  IssueResolver: () => IssueResolver
});
import * as Common7 from "./../../core/common/common.js";

// gen/front_end/models/issues_manager/IssuesManager.js
var IssuesManager_exports = {};
__export(IssuesManager_exports, {
  IssuesManager: () => IssuesManager,
  createIssuesFromProtocolIssue: () => createIssuesFromProtocolIssue,
  defaultHideIssueByCodeSetting: () => defaultHideIssueByCodeSetting,
  getHideIssueByCodeSetting: () => getHideIssueByCodeSetting
});
import * as Common6 from "./../../core/common/common.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK4 from "./../../core/sdk/sdk.js";

// gen/front_end/models/issues_manager/BounceTrackingIssue.js
import * as i18n33 from "./../../core/i18n/i18n.js";
var UIStrings18 = {
  /**
   * @description Title for Bounce Tracking Mitigation explainer url link.
   */
  bounceTrackingMitigations: "Bounce tracking mitigations"
};
var str_17 = i18n33.i18n.registerUIStrings("models/issues_manager/BounceTrackingIssue.ts", UIStrings18);
var i18nString10 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var BounceTrackingIssue = class _BounceTrackingIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super("BounceTrackingIssue", issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    return {
      file: "bounceTrackingMitigations.md",
      links: [
        {
          link: "https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations",
          linkTitle: i18nString10(UIStrings18.bounceTrackingMitigations)
        }
      ]
    };
  }
  getKind() {
    return "BreakingChange";
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

// gen/front_end/models/issues_manager/FederatedAuthRequestIssue.js
import * as i18n35 from "./../../core/i18n/i18n.js";
var UIStrings19 = {
  /**
   * @description Title for Client Hint specification url link
   */
  fedCm: "Federated Credential Management API"
};
var str_18 = i18n35.i18n.registerUIStrings("models/issues_manager/FederatedAuthRequestIssue.ts", UIStrings19);
var i18nLazyString8 = i18n35.i18n.getLazilyComputedLocalizedString.bind(void 0, str_18);
var FederatedAuthRequestIssue = class _FederatedAuthRequestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super({
      code: "FederatedAuthRequestIssue",
      umaCode: [
        "FederatedAuthRequestIssue",
        issueDetails.federatedAuthRequestIssueReason
      ].join("::")
    }, issueDetails, issuesModel);
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    const description = issueDescriptions8.get(this.details().federatedAuthRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError";
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
var issueDescriptions8 = /* @__PURE__ */ new Map([
  [
    "TooManyRequests",
    {
      file: "federatedAuthRequestTooManyRequests.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ConfigHttpNotFound",
    {
      file: "federatedAuthRequestManifestHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ConfigNoResponse",
    {
      file: "federatedAuthRequestManifestNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ConfigInvalidResponse",
    {
      file: "federatedAuthRequestManifestInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ClientMetadataHttpNotFound",
    {
      file: "federatedAuthRequestClientMetadataHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ClientMetadataNoResponse",
    {
      file: "federatedAuthRequestClientMetadataNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ClientMetadataInvalidResponse",
    {
      file: "federatedAuthRequestClientMetadataInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ErrorFetchingSignin",
    {
      file: "federatedAuthRequestErrorFetchingSignin.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "InvalidSigninResponse",
    {
      file: "federatedAuthRequestInvalidSigninResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "AccountsHttpNotFound",
    {
      file: "federatedAuthRequestAccountsHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "AccountsNoResponse",
    {
      file: "federatedAuthRequestAccountsNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "AccountsInvalidResponse",
    {
      file: "federatedAuthRequestAccountsInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "IdTokenHttpNotFound",
    {
      file: "federatedAuthRequestIdTokenHttpNotFound.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "IdTokenNoResponse",
    {
      file: "federatedAuthRequestIdTokenNoResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "IdTokenInvalidResponse",
    {
      file: "federatedAuthRequestIdTokenInvalidResponse.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "IdTokenInvalidRequest",
    {
      file: "federatedAuthRequestIdTokenInvalidRequest.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "ErrorIdToken",
    {
      file: "federatedAuthRequestErrorIdToken.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ],
  [
    "Canceled",
    {
      file: "federatedAuthRequestCanceled.md",
      links: [{
        link: "https://fedidcg.github.io/FedCM/",
        linkTitle: i18nLazyString8(UIStrings19.fedCm)
      }]
    }
  ]
]);

// gen/front_end/models/issues_manager/PropertyRuleIssue.js
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
      case "InvalidInherits":
        return "inherits";
      case "InvalidInitialValue":
        return "initial-value";
      case "InvalidSyntax":
        return "syntax";
    }
    return "";
  }
  getDescription() {
    if (this.details().propertyRuleIssueReason === "InvalidName") {
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
    return "Other";
  }
  getKind() {
    return "PageError";
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

// gen/front_end/models/issues_manager/SharedDictionaryIssue.js
var SharedDictionaryIssue_exports = {};
__export(SharedDictionaryIssue_exports, {
  SharedDictionaryIssue: () => SharedDictionaryIssue
});
import * as i18n37 from "./../../core/i18n/i18n.js";
var UIStrings20 = {
  /**
   * @description Title for Compression Dictionary Transport specification url link
   */
  compressionDictionaryTransport: "Compression Dictionary Transport"
};
var str_19 = i18n37.i18n.registerUIStrings("models/issues_manager/SharedDictionaryIssue.ts", UIStrings20);
var i18nLazyString9 = i18n37.i18n.getLazilyComputedLocalizedString.bind(void 0, str_19);
function getIssueCode3(details) {
  switch (details.sharedDictionaryError) {
    case "UseErrorCrossOriginNoCorsRequest":
      return "SharedDictionaryIssue::UseErrorCrossOriginNoCorsRequest";
    case "UseErrorDictionaryLoadFailure":
      return "SharedDictionaryIssue::UseErrorDictionaryLoadFailure";
    case "UseErrorMatchingDictionaryNotUsed":
      return "SharedDictionaryIssue::UseErrorMatchingDictionaryNotUsed";
    case "UseErrorUnexpectedContentDictionaryHeader":
      return "SharedDictionaryIssue::UseErrorUnexpectedContentDictionaryHeader";
    case "WriteErrorCossOriginNoCorsRequest":
      return "SharedDictionaryIssue::WriteErrorCossOriginNoCorsRequest";
    case "WriteErrorDisallowedBySettings":
      return "SharedDictionaryIssue::WriteErrorDisallowedBySettings";
    case "WriteErrorExpiredResponse":
      return "SharedDictionaryIssue::WriteErrorExpiredResponse";
    case "WriteErrorFeatureDisabled":
      return "SharedDictionaryIssue::WriteErrorFeatureDisabled";
    case "WriteErrorInsufficientResources":
      return "SharedDictionaryIssue::WriteErrorInsufficientResources";
    case "WriteErrorInvalidMatchField":
      return "SharedDictionaryIssue::WriteErrorInvalidMatchField";
    case "WriteErrorInvalidStructuredHeader":
      return "SharedDictionaryIssue::WriteErrorInvalidStructuredHeader";
    case "WriteErrorInvalidTTLField":
      return "SharedDictionaryIssue::WriteErrorInvalidTTLField";
    case "WriteErrorNavigationRequest":
      return "SharedDictionaryIssue::WriteErrorNavigationRequest";
    case "WriteErrorNoMatchField":
      return "SharedDictionaryIssue::WriteErrorNoMatchField";
    case "WriteErrorNonIntegerTTLField":
      return "SharedDictionaryIssue::WriteErrorNonIntegerTTLField";
    case "WriteErrorNonListMatchDestField":
      return "SharedDictionaryIssue::WriteErrorNonListMatchDestField";
    case "WriteErrorNonSecureContext":
      return "SharedDictionaryIssue::WriteErrorNonSecureContext";
    case "WriteErrorNonStringIdField":
      return "SharedDictionaryIssue::WriteErrorNonStringIdField";
    case "WriteErrorNonStringInMatchDestList":
      return "SharedDictionaryIssue::WriteErrorNonStringInMatchDestList";
    case "WriteErrorNonStringMatchField":
      return "SharedDictionaryIssue::WriteErrorNonStringMatchField";
    case "WriteErrorNonTokenTypeField":
      return "SharedDictionaryIssue::WriteErrorNonTokenTypeField";
    case "WriteErrorRequestAborted":
      return "SharedDictionaryIssue::WriteErrorRequestAborted";
    case "WriteErrorShuttingDown":
      return "SharedDictionaryIssue::WriteErrorShuttingDown";
    case "WriteErrorTooLongIdField":
      return "SharedDictionaryIssue::WriteErrorTooLongIdField";
    case "WriteErrorUnsupportedType":
      return "SharedDictionaryIssue::WriteErrorUnsupportedType";
    default:
      return "SharedDictionaryIssue::WriteErrorUnknown";
  }
}
var SharedDictionaryIssue = class _SharedDictionaryIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super({
      code: getIssueCode3(issueDetails),
      umaCode: [
        "SharedDictionaryIssue",
        issueDetails.sharedDictionaryError
      ].join("::")
    }, issueDetails, issuesModel);
  }
  requests() {
    if (this.details().request) {
      return [this.details().request];
    }
    return [];
  }
  getCategory() {
    return "Other";
  }
  getDescription() {
    const description = issueDescriptions9.get(this.details().sharedDictionaryError);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }
  primaryKey() {
    return JSON.stringify(this.details());
  }
  getKind() {
    return "PageError";
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
  linkTitle: i18nLazyString9(UIStrings20.compressionDictionaryTransport)
}];
var issueDescriptions9 = /* @__PURE__ */ new Map([
  [
    "UseErrorCrossOriginNoCorsRequest",
    {
      file: "sharedDictionaryUseErrorCrossOriginNoCorsRequest.md",
      links: specLinks
    }
  ],
  [
    "UseErrorDictionaryLoadFailure",
    {
      file: "sharedDictionaryUseErrorDictionaryLoadFailure.md",
      links: specLinks
    }
  ],
  [
    "UseErrorMatchingDictionaryNotUsed",
    {
      file: "sharedDictionaryUseErrorMatchingDictionaryNotUsed.md",
      links: specLinks
    }
  ],
  [
    "UseErrorUnexpectedContentDictionaryHeader",
    {
      file: "sharedDictionaryUseErrorUnexpectedContentDictionaryHeader.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorCossOriginNoCorsRequest",
    {
      file: "sharedDictionaryWriteErrorCossOriginNoCorsRequest.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorDisallowedBySettings",
    {
      file: "sharedDictionaryWriteErrorDisallowedBySettings.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorExpiredResponse",
    {
      file: "sharedDictionaryWriteErrorExpiredResponse.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorFeatureDisabled",
    {
      file: "sharedDictionaryWriteErrorFeatureDisabled.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorInsufficientResources",
    {
      file: "sharedDictionaryWriteErrorInsufficientResources.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorInvalidMatchField",
    {
      file: "sharedDictionaryWriteErrorInvalidMatchField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorInvalidStructuredHeader",
    {
      file: "sharedDictionaryWriteErrorInvalidStructuredHeader.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorInvalidTTLField",
    {
      file: "sharedDictionaryWriteErrorInvalidTTLField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNavigationRequest",
    {
      file: "sharedDictionaryWriteErrorNavigationRequest.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNoMatchField",
    {
      file: "sharedDictionaryWriteErrorNoMatchField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonIntegerTTLField",
    {
      file: "sharedDictionaryWriteErrorNonIntegerTTLField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonListMatchDestField",
    {
      file: "sharedDictionaryWriteErrorNonListMatchDestField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonSecureContext",
    {
      file: "sharedDictionaryWriteErrorNonSecureContext.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonStringIdField",
    {
      file: "sharedDictionaryWriteErrorNonStringIdField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonStringInMatchDestList",
    {
      file: "sharedDictionaryWriteErrorNonStringInMatchDestList.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonStringMatchField",
    {
      file: "sharedDictionaryWriteErrorNonStringMatchField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorNonTokenTypeField",
    {
      file: "sharedDictionaryWriteErrorNonTokenTypeField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorRequestAborted",
    {
      file: "sharedDictionaryWriteErrorRequestAborted.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorShuttingDown",
    {
      file: "sharedDictionaryWriteErrorShuttingDown.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorTooLongIdField",
    {
      file: "sharedDictionaryWriteErrorTooLongIdField.md",
      links: specLinks
    }
  ],
  [
    "WriteErrorUnsupportedType",
    {
      file: "sharedDictionaryWriteErrorUnsupportedType.md",
      links: specLinks
    }
  ]
]);

// gen/front_end/models/issues_manager/SourceFrameIssuesManager.js
var SourceFrameIssuesManager_exports = {};
__export(SourceFrameIssuesManager_exports, {
  IssueMessage: () => IssueMessage,
  SourceFrameIssuesManager: () => SourceFrameIssuesManager
});
import * as Common5 from "./../../core/common/common.js";
import * as Bindings from "./../bindings/bindings.js";
import * as Workspace from "./../workspace/workspace.js";

// gen/front_end/models/issues_manager/StylesheetLoadingIssue.js
var StylesheetLoadingIssue_exports = {};
__export(StylesheetLoadingIssue_exports, {
  StylesheetLoadingIssue: () => StylesheetLoadingIssue,
  lateImportStylesheetLoadingCode: () => lateImportStylesheetLoadingCode
});
var lateImportStylesheetLoadingCode = [
  "StylesheetLoadingIssue",
  "LateImportRule"
].join("::");
var StylesheetLoadingIssue = class _StylesheetLoadingIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    const code = `${"StylesheetLoadingIssue"}::${issueDetails.styleSheetLoadingIssueReason}`;
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
      case "LateImportRule":
        return {
          file: "stylesheetLateImport.md",
          links: []
        };
      case "RequestFailed":
        return {
          file: "stylesheetRequestFailed.md",
          links: []
        };
    }
  }
  getCategory() {
    return "Other";
  }
  getKind() {
    return "PageError";
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

// gen/front_end/models/issues_manager/SourceFrameIssuesManager.js
var SourceFrameIssuesManager = class {
  issuesManager;
  #sourceFrameMessageManager = new Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageManager();
  constructor(issuesManager) {
    this.issuesManager = issuesManager;
    this.issuesManager.addEventListener("IssueAdded", this.#onIssueAdded, this);
    this.issuesManager.addEventListener("FullUpdateRequired", this.#onFullUpdateRequired, this);
  }
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
      void Common5.Revealer.reveal(issue);
    };
    this.#sourceFrameMessageManager.addMessage(new IssueMessage(messageText, issue.getKind(), clickHandler), {
      line: srcLocation.lineNumber,
      column: srcLocation.columnNumber ?? -1,
      url: srcLocation.url,
      scriptId: srcLocation.scriptId
    }, issuesModel.target());
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
    super("Issue", title, clickHandler);
    this.#kind = kind;
  }
  getIssueKind() {
    return this.#kind;
  }
};

// gen/front_end/models/issues_manager/SRIMessageSignatureIssue.js
var SRIMessageSignatureIssue_exports = {};
__export(SRIMessageSignatureIssue_exports, {
  SRIMessageSignatureIssue: () => SRIMessageSignatureIssue
});
import * as i18n39 from "./../../core/i18n/i18n.js";
var UIStrings21 = {
  /**
   * @description Title for HTTP Message Signatures specification url
   */
  httpMessageSignatures: "HTTP Message Signatures (RFC9421)",
  /**
   * @description Title for Signature-based Integrity specification url
   */
  signatureBasedIntegrity: "Signature-based Integrity"
};
var str_20 = i18n39.i18n.registerUIStrings("models/issues_manager/SRIMessageSignatureIssue.ts", UIStrings21);
var i18nLazyString10 = i18n39.i18n.getLazilyComputedLocalizedString.bind(void 0, str_20);
function generateGroupingIssueCode(details) {
  const issueCode = `${"SRIMessageSignatureIssue"}::${details.error}`;
  if (details.error === "ValidationFailedSignatureMismatch") {
    return issueCode + details.signatureBase;
  }
  if (details.error === "ValidationFailedIntegrityMismatch") {
    return issueCode + details.integrityAssertions.join();
  }
  return issueCode;
}
var SRIMessageSignatureIssue = class _SRIMessageSignatureIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super({
      code: generateGroupingIssueCode(issueDetails),
      umaCode: `${"SRIMessageSignatureIssue"}::${issueDetails.error}`
    }, issueDetails, issuesModel);
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
          linkTitle: i18nLazyString10(UIStrings21.httpMessageSignatures)
        },
        {
          link: "https://wicg.github.io/signature-based-sri/",
          linkTitle: i18nLazyString10(UIStrings21.signatureBasedIntegrity)
        }
      ],
      substitutions: /* @__PURE__ */ new Map()
    };
    if (details.error === "ValidationFailedSignatureMismatch") {
      description.substitutions?.set("PLACEHOLDER_signatureBase", () => details.signatureBase);
    }
    if (details.error === "ValidationFailedIntegrityMismatch") {
      description.substitutions?.set("PLACEHOLDER_integrityAssertions", () => {
        const prefix = "\n* ";
        return prefix + this.details().integrityAssertions.join(prefix);
      });
    }
    return resolveLazyDescription(description);
  }
  getCategory() {
    return "Other";
  }
  getKind() {
    return "PageError";
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

// gen/front_end/models/issues_manager/UnencodedDigestIssue.js
var UnencodedDigestIssue_exports = {};
__export(UnencodedDigestIssue_exports, {
  UnencodedDigestIssue: () => UnencodedDigestIssue
});
import * as i18n41 from "./../../core/i18n/i18n.js";
var UIStrings22 = {
  /**
   *@description Title for HTTP Unencoded Digest specification url
   */
  unencodedDigestHeader: "HTTP Unencoded Digest specification",
  /**
   *@description Title for the URL of the integration of unencoded-digest and SRI.
   */
  integrityIntegration: "Server-Initiated Integrity Checks"
};
var str_21 = i18n41.i18n.registerUIStrings("models/issues_manager/UnencodedDigestIssue.ts", UIStrings22);
var i18nLazyString11 = i18n41.i18n.getLazilyComputedLocalizedString.bind(void 0, str_21);
var UnencodedDigestIssue = class _UnencodedDigestIssue extends Issue {
  constructor(issueDetails, issuesModel) {
    super({
      code: `${"UnencodedDigestIssue"}::${issueDetails.error}`,
      umaCode: `${"UnencodedDigestIssue"}::${issueDetails.error}`
    }, issueDetails, issuesModel);
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
          linkTitle: i18nLazyString11(UIStrings22.unencodedDigestHeader)
        },
        {
          link: "https://wicg.github.io/signature-based-sri/#unencoded-digest-validation",
          linkTitle: i18nLazyString11(UIStrings22.integrityIntegration)
        }
      ]
    };
    return resolveLazyDescription(description);
  }
  getCategory() {
    return "Other";
  }
  getKind() {
    return "PageError";
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

// gen/front_end/models/issues_manager/IssuesManager.js
var issuesManagerInstance = null;
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
var issueCodeHandlers = /* @__PURE__ */ new Map([
  [
    "CookieIssue",
    CookieIssue.fromInspectorIssue
  ],
  [
    "MixedContentIssue",
    MixedContentIssue.fromInspectorIssue
  ],
  [
    "HeavyAdIssue",
    HeavyAdIssue.fromInspectorIssue
  ],
  [
    "ContentSecurityPolicyIssue",
    ContentSecurityPolicyIssue.fromInspectorIssue
  ],
  ["BlockedByResponseIssue", createIssuesForBlockedByResponseIssue],
  [
    "SharedArrayBufferIssue",
    SharedArrayBufferIssue.fromInspectorIssue
  ],
  [
    "SharedDictionaryIssue",
    SharedDictionaryIssue.fromInspectorIssue
  ],
  [
    "LowTextContrastIssue",
    LowTextContrastIssue.fromInspectorIssue
  ],
  [
    "CorsIssue",
    CorsIssue.fromInspectorIssue
  ],
  [
    "QuirksModeIssue",
    QuirksModeIssue.fromInspectorIssue
  ],
  [
    "AttributionReportingIssue",
    AttributionReportingIssue.fromInspectorIssue
  ],
  [
    "GenericIssue",
    GenericIssue.fromInspectorIssue
  ],
  [
    "DeprecationIssue",
    DeprecationIssue.fromInspectorIssue
  ],
  [
    "ClientHintIssue",
    ClientHintIssue.fromInspectorIssue
  ],
  [
    "FederatedAuthRequestIssue",
    FederatedAuthRequestIssue.fromInspectorIssue
  ],
  [
    "BounceTrackingIssue",
    BounceTrackingIssue.fromInspectorIssue
  ],
  [
    "StylesheetLoadingIssue",
    StylesheetLoadingIssue.fromInspectorIssue
  ],
  [
    "PartitioningBlobURLIssue",
    PartitioningBlobURLIssue.fromInspectorIssue
  ],
  [
    "PropertyRuleIssue",
    PropertyRuleIssue.fromInspectorIssue
  ],
  [
    "CookieDeprecationMetadataIssue",
    CookieDeprecationMetadataIssue.fromInspectorIssue
  ],
  [
    "ElementAccessibilityIssue",
    ElementAccessibilityIssue.fromInspectorIssue
  ],
  [
    "SRIMessageSignatureIssue",
    SRIMessageSignatureIssue.fromInspectorIssue
  ],
  [
    "UnencodedDigestIssue",
    UnencodedDigestIssue.fromInspectorIssue
  ],
  [
    "PermissionElementIssue",
    PermissionElementIssue.fromInspectorIssue
  ]
]);
function createIssuesFromProtocolIssue(issuesModel, inspectorIssue) {
  const handler = issueCodeHandlers.get(inspectorIssue.code);
  if (handler) {
    return handler(issuesModel, inspectorIssue);
  }
  console.warn(`No handler registered for issue code ${inspectorIssue.code}`);
  return [];
}
function defaultHideIssueByCodeSetting() {
  const setting = {};
  return setting;
}
function getHideIssueByCodeSetting() {
  return Common6.Settings.Settings.instance().createSetting("hide-issue-by-code-setting-experiment-2021", defaultHideIssueByCodeSetting());
}
var IssuesManager = class _IssuesManager extends Common6.ObjectWrapper.ObjectWrapper {
  showThirdPartyIssuesSetting;
  hideIssueSetting;
  #eventListeners = /* @__PURE__ */ new WeakMap();
  #allIssues = /* @__PURE__ */ new Map();
  #filteredIssues = /* @__PURE__ */ new Map();
  #issueCounts = /* @__PURE__ */ new Map();
  #hiddenIssueCount = /* @__PURE__ */ new Map();
  #thirdPartyCookiePhaseoutIssueCount = /* @__PURE__ */ new Map();
  #issuesById = /* @__PURE__ */ new Map();
  #issuesByOutermostTarget = /* @__PURE__ */ new Map();
  #thirdPartyCookiePhaseoutIssueMessageSent = false;
  constructor(showThirdPartyIssuesSetting, hideIssueSetting) {
    super();
    this.showThirdPartyIssuesSetting = showThirdPartyIssuesSetting;
    this.hideIssueSetting = hideIssueSetting;
    new SourceFrameIssuesManager(this);
    SDK4.TargetManager.TargetManager.instance().observeModels(SDK4.IssuesModel.IssuesModel, this);
    SDK4.TargetManager.TargetManager.instance().addModelListener(SDK4.ResourceTreeModel.ResourceTreeModel, SDK4.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    SDK4.FrameManager.FrameManager.instance().addEventListener("FrameAddedToTarget", this.#onFrameAddedToTarget, this);
    this.showThirdPartyIssuesSetting?.addChangeListener(() => this.#updateFilteredIssues());
    this.hideIssueSetting?.addChangeListener(() => this.#updateFilteredIssues());
    SDK4.TargetManager.TargetManager.instance().observeTargets({
      targetAdded: (target) => {
        if (target.outermostTarget() === target) {
          this.#updateFilteredIssues();
        }
      },
      targetRemoved: (_) => {
      }
    }, { scoped: true });
  }
  static instance(opts = {
    forceNew: false,
    ensureFirst: false
  }) {
    if (issuesManagerInstance && opts.ensureFirst) {
      throw new Error('IssuesManager was already created. Either set "ensureFirst" to false or make sure that this invocation is really the first one.');
    }
    if (!issuesManagerInstance || opts.forceNew) {
      issuesManagerInstance = new _IssuesManager(opts.showThirdPartyIssuesSetting, opts.hideIssueSetting);
    }
    return issuesManagerInstance;
  }
  static removeInstance() {
    issuesManagerInstance = null;
  }
  #onPrimaryPageChanged(event) {
    const { frame, type } = event.data;
    const keptIssues = /* @__PURE__ */ new Map();
    for (const [key, issue] of this.#allIssues.entries()) {
      if (issue.isAssociatedWithRequestId(frame.loaderId)) {
        keptIssues.set(key, issue);
      } else if (type === "Activation" && frame.resourceTreeModel().target() === issue.model()?.target()) {
        keptIssues.set(key, issue);
      } else if (issue.code() === "BounceTrackingIssue" || issue.code() === "CookieIssue") {
        const networkManager = frame.resourceTreeModel().target().model(SDK4.NetworkManager.NetworkManager);
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
    if (frame.isOutermostFrame() && SDK4.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      this.#updateFilteredIssues();
    }
  }
  modelAdded(issuesModel) {
    const listener = issuesModel.addEventListener("IssueAdded", this.#onIssueAddedEvent, this);
    this.#eventListeners.set(issuesModel, listener);
  }
  modelRemoved(issuesModel) {
    const listener = this.#eventListeners.get(issuesModel);
    if (listener) {
      Common6.EventTarget.removeEventListeners([listener]);
    }
  }
  #onIssueAddedEvent(event) {
    const { issuesModel, inspectorIssue } = event.data;
    const isPrivacyUiEnabled = Root2.Runtime.hostConfig.devToolsPrivacyUI?.enabled;
    const issues = createIssuesFromProtocolIssue(issuesModel, inspectorIssue);
    for (const issue of issues) {
      this.addIssue(issuesModel, issue);
      const message = issue.maybeCreateConsoleMessage();
      if (!message) {
        continue;
      }
      const is3rdPartyCookiePhaseoutIssue = CookieIssue.getSubCategory(issue.code()) === "ThirdPartyPhaseoutCookie";
      if (!is3rdPartyCookiePhaseoutIssue || !isPrivacyUiEnabled || !this.#thirdPartyCookiePhaseoutIssueMessageSent) {
        issuesModel.target().model(SDK4.ConsoleModel.ConsoleModel)?.addMessage(message);
      }
      if (is3rdPartyCookiePhaseoutIssue && isPrivacyUiEnabled) {
        this.#thirdPartyCookiePhaseoutIssueMessageSent = true;
      }
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
        this.#thirdPartyCookiePhaseoutIssueCount.set(issue.getKind(), 1 + (this.#thirdPartyCookiePhaseoutIssueCount.get(issue.getKind()) || 0));
      } else if (issue.isHidden()) {
        this.#hiddenIssueCount.set(issue.getKind(), 1 + (this.#hiddenIssueCount.get(issue.getKind()) || 0));
      }
      this.dispatchEventToListeners("IssueAdded", { issuesModel, issue });
    }
    this.dispatchEventToListeners(
      "IssuesCountUpdated"
      /* Events.ISSUES_COUNT_UPDATED */
    );
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
    const scopeTarget = SDK4.TargetManager.TargetManager.instance().scopeTarget();
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
      if (values[code] === "Hidden") {
        issue.setHidden(true);
        return;
      }
      issue.setHidden(false);
      return;
    }
  }
  #updateFilteredIssues() {
    this.#filteredIssues.clear();
    this.#issueCounts.clear();
    this.#issuesById.clear();
    this.#hiddenIssueCount.clear();
    this.#thirdPartyCookiePhaseoutIssueCount.clear();
    this.#thirdPartyCookiePhaseoutIssueMessageSent = false;
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
    this.dispatchEventToListeners(
      "FullUpdateRequired"
      /* Events.FULL_UPDATE_REQUIRED */
    );
    this.dispatchEventToListeners(
      "IssuesCountUpdated"
      /* Events.ISSUES_COUNT_UPDATED */
    );
  }
  unhideAllIssues() {
    for (const issue of this.#allIssues.values()) {
      issue.setHidden(false);
    }
    this.hideIssueSetting?.set(defaultHideIssueByCodeSetting());
  }
  getIssueById(id) {
    return this.#issuesById.get(id);
  }
};
globalThis.addIssueForTest = (issue) => {
  const mainTarget = SDK4.TargetManager.TargetManager.instance().primaryPageTarget();
  const issuesModel = mainTarget?.model(SDK4.IssuesModel.IssuesModel);
  issuesModel?.issueAdded({ issue });
};

// gen/front_end/models/issues_manager/IssueResolver.js
var IssueResolver = class extends Common7.ResolverBase.ResolverBase {
  #issuesListener = null;
  #issuesManager;
  constructor(issuesManager = IssuesManager.instance()) {
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
    this.#issuesListener = this.#issuesManager.addEventListener("IssueAdded", this.#onIssueAdded, this);
  }
  stopListening() {
    if (!this.#issuesListener) {
      return;
    }
    Common7.EventTarget.removeEventListeners([this.#issuesListener]);
    this.#issuesListener = null;
  }
};

// gen/front_end/models/issues_manager/RelatedIssue.js
var RelatedIssue_exports = {};
__export(RelatedIssue_exports, {
  hasIssueOfCategory: () => hasIssueOfCategory,
  hasIssues: () => hasIssues,
  hasThirdPartyPhaseoutCookieIssue: () => hasThirdPartyPhaseoutCookieIssue,
  hasThirdPartyPhaseoutCookieIssueForDomain: () => hasThirdPartyPhaseoutCookieIssueForDomain,
  issuesAssociatedWith: () => issuesAssociatedWith,
  reveal: () => reveal
});
import * as Common8 from "./../../core/common/common.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
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
  if (obj instanceof SDK5.NetworkRequest.NetworkRequest) {
    return issuesAssociatedWithNetworkRequest(issues, obj);
  }
  if (obj instanceof SDK5.Cookie.Cookie) {
    return issuesAssociatedWithCookie(issues, obj.domain(), obj.name(), obj.path());
  }
  throw new Error(`issues can not be associated with ${JSON.stringify(obj)}`);
}
function hasIssues(obj) {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).length > 0;
}
function hasIssueOfCategory(obj, category) {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).some((issue) => issue.getCategory() === category);
}
function hasThirdPartyPhaseoutCookieIssue(obj) {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).some(
    (issue) => CookieIssue.getSubCategory(issue.code()) === "ThirdPartyPhaseoutCookie"
    /* CookieIssueSubCategory.THIRD_PARTY_PHASEOUT_COOKIE */
  );
}
function hasThirdPartyPhaseoutCookieIssueForDomain(domain) {
  const issues = Array.from(IssuesManager.instance().issues());
  const issuesForDomain = issues.filter((issue) => Array.from(issue.cookies()).some((cookie) => cookie.domain === domain));
  return issuesForDomain.some(
    (issue) => CookieIssue.getSubCategory(issue.code()) === "ThirdPartyPhaseoutCookie"
    /* CookieIssueSubCategory.THIRD_PARTY_PHASEOUT_COOKIE */
  );
}
async function reveal(obj, category) {
  if (typeof obj === "string") {
    const issue = IssuesManager.instance().getIssueById(obj);
    if (issue) {
      return await Common8.Revealer.reveal(issue);
    }
  }
  const issues = Array.from(IssuesManager.instance().issues());
  const candidates = issuesAssociatedWith(issues, obj).filter((issue) => !category || issue.getCategory() === category);
  if (candidates.length > 0) {
    return await Common8.Revealer.reveal(candidates[0]);
  }
}
export {
  AttributionReportingIssue_exports as AttributionReportingIssue,
  CheckFormsIssuesTrigger_exports as CheckFormsIssuesTrigger,
  ClientHintIssue_exports as ClientHintIssue,
  ContentSecurityPolicyIssue_exports as ContentSecurityPolicyIssue,
  ContrastCheckTrigger_exports as ContrastCheckTrigger,
  CookieDeprecationMetadataIssue_exports as CookieDeprecationMetadataIssue,
  CookieIssue_exports as CookieIssue,
  CorsIssue_exports as CorsIssue,
  CrossOriginEmbedderPolicyIssue_exports as CrossOriginEmbedderPolicyIssue,
  DeprecationIssue_exports as DeprecationIssue,
  ElementAccessibilityIssue_exports as ElementAccessibilityIssue,
  FederatedAuthUserInfoRequestIssue_exports as FederatedAuthUserInfoRequestIssue,
  GenericIssue_exports as GenericIssue,
  HeavyAdIssue_exports as HeavyAdIssue,
  Issue_exports as Issue,
  IssueAggregator_exports as IssueAggregator,
  IssueResolver_exports as IssueResolver,
  IssuesManager_exports as IssuesManager,
  LowTextContrastIssue_exports as LowTextContrastIssue,
  MarkdownIssueDescription_exports as MarkdownIssueDescription,
  MixedContentIssue_exports as MixedContentIssue,
  PartitioningBlobURLIssue_exports as PartitioningBlobURLIssue,
  PermissionElementIssue_exports as PermissionElementIssue,
  PropertyRuleIssue_exports as PropertyRuleIssue,
  QuirksModeIssue_exports as QuirksModeIssue,
  RelatedIssue_exports as RelatedIssue,
  SRIMessageSignatureIssue_exports as SRIMessageSignatureIssue,
  SharedArrayBufferIssue_exports as SharedArrayBufferIssue,
  SharedDictionaryIssue_exports as SharedDictionaryIssue,
  SourceFrameIssuesManager_exports as SourceFrameIssuesManager,
  StylesheetLoadingIssue_exports as StylesheetLoadingIssue,
  UnencodedDigestIssue_exports as UnencodedDigestIssue
};
//# sourceMappingURL=issues_manager.js.map
