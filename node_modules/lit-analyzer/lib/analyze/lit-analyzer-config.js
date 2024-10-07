"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRules = exports.makeConfig = exports.litDiagnosticRuleSeverity = exports.isRuleEnabled = exports.isRuleDisabled = exports.ruleSeverity = exports.ruleIdCode = exports.RULE_ID_CODE_MAP = exports.ALL_RULE_IDS = void 0;
/**
 * The values of this map are tuples where 1st element is
 * non-strict severity and 2nd element is "strict" severity
 */
var DEFAULT_RULES_SEVERITY = {
    "no-unknown-tag-name": ["off", "warn"],
    "no-missing-import": ["off", "warn"],
    "no-unclosed-tag": ["warn", "error"],
    "no-unknown-attribute": ["off", "warn"],
    "no-unknown-property": ["off", "warn"],
    "no-unknown-event": ["off", "off"],
    "no-unknown-slot": ["off", "warn"],
    "no-unintended-mixed-binding": ["warn", "warn"],
    "no-invalid-boolean-binding": ["error", "error"],
    "no-expressionless-property-binding": ["error", "error"],
    "no-noncallable-event-binding": ["error", "error"],
    "no-boolean-in-attribute-binding": ["error", "error"],
    "no-complex-attribute-binding": ["error", "error"],
    "no-nullable-attribute-binding": ["error", "error"],
    "no-incompatible-type-binding": ["error", "error"],
    "no-invalid-directive-binding": ["error", "error"],
    "no-incompatible-property-type": ["warn", "error"],
    "no-invalid-attribute-name": ["error", "error"],
    "no-invalid-tag-name": ["error", "error"],
    "no-invalid-css": ["warn", "error"],
    "no-property-visibility-mismatch": ["off", "warning"],
    "no-legacy-attribute": ["off", "off"],
    "no-missing-element-type-definition": ["off", "off"]
};
// All rule names order alphabetically
exports.ALL_RULE_IDS = Object.keys(DEFAULT_RULES_SEVERITY).sort();
// This map is based on alphabetic order, so it assumed that
//   these rule codes are changed when new rules are added and
//   should not be depended on by the user.
// The user should always use the "rule id" string.
// Consider if this map should be manually maintained in the future.
exports.RULE_ID_CODE_MAP = exports.ALL_RULE_IDS.reduce(function (acc, ruleId, i) {
    acc[ruleId] = i + 2300;
    return acc;
}, {});
function ruleIdCode(ruleId) {
    return exports.RULE_ID_CODE_MAP[ruleId];
}
exports.ruleIdCode = ruleIdCode;
function ruleSeverity(rules, ruleId) {
    if ("rules" in rules)
        return ruleSeverity(rules.rules, ruleId);
    var ruleConfig = rules[ruleId] || "off";
    return Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
}
exports.ruleSeverity = ruleSeverity;
function isRuleDisabled(config, ruleId) {
    return ["off", 0, false].includes(ruleSeverity(config, ruleId));
}
exports.isRuleDisabled = isRuleDisabled;
function isRuleEnabled(config, ruleId) {
    return !isRuleDisabled(config, ruleId);
}
exports.isRuleEnabled = isRuleEnabled;
function litDiagnosticRuleSeverity(config, ruleId) {
    switch (ruleSeverity(config, ruleId)) {
        case "off":
        case false:
        case 0:
            return "warning";
        case "warn":
        case "warning":
        case true:
        case "on":
        case 1:
            return "warning";
        case "error":
        case 2:
            return "error";
    }
}
exports.litDiagnosticRuleSeverity = litDiagnosticRuleSeverity;
function expectNever(never) {
    return never;
}
/**
 * Parses a partial user configuration and returns a full options object with defaults.
 * @param userOptions
 */
