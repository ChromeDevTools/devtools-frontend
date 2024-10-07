import { Identifier, Node } from "typescript";
import { tsModule } from "../ts-module.js";
import { Range } from "../types/range.js";
/**
 * Tests nodes recursively walking up the tree using parent nodes.
 * @param node
 * @param test
 */
export declare function findParent<T = Node>(node: Node | undefined, test: (node: Node) => boolean): T | undefined;
export declare function findChild<T = Node>(node: Node | undefined, test: (node: Node) => boolean): T | undefined;
/**
 * Returns a node at a specific position.
 * @param node
 * @param position
 */
export declare function getNodeAtPosition(node: Node, position: number | Range): Node | undefined;
export declare function nodeIntersects(nodeA: Node, nodeB: Node): boolean;
/**
 * Checks whether a leading comment includes a given search string.
 * @param text
 * @param pos
 * @param needle
 */
export declare function leadingCommentsIncludes(text: string, pos: number, needle: string): boolean;
/**
 * Returns the declaration name of a given node if possible.
 * @param node
 * @param ts
 */
export declare function getNodeIdentifier(node: Node, ts: typeof tsModule.ts): Identifier | undefined;
//# sourceMappingURL=ast-util.d.ts.map