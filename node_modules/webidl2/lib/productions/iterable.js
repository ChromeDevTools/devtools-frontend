import { Base } from "./base.js";
import {
  type_with_extended_attributes,
  autoParenter,
  argument_list,
} from "./helpers.js";

export class IterableLike extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const start_position = tokeniser.position;
    const ret = autoParenter(
      new IterableLike({ source: tokeniser.source, tokens: {} })
    );
    const { tokens } = ret;
    tokens.readonly = tokeniser.consume("readonly");
    if (!tokens.readonly) {
      tokens.async = tokeniser.consume("async");
    }
    tokens.base = tokens.readonly
      ? tokeniser.consume("maplike", "setlike")
      : tokens.async
      ? tokeniser.consume("iterable")
      : tokeniser.consume("iterable", "maplike", "setlike");
    if (!tokens.base) {
      tokeniser.unconsume(start_position);
      return;
    }

    const { type } = ret;
    const secondTypeRequired = type === "maplike";
    const secondTypeAllowed = secondTypeRequired || type === "iterable";
    const argumentAllowed = ret.async && type === "iterable";

    tokens.open =
      tokeniser.consume("<") ||
      tokeniser.error(`Missing less-than sign \`<\` in ${type} declaration`);
    const first =
      type_with_extended_attributes(tokeniser) ||
      tokeniser.error(`Missing a type argument in ${type} declaration`);
    ret.idlType = [first];
    ret.arguments = [];

    if (secondTypeAllowed) {
      first.tokens.separator = tokeniser.consume(",");
      if (first.tokens.separator) {
        ret.idlType.push(type_with_extended_attributes(tokeniser));
      } else if (secondTypeRequired) {
        tokeniser.error(`Missing second type argument in ${type} declaration`);
      }
    }

    tokens.close =
      tokeniser.consume(">") ||
      tokeniser.error(`Missing greater-than sign \`>\` in ${type} declaration`);

    if (tokeniser.probe("(")) {
      if (argumentAllowed) {
        tokens.argsOpen = tokeniser.consume("(");
        ret.arguments.push(...argument_list(tokeniser));
        tokens.argsClose =
          tokeniser.consume(")") ||
          tokeniser.error("Unterminated async iterable argument list");
      } else {
        tokeniser.error(`Arguments are only allowed for \`async iterable\``);
      }
    }

    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error(`Missing semicolon after ${type} declaration`);

    return ret.this;
  }

  get type() {
    return this.tokens.base.value;
  }
  get readonly() {
    return !!this.tokens.readonly;
  }
  get async() {
    return !!this.tokens.async;
  }

  *validate(defs) {
    for (const type of this.idlType) {
      yield* type.validate(defs);
    }
    for (const argument of this.arguments) {
      yield* argument.validate(defs);
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.readonly),
        w.token(this.tokens.async),
        w.token(this.tokens.base, w.ts.generic),
        w.token(this.tokens.open),
        w.ts.wrap(this.idlType.map((t) => t.write(w))),
        w.token(this.tokens.close),
        w.token(this.tokens.argsOpen),
        w.ts.wrap(this.arguments.map((arg) => arg.write(w))),
        w.token(this.tokens.argsClose),
        w.token(this.tokens.termination),
      ]),
      { data: this, parent: this.parent }
    );
  }
}