function makeConfig(userOptions) {
    if (userOptions === void 0) { userOptions = {}; }
    var securitySystem = userOptions.securitySystem || "off";
    switch (securitySystem) {
        case "off":
        case "ClosureSafeTypes":
            break; // legal values
        default:
            // Log an error here? Or maybe throw?
            expectNever(securitySystem);
            // Unknown values get converted to "off".
            securitySystem = "off";
    }
    return {
        strict: userOptions.strict || false,
        rules: makeRules(userOptions),
        securitySystem: userOptions.securitySystem || "off",
        disable: userOptions.disable || false,
        logging: userOptions.logging || "off",
        cwd: userOptions.cwd || process.cwd(),
        format: {
            disable: userOptions.format != null ? userOptions.format.disable : undefined || false // always disable formating for now
        },
        dontSuggestConfigChanges: userOptions.dontSuggestConfigChanges || false,
        dontShowSuggestions: userOptions.dontShowSuggestions || getDeprecatedOption(userOptions, "skipSuggestions") || false,
        maxProjectImportDepth: parseImportDepth(userOptions.maxProjectImportDepth, Infinity),
        maxNodeModuleImportDepth: parseImportDepth(userOptions.maxNodeModuleImportDepth, 1),
        // Template tags
        htmlTemplateTags: userOptions.htmlTemplateTags || ["html", "raw"],
        cssTemplateTags: userOptions.cssTemplateTags || ["css"],
        // Global additions
        globalTags: userOptions.globalTags || getDeprecatedOption(userOptions, "externalHtmlTagNames") || [],
        globalAttributes: userOptions.globalAttributes || [],
        globalEvents: userOptions.globalEvents || [],
        customHtmlData: userOptions.customHtmlData || []
    };
}
exports.makeConfig = makeConfig;
function getDeprecatedOption(userOptions, name) {
    return userOptions[name];
}
/*function getDeprecatedRule(userOptions: Partial<LitAnalyzerConfig>, name: string): LitAnalyzerRuleSeverity | undefined {
    return userOptions.rules?.[name as never];
}*/
function makeRules(userOptions) {
    var mappedDeprecatedRules = getDeprecatedMappedRules(userOptions);
    var defaultRules = getDefaultRules(userOptions);
    var userRules = getUserRules(userOptions);
    return Object.assign({}, defaultRules, mappedDeprecatedRules, userRules);
}
exports.makeRules = makeRules;
function getUserRules(userOptions) {
    return userOptions.rules || {};
}
function getDefaultRules(userOptions) {
    var isStrict = userOptions.strict || false;
    return exports.ALL_RULE_IDS.reduce(function (acc, ruleId) {
        var severities = DEFAULT_RULES_SEVERITY[ruleId];
        acc[ruleId] = isStrict ? severities[1] : severities[0];
        return acc;
    }, {});
}
function getDeprecatedMappedRules(userOptions) {
    var mappedDeprecatedRules = {};
    if (getDeprecatedOption(userOptions, "skipMissingImports") === true) {
        mappedDeprecatedRules["no-missing-import"] = "off";
    }
    if (getDeprecatedOption(userOptions, "skipUnknownTags") === true) {
        mappedDeprecatedRules["no-unknown-tag-name"] = "off";
    }
    if (getDeprecatedOption(userOptions, "skipUnknownAttributes") === true) {
        mappedDeprecatedRules["no-unknown-attribute"] = "off";
    }
    if (getDeprecatedOption(userOptions, "skipUnknownProperties") === true) {
        mappedDeprecatedRules["no-unknown-property"] = "off";
    }
    if (getDeprecatedOption(userOptions, "skipUnknownSlots") === true) {
        mappedDeprecatedRules["no-unknown-slot"] = "off";
    }
    if (getDeprecatedOption(userOptions, "skipCssChecks") === true) {
        mappedDeprecatedRules["no-invalid-css"] = "off";
    }
    if (getDeprecatedOption(userOptions, "checkUnknownEvents") === true) {
        mappedDeprecatedRules["no-unknown-event"] = "warn";
    }
    if (getDeprecatedOption(userOptions, "skipTypeChecking") === true) {
        Object.assign(mappedDeprecatedRules, {
            "no-invalid-boolean-binding": "off",
            "no-noncallable-event-binding": "off",
            "no-boolean-in-attribute-binding": "off",
            "no-complex-attribute-binding": "off",
            "no-nullable-attribute-binding": "off",
            "no-incompatible-type-binding": "off",
            "no-incompatible-property-type": "off"
        });
    }
    return mappedDeprecatedRules;
}
/**
 * Parses dependency traversal depth from configuration.
 * The number -1 (as well as any other negative number) gets parsed into the number Infinity.
 * @param value
 * @param defaultValue
 */
function parseImportDepth(value, defaultValue) {
    if (value != null) {
        return value < 0 ? Infinity : value;
    }
    else {
        return defaultValue;
    }
}
