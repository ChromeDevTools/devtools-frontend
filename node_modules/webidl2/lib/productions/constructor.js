import { Base } from "./base.js";
import { argument_list, autoParenter } from "./helpers.js";

export class Constructor extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const base = tokeniser.consume("constructor");
    if (!base) {
      return;
    }
    /** @type {Base["tokens"]} */
    const tokens = { base };
    tokens.open =
      tokeniser.consume("(") ||
      tokeniser.error("No argument list in constructor");
    const args = argument_list(tokeniser);
    tokens.close =
      tokeniser.consume(")") || tokeniser.error("Unterminated constructor");
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("No semicolon after constructor");
    const ret = new Constructor({ source: tokeniser.source, tokens });
    autoParenter(ret).arguments = args;
    return ret;
  }

  get type() {
    return "constructor";
  }

  *validate(defs) {
    for (const argument of this.arguments) {
      yield* argument.validate(defs);
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const { parent } = this;
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.base, w.ts.nameless, { data: this, parent }),
        w.token(this.tokens.open),
        w.ts.wrap(this.arguments.map((arg) => arg.write(w))),
        w.token(this.tokens.close),
        w.token(this.tokens.termination),
      ]),
      { data: this, parent }
    );
  }
}
