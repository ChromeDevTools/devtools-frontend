import * as estree from 'estree';

declare module 'estree' {
  interface BaseNode {
    parent: BaseNode|null;
  }
}

declare global {
  // The @types/estree do not export the types to a namespace. Since we reference
  // these types as "ESTree.Node", we need to explicitly re-export them here.
  export namespace ESTree {
    type Node = estree.Node;
    type Literal = estree.Literal;
    type SimpleLiteral = estree.SimpleLiteral;
    type TemplateLiteralNode = estree.TemplateLiteral;
  }
}