import { Base } from "./base.js";
import { ExtendedAttributes } from "./extended-attributes.js";
import { unescape, autoParenter } from "./helpers.js";

/**
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 */
function inheritance(tokeniser) {
  const colon = tokeniser.consume(":");
  if (!colon) {
    return {};
  }
  const inheritance =
    tokeniser.consumeKind("identifier") ||
    tokeniser.error("Inheritance lacks a type");
  return { colon, inheritance };
}

/**
 * Parser callback.
 * @callback ParserCallback
 * @param {import("../tokeniser.js").Tokeniser} tokeniser
 * @param {...*} args
 */

/**
 * A parser callback and optional option object.
 * @typedef AllowedMember
 * @type {[ParserCallback, object?]}
 */

export class Container extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   * @param {*} instance TODO: This should be {T extends Container}, but see https://github.com/microsoft/TypeScript/issues/4628
   * @param {*} args
   */
  static parse(tokeniser, instance, { inheritable, allowedMembers }) {
    const { tokens, type } = instance;
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.error(`Missing name in ${type}`);
    tokeniser.current = instance;
    instance = autoParenter(instance);
    if (inheritable) {
      Object.assign(tokens, inheritance(tokeniser));
    }
    tokens.open = tokeniser.consume("{") || tokeniser.error(`Bodyless ${type}`);
    instance.members = [];
    while (true) {
      tokens.close = tokeniser.consume("}");
      if (tokens.close) {
        tokens.termination =
          tokeniser.consume(";") ||
          tokeniser.error(`Missing semicolon after ${type}`);
        return instance.this;
      }
      const ea = ExtendedAttributes.parse(tokeniser);
      let mem;
      for (const [parser, ...args] of allowedMembers) {
        mem = autoParenter(parser(tokeniser, ...args));
        if (mem) {
          break;
        }
      }
      if (!mem) {
        tokeniser.error("Unknown member");
      }
      mem.extAttrs = ea;
      instance.members.push(mem.this);
    }
  }

  get partial() {
    return !!this.tokens.partial;
  }
  get name() {
    return unescape(this.tokens.name.value);
  }
  get inheritance() {
    if (!this.tokens.inheritance) {
      return null;
    }
    return unescape(this.tokens.inheritance.value);
  }

  *validate(defs) {
    for (const member of this.members) {
      if (member.validate) {
        yield* member.validate(defs);
      }
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    const inheritance = () => {
      if (!this.tokens.inheritance) {
        return "";
      }
      return w.ts.wrap([
        w.token(this.tokens.colon),
        w.ts.trivia(this.tokens.inheritance.trivia),
        w.ts.inheritance(
          w.reference(this.tokens.inheritance.value, { context: this })
        ),
      ]);
    };

    return w.ts.definition(
      w.ts.wrap([
        this.extAttrs.write(w),
        w.token(this.tokens.callback),
        w.token(this.tokens.partial),
        w.token(this.tokens.base),
        w.token(this.tokens.mixin),
        w.name_token(this.tokens.name, { data: this }),
        inheritance(),
        w.token(this.tokens.open),
        w.ts.wrap(this.members.map((m) => m.write(w))),
        w.token(this.tokens.close),
        w.token(this.tokens.termination),
      ]),
      { data: this }
    );
  }
}
