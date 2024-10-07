import type * as tsModule from "typescript";
import type { Declaration, Decorator, Identifier, InterfaceDeclaration, Node, PropertyDeclaration, PropertySignature, SetAccessorDeclaration, Symbol, SyntaxKind, TypeChecker } from "typescript";
import { ModifierKind } from "../types/modifier-kind";
import { VisibilityKind } from "../types/visibility-kind";
export interface AstContext {
    ts: typeof tsModule;
    checker: TypeChecker;
}
/**
 * Resolves all relevant declarations of a specific node.
 * @param node
 * @param context
 */
export declare function resolveDeclarations(node: Node, context: {
    checker: TypeChecker;
    ts: typeof tsModule;
}): Declaration[];
/**
 * Returns the symbol of a node.
 * This function follows aliased symbols.
 * @param node
 * @param context
 */
export declare function getSymbol(node: Node, context: {
    checker: TypeChecker;
    ts: typeof tsModule;
}): Symbol | undefined;
/**
 * Resolves the declarations of a symbol. A valueDeclaration is always the first entry in the array
 * @param symbol
 */
export declare function resolveSymbolDeclarations(symbol: Symbol): Declaration[];
/**
 * Resolve a declaration by trying to find the real value by following assignments.
 * @param node
 * @param context
 */
export declare function resolveDeclarationsDeep(node: Node, context: {
    checker: TypeChecker;
    ts: typeof tsModule;
}): Node[];
/**
 * Returns if the symbol has "alias" flag
 * @param symbol
 * @param ts
 */
export declare function isAliasSymbol(symbol: Symbol, ts: typeof tsModule): boolean;
/**
 * Returns a set of modifiers on a node
 * @param node
 * @param ts
 */
export declare function getModifiersFromNode(node: Node, ts: typeof tsModule): Set<ModifierKind> | undefined;
/**
 * Returns if a number has a flag
 * @param num
 * @param flag
 */
export declare function hasFlag(num: number, flag: number): boolean;
/**
 * Returns if a node has a specific modifier.
 * @param node
 * @param modifierKind
 */
export declare function hasModifier(node: Node, modifierKind: SyntaxKind, ts: typeof tsModule): boolean;
/**
 * Returns the visibility of a node
 */
export declare function getMemberVisibilityFromNode(node: PropertyDeclaration | PropertySignature | SetAccessorDeclaration | Node, ts: typeof tsModule): VisibilityKind | undefined;
/**
 * Returns all keys and corresponding interface/class declarations for keys in an interface.
 * @param interfaceDeclaration
 * @param context
 */
export declare function getInterfaceKeys(interfaceDeclaration: InterfaceDeclaration, context: AstContext): {
    key: string;
    keyNode: Node;
    identifier?: Node;
    declaration?: Node;
}[];
export declare function isPropertyRequired(property: PropertySignature | PropertyDeclaration, checker: TypeChecker, ts: typeof tsModule): boolean;
/**
 * Find a node recursively walking up the tree using parent nodes.
 * @param node
 * @param test
 */
export declare function findParent<T extends Node = Node>(node: Node | undefined, test: (node: Node) => node is T): T | undefined;
/**
 * Find a node recursively walking down the children of the tree. Depth first search.
 * @param node
 * @param test
 */
export declare function findChild<T extends Node = Node>(node: Node | undefined, test: (node: Node) => node is T): T | undefined;
/**
 * Find multiple children by walking down the children of the tree. Depth first search.
 * @param node
 * @param test
 * @param emit
 */
export declare function findChildren<T extends Node = Node>(node: Node | undefined, test: (node: Node) => node is T, emit: (node: T) => void): void;
/**
 * Returns the language of the node's source file
 * @param node
 */
export declare function getNodeSourceFileLang(node: Node): "js" | "ts";
/**
 * Returns if a node is in a declaration file
 * @param node
 */
export declare function isNodeInDeclarationFile(node: Node): boolean;
/**
 * Returns the leading comment for a given node
 * @param node
 * @param ts
 */
export declare function getLeadingCommentForNode(node: Node, ts: typeof tsModule): string | undefined;
/**
 * Returns the declaration name of a given node if possible.
 * @param node
 * @param context
 */
export declare function getNodeName(node: Node, context: {
    ts: typeof tsModule;
}): string | undefined;
/**
 * Returns the declaration name of a given node if possible.
 * @param node
 * @param context
 */
export declare function getNodeIdentifier(node: Node, context: {
    ts: typeof tsModule;
}): Identifier | undefined;
/**
 * Returns all decorators in either the node's `decorators` or `modifiers`.
 * @param node
 * @param context
 */
export declare function getDecorators(node: Node, context: {
    ts: typeof tsModule;
}): ReadonlyArray<Decorator>;
//# sourceMappingURL=ast-util.d.ts.map