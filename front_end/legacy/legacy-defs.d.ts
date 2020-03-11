// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface StringConstructor {
  sprintf(format: string, ...var_arg: any): string;
  hashCode(id: string): number;
}

interface Array<T> {
  peekLast(): T | undefined;
  lowerBound(object: T, comparator: {(a:T, b:T):number}): number;
}

// Type alias for the Closure-supported ITemplateArray which is equivalent
// to TemplateStringsArray in TypeScript land
type ITemplateArray = TemplateStringsArray

interface String {
  trimEndWithMaxLength(maxLength: number): string;
}

declare let ls: (template: ITemplateArray) => string;
