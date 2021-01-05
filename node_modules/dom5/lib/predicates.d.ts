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
export declare type Predicate = (node: Node) => boolean;
export declare function hasSpaceSeparatedAttrValue(name: string, value: string): Predicate;
export declare function isDocument(node: Node): boolean;
export declare function isDocumentFragment(node: Node): boolean;
export declare function isElement(node: Node): boolean;
export declare function isTextNode(node: Node): boolean;
export declare function isCommentNode(node: Node): boolean;
export declare const predicates: {
    hasClass: (name: string) => Predicate;
    hasAttr: (attr: string) => Predicate;
    hasAttrValue: (attr: string, value: string) => Predicate;
    hasMatchingTagName: (regex: RegExp) => Predicate;
    hasSpaceSeparatedAttrValue: typeof hasSpaceSeparatedAttrValue;
    hasTagName: (name: string) => Predicate;
    hasTextValue: (value: string) => Predicate;
    AND: (...predicates: Predicate[]) => Predicate;
    OR: (...predicates: Predicate[]) => Predicate;
    NOT: (predicateFn: Predicate) => Predicate;
    parentMatches: (predicateFn: Predicate) => Predicate;
};
