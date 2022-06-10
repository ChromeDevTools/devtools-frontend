import { list, unescape, autoParenter } from "./helpers.js";
import { WrappedToken } from "./token.js";
import { Base } from "./base.js";

export class EnumValue extends WrappedToken {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const value = tokeniser.consumeKind("string");
    if (value) {
      return new EnumValue({ source: tokeniser.source, tokens: { value } });
    }
  }

  get type() {
    return "enum-value";
  }
  get value() {
    return super.value.slice(1, -1);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const { parent } = this;
    return w.ts.wrap([
      w.ts.trivia(this.tokens.value.trivia),
      w.ts.definition(
        w.ts.wrap(['"', w.ts.name(this.value, { data: this, parent }), '"']),
        { data: this, parent }
      ),
      w.token(this.tokens.separator),
    ]);
  }
}

export class Enum extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    /** @type {Base["tokens"]} */
    const tokens = {};
    tokens.base = tokeniser.consume("enum");
    if (!tokens.base) {
      return;
    }
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.error("No name for enum");
    const ret = autoParenter(new Enum({ source: tokeniser.source, tokens }));
    tokeniser.current = ret.this;
    tokens.open = tokeniser.consume("{") || tokeniser.error("Bodyless enum");
    ret.values = list(tokeniser, {
      parser: EnumValue.parse,
      allowDangler: true,
      listName: "enumeration",
    });
    if (tokeniser.probeKind("string")) {
      tokeniser.error("No comma between enum values");
    }
    tokens.close =
      tokeniser.consume("}") || tokeniser.error("Unexpected value in enum");
    if (!ret.values.length) {
      tokeniser.error("No value in enum");
    }
    tokens.termination =
      tokeniser.consume(";") || tokeniser.error("No semicolon after enum");
    return ret.this;
  }

  get type() {
    return "enum";
  }
  get name() {
    return unescape(this.tokens.name.value);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.base),
        w.name_token(this.tokens.name, { data: this }),
        w.token(this.tokens.open),
        w.ts.wrap(this.values.map((v) => v.write(w))),
        w.token(this.tokens.close),
        w.token(this.tokens.termination),
      ]),
      { data: this }
    );
  }
}
