import { Container } from "./container.js";
import { Constant } from "./constant.js";
import { Attribute } from "./attribute.js";
import { Operation } from "./operation.js";
import { stringifier } from "./helpers.js";

export class Mixin extends Container {
  /**
   * @typedef {import("../tokeniser.js").Token} Token
   *
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {Token} base
   * @param {object} [options]
   * @param {Token} [options.partial]
   */
  static parse(tokeniser, base, { partial } = {}) {
    const tokens = { partial, base };
    tokens.mixin = tokeniser.consume("mixin");
    if (!tokens.mixin) {
      return;
    }
    return Container.parse(
      tokeniser,
      new Mixin({ source: tokeniser.source, tokens }),
      {
        allowedMembers: [
          [Constant.parse],
          [stringifier],
          [Attribute.parse, { noInherit: true }],
          [Operation.parse, { regular: true }],
        ],
      }
    );
  }

  get type() {
    return "interface mixin";
  }
}
