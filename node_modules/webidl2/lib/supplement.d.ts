import { ExtendedAttributes } from "./productions/extended-attributes.js";
import { Type } from "./productions/type.js";
import { Default } from "./productions/default.js";
import { Token } from "./tokeniser.js";
import { Argument } from "./productions/argument.js";
import { WrappedToken } from "./productions/token.js";
import { Base } from "./productions/base.js";
import { Definitions } from "./validator.js";
import { Writer } from "./writer.js";

declare module "./tokeniser.js" {
  interface Tokeniser {
    current: any;
    // TODO: This somehow causes fatal error on typescript
    // source: Token[] & { name?: string };
  }
}

declare module "./productions/argument.js" {
  interface Argument {
    idlType: Type;
    default: Default | null;
  }
}

declare module "./productions/attribute.js" {
  interface Attribute {
    idlType: Type;
    default: Default | null;
  }
}

declare module "./productions/attribute.js" {
  interface Attribute {
    idlType: Type;
    default: Default | null;
  }
}

declare module "./productions/callback.js" {
  interface CallbackFunction {
    idlType: Type;
    arguments: Argument[];
  }
}

declare module "./productions/constant.js" {
  interface Constant {
    idlType: Type;
  }
}


declare module "./productions/constructor.js" {
  interface Constructor {
    arguments: Argument[];
  }
}

declare module "./productions/container.js" {
  interface TypedBase extends Base {
    type: string
  }
  interface Container {
    type: string;
    members: RootType[];
  }
}

declare module "./productions/default.js" {
  interface Default {
    expression: Token[];
  }
}

declare module "./productions/enum.js" {
  interface Enum {
    values: EnumValue[];
  }
}

declare module "./productions/field.js" {
  interface Field {
    idlType: Type;
    default: Default | null;
  }
}

declare module "./productions/iterable.js" {
  interface IterableLike {
    idlType: Type[];
    arguments: Argument[];
  }
}

declare module "./productions/operation.js" {
  interface Operation {
    idlType: Type;
    arguments: Argument[];
  }
}

declare module "./productions/typedef.js" {
  interface Typedef {
    idlType: Type;
  }
}

declare module "./productions/extended-attributes.js" {
  interface ExtendedAttributeParameters {
    list: WrappedToken[] | Argument[];
  }
  interface SimpleExtendedAttribute {
    params: ExtendedAttributeParameters;
  }
}

declare module "./productions/base.js" {
  interface Base {
    tokens: Record<string, Token | undefined>;
    source: Token[];
    extAttrs: ExtendedAttributes | undefined;
    this: this;
    parent?: any;

    validate?(defs: Definitions): IterableIterator<any>;
    write(w: Writer): any;
  }
}

declare module "./productions/array-base.js" {
  interface ArrayBase {
    tokens: Record<string, Token | undefined>;
    source: Token[];
    parent?: any;
  }
}

declare module "./productions/type.js" {
  interface Type {
    /**
     * TODO: This kind of type check should ultimately be replaced by exposed constructors.
     * See https://github.com/w3c/webidl2.js/issues/537 and https://github.com/w3c/webidl2.js/issues/297.
     */
    type: string | null;
    subtype: Type[];
  }
}

declare global {
  export type ArrayItemType<T> = T extends Array<infer X> ? X : null;
}
