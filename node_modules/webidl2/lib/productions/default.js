import { Base } from "./base.js";
import { const_data, const_value } from "./helpers.js";

export class Default extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const assign = tokeniser.consume("=");
    if (!assign) {
      return null;
    }
    const def =
      const_value(tokeniser) ||
      tokeniser.consumeKind("string") ||
      tokeniser.consume("null", "[", "{") ||
      tokeniser.error("No value for default");
    const expression = [def];
    if (def.value === "[") {
      const close =
        tokeniser.consume("]") ||
        tokeniser.error("Default sequence value must be empty");
      expression.push(close);
    } else if (def.value === "{") {
      const close =
        tokeniser.consume("}") ||
        tokeniser.error("Default dictionary value must be empty");
      expression.push(close);
    }
    return new Default({
      source: tokeniser.source,
      tokens: { assign },
      expression,
    });
  }

  constructor({ source, tokens, expression }) {
    super({ source, tokens });
    expression.parent = this;
    Object.defineProperty(this, "expression", { value: expression });
  }

  get type() {
    return const_data(this.expression[0]).type;
  }
  get value() {
    return const_data(this.expression[0]).value;
  }
  get negative() {
    return const_data(this.expression[0]).negative;
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.wrap([
      w.token(this.tokens.assign),
      ...this.expression.map((t) => w.token(t)),
    ]);
  }
}
