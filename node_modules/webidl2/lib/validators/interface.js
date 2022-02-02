// @ts-check

import { validationError } from "../error.js";

export function* checkInterfaceMemberDuplication(defs, i) {
  const opNames = new Set(getOperations(i).map((op) => op.name));
  const partials = defs.partials.get(i.name) || [];
  const mixins = defs.mixinMap.get(i.name) || [];
  for (const ext of [...partials, ...mixins]) {
    const additions = getOperations(ext);
    yield* forEachExtension(additions, opNames, ext, i);
    for (const addition of additions) {
      opNames.add(addition.name);
    }
  }

  function* forEachExtension(additions, existings, ext, base) {
    for (const addition of additions) {
      const { name } = addition;
      if (name && existings.has(name)) {
        const message = `The operation "${name}" has already been defined for the base interface "${base.name}" either in itself or in a mixin`;
        yield validationError(
          addition.tokens.name,
          ext,
          "no-cross-overload",
          message
        );
      }
    }
  }

  function getOperations(i) {
    return i.members.filter(({ type }) => type === "operation");
  }
}
