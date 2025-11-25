export function buildRejectOrPreferRuleDefinition({ checkNativeTypes, typeName, description, overrideSettings, schema, url, }: {
    checkNativeTypes?: import("./rules/checkTypes.js").CheckNativeTypes | null;
    overrideSettings?: import("./iterateJsdoc.js").Settings["preferredTypes"] | null;
    description?: string;
    schema?: import("eslint").Rule.RuleMetaData["schema"];
    typeName?: string;
    url?: string;
}): import("eslint").Rule.RuleModule;
//# sourceMappingURL=buildRejectOrPreferRuleDefinition.d.ts.map