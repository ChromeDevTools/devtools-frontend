export type Token = import('eslint').AST.Token | import('estree').Comment | {
    type: import('eslint').AST.TokenType | "Line" | "Block" | "Shebang";
    range: [number, number];
    value: string;
};
export type ESLintOrTSNode = import('eslint').Rule.Node | import('@typescript-eslint/types').TSESTree.Node;
export type int = number;
/**
 * Reduces the provided node to the appropriate node for evaluating
 * JSDoc comment status.
 *
 * @param {import('eslint').Rule.Node} node An AST node.
 * @param {import('eslint').SourceCode} sourceCode The ESLint SourceCode.
 * @returns {import('eslint').Rule.Node} The AST node that
 *   can be evaluated for appropriate JSDoc comments.
 */
export function getReducedASTNode(node: import('eslint').Rule.Node, sourceCode: import('eslint').SourceCode): import('eslint').Rule.Node;
/**
 * Retrieves the JSDoc comment for a given node.
 *
 * @param {import('eslint').SourceCode} sourceCode The ESLint SourceCode
 * @param {import('eslint').Rule.Node} node The AST node to get
 *   the comment for.
 * @param {{maxLines: int, minLines: int, [name: string]: any}} settings The
 *   settings in context
 * @returns {Token|null} The Block comment
 *   token containing the JSDoc comment for the given node or
 *   null if not found.
 * @public
 */
export function getJSDocComment(sourceCode: import('eslint').SourceCode, node: import('eslint').Rule.Node, settings: {
    [name: string]: any;
    maxLines: int;
    minLines: int;
}): Token | null;
/**
 * @param {(import('estree').Comment|import('eslint').Rule.Node) & {
 *   declaration?: any,
 *   decorators?: any[],
 *   parent?: import('eslint').Rule.Node & {
 *     decorators?: any[]
 *   }
 * }} node
 * @returns {import('@typescript-eslint/types').TSESTree.Decorator|undefined}
 */
export function getDecorator(node: (import('estree').Comment | import('eslint').Rule.Node) & {
    declaration?: any;
    decorators?: any[];
    parent?: import('eslint').Rule.Node & {
        decorators?: any[];
    };
}): import('@typescript-eslint/types').TSESTree.Decorator | undefined;
/**
 * Checks for the presence of a JSDoc comment for the given node and returns it.
 *
 * @param {import('eslint').Rule.Node} astNode The AST node to get
 *   the comment for.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {{maxLines: int, minLines: int, [name: string]: any}} settings
 * @returns {Token|null} The Block comment token containing the JSDoc comment
 *    for the given node or null if not found.
 * @private
 */
export function findJSDocComment(astNode: import('eslint').Rule.Node, sourceCode: import('eslint').SourceCode, settings: {
    [name: string]: any;
    maxLines: int;
    minLines: int;
}): Token | null;
//# sourceMappingURL=jsdoccomment.d.ts.map