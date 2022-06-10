import { Container } from "./container.js";
import { Operation } from "./operation.js";
import { Constant } from "./constant.js";

export class CallbackInterface extends Container {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser, callback, { partial = null } = {}) {
    const tokens = { callback };
    tokens.base = tokeniser.consume("interface");
    if (!tokens.base) {
      return;
    }
    return Container.parse(
      tokeniser,
      new CallbackInterface({ source: tokeniser.source, tokens }),
      {
        inheritable: !partial,
        allowedMembers: [
          [Constant.parse],
          [Operation.parse, { regular: true }],
        ],
      }
    );
  }

  get type() {
    return "callback interface";
  }
}
