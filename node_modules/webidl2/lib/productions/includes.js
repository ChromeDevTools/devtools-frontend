import { Base } from "./base.js";
import { unescape } from "./helpers.js";

export class Includes extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const target = tokeniser.consumeKind("identifier");
    if (!target) {
      return;
    }
    const tokens = { target };
    tokens.includes = tokeniser.consume("includes");
    if (!tokens.includes) {
      tokeniser.unconsume(target.index);
      return;
    }
    tokens.mixin =
      tokeniser.consumeKind("identifier") ||
      tokeniser.error("Incomplete includes statement");
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("No terminating ; for includes statement");
    return new Includes({ source: tokeniser.source, tokens });
  }

  get type() {
    return "includes";
  }
  get target() {
    return unescape(this.tokens.target.value);
  }
  get includes() {
    return unescape(this.tokens.mixin.value);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.reference_token(this.tokens.target, this),
        w.token(this.tokens.includes),
        w.reference_token(this.tokens.mixin, this),
        w.token(this.tokens.termination),
      ]),
      { data: this }
    );
  }
}
