import { Base } from "./base.js";
import {
  type_with_extended_attributes,
  unescape,
  autoParenter,
} from "./helpers.js";

export class Typedef extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    /** @type {Base["tokens"]} */
    const tokens = {};
    const ret = autoParenter(new Typedef({ source: tokeniser.source, tokens }));
    tokens.base = tokeniser.consume("typedef");
    if (!tokens.base) {
      return;
    }
    ret.idlType =
      type_with_extended_attributes(tokeniser, "typedef-type") ||
      tokeniser.error("Typedef lacks a type");
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.error("Typedef lacks a name");
    tokeniser.current = ret.this;
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("Unterminated typedef, expected `;`");
    return ret.this;
  }

  get type() {
    return "typedef";
  }
  get name() {
    return unescape(this.tokens.name.value);
  }

  *validate(defs) {
    yield* this.idlType.validate(defs);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.base),
        w.ts.type(this.idlType.write(w)),
        w.name_token(this.tokens.name, { data: this }),
        w.token(this.tokens.termination),
      ]),
      { data: this }
    );
  }
}
