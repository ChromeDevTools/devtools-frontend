import { Base } from "./base.js";
import {
  unescape,
  type_with_extended_attributes,
  return_type,
  primitive_type,
  autoParenter,
} from "./helpers.js";
import { stringTypes, typeNameKeywords } from "../tokeniser.js";
import { validationError } from "../error.js";
import { idlTypeIncludesDictionary } from "../validators/helpers.js";
import { ExtendedAttributes } from "./extended-attributes.js";

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {string} typeName
 */
function generic_type(tokeniser, typeName) {
  const base = tokeniser.consume(
    "FrozenArray",
    "ObservableArray",
    "Promise",
    "sequence",
    "record"
  );
  if (!base) {
    return;
  }
  const ret = autoParenter(
    new Type({ source: tokeniser.source, tokens: { base } })
  );
  ret.tokens.open =
    tokeniser.consume("<") ||
    tokeniser.error(`No opening bracket after ${base.value}`);
  switch (base.value) {
    case "Promise": {
      if (tokeniser.probe("["))
        tokeniser.error("Promise type cannot have extended attribute");
      const subtype =
        return_type(tokeniser, typeName) ||
        tokeniser.error("Missing Promise subtype");
      ret.subtype.push(subtype);
      break;
    }
    case "sequence":
    case "FrozenArray":
    case "ObservableArray": {
      const subtype =
        type_with_extended_attributes(tokeniser, typeName) ||
        tokeniser.error(`Missing ${base.value} subtype`);
      ret.subtype.push(subtype);
      break;
    }
    case "record": {
      if (tokeniser.probe("["))
        tokeniser.error("Record key cannot have extended attribute");
      const keyType =
        tokeniser.consume(...stringTypes) ||
        tokeniser.error(`Record key must be one of: ${stringTypes.join(", ")}`);
      const keyIdlType = new Type({
        source: tokeniser.source,
        tokens: { base: keyType },
      });
      keyIdlType.tokens.separator =
        tokeniser.consume(",") ||
        tokeniser.error("Missing comma after record key type");
      keyIdlType.type = typeName;
      const valueType =
        type_with_extended_attributes(tokeniser, typeName) ||
        tokeniser.error("Error parsing generic type record");
      ret.subtype.push(keyIdlType, valueType);
      break;
    }
  }
  if (!ret.idlType) tokeniser.error(`Error parsing generic type ${base.value}`);
  ret.tokens.close =
    tokeniser.consume(">") ||
    tokeniser.error(`Missing closing bracket after ${base.value}`);
  return ret.this;
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
function type_suffix(tokeniser, obj) {
  const nullable = tokeniser.consume("?");
  if (nullable) {
    obj.tokens.nullable = nullable;
  }
  if (tokeniser.probe("?")) tokeniser.error("Can't nullable more than once");
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {string} typeName
 */
function single_type(tokeniser, typeName) {
  let ret = generic_type(tokeniser, typeName) || primitive_type(tokeniser);
  if (!ret) {
    const base =
      tokeniser.consumeKind("identifier") ||
      tokeniser.consume(...stringTypes, ...typeNameKeywords);
    if (!base) {
      return;
    }
    ret = new Type({ source: tokeniser.source, tokens: { base } });
    if (tokeniser.probe("<"))
      tokeniser.error(`Unsupported generic type ${base.value}`);
  }
  if (ret.generic === "Promise" && tokeniser.probe("?")) {
    tokeniser.error("Promise type cannot be nullable");
  }
  ret.type = typeName || null;
  type_suffix(tokeniser, ret);
  if (ret.nullable && ret.idlType === "any")
    tokeniser.error("Type `any` cannot be made nullable");
  return ret;
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {string} type
 */
function union_type(tokeniser, type) {
  const tokens = {};
  tokens.open = tokeniser.consume("(");
  if (!tokens.open) return;
  const ret = autoParenter(new Type({ source: tokeniser.source, tokens }));
  ret.type = type || null;
  while (true) {
    const typ =
      type_with_extended_attributes(tokeniser, type) ||
      tokeniser.error("No type after open parenthesis or 'or' in union type");
    if (typ.idlType === "any")
      tokeniser.error("Type `any` cannot be included in a union type");
    if (typ.generic === "Promise")
      tokeniser.error("Type `Promise` cannot be included in a union type");
    ret.subtype.push(typ);
    const or = tokeniser.consume("or");
    if (or) {
      typ.tokens.separator = or;
    } else break;
  }
  if (ret.idlType.length < 2) {
    tokeniser.error(
      "At least two types are expected in a union type but found less"
    );
  }
  tokens.close =
    tokeniser.consume(")") || tokeniser.error("Unterminated union type");
  type_suffix(tokeniser, ret);
  return ret.this;
}

export class Type extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {string} typeName
   */
  static parse(tokeniser, typeName) {
    return single_type(tokeniser, typeName) || union_type(tokeniser, typeName);
  }

  constructor({ source, tokens }) {
    super({ source, tokens });
    Object.defineProperty(this, "subtype", { value: [], writable: true });
    this.extAttrs = new ExtendedAttributes({ source, tokens: {} });
  }

  get generic() {
    if (this.subtype.length && this.tokens.base) {
      return this.tokens.base.value;
    }
    return "";
  }
  get nullable() {
    return Boolean(this.tokens.nullable);
  }
  get union() {
    return Boolean(this.subtype.length) && !this.tokens.base;
  }
  get idlType() {
    if (this.subtype.length) {
      return this.subtype;
    }
    // Adding prefixes/postfixes for "unrestricted float", etc.
    const name = [this.tokens.prefix, this.tokens.base, this.tokens.postfix]
      .filter((t) => t)
      .map((t) => t.value)
      .join(" ");
    return unescape(name);
  }

  *validate(defs) {
    yield* this.extAttrs.validate(defs);

    if (this.idlType === "BufferSource") {
      // XXX: For now this is a hack. Consider moving parents' extAttrs into types as the spec says:
      // https://webidl.spec.whatwg.org/#idl-annotated-types
      for (const extAttrs of [this.extAttrs, this.parent?.extAttrs]) {
        for (const extAttr of extAttrs) {
          if (extAttr.name !== "AllowShared") {
            continue;
          }
          const message = `\`[AllowShared] BufferSource\` is now replaced with AllowSharedBufferSource.`;
          yield validationError(
            this.tokens.base,
            this,
            "migrate-allowshared",
            message,
            { autofix: replaceAllowShared(this, extAttr, extAttrs) }
          );
        }
      }
    }

    if (this.idlType === "void") {
      const message = `\`void\` is now replaced by \`undefined\`. Refer to the \
[relevant GitHub issue](https://github.com/whatwg/webidl/issues/60) \
for more information.`;
      yield validationError(this.tokens.base, this, "replace-void", message, {
        autofix: replaceVoid(this),
      });
    }

    /*
     * If a union is nullable, its subunions cannot include a dictionary
     * If not, subunions may include dictionaries if each union is not nullable
     */
    const typedef = !this.union && defs.unique.get(this.idlType);
    const target = this.union
      ? this
      : typedef && typedef.type === "typedef"
      ? typedef.idlType
      : undefined;
    if (target && this.nullable) {
      // do not allow any dictionary
      const { reference } = idlTypeIncludesDictionary(target, defs) || {};
      if (reference) {
        const targetToken = (this.union ? reference : this).tokens.base;
        const message = "Nullable union cannot include a dictionary type.";
        yield validationError(
          targetToken,
          this,
          "no-nullable-union-dict",
          message
        );
      }
    } else {
      // allow some dictionary
      for (const subtype of this.subtype) {
        yield* subtype.validate(defs);
      }
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const type_body = () => {
      if (this.union || this.generic) {
        return w.ts.wrap([
          w.token(this.tokens.base, w.ts.generic),
          w.token(this.tokens.open),
          ...this.subtype.map((t) => t.write(w)),
          w.token(this.tokens.close),
        ]);
      }
      const firstToken = this.tokens.prefix || this.tokens.base;
      const prefix = this.tokens.prefix
        ? [this.tokens.prefix.value, w.ts.trivia(this.tokens.base.trivia)]
        : [];
      const ref = w.reference(
        w.ts.wrap([
          ...prefix,
          this.tokens.base.value,
          w.token(this.tokens.postfix),
        ]),
        {
          unescaped: /** @type {string} (because it's not union) */ (
            this.idlType
          ),
          context: this,
        }
      );
      return w.ts.wrap([w.ts.trivia(firstToken.trivia), ref]);
    };
    return w.ts.wrap([
      this.extAttrs.write(w),
      type_body(),
      w.token(this.tokens.nullable),
      w.token(this.tokens.separator),
    ]);
  }
}

/**
 * @param {Type} type
 * @param {import("./extended-attributes.js").SimpleExtendedAttribute} extAttr
 * @param {ExtendedAttributes} extAttrs
 */
function replaceAllowShared(type, extAttr, extAttrs) {
  return () => {
    const index = extAttrs.indexOf(extAttr);
    extAttrs.splice(index, 1);
    if (!extAttrs.length && type.tokens.base.trivia.match(/^\s$/)) {
      type.tokens.base.trivia = ""; // (let's not remove comments)
    }

    type.tokens.base.value = "AllowSharedBufferSource";
  };
}

/**
 * @param {Type} type
 */
function replaceVoid(type) {
  return () => {
    type.tokens.base.value = "undefined";
  };
}
