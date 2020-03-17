/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="tsickle/src/cli_support" />
/**
 * asserts that the given fileName is an absolute path.
 *
 * The TypeScript API works in absolute paths, so we must be careful to resolve
 * paths before handing them over to TypeScript.
 */
export declare function assertAbsolute(fileName: string): void;
/**
 * Takes a context (ts.SourceFile.fileName of the current file) and the import URL of an ES6
 * import and generates a googmodule module name for the imported module.
 */
export declare function pathToModuleName(rootModulePath: string, context: string, fileName: string): string;
