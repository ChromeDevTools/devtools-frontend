/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="tsickle/src/decorator_downlevel_transformer" />
/**
 * @fileoverview Decorator downleveling support. tsickle can optionally convert decorator calls
 * into annotations. For example, a decorator application on a method:
 *   class X {
 *     @Foo(1, 2)
 *     bar() { ... }
 *   }
 * Will get converted to:
 *   class X {
 *     bar() { ... }
 *     static propDecorators = {
 *       bar: {type: Foo, args: [1, 2]}
 *     }
 *   }
 * Similarly for decorators on the class (property 'decorators') and decorators on the constructor
 * (property 'ctorParameters', including the types of all arguments of the constructor).
 *
 * This is used by, among other software, Angular in its "non-AoT" mode to inspect decorator
 * invocations.
 */
import * as ts from 'typescript';
/**
 * Returns true if the given decorator should be downleveled.
 *
 * Decorators that have JSDoc on them including the `@Annotation` tag are downleveled and converted
 * into properties on the class by this pass.
 */
export declare function shouldLower(decorator: ts.Decorator, typeChecker: ts.TypeChecker): boolean;
/**
 * Transformer factory for the decorator downlevel transformer. See fileoverview for details.
 */
export declare function decoratorDownlevelTransformer(typeChecker: ts.TypeChecker, diagnostics: ts.Diagnostic[]): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
