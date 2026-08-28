var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/ai_assistance/agents/AccessibilityAgent.ts
var AccessibilityAgent_exports = {};
__export(AccessibilityAgent_exports, {
  AccessibilityAgent: () => AccessibilityAgent
});
import * as Host27 from "../../core/host/host.js";
import * as i18n44 from "../../core/i18n/i18n.js";
import * as Root6 from "../../core/root/root.js";
import * as SDK19 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/AiUtils.ts
var AiUtils_exports = {};
__export(AiUtils_exports, {
  DisabledReason: () => DisabledReason,
  FrontendAccessPrecondition: () => FrontendAccessPrecondition,
  aiAssistanceEnabledSettingDescriptor: () => aiAssistanceEnabledSettingDescriptor,
  aiAssistanceV2OptInChangeDialogSeenSettingDescriptor: () => aiAssistanceV2OptInChangeDialogSeenSettingDescriptor,
  consoleInsightsEnabledSettingDescriptor: () => consoleInsightsEnabledSettingDescriptor,
  getDisabledReasons: () => getDisabledReasons,
  getIconName: () => getIconName,
  isContextSelectionEnabled: () => isContextSelectionEnabled,
  isGeminiBranding: () => isGeminiBranding,
  isSameOrigin: () => isSameOrigin,
  runOneShotPrompt: () => runOneShotPrompt
});
import * as Common from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as Root from "../../core/root/root.js";

// ../../front_end/models/ai_assistance/debug.ts
var debug_exports = {};
__export(debug_exports, {
  debugLog: () => debugLog,
  isDebugMode: () => isDebugMode,
  isStructuredLogEnabled: () => isStructuredLogEnabled
});
function isDebugMode() {
  return Boolean(localStorage.getItem("debugAiAssistancePanelEnabled"));
}
function isStructuredLogEnabled() {
  return Boolean(localStorage.getItem("aiAssistanceStructuredLogEnabled"));
}
function debugLog(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log(...log);
}
function setDebugAiAssistanceEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("debugAiAssistancePanelEnabled", "true");
  } else {
    localStorage.removeItem("debugAiAssistancePanelEnabled");
  }
  setAiAssistanceStructuredLogEnabled(enabled);
}
globalThis.setDebugAiAssistanceEnabled = setDebugAiAssistanceEnabled;
function setAiAssistanceStructuredLogEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("aiAssistanceStructuredLogEnabled", "true");
  } else {
    localStorage.removeItem("aiAssistanceStructuredLogEnabled");
  }
}
globalThis.setAiAssistanceStructuredLogEnabled = setAiAssistanceStructuredLogEnabled;

// ../../front_end/models/ai_assistance/AiUtils.ts
var DisabledReason = /* @__PURE__ */ ((DisabledReason2) => {
  DisabledReason2["GEO_RESTRICTED"] = "geo-restricted";
  DisabledReason2["POLICY_RESTRICTED"] = "policy-restricted";
  DisabledReason2["WRONG_LOCALE"] = "wrong-locale";
  DisabledReason2["NOT_SUPPORTED"] = "not-supported";
  return DisabledReason2;
})(DisabledReason || {});
function isLocaleRestricted() {
  try {
    const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
    return !devtoolsLocale.locale.startsWith("en-");
  } catch {
    return false;
  }
}
function isGeoRestricted(config) {
  return config?.aidaAvailability?.blockedByGeo === true;
}
function isPolicyRestricted(config) {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}
function isConsoleInsightsFeatureEnabled(config) {
  return config?.aidaAvailability?.enabled !== false && config?.devToolsConsoleInsights?.enabled === true;
}
var consoleInsightsEnabledSettingDescriptor = {
  name: "console-insights-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  isAvailable: (config) => {
    if (!isConsoleInsightsFeatureEnabled(config)) {
      return {
        status: Common.Settings.SettingAvailability.UNAVAILABLE,
        reason: ["not-supported" /* NOT_SUPPORTED */]
      };
    }
    const reasons = [];
    if (isGeoRestricted(config)) {
      reasons.push("geo-restricted" /* GEO_RESTRICTED */);
    }
    if (isPolicyRestricted(config)) {
      reasons.push("policy-restricted" /* POLICY_RESTRICTED */);
    }
    if (isLocaleRestricted()) {
      reasons.push("wrong-locale" /* WRONG_LOCALE */);
    }
    if (reasons.length > 0) {
      return {
        status: Common.Settings.SettingAvailability.DISABLED,
        reason: reasons
      };
    }
    return {
      status: Common.Settings.SettingAvailability.AVAILABLE
    };
  }
};
function isAiAssistanceFeatureAvailable(config) {
  return Boolean(config?.aidaAvailability?.enabled && (config?.devToolsFreestyler?.enabled || config?.devToolsAiAssistanceNetworkAgent?.enabled || config?.devToolsAiAssistancePerformanceAgent?.enabled || config?.devToolsAiAssistanceFileAgent?.enabled || config?.devToolsAiAssistanceStorageAgent?.enabled));
}
var aiAssistanceEnabledSettingDescriptor = {
  name: "ai-assistance-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  isAvailable: (config) => {
    if (!isAiAssistanceFeatureAvailable(config)) {
      return {
        status: Common.Settings.SettingAvailability.UNAVAILABLE,
        reason: ["not-supported" /* NOT_SUPPORTED */]
      };
    }
    const reasons = [];
    if (isGeoRestricted(config)) {
      reasons.push("geo-restricted" /* GEO_RESTRICTED */);
    }
    if (isPolicyRestricted(config)) {
      reasons.push("policy-restricted" /* POLICY_RESTRICTED */);
    }
    if (isLocaleRestricted()) {
      reasons.push("wrong-locale" /* WRONG_LOCALE */);
    }
    if (reasons.length > 0) {
      return {
        status: Common.Settings.SettingAvailability.DISABLED,
        reason: reasons
      };
    }
    return {
      status: Common.Settings.SettingAvailability.AVAILABLE
    };
  }
};
var aiAssistanceV2OptInChangeDialogSeenSettingDescriptor = {
  name: "ai-assistance-v2-opt-in-change-dialog-seen",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false
};
function isGeminiBranding() {
  return !!Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled;
}
function isContextSelectionEnabled() {
  return Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled) || Boolean(Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled);
}
var FrontendAccessPrecondition = /* @__PURE__ */ ((FrontendAccessPrecondition2) => {
  FrontendAccessPrecondition2["IS_OFF_THE_RECORD"] = "is-off-the-record";
  FrontendAccessPrecondition2["AGE_RESTRICTED"] = "age-restricted";
  return FrontendAccessPrecondition2;
})(FrontendAccessPrecondition || {});
function getDisabledReasons(aidaAvailability) {
  const reasons = [];
  if (Root.Runtime.hostConfig.isOffTheRecord) {
    reasons.push("is-off-the-record" /* IS_OFF_THE_RECORD */);
  }
  if (aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    reasons.push(aidaAvailability);
  }
  if ((aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE || aidaAvailability === Host.AidaClient.AidaAccessPreconditions.NO_INTERNET) && Root.Runtime.hostConfig?.aidaAvailability?.blockedByAge === true) {
    reasons.push("age-restricted" /* AGE_RESTRICTED */);
  }
  return reasons;
}
function getIconName() {
  return isGeminiBranding() ? "spark" : "smart-assistant";
}
function isSameOrigin(url1, url2) {
  if (url1.startsWith("data:") || url2.startsWith("data:")) {
    return url1 === url2;
  }
  const origin1 = Common.ParsedURL.ParsedURL.extractOrigin(url1);
  const origin2 = Common.ParsedURL.ParsedURL.extractOrigin(url2);
  return origin1 !== "" && origin1 === origin2;
}
async function runOneShotPrompt({
  aidaClient,
  preamble: preamble10,
  query,
  clientFeature,
  temperature,
  modelId,
  userTier,
  serverSideLoggingEnabled,
  signal
}) {
  const chromeVersion = Root.Runtime.getChromeVersion();
  if (!chromeVersion) {
    throw new Error("Cannot determine Chrome version");
  }
  const disallowLogging = !serverSideLoggingEnabled;
  const sessionId = crypto.randomUUID();
  const userTierEnum = Host.AidaClient.convertToUserTierEnum(userTier);
  const finalPreamble = userTierEnum === Host.AidaClient.UserTier.TESTERS ? preamble10 : void 0;
  const request = {
    client: Host.AidaClient.CLIENT_NAME,
    current_message: {
      parts: [{ text: query }],
      role: Host.AidaClient.Role.USER
    },
    preamble: finalPreamble,
    options: {
      temperature: typeof temperature === "number" && temperature >= 0 ? temperature : void 0,
      model_id: modelId || void 0
    },
    metadata: {
      disable_user_content_logging: disallowLogging,
      string_session_id: sessionId,
      user_tier: userTierEnum,
      client_version: chromeVersion
    },
    functionality_type: Host.AidaClient.FunctionalityType.CHAT,
    client_feature: clientFeature
  };
  let textResponse = "";
  try {
    for await (const response of aidaClient.doConversation(request, { signal })) {
      if (response.explanation) {
        textResponse = response.explanation;
      }
    }
  } catch (err) {
    debugLog("Error calling AIDA for one-shot prompt", err);
    throw err;
  }
  return textResponse;
}

// ../../front_end/models/ai_assistance/ChangeManager.ts
var ChangeManager_exports = {};
__export(ChangeManager_exports, {
  ChangeManager: () => ChangeManager
});
import * as Common2 from "../../core/common/common.js";
import * as Platform from "../../core/platform/platform.js";
import * as SDK from "../../core/sdk/sdk.js";
function formatStyles(styles, indent = 2) {
  const lines = Object.entries(styles).map(([key, value]) => `${" ".repeat(indent)}${key}: ${value};`);
  return lines.join("\n");
}
var ChangeManager = class {
  #targetManager;
  #stylesheetMutex = new Common2.Mutex.Mutex();
  #cssModelToStylesheetId = /* @__PURE__ */ new Map();
  #stylesheetChanges = /* @__PURE__ */ new Map();
  // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
  constructor(targetManager = SDK.TargetManager.TargetManager.instance()) {
    this.#targetManager = targetManager;
    this.#targetManager.addModelListener(
      SDK.ResourceTreeModel.ResourceTreeModel,
      SDK.ResourceTreeModel.Events.PrimaryPageChanged,
      this.clear,
      this
    );
  }
  dispose() {
    this.#targetManager.removeModelListener(
      SDK.ResourceTreeModel.ResourceTreeModel,
      SDK.ResourceTreeModel.Events.PrimaryPageChanged,
      this.clear,
      this
    );
    for (const cssModel of this.#cssModelToStylesheetId.keys()) {
      cssModel.removeEventListener(SDK.CSSModel.Events.ModelDisposed, this.#onCssModelDisposed, this);
    }
    this.#cssModelToStylesheetId.clear();
    this.#stylesheetChanges.clear();
  }
  async clear() {
    const models = Array.from(this.#cssModelToStylesheetId.keys());
    const results = await Promise.allSettled(models.map(async (model) => {
      await this.#onCssModelDisposed({ data: model });
    }));
    this.#cssModelToStylesheetId.clear();
    this.#stylesheetChanges.clear();
    const firstFailed = results.find((result) => result.status === "rejected");
    if (firstFailed) {
      console.error(firstFailed.reason);
    }
  }
  async addChange(cssModel, frameId, change) {
    const stylesheetId = await this.#getStylesheet(cssModel, frameId);
    const changes = this.#stylesheetChanges.get(stylesheetId) || [];
    const existingChange = changes.find((c) => c.className === change.className);
    const stylesKebab = Platform.StringUtilities.toKebabCaseKeys(change.styles);
    if (existingChange) {
      Object.assign(existingChange.styles, stylesKebab);
      existingChange.groupId = change.groupId;
    } else {
      changes.push({
        ...change,
        styles: stylesKebab
      });
    }
    const content = this.#formatChangesForInspectorStylesheet(changes);
    await cssModel.setStyleSheetText(stylesheetId, content, true);
    this.#stylesheetChanges.set(stylesheetId, changes);
    return content;
  }
  #formatChangesForInspectorStylesheet(changes) {
    return changes.map((change) => {
      return `.${change.className} {
  ${change.selector}& {
${formatStyles(change.styles, 4)}
  }
}`;
    }).join("\n");
  }
  async #getStylesheet(cssModel, frameId) {
    return await this.#stylesheetMutex.run(async () => {
      let frameToStylesheet = this.#cssModelToStylesheetId.get(cssModel);
      if (!frameToStylesheet) {
        frameToStylesheet = /* @__PURE__ */ new Map();
        this.#cssModelToStylesheetId.set(cssModel, frameToStylesheet);
        cssModel.addEventListener(SDK.CSSModel.Events.ModelDisposed, this.#onCssModelDisposed, this);
      }
      let stylesheetId = frameToStylesheet.get(frameId);
      if (!stylesheetId) {
        const styleSheetHeader = await cssModel.createInspectorStylesheet(
          frameId,
          /* force */
          true
        );
        if (!styleSheetHeader) {
          throw new Error("inspector-stylesheet is not found");
        }
        stylesheetId = styleSheetHeader.id;
        frameToStylesheet.set(frameId, stylesheetId);
      }
      return stylesheetId;
    });
  }
  async #onCssModelDisposed(event) {
    return await this.#stylesheetMutex.run(async () => {
      const cssModel = event.data;
      cssModel.removeEventListener(SDK.CSSModel.Events.ModelDisposed, this.#onCssModelDisposed, this);
      const stylesheetIds = Array.from(this.#cssModelToStylesheetId.get(cssModel)?.values() ?? []);
      const results = await Promise.allSettled(stylesheetIds.map(async (id) => {
        this.#stylesheetChanges.delete(id);
        await cssModel.setStyleSheetText(id, "", true);
      }));
      this.#cssModelToStylesheetId.delete(cssModel);
      const firstFailed = results.find((result) => result.status === "rejected");
      if (firstFailed) {
        throw new Error(firstFailed.reason);
      }
    });
  }
};

// ../../front_end/models/ai_assistance/data_formatters/LighthouseFormatter.ts
var LighthouseFormatter_exports = {};
__export(LighthouseFormatter_exports, {
  LighthouseFormatter: () => LighthouseFormatter
});

// ../../front_end/models/ai_assistance/data_formatters/UnitFormatters.ts
var UnitFormatters_exports = {};
__export(UnitFormatters_exports, {
  bytes: () => bytes,
  formatBytesToKb: () => formatBytesToKb,
  micros: () => micros,
  millis: () => millis,
  seconds: () => seconds
});
var defaultTimeFormatterOptions = {
  style: "unit",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
};
var defaultByteFormatterOptions = {
  style: "unit",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
};
var timeFormatters = {
  milli: new Intl.NumberFormat("en-US", {
    ...defaultTimeFormatterOptions,
    unit: "millisecond"
  }),
  milliWithPrecision: new Intl.NumberFormat("en-US", {
    ...defaultTimeFormatterOptions,
    maximumFractionDigits: 1,
    unit: "millisecond"
  }),
  second: new Intl.NumberFormat("en-US", {
    ...defaultTimeFormatterOptions,
    maximumFractionDigits: 1,
    unit: "second"
  }),
  micro: new Intl.NumberFormat("en-US", {
    ...defaultTimeFormatterOptions,
    unit: "microsecond"
  })
};
var byteFormatters = {
  bytes: new Intl.NumberFormat("en-US", {
    ...defaultByteFormatterOptions,
    // Don't need as much precision on bytes.
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    unit: "byte"
  }),
  kilobytes: new Intl.NumberFormat("en-US", {
    ...defaultByteFormatterOptions,
    unit: "kilobyte"
  }),
  kilobytesDecimal: new Intl.NumberFormat("en-US", {
    ...defaultByteFormatterOptions,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    unit: "kilobyte"
  }),
  kilobytesInteger: new Intl.NumberFormat("en-US", {
    ...defaultByteFormatterOptions,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    unit: "kilobyte"
  }),
  megabytes: new Intl.NumberFormat("en-US", {
    ...defaultByteFormatterOptions,
    unit: "megabyte"
  })
};
function numberIsTooLarge(x) {
  return !Number.isFinite(x) || x === Number.MAX_VALUE;
}
function seconds(x) {
  if (numberIsTooLarge(x)) {
    return "-";
  }
  if (x === 0) {
    return formatAndEnsureSpace(timeFormatters.second, x);
  }
  const asMilli = x * 1e3;
  if (asMilli < 1) {
    return micros(x * 1e6);
  }
  if (asMilli < 1e3) {
    return millis(asMilli);
  }
  return formatAndEnsureSpace(timeFormatters.second, x);
}
function millis(x) {
  if (numberIsTooLarge(x)) {
    return "-";
  }
  if (x < 1) {
    return formatAndEnsureSpace(timeFormatters.milliWithPrecision, x);
  }
  return formatAndEnsureSpace(timeFormatters.milli, x);
}
function micros(x) {
  if (numberIsTooLarge(x)) {
    return "-";
  }
  if (x < 100) {
    return formatAndEnsureSpace(timeFormatters.micro, x);
  }
  const asMilli = x / 1e3;
  return millis(asMilli);
}
function bytes(x) {
  if (x < 1e3) {
    return formatAndEnsureSpace(byteFormatters.bytes, x);
  }
  const kilobytes = x / 1e3;
  if (kilobytes < 1e3) {
    return formatAndEnsureSpace(byteFormatters.kilobytes, kilobytes);
  }
  const megabytes = kilobytes / 1e3;
  return formatAndEnsureSpace(byteFormatters.megabytes, megabytes);
}
function formatBytesToKb(x) {
  const kilobytes = x / 1e3;
  if (kilobytes < 100) {
    return formatAndEnsureSpace(byteFormatters.kilobytesDecimal, kilobytes);
  }
  return formatAndEnsureSpace(byteFormatters.kilobytesInteger, kilobytes);
}
function formatAndEnsureSpace(formatter, value, separator = "\xA0") {
  const parts = formatter.formatToParts(value);
  let hasSpace = false;
  for (const part of parts) {
    if (part.type === "literal") {
      if (part.value === " ") {
        hasSpace = true;
        part.value = separator;
      } else if (part.value === separator) {
        hasSpace = true;
      }
    }
  }
  if (hasSpace) {
    return parts.map((part) => part.value).join("");
  }
  const unitIndex = parts.findIndex((part) => part.type === "unit");
  if (unitIndex === -1) {
    return parts.map((part) => part.value).join("");
  }
  if (unitIndex === 0) {
    return parts[0].value + separator + parts.slice(1).map((part) => part.value).join("");
  }
  return parts.slice(0, unitIndex).map((part) => part.value).join("") + separator + parts.slice(unitIndex).map((part) => part.value).join("");
}

// ../../front_end/models/ai_assistance/data_formatters/LighthouseFormatter.ts
var LighthouseFormatter = class {
  /**
   * Returns an overall summary and high-level overview of the Lighthouse report.
   */
  summary(report) {
    const lines = [];
    lines.push("# Lighthouse Report Summary");
    lines.push(`URL: ${report.finalDisplayedUrl}`);
    lines.push(`Fetch Time: ${report.fetchTime}`);
    lines.push(`Lighthouse Version: ${report.lighthouseVersion}`);
    lines.push("");
    lines.push("## Category Scores");
    for (const category of Object.values(report.categories)) {
      const score = category.score !== null ? Math.round(category.score * 100) : "n/a";
      lines.push(`- ${category.title}: ${score}`);
    }
    return lines.join("\n");
  }
  /**
   * Returns a markdown list of all audits in a given category.
   * Highlight failing audits (score < 90).
   */
  audits(report, categoryId) {
    const category = report.categories[categoryId];
    if (!category) {
      return `Category "${categoryId}" not found.`;
    }
    const lines = [];
    lines.push(`# Audits for ${category.title}`);
    if (category.description) {
      lines.push(`${category.description.replace(/\n/g, " ")}`);
    }
    lines.push("");
    const failingAudits = category.auditRefs.filter((ref) => {
      const audit = report.audits[ref.id];
      return audit && audit.score !== null && audit.score < 0.9;
    });
    if (failingAudits.length === 0) {
      lines.push("All audits in this category passed (score >= 90).");
      return lines.join("\n");
    }
    lines.push("The following audits in this category have a score below 90 and may need attention:");
    for (const ref of failingAudits) {
      const audit = report.audits[ref.id];
      if (!audit) {
        continue;
      }
      const score = audit.score !== null ? Math.round(audit.score * 100) : "n/a";
      let line = `- **${audit.title}**: ${score}`;
      if (audit.displayValue) {
        line += ` (${audit.displayValue})`;
      }
      lines.push(line);
      lines.push(`  * ${audit.description.replace(/\n/g, " ")}`);
      if (audit.details) {
        const formattedDetails = this.#formatDetails(audit.details);
        if (formattedDetails) {
          lines.push("");
          lines.push(formattedDetails.split("\n").map((l) => `    ${l}`).join("\n"));
        }
      }
    }
    return lines.join("\n");
  }
  #formatDetails(details) {
    switch (details.type) {
      case "table": {
        const lines = [];
        if (details.summary) {
          const summaryParts = [];
          if (details.summary.wastedMs) {
            summaryParts.push(`Wasted time: ${details.summary.wastedMs}ms`);
          }
          if (details.summary.wastedBytes) {
            summaryParts.push(`Wasted bytes: ${details.summary.wastedBytes}`);
          }
          if (summaryParts.length > 0) {
            lines.push(summaryParts.join("\n"));
          }
        }
        lines.push(this.#formatTable(details.headings, details.items));
        return lines.join("\n");
      }
      case "opportunity": {
        const lines = [];
        const summaryParts = [];
        if (details.overallSavingsMs) {
          summaryParts.push(`Potential savings: ${details.overallSavingsMs}ms`);
        }
        if (details.overallSavingsBytes) {
          summaryParts.push(`Potential savings: ${details.overallSavingsBytes} bytes`);
        }
        if (summaryParts.length > 0) {
          lines.push(summaryParts.join(", "));
        }
        lines.push(this.#formatTable(details.headings, details.items));
        return lines.join("\n");
      }
      default:
        return "";
    }
  }
  #formatTable(headings, items) {
    const lines = [];
    for (const item of items) {
      const itemLines = [];
      for (const heading of headings) {
        const value = item[heading.key];
        const formattedValues = this.#formatTableValues(value, heading.valueType);
        for (const { labelSuffix, value: v } of formattedValues) {
          const baseLabel = heading.label || heading.key;
          const label = labelSuffix ? `${baseLabel} ${labelSuffix}` : baseLabel;
          itemLines.push(`  * **${label}**: ${v}`);
        }
        const subItems = item.subItems;
        if (subItems && typeof subItems === "object" && "type" in subItems && subItems.type === "subitems" && heading.subItemsHeading) {
          for (const subItem of subItems.items) {
            const subValue = subItem[heading.subItemsHeading.key];
            if (subValue === value) {
              continue;
            }
            const formattedSubValues = this.#formatTableValues(subValue, heading.subItemsHeading.valueType);
            for (const { value: v } of formattedSubValues) {
              itemLines.push(`    * ${v}`);
            }
          }
        }
      }
      if (itemLines.length > 0) {
        lines.push(`- Item:`);
        lines.push(...itemLines);
      }
    }
    return lines.join("\n");
  }
  #formatTableValues(value, valueType) {
    if (value === void 0 || value === null) {
      return [];
    }
    if (typeof value === "string" || typeof value === "number") {
      return [{ value: this.#formatValue(value, valueType) }];
    }
    if (typeof value === "object" && "type" in value) {
      switch (value.type) {
        case "node": {
          const results = [];
          const label = value.nodeLabel || value.selector || value.snippet || "(node)";
          results.push({ value: label });
          if (value.selector && value.selector !== label) {
            results.push({ labelSuffix: "selector", value: value.selector });
          }
          if (value.path) {
            results.push({ labelSuffix: "path", value: value.path });
          }
          if (value.explanation) {
            results.push({ labelSuffix: "explanation", value: value.explanation.replace(/\n/g, " ") });
          }
          return results;
        }
        case "source-location": {
          const parts = [];
          if (value.url) {
            parts.push(value.url);
          }
          if (value.line) {
            parts.push(String(value.line));
          }
          if (value.column) {
            parts.push(String(value.column));
          }
          return [{ value: parts.join(":") }];
        }
      }
    }
    return [];
  }
  #formatValue(value, valueType) {
    if (typeof value === "string") {
      return value;
    }
    switch (valueType) {
      case "bytes": {
        return bytes(value);
      }
      case "timespanMs":
      case "ms": {
        return millis(value);
      }
      default:
        return String(value);
    }
  }
};

// ../../front_end/models/ai_assistance/ExtensionScope.ts
var ExtensionScope_exports = {};
__export(ExtensionScope_exports, {
  ExtensionScope: () => ExtensionScope
});
import * as Common3 from "../../core/common/common.js";
import * as Platform3 from "../../core/platform/platform.js";
import * as SDK4 from "../../core/sdk/sdk.js";

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
((Tracing4) => {
  let TraceConfigRecordMode;
  ((TraceConfigRecordMode2) => {
    TraceConfigRecordMode2["RecordUntilFull"] = "recordUntilFull";
    TraceConfigRecordMode2["RecordContinuously"] = "recordContinuously";
    TraceConfigRecordMode2["RecordAsMuchAsPossible"] = "recordAsMuchAsPossible";
    TraceConfigRecordMode2["EchoToConsole"] = "echoToConsole";
  })(TraceConfigRecordMode = Tracing4.TraceConfigRecordMode || (Tracing4.TraceConfigRecordMode = {}));
  let StreamFormat;
  ((StreamFormat2) => {
    StreamFormat2["Json"] = "json";
    StreamFormat2["Proto"] = "proto";
  })(StreamFormat = Tracing4.StreamFormat || (Tracing4.StreamFormat = {}));
  let StreamCompression;
  ((StreamCompression2) => {
    StreamCompression2["None"] = "none";
    StreamCompression2["Gzip"] = "gzip";
  })(StreamCompression = Tracing4.StreamCompression || (Tracing4.StreamCompression = {}));
  let MemoryDumpLevelOfDetail;
  ((MemoryDumpLevelOfDetail2) => {
    MemoryDumpLevelOfDetail2["Background"] = "background";
    MemoryDumpLevelOfDetail2["Light"] = "light";
    MemoryDumpLevelOfDetail2["Detailed"] = "detailed";
  })(MemoryDumpLevelOfDetail = Tracing4.MemoryDumpLevelOfDetail || (Tracing4.MemoryDumpLevelOfDetail = {}));
  let TracingBackend;
  ((TracingBackend2) => {
    TracingBackend2["Auto"] = "auto";
    TracingBackend2["Chrome"] = "chrome";
    TracingBackend2["System"] = "system";
  })(TracingBackend = Tracing4.TracingBackend || (Tracing4.TracingBackend = {}));
  let StartRequestTransferMode;
  ((StartRequestTransferMode2) => {
    StartRequestTransferMode2["ReportEvents"] = "ReportEvents";
    StartRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(StartRequestTransferMode = Tracing4.StartRequestTransferMode || (Tracing4.StartRequestTransferMode = {}));
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
var Runtime2;
((Runtime19) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime19.SerializationOptionsSerialization || (Runtime19.SerializationOptionsSerialization = {}));
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
  })(DeepSerializedValueType = Runtime19.DeepSerializedValueType || (Runtime19.DeepSerializedValueType = {}));
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
  })(RemoteObjectType = Runtime19.RemoteObjectType || (Runtime19.RemoteObjectType = {}));
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
  })(RemoteObjectSubtype = Runtime19.RemoteObjectSubtype || (Runtime19.RemoteObjectSubtype = {}));
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
  })(ObjectPreviewType = Runtime19.ObjectPreviewType || (Runtime19.ObjectPreviewType = {}));
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
  })(ObjectPreviewSubtype = Runtime19.ObjectPreviewSubtype || (Runtime19.ObjectPreviewSubtype = {}));
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
  })(PropertyPreviewType = Runtime19.PropertyPreviewType || (Runtime19.PropertyPreviewType = {}));
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
  })(PropertyPreviewSubtype = Runtime19.PropertyPreviewSubtype || (Runtime19.PropertyPreviewSubtype = {}));
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
  })(ConsoleAPICalledEventType = Runtime19.ConsoleAPICalledEventType || (Runtime19.ConsoleAPICalledEventType = {}));
})(Runtime2 || (Runtime2 = {}));

// ../../front_end/models/ai_assistance/agents/ExecuteJavascript.ts
import * as Host2 from "../../core/host/host.js";
import * as i18n2 from "../../core/i18n/i18n.js";
import * as Platform2 from "../../core/platform/platform.js";
import * as Root2 from "../../core/root/root.js";
import * as SDK3 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/EvaluateAction.ts
var EvaluateAction_exports = {};
__export(EvaluateAction_exports, {
  EvaluateAction: () => EvaluateAction,
  SideEffectError: () => SideEffectError,
  formatError: () => formatError,
  getErrorStackOnThePage: () => getErrorStackOnThePage,
  stringifyObjectOnThePage: () => stringifyObjectOnThePage,
  stringifyRemoteObject: () => stringifyRemoteObject
});
import * as SDK2 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/injected.ts
var injected_exports = {};
__export(injected_exports, {
  AI_ASSISTANCE_CSS_CLASS_NAME: () => AI_ASSISTANCE_CSS_CLASS_NAME,
  FREESTYLER_BINDING_NAME: () => FREESTYLER_BINDING_NAME,
  FREESTYLER_WORLD_CSP: () => FREESTYLER_WORLD_CSP,
  FREESTYLER_WORLD_NAME: () => FREESTYLER_WORLD_NAME,
  PAGE_EXPOSED_FUNCTIONS: () => PAGE_EXPOSED_FUNCTIONS,
  freestylerBinding: () => freestylerBinding,
  injectedFunctions: () => injectedFunctions
});
var AI_ASSISTANCE_CSS_CLASS_NAME = "ai-style-change";
var FREESTYLER_WORLD_NAME = "DevTools AI Assistance";
var FREESTYLER_WORLD_CSP = "connect-src 'none'";
var FREESTYLER_BINDING_NAME = "__freestyler";
function freestylerBindingFunc(bindingName) {
  const global = globalThis;
  if (!global.freestyler) {
    const freestyler = (args) => {
      const { resolve, reject, promise } = Promise.withResolvers();
      freestyler.callbacks.set(freestyler.id, {
        args: JSON.stringify(args),
        element: args.element,
        resolve,
        reject,
        error: args.error
      });
      globalThis[bindingName](String(freestyler.id));
      freestyler.id++;
      return promise;
    };
    freestyler.id = 1;
    freestyler.callbacks = /* @__PURE__ */ new Map();
    freestyler.getElement = (callbackId) => {
      return freestyler.callbacks.get(callbackId)?.element;
    };
    freestyler.getArgs = (callbackId) => {
      return freestyler.callbacks.get(callbackId)?.args;
    };
    freestyler.respond = (callbackId, styleChangesOrError) => {
      if (typeof styleChangesOrError === "string") {
        freestyler.callbacks.get(callbackId)?.resolve(styleChangesOrError);
      } else {
        const callback = freestyler.callbacks.get(callbackId);
        if (callback) {
          callback.error.message = styleChangesOrError.message;
          callback.reject(callback?.error);
        }
      }
      freestyler.callbacks.delete(callbackId);
    };
    global.freestyler = freestyler;
  }
}
var freestylerBinding = `(${String(freestylerBindingFunc)})('${FREESTYLER_BINDING_NAME}')`;
var PAGE_EXPOSED_FUNCTIONS = ["setElementStyles"];
var setupSetElementStyles = `function setupSetElementStyles(prefix) {
  const global = globalThis;
  async function setElementStyles(el, styles) {
    let selector = el.tagName.toLowerCase();
    if (el.id) {
      selector = '#' + el.id;
    } else if (el.classList.length) {
      const parts = [];
      for (const cls of el.classList) {
        if (cls.startsWith(prefix)) {
          continue;
        }
        parts.push('.' + cls);
      }
      if (parts.length) {
        selector = parts.join('');
      }
    }

    // __freestylerClassName is not exposed to the page due to this being
    // run in the isolated world.
    const className = el.__freestylerClassName ?? \`\${prefix}-\${global.freestyler.id}\`;
    el.__freestylerClassName = className;
    el.classList.add(className);

    // Remove inline styles with the same keys so that the edit applies.
    for (const key of Object.keys(styles)) {
      // if it's kebab case.
      el.style.removeProperty(key);
      // If it's camel case.
      el.style[key] = '';
    }

    const bindingError = new Error();

    const result = await global.freestyler({
      method: 'setElementStyles',
      selector,
      className,
      styles,
      element: el,
      error: bindingError,
    });

    const rootNode = el.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      const stylesheets = rootNode.adoptedStyleSheets;
      let hasAiStyleChange = false;
      let stylesheet = new CSSStyleSheet();
      for (let i = 0; i < stylesheets.length; i++) {
        const sheet = stylesheets[i];
        for (let j = 0; j < sheet.cssRules.length; j++) {
          const rule = sheet.cssRules[j];
          if (!(rule instanceof CSSStyleRule)) {
            continue;
          }

          hasAiStyleChange = rule.selectorText.startsWith(\`.\${prefix}\`);
          if (hasAiStyleChange) {
            stylesheet = sheet;
            break;
          }
        }
      }
      stylesheet.replaceSync(result);
      if (!hasAiStyleChange) {
        rootNode.adoptedStyleSheets = [...stylesheets, stylesheet];
      }
    }
  }

  global.setElementStyles = setElementStyles;
}`;
var injectedFunctions = `(${setupSetElementStyles})('${AI_ASSISTANCE_CSS_CLASS_NAME}')`;

// ../../front_end/models/ai_assistance/EvaluateAction.ts
function formatError(message) {
  return `Error: ${message}`;
}
var SideEffectError = class extends Error {
};
function getErrorStackOnThePage() {
  return { stack: "", message: this.message };
}
function stringifyObjectOnThePage() {
  const seenBefore = /* @__PURE__ */ new Map();
  return JSON.stringify(this, function replacer(key, value) {
    if (typeof value === "object" && value !== null) {
      if (seenBefore.has(value)) {
        return "(cycle)";
      }
      seenBefore.set(value, true);
    }
    if (value instanceof HTMLElement) {
      const idAttribute = value.id ? ` id="${value.id}"` : "";
      const classAttribute = value.classList.value ? ` class="${value.classList.value}"` : "";
      return `<${value.nodeName.toLowerCase()}${idAttribute}${classAttribute}>${value.hasChildNodes() ? "..." : ""}</${value.nodeName.toLowerCase()}>`;
    }
    if (this instanceof CSSStyleDeclaration) {
      if (!isNaN(Number(key))) {
        return void 0;
      }
    }
    return value;
  });
}
async function stringifyRemoteObject(object, functionDeclaration) {
  switch (object.type) {
    case Runtime2.RemoteObjectType.String:
      return `'${object.value}'`;
    case Runtime2.RemoteObjectType.Bigint:
      return `${object.value}n`;
    case Runtime2.RemoteObjectType.Boolean:
    case Runtime2.RemoteObjectType.Number:
      return `${object.value}`;
    case Runtime2.RemoteObjectType.Undefined:
      return "undefined";
    case Runtime2.RemoteObjectType.Symbol:
    case Runtime2.RemoteObjectType.Function:
      return `${object.description}`;
    case Runtime2.RemoteObjectType.Object: {
      if (object.subtype === "error") {
        const res2 = await object.callFunctionJSON(getErrorStackOnThePage, [], { throwOnSideEffect: true });
        if (!res2) {
          throw new Error("Could not stringify the object" + object);
        }
        return EvaluateAction.stringifyError(res2, functionDeclaration);
      }
      const res = await object.callFunction(stringifyObjectOnThePage, void 0, {
        throwOnSideEffect: true
      });
      if (!res.object || res.object.type !== Runtime2.RemoteObjectType.String) {
        throw new Error("Could not stringify the object" + object);
      }
      return res.object.value;
    }
    default:
      throw new Error("Unknown type to stringify " + object.type);
  }
}
var EvaluateAction = class _EvaluateAction {
  static async execute(functionDeclaration, args, executionContext, { throwOnSideEffect }) {
    if (executionContext.debuggerModel.selectedCallFrame()) {
      return formatError("Cannot evaluate JavaScript because the execution is paused on a breakpoint.");
    }
    const response = await executionContext.callFunctionOn({
      functionDeclaration,
      returnByValue: false,
      allowUnsafeEvalBlockedByCSP: false,
      throwOnSideEffect,
      userGesture: true,
      awaitPromise: true,
      arguments: args.map((remoteObject) => {
        return { objectId: remoteObject.objectId };
      })
    });
    try {
      if (!response) {
        throw new Error("Response is not found");
      }
      if ("error" in response) {
        return formatError(response.error);
      }
      if (response.exceptionDetails) {
        const exceptionDescription = response.exceptionDetails.exception?.description;
        if (SDK2.RuntimeModel.RuntimeModel.isSideEffectFailure(response)) {
          throw new SideEffectError(exceptionDescription);
        }
        return formatError(exceptionDescription ?? "JS exception");
      }
      return await stringifyRemoteObject(response.object, functionDeclaration);
    } finally {
      executionContext.runtimeModel.releaseEvaluationResult(response);
    }
  }
  static getExecutedLineFromStack(stack, pageExposedFunctions) {
    const lines = stack.split("\n");
    const stackLines = lines.map((curr) => curr.trim()).filter((trimmedLine) => {
      return trimmedLine.startsWith("at");
    });
    const selectedStack = stackLines.find((stackLine) => {
      const splittedStackLine = stackLine.split(" ");
      if (splittedStackLine.length < 2) {
        return false;
      }
      const signature = splittedStackLine[1] === "async" ? splittedStackLine[2] : (
        // if the stack line contains async the function name is the next element
        splittedStackLine[1]
      );
      const lastDotIndex = signature.lastIndexOf(".");
      const functionName = lastDotIndex !== -1 ? signature.substring(lastDotIndex + 1) : signature;
      return !pageExposedFunctions.includes(functionName);
    });
    if (!selectedStack) {
      return null;
    }
    const frameLocationRegex = /:(\d+)(?::\d+)?\)?$/;
    const match = selectedStack.match(frameLocationRegex);
    if (!match?.[1]) {
      return null;
    }
    const lineNum = parseInt(match[1], 10);
    if (isNaN(lineNum)) {
      return null;
    }
    return lineNum - 1;
  }
  static stringifyError(result, functionDeclaration) {
    if (!result.stack) {
      return `Error: ${result.message}`;
    }
    const lineNum = _EvaluateAction.getExecutedLineFromStack(result.stack, PAGE_EXPOSED_FUNCTIONS);
    if (!lineNum) {
      return `Error: ${result.message}`;
    }
    const functionLines = functionDeclaration.split("\n");
    const errorLine = functionLines[lineNum];
    if (!errorLine) {
      return `Error: ${result.message}`;
    }
    return `Error: executing the line "${errorLine.trim()}" failed with the following error:
${result.message}`;
  }
};

// ../../front_end/models/ai_assistance/agents/ExecuteJavascript.ts
var lockedString = i18n2.i18n.lockedString;
async function getOrCreateIsolatedWorld(target, frameId) {
  const pageAgent = target.pageAgent();
  const runtimeModel = target.model(SDK3.RuntimeModel.RuntimeModel);
  const { executionContextId } = await pageAgent.invoke_createIsolatedWorld({
    frameId,
    worldName: FREESTYLER_WORLD_NAME,
    contentSecurityPolicy: FREESTYLER_WORLD_CSP
  });
  const executionContext = runtimeModel?.executionContext(executionContextId);
  if (!executionContext) {
    throw new Error("Execution context is not found for executing code");
  }
  return executionContext;
}
async function executeJsCode(functionDeclaration, options) {
  const { contextNode, throwOnSideEffect } = options;
  if (!contextNode) {
    throw new Error("Cannot execute JavaScript because of missing context node");
  }
  const target = contextNode.domModel().target();
  if (!target) {
    throw new Error("Target is not found for executing code");
  }
  const resourceTreeModel = target.model(SDK3.ResourceTreeModel.ResourceTreeModel);
  const frameId = contextNode.frameId() ?? resourceTreeModel?.mainFrame?.id;
  if (!frameId) {
    throw new Error("Main frame is not found for executing code");
  }
  const executionContext = await getOrCreateIsolatedWorld(target, frameId);
  if (executionContext.debuggerModel.selectedCallFrame()) {
    return formatError("Cannot evaluate JavaScript because the execution is paused on a breakpoint.");
  }
  const remoteObject = await contextNode.resolveToObject(void 0, executionContext.id);
  if (!remoteObject) {
    throw new Error("Cannot execute JavaScript because remote object cannot be resolved");
  }
  return await EvaluateAction.execute(
    functionDeclaration,
    [remoteObject],
    executionContext,
    { throwOnSideEffect: !!throwOnSideEffect }
  );
}
var MAX_OBSERVATION_BYTE_LENGTH = 25e3;
var OBSERVATION_TIMEOUT = 5e3;
var JavascriptExecutor = class {
  #options;
  #execJs;
  constructor(options, execJs = executeJsCode) {
    this.#options = options;
    this.#execJs = execJs;
  }
  async executeAction(action, options) {
    if (options?.approved === false) {
      return {
        error: "Error: User denied code execution with side effects."
      };
    }
    if (this.#options.executionMode === Root2.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS) {
      return {
        error: "Error: JavaScript execution is currently disabled."
      };
    }
    const selectedNode = this.#options.getContextNode();
    if (!selectedNode) {
      return { error: "Error: no selected node found." };
    }
    const target = selectedNode.domModel().target();
    if (target.model(SDK3.DebuggerModel.DebuggerModel)?.selectedCallFrame()) {
      return {
        error: "Error: Cannot evaluate JavaScript because the execution is paused on a breakpoint."
      };
    }
    const scope = this.#options.createExtensionScope(this.#options.changes);
    await scope.install();
    try {
      let throwOnSideEffect = true;
      if (options?.approved) {
        throwOnSideEffect = false;
      }
      const result = await this.generateObservation(action, { throwOnSideEffect });
      if (result.sideEffect) {
        if (this.#options.executionMode === Root2.Runtime.HostConfigFreestylerExecutionMode.SIDE_EFFECT_FREE_SCRIPTS_ONLY) {
          return {
            error: "Error: JavaScript execution that modifies the page is currently disabled."
          };
        }
        if (options?.signal?.aborted) {
          return {
            error: "Error: evaluation has been cancelled"
          };
        }
        return {
          requiresApproval: true,
          description: lockedString("This code may modify page content. Continue?")
        };
      }
      if (result.canceled) {
        return {
          error: result.observation
        };
      }
      return {
        result: result.observation
      };
    } finally {
      await scope.uninstall();
    }
  }
  async generateObservation(action, {
    throwOnSideEffect
  }) {
    const functionDeclaration = `async function ($0) {
  try {
    ${action}
    ;
    return ((typeof data !== "undefined") ? data : undefined);
  } catch (error) {
    return error;
  }
}`;
    const timeoutSentinel = Symbol("timeout");
    const { promise: timeoutPromise, resolve: resolveTimeout } = Promise.withResolvers();
    let timeoutId;
    try {
      timeoutId = setTimeout(() => resolveTimeout(timeoutSentinel), OBSERVATION_TIMEOUT);
      const result = await Promise.race([
        this.#execJs(
          functionDeclaration,
          {
            throwOnSideEffect,
            contextNode: this.#options.getContextNode()
          }
        ),
        timeoutPromise
      ]);
      if (result === timeoutSentinel) {
        throw new Error("Script execution exceeded the maximum allowed time.");
      }
      const byteCount = Platform2.StringUtilities.countWtf8Bytes(result);
      Host2.userMetrics.freestylerEvalResponseSize(byteCount);
      if (byteCount > MAX_OBSERVATION_BYTE_LENGTH) {
        throw new Error("Output exceeded the maximum allowed length.");
      }
      return {
        observation: result,
        sideEffect: false,
        canceled: false
      };
    } catch (error) {
      if (error instanceof SideEffectError) {
        return {
          observation: error.message,
          sideEffect: true,
          canceled: false
        };
      }
      return {
        observation: `Error: ${error.message}`,
        sideEffect: false,
        canceled: false
      };
    } finally {
      if (timeoutId !== void 0) {
        clearTimeout(timeoutId);
      }
      resolveTimeout(timeoutSentinel);
    }
  }
};

// ../../front_end/models/ai_assistance/ExtensionScope.ts
var ExtensionScope = class _ExtensionScope {
  #listeners = [];
  #changeManager;
  #agentId;
  /** Don't use directly use the getter */
  #frameId;
  /** Don't use directly use the getter */
  #target;
  #bindingMutex = new Common3.Mutex.Mutex();
  constructor(changes, agentId, selectedNode) {
    this.#changeManager = changes;
    const frameId = selectedNode?.frameId();
    const target = selectedNode?.domModel().target();
    this.#agentId = agentId;
    this.#target = target;
    this.#frameId = frameId;
  }
  get target() {
    if (!this.#target) {
      throw new Error("Target is not found for executing code");
    }
    return this.#target;
  }
  get frameId() {
    if (this.#frameId) {
      return this.#frameId;
    }
    const resourceTreeModel = this.target.model(SDK4.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel?.mainFrame) {
      throw new Error("Main frame is not found for executing code");
    }
    return resourceTreeModel.mainFrame.id;
  }
  async install() {
    const isolatedWorldContext = await getOrCreateIsolatedWorld(this.target, this.frameId);
    const runtimeModel = this.target.model(SDK4.RuntimeModel.RuntimeModel);
    const handler = this.#bindingCalled.bind(this, isolatedWorldContext);
    runtimeModel?.addEventListener(SDK4.RuntimeModel.Events.BindingCalled, handler);
    this.#listeners.push(handler);
    await this.target.runtimeAgent().invoke_addBinding({
      name: FREESTYLER_BINDING_NAME,
      executionContextId: isolatedWorldContext.id
    });
    await this.#simpleEval(isolatedWorldContext, freestylerBinding);
    await this.#simpleEval(isolatedWorldContext, injectedFunctions);
  }
  async uninstall() {
    const runtimeModel = this.target.model(SDK4.RuntimeModel.RuntimeModel);
    for (const handler of this.#listeners) {
      runtimeModel?.removeEventListener(SDK4.RuntimeModel.Events.BindingCalled, handler);
    }
    this.#listeners = [];
    await this.target.runtimeAgent().invoke_removeBinding({
      name: FREESTYLER_BINDING_NAME
    });
  }
  async #simpleEval(context, expression, returnByValue = true) {
    const response = await context.evaluateWithSelectedFrameFallback(
      {
        expression,
        replMode: true,
        includeCommandLineAPI: false,
        returnByValue,
        silent: false,
        generatePreview: false,
        allowUnsafeEvalBlockedByCSP: true,
        throwOnSideEffect: false
      },
      /* userGesture */
      false,
      /* awaitPromise */
      true
    );
    if (!response) {
      throw new Error("Response is not found");
    }
    if ("error" in response) {
      throw new Error(response.error);
    }
    if (response.exceptionDetails) {
      const exceptionDescription = response.exceptionDetails.exception?.description;
      throw new Error(exceptionDescription || "JS exception");
    }
    return response;
  }
  static getStyleRuleFromMatchesStyles(matchedStyles) {
    for (const style of matchedStyles.nodeStyles()) {
      if (style.type === "Inline") {
        continue;
      }
      const rule = style.parentRule;
      if (rule?.origin === CSS.StyleSheetOrigin.UserAgent) {
        break;
      }
      if (rule instanceof SDK4.CSSRule.CSSStyleRule) {
        if (rule.nestingSelectors?.at(0)?.includes(AI_ASSISTANCE_CSS_CLASS_NAME) || rule.selectors.every((selector) => selector.text.includes(AI_ASSISTANCE_CSS_CLASS_NAME))) {
          continue;
        }
        return rule;
      }
    }
    return;
  }
  static getSelectorsFromStyleRule(styleRule, matchedStyles) {
    const selectorIndexes = matchedStyles.getMatchingSelectors(styleRule);
    const selectors = styleRule.selectors.filter((_, index) => selectorIndexes.includes(index)).filter((value) => !value.text.includes(AI_ASSISTANCE_CSS_CLASS_NAME)).filter(
      // Disallow star selector ending that targets any arbitrary element
      (value) => !value.text.endsWith("*") && // Disallow selector that contain star and don't have higher specificity
      // Example of disallowed: `div > * > p`
      // Example of allowed: `div > * > .header` OR `div > * > #header`
      !(value.text.includes("*") && value.specificity?.a === 0 && value.specificity?.b === 0)
    ).sort((a, b) => {
      if (!a.specificity) {
        return -1;
      }
      if (!b.specificity) {
        return 1;
      }
      if (b.specificity.a !== a.specificity.a) {
        return b.specificity.a - a.specificity.a;
      }
      if (b.specificity.b !== a.specificity.b) {
        return b.specificity.b - a.specificity.b;
      }
      return b.specificity.b - a.specificity.b;
    });
    const selector = selectors.at(0);
    if (!selector) {
      return "";
    }
    let cssSelector = selector.text.replaceAll(":visited", "");
    cssSelector = cssSelector.replaceAll("&", "");
    return cssSelector.trim();
  }
  static getSelectorForNode(node) {
    const simpleSelector = node.simpleSelector().split(".").filter((chunk) => {
      return !chunk.startsWith(AI_ASSISTANCE_CSS_CLASS_NAME);
    }).join(".");
    if (simpleSelector) {
      return simpleSelector;
    }
    return node.localName() || node.nodeName().toLowerCase();
  }
  async #computeContextFromElement(remoteObject) {
    if (!remoteObject.objectId) {
      throw new Error("DOMModel is not found");
    }
    const cssModel = this.target.model(SDK4.CSSModel.CSSModel);
    if (!cssModel) {
      throw new Error("CSSModel is not found");
    }
    const domModel = this.target.model(SDK4.DOMModel.DOMModel);
    if (!domModel) {
      throw new Error("DOMModel is not found");
    }
    const node = await domModel.pushNodeToFrontend(remoteObject.objectId);
    if (!node) {
      throw new Error("Node is not found");
    }
    try {
      const matchedStyles = await cssModel.getMatchedStyles(node.id);
      if (!matchedStyles) {
        throw new Error("No matching styles");
      }
      const styleRule = _ExtensionScope.getStyleRuleFromMatchesStyles(matchedStyles);
      if (!styleRule) {
        throw new Error("No style rule found");
      }
      const selector = _ExtensionScope.getSelectorsFromStyleRule(styleRule, matchedStyles);
      if (!selector) {
        throw new Error("No selector found");
      }
      return {
        selector
      };
    } catch {
    }
    return {
      selector: _ExtensionScope.getSelectorForNode(node)
    };
  }
  async #bindingCalled(executionContext, event) {
    const { data } = event;
    if (data.name !== FREESTYLER_BINDING_NAME) {
      return;
    }
    await this.#bindingMutex.run(async () => {
      const cssModel = this.target.model(SDK4.CSSModel.CSSModel);
      if (!cssModel) {
        throw new Error("CSSModel is not found");
      }
      const id = data.payload;
      const [args, element] = await Promise.all([
        this.#simpleEval(executionContext, `freestyler.getArgs(${id})`),
        this.#simpleEval(executionContext, `freestyler.getElement(${id})`, false)
      ]);
      const arg = JSON.parse(args.object.value);
      if (!arg.className.match(new RegExp(`${RegExp.escape(AI_ASSISTANCE_CSS_CLASS_NAME)}-\\d`))) {
        throw new Error("Non AI class name");
      }
      let context = {
        // TODO: Should this a be a *?
        selector: ""
      };
      try {
        context = await this.#computeContextFromElement(element.object);
      } catch (err) {
        console.error(err);
      } finally {
        element.object.release();
      }
      try {
        const sanitizedStyles = await this.sanitizedStyleChanges(context.selector, arg.styles);
        const styleChanges = await this.#changeManager.addChange(cssModel, this.frameId, {
          groupId: this.#agentId,
          selector: context.selector,
          className: arg.className,
          styles: sanitizedStyles
        });
        await this.#simpleEval(executionContext, `freestyler.respond(${id}, ${JSON.stringify(styleChanges)})`);
      } catch (error) {
        await this.#simpleEval(executionContext, `freestyler.respond(${id}, new Error("${error?.message}"))`);
      }
    });
  }
  async sanitizedStyleChanges(selector, styles) {
    const cssStyleValue = [];
    const changedStyles = [];
    const styleSheet = new CSSStyleSheet({ disabled: true });
    const kebabStyles = Platform3.StringUtilities.toKebabCaseKeys(styles);
    for (const [style, value] of Object.entries(kebabStyles)) {
      cssStyleValue.push(`${style}: ${value};`);
      changedStyles.push(style);
    }
    await styleSheet.replace(`${selector} { ${cssStyleValue.join(" ")} }`);
    const sanitizedStyles = {};
    for (const cssRule of styleSheet.cssRules) {
      if (!(cssRule instanceof CSSStyleRule)) {
        continue;
      }
      for (const style of changedStyles) {
        const value = cssRule.style.getPropertyValue(style);
        if (value) {
          sanitizedStyles[style] = value;
        }
      }
    }
    if (Object.keys(sanitizedStyles).length === 0) {
      throw new Error(
        "None of the suggested CSS properties or their values for selector were considered valid by the browser's CSS engine. Please ensure property names are correct and values match the expected format for those properties."
      );
    }
    return sanitizedStyles;
  }
};

// ../../front_end/models/ai_assistance/tools/Tool.ts
var Tool_exports = {};
__export(Tool_exports, {
  MAX_FUNCTION_RESULT_BYTE_LENGTH: () => MAX_FUNCTION_RESULT_BYTE_LENGTH,
  ToolAnnotation: () => ToolAnnotation,
  ToolName: () => ToolName
});
var MAX_FUNCTION_RESULT_BYTE_LENGTH = 16384 * 4;
var ToolName = /* @__PURE__ */ ((ToolName2) => {
  ToolName2["EXECUTE_JAVASCRIPT"] = "executeJavaScript";
  ToolName2["GET_STYLES"] = "getStyles";
  ToolName2["LIST_NETWORK_REQUESTS"] = "listNetworkRequests";
  ToolName2["GET_NETWORK_REQUEST_DETAILS"] = "getNetworkRequestDetails";
  ToolName2["GET_LIGHTHOUSE_AUDITS"] = "getLighthouseAudits";
  ToolName2["RESOLVE_DEVTOOLS_NODE_PATH"] = "resolveDevtoolsNodePath";
  ToolName2["GET_ELEMENT_ACCESSIBILITY_DETAILS"] = "getElementAccessibilityDetails";
  ToolName2["RECORD_PERFORMANCE_TRACE"] = "recordPerformanceTrace";
  ToolName2["LIST_PAGE_ORIGINS"] = "listPageOrigins";
  ToolName2["LIST_STORAGE_KEYS"] = "listStorageKeys";
  ToolName2["GET_STORAGE_VALUES"] = "getStorageValues";
  ToolName2["LIST_COOKIES"] = "listCookies";
  ToolName2["GET_TRACE_EVENT_BY_KEY"] = "getTraceEventByKey";
  ToolName2["SELECT_TRACE_EVENT_BY_KEY"] = "selectTraceEventByKey";
  ToolName2["LIST_SOURCES"] = "listSources";
  ToolName2["GET_SOURCE_CONTENT"] = "getSourceContent";
  ToolName2["GET_TRACE_MAIN_THREAD_SUMMARY"] = "getTraceMainThreadSummary";
  ToolName2["GET_TRACE_NETWORK_SUMMARY"] = "getTraceNetworkSummary";
  ToolName2["RUN_LIGHTHOUSE"] = "runLighthouse";
  ToolName2["GET_DETAILED_CALL_TREE"] = "getDetailedCallTree";
  ToolName2["GET_FUNCTION_CODE"] = "getFunctionCode";
  ToolName2["GET_RESOURCE_CONTENT"] = "getResourceContent";
  ToolName2["GET_INSIGHT_DETAILS"] = "getInsightDetails";
  return ToolName2;
})(ToolName || {});
var ToolAnnotation = /* @__PURE__ */ ((ToolAnnotation2) => {
  ToolAnnotation2["REDACT_FROM_HISTORY"] = "redact-from-history";
  return ToolAnnotation2;
})(ToolAnnotation || {});

// ../../front_end/models/ai_assistance/tools/ToolRegistry.ts
var ToolRegistry_exports = {};
__export(ToolRegistry_exports, {
  TOOLS: () => TOOLS,
  ToolRegistry: () => ToolRegistry
});

// ../../front_end/models/ai_assistance/tools/ExecuteJavaScript.ts
var ExecuteJavaScript_exports = {};
__export(ExecuteJavaScript_exports, {
  ExecuteJavaScriptTool: () => ExecuteJavaScriptTool
});
import * as Common4 from "../../core/common/common.js";
import * as Host3 from "../../core/host/host.js";
import * as Root3 from "../../core/root/root.js";
import * as Formatter from "../formatter/formatter.js";
var MAX_FORMATTED_LINES = 40;
var MAX_LINE_LENGTH = 120;
var MAX_TOTAL_CHARACTERS = 2500;
var ExecuteJavaScriptTool = class _ExecuteJavaScriptTool {
  name = "executeJavaScript" /* EXECUTE_JAVASCRIPT */;
  description = "This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request. Note: You cannot make network requests using this function.";
  static async validateAndFormatCode(code) {
    try {
      const formatted = await Formatter.ScriptFormatter.formatScriptContent(
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        Common4.Settings.Settings.instance(),
        "text/javascript",
        code,
        "  "
      );
      const formattedCode = formatted.formattedContent;
      const lines = formattedCode.split("\n");
      const maxLineLen = Math.max(...lines.map((line) => line.length));
      if (lines.length > MAX_FORMATTED_LINES || maxLineLen > MAX_LINE_LENGTH || formattedCode.length > MAX_TOTAL_CHARACTERS) {
        return {
          error: `Error: JavaScript code exceeds maximum allowed size (max ${MAX_FORMATTED_LINES} formatted lines, ${MAX_LINE_LENGTH} chars/line, ${MAX_TOTAL_CHARACTERS} total chars). Please split your logic into smaller function calls.`
        };
      }
      return { formattedCode };
    } catch {
      return { error: "Error: JavaScript code snippet contains invalid syntax." };
    }
  }
  parameters = {
    type: Host3.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: false,
    properties: {
      code: {
        type: Host3.AidaClient.ParametersTypes.STRING,
        description: `JavaScript code snippet to run on the inspected page. Make sure the code is formatted for readability.

# Instructions

* To return data, define a top-level \`data\` variable and populate it with data you want to get. Only JSON-serializable objects can be assigned to \`data\`.
* If you modify styles on an element, ALWAYS call the pre-defined global \`async setElementStyles(el: Element, styles: object)\` function. This function is an internal mechanism for you and should never be presented as a command/advice to the user.
* **CRITICAL** Only get styles that might be relevant to the user request.
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Consider that \`data\` variable from the previous function calls are not available in a new function call.
* **CRITICAL** Keep code concise (max 40 lines and 2,500 characters). Split complex logic into multiple steps.
* **CRITICAL** Network requests (e.g., fetch, XMLHttpRequest) are disabled and cannot be made.

For example, the code to change element styles:

\`\`\`
await setElementStyles($0, {
  color: 'blue',
});
\`\`\`

For example, the code to get overlapping elements:

\`\`\`
const data = {
  overlappingElements: Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      const popupRect = $0.getBoundingClientRect();
      return (
        el !== $0 &&
        rect.left < popupRect.right &&
        rect.right > popupRect.left &&
        rect.top < popupRect.bottom &&
        rect.bottom > popupRect.top
      );
    })
    .map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      zIndex: window.getComputedStyle(el)['z-index']
    }))
};
\`\`\`
`
      },
      explanation: {
        type: Host3.AidaClient.ParametersTypes.STRING,
        description: "Explain why you want to run this code"
      },
      title: {
        type: Host3.AidaClient.ParametersTypes.STRING,
        description: 'Provide a summary of what the code does. For example, "Checking related element styles".'
      }
    },
    required: ["code", "explanation", "title"]
  };
  displayInfoFromArgs(params) {
    return {
      title: params.title,
      thought: params.explanation,
      action: params.code
    };
  }
  async handler(params, context, options) {
    const executionNode = context.getExecutionContextNode();
    if (!executionNode) {
      return { error: "Error: Could not find the context node for execution." };
    }
    if (Root3.Runtime.hostConfig.devToolsAiV2Architecture?.enabled) {
      const validationResult = await _ExecuteJavaScriptTool.validateAndFormatCode(params.code);
      if (validationResult.error) {
        return { error: validationResult.error };
      }
      if (validationResult.formattedCode) {
        params.code = validationResult.formattedCode;
      }
    }
    const executionMode = Root3.Runtime.hostConfig.devToolsFreestyler?.executionMode ?? Root3.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
    const executor = new JavascriptExecutor(
      {
        executionMode,
        getContextNode: () => executionNode,
        createExtensionScope: context.createExtensionScope,
        changes: context.changeManager
      },
      context.execJs
    );
    return await executor.executeAction(params.code, options);
  }
};

// ../../front_end/models/ai_assistance/tools/GetDetailedCallTree.ts
var GetDetailedCallTree_exports = {};
__export(GetDetailedCallTree_exports, {
  GetDetailedCallTreeTool: () => GetDetailedCallTreeTool
});
import * as Host4 from "../../core/host/host.js";
import * as i18n4 from "../../core/i18n/i18n.js";
import * as Trace2 from "../trace/trace.js";

// ../../front_end/models/ai_assistance/performance/AICallTree.ts
var AICallTree_exports = {};
__export(AICallTree_exports, {
  AICallTree: () => AICallTree,
  ExcludeCompileCodeFilter: () => ExcludeCompileCodeFilter,
  MinDurationFilter: () => MinDurationFilter,
  SelectedEventDurationFilter: () => SelectedEventDurationFilter
});
import * as Trace from "../trace/trace.js";
import * as SourceMapsResolver from "../trace_source_maps_resolver/trace_source_maps_resolver.js";
import * as Workspace from "../workspace/workspace.js";
function depthFirstWalk(nodes, callback) {
  for (const node of nodes) {
    if (callback?.(node)) {
      break;
    }
    depthFirstWalk(node.children().values(), callback);
  }
}
var AICallTree = class _AICallTree {
  constructor(selectedNode, rootNode, parsedTrace, workspace = Workspace.Workspace.WorkspaceImpl.instance()) {
    this.selectedNode = selectedNode;
    this.rootNode = rootNode;
    this.parsedTrace = parsedTrace;
    this.workspace = workspace;
  }
  // Note: ideally this is passed in (or lived on ParsedTrace), but this class is
  // stateless (mostly, there's a cache for some stuff) so it doesn't match much.
  #eventsSerializer = new Trace.EventsSerializer.EventsSerializer();
  static findEventsForThread({ thread, parsedTrace, bounds }) {
    const threadEvents = parsedTrace.data.Renderer.processes.get(thread.pid)?.threads.get(thread.tid)?.entries;
    if (!threadEvents) {
      return null;
    }
    return threadEvents.filter((e) => Trace.Helpers.Timing.eventIsInBounds(e, bounds));
  }
  static findMainThreadTasks({ thread, parsedTrace, bounds }) {
    const threadEvents = parsedTrace.data.Renderer.processes.get(thread.pid)?.threads.get(thread.tid)?.entries;
    if (!threadEvents) {
      return null;
    }
    return threadEvents.filter(Trace.Types.Events.isRunTask).filter((e) => Trace.Helpers.Timing.eventIsInBounds(e, bounds));
  }
  /**
   * Builds a call tree representing all calls within the given timeframe for
   * the provided thread.
   * Events that are less than 0.05% of the range duration are removed.
   */
  static fromTimeOnThread({ thread, parsedTrace, bounds }) {
    const overlappingEvents = this.findEventsForThread({ thread, parsedTrace, bounds });
    if (!overlappingEvents) {
      return null;
    }
    const visibleEventsFilter = new Trace.Extras.TraceFilter.VisibleEventsFilter(Trace.Styles.visibleTypes());
    const minDuration = Trace.Types.Timing.Micro(bounds.range * 5e-3);
    const minDurationFilter = new MinDurationFilter(minDuration);
    const compileCodeFilter = new ExcludeCompileCodeFilter();
    const rootNode = new Trace.Extras.TraceTree.TopDownRootNode(overlappingEvents, {
      filters: [minDurationFilter, compileCodeFilter, visibleEventsFilter],
      startTime: Trace.Helpers.Timing.microToMilli(bounds.min),
      endTime: Trace.Helpers.Timing.microToMilli(bounds.max),
      doNotAggregate: true,
      includeInstantEvents: true
    });
    const instance = new _AICallTree(null, rootNode, parsedTrace);
    return instance;
  }
  /**
   * Attempts to build an AICallTree from a given selected event. It also
   * validates that this event is one that we support being used with the AI
   * Assistance panel, which [as of January 2025] means:
   * 1. It is on the main thread.
   * 2. It exists in either the Renderer or Sample handler's entryToNode map.
   * This filters out other events we make such as SyntheticLayoutShifts which are not valid
   * If the event is not valid, or there is an unexpected error building the tree, `null` is returned.
   */
  static fromEvent(selectedEvent, parsedTrace) {
    if (Trace.Types.Events.isPerformanceMark(selectedEvent)) {
      return null;
    }
    const threads = Trace.Handlers.Threads.threadsInTrace(parsedTrace.data);
    const thread = threads.find((t) => t.pid === selectedEvent.pid && t.tid === selectedEvent.tid);
    if (!thread) {
      return null;
    }
    if (thread.type !== Trace.Handlers.Threads.ThreadType.MAIN_THREAD && thread.type !== Trace.Handlers.Threads.ThreadType.CPU_PROFILE) {
      return null;
    }
    const data = parsedTrace.data;
    if (!data.Renderer.entryToNode.has(selectedEvent) && !data.Samples.entryToNode.has(selectedEvent)) {
      return null;
    }
    const showAllEvents = parsedTrace.data.Meta.config.showAllEvents;
    const { startTime, endTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(selectedEvent);
    const selectedEventBounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
      Trace.Helpers.Timing.milliToMicro(startTime),
      Trace.Helpers.Timing.milliToMicro(endTime)
    );
    let threadEvents = data.Renderer.processes.get(selectedEvent.pid)?.threads.get(selectedEvent.tid)?.entries;
    if (!threadEvents) {
      threadEvents = data.Samples.profilesInProcess.get(selectedEvent.pid)?.get(selectedEvent.tid)?.profileCalls;
    }
    if (!threadEvents) {
      console.warn(`AICallTree: could not find thread for selected entry: ${selectedEvent}`);
      return null;
    }
    const overlappingEvents = threadEvents.filter((e) => Trace.Helpers.Timing.eventIsInBounds(e, selectedEventBounds));
    const filters = [new SelectedEventDurationFilter(selectedEvent), new ExcludeCompileCodeFilter(selectedEvent)];
    if (!showAllEvents) {
      filters.push(new Trace.Extras.TraceFilter.VisibleEventsFilter(Trace.Styles.visibleTypes()));
    }
    const rootNode = new Trace.Extras.TraceTree.TopDownRootNode(overlappingEvents, {
      filters,
      startTime,
      endTime,
      includeInstantEvents: true
    });
    let selectedNode = null;
    depthFirstWalk([rootNode].values(), (node) => {
      if (node.event === selectedEvent) {
        selectedNode = node;
        return true;
      }
      return;
    });
    if (selectedNode === null) {
      console.warn(`Selected event ${selectedEvent} not found within its own tree.`);
      return null;
    }
    const instance = new _AICallTree(selectedNode, rootNode, parsedTrace);
    return instance;
  }
  /**
   * Iterates through nodes level by level using a Breadth-First Search (BFS) algorithm.
   * BFS is important here because the serialization process assumes that direct child nodes
   * will have consecutive IDs (horizontally across each depth).
   *
   * Example tree with IDs:
   *
   *             1
   *            / \
   *           2   3
   *        / / /   \
   *      4  5 6     7
   *
   * Here, node with an ID 2 has consecutive children in the 4-6 range.
   *
   * To optimize for space, the provided `callback` function is called to serialize
   * each node as it's visited during the BFS traversal.
   *
   * When serializing a node, the callback receives:
   * 1. The current node being visited.
   * 2. The ID assigned to this current node (a simple incrementing index based on visit order).
   * 3. The predicted starting ID for the children of this current node.
   *
   * A serialized node needs to know the ID range of its children. However,
   * child node IDs are only assigned when those children are themselves visited.
   * To handle this, we predict the starting ID for a node's children. This prediction
   * is based on a running count of all nodes that have ever been added to the BFS queue.
   * Since IDs are assigned consecutively as nodes are processed from the queue, and a
   * node's children are added to the end of the queue when the parent is visited,
   * their eventual IDs will follow this running count.
   */
  breadthFirstWalk(nodes, serializeNodeCallback) {
    const queue = Array.from(nodes);
    let nodeIndex = 1;
    let nodesAddedToQueueCount = queue.length;
    let currentNode = queue.shift();
    while (currentNode) {
      if (currentNode.children().size > 0) {
        serializeNodeCallback(currentNode, nodeIndex, nodesAddedToQueueCount + 1);
      } else {
        serializeNodeCallback(currentNode, nodeIndex);
      }
      queue.push(...Array.from(currentNode.children().values()));
      nodesAddedToQueueCount += currentNode.children().size;
      currentNode = queue.shift();
      nodeIndex++;
    }
  }
  serialize(headerLevel = 1) {
    const header = "#".repeat(headerLevel);
    const allUrls = [];
    let nodesStr = "";
    this.breadthFirstWalk(this.rootNode.children().values(), (node, nodeId, childStartingNode) => {
      nodesStr += "\n" + this.stringifyNode(node, nodeId, this.parsedTrace, this.selectedNode, allUrls, childStartingNode);
    });
    let output = "";
    if (allUrls.length) {
      output += `
${header} All URLs:

` + allUrls.map((url, index) => `  * ${index}: ${url}`).join("\n");
    }
    output += `

${header} Call tree:
${nodesStr}`;
    return output;
  }
  /*
  * Each node is serialized into a single line to minimize token usage in the context window.
  * The format is a semicolon-separated string with the following fields:
  * Format: `id;name;duration;selfTime;urlIndex;childRange;[S]
  *
  *   1. `id`: A unique numerical identifier for the node assigned by BFS.
  *   2. `name`: The name of the event represented by the node.
  *   3. `duration`: The total duration of the event in milliseconds, rounded to one decimal place.
  *   4. `selfTime`: The self time of the event in milliseconds, rounded to one decimal place.
  *   5. `urlIndex`: An index referencing a URL in the `allUrls` array. If no URL is present, this is an empty string.
  *   6. `childRange`: A string indicating the range of IDs for the node's children. Children should always have consecutive IDs.
  *                    If there is only one child, it's a single ID.
  *   7. `[line]`: An optional field for a call frame's line number.
  *   8. `[column]`: An optional field for a call frame's column number.
  *   9. `[S]`: An optional marker indicating that this node is the selected node.
  *
  * Example:
  *   `1;Parse HTML;2.5;0.3;0;2-5;10;11;S`
  *   This represents:
  *     - Node ID 1
  *     - Name "Parse HTML"
  *     - Total duration of 2.5ms
  *     - Self time of 0.3ms
  *     - URL index 0 (meaning the URL is the first one in the `allUrls` array)
  *     - Child range of IDs 2 to 5
  *     - Line, column is 10:11
  *     - This node is the selected node (S marker)
  */
  stringifyNode(node, nodeId, parsedTrace, selectedNode, allUrls, childStartingNodeIndex) {
    const event = node.event;
    if (!event) {
      throw new Error("Event required");
    }
    const idStr = String(nodeId);
    const eventKey = this.#eventsSerializer.keyForEvent(node.event);
    const name = Trace.Name.forEntry(event, parsedTrace);
    const roundToTenths = (num) => {
      if (!num) {
        return "";
      }
      return String(Math.round(num * 10) / 10);
    };
    const durationStr = roundToTenths(node.totalTime);
    const selfTimeStr = roundToTenths(node.selfTime);
    const location = SourceMapsResolver.SourceMapsResolver.codeLocationForEntry(parsedTrace, event, this.workspace);
    const url = location?.url;
    let urlIndexStr = "";
    if (url) {
      const existingIndex = allUrls.indexOf(url);
      if (existingIndex === -1) {
        urlIndexStr = String(allUrls.push(url) - 1);
      } else {
        urlIndexStr = String(existingIndex);
      }
    }
    const children = Array.from(node.children().values());
    let childRangeStr = "";
    if (childStartingNodeIndex) {
      childRangeStr = children.length === 1 ? String(childStartingNodeIndex) : `${childStartingNodeIndex}-${childStartingNodeIndex + children.length}`;
    }
    const selectedMarker = selectedNode?.event === node.event ? "S" : "";
    let line = idStr;
    line += ";" + eventKey;
    line += ";" + name;
    line += ";" + durationStr;
    line += ";" + selfTimeStr;
    line += ";" + urlIndexStr;
    line += ";" + childRangeStr;
    line += ";" + (location?.line ?? "");
    line += ";" + (location?.column ?? "");
    if (selectedMarker) {
      line += ";" + selectedMarker;
    }
    return line;
  }
  topCallFramesBySelfTime(limit) {
    const functionNodesByCallFrame = /* @__PURE__ */ new Map();
    this.breadthFirstWalk(this.rootNode.children().values(), (node) => {
      if (Trace.Types.Events.isProfileCall(node.event)) {
        const callFrame = node.event.callFrame;
        const callFrameKey = `${callFrame.scriptId}:${callFrame.lineNumber}:${callFrame.columnNumber}`;
        const array = functionNodesByCallFrame.get(callFrameKey) ?? [];
        array.push(node);
        functionNodesByCallFrame.set(callFrameKey, array);
      }
    });
    return [...functionNodesByCallFrame.values()].map((nodes) => {
      return {
        callFrame: nodes[0].event.callFrame,
        selfTime: nodes.reduce((total, cur) => total + cur.selfTime, 0)
      };
    }).sort((a, b) => b.selfTime - a.selfTime).slice(0, limit).map(({ callFrame }) => callFrame);
  }
  topCallFrameByTotalTime() {
    let topChild = null;
    let topProfileCallEvent = null;
    for (const child of this.rootNode.children().values()) {
      if (Trace.Types.Events.isProfileCall(child.event)) {
        if (!topChild || child.totalTime > topChild.totalTime) {
          topChild = child;
          topProfileCallEvent = child.event;
        }
      }
    }
    return topProfileCallEvent?.callFrame ?? null;
  }
  // Only used for debugging.
  logDebug() {
    const str = this.serialize();
    console.log("\u{1F386}", str);
    if (str.length > 45e3) {
      console.warn("Output will likely not fit in the context window. Expect an AIDA error.");
    }
  }
};
var ExcludeCompileCodeFilter = class extends Trace.Extras.TraceFilter.TraceFilter {
  #selectedEvent = null;
  constructor(selectedEvent) {
    super();
    this.#selectedEvent = selectedEvent ?? null;
  }
  accept(event) {
    if (this.#selectedEvent && event === this.#selectedEvent) {
      return true;
    }
    return event.name !== Trace.Types.Events.Name.COMPILE_CODE;
  }
};
var SelectedEventDurationFilter = class extends Trace.Extras.TraceFilter.TraceFilter {
  #minDuration;
  #selectedEvent;
  constructor(selectedEvent) {
    super();
    this.#minDuration = Trace.Types.Timing.Micro((selectedEvent.dur ?? 1) * 5e-3);
    this.#selectedEvent = selectedEvent;
  }
  accept(event) {
    if (event === this.#selectedEvent) {
      return true;
    }
    return event.dur ? event.dur >= this.#minDuration : false;
  }
};
var MinDurationFilter = class extends Trace.Extras.TraceFilter.TraceFilter {
  #minDuration;
  constructor(minDuration) {
    super();
    this.#minDuration = minDuration;
  }
  accept(event) {
    return event.dur ? event.dur >= this.#minDuration : false;
  }
};

// ../../front_end/models/ai_assistance/tools/GetDetailedCallTree.ts
var UIStringsNotTranslate = {
  lookingAtCallTree: "Looking at call tree"
};
var lockedString2 = i18n4.i18n.lockedString;
var GetDetailedCallTreeTool = class {
  name = "getDetailedCallTree" /* GET_DETAILED_CALL_TREE */;
  description = "Returns a detailed call tree for the given main thread event.";
  parameters = {
    type: Host4.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for looking up a call tree.",
    nullable: false,
    properties: {
      eventKey: {
        type: Host4.AidaClient.ParametersTypes.STRING,
        description: "The key for the event.",
        nullable: false
      }
    },
    required: ["eventKey"]
  };
  displayInfoFromArgs(params) {
    return {
      title: lockedString2(UIStringsNotTranslate.lookingAtCallTree),
      action: `getDetailedCallTree('${params.eventKey}')`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    if (!params.eventKey) {
      return { error: "Missing arg: eventKey" };
    }
    const focus = performanceTraceContext.getItem();
    const event = focus.lookupEvent(params.eventKey);
    if (!event) {
      return { error: "Invalid eventKey" };
    }
    const tree = AICallTree.fromEvent(event, focus.parsedTrace);
    if (!tree) {
      return { error: "No call tree found" };
    }
    const formatter = performanceTraceContext.createFormatter();
    const callTree = await formatter.formatCallTree(tree);
    const bounds = Trace2.Helpers.Timing.traceWindowFromEvent(event);
    return {
      result: callTree,
      widgets: [
        {
          name: "BOTTOM_UP_TREE",
          data: {
            bounds,
            parsedTrace: focus.parsedTrace
          }
        },
        {
          name: "TIMELINE_RANGE_SUMMARY",
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
            track: "main"
          }
        }
      ]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetElementAccessibilityDetails.ts
var GetElementAccessibilityDetails_exports = {};
__export(GetElementAccessibilityDetails_exports, {
  GetElementAccessibilityDetailsTool: () => GetElementAccessibilityDetailsTool
});
import * as Host6 from "../../core/host/host.js";
import * as i18n8 from "../../core/i18n/i18n.js";
import * as SDK6 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/contexts/DOMNodeContext.ts
var DOMNodeContext_exports = {};
__export(DOMNodeContext_exports, {
  DOMNodeContext: () => DOMNodeContext
});
import * as i18n6 from "../../core/i18n/i18n.js";

// ../../front_end/models/ai_assistance/agents/AiAgent.ts
var AiAgent_exports = {};
__export(AiAgent_exports, {
  AiAgent: () => AiAgent,
  ConversationContext: () => ConversationContext,
  ErrorType: () => ErrorType,
  MAX_STEPS: () => MAX_STEPS,
  MultimodalInputType: () => MultimodalInputType,
  ResponseType: () => ResponseType,
  aidaErrorToErrorType: () => aidaErrorToErrorType
});
import * as Host5 from "../../core/host/host.js";
import * as Root4 from "../../core/root/root.js";
import * as SDK5 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/AiOrigins.ts
var AiOrigins_exports = {};
__export(AiOrigins_exports, {
  areOriginsEquivalent: () => areOriginsEquivalent,
  canResourceContentsBeReadForTrace: () => canResourceContentsBeReadForTrace,
  extractContextOrigin: () => extractContextOrigin,
  isOpaqueOrigin: () => isOpaqueOrigin
});
import * as Common5 from "../../core/common/common.js";
function isOpaqueOrigin(origin) {
  const lower = origin.toLowerCase();
  return lower === "" || lower === "null" || lower === "data:" || lower.startsWith("about") || lower.startsWith("detached") || lower.startsWith("undefined");
}
function extractContextOrigin(contextURL) {
  if (isOpaqueOrigin(contextURL)) {
    return contextURL;
  }
  if (contextURL.startsWith("trace-")) {
    return contextURL;
  }
  if (/^blob:/i.test(contextURL)) {
    const innerURL = contextURL.substring(5);
    if (!innerURL.includes("://")) {
      return "null";
    }
  }
  if (/^file:\/\//i.test(contextURL)) {
    const parsed = Common5.ParsedURL.ParsedURL.fromString(contextURL);
    if (parsed) {
      const authority = parsed.host + (parsed.port ? ":" + parsed.port : "");
      return "file://" + authority + parsed.path;
    }
    return "null";
  }
  return Common5.ParsedURL.ParsedURL.extractOrigin(contextURL);
}
function areOriginsEquivalent(origin1, origin2) {
  if (isOpaqueOrigin(origin1) || isOpaqueOrigin(origin2)) {
    return false;
  }
  return origin1 === origin2;
}
function canResourceContentsBeReadForTrace(targetURL, traceOrigin) {
  if (traceOrigin.startsWith("file://") || targetURL.startsWith("file://")) {
    return false;
  }
  const targetOrigin = extractContextOrigin(targetURL);
  return areOriginsEquivalent(targetOrigin, traceOrigin);
}

// ../../front_end/models/ai_assistance/agents/AiAgent.ts
var MAX_SUGGESTION_LENGTH = 200;
var ResponseType = /* @__PURE__ */ ((ResponseType2) => {
  ResponseType2["CONTEXT"] = "context";
  ResponseType2["TITLE"] = "title";
  ResponseType2["THOUGHT"] = "thought";
  ResponseType2["ACTION"] = "action";
  ResponseType2["SIDE_EFFECT"] = "side-effect";
  ResponseType2["SUGGESTIONS"] = "suggestions";
  ResponseType2["ANSWER"] = "answer";
  ResponseType2["ERROR"] = "error";
  ResponseType2["QUERYING"] = "querying";
  ResponseType2["USER_QUERY"] = "user-query";
  ResponseType2["CONTEXT_CHANGE"] = "context-change";
  return ResponseType2;
})(ResponseType || {});
var ErrorType = /* @__PURE__ */ ((ErrorType2) => {
  ErrorType2["UNKNOWN"] = "unknown";
  ErrorType2["ABORT"] = "abort";
  ErrorType2["MAX_STEPS"] = "max-steps";
  ErrorType2["BLOCK"] = "block";
  ErrorType2["CROSS_ORIGIN"] = "cross-origin";
  ErrorType2["QUOTA"] = "quota";
  ErrorType2["PAYLOAD_TOO_LARGE"] = "payload-too-large";
  return ErrorType2;
})(ErrorType || {});
var MultimodalInputType = /* @__PURE__ */ ((MultimodalInputType2) => {
  MultimodalInputType2["SCREENSHOT"] = "screenshot";
  MultimodalInputType2["UPLOADED_IMAGE"] = "uploaded-image";
  return MultimodalInputType2;
})(MultimodalInputType || {});
var MAX_STEPS = 10;
var ConversationContext = class {
  /**
   * Returns true if the server-side logging is enabled when this context is active.
   * Currently only used for AI v2.
   */
  isLoggingEnabled() {
    return true;
  }
  getOrigin() {
    return extractContextOrigin(this.getURL());
  }
  /**
   * Returns true if this data context (e.g., a DOM node or Network Request) is
   * allowed to be included in a conversation that is locked to the provided
   * `establishedOrigin`.
   *
   * A conversation is "locked" to an origin once the first query is made.
   * This method ensures that we don't mix data from different origins in the
   * same conversation.
   *
   * @param establishedOrigin The origin that the current conversation is locked to.
   * If undefined, the conversation has not yet been locked to an origin.
   */
  isOriginAllowed(establishedOrigin) {
    const origin = this.getOrigin();
    if (origin instanceof SDK5.SecurityOrigin.SecurityOrigin) {
      if (origin.isOpaque()) {
        return false;
      }
      if (!establishedOrigin) {
        return true;
      }
      const established = establishedOrigin instanceof SDK5.SecurityOrigin.SecurityOrigin ? establishedOrigin : SDK5.SecurityOrigin.SecurityOrigin.create(establishedOrigin);
      return origin.isSameOriginWith(established);
    }
    if (!establishedOrigin) {
      return !isOpaqueOrigin(origin);
    }
    const establishedString = establishedOrigin instanceof SDK5.SecurityOrigin.SecurityOrigin ? establishedOrigin.siteId() : establishedOrigin;
    return areOriginsEquivalent(origin, establishedString);
  }
  /**
   * This method is called at the start of `AiAgent.run`.
   * It will be overridden in subclasses to fetch data related to the context item.
   */
  async refresh() {
    return;
  }
  async getSuggestions() {
    return;
  }
  /**
   * Returns a detailed description of the context item for inclusion in the AI model prompt.
   * Currently only used by AiAgent2.
   */
  async getPromptDetails() {
    return null;
  }
  /**
   * Returns a list of context details to display to the user in the UI.
   * Currently only used by AiAgent2.
   */
  async getUserFacingDetails() {
    return null;
  }
  /**
   * Returns initial UI widgets to display in the conversation context header
   * when this context is active (e.g. Core Web Vitals summary for a performance trace).
   * Used by PerformanceAgent and AiAgent2.
   */
  async getWidgets() {
    return [];
  }
};
var CrossOriginError = class extends Error {
  constructor() {
    super("Cross-origin navigation detected");
    this.name = "CrossOriginError";
  }
};
var AiAgent = class {
  #sessionId;
  #aidaClient;
  /**
   * Tracks the dynamic runtime state of logging. Even if logging is allowed
   * by policy, tools or sensitive contexts can deactivate this to avoid logging sensitive data.
   */
  #serverSideLoggingActive;
  confirmSideEffect;
  #functionDeclarations = /* @__PURE__ */ new Map();
  #allowedOrigin;
  #targetManager;
  /**
   * Used in the debug mode and evals.
   */
  #structuredLog = [];
  /**
   * `context` does not change during `AiAgent.run()`, ensuring that calls to JS
   * have the correct `context`. We don't want element selection by the user to
   * change the `context` during an `AiAgent.run()`.
   */
  context;
  #history;
  #facts = /* @__PURE__ */ new Set();
  constructor(opts) {
    this.#aidaClient = opts.aidaClient;
    let serverSideLoggingAllowed = opts.serverSideLoggingAllowed ?? false;
    if (Root4.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      serverSideLoggingAllowed = false;
    }
    this.#serverSideLoggingActive = serverSideLoggingAllowed;
    this.#sessionId = opts.sessionId ?? crypto.randomUUID();
    this.confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
    this.#history = opts.history ?? [];
    this.#allowedOrigin = opts.allowedOrigin;
    this.#targetManager = opts.targetManager ?? SDK5.TargetManager.TargetManager.instance();
  }
  async enhanceQuery(query) {
    return query;
  }
  currentFacts() {
    return this.#facts;
  }
  get history() {
    return [...this.#history];
  }
  get targetManager() {
    return this.#targetManager;
  }
  /**
   * Add a fact which will be sent for any subsequent requests.
   * Returns the new list of all facts.
   * Facts are never automatically removed.
   */
  addFact(fact) {
    this.#facts.add(fact);
    return this.#facts;
  }
  removeFact(fact) {
    return this.#facts.delete(fact);
  }
  clearFacts() {
    this.#facts.clear();
  }
  /**
   * Clears any subclass-specific caches. This is called when a run encounters
   * an error (e.g., cross-origin navigation, abort, or execution error) to
   * prevent unvalidated cached data from being replayed in subsequent runs.
   */
  clearCache() {
  }
  /**
   * Disables server-side logging for the remainder of this agent instance's lifetime.
   *
   * Logging deactivation is irreversible for the session. Conversation history
   * accumulates across turns; re-enabling logging later would leak sensitive
   * data from prior turns to AIDA.
   */
  disableServerSideLogging() {
    this.#serverSideLoggingActive = false;
  }
  popPendingMultimodalInput() {
    return void 0;
  }
  /**
   * Preamble features appended to the `client_version` in metadata.
   * This is required ONLY for the Styling Agent for legacy reasons to serve
   * different server-side preambles based on the Chrome version.
   * Other agents should NOT set or override this.
   * If you are curious about this, look for `do_conversation_handler.cc` in
   * Google3 or chat to @jacktfranklin.
   */
  preambleFeatures() {
    return [];
  }
  buildRequest(part, role) {
    const parts = Array.isArray(part) ? part : [part];
    const currentMessage = {
      parts,
      role
    };
    const history = [...this.#history];
    const declarations = [];
    for (const [name, definition] of this.#functionDeclarations.entries()) {
      declarations.push({
        name,
        description: typeof definition.description === "function" ? definition.description() : definition.description,
        parameters: definition.parameters
      });
    }
    function validTemperature(temperature) {
      return typeof temperature === "number" && temperature >= 0 ? temperature : void 0;
    }
    const enableAidaFunctionCalling = declarations.length;
    const userTier = Host5.AidaClient.convertToUserTierEnum(this.userTier);
    const preamble10 = userTier === Host5.AidaClient.UserTier.TESTERS ? this.preamble : void 0;
    const facts = Array.from(this.#facts);
    const request = {
      client: Host5.AidaClient.CLIENT_NAME,
      current_message: currentMessage,
      preamble: preamble10,
      historical_contexts: history.length ? history : void 0,
      facts: facts.length ? facts : void 0,
      ...enableAidaFunctionCalling ? { function_declarations: declarations } : {},
      options: {
        temperature: validTemperature(this.options.temperature),
        model_id: this.options.modelId || void 0
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingActive ?? false),
        string_session_id: this.#sessionId,
        user_tier: userTier,
        client_version: Root4.Runtime.getChromeVersion() + this.preambleFeatures().map((feature) => `+${feature}`).join("")
      },
      functionality_type: enableAidaFunctionCalling ? Host5.AidaClient.FunctionalityType.AGENTIC_CHAT : Host5.AidaClient.FunctionalityType.CHAT,
      client_feature: this.clientFeature
    };
    return request;
  }
  get sessionId() {
    return this.#sessionId;
  }
  /**
   * The AI has instructions to emit structured suggestions in their response. This
   * function parses for that.
   *
   * Note: currently only StylingAgent and PerformanceAgent utilize this, but
   * eventually all agents should support this.
   */
  parseTextResponseForSuggestions(text) {
    if (!text) {
      return { answer: "" };
    }
    const lines = text.split("\n");
    const answerLines = [];
    let suggestions;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("SUGGESTIONS:")) {
        try {
          suggestions = sanitizeSuggestions(trimmed.substring("SUGGESTIONS:".length).trim());
        } catch {
        }
      } else {
        answerLines.push(line);
      }
    }
    if (!suggestions && answerLines.at(-1)?.includes("SUGGESTIONS:")) {
      const [answer, suggestionsText] = answerLines[answerLines.length - 1].split("SUGGESTIONS:", 2);
      try {
        suggestions = sanitizeSuggestions(suggestionsText.trim());
      } catch {
      }
      answerLines[answerLines.length - 1] = answer;
    }
    const response = {
      // If we could not parse the parts, consider the response to be an
      // answer.
      answer: answerLines.join("\n")
    };
    if (suggestions) {
      response.suggestions = suggestions;
    }
    return response;
  }
  /**
   * Parses a streaming text response into a
   * though/action/title/answer/suggestions component.
   */
  parseTextResponse(response) {
    return this.parseTextResponseForSuggestions(response.trim());
  }
  async finalizeAnswer(answer) {
    return answer;
  }
  /**
   * Declare a function that the AI model can call.
   * @param name The name of the function
   * @param declaration the function declaration. Currently functions must:
   * 1. Return an object of serializable key/value pairs. You cannot return
   *    anything other than a plain JavaScript object that can be serialized.
   * 2. Take one parameter which is an object that can have
   *    multiple keys and values. For example, rather than a function being called
   *    with two args, `foo` and `bar`, you should instead have the function be
   *    called with one object with `foo` and `bar` keys.
   */
  declareFunction(name, declaration) {
    if (this.#functionDeclarations.has(name)) {
      throw new Error(`Duplicate function declaration ${name}`);
    }
    this.#functionDeclarations.set(name, declaration);
  }
  clearDeclaredFunctions() {
    this.#functionDeclarations.clear();
  }
  /**
   * Executed immediately after the current context is populated with the selected
   * context and before the request is built.
   */
  async preRun() {
  }
  async *run(initialQuery, options, multimodalInput) {
    await options.selected?.refresh();
    this.context = options.selected ?? void 0;
    await this.preRun();
    const enhancedQuery = await this.enhanceQuery(initialQuery, options.selected, multimodalInput?.type);
    if (!enhancedQuery.trim() && !multimodalInput) {
      return;
    }
    Host5.userMetrics.freestylerQueryLength(enhancedQuery.length);
    let query;
    query = multimodalInput ? [{ text: enhancedQuery }, multimodalInput.input] : [{ text: enhancedQuery }];
    let request = this.buildRequest(query, Host5.AidaClient.Role.USER);
    const clientFeatureName = Host5.AidaClient.getClientFeatureName(this.clientFeature);
    debugLog(`[AiAgent] Starting conversation with client ${clientFeatureName}, userTier ${this.userTier}`);
    yield* this.handleContextDetails(options.selected);
    for (let i = 0; i < MAX_STEPS; i++) {
      yield {
        type: "querying" /* QUERYING */
      };
      if (i === 0) {
        debugLog("[AiAgent] Step 1: Sending user prompt to model:", enhancedQuery);
      } else if (!Array.isArray(query) && "functionResponse" in query) {
        debugLog(
          `[AiAgent] Step ${i + 1}: Sending function response for '${query.functionResponse.name}' to model:`,
          query.functionResponse.response
        );
      } else {
        debugLog(`[AiAgent] Step ${i + 1}: Sending request to model:`, request.current_message);
      }
      let rpcId;
      let textResponse = "";
      let functionCall = void 0;
      try {
        for await (const fetchResult of this.#aidaFetch(request, { signal: options.signal })) {
          rpcId = fetchResult.rpcId;
          textResponse = fetchResult.text ?? "";
          functionCall = fetchResult.functionCall;
          if (!functionCall && !fetchResult.completed) {
            const parsed = this.parseTextResponse(textResponse);
            const partialAnswer = "answer" in parsed ? parsed.answer : "";
            if (!partialAnswer) {
              continue;
            }
            yield {
              type: "answer" /* ANSWER */,
              text: partialAnswer,
              complete: false
            };
          }
        }
      } catch (err) {
        debugLog("Error calling the AIDA API", err);
        const error = aidaErrorToErrorType(err);
        yield this.#createErrorResponse(error);
        break;
      }
      this.#history.push(request.current_message);
      if (textResponse) {
        const parsedResponse = this.parseTextResponse(textResponse);
        if (!("answer" in parsedResponse)) {
          throw new Error("Expected a completed response to have an answer");
        }
        if (!functionCall) {
          debugLog(`[AiAgent] Step ${i + 1}: Model returned text response:`, parsedResponse.answer);
          this.#history.push({
            parts: [{
              text: parsedResponse.answer
            }],
            role: Host5.AidaClient.Role.MODEL
          });
        }
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceAnswerReceived);
        yield await this.finalizeAnswer({
          type: "answer" /* ANSWER */,
          text: parsedResponse.answer,
          suggestions: parsedResponse.suggestions,
          complete: true,
          rpcId
        });
        if (!functionCall) {
          break;
        }
      }
      if (functionCall) {
        debugLog(`[AiAgent] Step ${i + 1}: Model requested function call: ${functionCall.name}`, functionCall.args);
        const allowedOriginResult = this.#allowedOrigin?.();
        if (allowedOriginResult && "blocked" in allowedOriginResult) {
          yield this.#createErrorResponse("cross-origin" /* CROSS_ORIGIN */);
          break;
        }
        try {
          const result = yield* this.#callFunction(
            functionCall.name,
            functionCall.args,
            functionCall.thoughtSignature,
            {
              ...options,
              explanation: textResponse
            }
          );
          if (options.signal?.aborted) {
            yield this.#createErrorResponse("abort" /* ABORT */);
            break;
          }
          if ("context" in result) {
            yield {
              type: "context-change" /* CONTEXT_CHANGE */,
              description: result.description,
              context: result.context,
              widgets: result.widgets
            };
            return;
          }
          query = {
            functionResponse: {
              name: functionCall.name,
              // Widgets are not sent back to the LLM
              response: { ...result, widgets: void 0 }
            }
          };
          request = this.buildRequest(query, Host5.AidaClient.Role.ROLE_UNSPECIFIED);
        } catch (err) {
          if (err instanceof CrossOriginError) {
            yield this.#createErrorResponse("cross-origin" /* CROSS_ORIGIN */);
            break;
          }
          debugLog("Error handling function call", err);
          yield this.#createErrorResponse("unknown" /* UNKNOWN */);
          break;
        }
      } else {
        yield this.#createErrorResponse(i - 1 === MAX_STEPS ? "max-steps" /* MAX_STEPS */ : "unknown" /* UNKNOWN */);
        break;
      }
    }
    if (isStructuredLogEnabled()) {
      window.dispatchEvent(new CustomEvent("aiassistancedone"));
    }
    return;
  }
  async *#callFunction(name, args, thoughtSignature, options) {
    const call = this.#functionDeclarations.get(name);
    if (!call) {
      throw new Error(`Function ${name} is not found.`);
    }
    debugLog(`[AiAgent] Executing tool '${name}' with args:`, args);
    const parts = [];
    if (options?.explanation) {
      parts.push({
        text: options.explanation
      });
    }
    const functionCall = {
      name,
      args
    };
    if (thoughtSignature) {
      functionCall.thoughtSignature = thoughtSignature;
    }
    parts.push({ functionCall });
    this.#history.push({
      parts,
      role: Host5.AidaClient.Role.MODEL
    });
    let code;
    if (call.displayInfoFromArgs) {
      const { title, thought, action: callCode } = call.displayInfoFromArgs(args);
      code = callCode;
      if (title) {
        yield {
          type: "title" /* TITLE */,
          title
        };
      }
      if (thought) {
        yield {
          type: "thought" /* THOUGHT */,
          thought
        };
      }
    }
    const isOriginBlocked = () => {
      const allowedOriginResult = this.#allowedOrigin?.();
      return Boolean(allowedOriginResult && "blocked" in allowedOriginResult);
    };
    let result = await call.handler(args, options);
    if (isOriginBlocked()) {
      throw new CrossOriginError();
    }
    if ("requiresApproval" in result) {
      if (code) {
        yield {
          type: "action" /* ACTION */,
          code,
          canceled: false
        };
      }
      const sideEffectConfirmationPromiseWithResolvers = this.confirmSideEffect();
      void sideEffectConfirmationPromiseWithResolvers.promise.then((result2) => {
        Host5.userMetrics.actionTaken(
          result2 ? Host5.UserMetrics.Action.AiAssistanceSideEffectConfirmed : Host5.UserMetrics.Action.AiAssistanceSideEffectRejected
        );
      });
      if (options?.signal?.aborted) {
        sideEffectConfirmationPromiseWithResolvers.resolve(false);
      }
      const onAbort = () => {
        sideEffectConfirmationPromiseWithResolvers.resolve(false);
      };
      options?.signal?.addEventListener("abort", onAbort, { once: true });
      yield {
        type: "side-effect" /* SIDE_EFFECT */,
        confirm: sideEffectConfirmationPromiseWithResolvers.resolve,
        description: result.description
      };
      let approvedRun = false;
      try {
        approvedRun = await sideEffectConfirmationPromiseWithResolvers.promise;
      } finally {
        options?.signal?.removeEventListener("abort", onAbort);
      }
      if (!approvedRun) {
        yield {
          type: "action" /* ACTION */,
          code,
          output: "Error: User denied code execution with side effects.",
          canceled: true
        };
        debugLog(`[AiAgent] Tool '${name}' denied by user.`);
        return {
          result: "Error: User denied code execution with side effects."
        };
      }
      if (isOriginBlocked()) {
        throw new CrossOriginError();
      }
      result = await call.handler(args, {
        ...options,
        approved: true
      });
      if (isOriginBlocked()) {
        throw new CrossOriginError();
      }
    }
    if ("result" in result) {
      yield {
        type: "action" /* ACTION */,
        code,
        output: typeof result.result === "string" ? result.result : JSON.stringify(result.result),
        widgets: result.widgets,
        canceled: false,
        toolName: name
      };
    }
    if ("error" in result) {
      yield {
        type: "action" /* ACTION */,
        code,
        output: result.error,
        canceled: false,
        toolName: name
      };
    }
    debugLog(`[AiAgent] Tool '${name}' result:`, result);
    if ("context" in result) {
      return result;
    }
    return result;
  }
  async *#aidaFetch(request, options) {
    let aidaResponse = void 0;
    let rpcId;
    for await (aidaResponse of this.#aidaClient.doConversation(request, options)) {
      if (aidaResponse.functionCalls?.length) {
        if (aidaResponse.functionCalls.length > 1) {
          debugLog(
            `[AiAgent] Unexpected: received ${aidaResponse.functionCalls.length} function calls in response:`,
            aidaResponse.functionCalls
          );
        }
        yield {
          rpcId,
          functionCall: aidaResponse.functionCalls[0],
          completed: true,
          text: aidaResponse.explanation
        };
        break;
      }
      rpcId = aidaResponse.metadata.rpcGlobalId ?? rpcId;
      yield {
        rpcId,
        text: aidaResponse.explanation,
        completed: aidaResponse.completed
      };
    }
    if (isStructuredLogEnabled() && aidaResponse) {
      this.#structuredLog.push({
        request: structuredClone(request),
        aidaResponse
      });
      try {
        localStorage.setItem("aiAssistanceStructuredLog", JSON.stringify(this.#structuredLog));
      } catch (err) {
        console.warn('Failed to write to local storage "aiAssistanceStructuredLog":', err);
      }
    }
  }
  #removeLastRunParts() {
    this.#history.splice(this.#history.findLastIndex((item) => {
      return item.role === Host5.AidaClient.Role.USER;
    }));
  }
  #createErrorResponse(error) {
    this.#removeLastRunParts();
    this.clearCache();
    if (error !== "abort" /* ABORT */) {
      Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceError);
    }
    return {
      type: "error" /* ERROR */,
      error
    };
  }
};
function sanitizeSuggestions(suggestions) {
  const parsed = JSON.parse(suggestions);
  if (!Array.isArray(parsed)) {
    return void 0;
  }
  const sanitized = [];
  for (const item of parsed) {
    if (typeof item !== "string") {
      continue;
    }
    const noExtraWhitespace = item.replace(/\s+/g, " ").trim();
    if (noExtraWhitespace.length === 0) {
      continue;
    }
    sanitized.push(noExtraWhitespace.substring(0, MAX_SUGGESTION_LENGTH));
  }
  if (sanitized.length === 0) {
    return void 0;
  }
  return sanitized;
}
function aidaErrorToErrorType(err) {
  if (err instanceof Host5.AidaClient.AidaAbortError) {
    return "abort" /* ABORT */;
  }
  if (err instanceof Host5.AidaClient.AidaBlockError) {
    return "block" /* BLOCK */;
  }
  if (err instanceof Host5.AidaClient.AidaQuotaError) {
    return "quota" /* QUOTA */;
  }
  if (err instanceof Host5.AidaClient.AidaPayloadTooLargeError) {
    return "payload-too-large" /* PAYLOAD_TOO_LARGE */;
  }
  return "unknown" /* UNKNOWN */;
}

// ../../front_end/models/ai_assistance/contexts/DOMNodeContext.ts
var UIStringsNotTranslate2 = {
  /**
   * @description Heading text for context details of DevTools AI Agent.
   */
  dataUsed: "Data used"
};
var lockedString3 = i18n6.i18n.lockedString;
var DOMNodeContext = class extends ConversationContext {
  #node;
  constructor(node) {
    super();
    this.#node = node;
  }
  getURL() {
    const ownerDocument = this.#node.ownerDocument;
    if (!ownerDocument) {
      return "detached";
    }
    return ownerDocument.documentURL;
  }
  getItem() {
    return this.#node;
  }
  getTitle() {
    throw new Error("Not implemented");
  }
  async getSuggestions() {
    const layoutProps = await this.#node.domModel().cssModel().getLayoutPropertiesFromComputedStyle(this.#node.id);
    if (!layoutProps) {
      return;
    }
    if (layoutProps.isFlex) {
      return [
        { title: "How can I make flex items wrap?", jslogContext: "flex-wrap" },
        { title: "How do I distribute flex items evenly?", jslogContext: "flex-distribute" },
        { title: "What is flexbox?", jslogContext: "flex-what" }
      ];
    }
    if (layoutProps.isSubgrid) {
      return [
        { title: "Where is this grid defined?", jslogContext: "subgrid-where" },
        { title: "How to overwrite parent grid properties?", jslogContext: "subgrid-override" },
        { title: "How do subgrids work? ", jslogContext: "subgrid-how" }
      ];
    }
    if (layoutProps.isGrid) {
      return [
        { title: "How do I align items in a grid?", jslogContext: "grid-align" },
        { title: "How to add spacing between grid items?", jslogContext: "grid-gap" },
        { title: "How does grid layout work?", jslogContext: "grid-how" }
      ];
    }
    if (layoutProps.hasScroll) {
      return [
        { title: "How do I remove scrollbars for this element?", jslogContext: "scroll-remove" },
        { title: "How can I style a scrollbar?", jslogContext: "scroll-style" },
        { title: "Why does this element scroll?", jslogContext: "scroll-why" }
      ];
    }
    if (layoutProps.containerType) {
      return [
        { title: "What are container queries?", jslogContext: "container-what" },
        { title: "How do I use container-type?", jslogContext: "container-how" },
        { title: "What's the container context for this element?", jslogContext: "container-context" }
      ];
    }
    return;
  }
  async getPromptDetails() {
    return `# Inspected element

${await this.describe()}`;
  }
  async getUserFacingDetails() {
    return [
      {
        title: lockedString3(UIStringsNotTranslate2.dataUsed),
        text: await this.describe()
      }
    ];
  }
  async describe() {
    const element = this.#node;
    let output = `* Element's uid is ${element.backendNodeId()}.
* Its selector is \`${element.simpleSelector()}\``;
    const childNodes = await element.getChildNodesPromise();
    if (childNodes) {
      const textChildNodes = childNodes.filter((childNode) => childNode.nodeType() === Node.TEXT_NODE);
      const elementChildNodes = childNodes.filter((childNode) => childNode.nodeType() === Node.ELEMENT_NODE);
      switch (elementChildNodes.length) {
        case 0:
          output += "\n* It doesn't have any child element nodes";
          break;
        case 1:
          output += `
* It only has 1 child element node: \`${elementChildNodes[0].simpleSelector()}\``;
          break;
        default:
          output += `
* It has ${elementChildNodes.length} child element nodes: ${elementChildNodes.map((node) => `\`${node.simpleSelector()}\` (uid=${node.backendNodeId()})`).join(", ")}`;
      }
      switch (textChildNodes.length) {
        case 0:
          output += "\n* It doesn't have any child text nodes";
          break;
        case 1:
          output += "\n* It only has 1 child text node";
          break;
        default:
          output += `
* It has ${textChildNodes.length} child text nodes`;
      }
    }
    if (element.nextSibling) {
      const elementOrNodeElementNodeText = element.nextSibling.nodeType() === Node.ELEMENT_NODE ? `an element (uid=${element.nextSibling.backendNodeId()})` : "a non element";
      output += `
* It has a next sibling and it is ${elementOrNodeElementNodeText} node`;
    }
    if (element.previousSibling) {
      const elementOrNodeElementNodeText = element.previousSibling.nodeType() === Node.ELEMENT_NODE ? `an element (uid=${element.previousSibling.backendNodeId()})` : "a non element";
      output += `
* It has a previous sibling and it is ${elementOrNodeElementNodeText} node`;
    }
    if (element.isInShadowTree()) {
      output += "\n* It is in a shadow DOM tree.";
    }
    const parentNode = element.parentNode;
    if (parentNode) {
      const parentChildrenNodes = await parentNode.getChildNodesPromise();
      output += `
* Its parent's selector is \`${parentNode.simpleSelector()}\` (uid=${parentNode.backendNodeId()})`;
      const elementOrNodeElementNodeText = parentNode.nodeType() === Node.ELEMENT_NODE ? "an element" : "a non element";
      output += `
* Its parent is ${elementOrNodeElementNodeText} node`;
      if (parentNode.isShadowRoot()) {
        output += "\n* Its parent is a shadow root.";
      }
      if (parentChildrenNodes) {
        const childElementNodes = parentChildrenNodes.filter((siblingNode) => siblingNode.nodeType() === Node.ELEMENT_NODE);
        switch (childElementNodes.length) {
          case 0:
            break;
          case 1:
            output += "\n* Its parent has only 1 child element node";
            break;
          default:
            output += `
* Its parent has ${childElementNodes.length} child element nodes: ${childElementNodes.map((node) => `\`${node.simpleSelector()}\` (uid=${node.backendNodeId()})`).join(", ")}`;
            break;
        }
        const siblingTextNodes = parentChildrenNodes.filter((siblingNode) => siblingNode.nodeType() === Node.TEXT_NODE);
        switch (siblingTextNodes.length) {
          case 0:
            break;
          case 1:
            output += "\n* Its parent has only 1 child text node";
            break;
          default:
            output += `
* Its parent has ${siblingTextNodes.length} child text nodes: ${siblingTextNodes.map((node) => `\`${node.simpleSelector()}\``).join(", ")}`;
            break;
        }
      }
    }
    return output.trim();
  }
};

// ../../front_end/models/ai_assistance/tools/GetElementAccessibilityDetails.ts
var GetElementAccessibilityDetailsTool = class {
  name = "getElementAccessibilityDetails" /* GET_ELEMENT_ACCESSIBILITY_DETAILS */;
  description = "Get detailed accessibility information for an element on the inspected page by its backend node ID.";
  parameters = {
    type: Host6.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for getting element accessibility details.",
    nullable: false,
    properties: {
      explanation: {
        type: Host6.AidaClient.ParametersTypes.STRING,
        description: "Reason for requesting accessibility details.",
        nullable: false
      },
      element: {
        type: Host6.AidaClient.ParametersTypes.INTEGER,
        description: "The backend node ID of the element.",
        nullable: false
      }
    },
    required: ["explanation", "element"]
  };
  displayInfoFromArgs(params) {
    return {
      title: "Reading accessibility details",
      thought: params.explanation,
      action: `getElementAccessibilityDetails(${params.element})`
    };
  }
  /**
   * Handles the request to retrieve accessibility details.
   *
   * Resolves the element backend node ID, validates its origin against the locked origin,
   * requests the AX subtree via AccessibilityModel, and maps the relevant attributes.
   */
  async handler(params, context) {
    const establishedOrigin = context.getEstablishedOrigin();
    if (!establishedOrigin) {
      return { error: "Error: Origin lock is not established." };
    }
    const target = context.getTarget();
    if (!target) {
      return { error: "Error: Inspected target not found." };
    }
    const deferredNode = new SDK6.DOMModel.DeferredDOMNode(target, params.element);
    const resolved = await deferredNode.resolvePromise();
    if (!resolved) {
      return { error: "Error: Could not resolve element by ID." };
    }
    const nodeContext = new DOMNodeContext(resolved);
    if (!nodeContext.isOriginAllowed(establishedOrigin)) {
      return { error: "Error: Node does not belong to the locked origin." };
    }
    const axModel = target.model(SDK6.AccessibilityModel.AccessibilityModel);
    if (!axModel) {
      return { error: "Error: Accessibility model not found." };
    }
    await axModel.requestAndLoadSubTreeToNode(resolved);
    const axNode = axModel.axNodeForDOMNode(resolved);
    if (!axNode) {
      return { error: "Error: AX node details not found." };
    }
    const result = {
      role: axNode.role()?.value,
      name: axNode.name()?.value,
      nameSource: axNode.name()?.sources?.[0]?.type,
      properties: axNode.properties()?.map((p) => ({ name: p.name, value: p.value?.value })) ?? [],
      ariaAttributes: resolved.attributes().filter((attr) => attr.name.startsWith("aria-") || attr.name === "role").reduce(
        (acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        },
        {}
      ),
      isIgnored: axNode.ignored(),
      ignoredReasons: axNode.ignoredReasons()?.map((p) => ({ name: p.name, value: p.value?.value })) ?? [],
      backendNodeId: resolved.backendNodeId()
    };
    const snapshot = await resolved.takeSnapshot();
    return {
      result: JSON.stringify(result, null, 2),
      widgets: [{
        name: "DOM_TREE",
        data: {
          root: snapshot,
          title: i18n8.i18n.lockedString("Element details"),
          accessibleRevealLabel: i18n8.i18n.lockedString("Reveal element")
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetFunctionCode.ts
var GetFunctionCode_exports = {};
__export(GetFunctionCode_exports, {
  GetFunctionCodeTool: () => GetFunctionCodeTool
});
import * as Host7 from "../../core/host/host.js";
import * as i18n10 from "../../core/i18n/i18n.js";
var UIStringsNotTranslate3 = {
  lookingUpFunctionCode: "Looking up function code"
};
var lockedString4 = i18n10.i18n.lockedString;
var GetFunctionCodeTool = class {
  name = "getFunctionCode" /* GET_FUNCTION_CODE */;
  description = "Returns the code for a function defined at the given location. The result is annotated with the runtime performance of each line of code.";
  parameters = {
    type: Host7.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for looking up function code.",
    nullable: false,
    properties: {
      scriptUrl: {
        type: Host7.AidaClient.ParametersTypes.STRING,
        description: "The url of the function.",
        nullable: false
      },
      line: {
        type: Host7.AidaClient.ParametersTypes.INTEGER,
        description: "The line number where the function is defined.",
        nullable: false
      },
      column: {
        type: Host7.AidaClient.ParametersTypes.INTEGER,
        description: "The column number where the function is defined.",
        nullable: false
      }
    },
    required: ["scriptUrl", "line", "column"]
  };
  displayInfoFromArgs(params) {
    return {
      title: lockedString4(UIStringsNotTranslate3.lookingUpFunctionCode),
      action: `getFunctionCode('${params.scriptUrl}', ${params.line}, ${params.column})`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    if (performanceTraceContext.getOrigin().startsWith("imported-trace://")) {
      return { error: "Cannot use this tool on an imported file." };
    }
    if (!params.scriptUrl) {
      return { error: "Missing arg: scriptUrl" };
    }
    const allowedOrigin = performanceTraceContext.getOrigin();
    if (!canResourceContentsBeReadForTrace(params.scriptUrl, allowedOrigin)) {
      return { error: "Script not found" };
    }
    if (params.line === void 0) {
      return { error: "Missing arg: line" };
    }
    if (params.column === void 0) {
      return { error: "Missing arg: column" };
    }
    const formatter = performanceTraceContext.createFormatter();
    const url = params.scriptUrl;
    const code = await formatter.resolveFunctionCodeAtLocation(url, params.line, params.column);
    if (!code) {
      return { error: "Could not find code" };
    }
    const result = formatter.formatFunctionCode(code);
    return {
      result,
      widgets: [{
        name: "SOURCE_CODE",
        data: {
          url,
          line: params.line,
          column: params.column,
          code: code.code
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetInsightDetails.ts
var GetInsightDetails_exports = {};
__export(GetInsightDetails_exports, {
  GetInsightDetailsTool: () => GetInsightDetailsTool
});
import * as Host8 from "../../core/host/host.js";
import * as i18n12 from "../../core/i18n/i18n.js";
import * as SDK7 from "../../core/sdk/sdk.js";
import * as TextUtils2 from "../../core/text_utils/text_utils.js";
import * as Logs2 from "../logs/logs.js";
import * as Trace6 from "../trace/trace.js";

// ../../front_end/models/ai_assistance/data_formatters/PerformanceInsightFormatter.ts
var PerformanceInsightFormatter_exports = {};
__export(PerformanceInsightFormatter_exports, {
  PerformanceInsightFormatter: () => PerformanceInsightFormatter
});
import * as Common7 from "../../core/common/common.js";
import * as Trace5 from "../trace/trace.js";

// ../../front_end/models/ai_assistance/data_formatters/PerformanceTraceFormatter.ts
var PerformanceTraceFormatter_exports = {};
__export(PerformanceTraceFormatter_exports, {
  PerformanceTraceFormatter: () => PerformanceTraceFormatter,
  formatEventForAI: () => formatEventForAI
});
import * as CrUXManager from "../crux-manager/crux-manager.js";
import * as Trace4 from "../trace/trace.js";

// ../../front_end/models/ai_assistance/performance/AIQueries.ts
var AIQueries_exports = {};
__export(AIQueries_exports, {
  AIQueries: () => AIQueries
});
import * as Trace3 from "../trace/trace.js";
var AIQueries = class {
  static findMainThread(navigationId, parsedTrace) {
    let mainThreadPID = null;
    let mainThreadTID = null;
    if (navigationId) {
      const navigation = parsedTrace.data.Meta.navigationsByNavigationId.get(navigationId);
      if (navigation?.args.data?.isOutermostMainFrame) {
        mainThreadPID = navigation.pid;
        mainThreadTID = navigation.tid;
      }
    }
    const threads = Trace3.Handlers.Threads.threadsInTrace(parsedTrace.data);
    const thread = threads.find((thread2) => {
      if (!thread2.processIsOnMainFrame) {
        return false;
      }
      if (mainThreadPID && mainThreadTID) {
        return thread2.pid === mainThreadPID && thread2.tid === mainThreadTID;
      }
      return thread2.type === Trace3.Handlers.Threads.ThreadType.MAIN_THREAD;
    });
    return thread ?? null;
  }
  /**
   * Returns bottom up activity for the given range (within a single navigation / thread).
   */
  static mainThreadActivityBottomUpSingleNavigation(navigationId, bounds, parsedTrace) {
    const thread = this.findMainThread(navigationId, parsedTrace);
    if (!thread) {
      return null;
    }
    const events = AICallTree.findEventsForThread({ thread, parsedTrace, bounds });
    if (!events) {
      return null;
    }
    const visibleEvents = Trace3.Helpers.Trace.VISIBLE_TRACE_EVENT_TYPES.values().toArray();
    const filter = new Trace3.Extras.TraceFilter.VisibleEventsFilter(
      visibleEvents.concat([Trace3.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST])
    );
    const startTime = Trace3.Helpers.Timing.microToMilli(bounds.min);
    const endTime = Trace3.Helpers.Timing.microToMilli(bounds.max);
    return new Trace3.Extras.TraceTree.BottomUpRootNode(events, {
      textFilter: new Trace3.Extras.TraceFilter.ExclusiveNameFilter([]),
      filters: [filter],
      startTime,
      endTime
    });
  }
  /**
   * Returns bottom up activity for the given range (no matter the navigation / thread).
   */
  static mainThreadActivityBottomUp(bounds, parsedTrace) {
    const threads = [];
    if (parsedTrace.insights) {
      for (const insightSet of parsedTrace.insights?.values()) {
        const thread = this.findMainThread(insightSet.navigation?.args.data?.navigationId, parsedTrace);
        if (thread) {
          threads.push(thread);
        }
      }
    } else {
      const navigationId = parsedTrace.data.Meta.mainFrameNavigations[0].args.data?.navigationId;
      const thread = this.findMainThread(navigationId, parsedTrace);
      if (thread) {
        threads.push(thread);
      }
    }
    if (threads.length === 0) {
      return null;
    }
    const threadEvents = [...new Set(threads)].map((thread) => AICallTree.findEventsForThread({ thread, parsedTrace, bounds }) ?? []);
    const events = threadEvents.flat();
    if (events.length === 0) {
      return null;
    }
    const visibleEvents = Trace3.Helpers.Trace.VISIBLE_TRACE_EVENT_TYPES.values().toArray();
    const filter = new Trace3.Extras.TraceFilter.VisibleEventsFilter(
      visibleEvents.concat([Trace3.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST])
    );
    const startTime = Trace3.Helpers.Timing.microToMilli(bounds.min);
    const endTime = Trace3.Helpers.Timing.microToMilli(bounds.max);
    return new Trace3.Extras.TraceTree.BottomUpRootNode(events, {
      textFilter: new Trace3.Extras.TraceFilter.ExclusiveNameFilter([]),
      filters: [filter],
      startTime,
      endTime
    });
  }
  /**
   * Returns an AI Call Tree representing the activity on the main thread for
   * the relevant time range of the given insight.
   */
  static mainThreadActivityTopDown(navigationId, bounds, parsedTrace) {
    const thread = this.findMainThread(navigationId, parsedTrace);
    if (!thread) {
      return null;
    }
    return AICallTree.fromTimeOnThread({
      thread: {
        pid: thread.pid,
        tid: thread.tid
      },
      parsedTrace,
      bounds
    });
  }
  /**
   * Returns the top longest tasks as AI Call Trees.
   */
  static longestTasks(navigationId, bounds, parsedTrace, limit = 3) {
    const thread = this.findMainThread(navigationId, parsedTrace);
    if (!thread) {
      return null;
    }
    const tasks = AICallTree.findMainThreadTasks({ thread, parsedTrace, bounds });
    if (!tasks) {
      return null;
    }
    const topTasks = tasks.filter((e) => e.name === "RunTask").sort((a, b) => b.dur - a.dur).slice(0, limit);
    return topTasks.map((task) => {
      const tree = AICallTree.fromEvent(task, parsedTrace);
      if (tree) {
        tree.selectedNode = null;
      }
      return tree;
    }).filter((tree) => !!tree);
  }
};

// ../../front_end/models/ai_assistance/data_formatters/NetworkRequestFormatter.ts
var NetworkRequestFormatter_exports = {};
__export(NetworkRequestFormatter_exports, {
  NetworkRequestFormatter: () => NetworkRequestFormatter,
  sanitizeHeaders: () => sanitizeHeaders
});
import * as Common6 from "../../core/common/common.js";
import * as TextUtils from "../../core/text_utils/text_utils.js";
import * as Logs from "../logs/logs.js";
import * as NetworkTimeCalculator from "../network_time_calculator/network_time_calculator.js";
var MAX_HEADERS_SIZE = 1e3;
var MAX_BODY_SIZE = 1e4;
function sanitizeHeaders(headers) {
  return headers.map((header) => {
    if (NetworkRequestFormatter.allowHeader(header.name)) {
      return header;
    }
    return { name: header.name, value: "<redacted>" };
  });
}
var NetworkRequestFormatter = class _NetworkRequestFormatter {
  #calculator;
  #request;
  static allowHeader(headerName) {
    return allowedHeaders.has(headerName.toLowerCase().trim());
  }
  static formatHeaders(title, headers, addListPrefixToEachLine) {
    return formatLines(
      title,
      sanitizeHeaders(headers).map((header) => {
        const prefix = addListPrefixToEachLine ? "- " : "";
        return prefix + header.name + ": " + header.value + "\n";
      }),
      MAX_HEADERS_SIZE
    );
  }
  static async formatBody(title, request, maxBodySize) {
    const data = await request.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(data)) {
      return "";
    }
    if (data.isEmpty) {
      return `${title}
<empty response>`;
    }
    if (data.isTextContent) {
      const dataAsText = data.text;
      if (dataAsText.length > maxBodySize) {
        return `${title}
${dataAsText.substring(0, maxBodySize) + "... <truncated>"}`;
      }
      return `${title}
${dataAsText}`;
    }
    return `${title}
<binary data>`;
  }
  static formatInitiatorUrl(initiatorUrl, allowedOrigin) {
    const initiatorOrigin = Common6.ParsedURL.ParsedURL.extractOrigin(initiatorUrl);
    if (initiatorOrigin && initiatorOrigin === allowedOrigin) {
      return initiatorUrl;
    }
    return "<redacted cross-origin initiator URL>";
  }
  static formatStatus(status) {
    let responseStatus = "";
    if (status.statusCode) {
      const statusText = status.statusText ? ` ${status.statusText}` : "";
      responseStatus = `Response status: ${status.statusCode}${statusText}
`;
    }
    const flags = [];
    flags.push(status.finished ? "finished" : "pending");
    if (status.failed) {
      flags.push("failed");
    }
    if (status.canceled) {
      flags.push("canceled");
    }
    if (status.preserved) {
      flags.push("preserved");
    }
    const requestStatus = flags.length > 0 ? `Network request status: ${flags.join(", ")}
` : "";
    return `${responseStatus}${requestStatus}`;
  }
  static formatFailureReasons(reasons) {
    const lines = [];
    if (reasons.blockedReason) {
      if (reasons.blockedReason === Network.BlockedReason.Inspector) {
        lines.push("Blocked reason: a custom network condition in DevTools is blocking this request");
      } else {
        lines.push(`Blocked reason: ${reasons.blockedReason}`);
      }
    }
    if (reasons.corsErrorStatus) {
      lines.push(`CORS error: ${reasons.corsErrorStatus.corsError} ${reasons.corsErrorStatus.failedParameter}`);
    }
    if (reasons.localizedFailDescription) {
      lines.push(`Fail description: ${reasons.localizedFailDescription}`);
    }
    return lines.length > 0 ? `${lines.join("\n")}
` : "";
  }
  #networkLog;
  constructor(request, calculator, networkLog = Logs.NetworkLog.NetworkLog.instance()) {
    this.#request = request;
    this.#calculator = calculator;
    this.#networkLog = networkLog;
  }
  formatRequestHeaders() {
    return _NetworkRequestFormatter.formatHeaders("Request headers:", this.#request.requestHeaders());
  }
  formatResponseHeaders() {
    return _NetworkRequestFormatter.formatHeaders("Response headers:", this.#request.responseHeaders);
  }
  async formatResponseBody() {
    return await _NetworkRequestFormatter.formatBody("Response body:", this.#request, MAX_BODY_SIZE);
  }
  /**
   * Note: nothing here should include information from origins other than
   * the request's origin.
   */
  async formatNetworkRequest() {
    let responseBody = await this.formatResponseBody();
    if (responseBody) {
      responseBody = `

${responseBody}`;
    }
    return `Request: ${this.#request.url()}
${this.formatRequestHeaders()}

${this.formatResponseHeaders()}${responseBody}

${this.formatStatus()}${this.formatFailureReasons()}
Request timing:
${this.formatNetworkRequestTiming()}

Request initiator chain:
${this.formatRequestInitiatorChain()}`;
  }
  formatStatus() {
    return _NetworkRequestFormatter.formatStatus({
      statusCode: this.#request.statusCode,
      statusText: this.#request.statusText,
      failed: this.#request.failed,
      canceled: this.#request.canceled,
      preserved: this.#request.preserved,
      finished: this.#request.finished
    });
  }
  formatFailureReasons() {
    return _NetworkRequestFormatter.formatFailureReasons({
      blockedReason: this.#request.blockedReason(),
      corsErrorStatus: this.#request.corsErrorStatus(),
      localizedFailDescription: this.#request.localizedFailDescription
    });
  }
  /**
   * Note: nothing here should include information from origins other than
   * the request's origin.
   */
  formatRequestInitiatorChain() {
    const allowedOrigin = Common6.ParsedURL.ParsedURL.extractOrigin(this.#request.url());
    let initiatorChain = "";
    let lineStart = "- URL: ";
    const graph = this.#networkLog.initiatorGraphForRequest(this.#request);
    for (const initiator of Array.from(graph.initiators).reverse()) {
      initiatorChain = initiatorChain + lineStart + _NetworkRequestFormatter.formatInitiatorUrl(initiator.url(), allowedOrigin) + "\n";
      lineStart = "	" + lineStart;
      if (initiator === this.#request) {
        initiatorChain = this.#formatRequestInitiated(graph.initiated, this.#request, initiatorChain, lineStart, allowedOrigin);
      }
    }
    return initiatorChain.trim();
  }
  formatNetworkRequestTiming() {
    const results = NetworkTimeCalculator.calculateRequestTimeRanges(this.#request, this.#calculator.minimumBoundary());
    const getDuration = (name) => {
      const result = results.find((r) => r.name === name);
      if (!result) {
        return;
      }
      return seconds(result.end - result.start);
    };
    const labels = [
      {
        label: "Queued at (timestamp)",
        value: seconds(this.#request.issueTime() - this.#calculator.zeroTime())
      },
      {
        label: "Started at (timestamp)",
        value: seconds(this.#request.startTime - this.#calculator.zeroTime())
      },
      {
        label: "Queueing (duration)",
        value: getDuration("queueing")
      },
      {
        label: "Connection start (stalled) (duration)",
        value: getDuration("blocking")
      },
      {
        label: "Request sent (duration)",
        value: getDuration("sending")
      },
      {
        label: "Waiting for server response (duration)",
        value: getDuration("waiting")
      },
      {
        label: "Content download (duration)",
        value: getDuration("receiving")
      },
      {
        label: "Duration (duration)",
        value: getDuration("total")
      }
    ];
    return labels.filter((label) => !!label.value).map((label) => `${label.label}: ${label.value}`).join("\n");
  }
  #formatRequestInitiated(initiated, parentRequest, initiatorChain, lineStart, allowedOrigin) {
    const visited = /* @__PURE__ */ new Set();
    visited.add(this.#request);
    for (const [keyRequest, initiatedRequest] of initiated.entries()) {
      if (initiatedRequest === parentRequest) {
        if (!visited.has(keyRequest)) {
          visited.add(keyRequest);
          initiatorChain = initiatorChain + lineStart + _NetworkRequestFormatter.formatInitiatorUrl(keyRequest.url(), allowedOrigin) + "\n";
          initiatorChain = this.#formatRequestInitiated(initiated, keyRequest, initiatorChain, "	" + lineStart, allowedOrigin);
        }
      }
    }
    return initiatorChain;
  }
};
var allowedHeaders = /* @__PURE__ */ new Set([
  ":authority",
  ":method",
  ":path",
  ":scheme",
  "a-im",
  "accept-ch",
  "accept-charset",
  "accept-datetime",
  "accept-encoding",
  "accept-language",
  "accept-patch",
  "accept-ranges",
  "accept",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-allow-origin",
  "access-control-expose-headers",
  "access-control-max-age",
  "access-control-request-headers",
  "access-control-request-method",
  "age",
  "allow",
  "alt-svc",
  "cache-control",
  "connection",
  "content-disposition",
  "content-encoding",
  "content-language",
  "content-location",
  "content-range",
  "content-security-policy",
  "content-type",
  "correlation-id",
  "date",
  "delta-base",
  "dnt",
  "expect-ct",
  "expect",
  "expires",
  "forwarded",
  "front-end-https",
  "host",
  "http2-settings",
  "if-modified-since",
  "if-range",
  "if-unmodified-source",
  "im",
  "last-modified",
  "link",
  "location",
  "max-forwards",
  "nel",
  "origin",
  "permissions-policy",
  "pragma",
  "preference-applied",
  "proxy-connection",
  "public-key-pins",
  "range",
  "referer",
  "refresh",
  "report-to",
  "retry-after",
  "save-data",
  "sec-gpc",
  "server",
  "status",
  "strict-transport-security",
  "te",
  "timing-allow-origin",
  "tk",
  "trailer",
  "transfer-encoding",
  "upgrade-insecure-requests",
  "upgrade",
  "user-agent",
  "vary",
  "via",
  "warning",
  "www-authenticate",
  "x-att-deviceid",
  "x-content-duration",
  "x-content-security-policy",
  "x-content-type-options",
  "x-correlation-id",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-frame-options",
  "x-http-method-override",
  "x-powered-by",
  "x-redirected-by",
  "x-request-id",
  "x-requested-with",
  "x-ua-compatible",
  "x-wap-profile",
  "x-webkit-csp",
  "x-xss-protection"
]);
function formatLines(title, lines, maxLength) {
  let result = "";
  for (const line of lines) {
    if (result.length + line.length > maxLength) {
      break;
    }
    result += line;
  }
  result = result.trim();
  return result && title ? title + "\n" + result : result;
}

// ../../front_end/models/ai_assistance/data_formatters/PerformanceTraceFormatter.ts
var PerformanceTraceFormatter = class {
  #focus;
  #parsedTrace;
  #insightSet;
  #eventsSerializer;
  #formattedFunctionCodes = /* @__PURE__ */ new Set();
  #deviceScope;
  resolveFunctionCode;
  #cruxManager;
  constructor(focus, deviceScope = null, cruxManager) {
    this.#focus = focus;
    this.#parsedTrace = focus.parsedTrace;
    this.#insightSet = focus.primaryInsightSet;
    this.#eventsSerializer = focus.eventsSerializer;
    this.#deviceScope = deviceScope;
    if (cruxManager) {
      this.#cruxManager = cruxManager;
    } else {
      try {
        this.#cruxManager = CrUXManager.CrUXManager.instance();
      } catch {
        this.#cruxManager = null;
      }
    }
  }
  serializeEvent(event) {
    const key = this.#eventsSerializer.keyForEvent(event);
    return `(eventKey: ${key}, ts: ${event.ts})`;
  }
  serializeBounds(bounds) {
    return `{min: ${bounds.min}\xB5s, max: ${bounds.max}\xB5s}`;
  }
  /**
   * Fetching the Crux summary can error outside of DevTools, hence the
   * try-catch around it here.
   */
  #getCruxTraceSummary(insightSet) {
    if (insightSet === null) {
      return [];
    }
    try {
      let cruxScope;
      if (this.#deviceScope) {
        cruxScope = { pageScope: "url", deviceScope: this.#deviceScope };
      } else if (this.#cruxManager) {
        cruxScope = this.#cruxManager.getSelectedScope();
      } else {
        return [];
      }
      const parts = [];
      const fieldMetrics = Trace4.Insights.Common.getFieldMetricsForInsightSet(insightSet, this.#parsedTrace.metadata, cruxScope);
      const fieldLcp = fieldMetrics?.lcp;
      const fieldInp = fieldMetrics?.inp;
      const fieldCls = fieldMetrics?.cls;
      if (fieldLcp || fieldInp || fieldCls) {
        parts.push("Metrics (field / real users):");
        const serializeFieldMetricTimingResult = (fieldMetric) => {
          return `${Math.round(fieldMetric.value / 1e3)} ms (scope: ${fieldMetric.pageScope})`;
        };
        const serializeFieldMetricNumberResult = (fieldMetric) => {
          return `${fieldMetric.value.toFixed(2)} (scope: ${fieldMetric.pageScope})`;
        };
        if (fieldLcp) {
          parts.push(`  - LCP: ${serializeFieldMetricTimingResult(fieldLcp)}`);
          const fieldLcpBreakdown = fieldMetrics?.lcpBreakdown;
          if (fieldLcpBreakdown && (fieldLcpBreakdown.ttfb || fieldLcpBreakdown.loadDelay || fieldLcpBreakdown.loadDuration || fieldLcpBreakdown.renderDelay)) {
            parts.push("  - LCP breakdown:");
            if (fieldLcpBreakdown.ttfb) {
              parts.push(`    - TTFB: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.ttfb)}`);
            }
            if (fieldLcpBreakdown.loadDelay) {
              parts.push(`    - Load delay: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.loadDelay)}`);
            }
            if (fieldLcpBreakdown.loadDuration) {
              parts.push(`    - Load duration: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.loadDuration)}`);
            }
            if (fieldLcpBreakdown.renderDelay) {
              parts.push(`    - Render delay: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.renderDelay)}`);
            }
          }
        }
        if (fieldInp) {
          parts.push(`  - INP: ${serializeFieldMetricTimingResult(fieldInp)}`);
        }
        if (fieldCls) {
          parts.push(`  - CLS: ${serializeFieldMetricNumberResult(fieldCls)}`);
        }
        parts.push(
          "  - The above data is from CrUX\u2013Chrome User Experience Report. It's how the page performs for real users."
        );
        parts.push("  - The values shown above are the p75 measure of all real Chrome users");
        parts.push("  - The scope indicates if the data came from the entire origin, or a specific url");
        parts.push(
          "  - Lab metrics describe how this specific page load performed, while field metrics are an aggregation of results from real-world users. Best practice is to prioritize metrics that are bad in field data. Lab metrics may be better or worse than fields metrics depending on the developer's machine, network, or the actions performed while tracing."
        );
      }
      return parts;
    } catch {
      return [];
    }
  }
  formatTraceSummary() {
    const parsedTrace = this.#parsedTrace;
    const traceMetadata = this.#parsedTrace.metadata;
    const data = parsedTrace.data;
    const parts = [];
    parts.push(`URL: ${data.Meta.mainFrameURL}`);
    parts.push(`Trace bounds: ${this.serializeBounds(data.Meta.traceBounds)}`);
    parts.push("CPU throttling: " + (traceMetadata.cpuThrottling ? `${traceMetadata.cpuThrottling}x` : "none"));
    parts.push(`Network throttling: ${traceMetadata.networkThrottling ?? "none"}`);
    parts.push("\n# Available insight sets\n");
    parts.push(
      "The following is a list of insight sets. An insight set covers a specific part of the trace, split by navigations. The insights within each insight set are specific to that part of the trace. Be sure to consider the insight set id and bounds when calling functions. If no specific insight set or navigation is mentioned, assume the user is referring to the first one."
    );
    for (const insightSet of parsedTrace.insights?.values() ?? []) {
      const lcp = Trace4.Insights.Common.getLCP(insightSet);
      const cls = Trace4.Insights.Common.getCLS(insightSet);
      const inp = Trace4.Insights.Common.getINP(insightSet);
      parts.push(`
## insight set id: ${insightSet.id}
`);
      parts.push(`URL: ${insightSet.url}`);
      parts.push(`Bounds: ${this.serializeBounds(insightSet.bounds)}`);
      if (lcp || cls || inp) {
        parts.push("Metrics (lab / observed):");
        if (lcp) {
          const nodeId = insightSet.model.LCPBreakdown?.lcpEvent?.args.data?.nodeId;
          const nodeIdText = nodeId !== void 0 ? `, nodeId: ${nodeId}` : "";
          parts.push(
            `  - LCP: ${Math.round(lcp.value / 1e3)} ms, event: ${this.serializeEvent(lcp.event)}${nodeIdText}`
          );
          const subparts = insightSet.model.LCPBreakdown?.subparts;
          if (subparts) {
            const serializeSubpart = (subpart) => {
              return `${micros(subpart.range)}, bounds: ${this.serializeBounds(subpart)}`;
            };
            parts.push("  - LCP breakdown:");
            parts.push(`    - TTFB: ${serializeSubpart(subparts.ttfb)}`);
            if (subparts.loadDelay !== void 0) {
              parts.push(`    - Load delay: ${serializeSubpart(subparts.loadDelay)}`);
            }
            if (subparts.loadDuration !== void 0) {
              parts.push(`    - Load duration: ${serializeSubpart(subparts.loadDuration)}`);
            }
            parts.push(`    - Render delay: ${serializeSubpart(subparts.renderDelay)}`);
          }
        }
        if (inp) {
          parts.push(`  - INP: ${Math.round(inp.value / 1e3)} ms, event: ${this.serializeEvent(inp.event)}`);
        }
        if (cls) {
          const eventText = cls.worstClusterEvent ? `, event: ${this.serializeEvent(cls.worstClusterEvent)}` : "";
          parts.push(`  - CLS: ${cls.value.toFixed(2)}${eventText}`);
        }
      } else {
        parts.push("Metrics (lab / observed): n/a");
      }
      const cruxParts = insightSet && this.#getCruxTraceSummary(insightSet);
      if (cruxParts?.length) {
        parts.push(...cruxParts);
      } else {
        parts.push("Metrics (field / real users): n/a \u2013 no data for this page in CrUX");
      }
      parts.push("Available insights:");
      for (const [insightName, model] of Object.entries(insightSet.model)) {
        if (model.state === "pass") {
          continue;
        }
        const formatter = new PerformanceInsightFormatter(this.#focus, model);
        if (!formatter.insightIsSupported()) {
          continue;
        }
        const insightBounds = Trace4.Insights.Common.insightBounds(model, insightSet.bounds);
        const insightParts = [
          `insight name: ${insightName}`,
          `description: ${model.description}`,
          `relevant trace bounds: ${this.serializeBounds(insightBounds)}`
        ];
        const metricSavingsText = formatter.estimatedSavings();
        if (metricSavingsText) {
          insightParts.push(`estimated metric savings: ${metricSavingsText}`);
        }
        if (model.wastedBytes) {
          insightParts.push(`estimated wasted bytes: ${bytes(model.wastedBytes)}`);
        }
        for (const suggestion of formatter.getSuggestions()) {
          insightParts.push(`example question: ${suggestion.title}`);
        }
        const insightPartsText = insightParts.join("\n    ");
        parts.push(`  - ${insightPartsText}`);
      }
    }
    const extensionTrackData = parsedTrace.data.ExtensionTraceData?.extensionTrackData;
    if (extensionTrackData && extensionTrackData.length > 0) {
      parts.push("\n# Custom tracks\n");
      parts.push("The following is a list of custom tracks or track groups from the extensibility API.");
      for (const trackData of extensionTrackData) {
        if (trackData.isTrackGroup) {
          parts.push(`
## Group: ${trackData.name}
`);
          for (const trackName of Object.keys(trackData.entriesByTrack)) {
            parts.push(`  - Track: ${trackName}`);
          }
        } else {
          parts.push(`
## Track: ${trackData.name}
`);
        }
      }
    }
    return parts.join("\n");
  }
  async #formatFactByInsightSet(options) {
    const { insights, title, description, empty, cb } = options;
    const lines = [`# ${title}
`];
    if (description) {
      lines.push(`${description}
`);
    }
    if (insights?.size) {
      const multipleInsightSets = insights.size > 1;
      for (const insightSet of insights.values()) {
        if (multipleInsightSets) {
          lines.push(`## insight set id: ${insightSet.id}
`);
        }
        lines.push((await cb(insightSet) ?? empty) + "\n");
      }
    } else {
      lines.push(empty + "\n");
    }
    return lines.join("\n");
  }
  formatCriticalRequests() {
    const parsedTrace = this.#parsedTrace;
    return this.#formatFactByInsightSet({
      insights: parsedTrace.insights,
      title: "Critical network requests",
      empty: "none",
      cb: async (insightSet) => {
        const criticalRequests = [];
        const walkRequest = (node) => {
          criticalRequests.push(node.request);
          node.children.forEach(walkRequest);
        };
        insightSet.model.NetworkDependencyTree?.rootNodes.forEach(walkRequest);
        return criticalRequests.length ? this.formatNetworkRequests(criticalRequests, { verbose: false }) : null;
      }
    });
  }
  async #serializeBottomUpRootNode(rootNode, limit) {
    const topNodes = [...rootNode.children().values()].filter((n) => n.totalTime >= 1).sort((a, b) => b.selfTime - a.selfTime).slice(0, limit);
    const callFrames = [];
    function nodeToText(node) {
      const event = node.event;
      let frame;
      if (Trace4.Types.Events.isProfileCall(event)) {
        frame = event.callFrame;
        if (node.selfTime >= 100 && callFrames.length < 3) {
          callFrames.push(frame);
        }
      } else {
        frame = Trace4.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(event);
      }
      let source = Trace4.Name.forEntry(event);
      if (frame?.url) {
        source += ` (url: ${frame.url}`;
        if (frame.lineNumber !== -1) {
          source += `, line: ${frame.lineNumber}`;
        }
        if (frame.columnNumber !== -1) {
          source += `, column: ${frame.columnNumber}`;
        }
        source += ")";
      }
      return `- self: ${millis(node.selfTime)}, total: ${millis(node.totalTime)}, source: ${source}`;
    }
    return topNodes.map((node) => nodeToText.call(this, node)).join("\n") + await this.#serializeRelevantFunctions(callFrames);
  }
  #getSerializeBottomUpRootNodeFormat(limit) {
    return `This is the bottom-up summary for the entire trace. Only the top ${limit} activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). "Self time" represents the aggregated time spent directly in an activity, across all occurrences. "Total time" represents the aggregated time spent in an activity or any of its children.`;
  }
  formatMainThreadBottomUpSummary() {
    const parsedTrace = this.#parsedTrace;
    const limit = 10;
    return this.#formatFactByInsightSet({
      insights: parsedTrace.insights,
      title: "Main thread bottom-up summary",
      description: this.#getSerializeBottomUpRootNodeFormat(limit),
      empty: "no activity",
      cb: async (insightSet) => {
        const rootNode = AIQueries.mainThreadActivityBottomUpSingleNavigation(
          insightSet.navigation?.args.data?.navigationId,
          insightSet.bounds,
          parsedTrace
        );
        return rootNode ? await this.#serializeBottomUpRootNode(rootNode, limit) : null;
      }
    });
  }
  #formatThirdPartyEntitySummaries(summaries) {
    const topMainThreadTimeEntries = summaries.toSorted((a, b) => b.mainThreadTime - a.mainThreadTime).slice(0, 5);
    if (!topMainThreadTimeEntries.length) {
      return "";
    }
    const listText = topMainThreadTimeEntries.map((s) => {
      const transferSize = `${bytes(s.transferSize)}`;
      return `- name: ${s.entity.name}, main thread time: ${millis(s.mainThreadTime)}, network transfer size: ${transferSize}`;
    }).join("\n");
    return listText;
  }
  formatThirdPartySummary() {
    const parsedTrace = this.#parsedTrace;
    return this.#formatFactByInsightSet({
      insights: parsedTrace.insights,
      title: "3rd party summary",
      empty: "no 3rd parties",
      cb: async (insightSet) => {
        const thirdPartySummaries = Trace4.Extras.ThirdParties.summarizeByThirdParty(parsedTrace.data, insightSet.bounds);
        return thirdPartySummaries.length ? this.#formatThirdPartyEntitySummaries(thirdPartySummaries) : null;
      }
    });
  }
  formatLongestTasks() {
    const parsedTrace = this.#parsedTrace;
    return this.#formatFactByInsightSet({
      insights: parsedTrace.insights,
      title: "Longest tasks",
      empty: "none",
      cb: async (insightSet) => {
        const longestTaskTrees = AIQueries.longestTasks(insightSet.navigation?.args.data?.navigationId, insightSet.bounds, parsedTrace, 3);
        if (!longestTaskTrees?.length) {
          return null;
        }
        return longestTaskTrees.map((tree) => {
          const time = millis(tree.rootNode.totalTime);
          return `- total time: ${time}, event: ${this.serializeEvent(tree.rootNode.event)}`;
        }).join("\n");
      }
    });
  }
  #serializeRelatedInsightsForEvents(events) {
    if (!events.length) {
      return "";
    }
    const insightNameToRelatedEvents = /* @__PURE__ */ new Map();
    if (this.#insightSet) {
      for (const model of Object.values(this.#insightSet.model)) {
        if (!model.relatedEvents) {
          continue;
        }
        const modeRelatedEvents = Array.isArray(model.relatedEvents) ? model.relatedEvents : [...model.relatedEvents.keys()];
        if (!modeRelatedEvents.length) {
          continue;
        }
        const relatedEvents = modeRelatedEvents.filter((e) => events.includes(e));
        if (relatedEvents.length) {
          insightNameToRelatedEvents.set(model.insightKey, relatedEvents);
        }
      }
    }
    if (!insightNameToRelatedEvents.size) {
      return "";
    }
    const results = [];
    for (const [insightKey, events2] of insightNameToRelatedEvents) {
      const eventsString = events2.slice(0, 5).map((e) => Trace4.Name.forEntry(e) + " " + this.serializeEvent(e)).join(", ");
      results.push(`- ${insightKey}: ${eventsString}`);
    }
    return results.join("\n");
  }
  async formatMainThreadTrackSummary(bounds) {
    if (!this.#parsedTrace.insights) {
      return "No main thread activity found";
    }
    const results = [];
    const insightSet = this.#parsedTrace.insights?.values().find(
      (insightSet2) => Trace4.Helpers.Timing.boundsIncludeTimeRange({ bounds, timeRange: insightSet2.bounds })
    );
    const topDownTree = AIQueries.mainThreadActivityTopDown(
      insightSet?.navigation?.args.data?.navigationId,
      bounds,
      this.#parsedTrace
    );
    if (topDownTree) {
      results.push("# Top-down main thread summary");
      results.push(await this.formatCallTree(
        topDownTree,
        2
        /* headerLevel */
      ));
    }
    const bottomUpRootNode = AIQueries.mainThreadActivityBottomUp(
      bounds,
      this.#parsedTrace
    );
    if (bottomUpRootNode) {
      results.push("# Bottom-up main thread summary");
      const limit = 20;
      results.push(this.#getSerializeBottomUpRootNodeFormat(limit));
      results.push(await this.#serializeBottomUpRootNode(bottomUpRootNode, limit));
    }
    const thirdPartySummaries = Trace4.Extras.ThirdParties.summarizeByThirdParty(this.#parsedTrace.data, bounds);
    if (thirdPartySummaries.length) {
      results.push("# Third parties");
      results.push(this.#formatThirdPartyEntitySummaries(thirdPartySummaries));
    }
    const relatedInsightsText = this.#serializeRelatedInsightsForEvents(
      [...topDownTree?.rootNode.events ?? [], ...bottomUpRootNode?.events ?? []]
    );
    if (relatedInsightsText) {
      results.push("# Related insights");
      results.push(
        "Here are all the insights that contain some related event from the main thread in the given range."
      );
      results.push(relatedInsightsText);
    }
    if (!results.length) {
      return "No main thread activity found";
    }
    return results.join("\n\n");
  }
  formatNetworkTrackSummary(bounds) {
    const results = [];
    const requests = this.#parsedTrace.data.NetworkRequests.byTime.filter(
      (request) => Trace4.Helpers.Timing.eventIsInBounds(request, bounds)
    );
    const requestsText = this.formatNetworkRequests(requests, { verbose: false });
    results.push("# Network requests summary");
    results.push(requestsText || "No requests in the given bounds");
    const relatedInsightsText = this.#serializeRelatedInsightsForEvents(requests);
    if (relatedInsightsText) {
      results.push("# Related insights");
      results.push("Here are all the insights that contain some related request from the given range.");
      results.push(relatedInsightsText);
    }
    return results.join("\n\n");
  }
  formatExtensionTrackSummary(bounds) {
    const extensionTrackData = this.#parsedTrace.data.ExtensionTraceData?.extensionTrackData;
    if (!extensionTrackData || extensionTrackData.length === 0) {
      return "No custom track activity found";
    }
    const results = [];
    for (const trackData of extensionTrackData) {
      const trackLines = [];
      const header = trackData.isTrackGroup ? `# Track Group: ${trackData.name}` : `# Track: ${trackData.name}`;
      trackLines.push(header);
      let hasEntriesInBounds = false;
      for (const trackName of Object.keys(trackData.entriesByTrack)) {
        const entries = trackData.entriesByTrack[trackName];
        const filteredEntries = entries.filter((entry) => Trace4.Helpers.Timing.eventIsInBounds(entry, bounds));
        if (filteredEntries.length === 0) {
          continue;
        }
        hasEntriesInBounds = true;
        if (trackData.isTrackGroup) {
          trackLines.push(`## Track: ${trackName}`);
        }
        for (const entry of filteredEntries) {
          const entryKey = this.serializeEvent(entry);
          const parts = [
            `Name: ${entry.name}`,
            `eventKey: ${entryKey}`,
            `duration: ${micros(entry.dur ?? Trace4.Types.Timing.Micro(0))}`
          ];
          if (entry.devtoolsObj.properties) {
            const props = entry.devtoolsObj.properties.map((prop) => `${prop[0]}: ${JSON.stringify(prop[1])}`).join(", ");
            parts.push(`properties: {${props}}`);
          }
          trackLines.push(`- ${parts.join(", ")}`);
        }
      }
      if (hasEntriesInBounds) {
        results.push(trackLines.join("\n"));
      }
    }
    if (results.length === 0) {
      return "No custom track activity found in the given bounds";
    }
    return results.join("\n\n");
  }
  async formatCallTree(tree, headerLevel = 1) {
    let result = `${tree.serialize(headerLevel)}

IMPORTANT: Never show eventKey to the user.
`;
    const relevantCallFrames = [];
    if (tree.selectedNode && Trace4.Types.Events.isProfileCall(tree.selectedNode.event)) {
      relevantCallFrames.push(tree.selectedNode.event.callFrame);
    }
    const topCallFrameByTotalTime = tree.topCallFrameByTotalTime();
    if (topCallFrameByTotalTime) {
      relevantCallFrames.push(topCallFrameByTotalTime);
    }
    relevantCallFrames.push(...tree.topCallFramesBySelfTime(3));
    result += await this.#serializeRelevantFunctions(relevantCallFrames);
    return result;
  }
  formatNetworkRequests(requests, options) {
    if (requests.length === 0) {
      return "";
    }
    let verbose;
    if (options?.verbose !== void 0) {
      verbose = options.verbose;
    } else {
      verbose = requests.length === 1;
    }
    if (verbose) {
      return requests.map((request) => this.#networkRequestVerbosely(request, options)).join("\n");
    }
    return this.#networkRequestsArrayCompressed(requests);
  }
  #getOrAssignUrlIndex(urlIdToIndex, url) {
    let index = urlIdToIndex.get(url);
    if (index !== void 0) {
      return index;
    }
    index = urlIdToIndex.size;
    urlIdToIndex.set(url, index);
    return index;
  }
  #getInitiatorChain(parsedTrace, request) {
    const initiators = [];
    let cur = request;
    while (cur) {
      const initiator = Trace4.Extras.Initiators.getNetworkInitiator(parsedTrace.data, cur);
      if (initiator) {
        if (initiators.includes(initiator)) {
          return [];
        }
        initiators.unshift(initiator);
      }
      cur = initiator;
    }
    return initiators;
  }
  /**
   * This is the data passed to a network request when the Performance Insights
   * agent is asking for information. It is a slimmed down version of the
   * request's data to avoid using up too much of the context window.
   * IMPORTANT: these set of fields have been reviewed by Chrome Privacy &
   * Security; be careful about adding new data here. If you are in doubt please
   * talk to jacktfranklin@.
   */
  #networkRequestVerbosely(request, options) {
    const {
      url,
      statusCode,
      initialPriority,
      priority,
      fromServiceWorker,
      mimeType,
      responseHeaders,
      syntheticData,
      protocol
    } = request.args.data;
    const parsedTrace = this.#parsedTrace;
    const titlePrefix = `## ${options?.customTitle ?? "Network request"}`;
    const navigationForEvent = Trace4.Helpers.Trace.getNavigationForTraceEvent(
      request,
      request.args.data.frame,
      parsedTrace.data.Meta.navigationsByFrameId
    );
    const baseTime = navigationForEvent?.ts ?? parsedTrace.data.Meta.traceBounds.min;
    const startTimesForLifecycle = {
      queuedAt: request.ts - baseTime,
      requestSentAt: syntheticData.sendStartTime - baseTime,
      downloadCompletedAt: syntheticData.finishTime - baseTime,
      processingCompletedAt: request.ts + request.dur - baseTime
    };
    const mainThreadProcessingDuration = startTimesForLifecycle.processingCompletedAt - startTimesForLifecycle.downloadCompletedAt;
    const downloadTime = syntheticData.finishTime - syntheticData.downloadStart;
    const renderBlocking = Trace4.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request);
    const initiator = Trace4.Extras.Initiators.getNetworkInitiator(parsedTrace.data, request);
    const priorityLines = [];
    if (initialPriority === priority) {
      priorityLines.push(`Priority: ${priority}`);
    } else {
      priorityLines.push(`Initial priority: ${initialPriority}`);
      priorityLines.push(`Final priority: ${priority}`);
    }
    const redirects = request.args.data.redirects.map((redirect, index) => {
      const startTime = redirect.ts - baseTime;
      return `#### Redirect ${index + 1}: ${redirect.url}
- Start time: ${micros(startTime)}
- Duration: ${micros(redirect.dur)}`;
    });
    const initiators = this.#getInitiatorChain(parsedTrace, request);
    const initiatorUrls = initiators.map((initiator2) => initiator2.args.data.url);
    const eventKey = this.#eventsSerializer.keyForEvent(request);
    const eventKeyLine = eventKey ? `eventKey: ${eventKey}
` : "";
    return `${titlePrefix}: ${url}
${eventKeyLine}Timings:
- Queued at: ${micros(startTimesForLifecycle.queuedAt)}
- Request sent at: ${micros(startTimesForLifecycle.requestSentAt)}
- Download complete at: ${micros(startTimesForLifecycle.downloadCompletedAt)}
- Main thread processing completed at: ${micros(startTimesForLifecycle.processingCompletedAt)}
Durations:
- Download time: ${micros(downloadTime)}
- Main thread processing time: ${micros(mainThreadProcessingDuration)}
- Total duration: ${micros(request.dur)}${initiator ? `
Initiator: ${initiator.args.data.url}` : ""}
Redirects:${redirects.length ? "\n" + redirects.join("\n") : " no redirects"}
Status code: ${statusCode}
MIME Type: ${mimeType}
Protocol: ${protocol}
${priorityLines.join("\n")}
Render-blocking: ${renderBlocking ? "Yes" : "No"}
From a service worker: ${fromServiceWorker ? "Yes" : "No"}
Initiators (root request to the request that directly loaded this one): ${initiatorUrls.join(", ") || "none"}
${NetworkRequestFormatter.formatHeaders("Response headers", responseHeaders ?? [], true)}`;
  }
  // A compact network requests format designed to save tokens when sending multiple network requests to the model.
  // It creates a map that maps request URLs to IDs and references the IDs in the compressed format.
  //
  // Important: Do not use this method for stringifying a single network request. With this format, a format description
  // needs to be provided, which is not worth sending if only one network request is being stringified.
  // For a single request, use `formatRequestVerbosely`, which formats with all fields specified and does not require a
  // format description.
  #networkRequestsArrayCompressed(requests) {
    const networkDataString = `
Network requests data:

`;
    const urlIdToIndex = /* @__PURE__ */ new Map();
    const allRequestsText = requests.map((request) => {
      const urlIndex = this.#getOrAssignUrlIndex(urlIdToIndex, request.args.data.url);
      return this.#networkRequestCompressedFormat(urlIndex, request, urlIdToIndex);
    }).join("\n");
    const urlsMapString = `allUrls = [${Array.from(urlIdToIndex.entries()).map(([url, index]) => {
      return `${index}: ${url}`;
    }).join(", ")}]`;
    return networkDataString + "\n\n" + urlsMapString + "\n\n" + allRequestsText;
  }
  static callFrameDataFormatDescription = `Each call frame is presented in the following format:

'id;eventKey;name;duration;selfTime;urlIndex;childRange;[line];[column];[S]'

Key definitions:

* id: A unique numerical identifier for the call frame. Never mention this id in the output to the user.
* eventKey: String that uniquely identifies this event in the flame chart.
* name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
* duration: The total execution time of the call frame, including its children.
* selfTime: The time spent directly within the call frame, excluding its children's execution.
* urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
* childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
* line: An optional field for a call frame's line number. This is where the function is defined.
* column: An optional field for a call frame's column number. This is where the function is defined.
* S: _Optional_. The letter 'S' terminates the line if that call frame was selected by the user.

Example Call Tree:

1;r-123;main;500;100;0;1;;
2;r-124;update;200;50;;3;0;1;
3;p-49575-15428179-2834-374;animate;150;20;0;4-5;0;1;S
4;p-49575-15428179-3505-1162;calculatePosition;80;80;0;1;;
5;p-49575-15428179-5391-2767;applyStyles;50;50;0;1;;
`;
  /**
   * Network requests format description that is sent to the model as a fact.
   */
  static networkDataFormatDescription = `Network requests are formatted like this:
\`urlIndex;eventKey;queuedTime;requestSentTime;downloadCompleteTime;processingCompleteTime;totalDuration;downloadDuration;mainThreadProcessingDuration;statusCode;mimeType;priority;initialPriority;finalPriority;renderBlocking;protocol;fromServiceWorker;initiators;redirects:[[redirectUrlIndex|startTime|duration]];responseHeaders:[header1Value|header2Value|...]\`

- \`urlIndex\`: Numerical index for the request's URL, referencing the "All URLs" list.
- \`eventKey\`: String that uniquely identifies this request's trace event.
Timings (all in milliseconds, relative to navigation start):
- \`queuedTime\`: When the request was queued.
- \`requestSentTime\`: When the request was sent.
- \`downloadCompleteTime\`: When the download completed.
- \`processingCompleteTime\`: When main thread processing finished.
Durations (all in milliseconds):
- \`totalDuration\`: Total time from the request being queued until its main thread processing completed.
- \`downloadDuration\`: Time spent actively downloading the resource.
- \`mainThreadProcessingDuration\`: Time spent on the main thread after the download completed.
- \`statusCode\`: The HTTP status code of the response (e.g., 200, 404).
- \`mimeType\`: The MIME type of the resource (e.g., "text/html", "application/javascript").
- \`priority\`: The final network request priority (e.g., "VeryHigh", "Low").
- \`initialPriority\`: The initial network request priority.
- \`finalPriority\`: The final network request priority (redundant if \`priority\` is always final, but kept for clarity if \`initialPriority\` and \`priority\` differ).
- \`renderBlocking\`: 't' if the request was render-blocking, 'f' otherwise.
- \`protocol\`: The network protocol used (e.g., "h2", "http/1.1").
- \`fromServiceWorker\`: 't' if the request was served from a service worker, 'f' otherwise.
- \`initiators\`: A list (separated by ,) of URL indices for the initiator chain of this request. Listed in order starting from the root request to the request that directly loaded this one. This represents the network dependencies necessary to load this request. If there is no initiator, this is empty.
- \`redirects\`: A comma-separated list of redirects, enclosed in square brackets. Each redirect is formatted as
\`[redirectUrlIndex|startTime|duration]\`, where: \`redirectUrlIndex\`: Numerical index for the redirect's URL. \`startTime\`: The start time of the redirect in milliseconds, relative to navigation start. \`duration\`: The duration of the redirect in milliseconds.
- \`responseHeaders\`: A list (separated by '|') of values for specific, pre-defined response headers, enclosed in square brackets.
The order of headers corresponds to an internal fixed list. If a header is not present, its value will be empty.
`;
  /**
   * This is the network request data passed to the Performance agent.
   *
   * The `urlIdToIndex` Map is used to map URLs to numerical indices in order to not need to pass whole url every time it's mentioned.
   * The map content is passed in the response together will all the requests data.
   *
   * See `networkDataFormatDescription` above for specifics.
   */
  #networkRequestCompressedFormat(urlIndex, request, urlIdToIndex) {
    const {
      statusCode,
      initialPriority,
      priority,
      fromServiceWorker,
      mimeType,
      responseHeaders,
      syntheticData,
      protocol
    } = request.args.data;
    const parsedTrace = this.#parsedTrace;
    const navigationForEvent = Trace4.Helpers.Trace.getNavigationForTraceEvent(
      request,
      request.args.data.frame,
      parsedTrace.data.Meta.navigationsByFrameId
    );
    const baseTime = navigationForEvent?.ts ?? parsedTrace.data.Meta.traceBounds.min;
    const queuedTime = micros(request.ts - baseTime);
    const requestSentTime = micros(syntheticData.sendStartTime - baseTime);
    const downloadCompleteTime = micros(syntheticData.finishTime - baseTime);
    const processingCompleteTime = micros(request.ts + request.dur - baseTime);
    const totalDuration = micros(request.dur);
    const downloadDuration = micros(syntheticData.finishTime - syntheticData.downloadStart);
    const mainThreadProcessingDuration = micros(request.ts + request.dur - syntheticData.finishTime);
    const renderBlocking = Trace4.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request) ? "t" : "f";
    const finalPriority = priority;
    const headerValues = responseHeaders?.map((header) => {
      const value = NetworkRequestFormatter.allowHeader(header.name) ? header.value : "<redacted>";
      return `${header.name}: ${value}`;
    }).join("|");
    const redirects = request.args.data.redirects.map((redirect) => {
      const urlIndex2 = this.#getOrAssignUrlIndex(urlIdToIndex, redirect.url);
      const redirectStartTime = micros(redirect.ts - baseTime);
      const redirectDuration = micros(redirect.dur);
      return `[${urlIndex2}|${redirectStartTime}|${redirectDuration}]`;
    }).join(",");
    const initiators = this.#getInitiatorChain(parsedTrace, request);
    const initiatorUrlIndices = initiators.map((initiator) => this.#getOrAssignUrlIndex(urlIdToIndex, initiator.args.data.url));
    const parts = [
      urlIndex,
      this.#eventsSerializer.keyForEvent(request) ?? "",
      queuedTime,
      requestSentTime,
      downloadCompleteTime,
      processingCompleteTime,
      totalDuration,
      downloadDuration,
      mainThreadProcessingDuration,
      statusCode,
      mimeType,
      priority,
      initialPriority,
      finalPriority,
      renderBlocking,
      protocol,
      fromServiceWorker ? "t" : "f",
      initiatorUrlIndices.join(","),
      `[${redirects}]`,
      `[${headerValues ?? ""}]`
    ];
    return parts.join(";");
  }
  resolveFunctionCodeAtLocation(url, line, column) {
    if (!this.resolveFunctionCode) {
      throw new Error("missing resolveFunctionCode");
    }
    return this.resolveFunctionCode(url, line, column);
  }
  formatFunctionCode(code) {
    return this.#getFormattedFunctionCodeExplainer() + "\n\n" + this.#formatFunctionCode(code);
  }
  #getFormattedFunctionCodeExplainer() {
    return "The following are markdown block(s) of code that ran in the page, each representing a separate function. <FUNCTION_START> and <FUNCTION_END> marks the exact function declaration, and everything outside that is provided for additional context. Comments at the end of each line indicate the runtime performance cost of that code. Do not show the user the function markers or the additional context.";
  }
  #functionCodeToKey(code) {
    return code.functionBounds.uiSourceCode.url() + ":" + code.functionBounds.range.toString();
  }
  #hasFormattedFunctionCode(code) {
    return this.#formattedFunctionCodes.has(this.#functionCodeToKey(code));
  }
  #formatFunctionCode(code) {
    this.#formattedFunctionCodes.add(this.#functionCodeToKey(code));
    const { startLine, startColumn } = code.range;
    const {
      startLine: contextStartLine,
      startColumn: contextStartColumn,
      endLine: contextEndLine,
      endColumn: contextEndColumn
    } = code.rangeWithContext;
    const name = code.functionBounds.name || "(anonymous)";
    const url = code.functionBounds.uiSourceCode.url();
    const parts = [];
    parts.push(`${name} @ ${url}:${startLine}:${startColumn}. With added context, chunk is from ${contextStartLine}:${contextStartColumn} to ${contextEndLine}:${contextEndColumn}`);
    parts.push("```");
    parts.push(code.codeWithContext);
    parts.push("```");
    return parts.join("\n");
  }
  /**
   * Formats only the first line of the function code to save space in summaries.
   * The agent can use this information (url, line, column) to get the whole function source.
   */
  #formatFunctionCodeSummary(code) {
    this.#formattedFunctionCodes.add(this.#functionCodeToKey(code));
    const { startLine, startColumn } = code.range;
    const name = code.functionBounds.name || "(anonymous)";
    const url = code.functionBounds.uiSourceCode.url();
    const lines = code.code.split("\n");
    const firstLine = lines[0] || "";
    const parts = [];
    parts.push(`${name} @ ${url}:${startLine}:${startColumn}`);
    parts.push("```");
    parts.push(firstLine);
    parts.push("```");
    return parts.join("\n");
  }
  /**
   * Appends the code of each call frame's function, but only if the function was not
   * serialized previously.
   */
  async #serializeRelevantFunctions(callFrames) {
    const resolveFunctionCode = this.resolveFunctionCode;
    if (!resolveFunctionCode) {
      return "";
    }
    const functionCodeStrings = [];
    const functionCodes = await Promise.all(callFrames.map(
      (frame) => resolveFunctionCode(frame.url, frame.lineNumber, frame.columnNumber)
    ));
    for (const code of functionCodes) {
      if (code && !this.#hasFormattedFunctionCode(code)) {
        functionCodeStrings.push(this.#formatFunctionCodeSummary(code));
      }
    }
    if (!functionCodeStrings.length) {
      return "";
    }
    return "\n" + [
      this.#getFormattedFunctionCodeExplainer(),
      functionCodeStrings.length > 1 ? `Here is the first line of ${functionCodeStrings.length} relevant functions:` : `Here is the first line of a relevant function:`,
      ...functionCodeStrings
    ].join("\n\n");
  }
};
function formatEventForAI(event) {
  if (Trace4.Types.Events.isSyntheticNetworkRequest(event)) {
    return JSON.stringify({
      ...event,
      args: {
        ...event.args,
        data: {
          ...event.args.data,
          responseHeaders: event.args.data.responseHeaders ? sanitizeHeaders(event.args.data.responseHeaders) : null
        }
      }
    });
  }
  if (Trace4.Types.Events.isResourceReceiveResponse(event)) {
    return JSON.stringify({
      ...event,
      args: {
        ...event.args,
        data: {
          ...event.args.data,
          headers: event.args.data.headers ? sanitizeHeaders(event.args.data.headers) : void 0
        }
      }
    });
  }
  if (Trace4.Types.Events.isRundownScriptSource(event)) {
    const safeData = {
      isolate: event.args.data.isolate,
      scriptId: event.args.data.scriptId,
      length: event.args.data.length
    };
    return JSON.stringify({
      ...event,
      args: {
        ...event.args,
        data: safeData
      }
    });
  }
  if (Trace4.Types.Events.isRundownScriptSourceLarge(event)) {
    const safeData = {
      isolate: event.args.data.isolate,
      scriptId: event.args.data.scriptId,
      splitIndex: event.args.data.splitIndex,
      splitCount: event.args.data.splitCount
    };
    return JSON.stringify({
      ...event,
      args: {
        ...event.args,
        data: safeData
      }
    });
  }
  if (Trace4.Types.Events.isScreenshot(event) || Trace4.Types.Events.isLegacyScreenshot(event)) {
    return JSON.stringify({
      ...event,
      args: {
        ...event.args,
        snapshot: "<redacted base64 image data>"
      }
    });
  }
  if (Trace4.Types.Events.isLegacySyntheticScreenshot(event)) {
    return JSON.stringify({
      ...event,
      args: {
        ...event.args,
        dataUri: "<redacted base64 image data>"
      }
    });
  }
  return JSON.stringify(event);
}

// ../../front_end/models/ai_assistance/data_formatters/PerformanceInsightFormatter.ts
function getLCPData(parsedTrace, frameId, navigation) {
  const navMetrics = parsedTrace.data.PageLoadMetrics.metricScoresByFrameId.get(frameId)?.get(navigation);
  if (!navMetrics) {
    return null;
  }
  const metric = navMetrics.get(Trace5.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  if (!metric || !Trace5.Handlers.ModelHandlers.PageLoadMetrics.metricIsLCP(metric)) {
    return null;
  }
  const lcpEvent = metric?.event;
  if (!lcpEvent || !Trace5.Types.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
    return null;
  }
  const navigationId = Trace5.Types.Events.isSoftNavigationStart(navigation) ? void 0 : navigation.args.data?.navigationId;
  return {
    lcpEvent,
    lcpRequest: navigationId ? parsedTrace.data.LargestImagePaint.lcpRequestByNavigationId.get(navigationId) : void 0,
    metricScore: metric
  };
}
var PerformanceInsightFormatter = class {
  #traceFormatter;
  #insight;
  #parsedTrace;
  constructor(focus, insight, deviceScope = null) {
    this.#traceFormatter = new PerformanceTraceFormatter(focus, deviceScope);
    this.#insight = insight;
    this.#parsedTrace = focus.parsedTrace;
  }
  #formatMilli(x) {
    if (x === void 0) {
      return "";
    }
    return millis(x);
  }
  #formatMicro(x) {
    if (x === void 0) {
      return "";
    }
    return this.#formatMilli(Trace5.Helpers.Timing.microToMilli(x));
  }
  #formatRequestUrl(request) {
    return `${request.args.data.url} ${this.#traceFormatter.serializeEvent(request)}`;
  }
  #formatScriptUrl(script) {
    if (script.request) {
      return this.#formatRequestUrl(script.request);
    }
    return script.url ?? script.sourceUrl ?? script.scriptId;
  }
  #formatUrl(url) {
    const request = this.#parsedTrace.data.NetworkRequests.byTime.find((request2) => request2.args.data.url === url);
    if (request) {
      return this.#formatRequestUrl(request);
    }
    return url;
  }
  /**
   * Information about LCP which we pass to the LLM for all insights that relate to LCP.
   */
  #lcpMetricSharedContext() {
    if (!this.#insight.navigation) {
      return "";
    }
    if (!this.#insight.frameId || !this.#insight.navigation) {
      return "";
    }
    const data = getLCPData(this.#parsedTrace, this.#insight.frameId, this.#insight.navigation);
    if (!data) {
      return "";
    }
    const { metricScore, lcpRequest, lcpEvent } = data;
    const theLcpElement = lcpEvent.args.data?.nodeName ? `The LCP element (${lcpEvent.args.data.nodeName}, nodeId: ${lcpEvent.args.data.nodeId})` : "The LCP element";
    const parts = [
      `The Largest Contentful Paint (LCP) time for this navigation was ${this.#formatMicro(metricScore.timing)}.`
    ];
    if (lcpRequest) {
      parts.push(`${theLcpElement} is an image fetched from ${this.#formatRequestUrl(lcpRequest)}.`);
      const request = this.#traceFormatter.formatNetworkRequests(
        [lcpRequest],
        { verbose: true, customTitle: "LCP resource network request" }
      );
      parts.push(request);
    } else {
      parts.push(`${theLcpElement} is text and was not fetched from the network.`);
    }
    return parts.join("\n");
  }
  insightIsSupported() {
    return this.#description().length > 0;
  }
  getSuggestions() {
    switch (this.#insight.insightKey) {
      case "CLSCulprits":
        return [
          { title: "Help me optimize my CLS score" },
          { title: "How can I prevent layout shifts on this page?" }
        ];
      case "DocumentLatency":
        return [
          { title: "How do I decrease the initial loading time of my page?" },
          { title: "Did anything slow down the request for this document?" }
        ];
      case "DOMSize":
        return [{ title: "How can I reduce the size of my DOM?" }];
      case "DuplicatedJavaScript":
        return [
          { title: "How do I deduplicate the identified scripts in my bundle?" },
          { title: "Which duplicated JavaScript modules are the most problematic?" }
        ];
      case "FontDisplay":
        return [
          { title: "How can I update my CSS to avoid layout shifts caused by incorrect `font-display` properties?" }
        ];
      case "ForcedReflow":
        return [
          { title: "How can I avoid forced reflows and layout thrashing?" },
          { title: "What is forced reflow and why is it problematic?" }
        ];
      case "ImageDelivery":
        return [
          { title: "What should I do to improve and optimize the time taken to fetch and display images on the page?" },
          { title: "Are all images on my site optimized?" }
        ];
      case "INPBreakdown":
        return [
          { title: "Suggest fixes for my longest interaction" },
          { title: "Why is a large INP score problematic?" },
          { title: "What's the biggest contributor to my longest interaction?" }
        ];
      case "LCPDiscovery":
        return [
          { title: "Suggest fixes to reduce my LCP" },
          { title: "What can I do to reduce my LCP discovery time?" },
          { title: "Why is LCP discovery time important?" }
        ];
      case "LCPBreakdown":
        return [
          { title: "Help me optimize my LCP score" },
          { title: "Which LCP subpart was most problematic?" },
          { title: "What can I do to reduce the LCP time for this page load?" }
        ];
      case "NetworkDependencyTree":
        return [{ title: "How do I optimize my network dependency tree?" }];
      case "RenderBlocking":
        return [
          { title: "Show me the most impactful render-blocking requests that I should focus on" },
          { title: "How can I reduce the number of render-blocking requests?" }
        ];
      case "SlowCSSSelector":
        return [{ title: "How can I optimize my CSS to increase the performance of CSS selectors?" }];
      case "ThirdParties":
        return [{ title: "Which third parties are having the largest impact on my page performance?" }];
      case "Cache":
        return [{ title: "What caching strategies can I apply to improve my page performance?" }];
      case "Viewport":
        return [{ title: "How do I make sure my page is optimized for mobile viewing?" }];
      case "ModernHTTP":
        return [
          { title: "Is my site using the best HTTP practices?" },
          { title: "Which resources are not using a modern HTTP protocol?" }
        ];
      case "LegacyJavaScript":
        return [
          { title: "Is my site polyfilling modern JavaScript features?" },
          { title: "How can I reduce the amount of legacy JavaScript on my page?" }
        ];
      case "CharacterSet":
        return [
          { title: "How do I declare a character encoding for my page?" }
        ];
      default:
        throw new Error(`Unknown insight key '${this.#insight.insightKey}'`);
    }
  }
  /**
   * Create an AI prompt string out of the Cache Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within Cache to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Cache Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatCacheInsight(insight) {
    if (insight.requests.length === 0) {
      return Trace5.Insights.Models.Cache.UIStrings.noRequestsToCache + ".";
    }
    let output = "The following resources were associated with ineffficient cache policies:\n";
    for (const entry of insight.requests) {
      output += `
- ${this.#formatRequestUrl(entry.request)}`;
      output += `
  - Cache Time to Live (TTL): ${entry.ttl} seconds`;
      output += `
  - Wasted bytes: ${bytes(entry.wastedBytes)}`;
    }
    output += "\n\n" + Trace5.Insights.Models.Cache.UIStrings.description;
    return output;
  }
  #formatLayoutShift(shift, index, rootCauses) {
    const baseTime = this.#parsedTrace.data.Meta.traceBounds.min;
    const potentialRootCauses = [];
    if (rootCauses) {
      rootCauses.iframes.forEach(
        (iframe) => potentialRootCauses.push(
          `- An iframe (id: ${iframe.frame}, url: ${iframe.url ?? "unknown"} was injected into the page)`
        )
      );
      rootCauses.webFonts.forEach((req) => {
        potentialRootCauses.push(`- A font that was loaded over the network: ${this.#formatRequestUrl(req)}.`);
      });
      rootCauses.nonCompositedAnimations.forEach((nonCompositedFailure) => {
        potentialRootCauses.push("- A non-composited animation:");
        const animationInfoOutput = [];
        potentialRootCauses.push(`- non-composited animation: \`${nonCompositedFailure.name || "(unnamed)"}\``);
        if (nonCompositedFailure.name) {
          animationInfoOutput.push(`Animation name: ${nonCompositedFailure.name}`);
        }
        if (nonCompositedFailure.unsupportedProperties) {
          animationInfoOutput.push("Unsupported CSS properties:");
          animationInfoOutput.push("- " + nonCompositedFailure.unsupportedProperties.join(", "));
        }
        animationInfoOutput.push("Failure reasons:");
        animationInfoOutput.push("  - " + nonCompositedFailure.failureReasons.join(", "));
        potentialRootCauses.push(animationInfoOutput.map((l) => " ".repeat(4) + l).join("\n"));
      });
      rootCauses.unsizedImages.forEach((img) => {
        const url = img.paintImageEvent.args.data.url;
        const nodeName = img.paintImageEvent.args.data.nodeName;
        const extraText = url ? `url: ${this.#formatUrl(url)}` : `id: ${img.backendNodeId}`;
        potentialRootCauses.push(`- An unsized image (${nodeName}) (${extraText}).`);
      });
    }
    const rootCauseText = potentialRootCauses.length ? `- Potential root causes:
  ${potentialRootCauses.join("\n")}` : "- No potential root causes identified";
    const startTime = Trace5.Helpers.Timing.microToMilli(Trace5.Types.Timing.Micro(shift.ts - baseTime));
    const impactedNodeNames = shift.rawSourceEvent.args.data?.impacted_nodes?.map((n) => n.debug_name).filter((name) => name !== void 0) ?? [];
    const impactedNodeText = impactedNodeNames.length ? `
- Impacted elements:
  - ${impactedNodeNames.join("\n  - ")}
` : "";
    return `### Layout shift ${index + 1}:${impactedNodeText}
- Start time: ${millis(startTime)}
- Score: ${shift.args.data?.weighted_score_delta.toFixed(4)}
${rootCauseText}`;
  }
  /**
   * Create an AI prompt string out of the CLS Culprits Insight model to use with Ask AI.
   * @param insight The CLS Culprits Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatClsCulpritsInsight(insight) {
    const { worstCluster, shifts } = insight;
    if (!worstCluster) {
      return "No layout shifts were found.";
    }
    const baseTime = this.#parsedTrace.data.Meta.traceBounds.min;
    const clusterTimes = {
      start: worstCluster.ts - baseTime,
      end: worstCluster.ts + worstCluster.dur - baseTime
    };
    const shiftsFormatted = worstCluster.events.map((layoutShift, index) => {
      return this.#formatLayoutShift(layoutShift, index, shifts.get(layoutShift));
    });
    return `The worst layout shift cluster was the cluster that started at ${this.#formatMicro(clusterTimes.start)} and ended at ${this.#formatMicro(clusterTimes.end)}, with a duration of ${this.#formatMicro(worstCluster.dur)}.
The score for this cluster is ${worstCluster.clusterCumulativeScore.toFixed(4)}.

Layout shifts in this cluster:
${shiftsFormatted.join("\n")}`;
  }
  /**
   * Create an AI prompt string out of the Document Latency Insight model to use with Ask AI.
   * @param insight The Document Latency Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatDocumentLatencyInsight(insight) {
    if (!insight.data) {
      return "";
    }
    const { checklist, documentRequest } = insight.data;
    if (!documentRequest) {
      return "";
    }
    const checklistBulletPoints = [];
    checklistBulletPoints.push({
      name: "The request was not redirected",
      passed: checklist.noRedirects.value
    });
    checklistBulletPoints.push({
      name: "Server responded quickly",
      passed: checklist.serverResponseIsFast.value
    });
    checklistBulletPoints.push({
      name: "Compression was applied",
      passed: checklist.usesCompression.value
    });
    return `${this.#lcpMetricSharedContext()}

${this.#traceFormatter.formatNetworkRequests([documentRequest], {
      verbose: true,
      customTitle: "Document network request"
    })}

The result of the checks for this insight are:
${checklistBulletPoints.map((point) => `- ${point.name}: ${point.passed ? "PASSED" : "FAILED"}`).join("\n")}`;
  }
  /**
   * Create an AI prompt string out of the DOM Size model to use with Ask AI.
   * Note: This function accesses the UIStrings within DomSize to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The DOM Size Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatDomSizeInsight(insight) {
    if (insight.state === "pass") {
      return "No DOM size issues were detected.";
    }
    let output = Trace5.Insights.Models.DOMSize.UIStrings.description + "\n";
    if (insight.maxDOMStats) {
      output += "\n" + Trace5.Insights.Models.DOMSize.UIStrings.statistic + ":\n\n";
      const maxDepthStats = insight.maxDOMStats.args.data.maxDepth;
      const maxChildrenStats = insight.maxDOMStats.args.data.maxChildren;
      output += Trace5.Insights.Models.DOMSize.UIStrings.totalElements + ": " + insight.maxDOMStats.args.data.totalElements + ".\n";
      if (maxDepthStats) {
        output += Trace5.Insights.Models.DOMSize.UIStrings.maxDOMDepth + ": " + maxDepthStats.depth + ` nodes, starting with element '${maxDepthStats.nodeName}' (node id: ` + maxDepthStats.nodeId + ").\n";
      }
      if (maxChildrenStats) {
        output += Trace5.Insights.Models.DOMSize.UIStrings.maxChildren + ": " + maxChildrenStats.numChildren + `, for parent '${maxChildrenStats.nodeName}' (node id: ` + maxChildrenStats.nodeId + ").\n";
      }
    }
    if (insight.largeLayoutUpdates.length > 0 || insight.largeStyleRecalcs.length > 0) {
      output += `
Large layout updates/style calculations:
`;
    }
    if (insight.largeLayoutUpdates.length > 0) {
      for (const update of insight.largeLayoutUpdates) {
        output += `
  - Layout update: Duration: ${this.#formatMicro(update.dur)},`;
        output += ` with ${update.args.beginData.dirtyObjects} of ${update.args.beginData.totalObjects} nodes needing layout.`;
      }
    }
    if (insight.largeStyleRecalcs.length > 0) {
      for (const recalc of insight.largeStyleRecalcs) {
        output += `
  - Style recalculation: Duration: ${this.#formatMicro(recalc.dur)}, `;
        output += `with ${recalc.args.elementCount} elements affected.`;
      }
    }
    return output;
  }
  /**
   * Create an AI prompt string out of the Duplicated JavaScript Insight model to use with Ask AI.
   * @param insight The Duplicated JavaScript Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatDuplicatedJavaScriptInsight(insight) {
    const totalWastedBytes = insight.wastedBytes;
    const duplicatedScriptsByModule = insight.duplicationGroupedByNodeModules;
    if (duplicatedScriptsByModule.size === 0) {
      return "There is no duplicated JavaScript in the page modules";
    }
    const filesFormatted = Array.from(duplicatedScriptsByModule).map(
      ([module, duplication]) => `- Source: ${module} - Duplicated bytes: ${duplication.estimatedDuplicateBytes} bytes`
    ).join("\n");
    return `Total wasted bytes: ${totalWastedBytes} bytes.

Duplication grouped by Node modules: ${filesFormatted}`;
  }
  /**
   * Create an AI prompt string out of the NetworkDependencyTree Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within NetworkDependencyTree to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatFontDisplayInsight(insight) {
    if (insight.fonts.length === 0) {
      return "No font display issues were detected.";
    }
    let output = "The following font display issues were found:\n";
    for (const font of insight.fonts) {
      let fontName = font.name;
      if (!fontName) {
        const url = new Common7.ParsedURL.ParsedURL(font.request.args.data.url);
        fontName = url.isValid ? url.lastPathComponent : "(not available)";
      }
      output += `
 - Font name: ${fontName}, URL: ${this.#formatRequestUrl(font.request)}, Property 'font-display' set to: '${font.display}', Wasted time: ${this.#formatMilli(font.wastedTime)}.`;
    }
    output += "\n\n" + Trace5.Insights.Models.FontDisplay.UIStrings.description;
    return output;
  }
  /**
   * Create an AI prompt string out of the Forced Reflow Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within ForcedReflow model to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The ForcedReflow Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatForcedReflowInsight(insight) {
    let output = Trace5.Insights.Models.ForcedReflow.UIStrings.description + "\n\n";
    if (insight.topLevelFunctionCallData || insight.aggregatedBottomUpData.length > 0) {
      output += "The forced reflow checks revealed one or more problems.\n\n";
    } else {
      output += "The forced reflow checks revealed no problems.";
      return output;
    }
    function callFrameToString(frame) {
      if (frame === null) {
        return Trace5.Insights.Models.ForcedReflow.UIStrings.unattributed;
      }
      let result = `${frame.functionName || Trace5.Insights.Models.ForcedReflow.UIStrings.anonymous}`;
      if (frame.url) {
        result += ` @ ${frame.url}:${frame.lineNumber}:${frame.columnNumber}`;
      } else {
        result += " @ unknown location";
      }
      return result;
    }
    if (insight.topLevelFunctionCallData) {
      output += "The following is the top function call that caused forced reflow(s):\n\n";
      output += " - " + callFrameToString(insight.topLevelFunctionCallData.topLevelFunctionCall);
      output += `

${Trace5.Insights.Models.ForcedReflow.UIStrings.totalReflowTime}: ${this.#formatMicro(insight.topLevelFunctionCallData.totalReflowTime)}
`;
    } else {
      output += "No top-level functions causing forced reflows were identified.\n";
    }
    if (insight.aggregatedBottomUpData.length > 0) {
      output += "\n" + Trace5.Insights.Models.ForcedReflow.UIStrings.reflowCallFrames + " (including total time):\n";
      for (const data of insight.aggregatedBottomUpData) {
        output += `
 - ${this.#formatMicro(data.totalTime)} in ${callFrameToString(data.bottomUpData)}`;
      }
    } else {
      output += "\nNo aggregated bottom-up causes of forced reflows were identified.";
    }
    return output;
  }
  /**
   * Create an AI prompt string out of the INP Brekdown Insight model to use with Ask AI.
   * @param insight The INP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatImageDeliveryInsight(insight) {
    const optimizableImages = insight.optimizableImages;
    if (optimizableImages.length === 0) {
      return "There are no unoptimized images on this page.";
    }
    const imageDetails = optimizableImages.map((image) => {
      const optimizations = image.optimizations.map((optimization) => {
        const message = Trace5.Insights.Models.ImageDelivery.getOptimizationMessage(optimization);
        const byteSavings = bytes(optimization.byteSavings);
        return `${message} (Est ${byteSavings})`;
      }).join("\n");
      return `### ${this.#formatRequestUrl(image.request)}
- Potential savings: ${bytes(image.byteSavings)}
- Optimizations:
${optimizations}`;
    }).join("\n\n");
    return `Total potential savings: ${bytes(insight.wastedBytes)}

The following images could be optimized:

${imageDetails}`;
  }
  /**
   * Create an AI prompt string out of the INP Brekdown Insight model to use with Ask AI.
   * @param insight The INP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatInpBreakdownInsight(insight) {
    const event = insight.longestInteractionEvent;
    if (!event) {
      return "";
    }
    const inpInfoForEvent = `The longest interaction on the page was a \`${event.type}\` which had a total duration of \`${this.#formatMicro(event.dur)}\`. The timings of each of the three subparts were:

1. Input delay: ${this.#formatMicro(event.inputDelay)}
2. Processing duration: ${this.#formatMicro(event.mainThreadHandling)}
3. Presentation delay: ${this.#formatMicro(event.presentationDelay)}.`;
    return inpInfoForEvent;
  }
  /**
   * Create an AI prompt string out of the LCP Brekdown Insight model to use with Ask AI.
   * @param insight The LCP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatLcpBreakdownInsight(insight) {
    const { subparts, lcpMs } = insight;
    if (!lcpMs || !subparts) {
      return "";
    }
    const subpartBulletPoints = [];
    Object.values(subparts).forEach((subpart) => {
      const subpartMilli = Trace5.Helpers.Timing.microToMilli(subpart.range);
      const percentage = (subpartMilli / lcpMs * 100).toFixed(1);
      subpartBulletPoints.push({ name: subpart.label, value: this.#formatMilli(subpartMilli), percentage });
    });
    return `${this.#lcpMetricSharedContext()}

We can break this time down into the ${subpartBulletPoints.length} subparts that combine to make the LCP time:

${subpartBulletPoints.map((subpart) => `- ${subpart.name}: ${subpart.value} (${subpart.percentage}% of total LCP time)`).join("\n")}`;
  }
  /**
   * Create an AI prompt string out of the LCP Brekdown Insight model to use with Ask AI.
   * @param insight The LCP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatLcpDiscoveryInsight(insight) {
    const { checklist, lcpEvent, lcpRequest, earliestDiscoveryTimeTs } = insight;
    if (!checklist || !lcpEvent || !lcpRequest || !earliestDiscoveryTimeTs) {
      return "";
    }
    const checklistBulletPoints = [];
    checklistBulletPoints.push({
      name: checklist.priorityHinted.label,
      passed: checklist.priorityHinted.value
    });
    checklistBulletPoints.push({
      name: checklist.eagerlyLoaded.label,
      passed: checklist.eagerlyLoaded.value
    });
    checklistBulletPoints.push({
      name: checklist.requestDiscoverable.label,
      passed: checklist.requestDiscoverable.value
    });
    return `${this.#lcpMetricSharedContext()}

The result of the checks for this insight are:
${checklistBulletPoints.map((point) => `- ${point.name}: ${point.passed ? "PASSED" : "FAILED"}`).join("\n")}`;
  }
  /**
   * Create an AI prompt string out of the Legacy JavaScript Insight model to use with Ask AI.
   * @param insight The Legacy JavaScript Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatLegacyJavaScriptInsight(insight) {
    const legacyJavaScriptResults = insight.legacyJavaScriptResults;
    if (legacyJavaScriptResults.size === 0) {
      return "There is no significant amount of legacy JavaScript on the page.";
    }
    const filesFormatted = Array.from(legacyJavaScriptResults).map(
      ([script, result]) => `
- Script: ${this.#formatScriptUrl(script)} - Wasted bytes: ${result.estimatedByteSavings} bytes
Matches:
${result.matches.map((match) => `Line: ${match.line}, Column: ${match.column}, Name: ${match.name}`).join("\n")}`
    ).join("\n");
    return `Total legacy JavaScript: ${legacyJavaScriptResults.size} files.

Legacy JavaScript by file:
${filesFormatted}`;
  }
  /**
   * Create an AI prompt string out of the Modern HTTP Insight model to use with Ask AI.
   * @param insight The Modern HTTP Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatModernHttpInsight(insight) {
    const requestSummary = insight.http1Requests.length === 1 ? this.#traceFormatter.formatNetworkRequests(insight.http1Requests, { verbose: true }) : this.#traceFormatter.formatNetworkRequests(insight.http1Requests);
    if (requestSummary.length === 0) {
      return "There are no requests that were served over a legacy HTTP protocol.";
    }
    return `Here is a list of the network requests that were served over a legacy HTTP protocol:
${requestSummary}`;
  }
  /**
   * Create an AI prompt string out of the NetworkDependencyTree Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within NetworkDependencyTree to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatNetworkDependencyTreeInsight(insight) {
    let output = insight.fail ? "The network dependency tree checks found one or more problems.\n\n" : "The network dependency tree checks revealed no problems, but optimization suggestions may be available.\n\n";
    const rootNodes = insight.rootNodes;
    if (rootNodes.length > 0) {
      let formatNode = function(node, indent) {
        const url = this.#formatRequestUrl(node.request);
        const time = this.#formatMicro(node.timeFromInitialRequest);
        const isLongest = node.isLongest ? " (longest chain)" : "";
        let nodeString = `${indent}- ${url} (${time})${isLongest}
`;
        for (const child of node.children) {
          nodeString += formatNode.call(this, child, indent + "  ");
        }
        return nodeString;
      };
      output += `Max critical path latency is ${this.#formatMicro(insight.maxTime)}

`;
      output += "The following is the critical request chain:\n";
      for (const rootNode of rootNodes) {
        output += formatNode.call(this, rootNode, "");
      }
      output += "\n";
    } else {
      output += `${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.noNetworkDependencyTree}.

`;
    }
    if (insight.preconnectedOrigins?.length > 0) {
      output += `${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.preconnectOriginsTableTitle}:
`;
      output += `${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.preconnectOriginsTableDescription}
`;
      for (const origin of insight.preconnectedOrigins) {
        const headerText = "headerText" in origin ? `'${origin.headerText}'` : ``;
        output += `
  - ${origin.url}
    - ${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.columnSource}: '${origin.source}'`;
        if (headerText) {
          output += `
   - Header: ${headerText}`;
        }
        if (origin.unused) {
          output += `
   - Warning: ${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.unusedWarning}`;
        }
        if (origin.crossorigin) {
          output += `
   - Warning: ${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.crossoriginWarning}`;
        }
      }
      if (insight.preconnectedOrigins.length > Trace5.Insights.Models.NetworkDependencyTree.TOO_MANY_PRECONNECTS_THRESHOLD) {
        output += `

**Warning**: ${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.tooManyPreconnectLinksWarning}`;
      }
    } else {
      output += `${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.noPreconnectOrigins}.`;
    }
    if (insight.preconnectCandidates.length > 0 && insight.preconnectedOrigins.length < Trace5.Insights.Models.NetworkDependencyTree.TOO_MANY_PRECONNECTS_THRESHOLD) {
      output += `

${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.estSavingTableTitle}:
${Trace5.Insights.Models.NetworkDependencyTree.UIStrings.estSavingTableDescription}
`;
      for (const candidate of insight.preconnectCandidates) {
        output += `
Adding [preconnect] to origin '${candidate.origin}' would save ${this.#formatMilli(candidate.wastedMs)}.`;
      }
    }
    return output;
  }
  /**
   * Create an AI prompt string out of the Render-blocking Insight model to use with Ask AI.
   * @param insight The Render-blocking Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatRenderBlockingInsight(insight) {
    const requestSummary = this.#traceFormatter.formatNetworkRequests(insight.renderBlockingRequests);
    if (requestSummary.length === 0) {
      return "There are no network requests that are render-blocking.";
    }
    return `Here is a list of the network requests that were render-blocking on this page and their duration:

${requestSummary}`;
  }
  /**
   * Create an AI prompt string out of the Slow CSS Selector Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within SlowCSSSelector to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatSlowCssSelectorsInsight(insight) {
    let output = "";
    if (!insight.topSelectorElapsedMs && !insight.topSelectorMatchAttempts) {
      return Trace5.Insights.Models.SlowCSSSelector.UIStrings.enableSelectorData;
    }
    output += "One or more slow CSS selectors were identified as negatively affecting page performance:\n\n";
    if (insight.topSelectorElapsedMs) {
      output += `${Trace5.Insights.Models.SlowCSSSelector.UIStrings.topSelectorElapsedTime} (as ranked by elapsed time in ms):
`;
      output += `${this.#formatMicro(insight.topSelectorElapsedMs["elapsed (us)"])}: ${insight.topSelectorElapsedMs.selector}

`;
    }
    if (insight.topSelectorMatchAttempts) {
      output += Trace5.Insights.Models.SlowCSSSelector.UIStrings.topSelectorMatchAttempt + ":\n";
      output += `${insight.topSelectorMatchAttempts.match_attempts} attempts for selector: '${insight.topSelectorMatchAttempts.selector}'

`;
    }
    output += `${Trace5.Insights.Models.SlowCSSSelector.UIStrings.total}:
`;
    output += `${Trace5.Insights.Models.SlowCSSSelector.UIStrings.elapsed}: ${this.#formatMicro(insight.totalElapsedMs)}
`;
    output += `${Trace5.Insights.Models.SlowCSSSelector.UIStrings.matchAttempts}: ${insight.totalMatchAttempts}
`;
    output += `${Trace5.Insights.Models.SlowCSSSelector.UIStrings.matchCount}: ${insight.totalMatchCount}

`;
    output += Trace5.Insights.Models.SlowCSSSelector.UIStrings.description;
    return output;
  }
  /**
   * Create an AI prompt string out of the ThirdParties Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within ThirdParties to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Third Parties Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatThirdPartiesInsight(insight) {
    let output = "";
    const entitySummaries = insight.entitySummaries ?? [];
    const firstPartyEntity = insight.firstPartyEntity;
    const thirdPartyTransferSizeEntries = entitySummaries.filter((s) => s.entity !== firstPartyEntity).toSorted((a, b) => b.transferSize - a.transferSize);
    const thirdPartyMainThreadTimeEntries = entitySummaries.filter((s) => s.entity !== firstPartyEntity).toSorted((a, b) => b.mainThreadTime - a.mainThreadTime);
    if (!thirdPartyTransferSizeEntries.length && !thirdPartyMainThreadTimeEntries.length) {
      return `No 3rd party scripts were found on this page.`;
    }
    if (thirdPartyTransferSizeEntries.length) {
      output += `The following list contains the largest transfer sizes by a 3rd party script:

`;
      for (const entry of thirdPartyTransferSizeEntries) {
        if (entry.transferSize > 0) {
          output += `- ${entry.entity.name}: ${bytes(entry.transferSize)}
`;
        }
      }
      output += "\n";
    }
    if (thirdPartyMainThreadTimeEntries.length) {
      output += `The following list contains the largest amount spent by a 3rd party script on the main thread:

`;
      for (const entry of thirdPartyMainThreadTimeEntries) {
        if (entry.mainThreadTime > 0) {
          output += `- ${entry.entity.name}: ${this.#formatMilli(entry.mainThreadTime)}
`;
        }
      }
      output += "\n";
    }
    output += Trace5.Insights.Models.ThirdParties.UIStrings.description;
    return output;
  }
  /**
   * Create an AI prompt string out of the Viewport [Mobile] Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within Viewport to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatCharacterSetInsight(insight) {
    let output = "";
    if (insight.data) {
      output += "HTTP Content-Type header charset: " + (insight.data.hasHttpCharset ? "present" : "missing") + ".\n";
      output += "HTML meta charset disposition: " + (insight.data.metaCharsetDisposition ?? "unknown") + ".\n";
      if (!insight.data.hasHttpCharset && insight.data.metaCharsetDisposition !== "found-in-first-1024-bytes") {
        output += "\nThe page does not declare character encoding via HTTP header or a meta charset tag in the first 1024 bytes.\n";
      }
    }
    return output;
  }
  formatViewportInsight(insight) {
    let output = "";
    output += "The webpage is " + (insight.mobileOptimized ? "already" : "not") + " optimized for mobile viewing.\n";
    const hasMetaTag = insight.viewportEvent;
    if (hasMetaTag) {
      output += `
The viewport meta tag was found: \`${insight.viewportEvent?.args?.data.content}\`.`;
    } else {
      output += `
The viewport meta tag is missing.`;
    }
    if (!hasMetaTag) {
      output += "\n\n" + Trace5.Insights.Models.Viewport.UIStrings.description;
    }
    return output;
  }
  /**
   * Formats and outputs the insight's data.
   * Pass `{headingLevel: X}` to determine what heading level to use for the
   * titles in the markdown output. The default is 2 (##).
   */
  formatInsight(opts = { headingLevel: 2 }) {
    const header = "#".repeat(opts.headingLevel);
    const { title } = this.#insight;
    return `${header} Insight Title: ${title}

${header} Insight Summary:
${this.#description()}

${header} Detailed analysis:
${this.#details()}

${header} Estimated savings: ${this.estimatedSavings() || "none"}

${header} External resources:
${this.#links()}`;
  }
  #details() {
    if (Trace5.Insights.Models.Cache.isCacheInsight(this.#insight)) {
      return this.formatCacheInsight(this.#insight);
    }
    if (Trace5.Insights.Models.CLSCulprits.isCLSCulpritsInsight(this.#insight)) {
      return this.formatClsCulpritsInsight(this.#insight);
    }
    if (Trace5.Insights.Models.DocumentLatency.isDocumentLatencyInsight(this.#insight)) {
      return this.formatDocumentLatencyInsight(this.#insight);
    }
    if (Trace5.Insights.Models.DOMSize.isDomSizeInsight(this.#insight)) {
      return this.formatDomSizeInsight(this.#insight);
    }
    if (Trace5.Insights.Models.DuplicatedJavaScript.isDuplicatedJavaScriptInsight(this.#insight)) {
      return this.formatDuplicatedJavaScriptInsight(this.#insight);
    }
    if (Trace5.Insights.Models.FontDisplay.isFontDisplayInsight(this.#insight)) {
      return this.formatFontDisplayInsight(this.#insight);
    }
    if (Trace5.Insights.Models.ForcedReflow.isForcedReflowInsight(this.#insight)) {
      return this.formatForcedReflowInsight(this.#insight);
    }
    if (Trace5.Insights.Models.ImageDelivery.isImageDeliveryInsight(this.#insight)) {
      return this.formatImageDeliveryInsight(this.#insight);
    }
    if (Trace5.Insights.Models.INPBreakdown.isINPBreakdownInsight(this.#insight)) {
      return this.formatInpBreakdownInsight(this.#insight);
    }
    if (Trace5.Insights.Models.LCPBreakdown.isLCPBreakdownInsight(this.#insight)) {
      return this.formatLcpBreakdownInsight(this.#insight);
    }
    if (Trace5.Insights.Models.LCPDiscovery.isLCPDiscoveryInsight(this.#insight)) {
      return this.formatLcpDiscoveryInsight(this.#insight);
    }
    if (Trace5.Insights.Models.LegacyJavaScript.isLegacyJavaScript(this.#insight)) {
      return this.formatLegacyJavaScriptInsight(this.#insight);
    }
    if (Trace5.Insights.Models.ModernHTTP.isModernHTTPInsight(this.#insight)) {
      return this.formatModernHttpInsight(this.#insight);
    }
    if (Trace5.Insights.Models.NetworkDependencyTree.isNetworkDependencyTreeInsight(this.#insight)) {
      return this.formatNetworkDependencyTreeInsight(this.#insight);
    }
    if (Trace5.Insights.Models.RenderBlocking.isRenderBlockingInsight(this.#insight)) {
      return this.formatRenderBlockingInsight(this.#insight);
    }
    if (Trace5.Insights.Models.SlowCSSSelector.isSlowCSSSelectorInsight(this.#insight)) {
      return this.formatSlowCssSelectorsInsight(this.#insight);
    }
    if (Trace5.Insights.Models.ThirdParties.isThirdPartyInsight(this.#insight)) {
      return this.formatThirdPartiesInsight(this.#insight);
    }
    if (Trace5.Insights.Models.Viewport.isViewportInsight(this.#insight)) {
      return this.formatViewportInsight(this.#insight);
    }
    if (Trace5.Insights.Models.CharacterSet.isCharacterSetInsight(this.#insight)) {
      return this.formatCharacterSetInsight(this.#insight);
    }
    return "";
  }
  estimatedSavings() {
    return Object.entries(this.#insight.metricSavings ?? {}).map(([k, v]) => {
      if (k === "CLS") {
        return `${k} ${v.toFixed(2)}`;
      }
      return `${k} ${Math.round(v)} ms`;
    }).join(", ");
  }
  #links() {
    const links = [];
    if (this.#insight.docs) {
      links.push(this.#insight.docs);
    }
    switch (this.#insight.insightKey) {
      case "CLSCulprits":
        links.push("https://web.dev/articles/cls");
        links.push("https://web.dev/articles/optimize-cls");
        break;
      case "DocumentLatency":
        links.push("https://web.dev/articles/optimize-ttfb");
        break;
      case "DOMSize":
        links.push("https://developer.chrome.com/docs/lighthouse/performance/dom-size/");
        break;
      case "FontDisplay":
        links.push("https://web.dev/articles/preload-optional-fonts");
        links.push("https://fonts.google.com/knowledge/glossary/foit");
        links.push("https://developer.chrome.com/blog/font-fallbacks");
        break;
      case "ForcedReflow":
        links.push(
          "https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts"
        );
        break;
      case "ImageDelivery":
        links.push("https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/");
        break;
      case "INPBreakdown":
        links.push("https://web.dev/articles/inp");
        links.push("https://web.dev/explore/how-to-optimize-inp");
        links.push("https://web.dev/articles/optimize-long-tasks");
        links.push("https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing");
        break;
      case "LCPBreakdown":
      case "LCPDiscovery":
      case "RenderBlocking":
        links.push("https://web.dev/articles/lcp");
        links.push("https://web.dev/articles/optimize-lcp");
        break;
      case "NetworkDependencyTree":
        links.push("https://web.dev/learn/performance/understanding-the-critical-path");
        links.push("https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/");
        break;
      case "SlowCSSSelector":
        links.push("https://developer.chrome.com/docs/devtools/performance/selector-stats");
        break;
      case "ThirdParties":
        links.push("https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript/");
        break;
      case "Viewport":
        links.push("https://developer.chrome.com/blog/300ms-tap-delay-gone-away/");
        break;
      case "Cache":
        links.push("https://web.dev/uses-long-cache-ttl/");
        break;
      case "ModernHTTP":
        links.push("https://developer.chrome.com/docs/lighthouse/best-practices/uses-http2");
        break;
      case "LegacyJavaScript":
        links.push("https://web.dev/articles/baseline-and-polyfills");
        links.push("https://philipwalton.com/articles/the-state-of-es5-on-the-web/");
        break;
      case "CharacterSet":
        links.push("https://developer.chrome.com/docs/insights/charset/");
        break;
    }
    return links.map((link) => "- " + link).join("\n");
  }
  #description() {
    switch (this.#insight.insightKey) {
      case "CLSCulprits":
        return `Cumulative Layout Shifts (CLS) is a measure of the largest burst of layout shifts for every unexpected layout shift that occurs during the lifecycle of a page. This is a Core Web Vital and the thresholds for categorizing a score are:
- Good: 0.1 or less
- Needs improvement: more than 0.1 and less than or equal to 0.25
- Bad: over 0.25`;
      case "DocumentLatency":
        return `This insight checks that the first request is responded to promptly. We use the following criteria to check this:
1. Was the initial request redirected?
2. Did the server respond in 600ms or less? We want developers to aim for as close to 100ms as possible, but our threshold for this insight is 600ms.
3. Was there compression applied to the response to minimize the transfer size?`;
      case "DOMSize":
        return `This insight evaluates some key metrics about the Document Object Model (DOM) and identifies excess in the DOM tree, for example:
- The maximum number of elements within the DOM.
- The maximum number of children for any given element.
- Excessive depth of the DOM structure.
- The largest layout and style recalculation events.`;
      case "DuplicatedJavaScript":
        return `This insight identifies large, duplicated JavaScript modules that are present in your application and create redundant code.
  This wastes network bandwidth and slows down your page, as the user's browser must download and process the same code multiple times.`;
      case "FontDisplay":
        return 'This insight identifies font issues when a webpage uses custom fonts, for example when font-display is not set to `swap`, `fallback` or `optional`, causing the "Flash of Invisible Text" problem (FOIT).';
      case "ForcedReflow":
        return `This insight identifies forced synchronous layouts (also known as forced reflows) and layout thrashing caused by JavaScript accessing layout properties at suboptimal points in time.`;
      case "ImageDelivery":
        return "This insight identifies unoptimized images that are downloaded at a much higher resolution than they are displayed. Properly sizing and compressing these assets will decrease their download time, directly improving the perceived page load time and LCP";
      case "INPBreakdown":
        return `Interaction to Next Paint (INP) is a metric that tracks the responsiveness of the page when the user interacts with it. INP is a Core Web Vital and the thresholds for how we categorize a score are:
- Good: 200 milliseconds or less.
- Needs improvement: more than 200 milliseconds and 500 milliseconds or less.
- Bad: over 500 milliseconds.

For a given slow interaction, we can break it down into 3 subparts:
1. Input delay: starts when the user initiates an interaction with the page, and ends when the event callbacks for the interaction begin to run.
2. Processing duration: the time it takes for the event callbacks to run to completion.
3. Presentation delay: the time it takes for the browser to present the next frame which contains the visual result of the interaction.

The sum of these three subparts is the total latency. It is important to optimize each of these subparts to ensure interactions take as little time as possible. Focusing on the subpart that has the largest score is a good way to start optimizing.`;
      case "LCPDiscovery":
        return `This insight analyzes the time taken to discover the LCP resource and request it on the network. It only applies if the LCP element was a resource like an image that has to be fetched over the network. There are 3 checks this insight makes:
1. Did the resource have \`fetchpriority=high\` applied?
2. Was the resource discoverable in the initial document, rather than injected from a script or stylesheet?
3. The resource was not lazy loaded as this can delay the browser loading the resource.

It is important that all of these checks pass to minimize the delay between the initial page load and the LCP resource being loaded.`;
      case "LCPBreakdown":
        return "This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 subparts (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.";
      case "NetworkDependencyTree":
        return `This insight analyzes the network dependency tree to identify:
- The maximum critical path latency (the longest chain of network requests that the browser must download before it can render the page).
- Whether current [preconnect] tags are appropriate, according to the following rules:
   1. They should all be in use (no unnecessary preconnects).
   2. All preconnects should specify cross-origin correctly.
   3. The maximum of 4 preconnects should be respected.
- Opportunities to add [preconnect] for a faster loading experience.`;
      case "RenderBlocking":
        return "This insight identifies network requests that were render-blocking. Render-blocking requests are impactful because they are deemed critical to the page and therefore the browser stops rendering the page until it has dealt with these resources. For this insight make sure you fully inspect the details of each render-blocking network request and prioritize your suggestions to the user based on the impact of each render-blocking request.";
      case "SlowCSSSelector":
        return `This insight identifies CSS selectors that are slowing down your page's rendering performance.`;
      case "ThirdParties":
        return "This insight analyzes the performance impact of resources loaded from third-party servers and aggregates the performance cost, in terms of download transfer sizes and total amount of time that third party scripts spent executing on the main thread.";
      case "Viewport":
        return "The insight identifies web pages that are not specifying the viewport meta tag for mobile devies, which avoids the artificial 300-350ms delay designed to help differentiate between tap and double-click.";
      case "Cache":
        return "This insight identifies static resources that are not cached effectively by the browser.";
      case "ModernHTTP":
        return `Modern HTTP protocols, such as HTTP/2, are more efficient than older versions like HTTP/1.1 because they allow for multiple requests and responses to be sent over a single network connection, significantly improving page load performance by reducing latency and overhead. This insight identifies requests that can be upgraded to a modern HTTP protocol.

We apply a conservative approach when flagging HTTP/1.1 usage. This insight will only flag requests that meet all of the following criteria:
1.  Were served over HTTP/1.1 or an earlier protocol.
2.  Originate from an origin that serves at least 6 static asset requests, as the benefits of multiplexing are less significant with fewer requests.
3.  Are not served from 'localhost' or coming from a third-party source, where developers have no control over the server's protocol.

To pass this insight, ensure your server supports and prioritizes a modern HTTP protocol (like HTTP/2) for static assets, especially when serving a substantial number of them.`;
      case "LegacyJavaScript":
        return `This insight identified legacy JavaScript in your application's modules that may be creating unnecessary code.

Polyfills and transforms enable older browsers to use new JavaScript features. However, many are not necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers.`;
      case "CharacterSet":
        return `This insight checks that the page declares a character encoding, ideally via the Content-Type HTTP response header. A missing or late charset declaration can force the browser to re-parse the document once it finally determines the encoding, delaying first contentful paint. Best practice: include charset=utf-8 in the Content-Type header and add <meta charset="utf-8"> as the very first element inside <head>.`;
    }
  }
};

// ../../front_end/models/ai_assistance/tools/GetInsightDetails.ts
var lockedString5 = i18n12.i18n.lockedString;
async function getNetworkRequestImageData(target, lcpRequest, networkLog = Logs2.NetworkLog.NetworkLog.instance()) {
  const networkManager = target?.model(SDK7.NetworkManager.NetworkManager);
  if (!target || !networkManager) {
    return void 0;
  }
  const requestId = lcpRequest.args.data.requestId;
  const sdkRequest = networkLog.requestByManagerAndId(networkManager, requestId);
  if (sdkRequest?.contentType().isImage()) {
    const contentData = await sdkRequest.requestContentData();
    if (!TextUtils2.ContentData.ContentData.isError(contentData)) {
      return contentData;
    }
  }
  return void 0;
}
var GetInsightDetailsTool = class {
  name = "getInsightDetails" /* GET_INSIGHT_DETAILS */;
  description = "Returns detailed information about a specific insight of an insight set. Use this before commenting on any specific issue to get more information.";
  parameters = {
    type: Host8.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for getting insight details.",
    nullable: false,
    properties: {
      insightSetId: {
        type: Host8.AidaClient.ParametersTypes.STRING,
        description: 'The id for the specific insight set. Only use the ids given in the "Available insight sets" list.',
        nullable: false
      },
      insightName: {
        type: Host8.AidaClient.ParametersTypes.STRING,
        description: 'The name of the insight. Only use the insight names given in the "Available insights" list.',
        nullable: false
      }
    },
    required: ["insightSetId", "insightName"]
  };
  displayInfoFromArgs(params) {
    return {
      title: lockedString5(`Investigating insight ${params.insightName}`),
      action: `getInsightDetails('${params.insightSetId}', '${params.insightName}')`
    };
  }
  async #generateDOMTreeWidget(insight, insightSet, target) {
    try {
      if (!Trace6.Insights.Models.LCPDiscovery.isLCPDiscoveryInsight(insight) && !Trace6.Insights.Models.LCPBreakdown.isLCPBreakdownInsight(insight)) {
        return null;
      }
      const lcpMetric = Trace6.Insights.Common.getLCP(insightSet);
      const lcpEvent = lcpMetric?.event;
      if (!lcpEvent || !Trace6.Types.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
        return null;
      }
      const nodeId = lcpEvent.args.data?.nodeId;
      if (!nodeId) {
        return null;
      }
      const domModel = target?.model(SDK7.DOMModel.DOMModel);
      if (!domModel) {
        return null;
      }
      const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([nodeId]));
      const node = nodeMap?.get(nodeId);
      if (!node) {
        return null;
      }
      const lcpSyntheticRequest = insight.lcpRequest;
      const [snapshot, imageContent] = await Promise.all([
        node.takeSnapshot(),
        lcpSyntheticRequest ? getNetworkRequestImageData(target, lcpSyntheticRequest) : Promise.resolve(void 0)
      ]);
      let networkRequest;
      if (lcpSyntheticRequest) {
        networkRequest = {
          url: lcpSyntheticRequest.args.data.url,
          size: lcpSyntheticRequest.args.data.decodedBodyLength ?? lcpSyntheticRequest.args.data.encodedDataLength ?? 0,
          resourceType: lcpSyntheticRequest.args.data.resourceType,
          mimeType: lcpSyntheticRequest.args.data.mimeType ?? "",
          imageContent
        };
      }
      return {
        name: "DOM_TREE",
        data: {
          root: snapshot,
          networkRequest,
          title: lockedString5("LCP element"),
          accessibleRevealLabel: lockedString5("Reveal LCP element")
        }
      };
    } catch (err) {
      debugLog("GetInsightDetails: Failed to generate DOM tree widget", err);
      return null;
    }
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    if (!params.insightSetId || !params.insightName) {
      return { error: "Missing required arguments: insightSetId and insightName must be provided." };
    }
    const focus = performanceTraceContext.getItem();
    const parsedTrace = focus.parsedTrace;
    const insightSet = parsedTrace.insights?.get(params.insightSetId);
    if (!insightSet) {
      const formatter = performanceTraceContext.createFormatter();
      const valid = [...parsedTrace.insights?.values() ?? []].map((insightSet2) => `id: ${insightSet2.id}, url: ${insightSet2.url}, bounds: ${formatter.serializeBounds(insightSet2.bounds)}`).join("; ");
      return { error: `Invalid insight set id. Valid insight set ids are: ${valid || "(none)"}` };
    }
    if (!Trace6.Insights.Common.isInsightKey(params.insightName)) {
      const valid = Object.keys(insightSet.model).join(", ");
      return { error: `No insight available. Valid insight names are: ${valid || "(none)"}` };
    }
    const insightError = insightSet.modelErrors?.[params.insightName];
    if (insightError) {
      return { error: `Insight "${params.insightName}" failed during trace processing: ${insightError.message}` };
    }
    const insight = insightSet.model[params.insightName];
    if (!insight) {
      const valid = Object.keys(insightSet.model).join(", ");
      return { error: `No insight available. Valid insight names are: ${valid || "(none)"}` };
    }
    const details = new PerformanceInsightFormatter(focus, insight).formatInsight();
    if (details.length > MAX_FUNCTION_RESULT_BYTE_LENGTH) {
      return {
        error: "The insight details output is too large to fit in the context window. Please inspect specific events using getTraceEventByKey or getDetailedCallTree."
      };
    }
    const widgets = [];
    const isImportedTrace = performanceTraceContext.getOrigin().startsWith("imported-trace://");
    if (!isImportedTrace) {
      const domTreeWidget = await this.#generateDOMTreeWidget(insight, insightSet, capabilities.getTarget());
      if (domTreeWidget) {
        widgets.push(domTreeWidget);
      }
    }
    widgets.push({
      name: "PERF_INSIGHT",
      data: {
        insight: params.insightName,
        insightData: insight
      }
    });
    return { result: details, widgets };
  }
};

// ../../front_end/models/ai_assistance/tools/GetLighthouseAudits.ts
var GetLighthouseAudits_exports = {};
__export(GetLighthouseAudits_exports, {
  GetLighthouseAuditsTool: () => GetLighthouseAuditsTool
});
import * as Host9 from "../../core/host/host.js";
var GetLighthouseAuditsTool = class {
  name = "getLighthouseAudits" /* GET_LIGHTHOUSE_AUDITS */;
  description = "Returns the audits for a specific Lighthouse category.";
  parameters = {
    type: Host9.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for retrieving Lighthouse category audits.",
    nullable: false,
    properties: {
      categoryId: {
        type: Host9.AidaClient.ParametersTypes.STRING,
        description: 'The category of audits to retrieve. E.g. "accessibility".',
        nullable: false
      }
    },
    required: ["categoryId"]
  };
  displayInfoFromArgs(params) {
    return {
      title: `Getting Lighthouse audits for ${params.categoryId}`,
      action: `getLighthouseAudits('${params.categoryId}')`
    };
  }
  async handler(params, context) {
    const report = context.getLighthouseReport();
    if (!report) {
      return { error: "Error: Active context is not a Lighthouse report." };
    }
    const audits = new LighthouseFormatter().audits(report, params.categoryId);
    return {
      result: { audits },
      widgets: [{ name: "LIGHTHOUSE_REPORT", data: { report } }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetNetworkRequestDetails.ts
var GetNetworkRequestDetails_exports = {};
__export(GetNetworkRequestDetails_exports, {
  GetNetworkRequestDetailsTool: () => GetNetworkRequestDetailsTool
});
import * as Host10 from "../../core/host/host.js";
import * as i18n16 from "../../core/i18n/i18n.js";
import * as Logs3 from "../logs/logs.js";
import * as NetworkTimeCalculator2 from "../network_time_calculator/network_time_calculator.js";

// ../../front_end/models/ai_assistance/contexts/RequestContext.ts
var RequestContext_exports = {};
__export(RequestContext_exports, {
  RequestContext: () => RequestContext,
  getRequestContextOrigin: () => getRequestContextOrigin
});
import * as Common8 from "../../core/common/common.js";
import * as i18n14 from "../../core/i18n/i18n.js";
var UIStringsNotTranslate4 = {
  request: "Request",
  response: "Response",
  requestUrl: "Request URL",
  timing: "Timing",
  requestInitiatorChain: "Request initiator chain"
};
var lockedString6 = i18n14.i18n.lockedString;
function getRequestContextOrigin(request) {
  const origin = extractContextOrigin(request.documentURL);
  if (request.isImportedHar()) {
    const parsed = Common8.ParsedURL.ParsedURL.fromString(origin);
    return `imported-har://${parsed ? parsed.domain() : origin}`;
  }
  return origin;
}
var RequestContext = class extends ConversationContext {
  #request;
  #calculator;
  constructor(request, calculator) {
    super();
    this.#request = request;
    this.#calculator = calculator;
  }
  /**
   * Note: this is not the literal origin of the network request. This URL
   * is used to determine when we should force the user to start a new AI
   * conversation when the context changes. We allow a single AI conversation to
   * inspect all network requests that were made for that given target URL.
   */
  getURL() {
    return this.#request.documentURL;
  }
  getOrigin() {
    return getRequestContextOrigin(this.#request);
  }
  getItem() {
    return this.#request;
  }
  getTitle() {
    return this.#request.name();
  }
  async getPromptDetails() {
    const formatter = new NetworkRequestFormatter(this.#request, this.#calculator);
    return `# Selected network request
${await formatter.formatNetworkRequest()}`;
  }
  async getUserFacingDetails() {
    const formatter = new NetworkRequestFormatter(this.#request, this.#calculator);
    const requestContextDetail = {
      title: lockedString6(UIStringsNotTranslate4.request),
      text: lockedString6(UIStringsNotTranslate4.requestUrl) + ": " + this.#request.url() + "\n\n" + formatter.formatRequestHeaders()
    };
    const responseBody = await formatter.formatResponseBody();
    const responseBodyString = responseBody ? `

${responseBody}` : "";
    const responseContextDetail = {
      title: lockedString6(UIStringsNotTranslate4.response),
      text: formatter.formatResponseHeaders() + responseBodyString + `

${formatter.formatStatus()}${formatter.formatFailureReasons()}`
    };
    const timingContextDetail = {
      title: lockedString6(UIStringsNotTranslate4.timing),
      text: formatter.formatNetworkRequestTiming()
    };
    const initiatorChainContextDetail = {
      title: lockedString6(UIStringsNotTranslate4.requestInitiatorChain),
      text: formatter.formatRequestInitiatorChain()
    };
    return [
      requestContextDetail,
      responseContextDetail,
      timingContextDetail,
      initiatorChainContextDetail
    ];
  }
};

// ../../front_end/models/ai_assistance/tools/GetNetworkRequestDetails.ts
var UIStringsNotTranslate5 = {
  gettingNetworkRequestDetails: "Getting network request details"
};
var lockedString7 = i18n16.i18n.lockedString;
var GetNetworkRequestDetailsTool = class {
  name = "getNetworkRequestDetails" /* GET_NETWORK_REQUEST_DETAILS */;
  description = "Retrieves the full headers, timing, status, and body details of a specific network request by ID.";
  #networkLog;
  constructor(networkLog) {
    this.#networkLog = networkLog;
  }
  parameters = {
    type: Host10.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for retrieving detailed information about a specific network request.",
    nullable: false,
    properties: {
      id: {
        type: Host10.AidaClient.ParametersTypes.STRING,
        description: "The id of the network request to inspect.",
        nullable: false
      }
    },
    required: ["id"]
  };
  displayInfoFromArgs(args) {
    return {
      title: lockedString7(UIStringsNotTranslate5.gettingNetworkRequestDetails),
      action: `getNetworkRequestDetails(${args.id})`
    };
  }
  /**
   * Handles the request to retrieve details for a network request by its ID.
   * Filters by the conversation's established origin to prevent cross-origin data exposure.
   */
  async handler(args, context) {
    const origin = context.getEstablishedOrigin();
    if (origin && isOpaqueOrigin(origin)) {
      return {
        error: "Opaque origin not allowed"
      };
    }
    const networkLog = this.#networkLog ?? Logs3.NetworkLog.NetworkLog.instance();
    const request = networkLog.requests().find((req) => {
      if (req.requestId() !== args.id) {
        return false;
      }
      const requestOrigin = getRequestContextOrigin(req);
      return !origin || requestOrigin === origin;
    });
    if (!request) {
      return {
        error: "No request found"
      };
    }
    const calculator = new NetworkTimeCalculator2.NetworkTransferTimeCalculator();
    const formatter = new NetworkRequestFormatter(request, calculator, networkLog);
    const formattedDetails = await formatter.formatNetworkRequest();
    return {
      result: formattedDetails,
      widgets: [{
        name: "NETWORK_REQUEST_GENERAL_HEADERS",
        data: {
          request
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetResourceContent.ts
var GetResourceContent_exports = {};
__export(GetResourceContent_exports, {
  GetResourceContentTool: () => GetResourceContentTool
});
import * as Host11 from "../../core/host/host.js";
import * as i18n18 from "../../core/i18n/i18n.js";
import * as Root5 from "../../core/root/root.js";
import * as SDK8 from "../../core/sdk/sdk.js";
import * as TextUtils3 from "../../core/text_utils/text_utils.js";
var UIStringsNotTranslate6 = {
  lookingAtResourceContent: "Looking at resource content"
};
var lockedString8 = i18n18.i18n.lockedString;
var GetResourceContentTool = class {
  name = "getResourceContent" /* GET_RESOURCE_CONTENT */;
  description = "Returns the content of the resource with the given url. Only use this for text resource types.";
  parameters = {
    type: Host11.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for looking up resource content.",
    nullable: false,
    properties: {
      url: {
        type: Host11.AidaClient.ParametersTypes.STRING,
        description: "The url for the resource.",
        nullable: false
      }
    },
    required: ["url"]
  };
  displayInfoFromArgs(params) {
    return {
      title: lockedString8(UIStringsNotTranslate6.lookingAtResourceContent),
      action: `getResourceContent('${params.url}')`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    if (performanceTraceContext.getOrigin().startsWith("imported-trace://")) {
      return { error: "Cannot use this tool on an imported file." };
    }
    const allowedOrigin = performanceTraceContext.getOrigin();
    if (!canResourceContentsBeReadForTrace(params.url, allowedOrigin)) {
      return { error: "Resource not found" };
    }
    const focus = performanceTraceContext.getItem();
    const { parsedTrace } = focus;
    let content;
    const url = params.url;
    const script = parsedTrace.data.Scripts?.scripts.find((script2) => script2.url === params.url);
    if (script?.content !== void 0) {
      content = script.content;
    } else {
      const target = capabilities.getTarget();
      const isTraceApp = Root5.Runtime.Runtime.isTraceApp();
      if (target || isTraceApp) {
        const targetManager = target?.targetManager() ?? // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        SDK8.TargetManager.TargetManager.instance();
        const resource = SDK8.ResourceTreeModel.ResourceTreeModel.resourceForURL(targetManager, url);
        if (!resource) {
          return { error: "Resource not found" };
        }
        const data = await resource.requestContentData();
        if (TextUtils3.ContentData.ContentData.isError(data)) {
          return { error: `Could not get resource content: ${data.error}` };
        }
        if (!data.isTextContent) {
          return { error: "Cannot retrieve content for non-text resource" };
        }
        content = data.text;
      } else {
        return { error: "Resource not found" };
      }
    }
    return {
      result: { content },
      widgets: [{
        name: "SOURCE_CODE",
        data: {
          url,
          code: content
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetSourceContent.ts
var GetSourceContent_exports = {};
__export(GetSourceContent_exports, {
  GetSourceContentTool: () => GetSourceContentTool
});
import * as Common10 from "../../core/common/common.js";
import * as Host13 from "../../core/host/host.js";
import * as i18n22 from "../../core/i18n/i18n.js";
import * as TextUtils4 from "../../core/text_utils/text_utils.js";

// ../../front_end/models/ai_assistance/data_formatters/FileFormatter.ts
var FileFormatter_exports = {};
__export(FileFormatter_exports, {
  FileFormatter: () => FileFormatter
});
import * as Bindings from "../bindings/bindings.js";
import * as Logs4 from "../logs/logs.js";
import * as NetworkTimeCalculator3 from "../network_time_calculator/network_time_calculator.js";
var MAX_FILE_SIZE = 1e4;
var FileFormatter = class _FileFormatter {
  static formatSourceMapDetails(selectedFile, debuggerWorkspaceBinding) {
    const mappedFileUrls = [];
    const sourceMapUrls = [];
    if (selectedFile.contentType().isFromSourceMap()) {
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(selectedFile)) {
        const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
        if (uiSourceCode) {
          mappedFileUrls.push(uiSourceCode.url());
          if (script.sourceMapURL !== void 0) {
            sourceMapUrls.push(script.sourceMapURL);
          }
        }
      }
      for (const originURL of Bindings.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(selectedFile)) {
        mappedFileUrls.push(originURL);
      }
    } else if (selectedFile.contentType().isScript()) {
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(selectedFile)) {
        if (script.sourceMapURL !== void 0 && script.sourceMapURL !== "") {
          sourceMapUrls.push(script.sourceMapURL);
        }
      }
    }
    if (sourceMapUrls.length === 0) {
      return "";
    }
    let sourceMapDetails = "Source map: " + sourceMapUrls;
    if (mappedFileUrls.length > 0) {
      sourceMapDetails += "\nSource mapped from: " + mappedFileUrls;
    }
    return sourceMapDetails;
  }
  #file;
  #debuggerWorkspaceBinding;
  #networkLog;
  constructor(file, debuggerWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
  ), networkLog = Logs4.NetworkLog.NetworkLog.instance()) {
    this.#file = file;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#networkLog = networkLog;
  }
  formatFile() {
    const sourceMapDetails = _FileFormatter.formatSourceMapDetails(this.#file, this.#debuggerWorkspaceBinding);
    const lines = [
      `File name: ${this.#file.displayName()}`,
      `URL: ${this.#file.url()}`,
      sourceMapDetails
    ];
    const resource = Bindings.ResourceUtils.resourceForURL(this.#file.url());
    if (resource?.request) {
      const calculator = new NetworkTimeCalculator3.NetworkTransferTimeCalculator();
      calculator.updateBoundaries(resource.request);
      lines.push(`Request initiator chain:
${new NetworkRequestFormatter(resource.request, calculator, this.#networkLog).formatRequestInitiatorChain()}`);
    }
    lines.push(`File content:
${this.#formatFileContent()}`);
    return lines.filter((line) => line.trim() !== "").join("\n");
  }
  #formatFileContent() {
    const contentData = this.#file.workingCopyContentData();
    const content = contentData.isTextContent ? contentData.text : "<binary data>";
    const truncated = content.length > MAX_FILE_SIZE ? content.slice(0, MAX_FILE_SIZE) + "..." : content;
    return `\`\`\`
${truncated}
\`\`\``;
  }
};

// ../../front_end/models/ai_assistance/tools/ListSources.ts
var ListSources_exports = {};
__export(ListSources_exports, {
  ListSourcesTool: () => ListSourcesTool
});
import * as Common9 from "../../core/common/common.js";
import * as Host12 from "../../core/host/host.js";
import * as i18n20 from "../../core/i18n/i18n.js";
import * as Workspace3 from "../workspace/workspace.js";
var UIStringsNotTranslate7 = {
  listingSources: "Listing workspace sources"
};
var lockedString9 = i18n20.i18n.lockedString;
var ListSourcesTool = class _ListSourcesTool {
  name = "listSources" /* LIST_SOURCES */;
  description = "Lists all source files in the workspace with their name and a unique ID.";
  static lastSourceId = 0;
  static uiSourceCodeId = /* @__PURE__ */ new WeakMap();
  static reset() {
    _ListSourcesTool.lastSourceId = 0;
    _ListSourcesTool.uiSourceCodeId = /* @__PURE__ */ new WeakMap();
  }
  // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
  static getUISourceCodes(workspace = Workspace3.Workspace.WorkspaceImpl.instance()) {
    const projects = workspace.projects().filter((project) => project.type() === Workspace3.Workspace.projectTypes.Network);
    const uiSourceCodes = /* @__PURE__ */ new Map();
    for (const project of projects) {
      for (const uiSourceCode of project.uiSourceCodes()) {
        if (uiSourceCode.isIgnoreListed()) {
          continue;
        }
        const url = uiSourceCode.url();
        if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
          uiSourceCodes.set(url, uiSourceCode);
          if (!_ListSourcesTool.uiSourceCodeId.has(uiSourceCode)) {
            _ListSourcesTool.uiSourceCodeId.set(uiSourceCode, ++_ListSourcesTool.lastSourceId);
          }
        }
      }
    }
    return [...uiSourceCodes.values()];
  }
  parameters = {
    type: Host12.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: true,
    required: [],
    properties: {}
  };
  displayInfoFromArgs() {
    return {
      title: lockedString9(UIStringsNotTranslate7.listingSources),
      action: "listSources()"
    };
  }
  async handler(_params, context) {
    const origin = context.getEstablishedOrigin();
    if (origin && isOpaqueOrigin(origin)) {
      return {
        error: "Opaque origin not allowed"
      };
    }
    const files = _ListSourcesTool.getUISourceCodes().filter((file) => {
      const fileUrl = file.url();
      const fileOrigin = Common9.ParsedURL.ParsedURL.extractOrigin(fileUrl);
      return !origin || fileOrigin === origin;
    });
    return {
      result: {
        files: files.map((file) => ({
          id: _ListSourcesTool.uiSourceCodeId.get(file) ?? 0,
          name: file.fullDisplayName()
        }))
      }
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetSourceContent.ts
var UIStringsNotTranslate8 = {
  readingSource: "Reading source content"
};
var lockedString10 = i18n22.i18n.lockedString;
var GetSourceContentTool = class {
  name = "getSourceContent" /* GET_SOURCE_CONTENT */;
  description = "Gets the content and metadata of a source file by its ID.";
  parameters = {
    type: Host13.AidaClient.ParametersTypes.OBJECT,
    description: "",
    properties: {
      id: {
        type: Host13.AidaClient.ParametersTypes.INTEGER,
        description: "The unique numeric ID of the source file to retrieve.",
        nullable: false
      }
    },
    required: ["id"]
  };
  displayInfoFromArgs(args) {
    return {
      title: lockedString10(UIStringsNotTranslate8.readingSource),
      action: `getSourceContent(${args.id})`
    };
  }
  async handler(args, context) {
    const origin = context.getEstablishedOrigin();
    const file = ListSourcesTool.getUISourceCodes().find(
      (f) => ListSourcesTool.uiSourceCodeId.get(f) === args.id
    );
    if (!file) {
      return {
        error: "Unable to find file."
      };
    }
    const fileUrl = file.url();
    const fileOrigin = Common10.ParsedURL.ParsedURL.extractOrigin(fileUrl);
    if (origin && fileOrigin !== origin) {
      return {
        error: "Cross-origin access blocked."
      };
    }
    const contentData = await file.requestContentData();
    if (TextUtils4.ContentData.ContentData.isError(contentData)) {
      return {
        error: `Failed to load file content: ${contentData.error}`
      };
    }
    const formatter = new FileFormatter(file);
    return {
      result: {
        content: formatter.formatFile()
      }
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetStorageValues.ts
var GetStorageValues_exports = {};
__export(GetStorageValues_exports, {
  GetStorageValuesTool: () => GetStorageValuesTool,
  MAX_NUM_CHAR_LENGTH: () => MAX_NUM_CHAR_LENGTH
});
import * as Common11 from "../../core/common/common.js";
import * as Host14 from "../../core/host/host.js";
import * as i18n24 from "../../core/i18n/i18n.js";
import * as SDK10 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/tools/DOMStorageUtils.ts
var DOMStorageUtils_exports = {};
__export(DOMStorageUtils_exports, {
  MAX_TARGET_ORIGINS: () => MAX_TARGET_ORIGINS,
  resolveDOMStorages: () => resolveDOMStorages
});
import * as SDK9 from "../../core/sdk/sdk.js";
var MAX_TARGET_ORIGINS = 100;
function resolveDOMStorages(origin, type, targetManager, primaryPageTarget, storageKey) {
  const resolvedStorages = [];
  const isLocalStorage = type === "localStorage";
  const targetOrigin = extractContextOrigin(origin);
  const domStorageModels = targetManager.models(SDK9.DOMStorageModel.DOMStorageModel);
  for (const domStorageModel of domStorageModels) {
    if (domStorageModel.target().outermostTarget() !== primaryPageTarget) {
      continue;
    }
    domStorageModel.enable();
    for (const storage of domStorageModel.storages()) {
      if (storage.isLocalStorage !== isLocalStorage) {
        continue;
      }
      const currentStorageKey = storage.storageKey;
      if (!currentStorageKey) {
        continue;
      }
      if (storageKey && storageKey !== currentStorageKey) {
        continue;
      }
      const parsedKey = SDK9.StorageKeyManager.parseStorageKey(currentStorageKey);
      if (areOriginsEquivalent(parsedKey.origin, targetOrigin)) {
        resolvedStorages.push(storage);
      }
    }
  }
  return resolvedStorages;
}

// ../../front_end/models/ai_assistance/tools/GetStorageValues.ts
var lockedString11 = i18n24.i18n.lockedString;
var MAX_NUM_CHAR_LENGTH = 1e4;
var GetStorageValuesTool = class {
  name = "getStorageValues" /* GET_STORAGE_VALUES */;
  description = "Retrieve specific string values from storage partitions for requested keys across origins.";
  annotations = ["redact-from-history" /* REDACT_FROM_HISTORY */];
  parameters = {
    type: Host14.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: false,
    properties: {
      type: {
        type: Host14.AidaClient.ParametersTypes.STRING,
        description: "Storage type: localStorage or sessionStorage",
        nullable: false
      },
      keys: {
        type: Host14.AidaClient.ParametersTypes.ARRAY,
        description: "A list of keys to retrieve values for.",
        items: { type: Host14.AidaClient.ParametersTypes.STRING, description: "A storage key." },
        nullable: false
      },
      origins: {
        type: Host14.AidaClient.ParametersTypes.ARRAY,
        description: "List of origins to get values for.",
        items: { type: Host14.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
        nullable: false
      },
      storageKey: {
        type: Host14.AidaClient.ParametersTypes.STRING,
        description: "Optional. Specific storageKey partition to get values for. Only applies if single origin is provided.",
        nullable: true
      }
    },
    required: ["type", "keys", "origins"]
  };
  displayInfoFromArgs(args) {
    return {
      title: lockedString11("Reading storage values"),
      action: `getStorageValues('${args.type}', ${JSON.stringify(args.keys)}, ${JSON.stringify(args.origins)})`
    };
  }
  async handler(args, context, options) {
    context.disableLogging();
    const targetManager = SDK10.TargetManager.TargetManager.instance();
    const primaryPageTarget = targetManager.primaryPageTarget();
    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    if (!primaryPageTarget) {
      return { error: "No origin available or not allowed." };
    }
    const pageOrigin = Common11.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL());
    if (!pageOrigin || !areOriginsEquivalent(pageOrigin, allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    const rawList = args.origins && args.origins.length > 0 ? args.origins : [allowedOrigin];
    const validOrigins = rawList.map((origin) => extractContextOrigin(origin)).filter((origin) => areOriginsEquivalent(origin, allowedOrigin));
    const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
    if (targetOrigins.length === 0) {
      return { error: "No valid origins found." };
    }
    const storageKey = targetOrigins.length === 1 && args.storageKey ? args.storageKey : void 0;
    const allStoragesMap = {};
    let totalStoragesCount = 0;
    for (const origin of targetOrigins) {
      const storages = resolveDOMStorages(origin, args.type, targetManager, primaryPageTarget, storageKey);
      if (storages.length > 0) {
        allStoragesMap[origin] = storages;
        totalStoragesCount += storages.length;
      }
    }
    if (totalStoragesCount === 0) {
      return { error: "No matching storage partitions found." };
    }
    if (options?.approved !== true) {
      const keyString = args.keys.map((k) => `\`${k}\``).join(", ");
      const targetsDesc = Object.keys(allStoragesMap).join(", ");
      return {
        requiresApproval: true,
        description: lockedString11(`The AI wants to access the value(s) of ${args.type} keys ${keyString} on ${targetsDesc}.`)
      };
    }
    const storageValuesByOrigin = {};
    await Promise.all(targetOrigins.map(async (origin) => {
      const storages = allStoragesMap[origin] || [];
      const itemsResult = [];
      const keyAndItems = await Promise.all(storages.map(async (storage) => {
        const items = await storage.getItems().catch(() => null);
        return { storageKey: storage.storageKey, items };
      }));
      for (const { storageKey: partitionKey, items } of keyAndItems) {
        if (!items || !partitionKey) {
          continue;
        }
        const itemMap = /* @__PURE__ */ new Map();
        for (const [key, value] of items) {
          itemMap.set(key, value);
        }
        const storageValues = {};
        for (const key of args.keys) {
          const value = itemMap.get(key);
          if (value === void 0) {
            continue;
          }
          const truncatedValue = value.length > MAX_NUM_CHAR_LENGTH ? value.substring(0, MAX_NUM_CHAR_LENGTH) + "... <truncated>" : value;
          storageValues[key] = truncatedValue;
        }
        itemsResult.push({ storageKey: partitionKey, values: storageValues });
      }
      storageValuesByOrigin[origin] = { items: itemsResult };
    }));
    return { result: { storageValuesByOrigin } };
  }
};

// ../../front_end/models/ai_assistance/tools/GetStyles.ts
var GetStyles_exports = {};
__export(GetStyles_exports, {
  GetStylesTool: () => GetStylesTool
});
import * as Host15 from "../../core/host/host.js";
import * as SDK11 from "../../core/sdk/sdk.js";
var GetStylesTool = class {
  name = "getStyles" /* GET_STYLES */;
  description = `Get computed and source styles for one or multiple elements on the inspected page for multiple elements at once by uid.

**CRITICAL** An element uid is a number, not a selector.
**CRITICAL** Use selectors to refer to elements in the text output. Do not use uids.
**CRITICAL** Always provide the explanation argument to explain what and why you query.
**CRITICAL** You MUST provide a specific list of CSS property names. Do not use generic values like "all" or "*".`;
  parameters = {
    type: Host15.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: false,
    properties: {
      explanation: {
        type: Host15.AidaClient.ParametersTypes.STRING,
        description: "Explain why you want to get styles",
        nullable: false
      },
      elements: {
        type: Host15.AidaClient.ParametersTypes.ARRAY,
        description: "A list of element uids to get data for. These are numbers, not selectors.",
        items: { type: Host15.AidaClient.ParametersTypes.INTEGER, description: "An element uid." },
        nullable: false
      },
      styleProperties: {
        type: Host15.AidaClient.ParametersTypes.ARRAY,
        description: 'One or more specific CSS style property names to fetch. Generic values like "all" or "*" are not supported.',
        nullable: false,
        items: {
          type: Host15.AidaClient.ParametersTypes.STRING,
          description: "A CSS style property name to retrieve. For example, 'background-color'."
        }
      }
    },
    required: ["explanation", "elements", "styleProperties"]
  };
  displayInfoFromArgs(params) {
    return {
      title: "Reading computed and source styles",
      thought: params.explanation,
      action: `getStyles(${JSON.stringify(params.elements)}, ${JSON.stringify(params.styleProperties)})`
    };
  }
  async handler(params, context, _options) {
    const widgets = [];
    const result = {};
    const target = context.getTarget();
    if (!target) {
      return { error: "Error: Could not find the inspected page." };
    }
    const establishedOrigin = context.getEstablishedOrigin();
    if (!establishedOrigin) {
      return { error: "Error: Origin lock is not established." };
    }
    for (const uid of params.elements) {
      result[uid] = { computed: {}, authored: {} };
      const node = new SDK11.DOMModel.DeferredDOMNode(target, uid);
      const resolved = await node.resolvePromise();
      if (!resolved) {
        return { error: "Error: Could not find the element with uid=" + uid };
      }
      const newContext = new DOMNodeContext(resolved);
      if (!newContext.isOriginAllowed(establishedOrigin)) {
        return { error: "Error: Node does not belong to the current origin." };
      }
      const styles = await resolved.domModel().cssModel().getComputedStyle(resolved.id);
      if (!styles) {
        return { error: "Error: Could not get computed styles." };
      }
      const matchedStyles = await resolved.domModel().cssModel().getMatchedStyles(resolved.id);
      if (!matchedStyles) {
        return { error: "Error: Could not get authored styles." };
      }
      widgets.push({
        name: "COMPUTED_STYLES",
        data: {
          computedStyles: styles,
          backendNodeId: node.backendNodeId(),
          matchedCascade: matchedStyles,
          properties: params.styleProperties
        }
      });
      for (const prop of params.styleProperties) {
        result[uid].computed[prop] = styles.get(prop);
      }
      for (const style of matchedStyles.nodeStyles()) {
        for (const property of style.allProperties()) {
          if (!params.styleProperties.includes(property.name)) {
            continue;
          }
          const state = matchedStyles.propertyState(property);
          if (state === SDK11.CSSMatchedStyles.PropertyState.ACTIVE) {
            result[uid].authored[property.name] = property.value;
          }
        }
      }
    }
    return {
      result: JSON.stringify(result, null, 2),
      widgets
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetTraceEventByKey.ts
var GetTraceEventByKey_exports = {};
__export(GetTraceEventByKey_exports, {
  GetTraceEventByKeyTool: () => GetTraceEventByKeyTool
});
import * as Host16 from "../../core/host/host.js";
import * as i18n26 from "../../core/i18n/i18n.js";
var UIStringsNotTranslate9 = {
  lookingAtTraceEvent: "Looking at trace event"
};
var lockedString12 = i18n26.i18n.lockedString;
var GetTraceEventByKeyTool = class {
  name = "getTraceEventByKey" /* GET_TRACE_EVENT_BY_KEY */;
  description = "Get details for a specific trace event by its event key.";
  parameters = {
    type: Host16.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for looking up a trace event.",
    nullable: false,
    properties: {
      eventKey: {
        type: Host16.AidaClient.ParametersTypes.STRING,
        description: "The key of the event to look up.",
        nullable: false
      }
    },
    required: ["eventKey"]
  };
  displayInfoFromArgs(params) {
    return {
      title: lockedString12(UIStringsNotTranslate9.lookingAtTraceEvent),
      action: `getTraceEventByKey('${params.eventKey}')`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    const focus = performanceTraceContext.getItem();
    const event = focus.lookupEvent(params.eventKey);
    if (!event) {
      return { error: `Could not find event with key "${params.eventKey}".` };
    }
    const details = formatEventForAI(event);
    return {
      result: details,
      widgets: [{
        name: "TIMELINE_EVENT_SUMMARY",
        data: {
          event,
          parsedTrace: focus.parsedTrace
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetTraceMainThreadSummary.ts
var GetTraceMainThreadSummary_exports = {};
__export(GetTraceMainThreadSummary_exports, {
  GetTraceMainThreadSummaryTool: () => GetTraceMainThreadSummaryTool
});
import * as Host17 from "../../core/host/host.js";
import * as i18n28 from "../../core/i18n/i18n.js";
var UIStringsNotTranslate10 = {
  mainThreadActivity: "Main thread activity"
};
var lockedString13 = i18n28.i18n.lockedString;
var GetTraceMainThreadSummaryTool = class {
  name = "getTraceMainThreadSummary" /* GET_TRACE_MAIN_THREAD_SUMMARY */;
  description = "Returns a focused, detailed summary of the main thread for a predefined labeled period.";
  parameters = {
    type: Host17.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for looking up a main thread summary.",
    nullable: false,
    properties: {
      label: {
        type: Host17.AidaClient.ParametersTypes.STRING,
        description: "The label of the period to investigate (e.g., 'LCPBreakdown', 'CLSCulprits', 'nav-to-lcp').",
        nullable: false
      }
    },
    required: ["label"]
  };
  displayInfoFromArgs(params) {
    return {
      title: `${lockedString13(UIStringsNotTranslate10.mainThreadActivity)}: ${params.label}`,
      action: `getTraceMainThreadSummary('${params.label}')`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    const focus = performanceTraceContext.getItem();
    const bounds = performanceTraceContext.getBoundsForLabel(params.label);
    if (!bounds) {
      return { error: `Invalid label: ${params.label}` };
    }
    const formatter = performanceTraceContext.createFormatter();
    const summary = await formatter.formatMainThreadTrackSummary(bounds);
    if (summary.length > MAX_FUNCTION_RESULT_BYTE_LENGTH) {
      return {
        error: "getTraceMainThreadSummary response is too large. Try investigating using other functions, or a more narrow bounds"
      };
    }
    return {
      result: summary,
      widgets: [
        {
          name: "TIMELINE_RANGE_SUMMARY",
          data: {
            parsedTrace: focus.parsedTrace,
            bounds,
            track: "main"
          }
        },
        {
          name: "BOTTOM_UP_TREE",
          data: {
            bounds,
            parsedTrace: focus.parsedTrace
          }
        }
      ]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/GetTraceNetworkSummary.ts
var GetTraceNetworkSummary_exports = {};
__export(GetTraceNetworkSummary_exports, {
  GetTraceNetworkSummaryTool: () => GetTraceNetworkSummaryTool
});
import * as Host18 from "../../core/host/host.js";
import * as i18n30 from "../../core/i18n/i18n.js";
var UIStringsNotTranslate11 = {
  networkActivitySummary: "Network activity summary"
};
var lockedString14 = i18n30.i18n.lockedString;
var GetTraceNetworkSummaryTool = class {
  name = "getTraceNetworkSummary" /* GET_TRACE_NETWORK_SUMMARY */;
  description = "Returns a summary of the network requests for the given bounds.";
  parameters = {
    type: Host18.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for looking up a network track summary.",
    nullable: false,
    properties: {
      min: {
        type: Host18.AidaClient.ParametersTypes.INTEGER,
        description: "The minimum time of the bounds, in microseconds.",
        nullable: true
      },
      max: {
        type: Host18.AidaClient.ParametersTypes.INTEGER,
        description: "The maximum time of the bounds, in microseconds.",
        nullable: true
      }
    },
    required: []
  };
  displayInfoFromArgs(params) {
    const parts = [];
    if (params.min !== void 0) {
      parts.push(`min: ${params.min}`);
    }
    if (params.max !== void 0) {
      parts.push(`max: ${params.max}`);
    }
    return {
      title: lockedString14(UIStringsNotTranslate11.networkActivitySummary),
      action: `getTraceNetworkSummary({${parts.join(", ")}})`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    const focus = performanceTraceContext.getItem();
    const bounds = performanceTraceContext.createBounds(params.min, params.max);
    if (!bounds) {
      return { error: "Invalid bounds." };
    }
    const formatter = performanceTraceContext.createFormatter();
    const summary = formatter.formatNetworkTrackSummary(bounds);
    if (summary.length > MAX_FUNCTION_RESULT_BYTE_LENGTH) {
      return {
        error: "getTraceNetworkSummary response is too large. Try investigating using other functions, or a more narrow bounds"
      };
    }
    return {
      result: summary,
      widgets: [{
        name: "NETWORK_TRACK",
        data: {
          parsedTrace: focus.parsedTrace,
          bounds
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/ListCookies.ts
var ListCookies_exports = {};
__export(ListCookies_exports, {
  ListCookiesTool: () => ListCookiesTool
});
import * as Common12 from "../../core/common/common.js";
import * as Host19 from "../../core/host/host.js";
import * as i18n32 from "../../core/i18n/i18n.js";
import * as SDK13 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/tools/CookieUtils.ts
var CookieUtils_exports = {};
__export(CookieUtils_exports, {
  findFrameForOrigin: () => findFrameForOrigin,
  getCookiesForOrigin: () => getCookiesForOrigin
});
import * as SDK12 from "../../core/sdk/sdk.js";
function findFrameForOrigin(origin, targetManager, primaryPageTarget) {
  const targetOrigin = extractContextOrigin(origin);
  for (const frame of SDK12.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
    if (frame.resourceTreeModel().target().outermostTarget() !== primaryPageTarget) {
      continue;
    }
    if (frame.securityOrigin && areOriginsEquivalent(frame.securityOrigin, targetOrigin)) {
      return frame;
    }
  }
  return null;
}
async function getCookiesForOrigin(target, origin) {
  const cookieModel = target.model(SDK12.CookieModel.CookieModel);
  if (!cookieModel) {
    return null;
  }
  const allCookies = await cookieModel.getCookiesForDomain(origin, true).catch(() => null);
  if (!allCookies) {
    return null;
  }
  return allCookies.filter((cookie) => !cookie.httpOnly() && cookie.matchesSecurityOrigin(origin));
}

// ../../front_end/models/ai_assistance/tools/ListCookies.ts
var lockedString15 = i18n32.i18n.lockedString;
var ListCookiesTool = class {
  name = "listCookies" /* LIST_COOKIES */;
  description = "Lists all cookies for requested origins, strictly excluding their values.";
  annotations = ["redact-from-history" /* REDACT_FROM_HISTORY */];
  parameters = {
    type: Host19.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: false,
    properties: {
      origins: {
        type: Host19.AidaClient.ParametersTypes.ARRAY,
        description: "List of origins to list cookies for.",
        items: { type: Host19.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
        nullable: false
      }
    },
    required: ["origins"]
  };
  displayInfoFromArgs(args) {
    return {
      title: lockedString15("Reading cookies"),
      action: `listCookies(${JSON.stringify(args.origins)})`
    };
  }
  async handler(args, context) {
    context.disableLogging();
    const targetManager = SDK13.TargetManager.TargetManager.instance();
    const primaryPageTarget = targetManager.primaryPageTarget();
    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    if (!primaryPageTarget) {
      return { error: "No origin available or not allowed." };
    }
    const pageOrigin = Common12.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL());
    if (!pageOrigin || !areOriginsEquivalent(pageOrigin, allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    const validOrigins = args.origins.map((origin) => extractContextOrigin(origin)).filter((origin) => areOriginsEquivalent(origin, allowedOrigin));
    const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
    if (targetOrigins.length === 0) {
      return { error: "No valid origins found." };
    }
    const cookieNamesByOrigin = {};
    await Promise.all(targetOrigins.map(async (origin) => {
      const frame = findFrameForOrigin(origin, targetManager, primaryPageTarget);
      if (!frame) {
        cookieNamesByOrigin[origin] = { error: "Frame not found or origin disallowed" };
        return;
      }
      const target = frame.resourceTreeModel().target();
      const cookies = await getCookiesForOrigin(target, origin);
      const uniqueNames = cookies ? Array.from(new Set(cookies.map((c) => c.name()))) : [];
      cookieNamesByOrigin[origin] = { cookies: uniqueNames };
    }));
    return { result: { cookieNamesByOrigin } };
  }
};

// ../../front_end/models/ai_assistance/tools/ListNetworkRequests.ts
var ListNetworkRequests_exports = {};
__export(ListNetworkRequests_exports, {
  ListNetworkRequestsTool: () => ListNetworkRequestsTool
});
import * as Host20 from "../../core/host/host.js";
import * as i18n34 from "../../core/i18n/i18n.js";
import * as Logs5 from "../logs/logs.js";
var UIStringsNotTranslate12 = {
  listingNetworkRequests: "Listing network requests"
};
var lockedString16 = i18n34.i18n.lockedString;
var ListNetworkRequestsTool = class {
  name = "listNetworkRequests" /* LIST_NETWORK_REQUESTS */;
  description = "Gives a list of network requests including URL, status code, and duration.";
  #networkLog;
  constructor(networkLog) {
    this.#networkLog = networkLog;
  }
  parameters = {
    type: Host20.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: true,
    required: [],
    properties: {}
  };
  displayInfoFromArgs() {
    return {
      title: lockedString16(UIStringsNotTranslate12.listingNetworkRequests),
      action: "listNetworkRequests()"
    };
  }
  /**
   * Handles the request to list network requests.
   * Returns requests matching the conversation's established origin, if set.
   */
  async handler(_params, context) {
    const requests = [];
    const origin = context.getEstablishedOrigin();
    if (origin && isOpaqueOrigin(origin)) {
      return {
        error: "Opaque origin not allowed"
      };
    }
    const networkLog = this.#networkLog ?? Logs5.NetworkLog.NetworkLog.instance();
    let hasCrossOriginRequest = false;
    const requestsToShow = [];
    for (const request of networkLog.requests()) {
      const requestOrigin = getRequestContextOrigin(request);
      if (origin && requestOrigin !== origin) {
        hasCrossOriginRequest = true;
        continue;
      }
      requests.push({
        id: request.requestId(),
        url: request.url(),
        statusCode: request.statusCode,
        duration: seconds(request.duration),
        transferSize: formatBytesToKb(request.transferSize)
      });
      requestsToShow.push(request);
    }
    if (requests.length === 0) {
      return {
        // If there were requests but they were filtered out due to the origin lock,
        // we ask the user to start a new chat so they can select a request from the other origin.
        error: hasCrossOriginRequest ? `No requests showing with origin ${origin}. Tell the user to start a new chat` : "No requests recorded by DevTools"
      };
    }
    return {
      result: JSON.stringify(requests),
      widgets: [{
        name: "NETWORK_REQUESTS_LIST",
        data: {
          requests: requestsToShow
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/ListPageOrigins.ts
var ListPageOrigins_exports = {};
__export(ListPageOrigins_exports, {
  ListPageOriginsTool: () => ListPageOriginsTool
});
import * as Common13 from "../../core/common/common.js";
import * as Host21 from "../../core/host/host.js";
import * as i18n36 from "../../core/i18n/i18n.js";
import * as SDK14 from "../../core/sdk/sdk.js";
var lockedString17 = i18n36.i18n.lockedString;
var ListPageOriginsTool = class {
  name = "listPageOrigins" /* LIST_PAGE_ORIGINS */;
  description = "Lists all active, non-empty frame origins loaded by the page. Use this first when generic category context is active to discover all page origins, then pass them to listCookies or listStorageKeys, unless the user's explicit request hints at focusing only on the primary page.";
  parameters = {
    type: Host21.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: false,
    properties: {},
    required: []
  };
  displayInfoFromArgs() {
    return {
      title: lockedString17("Listing page origins"),
      action: "listPageOrigins()"
    };
  }
  /**
   * Retrieves the set of unique frame origins loaded within the primary page's target tree.
   *
   * To prevent data leakage across different tabs/windows, this tool:
   * 1. Restricts the frame search to those belonging to the `primaryPageTarget`'s outermost target tree.
   * 2. Filters out any origins that are not equivalent to the established allowed origin.
   *    Note: Under site isolation, frames may be hosted on different sub-targets or processes,
   *    so we check `frame.securityOrigin` directly instead of the frame's target origin.
   */
  async handler(_args, context) {
    const targetManager = SDK14.TargetManager.TargetManager.instance();
    const primaryPageTarget = targetManager.primaryPageTarget();
    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    const pageOrigin = primaryPageTarget ? Common13.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL()) : "";
    const isAllowed = pageOrigin !== "" && areOriginsEquivalent(pageOrigin, allowedOrigin);
    if (!isAllowed) {
      return { error: "No origin available or not allowed." };
    }
    const origins = /* @__PURE__ */ new Set();
    for (const frame of SDK14.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
      if (frame.resourceTreeModel().target().outermostTarget() !== primaryPageTarget) {
        continue;
      }
      const origin = frame.securityOrigin;
      if (!origin || !areOriginsEquivalent(origin, allowedOrigin)) {
        continue;
      }
      if (origins.has(origin)) {
        continue;
      }
      origins.add(origin);
    }
    return { result: { origins: Array.from(origins) } };
  }
};

// ../../front_end/models/ai_assistance/tools/ListStorageKeys.ts
var ListStorageKeys_exports = {};
__export(ListStorageKeys_exports, {
  ListStorageKeysTool: () => ListStorageKeysTool
});
import * as Common14 from "../../core/common/common.js";
import * as Host22 from "../../core/host/host.js";
import * as i18n38 from "../../core/i18n/i18n.js";
import * as SDK15 from "../../core/sdk/sdk.js";
var lockedString18 = i18n38.i18n.lockedString;
var ListStorageKeysTool = class {
  name = "listStorageKeys" /* LIST_STORAGE_KEYS */;
  description = "Lists all keys for a given storage type for requested origins. Returns keys grouped by storage partition under their origin.";
  annotations = ["redact-from-history" /* REDACT_FROM_HISTORY */];
  parameters = {
    type: Host22.AidaClient.ParametersTypes.OBJECT,
    description: "",
    nullable: false,
    properties: {
      type: {
        type: Host22.AidaClient.ParametersTypes.STRING,
        description: "Storage type: localStorage or sessionStorage",
        nullable: false
      },
      origins: {
        type: Host22.AidaClient.ParametersTypes.ARRAY,
        description: "List of origins to list keys for.",
        items: { type: Host22.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
        nullable: false
      },
      storageKey: {
        type: Host22.AidaClient.ParametersTypes.STRING,
        description: "Optional. Specific storageKey to list keys for. Only applies if single origin is provided.",
        nullable: true
      }
    },
    required: ["type", "origins"]
  };
  displayInfoFromArgs(args) {
    return {
      title: lockedString18("Reading storage keys"),
      action: `listStorageKeys('${args.type}', ${JSON.stringify(args.origins)})`
    };
  }
  async handler(args, context) {
    context.disableLogging();
    const targetManager = SDK15.TargetManager.TargetManager.instance();
    const primaryPageTarget = targetManager.primaryPageTarget();
    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    if (!primaryPageTarget) {
      return { error: "No origin available or not allowed." };
    }
    const pageOrigin = Common14.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL());
    if (!pageOrigin || !areOriginsEquivalent(pageOrigin, allowedOrigin)) {
      return { error: "No origin available or not allowed." };
    }
    const rawList = args.origins && args.origins.length > 0 ? args.origins : [allowedOrigin];
    const validOrigins = rawList.map((origin) => extractContextOrigin(origin)).filter((origin) => areOriginsEquivalent(origin, allowedOrigin));
    const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
    if (targetOrigins.length === 0) {
      return { error: "No valid origins found." };
    }
    const storageKey = targetOrigins.length === 1 && args.storageKey ? args.storageKey : void 0;
    const storageKeysByOrigin = {};
    await Promise.all(targetOrigins.map(async (origin) => {
      const storages = resolveDOMStorages(origin, args.type, targetManager, primaryPageTarget, storageKey);
      const keyAndItems = await Promise.all(storages.map(async (storage) => {
        const items = await storage.getItems().catch(() => null);
        return { storageKey: storage.storageKey, items };
      }));
      const partitions = [];
      for (const { storageKey: partKey, items } of keyAndItems) {
        if (!items || !partKey) {
          continue;
        }
        const keys = items.map(([key]) => key);
        if (keys.length > 0) {
          partitions.push({ storageKey: partKey, keys });
        }
      }
      storageKeysByOrigin[origin] = { partitions };
    }));
    return { result: { storageKeysByOrigin } };
  }
};

// ../../front_end/models/ai_assistance/tools/RecordPerformanceTrace.ts
var RecordPerformanceTrace_exports = {};
__export(RecordPerformanceTrace_exports, {
  RecordPerformanceTraceTool: () => RecordPerformanceTraceTool
});
import * as Host23 from "../../core/host/host.js";
import * as i18n40 from "../../core/i18n/i18n.js";

// ../../front_end/models/ai_assistance/contexts/PerformanceTraceContext.ts
var PerformanceTraceContext_exports = {};
__export(PerformanceTraceContext_exports, {
  PerformanceTraceContext: () => PerformanceTraceContext
});
import * as Common15 from "../../core/common/common.js";
import * as SDK16 from "../../core/sdk/sdk.js";
import * as Tracing2 from "../../services/tracing/tracing.js";
import * as Bindings2 from "../bindings/bindings.js";
import * as SourceMapScopes from "../source_map_scopes/source_map_scopes.js";
import * as Trace8 from "../trace/trace.js";

// ../../front_end/models/ai_assistance/performance/AIContext.ts
var AIContext_exports = {};
__export(AIContext_exports, {
  AgentFocus: () => AgentFocus,
  getPerformanceAgentFocusFromModel: () => getPerformanceAgentFocusFromModel
});
import * as Trace7 from "../trace/trace.js";
function getPrimaryInsightSet(insights) {
  const insightSets = Array.from(insights.values());
  if (insightSets.length === 0) {
    return null;
  }
  if (insightSets.length === 1) {
    return insightSets[0];
  }
  return insightSets.filter((set) => set.navigation).at(0) ?? insightSets.at(0) ?? null;
}
var AgentFocus = class _AgentFocus {
  static fromParsedTrace(parsedTrace) {
    if (!parsedTrace.insights) {
      throw new Error("missing insights");
    }
    return new _AgentFocus({
      parsedTrace,
      event: null,
      callTree: null,
      insight: null
    });
  }
  static fromInsight(parsedTrace, insight) {
    if (!parsedTrace.insights) {
      throw new Error("missing insights");
    }
    return new _AgentFocus({
      parsedTrace,
      event: null,
      callTree: null,
      insight
    });
  }
  static fromEvent(parsedTrace, event) {
    if (!parsedTrace.insights) {
      throw new Error("missing insights");
    }
    const result = _AgentFocus.#getCallTreeOrEvent(parsedTrace, event);
    return new _AgentFocus({ parsedTrace, event: result.event, callTree: result.callTree, insight: null });
  }
  static fromCallTree(callTree) {
    return new _AgentFocus({ parsedTrace: callTree.parsedTrace, event: null, callTree, insight: null });
  }
  #data;
  #primaryInsightSet;
  eventsSerializer = new Trace7.EventsSerializer.EventsSerializer();
  constructor(data) {
    if (!data.parsedTrace.insights) {
      throw new Error("missing insights");
    }
    this.#data = data;
    this.#primaryInsightSet = getPrimaryInsightSet(data.parsedTrace.insights);
  }
  get parsedTrace() {
    return this.#data.parsedTrace;
  }
  get primaryInsightSet() {
    return this.#primaryInsightSet;
  }
  /** Note: at most one of event or callTree is non-null. */
  get event() {
    return this.#data.event;
  }
  /** Note: at most one of event or callTree is non-null. */
  get callTree() {
    return this.#data.callTree;
  }
  get insight() {
    return this.#data.insight;
  }
  withInsight(insight) {
    const focus = new _AgentFocus(this.#data);
    focus.#data.insight = insight;
    return focus;
  }
  withEvent(event) {
    const focus = new _AgentFocus(this.#data);
    const result = _AgentFocus.#getCallTreeOrEvent(this.#data.parsedTrace, event);
    focus.#data.callTree = result.callTree;
    focus.#data.event = result.event;
    return focus;
  }
  lookupEvent(key) {
    try {
      return this.eventsSerializer.eventForKey(key, this.#data.parsedTrace) ?? null;
    } catch {
      return null;
    }
  }
  /**
   * If an event is a call tree, this returns that call tree and a null event.
   * If not a call tree, this only returns a non-null event if the event is a network
   * request.
   * This is an arbitrary limitation – it should be removed, but first we need to
   * improve the agent's knowledge of events that are not main-thread or network
   * events.
   */
  static #getCallTreeOrEvent(parsedTrace, event) {
    const callTree = event && AICallTree.fromEvent(event, parsedTrace);
    if (callTree) {
      return { callTree, event: null };
    }
    if (event && Trace7.Types.Events.isSyntheticNetworkRequest(event)) {
      return { callTree: null, event };
    }
    return { callTree: null, event: null };
  }
};
function getPerformanceAgentFocusFromModel(model) {
  const parsedTrace = model.parsedTrace();
  if (!parsedTrace) {
    return null;
  }
  return AgentFocus.fromParsedTrace(parsedTrace);
}

// ../../front_end/models/ai_assistance/contexts/PerformanceTraceContext.ts
var PerformanceTraceContext = class _PerformanceTraceContext extends ConversationContext {
  static fromParsedTrace(parsedTrace, targetManager = SDK16.TargetManager.TargetManager.instance(), freshRecordingTracker = Tracing2.FreshRecording.Tracker.instance(), debuggerWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
  )) {
    return new _PerformanceTraceContext(
      AgentFocus.fromParsedTrace(parsedTrace),
      targetManager,
      freshRecordingTracker,
      debuggerWorkspaceBinding
    );
  }
  static fromInsight(parsedTrace, insight, targetManager = SDK16.TargetManager.TargetManager.instance(), freshRecordingTracker = Tracing2.FreshRecording.Tracker.instance(), debuggerWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
  )) {
    return new _PerformanceTraceContext(
      AgentFocus.fromInsight(parsedTrace, insight),
      targetManager,
      freshRecordingTracker,
      debuggerWorkspaceBinding
    );
  }
  static fromCallTree(callTree, targetManager = SDK16.TargetManager.TargetManager.instance(), freshRecordingTracker = Tracing2.FreshRecording.Tracker.instance(), debuggerWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
  )) {
    return new _PerformanceTraceContext(
      AgentFocus.fromCallTree(callTree),
      targetManager,
      freshRecordingTracker,
      debuggerWorkspaceBinding
    );
  }
  #focus;
  #targetManager;
  #freshRecordingTracker;
  #debuggerWorkspaceBinding;
  constructor(focus, targetManager = SDK16.TargetManager.TargetManager.instance(), freshRecordingTracker = Tracing2.FreshRecording.Tracker.instance(), debuggerWorkspaceBinding = (
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
  )) {
    super();
    this.#focus = focus;
    this.#targetManager = targetManager;
    this.#freshRecordingTracker = freshRecordingTracker;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
  }
  /**
   * Returns a PerformanceTraceFormatter configured to resolve function
   * code from source maps using the active page target.
   *
   * Note: Function code resolution from source maps is only supported for fresh
   * recordings (recorded in the current session on the active target page). For
   * imported traces, it returns null to prevent mismatched source resolution.
   */
  createFormatter() {
    const focus = this.#focus;
    const target = this.#targetManager.primaryPageTarget();
    const formatter = new PerformanceTraceFormatter(focus);
    const isFresh = this.#freshRecordingTracker.recordingIsFresh(focus.parsedTrace);
    formatter.resolveFunctionCode = async (url, line, column) => {
      if (!target || !isFresh) {
        return null;
      }
      return await SourceMapScopes.FunctionCodeResolver.getFunctionCodeFromLocation(
        target,
        url,
        line,
        column,
        this.#debuggerWorkspaceBinding,
        { contextLength: 200, contextLineLength: 5, appendProfileData: true }
      );
    };
    return formatter;
  }
  getURL() {
    const url = this.#focus.parsedTrace.data.Meta.mainFrameURL;
    try {
      new URL(url);
      return url;
    } catch {
      const { min, max } = this.#focus.parsedTrace.data.Meta.traceBounds;
      return `trace-${min}-${max}`;
    }
  }
  /**
   * Returns the origin for a performance trace in the AI context.
   *
   * To prevent cross-origin prompt injection attacks, imported traces
   * are isolated from live pages. We assign them a virtual origin
   * (`imported-trace://${domain}`) so they do not share the origin of live pages
   * (e.g., `https://${domain}`). This forces a conversation reset when transitioning
   * between imported trace data and live pages.
   */
  getOrigin() {
    const parsedTrace = this.#focus.parsedTrace;
    const url = this.getURL();
    const origin = extractContextOrigin(url);
    const isFresh = this.#freshRecordingTracker.recordingIsFresh(parsedTrace);
    if (!isFresh) {
      const parsed = Common15.ParsedURL.ParsedURL.fromString(origin);
      return `imported-trace://${parsed ? parsed.domain() : origin}`;
    }
    return origin;
  }
  getItem() {
    return this.#focus;
  }
  getTitle() {
    const focus = this.#focus;
    let url = focus.primaryInsightSet?.url;
    if (!url) {
      url = new URL(focus.parsedTrace.data.Meta.mainFrameURL);
    }
    const parts = [`Trace: ${url.hostname}`];
    if (focus.insight) {
      parts.push(focus.insight.title);
    }
    if (focus.event) {
      parts.push(Trace8.Name.forEntry(focus.event));
    }
    if (focus.callTree) {
      const node = focus.callTree.selectedNode ?? focus.callTree.rootNode;
      parts.push(Trace8.Name.forEntry(node.event));
    }
    return parts.join(" \u2013 ");
  }
  /**
   * Presents the default suggestions that are shown when the user first clicks
   * "Ask AI".
   */
  async getSuggestions() {
    const focus = this.#focus;
    if (focus.callTree) {
      return [
        { title: "What's the purpose of this work?", jslogContext: "performance-default" },
        { title: "Where is time being spent?", jslogContext: "performance-default" },
        { title: "How can I optimize this?", jslogContext: "performance-default" }
      ];
    }
    if (focus.insight) {
      return new PerformanceInsightFormatter(focus, focus.insight).getSuggestions();
    }
    const suggestions = [{ title: "What performance issues exist with my page?", jslogContext: "performance-default" }];
    const insightSet = focus.primaryInsightSet;
    if (insightSet) {
      const lcp = Trace8.Insights.Common.getLCP(insightSet);
      const cls = Trace8.Insights.Common.getCLS(insightSet);
      const inp = Trace8.Insights.Common.getINP(insightSet);
      const ModelHandlers = Trace8.Handlers.ModelHandlers;
      const GOOD = Trace8.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD;
      const poorMetrics = /* @__PURE__ */ new Set();
      if (lcp && ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(lcp.value) !== GOOD) {
        suggestions.push({ title: "How can I improve LCP?", jslogContext: "performance-default" });
        poorMetrics.add(Trace8.Insights.Types.InsightKeys.LCP_BREAKDOWN);
        poorMetrics.add(Trace8.Insights.Types.InsightKeys.LCP_DISCOVERY);
      }
      if (inp && ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(inp.value) !== GOOD) {
        suggestions.push({ title: "How can I improve INP?", jslogContext: "performance-default" });
        poorMetrics.add(Trace8.Insights.Types.InsightKeys.INP_BREAKDOWN);
      }
      if (cls && ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(cls.value) !== GOOD) {
        suggestions.push({ title: "How can I improve CLS?", jslogContext: "performance-default" });
        poorMetrics.add(Trace8.Insights.Types.InsightKeys.CLS_CULPRITS);
      }
      const additionalSuggestionsRequired = Math.max(0, 4 - suggestions.length);
      if (additionalSuggestionsRequired > 0) {
        const failingInsightSuggestions = Object.values(insightSet.model).filter((model) => {
          return model.state !== "pass" && Trace8.Insights.Common.isInsightKey(model.insightKey) && !poorMetrics.has(model.insightKey);
        }).map((model) => new PerformanceInsightFormatter(focus, model).getSuggestions().at(-1)).filter((suggestion) => !!suggestion).slice(0, additionalSuggestionsRequired);
        suggestions.push(...failingInsightSuggestions);
      }
    }
    return suggestions;
  }
  /**
   * Returns a markdown-formatted payload containing the trace data facts
   * (summary, critical requests, activities, third-party code, and longest tasks)
   * to be included directly in the LLM's prompt.
   *
   * Invariant: The content returned here must align with the user-facing details
   * returned by `getUserFacingDetails()` to ensure complete data transparency.
   */
  async getPromptDetails() {
    const formatter = this.createFormatter();
    const details = [];
    const traceSummary = formatter.formatTraceSummary();
    if (traceSummary) {
      details.push(`Trace summary:
${traceSummary}`);
    }
    const criticalRequests = await formatter.formatCriticalRequests();
    if (criticalRequests) {
      details.push(criticalRequests);
    }
    const mainThreadBottomUp = await formatter.formatMainThreadBottomUpSummary();
    if (mainThreadBottomUp) {
      details.push(mainThreadBottomUp);
    }
    const thirdPartySummary = await formatter.formatThirdPartySummary();
    if (thirdPartySummary) {
      details.push(thirdPartySummary);
    }
    const longestTasks = await formatter.formatLongestTasks();
    if (longestTasks) {
      details.push(longestTasks);
    }
    return details.length > 0 ? details.join("\n\n") : null;
  }
  /**
   * Returns structured trace context details to be displayed to the user in the UI
   * (under the "Analyzing data" disclosure accordion).
   *
   * Invariant: The details shown here must correspond exactly to the data sent to
   * the LLM prompt via `getPromptDetails()`.
   */
  async getUserFacingDetails() {
    const formatter = this.createFormatter();
    const details = [];
    const traceSummary = formatter.formatTraceSummary();
    if (traceSummary) {
      details.push({
        title: "Trace summary",
        text: traceSummary
      });
    }
    const criticalRequests = await formatter.formatCriticalRequests();
    if (criticalRequests) {
      details.push({
        title: "Critical requests",
        text: criticalRequests
      });
    }
    const mainThreadBottomUp = await formatter.formatMainThreadBottomUpSummary();
    if (mainThreadBottomUp) {
      details.push({
        title: "Main thread activities",
        text: mainThreadBottomUp
      });
    }
    const thirdPartySummary = await formatter.formatThirdPartySummary();
    if (thirdPartySummary) {
      details.push({
        title: "Third party summary",
        text: thirdPartySummary
      });
    }
    const longestTasks = await formatter.formatLongestTasks();
    if (longestTasks) {
      details.push({
        title: "Longest tasks",
        text: longestTasks
      });
    }
    return details.length > 0 ? details : null;
  }
  /**
   * Returns initial UI widgets to display with the conversation context header
   * depending on the active focus:
   * - Specific task (call tree) -> timeline summary & bottom up tree widgets
   * - Insight -> PERF_INSIGHT widget & Core Web Vitals widget
   * - Whole Trace -> Core Web Vitals widget
   */
  async getWidgets() {
    const widgets = [];
    const focus = this.#focus;
    if (focus.callTree) {
      const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
      if (event) {
        const { startTime, endTime } = Trace8.Helpers.Timing.eventTimingsMicroSeconds(event);
        const bounds = Trace8.Helpers.Timing.traceWindowFromMicroSeconds(startTime, endTime);
        widgets.push({
          name: "TIMELINE_RANGE_SUMMARY",
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
            track: "main"
          }
        });
        widgets.push({
          name: "BOTTOM_UP_TREE",
          data: {
            bounds,
            parsedTrace: focus.parsedTrace
          }
        });
      }
      return widgets;
    }
    if (focus.insight) {
      const insightKey = focus.insight.insightKey;
      if (Trace8.Insights.Common.isInsightKey(insightKey)) {
        widgets.push({
          name: "PERF_INSIGHT",
          data: {
            insight: insightKey,
            insightData: focus.insight
          }
        });
      }
    }
    const primaryInsightSet = focus.primaryInsightSet;
    if (primaryInsightSet) {
      widgets.push({
        name: "CORE_VITALS",
        data: {
          parsedTrace: focus.parsedTrace,
          insightSetKey: primaryInsightSet.id
        }
      });
    }
    return widgets;
  }
  getBoundsForLabel(label) {
    const focus = this.#focus;
    const { parsedTrace } = focus;
    const insightSet = focus.primaryInsightSet;
    if (label === "nav-to-lcp") {
      if (insightSet) {
        const lcp = Trace8.Insights.Common.getLCP(insightSet);
        if (lcp) {
          return Trace8.Helpers.Timing.traceWindowFromMicroSeconds(
            insightSet.bounds.min,
            lcp.event.ts
          );
        }
      }
      return null;
    }
    if (label === "lcp-ttfb") {
      if (insightSet) {
        const subparts = insightSet.model.LCPBreakdown?.subparts;
        if (subparts?.ttfb) {
          return subparts.ttfb;
        }
      }
      return null;
    }
    if (label === "lcp-render-delay") {
      if (insightSet) {
        const subparts = insightSet.model.LCPBreakdown?.subparts;
        if (subparts?.renderDelay) {
          return subparts.renderDelay;
        }
      }
      return null;
    }
    if (label === "trace-bounds") {
      return parsedTrace.data.Meta.traceBounds;
    }
    const insightSetById = parsedTrace.insights?.get(label);
    if (insightSetById) {
      return insightSetById.bounds;
    }
    if (insightSet) {
      const model = getInsightModel(insightSet.model, label);
      if (model) {
        return Trace8.Insights.Common.insightBounds(model, insightSet.bounds);
      }
    }
    for (const is of parsedTrace.insights?.values() ?? []) {
      const model = getInsightModel(is.model, label);
      if (model) {
        return Trace8.Insights.Common.insightBounds(model, is.bounds);
      }
    }
    return null;
  }
  getLabelName(label) {
    return getLabelName(label, this.#focus.parsedTrace);
  }
  createBounds(min, max) {
    const { min: bMin, max: bMax } = this.#focus.parsedTrace.data.Meta.traceBounds;
    const clampedMin = Math.round(Math.max(min ?? bMin, bMin));
    const clampedMax = Math.round(Math.min(max ?? bMax, bMax));
    if (clampedMin > clampedMax) {
      return null;
    }
    return Trace8.Helpers.Timing.traceWindowFromMicroSeconds(
      clampedMin,
      clampedMax
    );
  }
};
var STATIC_LABEL_NAMES = {
  "nav-to-lcp": "navigation to LCP",
  "lcp-ttfb": "LCP to TTFB",
  "lcp-render-delay": "LCP render delay",
  "trace-bounds": "the entire trace",
  NO_NAVIGATION: "the period before the first navigation"
};
function getInsightModel(model, key) {
  if (Object.prototype.hasOwnProperty.call(model, key)) {
    return model[key];
  }
  return void 0;
}
function getLabelName(label, parsedTrace) {
  if (Object.prototype.hasOwnProperty.call(STATIC_LABEL_NAMES, label)) {
    return STATIC_LABEL_NAMES[label];
  }
  const insightSetById = parsedTrace.insights?.get(label);
  if (insightSetById) {
    return `navigation to ${insightSetById.url.href}`;
  }
  for (const insightSet of parsedTrace.insights?.values() ?? []) {
    const model = getInsightModel(insightSet.model, label);
    if (model) {
      return `${model.title} insight`;
    }
  }
  return label;
}

// ../../front_end/models/ai_assistance/tools/RecordPerformanceTrace.ts
var UIStringsNotTranslate13 = {
  recordingPerformanceTrace: "Recording a performance trace"
};
var lockedString19 = i18n40.i18n.lockedString;
var RecordPerformanceTraceTool = class {
  name = "recordPerformanceTrace" /* RECORD_PERFORMANCE_TRACE */;
  description = "Records a new performance trace to measure, analyze, and debug page performance.";
  parameters = {
    type: Host23.AidaClient.ParametersTypes.OBJECT,
    description: "Parameters for recording a performance trace.",
    nullable: false,
    properties: {},
    required: []
  };
  displayInfoFromArgs() {
    return {
      title: lockedString19(UIStringsNotTranslate13.recordingPerformanceTrace),
      action: "recordPerformanceTrace()"
    };
  }
  async handler(_params, capabilities) {
    if (!capabilities.performanceRecordAndReload) {
      return { error: "Performance recording is not available." };
    }
    try {
      const result = await capabilities.performanceRecordAndReload();
      return {
        context: PerformanceTraceContext.fromParsedTrace(result),
        description: "User recorded a performance trace",
        widgets: [{ name: "PERFORMANCE_TRACE", data: { parsedTrace: result } }]
      };
    } catch (err) {
      return { error: `Failed to record performance trace: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// ../../front_end/models/ai_assistance/tools/ResolveDevtoolsNodePath.ts
var ResolveDevtoolsNodePath_exports = {};
__export(ResolveDevtoolsNodePath_exports, {
  ResolveDevtoolsNodePathTool: () => ResolveDevtoolsNodePathTool
});
import * as Host24 from "../../core/host/host.js";
import * as SDK17 from "../../core/sdk/sdk.js";
var ResolveDevtoolsNodePathTool = class {
  name = "resolveDevtoolsNodePath" /* RESOLVE_DEVTOOLS_NODE_PATH */;
  description = "Resolves a DevTools node path to a backend node ID.";
  parameters = {
    type: Host24.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for resolving a DevTools node path to a backend node ID.",
    nullable: false,
    properties: {
      explanation: {
        type: Host24.AidaClient.ParametersTypes.STRING,
        description: "Reason for requesting this resolution.",
        nullable: false
      },
      path: {
        type: Host24.AidaClient.ParametersTypes.STRING,
        description: "DevTools node path string.",
        nullable: false
      }
    },
    required: ["explanation", "path"]
  };
  displayInfoFromArgs(params) {
    return {
      title: "Resolving element path",
      thought: params.explanation,
      action: `resolveDevtoolsNodePath('${params.path}')`
    };
  }
  /**
   * Handles the resolution request.
   *
   * It retrieves the node path using the target's DOMModel and verifies
   * that the node's origin matches the established origin lock to prevent
   * access to nodes from other origins.
   */
  async handler(params, context) {
    const establishedOrigin = context.getEstablishedOrigin();
    if (!establishedOrigin) {
      return { error: "Error: Origin lock is not established." };
    }
    const target = context.getTarget();
    const domModel = target?.model(SDK17.DOMModel.DOMModel);
    if (!domModel) {
      return { error: "Error: Inspected target not found." };
    }
    let nodeId;
    try {
      nodeId = await domModel.pushNodeByPathToFrontend(params.path);
    } catch {
    }
    if (!nodeId) {
      return { error: "Error: Could not find node by path." };
    }
    const node = domModel.nodeForId(nodeId);
    if (!node) {
      return { error: "Error: Could not retrieve resolved node." };
    }
    const nodeContext = new DOMNodeContext(node);
    if (!nodeContext.isOriginAllowed(establishedOrigin)) {
      return { error: "Error: Node does not belong to the locked origin." };
    }
    return {
      result: { backendNodeId: node.backendNodeId() }
    };
  }
};

// ../../front_end/models/ai_assistance/tools/RunLighthouse.ts
var RunLighthouse_exports = {};
__export(RunLighthouse_exports, {
  RunLighthouseTool: () => RunLighthouseTool
});
import * as Host25 from "../../core/host/host.js";
var RunLighthouseTool = class {
  name = "runLighthouse" /* RUN_LIGHTHOUSE */;
  description = 'Runs Lighthouse audits on the active page. Supports "navigation" (for full initial page load audits), "snapshot" (for inspecting live in-page modifications without reload), and "timespan" (for interactions).';
  parameters = {
    type: Host25.AidaClient.ParametersTypes.OBJECT,
    description: "Parameters for running Lighthouse audits.",
    nullable: false,
    properties: {
      explanation: {
        type: Host25.AidaClient.ParametersTypes.STRING,
        description: "Reason for running new audits.",
        nullable: false
      },
      category: {
        type: Host25.AidaClient.ParametersTypes.STRING,
        description: 'Lighthouse category. E.g. "accessibility", "performance".',
        nullable: false
      },
      mode: {
        type: Host25.AidaClient.ParametersTypes.STRING,
        description: 'Lighthouse execution mode: "navigation", "snapshot", "timespan". Use "navigation" for initial full audits unless the user requested otherwise or in-page changes are being evaluated. Defaults to "snapshot".',
        nullable: true
      }
    },
    required: ["explanation", "category"]
  };
  displayInfoFromArgs(params) {
    return {
      title: `Running Lighthouse audits: ${params.category} (${params.mode ?? "snapshot"})`,
      thought: params.explanation,
      action: `runLighthouse('${params.category}', '${params.mode ?? "snapshot"}')`
    };
  }
  async handler(params, context) {
    const mode = params.mode ?? "snapshot";
    try {
      const report = await context.runLighthouse({
        mode,
        categoryIds: [params.category],
        isAIControlled: true
      });
      if (!report) {
        return { error: "Error: Failed to record new audits." };
      }
      const audits = new LighthouseFormatter().audits(report, params.category);
      const isSnapshot = mode === "snapshot";
      return {
        result: { audits },
        widgets: [{ name: "LIGHTHOUSE_REPORT", data: { report, snapshotReport: isSnapshot } }]
      };
    } catch (err) {
      return { error: `Error: Failed to record new audits: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// ../../front_end/models/ai_assistance/tools/SelectTraceEventByKey.ts
var SelectTraceEventByKey_exports = {};
__export(SelectTraceEventByKey_exports, {
  SelectTraceEventByKeyTool: () => SelectTraceEventByKeyTool
});
import * as Common16 from "../../core/common/common.js";
import * as Host26 from "../../core/host/host.js";
import * as i18n42 from "../../core/i18n/i18n.js";
import * as SDK18 from "../../core/sdk/sdk.js";
var UIStringsNotTranslate14 = {
  selectingTraceEvent: "Selecting trace event"
};
var lockedString20 = i18n42.i18n.lockedString;
var SelectTraceEventByKeyTool = class {
  name = "selectTraceEventByKey" /* SELECT_TRACE_EVENT_BY_KEY */;
  description = "Selects and reveals a specific event by its key in the Performance panel Flamechart.";
  parameters = {
    type: Host26.AidaClient.ParametersTypes.OBJECT,
    description: "Arguments for selecting a trace event.",
    nullable: false,
    properties: {
      eventKey: {
        type: Host26.AidaClient.ParametersTypes.STRING,
        description: "The key of the event to select.",
        nullable: false
      }
    },
    required: ["eventKey"]
  };
  displayInfoFromArgs(params) {
    return {
      title: lockedString20(UIStringsNotTranslate14.selectingTraceEvent),
      action: `selectTraceEventByKey('${params.eventKey}')`
    };
  }
  async handler(params, capabilities) {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return { error: "Performance trace context is not available." };
    }
    const focus = performanceTraceContext.getItem();
    const event = focus.lookupEvent(params.eventKey);
    if (!event) {
      return { error: `Could not find event with key "${params.eventKey}".` };
    }
    const revealable = new SDK18.TraceObject.RevealableEvent(event);
    try {
      await Common16.Revealer.reveal(revealable);
    } catch {
    }
    return {
      result: "Event selected",
      widgets: [{
        name: "TIMELINE_EVENT_SUMMARY",
        data: {
          event,
          parsedTrace: focus.parsedTrace
        }
      }]
    };
  }
};

// ../../front_end/models/ai_assistance/tools/ToolRegistry.ts
var TOOLS = {
  ["executeJavaScript" /* EXECUTE_JAVASCRIPT */]: new ExecuteJavaScriptTool(),
  ["getStyles" /* GET_STYLES */]: new GetStylesTool(),
  ["listNetworkRequests" /* LIST_NETWORK_REQUESTS */]: new ListNetworkRequestsTool(),
  ["getNetworkRequestDetails" /* GET_NETWORK_REQUEST_DETAILS */]: new GetNetworkRequestDetailsTool(),
  ["getLighthouseAudits" /* GET_LIGHTHOUSE_AUDITS */]: new GetLighthouseAuditsTool(),
  ["resolveDevtoolsNodePath" /* RESOLVE_DEVTOOLS_NODE_PATH */]: new ResolveDevtoolsNodePathTool(),
  ["getElementAccessibilityDetails" /* GET_ELEMENT_ACCESSIBILITY_DETAILS */]: new GetElementAccessibilityDetailsTool(),
  ["recordPerformanceTrace" /* RECORD_PERFORMANCE_TRACE */]: new RecordPerformanceTraceTool(),
  ["listPageOrigins" /* LIST_PAGE_ORIGINS */]: new ListPageOriginsTool(),
  ["listStorageKeys" /* LIST_STORAGE_KEYS */]: new ListStorageKeysTool(),
  ["getStorageValues" /* GET_STORAGE_VALUES */]: new GetStorageValuesTool(),
  ["listCookies" /* LIST_COOKIES */]: new ListCookiesTool(),
  ["getTraceEventByKey" /* GET_TRACE_EVENT_BY_KEY */]: new GetTraceEventByKeyTool(),
  ["selectTraceEventByKey" /* SELECT_TRACE_EVENT_BY_KEY */]: new SelectTraceEventByKeyTool(),
  ["listSources" /* LIST_SOURCES */]: new ListSourcesTool(),
  ["getSourceContent" /* GET_SOURCE_CONTENT */]: new GetSourceContentTool(),
  ["getTraceMainThreadSummary" /* GET_TRACE_MAIN_THREAD_SUMMARY */]: new GetTraceMainThreadSummaryTool(),
  ["getTraceNetworkSummary" /* GET_TRACE_NETWORK_SUMMARY */]: new GetTraceNetworkSummaryTool(),
  ["runLighthouse" /* RUN_LIGHTHOUSE */]: new RunLighthouseTool(),
  ["getDetailedCallTree" /* GET_DETAILED_CALL_TREE */]: new GetDetailedCallTreeTool(),
  ["getFunctionCode" /* GET_FUNCTION_CODE */]: new GetFunctionCodeTool(),
  ["getResourceContent" /* GET_RESOURCE_CONTENT */]: new GetResourceContentTool(),
  ["getInsightDetails" /* GET_INSIGHT_DETAILS */]: new GetInsightDetailsTool()
};
var ToolRegistry = class {
  static get(name) {
    return Object.prototype.hasOwnProperty.call(TOOLS, name) ? TOOLS[name] : void 0;
  }
};

// ../../front_end/models/ai_assistance/agents/AccessibilityAgent.ts
var preamble = `You are an accessibility expert agent integrated into Chrome DevTools.
Your role is to help users understand and fix accessibility issues found in Lighthouse reports.

# Style Guidelines
* **General style**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
* **Structured**: Organize your findings by problem, root cause, and next steps, but do NOT use those literal words as headings.
* **No Internal Identifiers**: NEVER show Lighthouse paths (e.g., "1,HTML,1,BODY...") to the user. Refer to elements by their tag name, classes, or IDs.
* **Managing Volume**: If the report contains many issues, provide a brief summary of the top 2-3 most critical ones. Tell the user that there are more issues and invite them to ask for more details or to explore a specific area.

# Workflow
1. **Identify**: Find the most critical accessibility issues in the Lighthouse report.
2. **Investigate**: For any element identified as failing, you **MUST** call \`getStyles\` or \`getElementAccessibilityDetails\` first to confirm its current state and gather details.
3. **Analyze**: Use the live data from your tools to determine the exact root cause.
4. **Respond**: Provide a succinct summary of the problem, why it's happening based on your investigation, and a clear fix.

# Capabilities
* \`getLighthouseAudits\`: Get detailed audit data.
* \`runAccessibilityAudits\`: Trigger new accessibility snapshot audits.
* \`getStyles\`: Get computed styles for an element by its path.
* \`getElementAccessibilityDetails\`: Get A11y properties for an element by its path.
* \`executeJavaScript\`: Run JavaScript code on the inspected page to gather additional information or investigate the page state.

# Linkification
* **Linkify elements**: When you know the Lighthouse path of an element (found in the report audits), linkify it using \`([Label](#path-PATH))\` syntax. Never show the path to the user directly, only use it in the link href.

# Constraints
* **CRITICAL**: ALWAYS call a tool before providing an answer if an element path is available.
* **CRITICAL**: You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
* **CRITICAL**: If the Lighthouse report shows scores as "n/a" or indicates a failure, it means the data is missing or the run failed. Do NOT assume that the page passed or has no issues.

## Response Structure

If the user asks a question that requires an investigation of a problem, use this structure:
- If available, point out the root cause(s) of the problem.
  - Example: "**Root Cause**: The page is slow because of [reason]."
  - Example: "**Root Causes**:"
    - [Reason 1]
    - [Reason 2]
- if applicable, list actionable solution suggestion(s) in order of impact:
  - Example: "**Suggestion**: [Suggestion 1]
  - Example: "**Suggestions**:"
    - [Suggestion 1]
    - [Suggestion 2]
`;
var AccessibilityAgent = class extends AiAgent {
  preamble = preamble;
  clientFeature = Host27.AidaClient.ClientFeature.CHROME_ACCESSIBILITY_AGENT;
  #lighthouseRecording;
  #execJs;
  #changes;
  #createExtensionScope;
  constructor(opts) {
    super(opts);
    this.#lighthouseRecording = opts.lighthouseRecording;
    this.#changes = opts.changeManager || new ChangeManager(opts.targetManager);
    this.#execJs = opts.execJs ?? executeJsCode;
    this.#createExtensionScope = opts.createExtensionScope ?? ((changes) => {
      return new ExtensionScope(changes, this.sessionId, this.#getDocumentBodyNode());
    });
  }
  get userTier() {
    return Root6.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }
  get executionMode() {
    return Root6.Runtime.hostConfig.devToolsFreestyler?.executionMode ?? Root6.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
  }
  get options() {
    const temperature = Root6.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.temperature;
    const modelId = Root6.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.modelId;
    return {
      temperature,
      modelId
    };
  }
  async preRun() {
    const target = this.targetManager.primaryPageTarget();
    const domModel = target?.model(SDK19.DOMModel.DOMModel);
    if (domModel && !domModel.existingDocument()) {
      try {
        await domModel.requestDocument();
      } catch (e) {
        debugLog("Failed to request document", e);
      }
    }
  }
  /**
   * For the Accessibility Agent, there is no single "selected" node.
   * We use the document body as the default context node for JavaScript execution
   * so that the AI has a valid $0 to start with.
   */
  #getDocumentBodyNode() {
    const document2 = this.targetManager.primaryPageTarget()?.model(SDK19.DOMModel.DOMModel)?.existingDocument();
    return document2?.body ?? document2 ?? null;
  }
  async *handleContextDetails(lhr) {
    if (!lhr) {
      return;
    }
    const details = await lhr.getUserFacingDetails();
    if (details) {
      yield {
        type: "context" /* CONTEXT */,
        details
      };
    }
  }
  async #resolvePathToNode(path) {
    const target = this.targetManager.primaryPageTarget();
    if (!target) {
      return null;
    }
    const domModel = target.model(SDK19.DOMModel.DOMModel);
    if (!domModel) {
      return null;
    }
    const nodeId = await domModel.pushNodeByPathToFrontend(path);
    if (!nodeId) {
      return null;
    }
    const node = domModel.nodeForId(nodeId);
    if (!node) {
      return null;
    }
    const mainDocument = domModel.existingDocument();
    if (!mainDocument) {
      return null;
    }
    const mainDocumentURL = mainDocument.documentURL;
    const nodeDocumentURL = node.ownerDocument?.documentURL ?? "";
    if (!isSameOrigin(mainDocumentURL, nodeDocumentURL)) {
      return null;
    }
    return node;
  }
  #declareFunctions() {
    const isImported = this.context?.getItem().isImported;
    this.declareFunction("getLighthouseAudits", {
      description: "Returns the audits for a specific Lighthouse category. Use this to get more information about the performance, accessibility, best-practices, or seo audits.",
      parameters: {
        type: Host27.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          categoryId: {
            type: Host27.AidaClient.ParametersTypes.STRING,
            description: 'The category of audits to retrieve. Valid values are "performance", "accessibility", "best-practices", "seo".',
            nullable: false
          }
        },
        required: ["categoryId"]
      },
      displayInfoFromArgs: (params) => {
        return {
          title: i18n44.i18n.lockedString(`Getting Lighthouse audits for ${params.categoryId}`),
          action: `getLighthouseAudits('${params.categoryId}')`
        };
      },
      handler: async (params) => {
        debugLog("Function call: getLighthouseAudits", params);
        const report = this.context?.getItem();
        if (!report) {
          return { error: "No Lighthouse report available." };
        }
        const audits = new LighthouseFormatter().audits(report, params.categoryId);
        return {
          result: { audits },
          widgets: [{ name: "LIGHTHOUSE_REPORT", data: { report } }]
        };
      }
    });
    const executeJsTool = ToolRegistry.get("executeJavaScript" /* EXECUTE_JAVASCRIPT */);
    if (!executeJsTool) {
      throw new Error('Required tool "executeJavaScript" not found');
    }
    this.declareFunction(executeJsTool.name, {
      description: executeJsTool.description,
      parameters: executeJsTool.parameters,
      displayInfoFromArgs: executeJsTool.displayInfoFromArgs,
      handler: async (args, options) => {
        if (isImported) {
          return {
            error: "Cannot use this tool on an imported file."
          };
        }
        return await executeJsTool.handler(
          args,
          {
            conversationContext: this.context ?? null,
            changeManager: this.#changes,
            createExtensionScope: this.#createExtensionScope.bind(this),
            execJs: this.#execJs,
            getExecutionContextNode: () => this.#getDocumentBodyNode()
          },
          options
        );
      }
    });
    this.declareFunction("runAccessibilityAudits", {
      description: "Triggers new Lighthouse accessibility audits in snapshot mode. Use this if the user has made changes to the page and you want to re-evaluate the accessibility audits.",
      parameters: {
        type: Host27.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          explanation: {
            type: Host27.AidaClient.ParametersTypes.STRING,
            description: "Explain why you want to run new audits.",
            nullable: false
          }
        },
        required: ["explanation"]
      },
      displayInfoFromArgs: (params) => {
        return {
          title: i18n44.i18n.lockedString("Running accessibility audits"),
          thought: params.explanation,
          action: "runAccessibilityAudits()"
        };
      },
      handler: async (params) => {
        debugLog("Function call: runAccessibilityAudits", params);
        if (isImported) {
          return {
            error: "Cannot use this tool on an imported file."
          };
        }
        if (!this.#lighthouseRecording) {
          return { error: "Lighthouse recording is not available." };
        }
        const report = await this.#lighthouseRecording({
          mode: "snapshot",
          categoryIds: ["accessibility"],
          isAIControlled: true
        });
        if (!report) {
          return { error: "Failed to run accessibility audits." };
        }
        const audits = new LighthouseFormatter().audits(report, "accessibility");
        return {
          result: { audits },
          widgets: [{ name: "LIGHTHOUSE_REPORT", data: { report, snapshotReport: true } }]
        };
      }
    });
    this.declareFunction("getStyles", {
      description: 'Get computed styles for an element on the inspected page by its Lighthouse path. **CRITICAL** You MUST provide a specific list of CSS property names. Do not use generic values like "all" or "*".',
      parameters: {
        type: Host27.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          explanation: {
            type: Host27.AidaClient.ParametersTypes.STRING,
            description: "Explain why you want to get styles.",
            nullable: false
          },
          path: {
            type: Host27.AidaClient.ParametersTypes.STRING,
            description: 'The Lighthouse path of the element (e.g., "1,HTML,1,BODY,2,DIV"). Find this in the report data.',
            nullable: false
          },
          styleProperties: {
            type: Host27.AidaClient.ParametersTypes.ARRAY,
            description: 'One or more specific CSS style property names to fetch. Generic values like "all" or "*" are not supported.',
            nullable: false,
            items: {
              type: Host27.AidaClient.ParametersTypes.STRING,
              description: "A CSS style property name to retrieve. For example, 'background-color'."
            }
          }
        },
        required: ["explanation", "path", "styleProperties"]
      },
      displayInfoFromArgs: (params) => {
        return {
          title: "Reading computed styles",
          thought: params.explanation,
          action: `getStyles('${params.path}', ${JSON.stringify(params.styleProperties)})`
        };
      },
      handler: async (params) => {
        debugLog("Function call: getStyles", params);
        if (isImported) {
          return {
            error: "Cannot use this tool on an imported file."
          };
        }
        const node = await this.#resolvePathToNode(params.path);
        if (!node) {
          return { error: `Could not find the element with path: ${params.path}` };
        }
        const styles = await node.domModel().cssModel().getComputedStyle(node.id);
        if (!styles) {
          return { error: "Could not get computed styles." };
        }
        const result = {};
        for (const prop of params.styleProperties) {
          result[prop] = styles.get(prop);
        }
        result["backendNodeId"] = node.backendNodeId();
        const widgets = [];
        const matchedStyles = await node.domModel().cssModel().getMatchedStyles(node.id);
        if (matchedStyles) {
          widgets.push({
            name: "COMPUTED_STYLES",
            data: {
              computedStyles: styles,
              backendNodeId: node.backendNodeId(),
              matchedCascade: matchedStyles,
              properties: params.styleProperties
            }
          });
        }
        return {
          result: JSON.stringify(result, null, 2),
          widgets: widgets.length > 0 ? widgets : void 0
        };
      }
    });
    this.declareFunction("getElementAccessibilityDetails", {
      description: "Get detailed accessibility information for an element on the inspected page by its Lighthouse path.",
      parameters: {
        type: Host27.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          explanation: {
            type: Host27.AidaClient.ParametersTypes.STRING,
            description: "Explain why you want to get accessibility details.",
            nullable: false
          },
          path: {
            type: Host27.AidaClient.ParametersTypes.STRING,
            description: 'The Lighthouse path of the element (e.g., "1,HTML,1,BODY,2,DIV"). Find this in the report data.',
            nullable: false
          }
        },
        required: ["explanation", "path"]
      },
      displayInfoFromArgs: (params) => {
        return {
          title: "Reading accessibility details",
          thought: params.explanation,
          action: `getElementAccessibilityDetails('${params.path}')`
        };
      },
      handler: async (params) => {
        debugLog("Function call: getElementAccessibilityDetails", params);
        if (isImported) {
          return {
            error: "Cannot use this tool on an imported file."
          };
        }
        const node = await this.#resolvePathToNode(params.path);
        if (!node) {
          return { error: `Could not find the element with path: ${params.path}` };
        }
        const accessibilityModel = node.domModel().target().model(SDK19.AccessibilityModel.AccessibilityModel);
        if (!accessibilityModel) {
          return { error: "Accessibility model not found." };
        }
        await accessibilityModel.requestAndLoadSubTreeToNode(node);
        const axNode = accessibilityModel.axNodeForDOMNode(node);
        if (!axNode) {
          return { error: "Could not find accessibility node for the element." };
        }
        const result = {
          role: axNode.role()?.value,
          name: axNode.name()?.value,
          nameSource: axNode.name()?.sources?.[0]?.type,
          properties: {
            focusable: node.getAttribute("tabindex") !== void 0 || axNode.role()?.value === "button" || axNode.role()?.value === "link",
            hidden: axNode.ignored()
          },
          ariaAttributes: node.attributes().filter((attr) => attr.name.startsWith("aria-") || attr.name === "role").reduce(
            (acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            },
            {}
          ),
          isIgnored: axNode.ignored(),
          ignoredReasons: axNode.ignoredReasons(),
          backendNodeId: node.backendNodeId()
        };
        const widgets = [];
        const snapshot = await node.takeSnapshot();
        widgets.push({
          name: "DOM_TREE",
          data: {
            root: snapshot,
            title: i18n44.i18n.lockedString("Element details"),
            accessibleRevealLabel: i18n44.i18n.lockedString("Reveal element")
          }
        });
        return {
          result: JSON.stringify(result, null, 2),
          widgets: widgets.length > 0 ? widgets : void 0
        };
      }
    });
  }
  async enhanceQuery(query, lhr) {
    this.clearDeclaredFunctions();
    if (lhr) {
      this.#declareFunctions();
    }
    const promptDetails = lhr ? await lhr.getPromptDetails() : null;
    const enhancedQuery = promptDetails ? `${promptDetails}
# User request:

` : "";
    return `${enhancedQuery}${query}`;
  }
};

// ../../front_end/models/ai_assistance/agents/ContextSelectionAgent.ts
var ContextSelectionAgent_exports = {};
__export(ContextSelectionAgent_exports, {
  ContextSelectionAgent: () => ContextSelectionAgent
});
import * as Common17 from "../../core/common/common.js";
import * as Host28 from "../../core/host/host.js";
import * as i18n46 from "../../core/i18n/i18n.js";
import * as Root7 from "../../core/root/root.js";
import * as Logs6 from "../logs/logs.js";
import * as NetworkTimeCalculator4 from "../network_time_calculator/network_time_calculator.js";
import * as Workspace5 from "../workspace/workspace.js";

// ../../front_end/models/ai_assistance/contexts/AccessibilityContext.ts
var AccessibilityContext_exports = {};
__export(AccessibilityContext_exports, {
  AccessibilityContext: () => AccessibilityContext
});
var AccessibilityContext = class extends ConversationContext {
  #lh;
  #cachedPayload = null;
  constructor(report) {
    super();
    this.#lh = report;
  }
  #url() {
    return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
  }
  getURL() {
    return this.#url();
  }
  getItem() {
    return this.#lh;
  }
  getTitle() {
    return `Lighthouse report: ${this.#url()}`;
  }
  #getInitialPayload() {
    if (this.#cachedPayload !== null) {
      return this.#cachedPayload;
    }
    const formatter = new LighthouseFormatter();
    const summary = formatter.summary(this.#lh);
    const audits = formatter.audits(this.#lh, "accessibility");
    const allFailed = Object.values(this.#lh.categories).every((category) => category.score === null);
    if (allFailed) {
      this.#cachedPayload = "**CRITICAL**: The Lighthouse report failed to record or all category scores are error/unavailable (n/a). This indicates a failed run or missing data.";
    } else {
      this.#cachedPayload = `# Lighthouse Report:
${summary}
${audits}`;
    }
    return this.#cachedPayload;
  }
  async getPromptDetails() {
    return this.#getInitialPayload();
  }
  async getUserFacingDetails() {
    return [
      {
        title: "Lighthouse report",
        text: this.#getInitialPayload()
      }
    ];
  }
  async getWidgets() {
    return [
      {
        name: "LIGHTHOUSE_REPORT",
        data: {
          report: this.#lh
        }
      }
    ];
  }
};

// ../../front_end/models/ai_assistance/contexts/FileContext.ts
var FileContext_exports = {};
__export(FileContext_exports, {
  FileContext: () => FileContext
});
var FileContext = class extends ConversationContext {
  #file;
  #debuggerWorkspaceBinding;
  constructor(file, debuggerWorkspaceBinding) {
    super();
    this.#file = file;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
  }
  getOrigin() {
    const fallbackOrigin = super.getOrigin();
    return this.#file.project()?.securityOrigin?.() ?? fallbackOrigin;
  }
  getURL() {
    return this.#file.url();
  }
  getItem() {
    return this.#file;
  }
  getTitle() {
    return this.#file.displayName();
  }
  async getPromptDetails() {
    return `# Selected file
${new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile()}`;
  }
  async getUserFacingDetails() {
    return [
      {
        title: "Selected file",
        text: new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile()
      }
    ];
  }
  async refresh() {
    await this.#file.requestContentData();
  }
};

// ../../front_end/models/ai_assistance/contexts/StorageContext.ts
var StorageContext_exports = {};
__export(StorageContext_exports, {
  StorageContext: () => StorageContext
});

// ../../front_end/models/ai_assistance/StorageItem.ts
var StorageItem_exports = {};
__export(StorageItem_exports, {
  CookieItem: () => CookieItem,
  DOMStorageItem: () => DOMStorageItem,
  EMPTY_ORIGIN: () => EMPTY_ORIGIN,
  StorageItem: () => StorageItem
});
var EMPTY_ORIGIN = "";
var StorageItem = class _StorageItem {
  constructor(primaryTargetOrigin, origin = EMPTY_ORIGIN) {
    this.primaryTargetOrigin = primaryTargetOrigin;
    this.origin = origin;
  }
  get isGenericContext() {
    return this.origin === EMPTY_ORIGIN;
  }
  static createGenericContext(primaryTargetOrigin, ..._args) {
    return new _StorageItem(primaryTargetOrigin, EMPTY_ORIGIN);
  }
};
var DOMStorageItem = class _DOMStorageItem extends StorageItem {
  constructor(primaryTargetOrigin, origin, storageKey, type, key) {
    super(primaryTargetOrigin, origin);
    this.storageKey = storageKey;
    this.type = type;
    this.key = key;
  }
  static createGenericContext(primaryTargetOrigin, type) {
    return new _DOMStorageItem(primaryTargetOrigin, EMPTY_ORIGIN, void 0, type);
  }
};
var CookieItem = class _CookieItem extends StorageItem {
  constructor(primaryTargetOrigin, origin, name) {
    super(primaryTargetOrigin, origin);
    this.name = name;
  }
  static createGenericContext(primaryTargetOrigin) {
    return new _CookieItem(primaryTargetOrigin, EMPTY_ORIGIN);
  }
};

// ../../front_end/models/ai_assistance/contexts/StorageContext.ts
var StorageContext = class extends ConversationContext {
  #item;
  constructor(item) {
    super();
    this.#item = item;
  }
  getURL() {
    return this.#item.primaryTargetOrigin;
  }
  getItem() {
    return this.#item;
  }
  getTitle() {
    if (this.#item instanceof CookieItem) {
      if (this.#item.name) {
        return `cookie: ${this.#item.name}${this.#item.origin ? ` ${this.#item.origin}` : ""}`;
      }
      return `cookies${this.#item.isGenericContext ? "" : `: ${this.#item.origin}`}`;
    }
    if (this.#item instanceof DOMStorageItem) {
      if (this.#item.key) {
        return `entry: ${this.#item.key}${this.#item.origin ? ` ${this.#item.origin}` : ""}`;
      }
      const prefix = this.#item.type === "localStorage" ? "local storage" : "session storage";
      return `${prefix}${this.#item.isGenericContext ? "" : `: ${this.#item.origin}`}`;
    }
    return `Storage: ${this.getOrigin()}`;
  }
  /**
   * @override
   */
  isLoggingEnabled() {
    if (this.#item instanceof CookieItem && Boolean(this.#item.name)) {
      return false;
    }
    if (this.#item instanceof DOMStorageItem && Boolean(this.#item.key)) {
      return false;
    }
    return true;
  }
  async getSuggestions() {
    if (this.#item instanceof CookieItem) {
      if (this.#item.name) {
        return [
          {
            title: "Why is this cookie set?",
            jslogContext: "storage-cookie"
          },
          {
            title: "Explain the value of this cookie",
            jslogContext: "storage-cookie"
          }
        ];
      }
      return [
        {
          title: "Explain the cookies set by this page",
          jslogContext: "storage-cookie"
        }
      ];
    }
    if (this.#item instanceof DOMStorageItem) {
      if (this.#item.key) {
        return [
          {
            title: "What is the purpose of this storage entry?",
            jslogContext: "storage-domstorage"
          },
          {
            title: "Explain the value of this storage entry",
            jslogContext: "storage-domstorage"
          }
        ];
      }
      return [
        {
          title: "Explain these storage items",
          jslogContext: "storage-domstorage"
        }
      ];
    }
    return void 0;
  }
};

// ../../front_end/models/ai_assistance/agents/ContextSelectionAgent.ts
var lockedString21 = i18n46.i18n.lockedString;
var preamble2 = `
You are an advanced Web Development Assistant and AI routing agent integrated into Chrome DevTools. Your tone is educational, supportive, and technically precise. You aim to help developers of all levels, prioritizing teaching web concepts as the primary entry point for any solution.

Your role is to understand the user's query, identify the appropriate specialized agent to handle it, and select the relevant context from the page to assist that agent.

# Workflow
1.  **Analyze**: Understand the user's intent and what they are trying to achieve.
2.  **Classify**: Determine which specialized agent is best suited for the task (e.g., StylingAgent for CSS/styling issues, NetworkAgent for network requests, FileAgent for source files, PerformanceAgent for performance details, AccessibilityAgent for accessibility reports, or StorageAgent for analyzing and explaining storage but not editing).
3.  **Gather Context**: Identify what information the specialized agent will need. Proactively use your tools to find and select this context (e.g., finding the relevant DOM node, network request, file, performance trace, or storage). Always try to select a single specific context before answering the question.
4.  **Delegate**: Once context is selected, hand over to the specialized agent. If you are unable to delegate or gather more information, provide a comprehensive guide on how to fix the issue using Chrome DevTools, explaining how and why, or suggest any panel/flow that may help.

# Considerations
* Determine what is the domain of the question - styling, network, sources, performance, storage, or other part of DevTools.
* For questions about performance (e.g., general performance issues, page speed, performance metrics like LCP, INP, CLS), use performanceRecordAndReload to record a performance trace.
* Proactively try to gather additional data. If a specific piece of data can be selected, select it.
* Always try to select a single specific context before answering the question.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* If you are unable to gather more information provide a comprehensive guide to how to fix the issue using Chrome DevTools and explain how and why.
* You can suggest any panel or flow in Chrome DevTools that may help the user out.

# Formatting Guidelines
* Use Markdown for all code snippets.
* Always specify the language for code blocks (e.g., \`\`\`css, \`\`\`javascript).
* **CRITICAL**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.

* **CRITICAL** If a tool returns an empty list, immediately pivot to the next logical tool (e.g., from sources to network).
* **CRITICAL** Always exhaust all possible ways to find and select context from different domains.
* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.
* **CRITICAL** NEVER output text before a function call. Always do a function call first.
* **CRITICAL** You are a debugging assistant in DevTools. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.
* **CRITICAL** When referring to DevTools resource output a markdown link to the object using the format \`[<text>](#<type>-<ID>)\`.
* The only available types are \`#req\` for network request and \`#file\` for source files. Only use ID inside the link, never ask about user selecting by ID.
`;
var ContextSelectionAgent = class _ContextSelectionAgent extends AiAgent {
  preamble = preamble2;
  clientFeature = Host28.AidaClient.ClientFeature.CHROME_CONTEXT_SELECTION_AGENT;
  get userTier() {
    return Root7.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }
  get options() {
    const temperature = Root7.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.temperature;
    const modelId = Root7.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.modelId;
    return {
      temperature,
      modelId
    };
  }
  #performanceRecordAndReload;
  #onInspectElement;
  #networkTimeCalculator;
  #lighthouseRecording;
  #allowedOrigin;
  #networkLog;
  #workspace;
  constructor(opts) {
    super(opts);
    this.#networkLog = opts.networkLog ?? Logs6.NetworkLog.NetworkLog.instance();
    this.#workspace = opts.workspace ?? Workspace5.Workspace.WorkspaceImpl.instance();
    this.#performanceRecordAndReload = opts.performanceRecordAndReload;
    this.#lighthouseRecording = opts.lighthouseRecording;
    this.#onInspectElement = opts.onInspectElement;
    this.#networkTimeCalculator = opts.networkTimeCalculator;
    this.#allowedOrigin = opts.allowedOrigin ?? (() => ({ origin: void 0 }));
    this.declareFunction("listNetworkRequests", {
      description: `Gives a list of network requests including URL, status code, and duration.`,
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: [],
        properties: {}
      },
      displayInfoFromArgs: () => {
        return {
          title: lockedString21("Listing network requests"),
          action: "listNetworkRequest()"
        };
      },
      handler: async () => {
        const requests = [];
        const allowedOriginResult = this.#allowedOrigin();
        if ("blocked" in allowedOriginResult) {
          return {
            error: "Cross-origin access blocked due to navigation. Please start a new chat."
          };
        }
        const origin = allowedOriginResult.origin;
        if (origin && isOpaqueOrigin(origin)) {
          return {
            error: "No requests recorded by DevTools"
          };
        }
        let hasCrossOriginRequest = false;
        const requestsToShow = [];
        for (const request of this.#networkLog.requests()) {
          const requestOrigin = getRequestContextOrigin(request);
          if (origin && requestOrigin !== origin) {
            hasCrossOriginRequest = true;
            continue;
          }
          requests.push({
            id: request.requestId(),
            url: request.url(),
            statusCode: request.statusCode,
            duration: seconds(request.duration),
            transferSize: formatBytesToKb(request.transferSize)
          });
          requestsToShow.push(request);
        }
        if (requests.length === 0) {
          return {
            error: hasCrossOriginRequest ? `No requests showing with origin ${origin}. Tell the user to start a new chat` : "No requests recorded by DevTools"
          };
        }
        return {
          result: requests,
          widgets: [{
            name: "NETWORK_REQUESTS_LIST",
            data: {
              requests: requestsToShow
            }
          }]
        };
      }
    });
    this.declareFunction("selectNetworkRequest", {
      description: `Selects a specific network request to further provide information about. Use this when asked about network requests issues.`,
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: ["id"],
        properties: {
          id: {
            type: Host28.AidaClient.ParametersTypes.STRING,
            description: "The id of the network request",
            nullable: false
          }
        }
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString21("Getting network request"),
          action: `selectNetworkRequest(${args.id})`
        };
      },
      handler: async ({ id }) => {
        const allowedOriginResult = this.#allowedOrigin();
        if ("blocked" in allowedOriginResult) {
          return {
            error: "Cross-origin access blocked due to navigation. Please start a new chat."
          };
        }
        const origin = allowedOriginResult.origin;
        if (origin && isOpaqueOrigin(origin)) {
          return {
            error: "No request found"
          };
        }
        const request = this.#networkLog.requests().find((req) => {
          if (req.requestId() !== id) {
            return false;
          }
          const requestOrigin = getRequestContextOrigin(req);
          return !origin || requestOrigin === origin;
        });
        if (request) {
          const calculator = this.#networkTimeCalculator ?? new NetworkTimeCalculator4.NetworkTransferTimeCalculator();
          return {
            context: new RequestContext(request, calculator),
            description: "User selected a network request",
            widgets: [{
              name: "NETWORK_REQUEST_GENERAL_HEADERS",
              data: {
                request
              }
            }]
          };
        }
        return {
          error: "No request found"
        };
      }
    });
    this.declareFunction("listSourceFiles", {
      description: `Returns a list of all files in the project.`,
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: [],
        properties: {}
      },
      displayInfoFromArgs: () => {
        return {
          title: lockedString21("Listing source requests"),
          action: "listSourceFiles()"
        };
      },
      handler: async () => {
        const allowedOriginResult = this.#allowedOrigin();
        if ("blocked" in allowedOriginResult) {
          return {
            error: "Cross-origin access blocked due to navigation. Please start a new chat."
          };
        }
        const origin = allowedOriginResult.origin;
        const files = [];
        const uiSourceCodes = [];
        for (const file of _ContextSelectionAgent.getUISourceCodes(this.#workspace)) {
          const fileUrl = file.url();
          const fileOrigin = Common17.ParsedURL.ParsedURL.extractOrigin(fileUrl);
          if (origin && fileOrigin !== origin) {
            continue;
          }
          files.push({
            file: file.fullDisplayName(),
            id: _ContextSelectionAgent.uiSourceCodeId.get(file)
          });
          uiSourceCodes.push(file);
        }
        return {
          result: files,
          widgets: [{
            name: "SOURCE_FILES_LIST",
            data: {
              uiSourceCodes
            }
          }]
        };
      }
    });
    this.declareFunction("selectSourceFile", {
      description: `Selects a source file. Use this when asked about files on the page. Use listSourceFiles to find the file ID.`,
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: ["id"],
        properties: {
          id: {
            type: Host28.AidaClient.ParametersTypes.INTEGER,
            description: "The id (URL) of the file you want to select.",
            nullable: false
          }
        }
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString21("Getting source file"),
          action: `selectSourceFile(${args.id})`
        };
      },
      handler: async (params) => {
        const allowedOriginResult = this.#allowedOrigin();
        if ("blocked" in allowedOriginResult) {
          return {
            error: "Cross-origin access blocked due to navigation. Please start a new chat."
          };
        }
        const origin = allowedOriginResult.origin;
        const file = _ContextSelectionAgent.getUISourceCodes(this.#workspace).find((file2) => {
          if (_ContextSelectionAgent.uiSourceCodeId.get(file2) !== params.id) {
            return false;
          }
          const fileUrl = file2.url();
          const fileOrigin = Common17.ParsedURL.ParsedURL.extractOrigin(fileUrl);
          return !origin || fileOrigin === origin;
        });
        if (!file) {
          return {
            error: "Unable to find file."
          };
        }
        return {
          context: new FileContext(file),
          description: "User selected a source file",
          widgets: [{
            name: "SOURCE_FILE",
            data: {
              uiSourceCode: file
            }
          }]
        };
      }
    });
    this.declareFunction("performanceRecordAndReload", {
      description: "Records a new performance trace. Use this to measure, analyze, and debug page performance, general performance issues, performance metrics, and Core Web Vitals like Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS).",
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: [],
        properties: {}
      },
      displayInfoFromArgs: () => {
        return {
          title: "Recording a performance trace",
          action: "performanceRecordAndReload()"
        };
      },
      handler: async () => {
        if (!this.#performanceRecordAndReload) {
          return {
            error: "Performance recording is not available."
          };
        }
        const result = await this.#performanceRecordAndReload();
        return {
          context: PerformanceTraceContext.fromParsedTrace(result),
          description: "User recorded a performance trace",
          widgets: [{ name: "PERFORMANCE_TRACE", data: { parsedTrace: result } }]
        };
      }
    });
    const parseLighthouseMode = (mode) => {
      return mode === "snapshot" ? "snapshot" : "navigation";
    };
    this.declareFunction("runLighthouseAudits", {
      description: "Records a Lighthouse audit on the current page. Use this to debug accessibility, SEO, and best practices. (For any performance-related questions or performance issues, do NOT use this; use performanceRecordAndReload instead).",
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: ["mode"],
        properties: {
          mode: {
            type: Host28.AidaClient.ParametersTypes.STRING,
            description: `The mode to run Lighthouse in. Your ONLY options are "navigation" or "snapshot". You should determine this based on the user's question. If the user is asking specifically about accessibility, you can run in "snapshot" mode which avoids reloading the page. If the user asks for a full Lighthouse report, you should run in "navigation" mode which is the default. These are the only options you can pass.`,
            nullable: false
          }
        }
      },
      displayInfoFromArgs: (args) => {
        const mode = parseLighthouseMode(args.mode);
        return {
          title: "Auditing your page with Lighthouse",
          action: `runLighthouseAudits(${mode})`
        };
      },
      handler: async (params) => {
        if (!this.#lighthouseRecording) {
          return {
            error: "Lighthouse report is not available."
          };
        }
        const mode = parseLighthouseMode(params.mode);
        debugLog(`Recording with Lighthouse; runMode=${mode}`);
        const result = await this.#lighthouseRecording({ mode });
        if (!result) {
          return { error: "Failed to generate Lighthouse report." };
        }
        return {
          context: new AccessibilityContext(result),
          description: "User has selected a Lighthouse report",
          widgets: [{ name: "LIGHTHOUSE_REPORT", data: { report: result } }]
        };
      }
    });
    this.declareFunction("inspectDom", {
      description: `Prompts user to select a DOM element from the page. Use this when you don't know which element is selected.`,
      parameters: {
        type: Host28.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: true,
        required: [],
        properties: {}
      },
      displayInfoFromArgs: () => {
        return {
          title: lockedString21("Select an element on the page or in the Elements panel")
        };
      },
      handler: async (_params, options) => {
        if (!this.#onInspectElement) {
          return {
            error: "The inspect element action is not available."
          };
        }
        if (!options?.approved) {
          return {
            requiresApproval: true,
            description: null
          };
        }
        const node = await this.#onInspectElement();
        if (node) {
          return {
            context: new DOMNodeContext(node),
            description: "User selected an element"
          };
        }
        return {
          error: "Unable to select element."
        };
      }
    });
    if (Root7.Runtime.hostConfig.devToolsAiAssistanceStorageAgent?.enabled) {
      this.declareFunction("analyzeStorage", {
        description: "Selects the page storage. Use this when asked about browser storage (localStorage, sessionStorage, cookies) and issues related to these.",
        parameters: {
          type: Host28.AidaClient.ParametersTypes.OBJECT,
          description: "",
          nullable: true,
          required: [],
          properties: {}
        },
        displayInfoFromArgs: () => {
          return {
            title: lockedString21("Prepare storage analysis"),
            action: "analyzeStorage()"
          };
        },
        handler: async () => {
          const allowedOriginResult = this.#allowedOrigin();
          if ("blocked" in allowedOriginResult) {
            return {
              error: "Cross-origin access blocked due to navigation. Please start a new chat."
            };
          }
          const origin = allowedOriginResult.origin;
          if (!origin) {
            return {
              error: "Unable to find page storage."
            };
          }
          return {
            context: new StorageContext(new StorageItem(origin, origin)),
            description: "User selected page storage"
          };
        }
      });
    }
  }
  async *handleContextDetails() {
  }
  async enhanceQuery(query) {
    return query;
  }
  static lastSourceId = 0;
  static uiSourceCodeId = /* @__PURE__ */ new WeakMap();
  /**
   * This is a heuristic algorithm that gets all the source files coming from the
   * network and assigns unique ids to be linked from the LLM Markdown response.
   * Steps we do:
   * 1. Get all project that are coming from the Network. This scopes down
   * sources exposed to the LLM
   * 2. Remove all ignore listed source code. We further reduce thing that the
   * user most likely does not have interest in, from global setting.
   * 3.1. Source files don't have an uniqueId so we use the URL to differentiate
   * them.
   * 3.2. In cases where we encounter a duplicated URLs we prefer the latest one
   * coming from SourceMaps (usually only one) as that has simple code and
   * usually is what the user authored.
   */
  // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
  static getUISourceCodes(workspace = Workspace5.Workspace.WorkspaceImpl.instance()) {
    const projects = workspace.projects().filter((project) => project.type() === Workspace5.Workspace.projectTypes.Network);
    const uiSourceCodes = /* @__PURE__ */ new Map();
    for (const project of projects) {
      for (const uiSourceCode of project.uiSourceCodes()) {
        if (uiSourceCode.isIgnoreListed()) {
          continue;
        }
        const url = uiSourceCode.url();
        if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
          uiSourceCodes.set(url, uiSourceCode);
          if (!_ContextSelectionAgent.uiSourceCodeId.has(uiSourceCode)) {
            _ContextSelectionAgent.uiSourceCodeId.set(uiSourceCode, ++_ContextSelectionAgent.lastSourceId);
          }
        }
      }
    }
    return [...uiSourceCodes.values()];
  }
};

// ../../front_end/models/ai_assistance/agents/FileAgent.ts
var FileAgent_exports = {};
__export(FileAgent_exports, {
  FileAgent: () => FileAgent
});
import * as Host29 from "../../core/host/host.js";
import * as Root8 from "../../core/root/root.js";
var preamble3 = `You are a highly skilled software engineer with expertise in various programming languages and frameworks.
You are provided with the content of a file from the Chrome DevTools Sources panel. To aid your analysis, you've been given the below links to understand the context of the code and its relationship to other files. When answering questions, prioritize providing these links directly.
* Source-mapped from: If this code is the source for a mapped file, you'll have a link to that generated file.
* Source map: If this code has an associated source map, you'll have link to the source map.
* If there is a request which caused the file to be loaded, you will be provided with the request initiator chain with URLs for those requests.

Analyze the code and provide the following information:
* Describe the primary functionality of the code. What does it do? Be specific and concise. If the code snippet is too small or unclear to determine the functionality, state that explicitly.
* If possible, identify the framework or library the code is associated with (e.g., React, Angular, jQuery). List any key technologies, APIs, or patterns used in the code (e.g., Fetch API, WebSockets, object-oriented programming).
* (Only provide if available and accessible externally) External Resources: Suggest relevant documentation that could help a developer understand the code better. Prioritize official documentation if available. Do not provide any internal resources.
* (ONLY if request initiator chain is provided) Why the file was loaded?

# Considerations
* **CRITICAL**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
* Answer questions directly, using the provided links whenever relevant.
* Always double-check links to make sure they are complete and correct.
* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with "Sorry, I can't answer that. I'm best at questions about files."
* **CRITICAL** You are a file analysis agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
* **Important Note:** The provided code may represent an incomplete fragment of a larger file. If the code is incomplete or has syntax errors, indicate this and attempt to provide a general analysis if possible.
* **Interactive Analysis:** If the code requires more context or is ambiguous, ask clarifying questions to the user. Based on your analysis, suggest relevant DevTools features or workflows.

## Response Structure

If the user asks a question that requires an investigation of a problem, use this structure:
- If available, point out the root cause(s) of the problem.
  - Example: "**Root Cause**: The page is slow because of [reason]."
  - Example: "**Root Causes**:"
    - [Reason 1]
    - [Reason 2]
- if applicable, list actionable solution suggestion(s) in order of impact:
  - Example: "**Suggestion**: [Suggestion 1]
  - Example: "**Suggestions**:"
    - [Suggestion 1]
    - [Suggestion 2]

## Example session

**User:** (Selects a file containing the following JavaScript code)

function calculateTotal(price, quantity) {
  const total = price * quantity;
  return total;
}
Explain this file.


This code defines a function called calculateTotal that calculates the total cost by multiplying the price and quantity arguments.
This code is written in JavaScript and doesn't seem to be associated with a specific framework. It's likely a utility function.
Relevant Technologies: JavaScript, functions, arithmetic operations.
External Resources:
MDN Web Docs: JavaScript Functions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
`;
var FileAgent = class extends AiAgent {
  preamble = preamble3;
  clientFeature = Host29.AidaClient.ClientFeature.CHROME_FILE_AGENT;
  get userTier() {
    return Root8.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.userTier;
  }
  get options() {
    const temperature = Root8.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.temperature;
    const modelId = Root8.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.modelId;
    return {
      temperature,
      modelId
    };
  }
  async *handleContextDetails(selectedFile) {
    if (!selectedFile) {
      return;
    }
    const details = await selectedFile.getUserFacingDetails();
    if (!details) {
      return;
    }
    yield {
      type: "context" /* CONTEXT */,
      details
    };
  }
  async enhanceQuery(query, selectedFile) {
    const promptDetails = selectedFile ? await selectedFile.getPromptDetails() : null;
    const fileEnchantmentQuery = promptDetails ? `${promptDetails}

# User request

` : "";
    return `${fileEnchantmentQuery}${query}`;
  }
};

// ../../front_end/models/ai_assistance/agents/NetworkAgent.ts
var NetworkAgent_exports = {};
__export(NetworkAgent_exports, {
  NetworkAgent: () => NetworkAgent
});
import * as Host30 from "../../core/host/host.js";
import * as Root9 from "../../core/root/root.js";
var preamble4 = `You are the most advanced network request debugging assistant integrated into Chrome DevTools.
The user selected a network request in the browser's DevTools Network Panel and sends a query to understand the request.
Provide a comprehensive analysis of the network request, focusing on areas crucial for a software engineer. Your analysis should include:
* Briefly explain the purpose of the request based on the URL, method, and any relevant headers or payload.
* Analyze timing information to identify potential bottlenecks or areas for optimization.
* Highlight potential issues indicated by the status code.

# Considerations
* If the response payload or request payload contains sensitive data, redact or generalize it in your analysis to ensure privacy.
* Tailor your explanations and suggestions to the specific context of the request and the technologies involved (if discernible from the provided details).
* **CRITICAL** Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with "Sorry, I can't answer that. I'm best at questions about network requests."
* **CRITICAL** You are a network request debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.

## Response Structure

If the user asks a question that requires an investigation of a problem, use this structure:
- If available, point out the root cause(s) of the problem.
  - Example: "**Root Cause**: The page is slow because of [reason]."
  - Example: "**Root Causes**:"
    - [Reason 1]
    - [Reason 2]
- if applicable, list actionable solution suggestion(s) in order of impact:
  - Example: "**Suggestion**: [Suggestion 1]
  - Example: "**Suggestions**:"
    - [Suggestion 1]
    - [Suggestion 2]

## Example session

Explain this network request
Request: https://api.example.com/products/search?q=laptop&category=electronics
Response Headers:
    Content-Type: application/json
    Cache-Control: max-age=300
...
Request Headers:
    User-Agent: Mozilla/5.0
...
Request Status: 200 OK


This request aims to retrieve a list of products matching the search query "laptop" within the "electronics" category. The successful 200 OK status confirms that the server fulfilled the request and returned the relevant data.
`;
var NetworkAgent = class extends AiAgent {
  preamble = preamble4;
  clientFeature = Host30.AidaClient.ClientFeature.CHROME_NETWORK_AGENT;
  get userTier() {
    return Root9.Runtime.hostConfig.devToolsAiAssistanceNetworkAgent?.userTier;
  }
  get options() {
    const temperature = Root9.Runtime.hostConfig.devToolsAiAssistanceNetworkAgent?.temperature;
    const modelId = Root9.Runtime.hostConfig.devToolsAiAssistanceNetworkAgent?.modelId;
    return {
      temperature,
      modelId
    };
  }
  async *handleContextDetails(selectedNetworkRequest) {
    if (!selectedNetworkRequest) {
      return;
    }
    const details = await selectedNetworkRequest.getUserFacingDetails();
    if (!details) {
      return;
    }
    yield {
      type: "context" /* CONTEXT */,
      details,
      widgets: [{
        name: "NETWORK_REQUEST_GENERAL_HEADERS",
        data: {
          request: selectedNetworkRequest.getItem()
        }
      }]
    };
  }
  async enhanceQuery(query, selectedNetworkRequest) {
    const promptDetails = selectedNetworkRequest ? await selectedNetworkRequest.getPromptDetails() : null;
    const networkEnchantmentQuery = promptDetails ? `${promptDetails}

# User request

` : "";
    return `${networkEnchantmentQuery}${query}`;
  }
};

// ../../front_end/models/ai_assistance/agents/PerformanceAgent.ts
var PerformanceAgent_exports = {};
__export(PerformanceAgent_exports, {
  PerformanceAgent: () => PerformanceAgent
});
import * as Common18 from "../../core/common/common.js";
import * as Host31 from "../../core/host/host.js";
import * as i18n48 from "../../core/i18n/i18n.js";
import * as Root10 from "../../core/root/root.js";
import * as SDK20 from "../../core/sdk/sdk.js";
import * as TextUtils5 from "../../core/text_utils/text_utils.js";
import * as Tracing3 from "../../services/tracing/tracing.js";
import * as Logs7 from "../logs/logs.js";
import * as Trace9 from "../trace/trace.js";
var UIStringsNotTranslated = {
  /**
   * @description Shown when the agent is investigating network activity
   */
  networkActivitySummary: "Investigating network activity",
  /**
   * @description Shown when the agent is investigating main thread activity
   */
  mainThreadActivity: "Investigating main thread activity"
};
var lockedString22 = i18n48.i18n.lockedString;
var preamble5 = `You are an assistant, expert in web performance and highly skilled with Chrome DevTools.

Your primary goal is to provide actionable advice to web developers about their web page by using the Chrome Performance Panel and analyzing a trace. You may need to diagnose problems yourself, or you may be given direction for what to focus on by the user.

You will be provided a summary of a trace: some performance metrics; the most critical network requests; a bottom-up call graph summary; and a brief overview of available insights. Each insight has information about potential performance issues with the page.

Always call getInsightDetails to gather more data on an insight or the actual LCP element BEFORE mentioning any specific details about them.

You have functions available to learn more about the trace. Use these to confirm hypotheses, or to further explore the trace when diagnosing performance issues.

You will be given bounds representing a time range within the trace. Bounds include a min and a max time in microseconds. max is always bigger than min in a bounds.

The 3 main performance metrics are:
- LCP: "Largest Contentful Paint"
- INP: "Interaction to Next Paint"
- CLS: "Cumulative Layout Shift"

Trace events referenced in the information given to you will be marked with an \`eventKey\`. For example: \`LCP element: <img src="..."> (eventKey: r-123, ts: 123456)\`
You can use this key with \`getEventByKey\` to get more information about that trace event. For example: \`getEventByKey('r-123')\`
You can also use this key with \`selectEventByKey\` to show the user a specific event

## Step-by-step instructions for debugging performance issues

Note: if the user asks a specific question about the trace (such as "What is my LCP?", or "How many requests were render-blocking?"), directly answer their question using available data. However, if the user asks a general question like "What performance issues exist?" or requests an investigation, you MUST NOT give a generic answer. You must treat it as a full performance investigation (Step 1) and call main thread functions to find specific issues. Generic advice like "reduce long tasks" without specific details is UNACCEPTABLE.


### Step 1: Determine a performance problem to investigate

- If the trace summary indicates that the main performance metrics (LCP, INP, CLS) are all within good thresholds, acknowledge this to the user. In this case, let the user know that they can try recording a trace with mobile emulation and throttling options and show them how.
- With help from the user, determine what performance problem to focus on.
- If the user is not specific about what problem to investigate, help them by doing a investigation yourself focus on performance improvements for better LCP, INP and CLS. Present to the user options with 1-sentence summaries. Mention what performance metrics each option impacts. Call as many functions and confirm the data thoroughly: never present an option without being certain it is a real performance issue.
- Focus on identifying the problem in Step 1 and save solution suggestions for Step 2.
- Once a performance problem has been identified for investigation, move on to step 2.

#### Response Structure

- Rank the options from most impactful to least impactful, and present them to the user in that order.
- Limit the number of performance problem options presented to the user to a maximum of 2.

### Step 2: Suggest solutions

- Suggest solutions to remedy the identified performance problem. Be as specific as possible, using data from the trace via the provided functions to back up everything you say. You should prefer specific solutions, but absent any specific solution you may suggest general solutions (such as from an insight's documentation links).
- If you are unsure, be honest and present information that can be helpful for further investigation.
- A good first step to discover solutions is to consider the insights, but you should also validate all potential advice by analyzing the trace until you are confident about the root cause of a performance issue.

#### Response Structure

- If available, point out the root cause(s) of the problem.
  - Example: "**Root Cause**: The page is slow because of [reason]."
  - Example: "**Root Causes**:"
    - [Reason 1]
    - [Reason 2]
- if applicable, list actionable solution suggestion(s) in order of impact:
  - Example: "**Suggestion**: [Suggestion 1]
  - Example: "**Suggestions**:"
    - [Suggestion 1]
    - [Suggestion 2]

## Guidelines

- You must call \`getMainThreadTrackSummaryByLabel\` (with the relevant label) to investigate the main thread activity before giving the user a reply or suggesting solutions for any performance problem or insight. This applies even if you already have some information about that period from \`getInsightDetails\` or the initial trace summary.
- Dig Deeper: Before replying, you should really dig into the main thread activity to uncover what the performance issues actually are. Do not solely rely on the information from the initial data; ensure you identify the root cause before suggesting solutions.
- No Shortcutting: Even if the initial facts contain specific line numbers or function names, you are not allowed to reply using only that information. You MUST call \`getMainThreadTrackSummaryByLabel\` to inspect its context before describing it to the user.
- Look for Aggregated Cost: Performance issues are not always caused by a single "Long Task". Many small, frequent events (like unthrottled \`mousemove\` or \`scroll\` handlers) can add up to significant main thread blockage. Use the Bottom-Up summary in \`getMainThreadTrackSummaryByLabel\` to identify functions with high total time, even if they are not associated with a Long Task.
- Use the provided functions to get detailed performance data. Prioritize functions that provide context relevant to the performance issue being investigated.
- Before finalizing your advice, look over it and validate using any relevant functions. If something seems off, refine the advice before giving it to the user.
- Base your analysis and advice solely on the data retrieved through the provided functions. Always use the provided functions to gather sufficient data when needed.
- Use absolute microsecond timestamps for any function that requires a \`min\` and \`max\` bounds. These timestamps can be found in the trace summary or within the details of an insight.
- Available labels for \`getMainThreadTrackSummaryByLabel\` include:
  - \`trace-bounds\` (entire trace)
  - \`nav-to-lcp\` (navigation to LCP)
  - \`lcp-ttfb\` (LCP TTFB phase)
  - \`lcp-render-delay\` (LCP render delay phase)
  - Insight names: \`LCPBreakdown\`, \`INPBreakdown\`, \`CLSCulprits\`, \`ThirdParties\`, \`DocumentLatency\`, \`DOMSize\`, \`DuplicatedJavaScript\`, \`FontDisplay\`, \`ForcedReflow\`, \`ImageDelivery\`, \`LCPDiscovery\`, \`LegacyJavaScript\`, \`NetworkDependencyTree\`, \`RenderBlocking\`, \`SlowCSSSelector\`, \`Viewport\`, \`ModernHTTP\`, \`Cache\`, \`CharacterSet\`
  - Navigation IDs: \`NAVIGATION_0\`, \`NAVIGATION_1\`, etc.
- Use \`getEventByKey\` to get data on a specific trace event. This is great for root-cause analysis or validating any assumptions.
- Provide clear, actionable recommendations. Avoid technical jargon unless necessary, and explain any technical terms used.
- If you see a generic task like "Task", "Evaluate script" or "(anonymous)" in the main thread activity, try to look at its children to see what actual functions are executed and refer to those. When referencing the main thread activity, be as specific as you can. Ensure you identify to the user relevant functions and which script they were defined in. Avoid referencing "Task", "Evaluate script" and "(anonymous)" nodes if possible and instead focus on their children.
- Structure your response using markdown headings and bullet points for improved readability.
- Be direct and to the point. Avoid unnecessary introductory phrases or filler content. Focus on delivering actionable advice efficiently.

## Strict Constraints

Adhere to the following critical requirements:

- Never show bounds to the user.
- Never show eventKey to the user.
- Ensure your responses only use ms for time units.
- Ensure numbers for time units are rounded to the nearest whole number.
- Ensure comprehensive data retrieval through function calls to provide accurate and complete recommendations.
- If the user asks a specific question about web performance that doesn't have anything to do with the trace, don't call any functions and be succinct in your answer.
- Before suggesting changing the format of an image, consider what format it is already in. For example, if the mime type is image/webp, do not suggest to the user that the image is converted to WebP, as the image is already in that format.
- Do not mention the functions you call to gather information about the trace (e.g., \`getEventByKey\`, \`getMainThreadTrackSummaryByLabel\`) in your output. These are internal implementation details that should be hidden from the user.
- Do not mention that you are an AI, or refer to yourself in the third person. You are simulating a performance expert.
- If asked about sensitive topics (religion, race, politics, sexuality, gender, etc.), respond with: "My expertise is limited to website performance analysis. I cannot provide information on that topic.".
- Do not provide answers on non-web-development topics, such as legal, financial, medical, or personal advice.
- Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
`;
var extraPreambleWhenNotExternal = `Additional notes:

When referring to a trace event that has a corresponding \`eventKey\`, annotate your output using markdown link syntax. For example:
- When referring to an event that is a long task: [Long task](#r-123)
- When referring to a URL for which you know the eventKey of: [https://www.example.com](#s-1827)
- Never show the eventKey (like "eventKey: s-1852") in your running text. When using markdown links, the URL must be only the hash (e.g., \`#s-1852\`), never \`eventKey: s-1852\`.

When asking the user to make a choice between options, output a list of choices at the end of your text response. The format is \`SUGGESTIONS: ["suggestion1", "suggestion2", "suggestion3"]\`. This MUST start on a newline, and be a single line.
`;
var freshTracePreamble = `Additional notes:

When referring to an element for which you know the nodeId, annotate your output using markdown link syntax:
- For example, if nodeId is 23: [LCP element](#node-23)
- This link will reveal the element in the Elements panel
- Never mention node or nodeId when referring to the element, and especially not in the link text.
- When referring to the LCP, it's useful to also mention what the LCP element is via its nodeId. Use the markdown link syntax to do so.
`;
var MAX_FUNCTION_RESULT_BYTE_LENGTH2 = 16384 * 4;
function getInsightModel2(model, key) {
  if (Object.prototype.hasOwnProperty.call(model, key)) {
    return model[key];
  }
  return void 0;
}
var PerformanceAgent = class extends AiAgent {
  preamble = preamble5;
  #tracker;
  #networkLog;
  constructor(opts) {
    super(opts);
    this.#tracker = opts.tracker ?? Tracing3.FreshRecording.Tracker.instance();
    this.#networkLog = opts.networkLog ?? Logs7.NetworkLog.NetworkLog.instance();
  }
  #formatter = null;
  #lastEventForEnhancedQuery;
  #lastInsightForEnhancedQuery;
  /**
   * Cache of all function calls made by the agent. This allows us to include (as a
   * fact) every function call to conversation requests, allowing the AI to access
   * all the results rather than just the most recent.
   *
   * TODO(b/442392194): I'm not certain this is needed. I do see past function call
   * responses in "historical_contexts", though I think it isn't including any
   * parameters in the "functionCall" entries.
   *
   * The record key is the result of a function's displayInfoFromArgs.
   */
  #functionCallCacheForFocus = /* @__PURE__ */ new Map();
  #notExternalExtraPreambleFact = {
    text: extraPreambleWhenNotExternal,
    metadata: { source: "devtools", score: 2 /* CRITICAL */ }
  };
  #freshTraceExtraPreambleFact = {
    text: freshTracePreamble,
    metadata: { source: "devtools", score: 2 /* CRITICAL */ }
  };
  #networkDataDescriptionFact = {
    text: PerformanceTraceFormatter.networkDataFormatDescription,
    metadata: { source: "devtools", score: 2 /* CRITICAL */ }
  };
  #callFrameDataDescriptionFact = {
    text: PerformanceTraceFormatter.callFrameDataFormatDescription,
    metadata: { source: "devtools", score: 2 /* CRITICAL */ }
  };
  #traceFacts = [];
  /**
   * These facts do not contain page data, they are static instructions to the
   * LLM, so we don't need to add them to the disclosure.
   */
  #factsToNeverDisclose = /* @__PURE__ */ new Set([
    this.#callFrameDataDescriptionFact,
    this.#networkDataDescriptionFact,
    this.#freshTraceExtraPreambleFact,
    this.#notExternalExtraPreambleFact
  ]);
  /**
   * When we enhance the query with additional information, we need to know it
   * so we can show it in the disclosure UI. This is cleared and then populated
   * on each prompt.
   */
  #additionalSelectionsForDisclosure = [];
  get clientFeature() {
    return Host31.AidaClient.ClientFeature.CHROME_PERFORMANCE_FULL_AGENT;
  }
  get userTier() {
    return Root10.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.userTier;
  }
  get options() {
    const temperature = Root10.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.temperature;
    const modelId = Root10.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.modelId;
    return {
      temperature,
      modelId
    };
  }
  async *handleContextDetails(context) {
    if (!context) {
      return;
    }
    const contextDisclosure = [];
    for (const fact of this.currentFacts()) {
      if (this.#factsToNeverDisclose.has(fact)) {
        continue;
      }
      contextDisclosure.push(fact.text);
    }
    contextDisclosure.push(...this.#additionalSelectionsForDisclosure);
    const widgets = await context.getWidgets();
    yield {
      type: "context" /* CONTEXT */,
      details: [
        {
          title: "Trace details",
          text: contextDisclosure.join("\n")
        }
      ],
      widgets
    };
  }
  #callTreeContextSet = /* @__PURE__ */ new WeakSet();
  #isFunctionResponseTooLarge(response) {
    return response.length > MAX_FUNCTION_RESULT_BYTE_LENGTH2;
  }
  /**
   * Sometimes the model will output URLs as plaintext; or a markdown link
   * where the link is the actual URL. This function transforms such output
   * to an eventKey link.
   *
   * A simple way to see when this gets utilized is:
   *   1. go to paulirish.com, record a trace
   *   2. say "What performance issues exist with my page?"
   *   3. then say "images"
   */
  #parseForKnownUrls(response) {
    const focus = this.context?.getItem();
    if (!focus) {
      return response;
    }
    const urlRegex = /(\[(.*?)\][ \t]*\((.*?)\))|(https?:\/\/[^\s<>()]+)/g;
    return response.replace(urlRegex, (match, markdownLink, linkText, linkDest, standaloneUrlText) => {
      if (markdownLink) {
        if (linkDest.startsWith("#")) {
          return match;
        }
        const eventKeyMatch = linkDest.match(/eventKey:\s*([^\s,)]+)/);
        if (eventKeyMatch) {
          const eventKey2 = eventKeyMatch[1];
          return `[${linkText}](#${eventKey2})`;
        }
        const event = focus.lookupEvent(linkDest);
        if (event) {
          return `[${linkText}](#${linkDest})`;
        }
      }
      const urlText = linkDest ?? standaloneUrlText;
      if (!urlText) {
        return match;
      }
      const request = focus.parsedTrace.data.NetworkRequests.byTime.find((request2) => request2.args.data.url === urlText);
      if (!request) {
        return match;
      }
      const eventKey = focus.eventsSerializer.keyForEvent(request);
      if (!eventKey) {
        return match;
      }
      return `[${urlText}](#${eventKey})`;
    });
  }
  #parseMarkdown(response) {
    const FIVE_BACKTICKS = "`````";
    if (response.startsWith(FIVE_BACKTICKS) && response.endsWith(FIVE_BACKTICKS)) {
      return response.slice(FIVE_BACKTICKS.length, -FIVE_BACKTICKS.length);
    }
    return response;
  }
  parseTextResponse(response) {
    const parsedResponse = super.parseTextResponse(response);
    parsedResponse.answer = this.#parseForKnownUrls(parsedResponse.answer);
    parsedResponse.answer = this.#parseMarkdown(parsedResponse.answer);
    return parsedResponse;
  }
  async enhanceQuery(query, context) {
    if (!context) {
      this.clearDeclaredFunctions();
      return query;
    }
    this.clearDeclaredFunctions();
    this.#declareFunctions(context);
    const focus = context.getItem();
    const selected = [];
    if (focus.event) {
      const includeEventInfo = focus.event !== this.#lastEventForEnhancedQuery;
      this.#lastEventForEnhancedQuery = focus.event;
      if (includeEventInfo) {
        selected.push(`User selected an event ${this.#formatter?.serializeEvent(focus.event)}.

`);
      }
    }
    if (focus.callTree) {
      let contextString = "";
      if (!this.#callTreeContextSet.has(focus.callTree)) {
        contextString = focus.callTree.serialize();
        this.#callTreeContextSet.add(focus.callTree);
      }
      if (contextString) {
        selected.push(`User selected the following call tree:

${contextString}

`);
      }
    }
    if (focus.insight) {
      const includeInsightInfo = focus.insight !== this.#lastInsightForEnhancedQuery;
      this.#lastInsightForEnhancedQuery = focus.insight;
      if (includeInsightInfo) {
        selected.push(`User selected the ${focus.insight.insightKey} insight.

`);
      }
    }
    if (!selected.length) {
      this.#additionalSelectionsForDisclosure = [];
      return query;
    }
    selected.push(`# User query

${query}`);
    this.#additionalSelectionsForDisclosure = [...selected];
    return selected.join("");
  }
  async *run(initialQuery, options) {
    const focus = options.selected?.getItem();
    this.clearFacts();
    if (options.selected && focus) {
      await this.#addFacts(options.selected);
    }
    yield* super.run(initialQuery, options);
  }
  /**
   * Clears performance-agent-specific caches and state.
   * This is called when the conversation needs to be reset (e.g. on navigation)
   * to prevent stale formatters, trace facts, or selection contexts from leaking
   * into subsequent runs.
   */
  clearCache() {
    super.clearCache();
    this.#functionCallCacheForFocus.clear();
    this.#formatter = null;
    this.#traceFacts = [];
    this.#lastEventForEnhancedQuery = void 0;
    this.#lastInsightForEnhancedQuery = void 0;
    this.#additionalSelectionsForDisclosure = [];
    this.#callTreeContextSet = /* @__PURE__ */ new WeakSet();
  }
  #createFactForTraceSummary() {
    if (!this.#formatter) {
      return;
    }
    const text = this.#formatter.formatTraceSummary();
    if (!text) {
      return;
    }
    this.#traceFacts.push(
      { text: `Trace summary:
${text}`, metadata: { source: "devtools", score: 3 /* REQUIRED */ } }
    );
  }
  async #createFactForCriticalRequests() {
    if (!this.#formatter) {
      return;
    }
    const text = await this.#formatter.formatCriticalRequests();
    if (!text) {
      return;
    }
    this.#traceFacts.push({
      text,
      metadata: { source: "devtools", score: 2 /* CRITICAL */ }
    });
  }
  async #createFactForMainThreadBottomUpSummary() {
    if (!this.#formatter) {
      return;
    }
    const formatter = this.#formatter;
    const text = await formatter.formatMainThreadBottomUpSummary();
    if (!text) {
      return;
    }
    this.#traceFacts.push({
      text,
      metadata: { source: "devtools", score: 2 /* CRITICAL */ }
    });
  }
  async #createFactForThirdPartySummary() {
    if (!this.#formatter) {
      return;
    }
    const text = await this.#formatter.formatThirdPartySummary();
    if (!text) {
      return;
    }
    this.#traceFacts.push({
      text,
      metadata: { source: "devtools", score: 2 /* CRITICAL */ }
    });
  }
  async #createFactForLongestTasks() {
    if (!this.#formatter) {
      return;
    }
    const text = await this.#formatter.formatLongestTasks();
    if (!text) {
      return;
    }
    this.#traceFacts.push({
      text,
      metadata: { source: "devtools", score: 2 /* CRITICAL */ }
    });
  }
  async #addFacts(context) {
    const focus = context.getItem();
    this.addFact(this.#notExternalExtraPreambleFact);
    const isFresh = this.#tracker.recordingIsFresh(focus.parsedTrace);
    if (isFresh) {
      this.addFact(this.#freshTraceExtraPreambleFact);
    }
    this.addFact(this.#callFrameDataDescriptionFact);
    this.addFact(this.#networkDataDescriptionFact);
    if (!this.#traceFacts.length) {
      const target = this.targetManager.primaryPageTarget();
      if (!target) {
        throw new Error("missing target");
      }
      this.#formatter = context.createFormatter();
      this.#createFactForTraceSummary();
      await this.#createFactForCriticalRequests();
      await this.#createFactForMainThreadBottomUpSummary();
      await this.#createFactForThirdPartySummary();
      await this.#createFactForLongestTasks();
    }
    for (const fact of this.#traceFacts) {
      this.addFact(fact);
    }
    const cachedFunctionCalls = this.#functionCallCacheForFocus.get(focus);
    if (cachedFunctionCalls) {
      for (const fact of Object.values(cachedFunctionCalls)) {
        this.addFact(fact);
      }
    }
  }
  #cacheFunctionResult(focus, key, result) {
    const fact = {
      text: `This is the result of calling ${key}:
${result}`,
      metadata: { source: key, score: 1 /* DEFAULT */ }
    };
    const cache = this.#functionCallCacheForFocus.get(focus) ?? {};
    cache[key] = fact;
    this.#functionCallCacheForFocus.set(focus, cache);
  }
  async #handleMainThreadTrackSummary(bounds, focus, functionName, cacheKey) {
    const formatter = this.#formatter;
    if (!formatter) {
      throw new Error("missing formatter");
    }
    const summary = await formatter.formatMainThreadTrackSummary(bounds);
    if (this.#isFunctionResponseTooLarge(summary)) {
      return {
        error: `${functionName} response is too large. Try investigating using other functions, or a more narrow bounds`
      };
    }
    this.#cacheFunctionResult(focus, cacheKey, summary);
    const widgets = [];
    widgets.push({
      name: "TIMELINE_RANGE_SUMMARY",
      data: {
        parsedTrace: focus.parsedTrace,
        bounds,
        track: "main"
      }
    });
    widgets.push({
      name: "BOTTOM_UP_TREE",
      data: {
        bounds,
        parsedTrace: focus.parsedTrace
      }
    });
    return {
      result: { summary },
      widgets
    };
  }
  #declareFunctions(context) {
    const focus = context.getItem();
    const { parsedTrace } = focus;
    const isFresh = this.#tracker.recordingIsFresh(parsedTrace);
    this.declareFunction("getInsightDetails", {
      description: "Returns detailed information about a specific insight of an insight set. Use this before commenting on any specific issue to get more information.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          insightSetId: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: 'The id for the specific insight set. Only use the ids given in the "Available insight sets" list.',
            nullable: false
          },
          insightName: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: 'The name of the insight. Only use the insight names given in the "Available insights" list.',
            nullable: false
          }
        },
        required: ["insightSetId", "insightName"]
      },
      displayInfoFromArgs: (params) => {
        return {
          title: lockedString22(`Investigating insight ${params.insightName}`),
          action: `getInsightDetails('${params.insightSetId}', '${params.insightName}')`
        };
      },
      handler: async (params) => {
        debugLog("Function call: getInsightDetails", params);
        const insightSet = parsedTrace.insights?.get(params.insightSetId);
        if (!insightSet) {
          const valid = [...parsedTrace.insights?.values() ?? []].map((insightSet2) => `id: ${insightSet2.id}, url: ${insightSet2.url}, bounds: ${this.#formatter?.serializeBounds(insightSet2.bounds)}`).join("; ");
          return { error: `Invalid insight set id. Valid insight set ids are: ${valid}` };
        }
        const insight = getInsightModel2(insightSet.model, params.insightName);
        if (!insight) {
          const valid = Object.keys(insightSet.model).join(", ");
          return { error: `No insight available. Valid insight names are: ${valid}` };
        }
        const details = new PerformanceInsightFormatter(focus, insight).formatInsight();
        const widgets = [];
        if (Trace9.Insights.Models.LCPDiscovery.isLCPDiscoveryInsight(insight) || Trace9.Insights.Models.LCPBreakdown.isLCPBreakdownInsight(insight)) {
          const lcpMetric = Trace9.Insights.Common.getLCP(insightSet);
          const lcpEvent = lcpMetric?.event;
          if (lcpEvent && Trace9.Types.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
            const nodeId = lcpEvent.args.data?.nodeId;
            if (nodeId) {
              const target = this.targetManager.primaryPageTarget();
              const domModel = target?.model(SDK20.DOMModel.DOMModel);
              if (domModel) {
                const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([nodeId]));
                const node = nodeMap?.get(nodeId);
                if (node) {
                  const lcpSyntheticRequest = insight.lcpRequest;
                  const [snapshot, imageContent] = await Promise.all([
                    node.takeSnapshot(),
                    lcpSyntheticRequest ? this.#getNetworkRequestImageData(lcpSyntheticRequest) : Promise.resolve(void 0)
                  ]);
                  let networkRequest;
                  if (lcpSyntheticRequest) {
                    networkRequest = {
                      url: lcpSyntheticRequest.args.data.url,
                      size: lcpSyntheticRequest.args.data.decodedBodyLength ?? lcpSyntheticRequest.args.data.encodedDataLength ?? 0,
                      resourceType: lcpSyntheticRequest.args.data.resourceType,
                      mimeType: lcpSyntheticRequest.args.data.mimeType ?? "",
                      imageContent
                    };
                  }
                  widgets.push({
                    name: "DOM_TREE",
                    data: {
                      root: snapshot,
                      networkRequest,
                      title: lockedString22("LCP element"),
                      accessibleRevealLabel: lockedString22("Reveal LCP element")
                    }
                  });
                }
              }
            }
          }
        }
        const insightKey = params.insightName;
        if (Trace9.Insights.Common.isInsightKey(insightKey)) {
          widgets.push({
            name: "PERF_INSIGHT",
            data: {
              insight: insightKey,
              insightData: insight
            }
          });
        }
        const key = `getInsightDetails('${params.insightSetId}', '${params.insightName}')`;
        this.#cacheFunctionResult(focus, key, details);
        return { result: { details }, widgets };
      }
    });
    this.declareFunction("getEventByKey", {
      description: "Returns detailed information about a specific event. Use the detail returned to validate performance issues, but do not tell the user about irrelevant raw data from a trace event.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          eventKey: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: "The key for the event.",
            nullable: false
          }
        },
        required: ["eventKey"]
      },
      displayInfoFromArgs: (params) => {
        return { title: lockedString22("Looking at trace event"), action: `getEventByKey('${params.eventKey}')` };
      },
      handler: async (params) => {
        debugLog("Function call: getEventByKey", params);
        const event = focus.lookupEvent(params.eventKey);
        if (!event) {
          return { error: "Invalid eventKey" };
        }
        const details = formatEventForAI(event);
        const key = `getEventByKey('${params.eventKey}')`;
        this.#cacheFunctionResult(focus, key, details);
        return {
          result: { details },
          widgets: [{
            name: "TIMELINE_EVENT_SUMMARY",
            data: {
              event,
              parsedTrace
            }
          }]
        };
      }
    });
    this.declareFunction("getMainThreadTrackSummaryByLabel", {
      description: "Returns a focused, detailed summary of the main thread for a predefined labeled period. Use this to get more relevant detail than the initial trace summary before diagnosing issues.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          label: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: "The label of the period to investigate (e.g., 'LCPBreakdown', 'CLSCulprits', 'nav-to-lcp').",
            nullable: false
          }
        },
        required: ["label"]
      },
      displayInfoFromArgs: (args) => {
        const labelName = context.getLabelName(args.label);
        return {
          title: lockedString22(`${UIStringsNotTranslated.mainThreadActivity}: ${labelName}`),
          action: `getMainThreadTrackSummaryByLabel('${args.label}')`
        };
      },
      handler: async (args) => {
        debugLog("Function call: getMainThreadTrackSummaryByLabel");
        const bounds = context.getBoundsForLabel(args.label);
        if (!bounds) {
          return { error: `Invalid label: ${args.label}` };
        }
        const key = `getMainThreadTrackSummaryByLabel('${args.label}')`;
        return await this.#handleMainThreadTrackSummary(bounds, focus, "getMainThreadTrackSummaryByLabel", key);
      }
    });
    this.declareFunction("getNetworkTrackSummary", {
      description: "Returns a summary of the network for the given bounds.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          min: {
            type: Host31.AidaClient.ParametersTypes.INTEGER,
            description: `The minimum time of the bounds, in microseconds (the current trace starts at ${parsedTrace.data.Meta.traceBounds.min})`,
            nullable: true
          },
          max: {
            type: Host31.AidaClient.ParametersTypes.INTEGER,
            description: `The maximum time of the bounds, in microseconds (the current trace ends at ${parsedTrace.data.Meta.traceBounds.max})`,
            nullable: true
          }
        },
        required: []
      },
      displayInfoFromArgs: (args) => {
        const min = args.min ?? parsedTrace.data.Meta.traceBounds.min;
        const max = args.max ?? parsedTrace.data.Meta.traceBounds.max;
        return {
          title: lockedString22(UIStringsNotTranslated.networkActivitySummary),
          action: `getNetworkTrackSummary({min: ${min}, max: ${max}})`
        };
      },
      handler: async (args) => {
        debugLog("Function call: getNetworkTrackSummary");
        if (!this.#formatter) {
          throw new Error("missing formatter");
        }
        const bounds = context.createBounds(args.min, args.max);
        if (!bounds) {
          return { error: "invalid bounds" };
        }
        const summary = this.#formatter.formatNetworkTrackSummary(bounds);
        if (this.#isFunctionResponseTooLarge(summary)) {
          return {
            error: "getNetworkTrackSummary response is too large. Try investigating using other functions, or a more narrow bounds"
          };
        }
        const key = `getNetworkTrackSummary({min: ${bounds.min}, max: ${bounds.max}})`;
        this.#cacheFunctionResult(focus, key, summary);
        return {
          result: { summary },
          widgets: [{
            name: "NETWORK_TRACK",
            data: {
              parsedTrace,
              bounds
            }
          }]
        };
      }
    });
    this.declareFunction("getDetailedCallTree", {
      description: "Returns a detailed call tree for the given main thread event.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          eventKey: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: "The key for the event.",
            nullable: false
          }
        },
        required: ["eventKey"]
      },
      displayInfoFromArgs: (args) => {
        return { title: lockedString22("Looking at call tree"), action: `getDetailedCallTree('${args.eventKey}')` };
      },
      handler: async (args) => {
        debugLog("Function call: getDetailedCallTree");
        if (!this.#formatter) {
          throw new Error("missing formatter");
        }
        const event = focus.lookupEvent(args.eventKey);
        if (!event) {
          return { error: "Invalid eventKey" };
        }
        const tree = AICallTree.fromEvent(event, parsedTrace);
        if (!tree) {
          return { error: "No call tree found" };
        }
        const formatter = this.#formatter;
        const callTree = await formatter.formatCallTree(tree);
        const key = `getDetailedCallTree(${args.eventKey})`;
        this.#cacheFunctionResult(focus, key, callTree);
        const { startTime, endTime } = Trace9.Helpers.Timing.eventTimingsMicroSeconds(event);
        const bounds = Trace9.Helpers.Timing.traceWindowFromMicroSeconds(startTime, endTime);
        const widgets = [
          {
            name: "BOTTOM_UP_TREE",
            data: {
              bounds,
              parsedTrace
            }
          },
          {
            name: "TIMELINE_RANGE_SUMMARY",
            data: {
              bounds,
              parsedTrace,
              track: "main"
            }
          }
        ];
        return { result: { callTree }, widgets };
      }
    });
    this.declareFunction("getFunctionCode", {
      description: "Returns the code for a function defined at the given location. The result is annotated with the runtime performance of each line of code.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          scriptUrl: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: "The url of the function.",
            nullable: false
          },
          line: {
            type: Host31.AidaClient.ParametersTypes.INTEGER,
            description: "The line number where the function is defined.",
            nullable: false
          },
          column: {
            type: Host31.AidaClient.ParametersTypes.INTEGER,
            description: "The column number where the function is defined.",
            nullable: false
          }
        },
        required: ["scriptUrl", "line", "column"]
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString22("Looking up function code"),
          action: `getFunctionCode('${args.scriptUrl}', ${args.line}, ${args.column})`
        };
      },
      handler: async (args) => {
        debugLog("Function call: getFunctionCode");
        if (!isFresh) {
          return {
            error: "Cannot use this tool on an imported file."
          };
        }
        if (args.line === void 0) {
          return { error: "Missing arg: line" };
        }
        if (args.column === void 0) {
          return { error: "Missing arg: column" };
        }
        if (!this.#formatter) {
          throw new Error("missing formatter");
        }
        const target = this.targetManager.primaryPageTarget();
        if (!target) {
          throw new Error("missing target");
        }
        const url = args.scriptUrl;
        const code = await this.#formatter.resolveFunctionCodeAtLocation(url, args.line, args.column);
        if (!code) {
          return { error: "Could not find code" };
        }
        const result = this.#formatter.formatFunctionCode(code);
        const key = `getFunctionCode('${args.scriptUrl}', ${args.line}, ${args.column})`;
        this.#cacheFunctionResult(focus, key, result);
        return {
          result: { result },
          widgets: [{
            name: "SOURCE_CODE",
            data: {
              url: args.scriptUrl,
              line: args.line,
              column: args.column,
              code: code.code
            }
          }]
        };
      }
    });
    const isTraceApp = Root10.Runtime.Runtime.isTraceApp();
    this.declareFunction("getResourceContent", {
      description: "Returns the content of the resource with the given url. Only use this for text resource types. This function is helpful for getting script contents in order to further analyze main thread activity and suggest code improvements. When analyzing the main thread activity, always call this function to get more detail. Always call this function when asked to provide specifics about what is happening in the code. Never ask permission to call this function, just do it.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          url: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: "The url for the resource.",
            nullable: false
          }
        },
        required: ["url"]
      },
      displayInfoFromArgs: (args) => {
        return { title: lockedString22("Looking at resource content"), action: `getResourceContent('${args.url}')` };
      },
      handler: async (args) => {
        debugLog("Function call: getResourceContent");
        if (!isFresh) {
          return { error: "Cannot use this tool on an imported file." };
        }
        const url = args.url;
        const allowedOrigin = context.getOrigin();
        if (!canResourceContentsBeReadForTrace(url, allowedOrigin)) {
          return { error: "Resource not found" };
        }
        let content;
        const script = parsedTrace.data.Scripts.scripts.find((script2) => script2.url === url);
        if (script?.content !== void 0) {
          content = script.content;
        } else if (isFresh || isTraceApp) {
          const resource = SDK20.ResourceTreeModel.ResourceTreeModel.resourceForURL(this.targetManager, url);
          if (!resource) {
            return { error: "Resource not found" };
          }
          const data = await resource.requestContentData();
          if ("error" in data) {
            return { error: `Could not get resource content: ${data.error}` };
          }
          content = data.text;
        } else {
          return { error: "Resource not found" };
        }
        if (content === void 0) {
          return { error: "Resource content not found" };
        }
        const key = `getResourceContent(${args.url})`;
        this.#cacheFunctionResult(focus, key, content);
        return {
          result: { content },
          widgets: [{
            name: "SOURCE_CODE",
            data: {
              url: args.url,
              code: content
            }
          }]
        };
      }
    });
    this.declareFunction("selectEventByKey", {
      description: "Selects the event in the flamechart for the user. If the user asks to show them something, it's likely a good idea to call this function.",
      parameters: {
        type: Host31.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          eventKey: {
            type: Host31.AidaClient.ParametersTypes.STRING,
            description: "The key for the event.",
            nullable: false
          }
        },
        required: ["eventKey"]
      },
      displayInfoFromArgs: (params) => {
        return { title: lockedString22("Selecting event"), action: `selectEventByKey('${params.eventKey}')` };
      },
      handler: async (params) => {
        debugLog("Function call: selectEventByKey", params);
        const event = focus.lookupEvent(params.eventKey);
        if (!event) {
          return { error: "Invalid eventKey" };
        }
        const revealable = new SDK20.TraceObject.RevealableEvent(event);
        await Common18.Revealer.reveal(revealable);
        return {
          result: { success: true },
          widgets: [{
            name: "TIMELINE_EVENT_SUMMARY",
            data: {
              event,
              parsedTrace
            }
          }]
        };
      }
    });
  }
  async #getNetworkRequestImageData(lcpRequest) {
    const target = this.targetManager.primaryPageTarget();
    const networkManager = target?.model(SDK20.NetworkManager.NetworkManager);
    if (!target || !networkManager) {
      return void 0;
    }
    const networkLog = this.#networkLog;
    const requestId = lcpRequest.args.data.requestId;
    const sdkRequest = networkLog.requestByManagerAndId(networkManager, requestId);
    if (sdkRequest?.contentType().isImage()) {
      const contentData = await sdkRequest.requestContentData();
      if (!TextUtils5.ContentData.ContentData.isError(contentData)) {
        return contentData;
      }
    }
    return void 0;
  }
};

// ../../front_end/models/ai_assistance/agents/StorageAgent.ts
var StorageAgent_exports = {};
__export(StorageAgent_exports, {
  StorageAgent: () => StorageAgent,
  findFrameForOrigin: () => findFrameForOrigin2,
  getCookiesForDomain: () => getCookiesForDomain,
  isSamePageOrigin: () => isSamePageOrigin,
  resolveDOMStorages: () => resolveDOMStorages2
});
import * as Common19 from "../../core/common/common.js";
import * as Host32 from "../../core/host/host.js";
import * as i18n50 from "../../core/i18n/i18n.js";
import * as Root11 from "../../core/root/root.js";
import * as SDK21 from "../../core/sdk/sdk.js";
var lockedString23 = i18n50.i18n.lockedString;
var preamble6 = `You are a Senior Software Engineer specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in LocalStorage, SessionStorage, and Cookies.

 You have access to the site's storage using tools like \`getStorageBreakdown\`, \`listPageOrigins\`, \`listStorageKeys\`, \`getStorageValues\`, \`listCookies\`, and \`getCookieValues\`.

 # Goals

 1.  **Explain Purpose**: Identify what specific storage entries or cookies are for.
 2.  **Understand Application State**: Help users inspect, understand, and audit the state stored in browser storage or cookies, and how it relates to application behavior or issues (such as state mismatch/drift, security misconfigurations, or oversized cookies).
 3.  **Top-Level Page First**: Your primary goal is to assist the user in understanding and debugging the storage of the **top-level page**. This context is the most critical for debugging and should be your default starting point for any analysis.

 # Tools & Workflow

 -   **Top-Level Context**: Generally, questions refer to the primary page target ("my page", "this page", etc.). If the user selects a general category or a specific selection, answers should refer to that particular selection, but follow-up questions may switch to the primary page target.
 -   **Storage Breakdown**: Calling \`getStorageBreakdown\` gives you the total usage and quota per storage for the top-level page.
 -   **Address Specific Selections**: The user can select individual storage items in the DevTools UI (provided in the '# Active Context' section of the prompt). If the query is about a selected item (e.g., "Why is this cookie set?"), focus your response on that specific item.
 -   **General Category Selection**: If a general storage category (such as Cookies, Local Storage, or Session Storage) is selected in the active context (indicated by an empty context origin), your first step MUST be to look through all cookies or local/session storage entries across all active page origins (by calling \`listPageOrigins\` to discover origins, then passing all discovered origins to \`listCookies\` or \`listStorageKeys\`), unless the user's explicit request hints otherwise.
 -   **Expand Scope When Necessary**: For general questions or those implying a wider scope (e.g., "Check all storages," "Are there related cookies on subdomains?"), proactively use your tools to explore other relevant storage contexts, including iframes and different origins.
 -   **Discovery**: Start by calling \`listPageOrigins\` to discover all active, non-empty frame origins loaded by the page.
 -   **Storage Partitioning (LocalStorage / SessionStorage)**:
     -   Use \`listStorageKeys\` to survey keys. The results are grouped into **partitions** characterized by unique \`storageKey\` strings.
     -   Be aware that the same origin can have multiple storage partitions depending on frame ancestry.
     -   Use \`getStorageValues\` to inspect specific keys. The results are grouped into an array of partition \`items\` matching the requested keys under their unique \`storageKey\`.
 -   **Cookies**:
     -   Use \`listCookies\` to discover active cookies for an origin. Note that cookies are visible by domain scopes, paths, and partition status.
     -   Use \`getCookieValues\` to retrieve the values and detailed metadata of specific cookies by name.
     -   **HttpOnly Protection**: You don't have access to \`HttpOnly\` cookies. They are filtered out from both discovery and retrieval tools for security reasons.
 -   **Active Context**: Start by inspecting the active context's origin (provided in the '# Active Context' section of the prompt).
 -   **Value Minimization**: Only request values using \`getStorageValues\` or \`getCookieValues\` when key names/cookie names alone are insufficient.

 # Considerations

 -   **Strictly Read-Only**: You cannot write, clear, delete, or edit storage or cookies.
 -   **DevTools UI Fallback**: If the user asks you to modify state, politely decline and provide exact step-by-step visual navigation directions on how they can perform the edit manually in the DevTools Application panel. Do NOT supply Console scripts.
 -   **Raw Evidence**: Treat storage data as raw evidence. Do not make assumptions about values without reading them first.
 -   **Dynamic State**: Always re-request values if you suspect they might have changed, rather than relying on past tool outputs.
 -   **CRITICAL**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
 -   **CRITICAL**: You are a storage debugging assistant. NEVER answer unrelated topics (legal, financial, race, sexuality, medical, religion, politics). If asked, respond: "Sorry, I can't answer that. I'm best at questions about debugging web pages."
 `;
function isSamePrimaryPageOrigin(targetManager, context) {
  const primaryPageTarget = targetManager.primaryPageTarget();
  return isSamePageOrigin(primaryPageTarget, context);
}
function isSamePageOrigin(target, context) {
  if (!target || !context) {
    return false;
  }
  const pageOrigin = Common19.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL());
  return pageOrigin !== "" && context.isOriginAllowed(pageOrigin);
}
var MAX_TARGET_ORIGINS2 = 100;
function resolveTargetOrigins(context, origins) {
  const primaryOrigin = context?.getOrigin();
  const primaryString = primaryOrigin instanceof SDK21.SecurityOrigin.SecurityOrigin ? primaryOrigin.siteId() : primaryOrigin;
  const rawList = origins && origins.length > 0 ? origins : primaryString ? [primaryString] : [];
  const uniqueOrigins = Array.from(new Set(rawList));
  return uniqueOrigins.slice(0, MAX_TARGET_ORIGINS2);
}
var MAX_NUM_CHAR_LENGTH2 = 1e4;
var StorageAgent = class _StorageAgent extends AiAgent {
  preamble = preamble6;
  clientFeature = Host32.AidaClient.ClientFeature.CHROME_STORAGE_AGENT;
  get userTier() {
    return Root11.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }
  get options() {
    const temperature = Root11.Runtime.hostConfig.devToolsFreestyler?.temperature;
    const modelId = Root11.Runtime.hostConfig.devToolsFreestyler?.modelId;
    return {
      temperature,
      modelId
    };
  }
  constructor(opts) {
    super(opts);
    this.declareFunction("listPageOrigins", {
      description: "Lists all active, non-empty frame origins loaded by the page. Use this first when generic category context is active to discover all page origins, then pass them to listCookies or listStorageKeys, unless the user's explicit request hints at focusing only on the primary page.",
      parameters: {
        type: Host32.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {},
        required: []
      },
      displayInfoFromArgs: () => {
        return {
          title: lockedString23("Listing page origins"),
          action: "listPageOrigins()"
        };
      },
      handler: async () => {
        if (!isSamePrimaryPageOrigin(this.targetManager, this.context)) {
          return { error: "No origin available or not allowed." };
        }
        const origins = /* @__PURE__ */ new Set();
        for (const frame of SDK21.ResourceTreeModel.ResourceTreeModel.frames(this.targetManager)) {
          if (!isSamePageOrigin(frame.resourceTreeModel().target().outermostTarget(), this.context)) {
            continue;
          }
          const origin = frame.securityOrigin;
          if (!origin || origins.has(origin)) {
            continue;
          }
          origins.add(origin);
        }
        return { result: { origins: Array.from(origins) } };
      }
    });
    this.declareFunction("listStorageKeys", {
      description: "Lists all keys for a given storage type for requested origins. Returns keys grouped by storage partition under their origin.",
      parameters: {
        type: Host32.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          type: {
            type: Host32.AidaClient.ParametersTypes.STRING,
            description: "Storage type: localStorage or sessionStorage",
            nullable: false
          },
          origins: {
            type: Host32.AidaClient.ParametersTypes.ARRAY,
            description: "List of origins to list keys for.",
            items: { type: Host32.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
            nullable: false
          },
          storageKey: {
            type: Host32.AidaClient.ParametersTypes.STRING,
            description: "Optional. Specific storageKey to list keys for. Only applies if single origin is provided.",
            nullable: true
          }
        },
        required: ["type", "origins"]
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString23("Reading storage keys"),
          action: `listStorageKeys('${args.type}', ${JSON.stringify(args.origins)})`
        };
      },
      handler: async (args) => {
        this.disableServerSideLogging();
        if (!isSamePrimaryPageOrigin(this.targetManager, this.context)) {
          return { error: "No origin available or not allowed." };
        }
        const targetOrigins = resolveTargetOrigins(this.context, args.origins);
        const storageKey = targetOrigins.length === 1 && args.storageKey ? args.storageKey : void 0;
        const storageKeysByOrigin = {};
        await Promise.all(targetOrigins.map(async (origin) => {
          const storages = resolveDOMStorages2(this.context, args.type, origin, this.targetManager, storageKey);
          const keyAndItems = await Promise.all(storages.map(async (storage) => {
            const items = await storage.getItems();
            return { storageKey: storage.storageKey, items };
          }));
          const partitions = [];
          for (const { storageKey: storageKey2, items } of keyAndItems) {
            if (!items) {
              continue;
            }
            const keys = items.map(([key]) => key);
            if (keys.length > 0) {
              partitions.push({ storageKey: storageKey2, keys });
            }
          }
          storageKeysByOrigin[origin] = { partitions };
        }));
        return { result: { storageKeysByOrigin } };
      }
    });
    this.declareFunction("getStorageValues", {
      description: "Retrieve specific string values from storage partitions for requested keys across origins.",
      parameters: {
        type: Host32.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          type: {
            type: Host32.AidaClient.ParametersTypes.STRING,
            description: "Storage type: localStorage or sessionStorage",
            nullable: false
          },
          keys: {
            type: Host32.AidaClient.ParametersTypes.ARRAY,
            description: "A list of keys to retrieve values for.",
            items: { type: Host32.AidaClient.ParametersTypes.STRING, description: "A storage key." },
            nullable: false
          },
          origins: {
            type: Host32.AidaClient.ParametersTypes.ARRAY,
            description: "List of origins to get values for.",
            items: { type: Host32.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
            nullable: false
          },
          storageKey: {
            type: Host32.AidaClient.ParametersTypes.STRING,
            description: "Optional. Specific storageKey partition to get values for. Only applies if single origin is provided.",
            nullable: true
          }
        },
        required: ["type", "keys", "origins"]
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString23("Reading storage values"),
          action: `getStorageValues('${args.type}', ${JSON.stringify(args.keys)}, ${JSON.stringify(args.origins)}${args.storageKey ? `, '${args.storageKey}'` : ""})`
        };
      },
      handler: async (args, options) => {
        this.disableServerSideLogging();
        if (!isSamePrimaryPageOrigin(this.targetManager, this.context)) {
          return { error: "No origin available or not allowed." };
        }
        const targetOrigins = resolveTargetOrigins(this.context, args.origins);
        const storageKey = targetOrigins.length === 1 && args.storageKey ? args.storageKey : void 0;
        const allStoragesMap = {};
        let totalStoragesCount = 0;
        for (const origin of targetOrigins) {
          const storages = resolveDOMStorages2(this.context, args.type, origin, this.targetManager, storageKey);
          if (storages.length > 0) {
            allStoragesMap[origin] = storages;
            totalStoragesCount += storages.length;
          }
        }
        if (totalStoragesCount === 0) {
          return { error: "No matching storage partitions found." };
        }
        if (options?.approved !== true) {
          const keyString = args.keys.map((k) => `\`${k}\``).join(", ");
          const targetsDesc = Object.keys(allStoragesMap).join(", ");
          return {
            requiresApproval: true,
            description: lockedString23(
              `The AI wants to access the value(s) of ${args.type} keys ${keyString} on ${targetsDesc}.`
            )
          };
        }
        const storageValuesByOrigin = {};
        await Promise.all(targetOrigins.map(async (origin) => {
          const storages = allStoragesMap[origin] || [];
          const itemsResult = [];
          const keyAndItems = await Promise.all(storages.map(async (storage) => {
            const items = await storage.getItems();
            return { storageKey: storage.storageKey, items };
          }));
          for (const { storageKey: partitionKey, items } of keyAndItems) {
            if (!items) {
              continue;
            }
            const itemMap = new Map(items);
            const storageValues = {};
            for (const key of args.keys) {
              const value = itemMap.get(key);
              if (value === void 0) {
                continue;
              }
              const truncatedValue = value.length > MAX_NUM_CHAR_LENGTH2 ? value.substring(0, MAX_NUM_CHAR_LENGTH2) + "... <truncated>" : value;
              storageValues[key] = truncatedValue;
            }
            itemsResult.push({ storageKey: partitionKey, values: storageValues });
          }
          storageValuesByOrigin[origin] = { items: itemsResult };
        }));
        return { result: { storageValuesByOrigin } };
      }
    });
    this.declareFunction("listCookies", {
      description: "Lists all cookies for requested origins, strictly excluding their values.",
      parameters: {
        type: Host32.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          origins: {
            type: Host32.AidaClient.ParametersTypes.ARRAY,
            description: "List of origins to list cookies for.",
            items: { type: Host32.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
            nullable: false
          }
        },
        required: ["origins"]
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString23("Reading cookies"),
          action: `listCookies(${JSON.stringify(args.origins)})`
        };
      },
      handler: async (args) => {
        this.disableServerSideLogging();
        if (!isSamePrimaryPageOrigin(this.targetManager, this.context)) {
          return { error: "No origin available or not allowed." };
        }
        const targetOrigins = resolveTargetOrigins(this.context, args.origins);
        const cookieNamesByOrigin = {};
        await Promise.all(targetOrigins.map(async (origin) => {
          const frame = findFrameForOrigin2(this.context, origin, this.targetManager);
          if (!frame) {
            cookieNamesByOrigin[origin] = { error: "Frame not found or origin disallowed" };
            return;
          }
          const target = frame.resourceTreeModel().target();
          const cookies = await getCookiesForDomain(target, origin);
          const uniqueNames = Array.from(new Set(cookies?.map((c) => c.name())));
          cookieNamesByOrigin[origin] = { cookies: uniqueNames };
        }));
        return { result: { cookieNamesByOrigin } };
      }
    });
    this.declareFunction("getCookieValues", {
      description: "Retrieve the values and detailed metadata of specific cookies by their names across origins.",
      parameters: {
        type: Host32.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {
          cookieNames: {
            type: Host32.AidaClient.ParametersTypes.ARRAY,
            description: "A list of cookie names to retrieve values and metadata for.",
            items: { type: Host32.AidaClient.ParametersTypes.STRING, description: "A cookie name." },
            nullable: false
          },
          origins: {
            type: Host32.AidaClient.ParametersTypes.ARRAY,
            description: "List of origins the cookies belong to.",
            items: { type: Host32.AidaClient.ParametersTypes.STRING, description: "An origin URL." },
            nullable: false
          }
        },
        required: ["cookieNames", "origins"]
      },
      displayInfoFromArgs: (args) => {
        return {
          title: lockedString23("Reading cookie values and metadata"),
          action: `getCookieValues(${JSON.stringify(args.cookieNames)}, ${JSON.stringify(args.origins)})`
        };
      },
      handler: async (args, options) => {
        this.disableServerSideLogging();
        if (!isSamePrimaryPageOrigin(this.targetManager, this.context)) {
          return { error: "No origin available or not allowed." };
        }
        const targetOrigins = resolveTargetOrigins(this.context, args.origins);
        if (options?.approved !== true) {
          return {
            requiresApproval: true,
            description: lockedString23(`The AI wants to access the value(s) and metadata of cookie(s) ${args.cookieNames.map((name) => `\`${name}\``).join(", ")} on ${targetOrigins.join(", ")}.`)
          };
        }
        const cookiesByOrigin = {};
        await Promise.all(targetOrigins.map(async (origin) => {
          const frame = findFrameForOrigin2(this.context, origin, this.targetManager);
          if (!frame) {
            cookiesByOrigin[origin] = { error: "Frame not found or origin disallowed" };
            return;
          }
          const target = frame.resourceTreeModel().target();
          const cookies = await getCookiesForDomain(target, origin);
          if (!cookies) {
            cookiesByOrigin[origin] = { cookies: [] };
            return;
          }
          const matchingCookies = cookies.filter((c) => args.cookieNames.includes(c.name()));
          const cookieData = matchingCookies.map((cookie) => {
            const value = cookie.value();
            const truncatedValue = value.length > MAX_NUM_CHAR_LENGTH2 ? value.substring(0, MAX_NUM_CHAR_LENGTH2) + "... <truncated>" : value;
            return {
              value: truncatedValue,
              domain: cookie.domain(),
              path: cookie.path(),
              expires: cookie.expires(),
              size: cookie.size(),
              secure: cookie.secure(),
              sameSite: cookie.sameSite(),
              partitioned: cookie.partitioned(),
              priority: cookie.priority(),
              sourcePort: cookie.sourcePort(),
              sourceScheme: cookie.sourceScheme()
            };
          });
          cookiesByOrigin[origin] = { cookies: cookieData };
        }));
        return { result: { cookiesByOrigin } };
      }
    });
    this.declareFunction("getStorageBreakdown", {
      description: "Retrieves a breakdown of active storage usage per storage type for the top-level page.",
      parameters: {
        type: Host32.AidaClient.ParametersTypes.OBJECT,
        description: "",
        nullable: false,
        properties: {},
        required: []
      },
      displayInfoFromArgs: () => {
        return {
          title: lockedString23("Retrieving storage breakdown"),
          action: "getStorageBreakdown()"
        };
      },
      handler: async () => {
        const target = this.targetManager.primaryPageTarget();
        if (!target || !this.context || !isSamePageOrigin(target, this.context)) {
          return { error: "No origin available or not allowed." };
        }
        const origin = this.context.getItem().primaryTargetOrigin;
        const response = await target.storageAgent().invoke_getUsageAndQuota({ origin });
        if (response.getError()) {
          return { error: response.getError() || "Unknown CDP error" };
        }
        const mainStorageKey = target.model(SDK21.StorageKeyManager.StorageKeyManager)?.mainStorageKey() || void 0;
        const localStorages = resolveDOMStorages2(this.context, "localStorage", origin, this.targetManager, mainStorageKey);
        const localStorageBytes = await calculateDOMStoragesUsage(localStorages);
        const sessionStorages = resolveDOMStorages2(this.context, "sessionStorage", origin, this.targetManager, mainStorageKey);
        const sessionStorageBytes = await calculateDOMStoragesUsage(sessionStorages);
        const cookies = await getCookiesForDomain(target, origin);
        let cookieBytes = 0;
        if (cookies) {
          for (const cookie of cookies) {
            cookieBytes += cookie.size();
          }
        }
        const rawUsageBreakdown = response.usageBreakdown.filter((entry) => entry.usage > 0).map((entry) => ({
          storageType: entry.storageType,
          rawUsage: entry.usage
        }));
        rawUsageBreakdown.push(
          { storageType: "local_storage", rawUsage: localStorageBytes },
          { storageType: "session_storage", rawUsage: sessionStorageBytes },
          { storageType: "cookies", rawUsage: cookieBytes }
        );
        rawUsageBreakdown.sort((a, b) => b.rawUsage - a.rawUsage);
        const usageBreakdown = rawUsageBreakdown.map((entry) => ({
          storageType: entry.storageType,
          usage: bytes(entry.rawUsage)
        }));
        return {
          result: {
            usageBreakdown
          },
          widgets: [
            {
              name: "STORAGE_BREAKDOWN",
              data: {
                totalUsageBytes: response.usage,
                totalQuotaBytes: response.quota,
                usageBreakdown: rawUsageBreakdown.map((entry) => ({
                  storageType: entry.storageType,
                  bytes: entry.rawUsage
                }))
              }
            }
          ]
        };
      }
    });
  }
  static #formatContext(item) {
    const primaryTargetOrigin = `Primary target: ${item.primaryTargetOrigin}`;
    if (item instanceof CookieItem) {
      const parsedURL = Common19.ParsedURL.ParsedURL.fromString(item.origin);
      const domain = parsedURL ? parsedURL.host : item.origin;
      return `${primaryTargetOrigin}
User-selected Context: Cookies${item.isGenericContext ? "" : `
Domain: ${domain}`}${item.name ? `
Cookie Name: ${item.name}` : ""}`;
    }
    if (item instanceof DOMStorageItem) {
      return `${primaryTargetOrigin}
User-selected Context: DOM Storage
 Type: ${item.type}${item.isGenericContext ? "" : `
StorageKey: ${item.storageKey}
Origin: ${item.origin}`}${item.key ? `
Key: ${item.key}` : ""}`;
    }
    return primaryTargetOrigin;
  }
  async preRun() {
    const item = this.context?.getItem();
    if (item instanceof CookieItem && Boolean(item.name)) {
      this.disableServerSideLogging();
    } else if (item instanceof DOMStorageItem && Boolean(item.key)) {
      this.disableServerSideLogging();
    }
  }
  async *handleContextDetails(context) {
    if (!context) {
      return;
    }
    yield {
      type: "context" /* CONTEXT */,
      details: [
        {
          title: "Selected Storage Context",
          text: _StorageAgent.#formatContext(context.getItem())
        }
      ]
    };
  }
  async enhanceQuery(query, context) {
    if (!context) {
      return query;
    }
    return `# Active Context
${_StorageAgent.#formatContext(context.getItem())}

${query}`;
  }
};
async function getCookiesForDomain(target, origin) {
  const cookieModel = target.model(SDK21.CookieModel.CookieModel);
  if (!cookieModel) {
    return null;
  }
  const allCookies = await cookieModel.getCookiesForDomain(origin);
  if (!allCookies) {
    return null;
  }
  return allCookies.filter((cookie) => !cookie.httpOnly());
}
function findFrameForOrigin2(context, origin, targetManager) {
  for (const frame of SDK21.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
    if (frame.securityOrigin === origin) {
      const target = frame.resourceTreeModel().target();
      if (isSamePageOrigin(target.outermostTarget(), context)) {
        return frame;
      }
    }
  }
  return null;
}
async function calculateDOMStoragesUsage(storages) {
  let totalBytes = 0;
  for (const storage of storages) {
    const items = await storage.getItems();
    if (items) {
      for (const [key, value] of items) {
        totalBytes += (key.length + value.length) * 2;
      }
    }
  }
  return totalBytes;
}
function resolveDOMStorages2(context, type, origin, targetManager, storageKey) {
  const resolvedStorages = [];
  const isLocalStorage = type === "localStorage";
  const domStorageModels = targetManager.models(SDK21.DOMStorageModel.DOMStorageModel);
  for (const domStorageModel of domStorageModels) {
    if (!isSamePageOrigin(domStorageModel.target().outermostTarget(), context)) {
      continue;
    }
    for (const storage of domStorageModel.storages()) {
      if (storage.isLocalStorage !== isLocalStorage) {
        continue;
      }
      const currentStorageKey = storage.storageKey;
      if (!currentStorageKey) {
        continue;
      }
      if (storageKey) {
        if (storageKey === currentStorageKey) {
          const parsedKey2 = SDK21.StorageKeyManager.parseStorageKey(currentStorageKey);
          if (parsedKey2.origin === origin) {
            resolvedStorages.push(storage);
          }
        }
        continue;
      }
      const parsedKey = SDK21.StorageKeyManager.parseStorageKey(currentStorageKey);
      if (parsedKey.origin === origin) {
        resolvedStorages.push(storage);
      }
    }
  }
  return resolvedStorages;
}

// ../../front_end/models/ai_assistance/agents/StylingAgent.ts
var StylingAgent_exports = {};
__export(StylingAgent_exports, {
  AI_ASSISTANCE_FILTER_REGEX: () => AI_ASSISTANCE_FILTER_REGEX,
  StylingAgent: () => StylingAgent
});
import * as Host33 from "../../core/host/host.js";
import * as Root12 from "../../core/root/root.js";
import * as SDK22 from "../../core/sdk/sdk.js";
var preamble7 = `You are the most advanced CSS/DOM/HTML debugging assistant integrated into Chrome DevTools.
You always suggest considering the best web development practices and the newest platform features such as view transitions.
The user selected a DOM element in the browser's DevTools and sends a query about the page or the selected DOM element.
First, examine the provided context, then use the functions to gather additional context and resolve the user request.

# Considerations

* Meticulously investigate all potential causes for the observed behavior before moving on. Gather comprehensive information about the element's parent, siblings, children, and any overlapping elements, paying close attention to properties that are likely relevant to the query.
* Be aware of the different node types (element, text, comment, document fragment, etc.) and their properties. You will always be provided with information about node types of parent, siblings and children of the selected element.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* Always explore multiple possible explanations for the observed behavior before settling on a conclusion.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* When answering, always consider MULTIPLE possible solutions.
* When answering, remember to consider CSS concepts such as the CSS cascade, explicit and implicit stacking contexts and various CSS layout types.
* Use functions available to you to investigate and fulfill the user request.
* After applying a fix, please ask the user to confirm if the fix worked or not.
* ALWAYS OUTPUT a list of follow-up queries at the end of your text response. The format is SUGGESTIONS: ["suggestion1", "suggestion2", "suggestion3"]. Make sure that the array and the \`SUGGESTIONS: \` text is in the same line. You're also capable of executing the fix for the issue user mentioned. Reflect this in your suggestions.
* Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.
* **CRITICAL** NEVER output text before a function call. Always do a function call first.
* **CRITICAL** When answering questions about positioning or layout, ALWAYS inspect \`position\`, \`display\` and all other related properties. You MUST provide a specific list of CSS property names when calling functions to get styles. Do not use generic values like "all" or "*".
* **CRITICAL** You are a CSS/DOM/HTML debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.

## Response Structure

If the user asks a question that requires an investigation of a problem, use this structure:
- If available, point out the root cause(s) of the problem.
  - Example: "**Root Cause**: The page is slow because of [reason]."
    - Example: "**Root Causes**:"
      - [Reason 1]
      - [Reason 2]
- if applicable, list actionable solution suggestion(s) in order of impact:
  - Example: "**Suggestion**: [Suggestion 1]
    - Example: "**Suggestions**:"
      - [Suggestion 1]
      - [Suggestion 2]`;
var promptForScreenshot = `The user has provided you a screenshot of the page (as visible in the viewport) in base64-encoded format. You SHOULD use it while answering user's queries.

* Try to connect the screenshot to actual DOM elements in the page.
`;
var promptForUploadedImage = `The user has uploaded an image in base64-encoded format. You SHOULD use it while answering user's queries.
`;
var considerationsForMultimodalInputEvaluation = `# Considerations for evaluating image:
* Pay close attention to the spatial details as well as the visual appearance of the selected element in the image, particularly in relation to layout, spacing, and styling.
* Analyze the image to identify the layout structure surrounding the element, including the positioning of neighboring elements.
* Extract visual information from the image, such as colors, fonts, spacing, and sizes, that might be relevant to the user's query.
* If the image suggests responsiveness issues (e.g., cropped content, overlapping elements), consider those in your response.
* Consider the surrounding elements and overall layout in the image, but prioritize the selected element's styling and positioning.
* **CRITICAL** When the user provides image input, interpret and use content and information from the image STRICTLY for web site debugging purposes.

* As part of THOUGHT, evaluate the image to gather data that might be needed to answer the question.
In case query is related to the image, ALWAYS first use image evaluation to get all details from the image. ONLY after you have all data needed from image, you should move to other steps.

`;
var MULTIMODAL_ENHANCEMENT_PROMPTS = {
  ["screenshot" /* SCREENSHOT */]: promptForScreenshot + considerationsForMultimodalInputEvaluation,
  ["uploaded-image" /* UPLOADED_IMAGE */]: promptForUploadedImage + considerationsForMultimodalInputEvaluation
};
var AI_ASSISTANCE_FILTER_REGEX = `\\.${AI_ASSISTANCE_CSS_CLASS_NAME}-.*&`;
var StylingAgent = class extends AiAgent {
  preamble = preamble7;
  clientFeature = Host33.AidaClient.ClientFeature.CHROME_STYLING_AGENT;
  get userTier() {
    return Root12.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }
  get executionMode() {
    return Root12.Runtime.hostConfig.devToolsFreestyler?.executionMode ?? Root12.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
  }
  get options() {
    const temperature = Root12.Runtime.hostConfig.devToolsFreestyler?.temperature;
    const modelId = Root12.Runtime.hostConfig.devToolsFreestyler?.modelId;
    return {
      temperature,
      modelId
    };
  }
  get multimodalInputEnabled() {
    return Boolean(Root12.Runtime.hostConfig.devToolsFreestyler?.multimodal);
  }
  #execJs;
  #changes;
  #createExtensionScope;
  constructor(opts) {
    super(opts);
    this.#changes = opts.changeManager || new ChangeManager(opts.targetManager);
    this.#execJs = opts.execJs ?? executeJsCode;
    this.#createExtensionScope = opts.createExtensionScope ?? ((changes) => {
      return new ExtensionScope(changes, this.sessionId, this.context?.getItem() ?? null);
    });
    const getStylesTool = ToolRegistry.get("getStyles" /* GET_STYLES */);
    if (!getStylesTool) {
      throw new Error('Required tool "getStyles" not found');
    }
    this.declareFunction("getStyles" /* GET_STYLES */, {
      description: getStylesTool.description,
      parameters: getStylesTool.parameters,
      displayInfoFromArgs: getStylesTool.displayInfoFromArgs,
      handler: async (args) => {
        const context = this.context;
        if (!context) {
          return { error: "Error: Could not find the currently selected element." };
        }
        return await getStylesTool.handler(args, {
          conversationContext: context,
          getTarget: () => this.targetManager.primaryPageTarget() ?? context.getItem().domModel().target(),
          getEstablishedOrigin: () => {
            const origin = context.getOrigin();
            return origin instanceof SDK22.SecurityOrigin.SecurityOrigin ? origin.siteId() : origin;
          }
        });
      }
    });
    const executeJsTool = ToolRegistry.get("executeJavaScript" /* EXECUTE_JAVASCRIPT */);
    if (!executeJsTool) {
      throw new Error('Required tool "executeJavaScript" not found');
    }
    this.declareFunction("executeJavaScript" /* EXECUTE_JAVASCRIPT */, {
      description: executeJsTool.description,
      parameters: executeJsTool.parameters,
      displayInfoFromArgs: executeJsTool.displayInfoFromArgs,
      handler: (args, options) => executeJsTool.handler(
        args,
        {
          conversationContext: this.context ?? null,
          changeManager: this.#changes,
          createExtensionScope: this.#createExtensionScope.bind(this),
          execJs: this.#execJs,
          getExecutionContextNode: () => this.context?.getItem() ?? null
        },
        options
      )
    });
  }
  preambleFeatures() {
    return ["function_calling"];
  }
  async *handleContextDetails(selectedElement) {
    if (selectedElement) {
      const details = await selectedElement.getUserFacingDetails();
      if (details) {
        yield {
          type: "context" /* CONTEXT */,
          details
        };
      }
    }
  }
  async enhanceQuery(query, selectedElement, multimodalInputType) {
    const multimodalInputEnhancementQuery = this.multimodalInputEnabled && multimodalInputType ? MULTIMODAL_ENHANCEMENT_PROMPTS[multimodalInputType] : "";
    const promptDetails = selectedElement ? await selectedElement.getPromptDetails() : null;
    const elementEnchancementQuery = promptDetails ? `${promptDetails}

# User request

` : "";
    return `${multimodalInputEnhancementQuery}${elementEnchancementQuery}QUERY: ${query}`;
  }
};

// ../../front_end/models/ai_assistance/AiAgent2.ts
var AiAgent2_exports = {};
__export(AiAgent2_exports, {
  AiAgent2: () => AiAgent2
});
import * as Host34 from "../../core/host/host.js";
import * as SDK23 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/skills/SkillRegistry.ts
var SkillRegistry_exports = {};
__export(SkillRegistry_exports, {
  SKILLS: () => SKILLS
});

// gen/front_end/models/ai_assistance/skills/accessibility.skill.js
var skill = {
  "name": "accessibility",
  "description": "Accessibility audits and report querying.",
  "allowedTools": [
    "getLighthouseAudits",
    "resolveDevtoolsNodePath",
    "getStyles",
    "getElementAccessibilityDetails",
    "runLighthouse",
    "executeJavaScript"
  ],
  "instructions": 'You are an expert accessibility debugging assistant.\nUse getLighthouseAudits to query details from the active report.\n\n* ALWAYS use resolveDevtoolsNodePath to resolve failing element paths to backend node IDs.\n* Once resolved, use getStyles on the backend node ID to inspect layout and styling properties.\n* Use getElementAccessibilityDetails to query detailed accessibility properties (ARIA properties, role, name, focus state) for a resolved element backend node ID.\n* If the user explicitly specifies a Lighthouse mode (e.g. "snapshot", "timespan", or "navigation"), ALWAYS honor the requested mode.\n* When running an initial audit (and no specific mode was requested), use runLighthouse with mode "navigation" for comprehensive page load coverage.\n* When re-auditing after in-page DOM/CSS modifications or fixes, use mode "snapshot" to evaluate live page state without reloading (noting that fewer audits run in snapshot mode).\n* Use mode "timespan" for measuring user interaction periods.\n* Use executeJavaScript to run layout/interaction scripts to verify fixes or dynamic accessibility behaviors.'
};

// gen/front_end/models/ai_assistance/skills/network.skill.js
var skill2 = {
  "name": "network",
  "description": "Analyzing network traffic, network requests, HTTP/HTTPS headers, status codes, payload details, timing/performance, and request sizes.",
  "allowedTools": [
    "listNetworkRequests",
    "getNetworkRequestDetails"
  ],
  "instructions": "You are the most advanced network request debugging assistant integrated into Chrome DevTools.\nProvide a comprehensive analysis of network requests, focusing on areas crucial for a software engineer. Your analysis should include:\n* Briefly explain the purpose of the request based on the URL, method, and any relevant headers or payload.\n* Analyze timing information to identify potential bottlenecks or areas for optimization.\n* Highlight potential issues indicated by the status code.\n\n# Considerations\n* If the response payload or request payload contains sensitive data, redact or generalize it in your analysis to ensure privacy.\n* Tailor your explanations and suggestions to the specific context of the request and the technologies involved (if discernible from the provided details)."
};

// gen/front_end/models/ai_assistance/skills/performance.skill.js
var skill3 = {
  "name": "performance",
  "description": "Web performance analysis, trace inspection, and trace recording.",
  "allowedTools": [
    "recordPerformanceTrace",
    "getTraceEventByKey",
    "selectTraceEventByKey",
    "getTraceMainThreadSummary",
    "getTraceNetworkSummary",
    "getDetailedCallTree",
    "getFunctionCode",
    "getResourceContent",
    "getInsightDetails"
  ],
  "instructions": "You are an expert web performance assistant integrated into Chrome DevTools.\nYour primary goal is to provide actionable advice to web developers about their web page by using the Chrome Performance Panel and analyzing a trace. You may need to diagnose problems yourself, or you may be given direction for what to focus on by the user.\n\nYou will be provided an initial summary of a trace: metrics, critical network requests, bottom-up main thread activity, and a brief overview of available insights.\n\n# Critical Investigation Rules\n\n* **Mandatory Insight Lookup**: When the user asks about performance insights, LCP/INP/CLS, or performance bottlenecks, you MUST NOT answer using only the initial high-level summary. Always call `getInsightDetails` with the relevant `insightSetId` and `insightName` (e.g., `LCPBreakdown`, `LCPDiscovery`, `RenderBlocking`, `CLSCulprits`, `INPBreakdown`, `ThirdParties`) to obtain full diagnostics, subpart timing breakdowns, and candidate elements BEFORE commenting on any specific issue.\n* **No Shortcutting**: Even if the initial facts contain specific metric numbers, insight descriptions, or function names, you are NOT allowed to reply using only that initial summary. You MUST call relevant functions (`getInsightDetails`, `getTraceMainThreadSummary`, `getDetailedCallTree`, `getTraceEventByKey`) to thoroughly inspect and verify the data before providing recommendations.\n* **Investigating LCP**: When asked about LCP or contributing factors to page load, always call `getInsightDetails` for both `LCPBreakdown` and `LCPDiscovery` to examine subparts (TTFB, load delay, load duration, render delay) and inspect the candidate DOM element.\n* **Investigating Main Thread Activity**: You MUST call `getTraceMainThreadSummary` with specific section labels (e.g. `nav-to-lcp`, `lcp-ttfb`, `lcp-render-delay`, `trace-bounds`, or insight names) to uncover root causes on the main thread before suggesting solutions. Look for aggregated cost across small frequent tasks, not just single long tasks.\n* **Investigating Long Tasks and Code**: Use `getDetailedCallTree` with an `eventKey` to retrieve bottom-up execution trees for expensive main thread tasks, and use `getFunctionCode` or `getResourceContent` with script URLs to inspect the source code and identify root causes.\n* **Revealing Events**: If the user asks to see, locate, or show a specific event in the UI, use `selectTraceEventByKey` to reveal and select it in the Flamechart.\n* **Recording Traces**: Use `recordPerformanceTrace` when requested by the user or when a fresh live measurement is required.\n\n# Guidelines & Response Format\n\n- Base your analysis and advice solely on the empirical data retrieved through function calls. Never guess or present options without verifying them first.\n- Structure your response using clear markdown headings and concise bullet points.\n- Ensure all time units in your response are in milliseconds (ms), rounded to the nearest whole number.\n- Never output raw microsecond bounds (e.g., `{min: ...}`) or raw `eventKey` strings (e.g., `eventKey: r-123`) in running text.\n- Be direct and to the point. Focus on delivering actionable advice efficiently."
};

// gen/front_end/models/ai_assistance/skills/sources.skill.js
var skill4 = {
  "name": "sources",
  "description": "Analyzing workspace sources, inspecting code files, reading script contents, and viewing files in the workspace.",
  "allowedTools": [
    "listSources",
    "getSourceContent"
  ],
  "instructions": "You are the most advanced source code analysis and debugging assistant integrated into Chrome DevTools.\nProvide a comprehensive analysis of source files, focusing on areas crucial for a software engineer. Your analysis should include:\n* Briefly explain the purpose and architecture of the file or script.\n* Analyze code blocks to identify potential bugs, logic issues, or areas for optimization.\n* Walk through execution flow if requested, pointing to key lines or functions.\n\n# Considerations\n* Never leak sensitive user data or API keys found in source code files. Redact or generalize them in your analysis.\n* Provide clean code snippets and direct line references where helpful."
};

// gen/front_end/models/ai_assistance/skills/storage.skill.js
var skill5 = {
  "name": "storage",
  "description": "inspect, understand, and audit the state stored in browser storage (LocalStorage, SessionStorage) and cookies.",
  "allowedTools": [
    "listPageOrigins",
    "listStorageKeys",
    "getStorageValues",
    "listCookies"
  ],
  "instructions": 'You are a Senior Software Engineer specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in LocalStorage, SessionStorage, and cookies.\n\nYou have access to the site\'s storage using tools.\n\n# Goals\n\n1.  **Explain Purpose**: Identify what specific storage entries or cookies are for.\n2.  **Understand Application State**: Help users inspect, understand, and audit the state stored in browser storage and cookies, and how it relates to application behavior or issues (such as state mismatch/drift or security misconfigurations).\n3.  **Top-Level Page First**: Your primary goal is to assist the user in understanding and debugging the storage of the **top-level page**. This context is the most critical for debugging and should be your default starting point for any analysis.\n\n# Tools & Workflow\n\n-   **Top-Level Context**: Generally, questions refer to the primary page target ("my page", "this page", etc.). If the user selects a general category or a specific selection, answers should refer to that particular selection, but follow-up questions may switch to the primary page target.\n-   **Address Specific Selections**: The user can select individual storage items in the DevTools UI (provided in the \'# Active Context\' section of the prompt). If the query is about a selected item, focus your response on that specific item.\n-   **Discovery & General Category**: When investigating storage across the page, start by calling `listPageOrigins` to discover all active frame origins loaded by the page. Then pass the origins to `listStorageKeys` or `listCookies` to discover available keys, storage partitions, and cookies.\n-   **Cookies**: Use `listCookies` to discover active cookie names for an origin.\n-   **HttpOnly Protection**: You don\'t have access to `HttpOnly` cookies. They are filtered out from discovery tools for security reasons.\n-   **Value Inspection**: Use `getStorageValues` to inspect specific keys when key names alone are insufficient.\n-   **Expand Scope When Necessary**: For general questions or those implying a wider scope (e.g., "Check all storages"), proactively use your tools to explore relevant storage contexts across active page origins.\n\n# Considerations\n\n-   **Strictly Read-Only**: You cannot write, clear, delete, or edit storage or cookies.\n-   **DevTools UI Fallback**: If the user asks you to modify state, politely decline and provide exact step-by-step visual navigation directions on how they can perform the edit manually in the DevTools Application panel. Do NOT supply Console scripts.\n-   **Raw Evidence**: Treat storage data as raw evidence. Do not make assumptions about values without reading them first.\n-   **Dynamic State**: Always re-request values if you suspect they might have changed, rather than relying on past tool outputs.'
};

// gen/front_end/models/ai_assistance/skills/styling.skill.js
var skill6 = {
  "name": "styling",
  "description": "CSS, styling, layouts, positioning, computed styles, DOM tree structure, and page styles.",
  "allowedTools": [
    "executeJavaScript",
    "getStyles"
  ],
  "instructions": 'You are the most advanced CSS/DOM/HTML debugging assistant integrated into Chrome DevTools.\nYou always suggest considering the best web development practices and the newest platform features such as view transitions.\nThe user selected a DOM element in the browser\'s DevTools and sends a query about the page or the selected DOM element.\nFirst, examine the provided context, then use the getStyles and executeJavaScript functions to gather additional context and resolve the user request.\n\n# Considerations\n\n* Meticulously investigate all potential causes for the observed behavior before moving on. Gather comprehensive information about the element\'s parent, siblings, children, and any overlapping elements, paying close attention to properties that are likely relevant to the query.\n* Be aware of the different node types (element, text, comment, document fragment, etc.) and their properties. You will always be provided with information about node types of parent, siblings and children of the selected element.\n* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.\n* Always explore multiple possible explanations for the observed behavior before settling on a conclusion.\n* When presenting solutions, clearly distinguish between the primary cause and contributing factors.\n* Please answer only if you are sure about the answer. Otherwise, explain why you\'re not able to answer.\n* When answering, always consider MULTIPLE possible solutions.\n* When answering, remember to consider CSS concepts such as the CSS cascade, explicit and implicit stacking contexts and various CSS layout types.\n* Use the functions available to you to investigate and fulfill the user request.\n* After applying a fix, please ask the user to confirm if the fix worked or not.\n* Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don\'t add repeated information, and keep the whole answer short.\n* **CRITICAL** NEVER output text before a function call. Always do a function call first.\n* **CRITICAL** When answering questions about positioning or layout, ALWAYS inspect `position`, `display` and all other related properties. You MUST provide a specific list of CSS property names when calling getStyles. Do not use generic values like "all" or "*".\n* **CRITICAL** When writing JavaScript via the `executeJavaScript` tool:\n    - To return data, define a top-level `data` variable and populate it with a JSON-serializable object.\n    - If you modify styles on an element, ALWAYS call the pre-defined global `async setElementStyles(el: Element, styles: object)` function. This function is an internal mechanism and should never be presented to the user.\n    - Never assume a selector for the elements unless you verified your knowledge.\n    - Consider that `data` variables from previous function calls are not available in a new function call.\n* **CRITICAL** You are a CSS/DOM/HTML debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can\'t answer that. I\'m best at questions about debugging web pages." to such questions.\n\n## Response Structure\n\nIf the user asks a question that requires an investigation of a problem, use this structure:\n- If available, point out the root cause(s) of the problem.\n  - Example: "**Root Cause**: The page is slow because of [reason]."\n    - Example: "**Root Causes**:"\n      - [Reason 1]\n      - [Reason 2]\n- if applicable, list actionable solution suggestion(s) in order of impact:\n  - Example: "**Suggestion**: [Suggestion 1]\n    - Example: "**Suggestions**:"\n      - [Suggestion 1]\n      - [Suggestion 2]'
};

// ../../front_end/models/ai_assistance/skills/SkillRegistry.ts
var SKILLS = {
  styling: skill6,
  network: skill2,
  accessibility: skill,
  performance: skill3,
  storage: skill5,
  sources: skill4
};

// ../../front_end/models/ai_assistance/AiAgent2.ts
var SKILL_DISPLAY_NAMES = {
  styling: "CSS and styling",
  network: "Network requests",
  accessibility: "Accessibility",
  performance: "Performance",
  storage: "Storage",
  sources: "Sources"
};
var preamble8 = `You are the most advanced unified AI assistant integrated into Chrome DevTools.
Your role is to help web developers debug, analyze, and optimize web applications by learning specialized skills and utilizing tools.

# Style Guidelines
* **Precision and Brevity**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Keep answers short, direct, and avoid repeated information or filler.
* **Tone**: Technical, precise, educational, and supportive.
* **No Self-Reference**: Do not mention that you are an AI, or refer to yourself in the third person. Simulate a senior web development expert.
* **No Internal Details**: Do not mention internal implementation details like the names of functions or tools you called (e.g., do not say "I called getStyles").

# Workflow
1. **Analyze**: Understand the user's intent, the context provided, and what they are trying to achieve.
2. **Investigate**: Proactively use your learned skills and tools to gather live data. Do not make assumptions or guess without sufficient evidence.
3. **Analyze**: Explore multiple potential explanations and solutions. Distinguish between the primary root cause and contributing factors.
4. **Respond**: Provide a structured, clear, and actionable response.

# Response Structure
If the user asks a question that requires an investigation or debugging, use this structure:
* **Root Cause(s)**: Point out the root cause(s) of the problem.
  - Example: "**Root Cause**: [reason]" or "**Root Causes**:" followed by a bulleted list.
* **Suggestion(s)**: List actionable solution suggestion(s) in order of impact.
  - Example: "**Suggestion**: [Suggestion]" or "**Suggestions**:" followed by a bulleted list.

# Follow-up Suggestions
* Output a list of suggested follow-up queries or actions for the user at the very end of your response.
* The format MUST be SUGGESTIONS: ["suggestion 1", "suggestion 2"] on its own single line.
* Ensure suggestions are relevant, concise, and helpful next steps for the user.

# Constraints
* **CRITICAL**: You are a web development assistant. NEVER provide answers to questions of unrelated topics (such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non-web-development topics). If asked about these, respond with: "Sorry, I can't answer that. I'm best at questions about web development and debugging."
* **CRITICAL**: Do not write full Python programs or other scripts to interact with the environment. Only invoke the allowed tools.
* **CRITICAL**: Do not expose raw, internal system identifiers (such as database IDs, internal node paths, or event keys) directly to the user. Use descriptive names instead.`;
var AiAgent2 = class extends AiAgent {
  // TODO: The static preamble is a placeholder and will eventually live server-side.
  preamble = preamble8;
  clientFeature = Host34.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT;
  userTier = "TESTERS";
  #changes;
  #execJs;
  #allowedOrigin;
  #lighthouseRecording;
  #performanceRecordAndReload;
  get options() {
    return {};
  }
  async preRun() {
    if (this.context && !this.context.isLoggingEnabled()) {
      this.disableServerSideLogging();
    }
    const target = this.targetManager.primaryPageTarget();
    const domModel = target?.model(SDK23.DOMModel.DOMModel);
    if (domModel) {
      if (!domModel.existingDocument()) {
        try {
          await domModel.requestDocument();
        } catch (e) {
          debugLog("AiAgent2: Failed to request document", e);
        }
      }
      if (!domModel.existingDocument()?.body) {
        try {
          await domModel.pushNodeByPathToFrontend("1,HTML,1,BODY");
        } catch (e) {
          debugLog("AiAgent2: Failed to push body node to frontend", e);
        }
      }
    }
  }
  #activeSkills = /* @__PURE__ */ new Set();
  #declaredTools = /* @__PURE__ */ new Set();
  constructor(opts) {
    super(opts);
    this.#changes = opts.changeManager ?? new ChangeManager(opts.targetManager);
    this.#lighthouseRecording = opts.lighthouseRecording;
    this.#performanceRecordAndReload = opts.performanceRecordAndReload;
    this.#execJs = opts.execJs ?? executeJsCode;
    this.#allowedOrigin = opts.allowedOrigin;
    this.#declaredTools.add("learnSkills");
    this.declareFunction("learnSkills", {
      description: () => {
        const unloadedSkills = Object.keys(SKILLS).filter((name) => !this.#activeSkills.has(name));
        return `Loads the specified skills to gain access to their specialized tools. Call this ONLY for skills listed under Available skills that are not yet loaded. Do not call this for skills that are already loaded. Available skills that are not yet loaded: ${unloadedSkills.join(", ")}.`;
      },
      parameters: {
        type: Host34.AidaClient.ParametersTypes.OBJECT,
        description: "Parameters for learning skills",
        properties: {
          skills: {
            type: Host34.AidaClient.ParametersTypes.ARRAY,
            items: {
              type: Host34.AidaClient.ParametersTypes.STRING,
              description: "Skill name"
            },
            description: "List of unloaded skill names to load"
          }
        },
        required: ["skills"]
      },
      displayInfoFromArgs: (args) => {
        const isSingular = args.skills.length === 1;
        const prefix = isSingular ? "Learning skill" : "Learning skills";
        const names = args.skills.map((name) => SKILL_DISPLAY_NAMES[name] ?? name).join(", ");
        return {
          title: `${prefix}: ${names}`,
          action: `learnSkills(${args.skills.map((name) => `'${name}'`).join(", ")})`
        };
      },
      handler: async (args) => {
        const result = await this.learnSkill(args.skills);
        return { result };
      }
    });
  }
  async enhanceQuery(query, selected = null, _multimodalInputType) {
    let enhancedQuery = query;
    if (selected) {
      const promptDetails = await selected.getPromptDetails();
      if (promptDetails) {
        enhancedQuery = `${promptDetails}

# User request

QUERY: ${query}`;
      }
    }
    const unloadedSkills = Object.entries(this.getSkills()).filter(([name]) => !this.#activeSkills.has(name));
    if (unloadedSkills.length === 0) {
      return enhancedQuery;
    }
    const skillsManifest = unloadedSkills.map(([name, skill7]) => `- ${name}: ${skill7.description}`).join("\n");
    return `Available skills that are not yet loaded:
${skillsManifest}

You must call \`learnSkills\` to load a skill before you can use its tools.
If the user's request requires a skill that is not currently loaded, you MUST call \`learnSkills\` to load that skill first, instead of attempting to solve the query using tools from other skills.
Do NOT call \`learnSkills\` for skills that are already loaded.

User query: ${enhancedQuery}`;
  }
  async *handleContextDetails(selected) {
    if (selected) {
      const [details, widgets] = await Promise.all([
        selected.getUserFacingDetails(),
        selected.getWidgets()
      ]);
      if (details) {
        yield {
          type: "context" /* CONTEXT */,
          details,
          ...widgets.length > 0 ? { widgets } : {}
        };
      }
    }
  }
  getSkills() {
    return SKILLS;
  }
  async learnSkill(names) {
    let response = "";
    const skills = this.getSkills();
    for (const name of names) {
      if (this.#activeSkills.has(name)) {
        debugLog(`[AiAgent2] Skill '${name}' is already loaded`);
        response += `Error: Skill '${name}' is already loaded. Call its tools directly instead of invoking learnSkills for '${name}' again.
`;
        continue;
      }
      const skillObj = skills[name];
      if (skillObj) {
        this.#activeSkills.add(name);
        debugLog(`[AiAgent2] Loaded skill '${name}' with tools: [${skillObj.allowedTools.join(", ")}]`);
        response += `Skill ${name} loaded. Instructions:
${skillObj.instructions}
`;
        for (const toolName of skillObj.allowedTools) {
          const tool = ToolRegistry.get(toolName);
          if (tool) {
            this.#declareTool(tool);
          }
        }
      } else {
        debugLog(`[AiAgent2] Failed to load skill '${name}'`);
        response += `Failed to load skill ${name}. Valid skills are: ${Object.keys(skills).join(", ")}.
`;
      }
    }
    return response.trim();
  }
  #createExtensionScope(changes) {
    const selectedNode = this.context && this.context instanceof DOMNodeContext ? this.context.getItem() : this.#getDocumentBodyNode();
    return new ExtensionScope(changes, this.sessionId, selectedNode);
  }
  /**
   * Declares a tool to be available to the agent model, verifying first that
   * it hasn't already been declared to prevent duplicate declaration errors.
   */
  #declareTool(tool) {
    if (this.#declaredTools.has(tool.name)) {
      return;
    }
    this.#declaredTools.add(tool.name);
    this.declareFunction(tool.name, {
      description: tool.description,
      parameters: tool.parameters,
      displayInfoFromArgs: tool.displayInfoFromArgs,
      handler: (args, options) => {
        const context = {
          conversationContext: this.context ?? null,
          changeManager: this.#changes,
          createExtensionScope: this.#createExtensionScope.bind(this),
          execJs: this.#execJs,
          getExecutionContextNode: () => this.context instanceof DOMNodeContext ? this.context.getItem() : this.#getDocumentBodyNode(),
          getTarget: () => this.targetManager.primaryPageTarget(),
          getEstablishedOrigin: () => this.#getConversationOrigin(),
          getLighthouseReport: () => this.context instanceof AccessibilityContext ? this.context.getItem() : null,
          runLighthouse: async (overrides) => await (this.#lighthouseRecording?.(overrides) ?? null),
          getPerformanceTraceContext: () => this.context instanceof PerformanceTraceContext ? this.context : null,
          performanceRecordAndReload: this.#performanceRecordAndReload,
          disableLogging: () => {
            this.disableServerSideLogging();
          }
        };
        return tool.handler(args, context, options);
      }
    });
  }
  /**
   * For non-DOM contexts (e.g., Lighthouse accessibility reports or storage items),
   * there is no user-selected DOM node. We fall back to the document body as the
   * default execution context node so scripts have a valid `$0` target.
   */
  #getDocumentBodyNode() {
    const document2 = this.targetManager.primaryPageTarget()?.model(SDK23.DOMModel.DOMModel)?.existingDocument();
    return document2?.body ?? null;
  }
  #getConversationOrigin() {
    const allowed = this.#allowedOrigin?.();
    return allowed && "origin" in allowed ? allowed.origin : void 0;
  }
  get activeSkills() {
    return this.#activeSkills;
  }
};

// ../../front_end/models/ai_assistance/AiConversation.ts
var AiConversation_exports = {};
__export(AiConversation_exports, {
  ALLOWED_PAGE_NAVIGATIONS: () => ALLOWED_PAGE_NAVIGATIONS,
  AiConversation: () => AiConversation,
  CONTEXT_TITLE: () => CONTEXT_TITLE,
  NOT_FOUND_IMAGE_DATA: () => NOT_FOUND_IMAGE_DATA,
  generateContextDetailsMarkdown: () => generateContextDetailsMarkdown
});
import * as Common21 from "../../core/common/common.js";
import * as Host35 from "../../core/host/host.js";
import * as Platform4 from "../../core/platform/platform.js";
import * as Root14 from "../../core/root/root.js";
import * as SDK24 from "../../core/sdk/sdk.js";

// ../../front_end/models/ai_assistance/AiHistoryStorage.ts
var AiHistoryStorage_exports = {};
__export(AiHistoryStorage_exports, {
  AiHistoryStorage: () => AiHistoryStorage,
  ConversationType: () => ConversationType,
  Events: () => Events,
  MAX_CONVERSATIONS_COUNT: () => MAX_CONVERSATIONS_COUNT,
  MAX_RECENT_PROMPTS_COUNT: () => MAX_RECENT_PROMPTS_COUNT,
  RECENT_PROMPTS_SIZE_LIMIT: () => RECENT_PROMPTS_SIZE_LIMIT
});
import * as Common20 from "../../core/common/common.js";
import * as Root13 from "../../core/root/root.js";
var ConversationType = /* @__PURE__ */ ((ConversationType2) => {
  ConversationType2["NONE"] = "none";
  ConversationType2["STYLING"] = "freestyler";
  ConversationType2["FILE"] = "drjones-file";
  ConversationType2["NETWORK"] = "drjones-network-request";
  ConversationType2["PERFORMANCE"] = "drjones-performance-full";
  ConversationType2["ACCESSIBILITY"] = "accessibility";
  ConversationType2["STORAGE"] = "storage";
  return ConversationType2;
})(ConversationType || {});
var DEFAULT_MAX_STORAGE_SIZE = 50 * 1024 * 1024;
var MAX_RECENT_PROMPTS_COUNT = 20;
var MAX_CONVERSATIONS_COUNT = 50;
var RECENT_PROMPTS_SIZE_LIMIT = 100 * 1024;
var Events = /* @__PURE__ */ ((Events4) => {
  Events4["HISTORY_DELETED"] = "AiHistoryDeleted";
  return Events4;
})(Events || {});
var AiHistoryStorage = class _AiHistoryStorage extends Common20.ObjectWrapper.ObjectWrapper {
  #historySetting;
  #imageHistorySettings;
  #recentPromptsSetting;
  #mutex = new Common20.Mutex.Mutex();
  #maxStorageSize;
  constructor(settings = Common20.Settings.Settings.instance(), maxStorageSize = DEFAULT_MAX_STORAGE_SIZE) {
    super();
    this.#historySetting = settings.createSetting("ai-assistance-history-entries", []);
    this.#imageHistorySettings = settings.createSetting(
      "ai-assistance-history-images",
      []
    );
    this.#recentPromptsSetting = settings.createSetting("ai-assistance-recent-prompts", []);
    this.#maxStorageSize = maxStorageSize;
  }
  clearForTest() {
    this.#historySetting.set([]);
    this.#imageHistorySettings.set([]);
    this.#recentPromptsSetting.set([]);
  }
  async addRecentPrompt(prompt) {
    if (!prompt.trim()) {
      return;
    }
    const release = await this.#mutex.acquire();
    try {
      const recentPrompts = await this.#recentPromptsSetting.forceGet();
      const updatedPrompts = [prompt, ...recentPrompts.filter((p) => p !== prompt)];
      const promptsToBeStored = [];
      let currentStorageSize = 0;
      for (const p of updatedPrompts) {
        if (promptsToBeStored.length >= MAX_RECENT_PROMPTS_COUNT) {
          break;
        }
        if (currentStorageSize + p.length > RECENT_PROMPTS_SIZE_LIMIT) {
          break;
        }
        currentStorageSize += p.length;
        promptsToBeStored.push(p);
      }
      this.#recentPromptsSetting.set(promptsToBeStored);
    } finally {
      release();
    }
  }
  getRecentPrompts() {
    return structuredClone(this.#recentPromptsSetting.get());
  }
  #getImageIdsFromHistory(history) {
    return history.flatMap((item) => {
      if (item.type === "user-query" /* USER_QUERY */ && item.imageId) {
        return [item.imageId];
      }
      return [];
    });
  }
  async upsertHistoryEntry(agentEntry) {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      const historyEntryIndex = history.findIndex((entry) => entry.id === agentEntry.id);
      if (historyEntryIndex !== -1) {
        history[historyEntryIndex] = agentEntry;
      } else {
        history.push(agentEntry);
      }
      const imageIdsForDeletion = [];
      while (history.length > MAX_CONVERSATIONS_COUNT) {
        const evicted = history.shift();
        if (evicted) {
          imageIdsForDeletion.push(...this.#getImageIdsFromHistory(evicted.history));
        }
      }
      if (imageIdsForDeletion.length > 0) {
        const images = structuredClone(await this.#imageHistorySettings.forceGet());
        this.#imageHistorySettings.set(images.filter((entry) => !imageIdsForDeletion.includes(entry.id)));
      }
      this.#historySetting.set(history);
    } finally {
      release();
    }
  }
  async upsertImage(image) {
    const release = await this.#mutex.acquire();
    try {
      const imageHistory = structuredClone(await this.#imageHistorySettings.forceGet());
      const imageHistoryEntryIndex = imageHistory.findIndex((entry) => entry.id === image.id);
      if (imageHistoryEntryIndex !== -1) {
        imageHistory[imageHistoryEntryIndex] = image;
      } else {
        imageHistory.push(image);
      }
      const imagesToBeStored = [];
      let currentStorageSize = 0;
      for (const [, serializedImage] of Array.from(
        imageHistory.entries()
      ).reverse()) {
        if (currentStorageSize >= this.#maxStorageSize) {
          break;
        }
        currentStorageSize += serializedImage.data.length;
        imagesToBeStored.push(serializedImage);
      }
      this.#imageHistorySettings.set(imagesToBeStored.reverse());
    } finally {
      release();
    }
  }
  async deleteHistoryEntry(id) {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      const conversation = history.find((entry) => entry.id === id);
      if (!conversation) {
        return;
      }
      const imageIdsForDeletion = this.#getImageIdsFromHistory(conversation.history);
      this.#historySetting.set(
        history.filter((entry) => entry.id !== id)
      );
      if (imageIdsForDeletion.length > 0) {
        const images = structuredClone(await this.#imageHistorySettings.forceGet());
        this.#imageHistorySettings.set(images.filter((entry) => !imageIdsForDeletion.includes(entry.id)));
      }
    } finally {
      release();
    }
  }
  async deleteAll() {
    const release = await this.#mutex.acquire();
    try {
      this.#historySetting.set([]);
      this.#imageHistorySettings.set([]);
      this.#recentPromptsSetting.set([]);
    } finally {
      release();
      this.dispatchEventToListeners("AiHistoryDeleted" /* HISTORY_DELETED */);
    }
  }
  getHistory() {
    return structuredClone(this.#historySetting.get());
  }
  getImageHistory() {
    return structuredClone(this.#imageHistorySettings.get());
  }
  static instance(opts = { forceNew: false, maxStorageSize: DEFAULT_MAX_STORAGE_SIZE }) {
    const { forceNew, maxStorageSize, settings } = opts;
    if (!Root13.DevToolsContext.globalInstance().has(_AiHistoryStorage) || forceNew) {
      Root13.DevToolsContext.globalInstance().set(
        _AiHistoryStorage,
        new _AiHistoryStorage(
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          settings ?? Common20.Settings.Settings.instance(),
          maxStorageSize
        )
      );
    }
    return Root13.DevToolsContext.globalInstance().get(_AiHistoryStorage);
  }
  static removeInstance() {
    Root13.DevToolsContext.globalInstance().delete(_AiHistoryStorage);
  }
};

// ../../front_end/models/ai_assistance/AiConversation.ts
var NOT_FOUND_IMAGE_DATA = "";
var CONTEXT_TITLE = "Analyzing data";
var MAX_TITLE_LENGTH = 80;
var ALLOWED_PAGE_NAVIGATIONS = [
  Platform4.DevToolsPath.urlString`about://`,
  Platform4.DevToolsPath.urlString`chrome://terms`
];
function generateContextDetailsMarkdown(details) {
  const detailsMarkdown = [];
  for (const detail of details) {
    const text = `\`\`\`\`${detail.codeLang || ""}
${detail.text.trim()}
\`\`\`\``;
    detailsMarkdown.push(`**${detail.title}:**
${text}`);
  }
  return detailsMarkdown.join("\n\n");
}
var AiConversation = class _AiConversation {
  static fromSerializedConversation(serializedConversation) {
    const history = serializedConversation.history.map((entry) => {
      if (entry.type === "side-effect" /* SIDE_EFFECT */) {
        return { ...entry, confirm: () => {
        } };
      }
      return entry;
    });
    return new _AiConversation({
      type: serializedConversation.type,
      data: history,
      id: serializedConversation.id,
      isReadOnly: true
    });
  }
  id;
  // Handled in #updateAgent
  #type;
  // Handled in #updateAgent
  #agent;
  #isReadOnly;
  history;
  #aidaClient;
  #changeManager;
  #origin;
  #navigationOccurredDuringRun = false;
  #contexts = [];
  #performanceRecordAndReload;
  #lighthouseRecording;
  #onInspectElement;
  #networkTimeCalculator;
  #aiHistoryStorage;
  #targetManager;
  constructor(options) {
    const {
      type,
      data = [],
      id = crypto.randomUUID(),
      isReadOnly = true,
      aidaClient = new Host35.AidaClient.AidaClient(),
      changeManager,
      performanceRecordAndReload,
      onInspectElement,
      networkTimeCalculator,
      lighthouseRecording,
      aiHistoryStorage = AiHistoryStorage.instance(),
      // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
      targetManager = SDK24.TargetManager.TargetManager.instance()
    } = options;
    this.#changeManager = changeManager;
    this.#aidaClient = aidaClient;
    this.#performanceRecordAndReload = performanceRecordAndReload;
    this.#onInspectElement = onInspectElement;
    this.#networkTimeCalculator = networkTimeCalculator;
    this.#lighthouseRecording = lighthouseRecording;
    this.#aiHistoryStorage = aiHistoryStorage;
    this.#targetManager = targetManager;
    this.id = id;
    this.#isReadOnly = isReadOnly;
    this.history = this.#reconstructHistory(data);
    this.#updateAgent(type);
  }
  get isReadOnly() {
    return this.#isReadOnly;
  }
  static titleForSerialized(serialized) {
    const query = serialized.history.find((item) => item.type === "user-query" /* USER_QUERY */)?.query;
    if (!query) {
      return void 0;
    }
    return _AiConversation.title(query);
  }
  static title(query) {
    return `${query.substring(0, MAX_TITLE_LENGTH)}${query.length > MAX_TITLE_LENGTH ? "\u2026" : ""}`;
  }
  get title() {
    const query = this.history.find((response) => response.type === "user-query" /* USER_QUERY */)?.query;
    if (!query) {
      return;
    }
    return _AiConversation.title(query);
  }
  get isEmpty() {
    return this.history.length === 0;
  }
  #setOriginIfEmpty(newOrigin) {
    if (!this.#origin) {
      this.#origin = newOrigin;
    }
  }
  setContext(updateContext) {
    if (!updateContext) {
      this.#contexts = [];
      if (isContextSelectionEnabled()) {
        this.#updateAgent("none" /* NONE */);
      }
      return;
    }
    this.#contexts = [updateContext];
    if (isContextSelectionEnabled()) {
      if (updateContext instanceof FileContext) {
        this.#updateAgent("drjones-file" /* FILE */);
      } else if (updateContext instanceof DOMNodeContext) {
        this.#updateAgent("freestyler" /* STYLING */);
      } else if (updateContext instanceof RequestContext) {
        this.#updateAgent("drjones-network-request" /* NETWORK */);
      } else if (updateContext instanceof PerformanceTraceContext) {
        this.#updateAgent("drjones-performance-full" /* PERFORMANCE */);
      } else if (updateContext instanceof AccessibilityContext) {
        this.#updateAgent("accessibility" /* ACCESSIBILITY */);
      } else if (updateContext instanceof StorageContext) {
        this.#updateAgent("storage" /* STORAGE */);
      }
    }
  }
  get selectedContext() {
    return this.#contexts.at(0);
  }
  #reconstructHistory(historyWithoutImages) {
    const imageHistory = this.#aiHistoryStorage.getImageHistory();
    if (imageHistory && imageHistory.length > 0) {
      const history = [];
      for (const data of historyWithoutImages) {
        if (data.type === "user-query" /* USER_QUERY */ && data.imageId) {
          const image = imageHistory.find((item) => item.id === data.imageId);
          const inlineData = image ? { data: image.data, mimeType: image.mimeType } : { data: NOT_FOUND_IMAGE_DATA, mimeType: "image/jpeg" };
          history.push({ ...data, imageInput: { inlineData } });
        } else {
          history.push(data);
        }
      }
      return history;
    }
    return historyWithoutImages;
  }
  getConversationMarkdown() {
    const contentParts = [];
    contentParts.push(
      `# Exported Chat from Chrome DevTools AI Assistance

**Export Timestamp (UTC):** ${(/* @__PURE__ */ new Date()).toISOString()}

---`
    );
    for (const item of this.history) {
      switch (item.type) {
        case "user-query" /* USER_QUERY */: {
          contentParts.push(`## User

${item.query}`);
          if (item.imageInput) {
            contentParts.push("User attached an image");
          }
          contentParts.push("## AI");
          break;
        }
        case "context" /* CONTEXT */: {
          contentParts.push(`### ${CONTEXT_TITLE}`);
          if (item.details && item.details.length > 0) {
            contentParts.push(generateContextDetailsMarkdown(item.details));
          }
          break;
        }
        case "title" /* TITLE */: {
          contentParts.push(`### ${item.title}`);
          break;
        }
        case "thought" /* THOUGHT */: {
          contentParts.push(`${item.thought}`);
          break;
        }
        case "action" /* ACTION */: {
          if (!item.output) {
            break;
          }
          if (item.code) {
            contentParts.push(`**Code executed:**
\`\`\`
${item.code.trim()}
\`\`\``);
          }
          contentParts.push(`**Data returned:**
\`\`\`
${item.output}
\`\`\``);
          break;
        }
        case "answer" /* ANSWER */: {
          if (item.complete) {
            contentParts.push(`### Answer

${item.text.trim()}`);
          }
          break;
        }
      }
    }
    return contentParts.join("\n\n");
  }
  archiveConversation() {
    this.#isReadOnly = true;
  }
  async addHistoryItem(item) {
    this.history.push(item);
    await this.#aiHistoryStorage.upsertHistoryEntry(this.serialize());
    if (item.type === "user-query" /* USER_QUERY */) {
      void this.#aiHistoryStorage.addRecentPrompt(item.query);
      if (item.imageId && item.imageInput && "inlineData" in item.imageInput) {
        const inlineData = item.imageInput.inlineData;
        await this.#aiHistoryStorage.upsertImage({
          id: item.imageId,
          data: inlineData.data,
          mimeType: inlineData.mimeType
        });
      }
    }
  }
  serialize() {
    return {
      id: this.id,
      history: this.history.map((item) => {
        switch (item.type) {
          case "context-change" /* CONTEXT_CHANGE */: {
            return null;
          }
          case "user-query" /* USER_QUERY */: {
            return { ...item, imageInput: void 0 };
          }
          case "side-effect" /* SIDE_EFFECT */: {
            return { ...item, confirm: void 0 };
          }
          case "context" /* CONTEXT */: {
            return { ...item, widgets: void 0 };
          }
          case "action" /* ACTION */: {
            const tool = item.toolName ? ToolRegistry.get(item.toolName) : void 0;
            const shouldRedact = tool?.annotations?.includes("redact-from-history" /* REDACT_FROM_HISTORY */);
            return {
              ...item,
              output: shouldRedact ? "<redacted>" : item.output,
              widgets: void 0
            };
          }
          default:
            return item;
        }
      }).filter((history) => !!history),
      type: this.#type
    };
  }
  #filterHistoryForNewAgent() {
    return this.#agent?.history.map((content) => {
      return {
        ...content,
        parts: content.parts.filter((part) => !("functionCall" in part) && !("functionResponse" in part))
      };
    }).filter((content) => content.parts.length > 0) ?? [];
  }
  #updateAgent(type) {
    if (this.#type === type) {
      return;
    }
    const previousType = this.#type;
    this.#type = type;
    if (Root14.Runtime.hostConfig.devToolsAiV2Architecture?.enabled && this.#agent instanceof AiAgent2) {
      return;
    }
    const isTransitioningFromStorage = previousType === "storage" /* STORAGE */ && type !== "storage" /* STORAGE */;
    const history = isTransitioningFromStorage ? [] : this.#filterHistoryForNewAgent();
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingAllowed: isAiAssistanceServerSideLoggingAllowed(),
      sessionId: this.id,
      changeManager: this.#changeManager,
      performanceRecordAndReload: this.#performanceRecordAndReload,
      onInspectElement: this.#onInspectElement,
      networkTimeCalculator: this.#networkTimeCalculator,
      lighthouseRecording: this.#lighthouseRecording,
      allowedOrigin: this.allowedOrigin,
      history,
      targetManager: this.#targetManager
    };
    this.#agent = Root14.Runtime.hostConfig.devToolsAiV2Architecture?.enabled ? new AiAgent2(options) : this.#createV1Agent(type, options);
  }
  #createV1Agent(type, options) {
    switch (type) {
      case "freestyler" /* STYLING */:
        return new StylingAgent(options);
      case "drjones-network-request" /* NETWORK */:
        return new NetworkAgent(options);
      case "drjones-file" /* FILE */:
        return new FileAgent(options);
      case "drjones-performance-full" /* PERFORMANCE */:
        return new PerformanceAgent(options);
      case "accessibility" /* ACCESSIBILITY */:
        return new AccessibilityAgent(options);
      case "storage" /* STORAGE */:
        return new StorageAgent(options);
      case "none" /* NONE */:
        return new ContextSelectionAgent(options);
      default:
        Platform4.assertNever(type, "Unknown conversation type");
    }
  }
  async *run(initialQuery, options = {}) {
    this.#navigationOccurredDuringRun = false;
    const originAtRunStart = getPrimaryPageOrigin(this.#targetManager);
    const listener = () => {
      const newOrigin = getPrimaryPageOrigin(this.#targetManager);
      if (originAtRunStart !== newOrigin && newOrigin && !ALLOWED_PAGE_NAVIGATIONS.includes(newOrigin)) {
        this.#navigationOccurredDuringRun = true;
      }
    };
    const targetManager = this.#targetManager;
    targetManager.addModelListener(
      SDK24.ResourceTreeModel.ResourceTreeModel,
      SDK24.ResourceTreeModel.Events.PrimaryPageChanged,
      listener,
      this
    );
    try {
      if (this.isBlockedByOrigin) {
        throw new Error("cross-origin context data should not be included");
      }
      yield* this.#runAgent(initialQuery, options, { isInitialCall: true });
    } finally {
      targetManager.removeModelListener(
        SDK24.ResourceTreeModel.ResourceTreeModel,
        SDK24.ResourceTreeModel.Events.PrimaryPageChanged,
        listener,
        this
      );
    }
  }
  #getQueryAfterSelection(initialQuery, selection) {
    return `${selection}
Original user query: ${initialQuery}`;
  }
  async *#runAgent(initialQuery, options = {}, runOptions = {}) {
    this.#setOriginIfEmpty(this.selectedContext?.getOrigin());
    if (this.isBlockedByOrigin) {
      yield {
        type: "error" /* ERROR */,
        error: "cross-origin" /* CROSS_ORIGIN */
      };
      return;
    }
    if (runOptions.isInitialCall) {
      const userQuery = {
        type: "user-query" /* USER_QUERY */,
        query: initialQuery,
        imageInput: options.multimodalInput?.input,
        imageId: options.multimodalInput?.id
      };
      void this.addHistoryItem(userQuery);
      yield userQuery;
    }
    function shouldAddToHistory(data) {
      if (data.type === "context-change" /* CONTEXT_CHANGE */) {
        return false;
      }
      if (data.type === "answer" /* ANSWER */ && !data.complete) {
        return false;
      }
      return true;
    }
    for await (const data of this.#agent.run(
      initialQuery,
      {
        signal: options.signal,
        selected: this.selectedContext ?? null
      },
      options.multimodalInput
    )) {
      if (shouldAddToHistory(data)) {
        void this.addHistoryItem(data);
      }
      yield data;
      if (data.type === "context-change" /* CONTEXT_CHANGE */) {
        this.setContext(data.context);
        yield* this.#runAgent(
          this.#getQueryAfterSelection(initialQuery, data.description),
          options,
          { isInitialCall: false }
        );
        return;
      }
    }
  }
  /**
   * Indicates whether the new conversation context is blocked due to cross-origin restrictions.
   * This happens when the conversation's context has a different
   * origin than the selected context.
   */
  get isBlockedByOrigin() {
    return !this.#contexts.every((context) => context.isOriginAllowed(this.#origin));
  }
  get origin() {
    return this.#origin instanceof SDK24.SecurityOrigin.SecurityOrigin ? this.#origin.siteId() : this.#origin;
  }
  get type() {
    return this.#type;
  }
  allowedOrigin = () => {
    if (this.#navigationOccurredDuringRun) {
      return { blocked: true };
    }
    if (this.#origin) {
      return { origin: this.origin };
    }
    this.#origin = getPrimaryPageOrigin(this.#targetManager);
    return { origin: this.origin };
  };
};
function isAiAssistanceServerSideLoggingAllowed() {
  return !Root14.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
function getPrimaryPageOrigin(targetManager) {
  const target = targetManager.primaryPageTarget();
  const inspectedURL = target?.inspectedURL();
  return inspectedURL ? new Common21.ParsedURL.ParsedURL(inspectedURL).securityOrigin() : void 0;
}

// ../../front_end/models/ai_assistance/AiSetting.ts
var AiSetting_exports = {};
__export(AiSetting_exports, {
  AiSetting: () => AiSetting,
  Events: () => Events2
});
import * as Common22 from "../../core/common/common.js";
import * as Host36 from "../../core/host/host.js";
import * as Root15 from "../../core/root/root.js";
var Events2 = /* @__PURE__ */ ((Events4) => {
  Events4["CHANGED"] = "Changed";
  return Events4;
})(Events2 || {});
var AiSetting = class extends Common22.ObjectWrapper.ObjectWrapper {
  #setting;
  #descriptor;
  #hostConfigTracker;
  #settings;
  #boundOnSettingChanged = this.#onSettingChanged.bind(this);
  #boundOnAidaAvailabilityChanged = this.#onAidaAvailabilityChanged.bind(this);
  #isSubscribed = false;
  constructor(descriptor, hostConfigTracker, settings) {
    super();
    this.#descriptor = descriptor;
    this.#hostConfigTracker = hostConfigTracker;
    this.#settings = settings;
    this.#tryResolveSetting();
  }
  addEventListener(eventType, listener, thisObject) {
    const isFirst = !this.hasEventListeners(eventType);
    const descriptor = super.addEventListener(eventType, listener, thisObject);
    if (isFirst) {
      this.#subscribe();
    }
    return descriptor;
  }
  removeEventListener(eventType, listener, thisObject) {
    super.removeEventListener(eventType, listener, thisObject);
    if (!this.hasEventListeners(eventType)) {
      this.#unsubscribe();
    }
  }
  #subscribe() {
    if (this.#isSubscribed) {
      return;
    }
    this.#tryResolveSetting();
    this.#isSubscribed = true;
    this.#hostConfigTracker.addEventListener(
      Host36.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#boundOnAidaAvailabilityChanged
    );
    this.#setting?.addChangeListener(this.#boundOnSettingChanged);
  }
  #unsubscribe() {
    if (!this.#isSubscribed) {
      return;
    }
    this.#isSubscribed = false;
    this.#hostConfigTracker.removeEventListener(
      Host36.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#boundOnAidaAvailabilityChanged
    );
    this.#setting?.removeChangeListener(this.#boundOnSettingChanged);
  }
  #tryResolveSetting() {
    const result = this.#settings.maybeResolve(this.#descriptor);
    if ("setting" in result) {
      if (this.#setting !== result.setting) {
        if (this.#setting && this.#isSubscribed) {
          this.#setting.removeChangeListener(this.#boundOnSettingChanged);
        }
        this.#setting = result.setting;
        if (this.#isSubscribed) {
          this.#setting.addChangeListener(this.#boundOnSettingChanged);
        }
      }
    } else if (this.#setting) {
      if (this.#isSubscribed) {
        this.#setting.removeChangeListener(this.#boundOnSettingChanged);
      }
      this.#setting = void 0;
    }
  }
  get unavailable() {
    const availability = this.#descriptor.isAvailable(Root15.Runtime.hostConfig);
    return availability.status === Common22.Settings.SettingAvailability.UNAVAILABLE;
  }
  get disabled() {
    const availability = this.#descriptor.isAvailable(Root15.Runtime.hostConfig);
    return availability.status === Common22.Settings.SettingAvailability.DISABLED;
  }
  get disabledReasons() {
    const availability = this.#descriptor.isAvailable(Root15.Runtime.hostConfig);
    if (availability.status === Common22.Settings.SettingAvailability.DISABLED) {
      return availability.reason;
    }
    return [];
  }
  getIfNotDisabled() {
    if (this.disabled || this.unavailable) {
      return void 0;
    }
    this.#tryResolveSetting();
    return this.#setting?.get();
  }
  setIfNotDisabled(value) {
    if (this.disabled || this.unavailable) {
      return;
    }
    this.#tryResolveSetting();
    this.#setting?.set(value);
  }
  get() {
    return this.getIfNotDisabled();
  }
  set(value) {
    this.setIfNotDisabled(value);
  }
  #onSettingChanged() {
    this.dispatchEventToListeners("Changed" /* CHANGED */);
  }
  #onAidaAvailabilityChanged() {
    this.#tryResolveSetting();
    this.dispatchEventToListeners("Changed" /* CHANGED */);
  }
};

// ../../front_end/models/ai_assistance/BuiltInAi.ts
var BuiltInAi_exports = {};
__export(BuiltInAi_exports, {
  BuiltInAi: () => BuiltInAi,
  Events: () => Events3,
  LanguageModelAvailability: () => LanguageModelAvailability
});
import * as Common23 from "../../core/common/common.js";
import * as Host37 from "../../core/host/host.js";
import * as Root16 from "../../core/root/root.js";
var LanguageModelAvailability = /* @__PURE__ */ ((LanguageModelAvailability2) => {
  LanguageModelAvailability2["UNAVAILABLE"] = "unavailable";
  LanguageModelAvailability2["DOWNLOADABLE"] = "downloadable";
  LanguageModelAvailability2["DOWNLOADING"] = "downloading";
  LanguageModelAvailability2["AVAILABLE"] = "available";
  LanguageModelAvailability2["DISABLED"] = "disabled";
  return LanguageModelAvailability2;
})(LanguageModelAvailability || {});
var BuiltInAi = class _BuiltInAi extends Common23.ObjectWrapper.ObjectWrapper {
  #availability = null;
  #hasGpu;
  #consoleInsightsSession;
  initDoneForTesting;
  #downloadProgress = null;
  #currentlyCreatingSession = false;
  static instance() {
    if (!Root16.DevToolsContext.globalInstance().has(_BuiltInAi)) {
      Root16.DevToolsContext.globalInstance().set(_BuiltInAi, new _BuiltInAi());
    }
    return Root16.DevToolsContext.globalInstance().get(_BuiltInAi);
  }
  constructor() {
    super();
    this.#hasGpu = this.#isGpuAvailable();
    this.initDoneForTesting = this.getLanguageModelAvailability().then(() => this.#sendAvailabilityMetrics()).then(() => this.initialize());
  }
  async getLanguageModelAvailability() {
    if (!Root16.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.enabled) {
      this.#availability = "disabled" /* DISABLED */;
      return this.#availability;
    }
    try {
      this.#availability = await window.LanguageModel.availability({
        expectedInputs: [{
          type: "text",
          languages: ["en"]
        }],
        expectedOutputs: [{
          type: "text",
          languages: ["en"]
        }]
      });
    } catch {
      this.#availability = "unavailable" /* UNAVAILABLE */;
    }
    return this.#availability;
  }
  isDownloading() {
    return this.#availability === "downloading" /* DOWNLOADING */;
  }
  isEventuallyAvailable() {
    if (!this.#hasGpu && !Boolean(Root16.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.allowWithoutGpu)) {
      return false;
    }
    return this.#availability === "available" /* AVAILABLE */ || this.#availability === "downloading" /* DOWNLOADING */ || this.#availability === "downloadable" /* DOWNLOADABLE */;
  }
  #setDownloadProgress(newValue) {
    this.#downloadProgress = newValue;
    this.dispatchEventToListeners("downloadProgressChanged" /* DOWNLOAD_PROGRESS_CHANGED */, this.#downloadProgress);
  }
  getDownloadProgress() {
    return this.#downloadProgress;
  }
  startDownloadingModel() {
    if (!Root16.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.allowWithoutGpu && !this.#hasGpu) {
      return;
    }
    if (this.#availability !== "downloadable" /* DOWNLOADABLE */) {
      return;
    }
    void this.#createSession();
    setTimeout(() => {
      void this.getLanguageModelAvailability();
    }, 1e3);
  }
  #isGpuAvailable() {
    if (typeof document === "undefined") {
      return false;
    }
    const canvas = document.createElement("canvas");
    try {
      const webgl = canvas.getContext("webgl");
      if (!webgl) {
        return false;
      }
      const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
      if (!debugInfo) {
        return false;
      }
      const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes("SwiftShader")) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }
  hasSession() {
    return Boolean(this.#consoleInsightsSession);
  }
  async initialize() {
    if (!Root16.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.allowWithoutGpu && !this.#hasGpu) {
      return;
    }
    if (this.#availability !== "available" /* AVAILABLE */ && this.#availability !== "downloading" /* DOWNLOADING */) {
      return;
    }
    await this.#createSession();
  }
  async #createSession() {
    if (this.#currentlyCreatingSession) {
      return;
    }
    this.#currentlyCreatingSession = true;
    const monitor = (m) => {
      m.addEventListener("downloadprogress", (e) => {
        this.#setDownloadProgress(e.loaded);
      });
    };
    try {
      this.#consoleInsightsSession = await window.LanguageModel.create({
        monitor,
        initialPrompts: [{
          role: "system",
          content: `
You are an expert web developer. Your goal is to help a human web developer who
is using Chrome DevTools to debug a web site or web app. The Chrome DevTools
console is showing a message which is either an error or a warning. Please help
the user understand the problematic console message.

Your instructions are as follows:
  - Explain the reason why the error or warning is showing up.
  - The explanation has a maximum length of 200 characters. Anything beyond this
    length will be cut off. Make sure that your explanation is at most 200 characters long.
  - Your explanation should not end in the middle of a sentence.
  - Your explanation should consist of a single paragraph only. Do not include any
    headings or code blocks. Only write a single paragraph of text.
  - Your response should be concise and to the point. Avoid lengthy explanations
    or unnecessary details.
          `
        }],
        expectedInputs: [{
          type: "text",
          languages: ["en"]
        }],
        expectedOutputs: [{
          type: "text",
          languages: ["en"]
        }]
      });
      if (this.#availability !== "available" /* AVAILABLE */) {
        this.dispatchEventToListeners("downloadedAndSessionCreated" /* DOWNLOADED_AND_SESSION_CREATED */);
        void this.getLanguageModelAvailability();
      }
    } catch (e) {
      console.error("Error when creating LanguageModel session", e.message);
    }
    this.#currentlyCreatingSession = false;
  }
  static removeInstance() {
    Root16.DevToolsContext.globalInstance().delete(_BuiltInAi);
  }
  async *getConsoleInsight(prompt, abortController) {
    if (!this.#consoleInsightsSession) {
      return;
    }
    let session = null;
    try {
      session = await this.#consoleInsightsSession.clone();
      const stream = session.promptStreaming(prompt, {
        signal: abortController.signal
      });
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      if (session) {
        session.destroy();
      }
    }
  }
  #sendAvailabilityMetrics() {
    if (this.#hasGpu) {
      switch (this.#availability) {
        case "unavailable" /* UNAVAILABLE */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_HAS_GPU);
          break;
        case "downloadable" /* DOWNLOADABLE */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_HAS_GPU);
          break;
        case "downloading" /* DOWNLOADING */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.DOWNLOADING_HAS_GPU);
          break;
        case "available" /* AVAILABLE */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.AVAILABLE_HAS_GPU);
          break;
        case "disabled" /* DISABLED */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.DISABLED_HAS_GPU);
          break;
      }
    } else {
      switch (this.#availability) {
        case "unavailable" /* UNAVAILABLE */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_NO_GPU);
          break;
        case "downloadable" /* DOWNLOADABLE */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_NO_GPU);
          break;
        case "downloading" /* DOWNLOADING */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.DOWNLOADING_NO_GPU);
          break;
        case "available" /* AVAILABLE */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.AVAILABLE_NO_GPU);
          break;
        case "disabled" /* DISABLED */:
          Host37.userMetrics.builtInAiAvailability(Host37.UserMetrics.BuiltInAiAvailability.DISABLED_NO_GPU);
          break;
      }
    }
  }
};
var Events3 = /* @__PURE__ */ ((Events4) => {
  Events4["DOWNLOAD_PROGRESS_CHANGED"] = "downloadProgressChanged";
  Events4["DOWNLOADED_AND_SESSION_CREATED"] = "downloadedAndSessionCreated";
  return Events4;
})(Events3 || {});

// ../../front_end/models/ai_assistance/ConversationSummary.ts
var ConversationSummary_exports = {};
__export(ConversationSummary_exports, {
  ConversationSummary: () => ConversationSummary
});
import * as Host38 from "../../core/host/host.js";
import * as Root17 from "../../core/root/root.js";
var preamble9 = `### Role
You are a Conversation Summarizer. Your task is to take a transcript of a conversation between a user and a DevTools AI agent and produce a succinct, actionable Markdown summary. This summary will be used to help apply fixes in an IDE, so it must capture all relevant technical details, findings, and proposed code changes without any conversational fluff.

### Critical Constraints
- **Strict Groundedness:** Only summarize information explicitly present in the provided transcript. Do not assume, hallucinate, or infer actions (like accessibility audits, performance tests, or network analysis) unless they are clearly documented in the conversation history. If a topic was not discussed, do not include it in the summary.
- **Persona:** Do not mention that you are an AI or refer to yourself in the third person.
- **Domain Scope:** Do not provide answers on non-web-development topics (e.g., legal, financial, medical, or personal advice).
- **Sensitive Topics:** If the conversation history touches on sensitive topics (religion, race, politics, sexuality, gender, etc.), respond only with: "My expertise is limited to summarizing DevTools AI conversations. I cannot provide information on that topic."
- **Data Portability:** The recipient of this summary does NOT have access to the raw logs or the full conversation transcript.
    - **No UIDs/Internal IDs:** Never refer to elements by internal IDs (e.g., \`uid=123\`).
    - **Standard Selectors:** Identify elements using HTML tags, classes, or IDs (e.g., \`button.submit-form\`).
    - **No Metadata:** Remove internal constants like \`NAVIGATION_0\` or \`INSIGHT_0\`.
- **No Process Narration:** Do not describe internal "thinking" or API calls. Skip phrases like "The agent investigated..." or "The user then asked...". Jump straight to the final findings and their technical context. **DO NOT** use chronological or narrative language (e.g., "Initially...", "Next...", "Then...", "After that...", "An attempt to...").
- **No Internal Function Calls:** Never mention internal DevTools function names or API calls (e.g., \`setElementStyles\`, \`executeScript\`). Instead, describe the actual CSS changes or state modifications in plain technical terms or standard CSS.
- **Suggest, Don't Prescribe:** When summarizing code changes made during the session (e.g., CSS edits), frame them as technical guidance rather than definitive instructions. Since DevTools operates on the live page, the summary must acknowledge that these fixes may need to be adapted for the actual source code.

### Objectives
1. **Identify Intent:** Define the core technical goal of the session.
2. **Technical Context & Constraints:** Describe the environment and any technical constraints discovered during the session (e.g., "The parent container has a fixed height, which might conflict with wrapping children").
3. **Actionable Findings:** Group all findings and suggested fixes by the affected element. For each element:
    - **Diagnostics:** List technical data points discovered (e.g., current style values, layout properties).
    - **Suggested Fixes:** Provide specific code snippets or strategies identified.
    - **Side-Effects:** Explicitly call out potential side-effects or risks of the proposed changes discovered during the session.

### Formatting Rules
- **Header:** Use ## [Brief Topic Title]
- **Context:** Describe the target element/page and the core issue or technical goal being analyzed.
- **Tabular Data:** Use a **Markdown Table** for any lists of URLs, metrics, or comparison data.
- **Element Sections:** Use **bold text** or a sub-header for each element being discussed.
- **Code Fixes:** Use fenced code blocks for suggested code optimizations. Use language that frames them as illustrative examples or context (e.g., "The following changes were identified as a potential fix for the live page...") rather than strict instructions.

---

### Example 1 (Performance Diagnostics)

**User Input:** "The agent analyzed the page and found three render-blocking CSS files: app.css (36ms) and fonts.css (80ms). It also checked UID 456 which is a div.hero."

**Desired Agent Output:**
## Performance Analysis: web.dev Home

**Context**
Analysis of the web.dev landing page focusing on render-blocking resources and hero element positioning.

**Technical Context & Constraints**
* **Network:** Slow 3G throttling was active during diagnostics.

**Actionable Findings**

The following resources were identified as render-blocking:

| Resource URL | Load Duration |
| :--- | :--- |
| \`app.css\` | 36 ms |
| \`fonts.css\` | 80 ms |

**Element: \`div.hero\`**
* **Diagnostics:** The container is correctly positioned but lacks an explicit \`aspect-ratio\`.
* **Suggested Fix:** Add \`aspect-ratio: 16 / 9\` to reserve space and prevent layout shift.

---

### Example 2 (Style Adjustments)

**User Input:** "The agent checked the styles of \`div.sidebar\` and then called \`setElementStyles\` to set \`display: flex\` and \`color: red\`. It also noted the parent \`nav\` has a fixed height."

**Desired Agent Output:**
## Style Adjustments: Sidebar

**Context**
Updating styles for the sidebar element to fix layout or visibility issues.

**Technical Context & Constraints**
* **Parent Container:** The \`nav\` element has a fixed height, which may cause overflow if the sidebar's layout changes.

**Actionable Findings**

**Element: \`div.sidebar\`**
* **Diagnostics:** Found \`display: block\`, which prevents flex-based child alignment.
* **Suggested Fix:**
\`\`\`css
display: flex;
color: red;
\`\`\`
* **Side-Effects:** Changing to flex may require adjusting width or margin of child elements to maintain horizontal alignment.

---

### Tone & Style
- Professional, objective, and dense.
- Past tense for actions; Present tense for technical facts.`;
var ConversationSummary = class {
  #aidaClient;
  #serverSideLoggingEnabled;
  constructor(options) {
    this.#aidaClient = options.aidaClient;
    this.#serverSideLoggingEnabled = options.serverSideLoggingEnabled ?? false;
  }
  async summarizeConversation(conversation) {
    const enhancedQuery = `Summarize the following conversation:

${conversation}`;
    const temperature = Root17.Runtime.hostConfig.devToolsFreestyler?.temperature;
    const modelId = Root17.Runtime.hostConfig.devToolsFreestyler?.modelId;
    const userTier = Root17.Runtime.hostConfig.devToolsFreestyler?.userTier;
    const resultText = await runOneShotPrompt({
      aidaClient: this.#aidaClient,
      preamble: preamble9,
      query: enhancedQuery,
      clientFeature: Host38.AidaClient.ClientFeature.CHROME_CONVERSATION_SUMMARY_AGENT,
      temperature,
      modelId,
      userTier,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled
    });
    if (!resultText) {
      throw new Error("Failed to summarize conversation");
    }
    const disclaimer = "*Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides.*";
    return `${resultText.trim()}

${disclaimer}`;
  }
};

// ../../front_end/models/ai_assistance/PerformanceAnnotations.ts
var PerformanceAnnotations_exports = {};
__export(PerformanceAnnotations_exports, {
  PerformanceAnnotations: () => PerformanceAnnotations
});
import * as Host39 from "../../core/host/host.js";
import * as Root18 from "../../core/root/root.js";
var callTreePreamble = `You are an expert performance analyst embedded within Chrome DevTools.
You meticulously examine web application behavior captured by the Chrome DevTools Performance Panel and Chrome tracing.
You will receive a structured text representation of a call tree, derived from a user-selected call frame within a performance trace's flame chart.
This tree originates from the root task associated with the selected call frame.

Each call frame is presented in the following format:

'id;name;duration;selfTime;urlIndex;childRange;[S]'

Key definitions:

* id: A unique numerical identifier for the call frame.
* name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
* duration: The total execution time of the call frame, including its children.
* selfTime: The time spent directly within the call frame, excluding its children's execution.
* urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
* childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
* S: **Optional marker.** The letter 'S' appears at the end of the line **only** for the single call frame selected by the user.

Your objective is to provide a comprehensive analysis of the **selected call frame and the entire call tree** and its context within the performance recording, including:

1.  **Functionality:** Clearly describe the purpose and actions of the selected call frame based on its properties (name, URL, etc.).
2.  **Execution Flow:**
    * **Ancestors:** Trace the execution path from the root task to the selected call frame, explaining the sequence of parent calls.
    * **Descendants:** Analyze the child call frames, identifying the tasks they initiate and any performance-intensive sub-tasks.
3.  **Performance Metrics:**
    * **Duration and Self Time:** Report the execution time of the call frame and its children.
    * **Relative Cost:** Evaluate the contribution of the call frame to the overall duration of its parent tasks and the entire trace.
    * **Bottleneck Identification:** Identify potential performance bottlenecks based on duration and self time, including long-running tasks or idle periods.
4.  **Optimization Recommendations:** Provide specific, actionable suggestions for improving the performance of the selected call frame and its related tasks, focusing on resource management and efficiency. Only provide recommendations if they are based on data present in the call tree.

# Important Guidelines:

* Maintain a concise and technical tone suitable for software engineers.
* Exclude call frame IDs and URL indices from your response.
* **Critical:** If asked about sensitive topics (religion, race, politics, sexuality, gender, etc.), respond with: "My expertise is limited to website performance analysis. I cannot provide information on that topic.".
* **Critical:** Refrain from providing answers on non-web-development topics, such as legal, financial, medical, or personal advice.

## Example Session:

All URLs:
* 0 - app.js

Call Tree:

1;main;500;100;;
2;update;200;50;;3
3;animate;150;20;0;4-5;S
4;calculatePosition;80;80;;
5;applyStyles;50;50;;

Analyze the selected call frame.

Example Response:

The selected call frame is 'animate', responsible for visual animations within 'app.js'.
It took 150ms total, with 20ms spent directly within the function.
The 'calculatePosition' and 'applyStyles' child functions consumed the remaining 130ms.
The 'calculatePosition' function, taking 80ms, is a potential bottleneck.
Consider optimizing the position calculation logic or reducing the frequency of calls to improve animation performance.
`;
var AI_LABEL_GENERATION_PROMPT = `## Instruction:
Generate a concise label (max 60 chars, single line) describing the *user-visible effect* of the selected call tree's activity, based solely on the provided call tree data.

## Strict Constraints:
- Output must be a single line of text.
- Maximum 60 characters.
- No full stops.
- Focus on user impact, not internal operations.
- Do not include the name of the selected event.
- Do not make assumptions about when the activity happened.
- Base the description only on the information present within the call tree data.
- Prioritize brevity.
- Only include third-party script names if their identification is highly confident.
- Very important: Only output the 60 character label text, your response will be used in full to show to the user as an annotation in the timeline.
`;
var PerformanceAnnotations = class {
  #aidaClient;
  #serverSideLoggingEnabled;
  constructor(options) {
    this.#aidaClient = options.aidaClient;
    this.#serverSideLoggingEnabled = options.serverSideLoggingEnabled ?? false;
  }
  async generateAIEntryLabel(callTree) {
    const contextString = callTree.serialize();
    const query = `${contextString}

# User request

${AI_LABEL_GENERATION_PROMPT}`;
    const temperature = Root18.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.temperature;
    const modelId = Root18.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.modelId;
    const userTier = Root18.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.userTier;
    const resultText = await runOneShotPrompt({
      aidaClient: this.#aidaClient,
      preamble: callTreePreamble,
      query,
      clientFeature: Host39.AidaClient.ClientFeature.CHROME_PERFORMANCE_ANNOTATIONS_AGENT,
      temperature,
      modelId,
      userTier,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled
    });
    if (!resultText) {
      throw new Error("Failed to generate AI entry label");
    }
    return resultText.trim();
  }
};

// ../../front_end/models/ai_assistance/skills/Skill.ts
var Skill_exports = {};
export {
  AICallTree_exports as AICallTree,
  AIContext_exports as AIContext,
  AIQueries_exports as AIQueries,
  AccessibilityAgent_exports as AccessibilityAgent,
  AccessibilityContext_exports as AccessibilityContext,
  AiAgent_exports as AiAgent,
  AiAgent2_exports as AiAgent2,
  AiConversation_exports as AiConversation,
  AiHistoryStorage_exports as AiHistoryStorage,
  AiOrigins_exports as AiOrigins,
  AiSetting_exports as AiSetting,
  AiUtils_exports as AiUtils,
  BuiltInAi_exports as BuiltInAi,
  ChangeManager_exports as ChangeManager,
  ContextSelectionAgent_exports as ContextSelectionAgent,
  ConversationSummary_exports as ConversationSummary,
  CookieUtils_exports as CookieUtils,
  DOMNodeContext_exports as DOMNodeContext,
  DOMStorageUtils_exports as DOMStorageUtils,
  debug_exports as Debug,
  EvaluateAction_exports as EvaluateAction,
  ExecuteJavaScript_exports as ExecuteJavaScript,
  ExtensionScope_exports as ExtensionScope,
  FileAgent_exports as FileAgent,
  FileContext_exports as FileContext,
  FileFormatter_exports as FileFormatter,
  GetDetailedCallTree_exports as GetDetailedCallTree,
  GetElementAccessibilityDetails_exports as GetElementAccessibilityDetails,
  GetFunctionCode_exports as GetFunctionCode,
  GetInsightDetails_exports as GetInsightDetails,
  GetLighthouseAudits_exports as GetLighthouseAudits,
  GetNetworkRequestDetails_exports as GetNetworkRequestDetails,
  GetResourceContent_exports as GetResourceContent,
  GetSourceContent_exports as GetSourceContent,
  GetStorageValues_exports as GetStorageValues,
  GetStyles_exports as GetStyles,
  GetTraceEventByKey_exports as GetTraceEventByKey,
  GetTraceMainThreadSummary_exports as GetTraceMainThreadSummary,
  GetTraceNetworkSummary_exports as GetTraceNetworkSummary,
  injected_exports as Injected,
  LighthouseFormatter_exports as LighthouseFormatter,
  ListCookies_exports as ListCookies,
  ListNetworkRequests_exports as ListNetworkRequests,
  ListPageOrigins_exports as ListPageOrigins,
  ListSources_exports as ListSources,
  ListStorageKeys_exports as ListStorageKeys,
  NetworkAgent_exports as NetworkAgent,
  NetworkRequestFormatter_exports as NetworkRequestFormatter,
  PerformanceAgent_exports as PerformanceAgent,
  PerformanceAnnotations_exports as PerformanceAnnotations,
  PerformanceInsightFormatter_exports as PerformanceInsightFormatter,
  PerformanceTraceContext_exports as PerformanceTraceContext,
  PerformanceTraceFormatter_exports as PerformanceTraceFormatter,
  RecordPerformanceTrace_exports as RecordPerformanceTrace,
  RequestContext_exports as RequestContext,
  ResolveDevtoolsNodePath_exports as ResolveDevtoolsNodePath,
  RunLighthouse_exports as RunLighthouse,
  SelectTraceEventByKey_exports as SelectTraceEventByKey,
  Skill_exports as Skill,
  SkillRegistry_exports as SkillRegistry,
  StorageAgent_exports as StorageAgent,
  StorageContext_exports as StorageContext,
  StorageItem_exports as StorageItem,
  StylingAgent_exports as StylingAgent,
  Tool_exports as Tool,
  ToolRegistry_exports as ToolRegistry,
  UnitFormatters_exports as UnitFormatters
};
//# sourceMappingURL=ai_assistance.js.map
