import { ExtendedAttributes } from "./productions/extended-attributes.js";
import { Type } from "./productions/type.js";
import { Default } from "./productions/default.js"
import { Token } from "./tokeniser.js";

declare module "./tokeniser.js" {
  interface Tokeniser {
    current: any;
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

declare module "./productions/base.js" {
  interface Base {
    tokens: Record<string, Token | undefined>;
    source: Token[];
    extAttrs: ExtendedAttributes | undefined;
    this: this;
    parent: any;
  }
}

declare global {
  export type ArrayItemType<T> = T extends Array<infer X> ? X : null;
}
