// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum Tag {
  EMPTY = 0x0,
  ORIGINAL_SCOPE_START = 0x1,
  ORIGINAL_SCOPE_END = 0x2,
  ORIGINAL_SCOPE_VARIABLES = 0x3,
  GENERATED_RANGE_START = 0x4,
  GENERATED_RANGE_END = 0x5,
  GENERATED_RANGE_BINDINGS = 0x6,
  GENERATED_RANGE_SUBRANGE_BINDING = 0x7,
  GENERATED_RANGE_CALL_SITE = 0x8,
  VENDOR_EXTENSION = 0x63,
}

export const enum EncodedTag {
  EMPTY = "A", // 0x0
  ORIGINAL_SCOPE_START = "B", // 0x1
  ORIGINAL_SCOPE_END = "C", // 0x2
  ORIGINAL_SCOPE_VARIABLES = "D", // 0x3
  GENERATED_RANGE_START = "E", // 0x4
  GENERATED_RANGE_END = "F", // 0x5
  GENERATED_RANGE_BINDINGS = "G", // 0x6
  GENERATED_RANGE_SUBRANGE_BINDING = "H", // 0x7
  GENERATED_RANGE_CALL_SITE = "I", // 0x8
  VENDOR_EXTENSION = "/", //  0x63
}

export const enum OriginalScopeFlags {
  HAS_NAME = 0x1,
  HAS_KIND = 0x2,
  IS_STACK_FRAME = 0x4,
}

export const enum GeneratedRangeFlags {
  HAS_LINE = 0x1,
  HAS_DEFINITION = 0x2,
  IS_STACK_FRAME = 0x4,
  IS_HIDDEN = 0x8,
}

export interface OriginalScopeStartItem {
  flags: number;
  line: number;
  column: number;
  nameIdx?: number;
  kindIdx?: number;
}

export interface GeneratedRangeStartItem {
  flags: number;
  line?: number;
  column: number;
  definitionIdx?: number;
}
