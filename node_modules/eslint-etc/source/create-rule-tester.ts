/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/eslint-etc
 */

import { TSESLint as eslint } from "@typescript-eslint/experimental-utils";
import { resolve } from "path";

export function createRuleTester({
  filename = resolve("./tests/file.ts"),
  parser = resolve("./node_modules/@typescript-eslint/parser"),
  project = resolve("./tests/tsconfig.json"),
}: {
  filename?: string;
  parser?: string;
  project?: string;
} = {}) {
  return function ruleTester({
    comments = false,
    typeScript = true,
    types = true,
  }: {
    comments?: boolean;
    typeScript?: boolean;
    types?: boolean;
  } = {}) {
    const parserOptions = {
      comments,
      ecmaFeatures: { jsx: true },
      ecmaVersion: 2020,
      project: typeScript && types ? project : undefined,
      sourceType: "module",
    } as const;
    const tester = new eslint.RuleTester({
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      parser: typeScript ? parser : undefined!,
      parserOptions,
    });
    const run = tester.run;
    tester.run = (name, rule, { invalid = [], valid = [] }) =>
      run.call(tester, name, rule, {
        invalid: invalid.map((test) => ({ ...test, filename })),
        valid: valid.map((test) =>
          typeof test === "string"
            ? { code: test, filename }
            : { ...test, filename }
        ),
      });
    return tester;
  };
}
