/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/eslint-etc
 */

import { TSESTree as es } from "@typescript-eslint/experimental-utils";
import { getParent } from "./get-parent";

type Predicate = (type: string) => "break" | "continue" | "return";

export function findParent(
  node: es.Node,
  ...types: string[]
): es.Node | undefined;

export function findParent(
  node: es.Node,
  predicate: Predicate
): es.Node | undefined;

export function findParent(
  node: es.Node,
  ...args: (string | Predicate)[]
): es.Node | undefined {
  const [arg] = args;
  const predicate: Predicate =
    typeof arg === "function"
      ? arg
      : (type) => (args.indexOf(type) === -1 ? "continue" : "return");
  let parent = getParent(node);
  while (parent) {
    switch (predicate(parent.type)) {
      case "break":
        return undefined;
      case "return":
        return parent;
      default:
        break;
    }
    parent = getParent(parent);
  }
  return undefined;
}
