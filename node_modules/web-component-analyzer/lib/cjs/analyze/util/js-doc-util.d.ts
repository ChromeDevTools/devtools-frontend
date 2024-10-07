import { SimpleType } from "ts-simple-type";
import * as tsModule from "typescript";
import { Node, Program } from "typescript";
import { JsDoc } from "../types/js-doc";
/**
 * Returns jsdoc for a given node.
 * @param node
 * @param ts
 * @param tagNames
 */
export declare function getJsDoc(node: Node, ts: typeof tsModule, tagNames?: string[]): JsDoc | undefined;
/**
 * Converts a given string to a SimpleType
 * Defaults to ANY
 * See http://usejsdoc.org/tags-type.html
 * @param str
 * @param context
 */
export declare function parseSimpleJsDocTypeExpression(str: string, context: {
    program: Program;
    ts: typeof tsModule;
}): SimpleType;
/**
 * Finds a @type jsdoc tag in the jsdoc and returns the corresponding simple type
 * @param jsDoc
 * @param context
 */
export declare function getJsDocType(jsDoc: JsDoc, context: {
    program: Program;
    ts: typeof tsModule;
}): SimpleType | undefined;
//# sourceMappingURL=js-doc-util.d.ts.map