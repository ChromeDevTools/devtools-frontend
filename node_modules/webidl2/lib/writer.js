function noop(arg) {
  return arg;
}

const templates = {
  wrap: (items) => items.join(""),
  trivia: noop,
  name: noop,
  reference: noop,
  type: noop,
  generic: noop,
  nameless: noop,
  inheritance: noop,
  definition: noop,
  extendedAttribute: noop,
  extendedAttributeReference: noop,
};

export class Writer {
  constructor(ts) {
    this.ts = Object.assign({}, templates, ts);
  }

  /**
   * @param {string} raw
   * @param {object} options
   * @param {string} [options.unescaped]
   * @param {import("./productions/base.js").Base} [options.context]
   * @returns
   */
  reference(raw, { unescaped, context }) {
    if (!unescaped) {
      unescaped = raw.startsWith("_") ? raw.slice(1) : raw;
    }
    return this.ts.reference(raw, unescaped, context);
  }

  /**
   * @param {import("./tokeniser.js").Token} t
   * @param {Function} wrapper
   * @param {...any} args
   * @returns
   */
  token(t, wrapper = noop, ...args) {
    if (!t) {
      return "";
    }
    const value = wrapper(t.value, ...args);
    return this.ts.wrap([this.ts.trivia(t.trivia), value]);
  }

  reference_token(t, context) {
    return this.token(t, this.reference.bind(this), { context });
  }

  name_token(t, arg) {
    return this.token(t, this.ts.name, arg);
  }

  identifier(id, context) {
    return this.ts.wrap([
      this.reference_token(id.tokens.value, context),
      this.token(id.tokens.separator),
    ]);
  }
}

export function write(ast, { templates: ts = templates } = {}) {
  ts = Object.assign({}, templates, ts);

  const w = new Writer(ts);

  return ts.wrap(ast.map((it) => it.write(w)));
}
