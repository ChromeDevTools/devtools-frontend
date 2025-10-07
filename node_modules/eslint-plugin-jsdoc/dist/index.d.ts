export default index;
/**
 * @type {((
 *   cfg?: import('eslint').Linter.Config & {
 *     config?: `flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`,
 *     mergeSettings?: boolean,
 *     settings?: Partial<import('./iterateJsdoc.js').Settings>,
 *     rules?: {[key in keyof import('./rules.d.ts').Rules]?: import('eslint').Linter.RuleEntry<import('./rules.d.ts').Rules[key]>},
 *     extraRuleDefinitions?: {
 *       forbid?: {
 *         [contextName: string]: {
 *           description?: string,
 *           url?: string,
 *           contexts: (string|{
 *             message: string,
 *             context: string,
 *             comment: string
 *           })[]
 *         }
 *       },
 *       preferTypes?: {
 *         [typeName: string]: {
 *           description: string,
 *           overrideSettings: {
 *             [typeNodeName: string]: {
 *               message: string,
 *               replacement?: false|string,
 *               unifyParentAndChildTypeChecks?: boolean,
 *             }
 *           },
 *           url: string,
 *         }
 *       }
 *     }
 *   }
 * ) => import('eslint').Linter.Config)}
 */
export const jsdoc: ((cfg?: import("eslint").Linter.Config & {
    config?: `flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`;
    mergeSettings?: boolean;
    settings?: Partial<import("./iterateJsdoc.js").Settings>;
    rules?: { [key in keyof import("./rules.d.ts").Rules]?: import("eslint").Linter.RuleEntry<import("./rules.d.ts").Rules[key]>; };
    extraRuleDefinitions?: {
        forbid?: {
            [contextName: string]: {
                description?: string;
                url?: string;
                contexts: (string | {
                    message: string;
                    context: string;
                    comment: string;
                })[];
            };
        };
        preferTypes?: {
            [typeName: string]: {
                description: string;
                overrideSettings: {
                    [typeNodeName: string]: {
                        message: string;
                        replacement?: false | string;
                        unifyParentAndChildTypeChecks?: boolean;
                    };
                };
                url: string;
            };
        };
    };
}) => import("eslint").Linter.Config);
export { getJsdocProcessorPlugin } from "./getJsdocProcessorPlugin.js";
export type ConfigGroups = "recommended" | "stylistic" | "contents" | "logical" | "requirements";
export type ConfigVariants = "" | "-typescript" | "-typescript-flavor";
export type ErrorLevelVariants = "" | "-error";
/**
 * @typedef {"recommended" | "stylistic" | "contents" | "logical" | "requirements"} ConfigGroups
 * @typedef {"" | "-typescript" | "-typescript-flavor"} ConfigVariants
 * @typedef {"" | "-error"} ErrorLevelVariants
 * @type {import('eslint').ESLint.Plugin & {
 *   configs: Record<
 *       `flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`,
 *       import('eslint').Linter.Config
 *     > &
 *     Record<
 *       "examples"|"default-expressions"|"examples-and-default-expressions",
 *       import('eslint').Linter.Config[]
 *     > &
 *     Record<"flat/recommended-mixed", import('eslint').Linter.Config[]>
 * }}
 */
declare const index: import("eslint").ESLint.Plugin & {
    configs: Record<`flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`, import("eslint").Linter.Config> & Record<"examples" | "default-expressions" | "examples-and-default-expressions", import("eslint").Linter.Config[]> & Record<"flat/recommended-mixed", import("eslint").Linter.Config[]>;
};
//# sourceMappingURL=index.d.ts.map