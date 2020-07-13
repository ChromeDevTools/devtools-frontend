// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as estree from 'estree';

declare module 'estree' {
  interface BaseNode {
    parent: BaseNode|null;
    start: number;
    end: number;
    id?: Node|null;
  }
}

declare global {
  // The @types/estree do not export the types to a namespace. Since we reference
  // these types as "ESTree.Node", we need to explicitly re-export them here.
  export namespace ESTree {
    type ArrayPattern = estree.ArrayPattern;
    type CatchClause = estree.CatchClause;
    type Class = estree.Class;
    type Expression = estree.Expression;
    type FunctionDeclaration = estree.FunctionDeclaration;
    type ForStatement = estree.ForStatement;
    type ForOfStatement = estree.ForOfStatement;
    type ForInStatement = estree.ForInStatement;
    type Identifier = estree.Identifier;
    type IfStatement = estree.IfStatement;
    type Literal = estree.Literal;
    type MemberExpression = estree.MemberExpression;
    type MethodDefinition = estree.MethodDefinition;
    type Node = estree.Node;
    type ObjectPattern = estree.ObjectPattern;
    type Pattern = estree.Pattern;
    type SimpleLiteral = estree.SimpleLiteral;
    type TemplateLiteralNode = estree.TemplateLiteral;
    type TryStatement = estree.TryStatement;
    type VariableDeclarator = estree.VariableDeclarator;
  }
}
