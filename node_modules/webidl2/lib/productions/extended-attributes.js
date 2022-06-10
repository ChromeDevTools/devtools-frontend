import { Base } from "./base.js";
import { ArrayBase } from "./array-base.js";
import { WrappedToken } from "./token.js";
import { list, argument_list, autoParenter, unescape } from "./helpers.js";
import { validationError } from "../error.js";

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {string} tokenName
 */
function tokens(tokeniser, tokenName) {
  return list(tokeniser, {
    parser: WrappedToken.parser(tokeniser, tokenName),
    listName: tokenName + " list",
  });
}

const extAttrValueSyntax = ["identifier", "decimal", "integer", "string"];

const shouldBeLegacyPrefixed = [
  "NoInterfaceObject",
  "LenientSetter",
  "LenientThis",
  "TreatNonObjectAsNull",
  "Unforgeable",
];

const renamedLegacies = new Map([
  .../** @type {[string, string][]} */ (
    shouldBeLegacyPrefixed.map((name) => [name, `Legacy${name}`])
  ),
  ["NamedConstructor", "LegacyFactoryFunction"],
  ["OverrideBuiltins", "LegacyOverrideBuiltIns"],
  ["TreatNullAs", "LegacyNullToEmptyString"],
]);

/**
 * This will allow a set of extended attribute values to be parsed.
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
function extAttrListItems(tokeniser) {
  for (const syntax of extAttrValueSyntax) {
    const toks = tokens(tokeniser, syntax);
    if (toks.length) {
      return toks;
    }
  }
  tokeniser.error(
    `Expected identifiers, strings, decimals, or integers but none found`
  );
}

export class ExtendedAttributeParameters extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const tokens = { assign: tokeniser.consume("=") };
    const ret = autoParenter(
      new ExtendedAttributeParameters({ source: tokeniser.source, tokens })
    );
    ret.list = [];
    if (tokens.assign) {
      tokens.asterisk = tokeniser.consume("*");
      if (tokens.asterisk) {
        return ret.this;
      }
      tokens.secondaryName = tokeniser.consumeKind(...extAttrValueSyntax);
    }
    tokens.open = tokeniser.consume("(");
    if (tokens.open) {
      ret.list = ret.rhsIsList
        ? // [Exposed=(Window,Worker)]
          extAttrListItems(tokeniser)
        : // [LegacyFactoryFunction=Audio(DOMString src)] or [Constructor(DOMString str)]
          argument_list(tokeniser);
      tokens.close =
        tokeniser.consume(")") ||
        tokeniser.error("Unexpected token in extended attribute argument list");
    } else if (tokens.assign && !tokens.secondaryName) {
      tokeniser.error("No right hand side to extended attribute assignment");
    }
    return ret.this;
  }

  get rhsIsList() {
    return (
      this.tokens.assign && !this.tokens.asterisk && !this.tokens.secondaryName
    );
  }

  get rhsType() {
    if (this.rhsIsList) {
      return this.list[0].tokens.value.type + "-list";
    }
    if (this.tokens.asterisk) {
      return "*";
    }
    if (this.tokens.secondaryName) {
      return this.tokens.secondaryName.type;
    }
    return null;
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const { rhsType } = this;
    return w.ts.wrap([
      w.token(this.tokens.assign),
      w.token(this.tokens.asterisk),
      w.reference_token(this.tokens.secondaryName, this.parent),
      w.token(this.tokens.open),
      ...this.list.map((p) => {
        return rhsType === "identifier-list"
          ? w.identifier(p, this.parent)
          : p.write(w);
      }),
      w.token(this.tokens.close),
    ]);
  }
}

export class SimpleExtendedAttribute extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const name = tokeniser.consumeKind("identifier");
    if (name) {
      return new SimpleExtendedAttribute({
        source: tokeniser.source,
        tokens: { name },
        params: ExtendedAttributeParameters.parse(tokeniser),
      });
    }
  }

  constructor({ source, tokens, params }) {
    super({ source, tokens });
    params.parent = this;
    Object.defineProperty(this, "params", { value: params });
  }

  get type() {
    return "extended-attribute";
  }
  get name() {
    return this.tokens.name.value;
  }
  get rhs() {
    const { rhsType: type, tokens, list } = this.params;
    if (!type) {
      return null;
    }
    const value = this.params.rhsIsList
      ? list
      : this.params.tokens.secondaryName
      ? unescape(tokens.secondaryName.value)
      : null;
    return { type, value };
  }
  get arguments() {
    const { rhsIsList, list } = this.params;
    if (!list || rhsIsList) {
      return [];
    }
    return list;
  }

  *validate(defs) {
    const { name } = this;
    if (name === "LegacyNoInterfaceObject") {
      const message = `\`[LegacyNoInterfaceObject]\` extended attribute is an \
undesirable feature that may be removed from Web IDL in the future. Refer to the \
[relevant upstream PR](https://github.com/whatwg/webidl/pull/609) for more \
information.`;
      yield validationError(
        this.tokens.name,
        this,
        "no-nointerfaceobject",
        message,
        { level: "warning" }
      );
    } else if (renamedLegacies.has(name)) {
      const message = `\`[${name}]\` extended attribute is a legacy feature \
that is now renamed to \`[${renamedLegacies.get(name)}]\`. Refer to the \
[relevant upstream PR](https://github.com/whatwg/webidl/pull/870) for more \
information.`;
      yield validationError(this.tokens.name, this, "renamed-legacy", message, {
        level: "warning",
        autofix: renameLegacyExtendedAttribute(this),
      });
    }
    for (const arg of this.arguments) {
      yield* arg.validate(defs);
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.wrap([
      w.ts.trivia(this.tokens.name.trivia),
      w.ts.extendedAttribute(
        w.ts.wrap([
          w.ts.extendedAttributeReference(this.name),
          this.params.write(w),
        ])
      ),
      w.token(this.tokens.separator),
    ]);
  }
}

/**
 * @param {SimpleExtendedAttribute} extAttr
 */
function renameLegacyExtendedAttribute(extAttr) {
  return () => {
    const { name } = extAttr;
    extAttr.tokens.name.value = renamedLegacies.get(name);
    if (name === "TreatNullAs") {
      extAttr.params.tokens = {};
    }
  };
}

// Note: we parse something simpler than the official syntax. It's all that ever
// seems to be used
export class ExtendedAttributes extends ArrayBase {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const tokens = {};
    tokens.open = tokeniser.consume("[");
    const ret = new ExtendedAttributes({ source: tokeniser.source, tokens });
    if (!tokens.open) return ret;
    ret.push(
      ...list(tokeniser, {
        parser: SimpleExtendedAttribute.parse,
        listName: "extended attribute",
      })
    );
    tokens.close =
      tokeniser.consume("]") ||
      tokeniser.error(
        "Expected a closing token for the extended attribute list"
      );
    if (!ret.length) {
      tokeniser.unconsume(tokens.close.index);
      tokeniser.error("An extended attribute list must not be empty");
    }
    if (tokeniser.probe("[")) {
      tokeniser.error(
        "Illegal double extended attribute lists, consider merging them"
      );
    }
    return ret;
  }

  *validate(defs) {
    for (const extAttr of this) {
      yield* extAttr.validate(defs);
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    if (!this.length) return "";
    return w.ts.wrap([
      w.token(this.tokens.open),
      ...this.map((ea) => ea.write(w)),
      w.token(this.tokens.close),
    ]);
  }
}
