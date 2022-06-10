import { Type } from "./type.js";
import { Argument } from "./argument.js";
import {
  ExtendedAttributes,
  SimpleExtendedAttribute,
} from "./extended-attributes.js";
import { Operation } from "./operation.js";
import { Attribute } from "./attribute.js";
import { Tokeniser } from "../tokeniser.js";

/**
 * @param {string} identifier
 */
export function unescape(identifier) {
  return identifier.startsWith("_") ? identifier.slice(1) : identifier;
}

/**
 * Parses comma-separated list
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {object} args
 * @param {Function} args.parser parser function for each item
 * @param {boolean} [args.allowDangler] whether to allow dangling comma
 * @param {string} [args.listName] the name to be shown on error messages
 */
export function list(tokeniser, { parser, allowDangler, listName = "list" }) {
  const first = parser(tokeniser);
  if (!first) {
    return [];
  }
  first.tokens.separator = tokeniser.consume(",");
  const items = [first];
  while (first.tokens.separator) {
    const item = parser(tokeniser);
    if (!item) {
      if (!allowDangler) {
        tokeniser.error(`Trailing comma in ${listName}`);
      }
      break;
    }
    item.tokens.separator = tokeniser.consume(",");
    items.push(item);
    if (!item.tokens.separator) break;
  }
  return items;
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
export function const_value(tokeniser) {
  return (
    tokeniser.consumeKind("decimal", "integer") ||
    tokeniser.consume("true", "false", "Infinity", "-Infinity", "NaN")
  );
}

/**
 * @param {object} token
 * @param {string} token.type
 * @param {string} token.value
 */
export function const_data({ type, value }) {
  switch (type) {
    case "decimal":
    case "integer":
      return { type: "number", value };
    case "string":
      return { type: "string", value: value.slice(1, -1) };
  }

  switch (value) {
    case "true":
    case "false":
      return { type: "boolean", value: value === "true" };
    case "Infinity":
    case "-Infinity":
      return { type: "Infinity", negative: value.startsWith("-") };
    case "[":
      return { type: "sequence", value: [] };
    case "{":
      return { type: "dictionary" };
    default:
      return { type: value };
  }
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
export function primitive_type(tokeniser) {
  function integer_type() {
    const prefix = tokeniser.consume("unsigned");
    const base = tokeniser.consume("short", "long");
    if (base) {
      const postfix = tokeniser.consume("long");
      return new Type({ source, tokens: { prefix, base, postfix } });
    }
    if (prefix) tokeniser.error("Failed to parse integer type");
  }

  function decimal_type() {
    const prefix = tokeniser.consume("unrestricted");
    const base = tokeniser.consume("float", "double");
    if (base) {
      return new Type({ source, tokens: { prefix, base } });
    }
    if (prefix) tokeniser.error("Failed to parse float type");
  }

  const { source } = tokeniser;
  const num_type = integer_type() || decimal_type();
  if (num_type) return num_type;
  const base = tokeniser.consume(
    "bigint",
    "boolean",
    "byte",
    "octet",
    "undefined"
  );
  if (base) {
    return new Type({ source, tokens: { base } });
  }
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
export function argument_list(tokeniser) {
  return list(tokeniser, {
    parser: Argument.parse,
    listName: "arguments list",
  });
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {string=} typeName (TODO: See Type.type for more details)
 */
export function type_with_extended_attributes(tokeniser, typeName) {
  const extAttrs = ExtendedAttributes.parse(tokeniser);
  const ret = Type.parse(tokeniser, typeName);
  if (ret) autoParenter(ret).extAttrs = extAttrs;
  return ret;
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {string=} typeName (TODO: See Type.type for more details)
 */
export function return_type(tokeniser, typeName) {
  const typ = Type.parse(tokeniser, typeName || "return-type");
  if (typ) {
    return typ;
  }
  const voidToken = tokeniser.consume("void");
  if (voidToken) {
    const ret = new Type({
      source: tokeniser.source,
      tokens: { base: voidToken },
    });
    ret.type = "return-type";
    return ret;
  }
}

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
export function stringifier(tokeniser) {
  const special = tokeniser.consume("stringifier");
  if (!special) return;
  const member =
    Attribute.parse(tokeniser, { special }) ||
    Operation.parse(tokeniser, { special }) ||
    tokeniser.error("Unterminated stringifier");
  return member;
}

/**
 * @param {string} str
 */
export function getLastIndentation(str) {
  const lines = str.split("\n");
  // the first line visually binds to the preceding token
  if (lines.length) {
    const match = lines[lines.length - 1].match(/^\s+/);
    if (match) {
      return match[0];
    }
  }
  return "";
}

/**
 * @param {string} parentTrivia
 */
export function getMemberIndentation(parentTrivia) {
  const indentation = getLastIndentation(parentTrivia);
  const indentCh = indentation.includes("\t") ? "\t" : "  ";
  return indentation + indentCh;
}

/**
 * @param {import("./interface.js").Interface} def
 */
export function autofixAddExposedWindow(def) {
  return () => {
    if (def.extAttrs.length) {
      const tokeniser = new Tokeniser("Exposed=Window,");
      const exposed = SimpleExtendedAttribute.parse(tokeniser);
      exposed.tokens.separator = tokeniser.consume(",");
      const existing = def.extAttrs[0];
      if (!/^\s/.test(existing.tokens.name.trivia)) {
        existing.tokens.name.trivia = ` ${existing.tokens.name.trivia}`;
      }
      def.extAttrs.unshift(exposed);
    } else {
      autoParenter(def).extAttrs = ExtendedAttributes.parse(
        new Tokeniser("[Exposed=Window]")
      );
      const trivia = def.tokens.base.trivia;
      def.extAttrs.tokens.open.trivia = trivia;
      def.tokens.base.trivia = `\n${getLastIndentation(trivia)}`;
    }
  };
}

/**
 * Get the first syntax token for the given IDL object.
 * @param {*} data
 */
export function getFirstToken(data) {
  if (data.extAttrs.length) {
    return data.extAttrs.tokens.open;
  }
  if (data.type === "operation" && !data.special) {
    return getFirstToken(data.idlType);
  }
  const tokens = Object.values(data.tokens).sort((x, y) => x.index - y.index);
  return tokens[0];
}

/**
 * @template T
 * @param {T[]} array
 * @param {(item: T) => boolean} predicate
 */
export function findLastIndex(array, predicate) {
  const index = array.slice().reverse().findIndex(predicate);
  if (index === -1) {
    return index;
  }
  return array.length - index - 1;
}

/**
 * Returns a proxy that auto-assign `parent` field.
 * @template {Record<string | symbol, any>} T
 * @param {T} data
 * @param {*} [parent] The object that will be assigned to `parent`.
 *                     If absent, it will be `data` by default.
 * @return {T}
 */
export function autoParenter(data, parent) {
  if (!parent) {
    // Defaults to `data` unless specified otherwise.
    parent = data;
  }
  if (!data) {
    // This allows `autoParenter(undefined)` which again allows
    // `autoParenter(parse())` where the function may return nothing.
    return data;
  }
  const proxy = new Proxy(data, {
    get(target, p) {
      const value = target[p];
      if (Array.isArray(value) && p !== "source") {
        // Wraps the array so that any added items will also automatically
        // get their `parent` values.
        return autoParenter(value, target);
      }
      return value;
    },
    set(target, p, value) {
      // @ts-ignore https://github.com/microsoft/TypeScript/issues/47357
      target[p] = value;
      if (!value) {
        return true;
      } else if (Array.isArray(value)) {
        // Assigning an array will add `parent` to its items.
        for (const item of value) {
          if (typeof item.parent !== "undefined") {
            item.parent = parent;
          }
        }
      } else if (typeof value.parent !== "undefined") {
        value.parent = parent;
      }
      return true;
    },
  });
  return proxy;
}
