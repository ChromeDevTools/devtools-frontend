import { validationError } from "../error.js";
import {
  idlTypeIncludesDictionary,
  idlTypeIncludesEnforceRange,
} from "../validators/helpers.js";
import { Base } from "./base.js";
import {
  type_with_extended_attributes,
  unescape,
  autoParenter,
} from "./helpers.js";

export class Attribute extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {object} [options]
   * @param {import("../tokeniser.js").Token} [options.special]
   * @param {boolean} [options.noInherit]
   * @param {boolean} [options.readonly]
   */
  static parse(
    tokeniser,
    { special, noInherit = false, readonly = false } = {}
  ) {
    const start_position = tokeniser.position;
    const tokens = { special };
    const ret = autoParenter(
      new Attribute({ source: tokeniser.source, tokens })
    );
    if (!special && !noInherit) {
      tokens.special = tokeniser.consume("inherit");
    }
    if (ret.special === "inherit" && tokeniser.probe("readonly")) {
      tokeniser.error("Inherited attributes cannot be read-only");
    }
    tokens.readonly = tokeniser.consume("readonly");
    if (readonly && !tokens.readonly && tokeniser.probe("attribute")) {
      tokeniser.error("Attributes must be readonly in this context");
    }
    tokens.base = tokeniser.consume("attribute");
    if (!tokens.base) {
      tokeniser.unconsume(start_position);
      return;
    }
    ret.idlType =
      type_with_extended_attributes(tokeniser, "attribute-type") ||
      tokeniser.error("Attribute lacks a type");
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.consume("async", "required") ||
      tokeniser.error("Attribute lacks a name");
    tokens.termination =
      tokeniser.consume(";") ||
      tokeniser.error("Unterminated attribute, expected `;`");
    return ret.this;
  }

  get type() {
    return "attribute";
  }
  get special() {
    if (!this.tokens.special) {
      return "";
    }
    return this.tokens.special.value;
  }
  get readonly() {
    return !!this.tokens.readonly;
  }
  get name() {
    return unescape(this.tokens.name.value);
  }

  *validate(defs) {
    yield* this.extAttrs.validate(defs);
    yield* this.idlType.validate(defs);

    if (["sequence", "record"].includes(this.idlType.generic)) {
      const message = `Attributes cannot accept ${this.idlType.generic} types.`;
      yield validationError(
        this.tokens.name,
        this,
        "attr-invalid-type",
        message
      );
    }

    {
      const { reference } = idlTypeIncludesDictionary(this.idlType, defs) || {};
      if (reference) {
        const targetToken = (this.idlType.union ? reference : this.idlType)
          .tokens.base;
        const message = "Attributes cannot accept dictionary types.";
        yield validationError(targetToken, this, "attr-invalid-type", message);
      }
    }

    if (this.readonly) {
      if (idlTypeIncludesEnforceRange(this.idlType, defs)) {
        const targetToken = this.idlType.tokens.base;
        const message =
          "Readonly attributes cannot accept [EnforceRange] extended attribute.";
        yield validationError(targetToken, this, "attr-invalid-type", message);
      }
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const { parent } = this;
    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.special),
        w.token(this.tokens.readonly),
        w.token(this.tokens.base),
        w.ts.type(this.idlType.write(w)),
        w.name_token(this.tokens.name, { data: this, parent }),
        w.token(this.tokens.termination),
      ]),
      { data: this, parent }
    );
  }
}
