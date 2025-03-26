import { Container } from "./container.js";
import { Operation } from "./operation.js";
import { Constant } from "./constant.js";

export class CallbackInterface extends Container {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {*} callback
   * @param {object} [options]
   * @param {import("./container.js").AllowedMember[]} [options.extMembers]
   */
  static parse(tokeniser, callback, { extMembers = [] } = {}) {
    const tokens = { callback };
    tokens.base = tokeniser.consume("interface");
    if (!tokens.base) {
      return;
    }
    return Container.parse(
      tokeniser,
      new CallbackInterface({ source: tokeniser.source, tokens }),
      {
        allowedMembers: [
          ...extMembers,
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
