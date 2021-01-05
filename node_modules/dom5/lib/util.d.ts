/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { ASTNode as Node } from 'parse5';
export { ASTNode as Node } from 'parse5';
/**
 * Return the text value of a node or element
 *
 * Equivalent to `node.textContent` in the browser
 */
export declare function getTextContent(node: Node): string;
/**
 * @returns The string value of attribute `name`, or `null`.
 */
export declare function getAttribute(element: Node, name: string): string | null;
export declare function getAttributeIndex(element: Node, name: string): number;
/**
 * @returns `true` iff [element] has the attribute [name], `false` otherwise.
 */
export declare function hasAttribute(element: Node, name: string): boolean;
export declare function setAttribute(element: Node, name: string, value: string): void;
export declare function removeAttribute(element: Node, name: string): void;
/**
 * Normalize the text inside an element
 *
 * Equivalent to `element.normalize()` in the browser
 * See https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 */
export declare function normalize(node: Node): void;
/**
 * Set the text value of a node or element
 *
 * Equivalent to `node.textContent = value` in the browser
 */
export declare function setTextContent(node: Node, value: string): void;
export declare type GetChildNodes = ((node: Node) => Node[] | undefined);
export declare const defaultChildNodes: (node: Node) => Node[] | undefined;
export declare const childNodesIncludeTemplate: (node: Node) => Node[] | undefined;
