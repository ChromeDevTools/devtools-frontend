// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {GnAstNode, GnLocation} from './gn_ast_types.ts';

export function unquoteFromGn(val?: string): string {
  return (val || '').replace(/^"|"$/g, '');
}

export function quoteForGn(val: string): string {
  return `"${val}"`;
}

const defaultLocation = (): GnLocation => ({
  begin_column: 1,
  begin_line: 1,
  end_column: 1,
  end_line: 1,
});

export const createAstNode = {
  literal: (value: string): GnAstNode => ({
    type: 'LITERAL',
    value,
    location: defaultLocation(),
  }),
  stringLiteral: (value: string): GnAstNode => ({
    type: 'LITERAL',
    value: quoteForGn(value),
    location: defaultLocation(),
  }),
  identifier: (value: string): GnAstNode => ({
    type: 'IDENTIFIER',
    value,
    location: defaultLocation(),
  }),
  list: (children: GnAstNode[] = []): GnAstNode => ({
    type: 'LIST',
    begin_token: '[',
    child: children,
    end: {
      type: 'END',
      value: ']',
      location: defaultLocation(),
    },
    location: defaultLocation(),
  }),
  binary: (operator: string, lhs: GnAstNode, rhs: GnAstNode): GnAstNode => ({
    type: 'BINARY',
    value: operator,
    child: [lhs, rhs],
    location: defaultLocation(),
  }),
  assignment: (
      variable: string,
      rhs: GnAstNode,
      op: '='|'+='|'-=' = '=',
      ): GnAstNode => ({
    type: 'BINARY',
    value: op,
    child: [createAstNode.identifier(variable), rhs],
    location: defaultLocation(),
  }),
};
