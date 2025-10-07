export type ESTreeOrTypeScriptNode = import("estree").Node | import("@typescript-eslint/types").TSESTree.Node;
export type PromiseFilter = (node: ESTreeOrTypeScriptNode | undefined) => boolean;
/**
 * Checks if a node has a return statement. Void return does not count.
 * @param {ESTreeOrTypeScriptNode|undefined|null} node
 * @param {boolean} [throwOnNullReturn]
 * @param {PromiseFilter} [promFilter]
 * @returns {boolean|undefined}
 */
export function hasReturnValue(node: ESTreeOrTypeScriptNode | undefined | null, throwOnNullReturn?: boolean, promFilter?: PromiseFilter): boolean | undefined;
/**
 * Checks if a Promise executor has no resolve value or an empty value.
 * An `undefined` resolve does not count.
 * @param {ESTreeOrTypeScriptNode} node
 * @param {boolean} anyPromiseAsReturn
 * @param {boolean} [allBranches]
 * @returns {boolean}
 */
export function hasValueOrExecutorHasNonEmptyResolveValue(node: ESTreeOrTypeScriptNode, anyPromiseAsReturn: boolean, allBranches?: boolean): boolean;
