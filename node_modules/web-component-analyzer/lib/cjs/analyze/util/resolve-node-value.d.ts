import * as tsModule from "typescript";
import { Node, TypeChecker } from "typescript";
export interface Context {
    ts: typeof tsModule;
    checker?: TypeChecker;
    depth?: number;
    strict?: boolean;
}
/**
 * Takes a node and tries to resolve a constant value from it.
 * Returns undefined if no constant value can be resolved.
 * @param node
 * @param context
 */
export declare function resolveNodeValue(node: Node | undefined, context: Context): {
    value: unknown;
    node: Node;
} | undefined;
//# sourceMappingURL=resolve-node-value.d.ts.map