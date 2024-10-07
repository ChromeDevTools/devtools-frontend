import { ComponentDeclaration, ComponentDefinition } from "web-component-analyzer";
import { LitAnalyzerRuleId } from "./lit-analyzer-config.js";
import { LitAnalyzerContext } from "./lit-analyzer-context.js";
import { HtmlDocument } from "./parse/document/text-document/html-document/html-document.js";
import { RuleDiagnostic } from "./types/rule/rule-diagnostic.js";
import { RuleModule } from "./types/rule/rule-module.js";
export interface ReportedRuleDiagnostic {
    source: LitAnalyzerRuleId;
    diagnostic: RuleDiagnostic;
}
export declare class RuleCollection {
    private rules;
    push(...rule: RuleModule[]): void;
    private invokeRules;
    getDiagnosticsFromDeclaration(declaration: ComponentDeclaration, baseContext: LitAnalyzerContext): ReportedRuleDiagnostic[];
    getDiagnosticsFromDefinition(definition: ComponentDefinition, baseContext: LitAnalyzerContext): ReportedRuleDiagnostic[];
    getDiagnosticsFromDocument(htmlDocument: HtmlDocument, baseContext: LitAnalyzerContext): ReportedRuleDiagnostic[];
}
//# sourceMappingURL=rule-collection.d.ts.map