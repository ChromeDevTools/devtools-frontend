import { Base } from "./base.js";
import {
  unescape,
  type_with_extended_attributes,
  autoParenter,
} from "./helpers.js";
import { ExtendedAttributes } from "./extended-attributes.js";
import { Default } from "./default.js";

export class Field extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    /** @type {Base["tokens"]} */
    const tokens = {};
    const ret = autoParenter(new Field({ source: tokeniser.source, tokens }));
    ret.extAttrs = ExtendedAttributes.parse(tokeniser);
    tokens.required = tokeniser.consume("required");
    ret.idlType =
      type_with_extended_attributes(tokeniser, "dictionary-type") ||
      tokeniser.error("Dictionary member lacks a type");
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.error("Dictionary member lacks a name");
    ret.default = Default.parse(tokeniser);
    if (tokens.required && ret.default)
      tokeniser.error("Required member must not have a default");
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("Unterminated dictionary member, expected `;`");
    return ret.this;
  }

  get type() {
    return "field";
  }
  get name() {
    return unescape(this.tokens.name.value);
  }
  get required() {
    return !!this.tokens.required;
  }

  *validate(defs) {
    yield* this.idlType.validate(defs);
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const { parent } = this;
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.required),
        w.ts.type(this.idlType.write(w)),
        w.name_token(this.tokens.name, { data: this, parent }),
        this.default ? this.default.write(w) : "",
        w.token(this.tokens.termination),
      ]),
      { data: this, parent }
    );
  }
}
