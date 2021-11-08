import * as ESTree from 'estree';
import * as parse5 from 'parse5';
import { SourceCode } from 'eslint';
import treeAdapter = require('parse5-htmlparser2-tree-adapter');
export interface RawAttribute {
    name: string;
    value?: string;
    quotedValue?: string;
}
export interface Visitor {
    enter: (node: treeAdapter.Node, parent: treeAdapter.Node | null) => void;
    exit: (node: treeAdapter.Node, parent: treeAdapter.Node | null) => void;
    enterElement: (node: treeAdapter.Element, parent: treeAdapter.Node | null) => void;
    enterDocumentFragment: (node: treeAdapter.DocumentFragment, parent: treeAdapter.Node | null) => void;
    enterCommentNode: (node: treeAdapter.CommentNode, parent: treeAdapter.Node | null) => void;
    enterTextNode: (node: treeAdapter.TextNode, parent: treeAdapter.Node | null) => void;
}
export interface ParseError extends parse5.Location {
    code: string;
}
/**
 * Analyzes a given template expression for traversing its contained
 * HTML tree.
 */
export declare class TemplateAnalyzer {
    errors: ReadonlyArray<ParseError>;
    source: string;
    protected _node: ESTree.TaggedTemplateExpression;
    protected _ast: treeAdapter.DocumentFragment;
    /**
     * Create an analyzer instance for a given node
     *
     * @param {ESTree.TaggedTemplateExpression} node Node to use
     * @return {!TemplateAnalyzer}
     */
    static create(node: ESTree.TaggedTemplateExpression): TemplateAnalyzer;
    /**
     * Constructor
     *
     * @param {ESTree.TaggedTemplateExpression} node Node to analyze
     */
    constructor(node: ESTree.TaggedTemplateExpression);
    /**
     * Returns the ESTree location equivalent of a given attribute
     *
     * @param {treeAdapter.Element} element Element which owns this attribute
     * @param {string} attr Attribute name to retrieve
     * @param {SourceCode} source Source code from ESLint
     * @return {?ESTree.SourceLocation}
     */
    getLocationForAttribute(element: treeAdapter.Element, attr: string, source: SourceCode): ESTree.SourceLocation | null | undefined;
    /**
     * Returns the value of the specified attribute.
     * If this is an expression, the expression will be returned. Otherwise,
     * the raw value will be returned.
     * NOTE: if an attribute has multiple expressions in its value, this will
     * return the *first* expression.
     * @param {treeAdapter.Element} element Element which owns this attribute
     * @param {string} attr Attribute name to retrieve
     * @param {SourceCode} source Source code from ESLint
     * @return {?ESTree.Expression|string}
     */
    getAttributeValue(element: treeAdapter.Element, attr: string, source: SourceCode): ESTree.Expression | string | null;
    /**
     * Returns the raw attribute source of a given attribute
     *
     * @param {treeAdapter.Element} element Element which owns this attribute
     * @param {string} attr Attribute name to retrieve
     * @return {string}
     */
    getRawAttributeValue(element: treeAdapter.Element, attr: string): RawAttribute | null;
    /**
     * Resolves a Parse5 location into an ESTree range
     *
     * @param {parse5.Location} loc Location to convert
     * @param {SourceCode} source ESLint source code object
     * @return {ESTree.SourceLocation}
     */
    resolveLocation(loc: parse5.Location, source: SourceCode): ESTree.SourceLocation | null;
    /**
     * Traverse the inner HTML tree with a given visitor
     *
     * @param {Visitor} visitor Visitor to apply
     * @return {void}
     */
    traverse(visitor: Partial<Visitor>): void;
}
