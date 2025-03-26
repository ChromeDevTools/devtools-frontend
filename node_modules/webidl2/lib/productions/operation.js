import { Base } from "./base.js";
import {
  return_type,
  argument_list,
  unescape,
  autoParenter,
} from "./helpers.js";
import { validationError } from "../error.js";

export class Operation extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {object} [options]
   * @param {import("../tokeniser.js").Token} [options.special]
   * @param {import("../tokeniser.js").Token} [options.regular]
   */
  static parse(tokeniser, { special, regular } = {}) {
    const tokens = { special };
    const ret = autoParenter(
      new Operation({ source: tokeniser.source, tokens })
    );
    if (special && special.value === "stringifier") {
      tokens.termination = tokeniser.consume(";");
      if (tokens.termination) {
        ret.arguments = [];
        return ret;
      }
    }
    if (!special && !regular) {
      tokens.special = tokeniser.consume("getter", "setter", "deleter");
    }
    ret.idlType =
      return_type(tokeniser) || tokeniser.error("Missing return type");
    tokens.name =
      tokeniser.consumeKind("identifier") || tokeniser.consume("includes");
    tokens.open =
      tokeniser.consume("(") || tokeniser.error("Invalid operation");
    ret.arguments = argument_list(tokeniser);
    tokens.close =
      tokeniser.consume(")") || tokeniser.error("Unterminated operation");
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("Unterminated operation, expected `;`");
    return ret.this;
  }

  get type() {
    return "operation";
  }
  get name() {
    const { name } = this.tokens;
    if (!name) {
      return "";
    }
    return unescape(name.value);
  }
  get special() {
    if (!this.tokens.special) {
      return "";
    }
    return this.tokens.special.value;
  }

  *validate(defs) {
    yield* this.extAttrs.validate(defs);
    if (!this.name && ["", "static"].includes(this.special)) {
      const message = `Regular or static operations must have both a return type and an identifier.`;
      yield validationError(this.tokens.open, this, "incomplete-op", message);
    }
    if (this.idlType) {
      yield* this.idlType.validate(defs);
    }
    for (const argument of this.arguments) {
      yield* argument.validate(defs);
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const { parent } = this;
    const body = this.idlType
      ? [
          w.ts.type(this.idlType.write(w)),
          w.name_token(this.tokens.name, { data: this, parent }),
          w.token(this.tokens.open),
          w.ts.wrap(this.arguments.map((arg) => arg.write(w))),
          w.token(this.tokens.close),
        ]
      : [];
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        this.tokens.name
          ? w.token(this.tokens.special)
          : w.token(this.tokens.special, w.ts.nameless, { data: this, parent }),
        ...body,
        w.token(this.tokens.termination),
      ]),
      { data: this, parent }
    );
  }
}
