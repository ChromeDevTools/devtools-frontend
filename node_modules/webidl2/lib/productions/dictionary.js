import { Container } from "./container.js";
import { Field } from "./field.js";

export class Dictionary extends Container {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {object} [options]
   * @param {import("../tokeniser.js").Token} [options.partial]
   */
  static parse(tokeniser, { partial } = {}) {
    const tokens = { partial };
    tokens.base = tokeniser.consume("dictionary");
    if (!tokens.base) {
      return;
    }
    return Container.parse(
      tokeniser,
      new Dictionary({ source: tokeniser.source, tokens }),
      {
        inheritable: !partial,
        allowedMembers: [[Field.parse]],
      }
    );
  }

  get type() {
    return "dictionary";
  }
}
