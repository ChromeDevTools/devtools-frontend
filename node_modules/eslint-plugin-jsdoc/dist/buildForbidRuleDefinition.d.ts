export function buildForbidRuleDefinition({ contextName, contexts: cntxts, description, getContexts, modifyContext, schema, url, }: {
    contexts?: Contexts;
    description?: string;
    getContexts?: (ctxt: import("eslint").Rule.RuleContext, report: import("./iterateJsdoc.js").Report) => Contexts | false;
    contextName?: string;
    modifyContext?: (context: import("eslint").Rule.RuleContext) => import("eslint").Rule.RuleContext;
    schema?: import("eslint").Rule.RuleMetaData["schema"];
    url?: string;
}): import("eslint").Rule.RuleModule;
export type Contexts = (string | {
    comment: string;
    context: string;
    message?: string;
})[];
//# sourceMappingURL=buildForbidRuleDefinition.d.ts.map