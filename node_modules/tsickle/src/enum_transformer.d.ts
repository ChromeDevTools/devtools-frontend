/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="tsickle/src/enum_transformer" />
/**
 * @fileoverview Transforms TypeScript enum declarations to Closure enum declarations, which
 * look like:
 *
 *     /.. @enum {number} ./
 *     const Foo = {BAR: 0, BAZ: 1, ...};
 *     export {Foo};  // even if originally exported on one line.
 *
 * This declares an enum type for Closure Compiler (and Closure JS users of this TS code).
 * Splitting the enum into declaration and export is required so that local references to the
 * type resolve ("@type {Foo}").
 */
import * as ts from 'typescript';
/**
 * getEnumType computes the Closure type of an enum, by iterating through the members and gathering
 * their types.
 */
export declare function getEnumType(typeChecker: ts.TypeChecker, enumDecl: ts.EnumDeclaration): 'number' | 'string' | '?';
/**
 * Transformer factory for the enum transformer. See fileoverview for details.
 */
export declare function enumTransformer(typeChecker: ts.TypeChecker, diagnostics: ts.Diagnostic[]): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
