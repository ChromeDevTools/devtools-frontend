import { Tokeniser } from "./tokeniser.js";
import { Enum } from "./productions/enum.js";
import { Includes } from "./productions/includes.js";
import { ExtendedAttributes } from "./productions/extended-attributes.js";
import { Typedef } from "./productions/typedef.js";
import { CallbackFunction } from "./productions/callback.js";
import { Interface } from "./productions/interface.js";
import { Mixin } from "./productions/mixin.js";
import { Dictionary } from "./productions/dictionary.js";
import { Namespace } from "./productions/namespace.js";
import { CallbackInterface } from "./productions/callback-interface.js";
import { autoParenter } from "./productions/helpers.js";
import { Eof } from "./productions/token.js";

/** @typedef {'callbackInterface'|'dictionary'|'interface'|'mixin'|'namespace'} ExtendableInterfaces */
/** @typedef {{ extMembers?: import("./productions/container.js").AllowedMember[]}} Extension */
/** @typedef {Partial<Record<ExtendableInterfaces, Extension>>} Extensions */

/**
 * Parser options.
 * @typedef {Object} ParserOptions
 * @property {string} [sourceName]
 * @property {boolean} [concrete]
 * @property {Function[]} [productions]
 * @property {Extensions} [extensions]
 */

/**
 * @param {Tokeniser} tokeniser
 * @param {ParserOptions} options
 */
function parseByTokens(tokeniser, options) {
  const source = tokeniser.source;

  function error(str) {
    tokeniser.error(str);
  }

  function consume(...candidates) {
    return tokeniser.consume(...candidates);
  }

  function callback() {
    const callback = consume("callback");
    if (!callback) return;
    if (tokeniser.probe("interface")) {
      return CallbackInterface.parse(tokeniser, callback, {
        ...options?.extensions?.callbackInterface,
      });
    }
    return CallbackFunction.parse(tokeniser, callback);
  }

  function interface_(opts) {
    const base = consume("interface");
    if (!base) return;
    return (
      Mixin.parse(tokeniser, base, {
        ...opts,
        ...options?.extensions?.mixin,
      }) ||
      Interface.parse(tokeniser, base, {
        ...opts,
        ...options?.extensions?.interface,
      }) ||
      error("Interface has no proper body")
    );
  }

  function partial() {
    const partial = consume("partial");
    if (!partial) return;
    return (
      Dictionary.parse(tokeniser, {
        partial,
        ...options?.extensions?.dictionary,
      }) ||
      interface_({ partial }) ||
      Namespace.parse(tokeniser, {
        partial,
        ...options?.extensions?.namespace,
      }) ||
      error("Partial doesn't apply to anything")
    );
  }

  function definition() {
    if (options.productions) {
      for (const production of options.productions) {
        const result = production(tokeniser);
        if (result) {
          return result;
        }
      }
    }

    return (
      callback() ||
      interface_() ||
      partial() ||
      Dictionary.parse(tokeniser, options?.extensions?.dictionary) ||
      Enum.parse(tokeniser) ||
      Typedef.parse(tokeniser) ||
      Includes.parse(tokeniser) ||
      Namespace.parse(tokeniser, options?.extensions?.namespace)
    );
  }

  function definitions() {
    if (!source.length) return [];
    const defs = [];
    while (true) {
      const ea = ExtendedAttributes.parse(tokeniser);
      const def = definition();
      if (!def) {
        if (ea.length) error("Stray extended attributes");
        break;
      }
      autoParenter(def).extAttrs = ea;
      defs.push(def);
    }
    const eof = Eof.parse(tokeniser);
    if (options.concrete) {
      defs.push(eof);
    }
    return defs;
  }

  const res = definitions();
  if (tokeniser.position < source.length) error("Unrecognised tokens");
  return res;
}

/**
 * @param {string} str
 * @param {ParserOptions} [options]
 */
export function parse(str, options = {}) {
  const tokeniser = new Tokeniser(str);
  if (typeof options.sourceName !== "undefined") {
    // @ts-ignore (See Tokeniser.source in supplement.d.ts)
    tokeniser.source.name = options.sourceName;
  }
  return parseByTokens(tokeniser, options);
}
