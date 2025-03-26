import { Container } from "./container.js";
import { Attribute } from "./attribute.js";
import { Operation } from "./operation.js";
import { validationError } from "../error.js";
import { autofixAddExposedWindow } from "./helpers.js";
import { Constant } from "./constant.js";

export class Namespace extends Container {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {object} [options]
   * @param {import("./container.js").AllowedMember[]} [options.extMembers]
   * @param {import("../tokeniser.js").Token} [options.partial]
   */
  static parse(tokeniser, { extMembers = [], partial } = {}) {
    const tokens = { partial };
    tokens.base = tokeniser.consume("namespace");
    if (!tokens.base) {
      return;
    }
    return Container.parse(
      tokeniser,
      new Namespace({ source: tokeniser.source, tokens }),
      {
        allowedMembers: [
          ...extMembers,
          [Attribute.parse, { noInherit: true, readonly: true }],
          [Constant.parse],
          [Operation.parse, { regular: true }],
        ],
      }
    );
  }

  get type() {
    return "namespace";
  }

  *validate(defs) {
    if (
      !this.partial &&
      this.extAttrs.every((extAttr) => extAttr.name !== "Exposed")
    ) {
      const message = `Namespaces must have [Exposed] extended attribute. \
To fix, add, for example, [Exposed=Window]. Please also consider carefully \
if your namespace should also be exposed in a Worker scope. Refer to the \
[WebIDL spec section on Exposed](https://heycam.github.io/webidl/#Exposed) \
for more information.`;
      yield validationError(
        this.tokens.name,
        this,
        "require-exposed",
        message,
        {
          autofix: autofixAddExposedWindow(this),
        }
      );
    }
    yield* super.validate(defs);
  }
}
