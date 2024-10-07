import { HTMLDataV1 } from "vscode-html-languageservice";
import { LitDiagnosticSeverity } from "./types/lit-diagnostic.js";
export type LitAnalyzerRuleSeverity = "on" | "off" | "warn" | "warning" | "error" | 0 | 1 | 2 | true | false;
export type LitAnalyzerRuleId = "no-unknown-tag-name" | "no-missing-import" | "no-unclosed-tag" | "no-unknown-attribute" | "no-unknown-property" | "no-unknown-event" | "no-unknown-slot" | "no-unintended-mixed-binding" | "no-invalid-boolean-binding" | "no-expressionless-property-binding" | "no-noncallable-event-binding" | "no-boolean-in-attribute-binding" | "no-complex-attribute-binding" | "no-nullable-attribute-binding" | "no-incompatible-type-binding" | "no-invalid-directive-binding" | "no-incompatible-property-type" | "no-invalid-attribute-name" | "no-invalid-tag-name" | "no-invalid-css" | "no-property-visibility-mismatch" | "no-legacy-attribute" | "no-missing-element-type-definition";
export type LitAnalyzerRules = Partial<Record<LitAnalyzerRuleId, LitAnalyzerRuleSeverity | [LitAnalyzerRuleSeverity]>>;
export declare const ALL_RULE_IDS: LitAnalyzerRuleId[];
export declare const RULE_ID_CODE_MAP: Record<LitAnalyzerRuleId, number>;
export declare function ruleIdCode(ruleId: LitAnalyzerRuleId): number;
export declare function ruleSeverity(rules: LitAnalyzerConfig | LitAnalyzerRules, ruleId: LitAnalyzerRuleId): LitAnalyzerRuleSeverity;
export declare function isRuleDisabled(config: LitAnalyzerConfig, ruleId: LitAnalyzerRuleId): boolean;
export declare function isRuleEnabled(config: LitAnalyzerConfig, ruleId: LitAnalyzerRuleId): boolean;
export declare function litDiagnosticRuleSeverity(config: LitAnalyzerConfig, ruleId: LitAnalyzerRuleId): LitDiagnosticSeverity;
export type LitAnalyzerLogging = "off" | "error" | "warn" | "debug" | "verbose";
export type LitSecuritySystem = "off" | "ClosureSafeTypes";
export interface LitAnalyzerConfig {
    strict: boolean;
    rules: LitAnalyzerRules;
    securitySystem: LitSecuritySystem;
    disable: boolean;
    logging: LitAnalyzerLogging;
    cwd: string;
    format: {
        disable: boolean;
    };
    dontShowSuggestions: boolean;
    dontSuggestConfigChanges: boolean;
    maxNodeModuleImportDepth: number;
    maxProjectImportDepth: number;
    htmlTemplateTags: string[];
    cssTemplateTags: string[];
    globalTags: string[];
    globalAttributes: string[];
    globalEvents: string[];
    customHtmlData: (string | HTMLDataV1)[] | string | HTMLDataV1;
}
/**
 * Parses a partial user configuration and returns a full options object with defaults.
 * @param userOptions
 */
export declare function makeConfig(userOptions?: Partial<LitAnalyzerConfig>): LitAnalyzerConfig;
export declare function makeRules(userOptions: Partial<LitAnalyzerConfig>): LitAnalyzerRules;
//# sourceMappingURL=lit-analyzer-config.d.ts.map