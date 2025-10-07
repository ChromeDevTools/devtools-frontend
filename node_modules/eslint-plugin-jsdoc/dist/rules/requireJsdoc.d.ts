declare const _default: {
    create(context: import("eslint").Rule.RuleContext): {};
    meta: {
        docs: {
            category: string;
            description: string;
            recommended: boolean;
            url: string;
        };
        fixable: "code";
        messages: {
            missingJsDoc: string;
        };
        schema: import("json-schema").JSONSchema4[];
        type: "suggestion";
    };
};
export default _default;
export type RequireJsdocOpts = {
    ancestorsOnly: boolean;
    esm: boolean;
    initModuleExports: boolean;
    initWindow: boolean;
};
export type ESLintOrTSNode = import("eslint").Rule.Node | import("@typescript-eslint/types").TSESTree.Node;
//# sourceMappingURL=requireJsdoc.d.ts.map