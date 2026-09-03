// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type GnNodeType =
    |'BLOCK'|'FUNCTION'|'LIST'|'LITERAL'|'IDENTIFIER'|'BINARY'|'BLOCK_COMMENT'|'LINE_COMMENT'|'CONDITION'|(string&{});

/* eslint-disable @typescript-eslint/naming-convention */
export interface GnLocation {
  begin_column: number;
  begin_line: number;
  end_column: number;
  end_line: number;
}

export interface GnAstNode {
  type?: GnNodeType;
  value?: string;
  location?: GnLocation;
  child?: GnAstNode[];
  before_comment?: string[];
  begin_token?: string;
  end?: GnAstNode;
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface AstTargetInfo {
  label: string;
  templateName: string;
  buildFile: string;
  sources: string[];
  deps: string[];
  testonly: boolean;
}

export interface UpdateTargetDepsOptions {
  unusedDeps: string[];
  missingDeps: string[];
}
