import { Base } from "./base.js";
import { unescape } from "./helpers.js";

export class WrappedToken extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {string} type
   */
  static parser(tokeniser, type) {
    return () => {
      const value = tokeniser.consumeKind(type);
      if (value) {
        return new WrappedToken({
          source: tokeniser.source,
          tokens: { value },
        });
      }
    };
  }

  get value() {
    return unescape(this.tokens.value.value);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.wrap([
      w.token(this.tokens.value),
      w.token(this.tokens.separator),
    ]);
  }
}

export class Eof extends WrappedToken {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const value = tokeniser.consumeKind("eof");
    if (value) {
      return new Eof({ source: tokeniser.source, tokens: { value } });
    }
  }

  get type() {
    return "eof";
  }
}
