export default index;
export type ConfigGroups = "recommended" | "stylistic" | "contents" | "logical";
export type ConfigVariants = "" | "-typescript" | "-typescript-flavor";
export type ErrorLevelVariants = "" | "-error";
/**
 * @typedef {"recommended" | "stylistic" | "contents" | "logical"} ConfigGroups
 * @typedef {"" | "-typescript" | "-typescript-flavor"} ConfigVariants
 * @typedef {"" | "-error"} ErrorLevelVariants
 * @type {import('eslint').ESLint.Plugin & {
*   configs: Record<`flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`, import('eslint').Linter.Config>
* }}
*/
declare const index: import("eslint").ESLint.Plugin & {
    configs: Record<`flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`, import("eslint").Linter.Config>;
};
//# sourceMappingURL=index.d.ts.map