/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/eslint-etc
 */

import { TSESLint } from "@typescript-eslint/experimental-utils";

export function isImport(
  scope: TSESLint.Scope.Scope,
  name: string,
  source: string | RegExp
): boolean {
  const variable = scope.variables.find((variable) => variable.name === name);
  if (variable) {
    return variable.defs.some(
      (def) =>
        def.type === "ImportBinding" &&
        def.parent.type === "ImportDeclaration" &&
        (typeof source === "string"
          ? def.parent.source.value === source
          : source.test(def.parent.source.value as string))
    );
  }
  return scope.upper ? isImport(scope.upper, name, source) : false;
}
