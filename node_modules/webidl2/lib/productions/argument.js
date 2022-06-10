import { Base } from "./base.js";
import { Default } from "./default.js";
import { ExtendedAttributes } from "./extended-attributes.js";
import {
  unescape,
  type_with_extended_attributes,
  autoParenter,
  getFirstToken,
} from "./helpers.js";
import { argumentNameKeywords, Tokeniser } from "../tokeniser.js";
import { validationError } from "../error.js";
import {
  idlTypeIncludesDictionary,
  dictionaryIncludesRequiredField,
} from "../validators/helpers.js";

export class Argument extends Base {
  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  static parse(tokeniser) {
    const start_position = tokeniser.position;
    /** @type {Base["tokens"]} */
    const tokens = {};
    const ret = autoParenter(
      new Argument({ source: tokeniser.source, tokens })
    );
    ret.extAttrs = ExtendedAttributes.parse(tokeniser);
    tokens.optional = tokeniser.consume("optional");
    ret.idlType = type_with_extended_attributes(tokeniser, "argument-type");
    if (!ret.idlType) {
      return tokeniser.unconsume(start_position);
    }
    if (!tokens.optional) {
      tokens.variadic = tokeniser.consume("...");
    }
    tokens.name =
      tokeniser.consumeKind("identifier") ||
      tokeniser.consume(...argumentNameKeywords);
    if (!tokens.name) {
      return tokeniser.unconsume(start_position);
    }
    ret.default = tokens.optional ? Default.parse(tokeniser) : null;
    return ret.this;
  }

  get type() {
    return "argument";
  }
  get optional() {
    return !!this.tokens.optional;
  }
  get variadic() {
    return !!this.tokens.variadic;
  }
  get name() {
    return unescape(this.tokens.name.value);
  }

  /**
   * @param {import("../validator.js").Definitions} defs
   */
  *validate(defs) {
    yield* this.extAttrs.validate(defs);
    yield* this.idlType.validate(defs);
    const result = idlTypeIncludesDictionary(this.idlType, defs, {
      useNullableInner: true,
    });
    if (result) {
      if (this.idlType.nullable) {
        const message = `Dictionary arguments cannot be nullable.`;
        yield validationError(
          this.tokens.name,
          this,
          "no-nullable-dict-arg",
          message
        );
      } else if (!this.optional) {
        if (
          this.parent &&
          !dictionaryIncludesRequiredField(result.dictionary, defs) &&
          isLastRequiredArgument(this)
        ) {
          const message = `Dictionary argument must be optional if it has no required fields`;
          yield validationError(
            this.tokens.name,
            this,
            "dict-arg-optional",
            message,
            {
              autofix: autofixDictionaryArgumentOptionality(this),
            }
          );
        }
      } else if (!this.default) {
        const message = `Optional dictionary arguments must have a default value of \`{}\`.`;
        yield validationError(
          this.tokens.name,
          this,
          "dict-arg-default",
          message,
          {
            autofix: autofixOptionalDictionaryDefaultValue(this),
          }
        );
      }
    }
  }

  /** @param {import("../writer.js").Writer} w */
  write(w) {
    return w.ts.wrap([
      this.extAttrs.write(w),
      w.token(this.tokens.optional),
      w.ts.type(this.idlType.write(w)),
      w.token(this.tokens.variadic),
      w.name_token(this.tokens.name, { data: this }),
      this.default ? this.default.write(w) : "",
      w.token(this.tokens.separator),
    ]);
  }
}

/**
 * @param {Argument} arg
 */
function isLastRequiredArgument(arg) {
  const list = arg.parent.arguments || arg.parent.list;
  const index = list.indexOf(arg);
  const requiredExists = list.slice(index + 1).some((a) => !a.optional);
  return !requiredExists;
}

/**
 * @param {Argument} arg
 */
function autofixDictionaryArgumentOptionality(arg) {
  return () => {
    const firstToken = getFirstToken(arg.idlType);
    arg.tokens.optional = {
      ...firstToken,
      type: "optional",
      value: "optional",
    };
    firstToken.trivia = " ";
    autofixOptionalDictionaryDefaultValue(arg)();
  };
}

/**
 * @param {Argument} arg
 */
function autofixOptionalDictionaryDefaultValue(arg) {
  return () => {
    arg.default = Default.parse(new Tokeniser(" = {}"));
  };
}
