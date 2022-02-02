import { Base } from "./base.js";
import {
  return_type,
  argument_list,
  unescape,
  autoParenter,
} from "./helpers.js";

export class CallbackFunction extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser, base) {
    const tokens = { base };
    const ret = autoParenter(
      new CallbackFunction({ source: tokeniser.source, tokens })
    );
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.error("Callback lacks a name");
    tokeniser.current = ret.this;
    tokens.assign =
      tokeniser.consume("=") || tokeniser.error("Callback lacks an assignment");
    ret.idlType =
      return_type(tokeniser) || tokeniser.error("Callback lacks a return type");
    tokens.open =
      tokeniser.consume("(") ||
      tokeniser.error("Callback lacks parentheses for arguments");
    ret.arguments = argument_list(tokeniser);
    tokens.close =
      tokeniser.consume(")") || tokeniser.error("Unterminated callback");
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("Unterminated callback, expected `;`");
    return ret.this;
  }

  get type() {
    return "callback";
  }
  get name() {
    return unescape(this.tokens.name.value);
  }

  *validate(defs) {
    yield* this.extAttrs.validate(defs);
    yield* this.idlType.validate(defs);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.base),
        w.name_token(this.tokens.name, { data: this }),
        w.token(this.tokens.assign),
        w.ts.type(this.idlType.write(w)),
        w.token(this.tokens.open),
        ...this.arguments.map((arg) => arg.write(w)),
        w.token(this.tokens.close),
        w.token(this.tokens.termination),
      ]),
      { data: this }
    );
  }
}
