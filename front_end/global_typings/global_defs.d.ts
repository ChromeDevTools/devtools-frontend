// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface ImportMeta {
  url: string;
}

declare module '*.css.js' {
  const styles: CSSStyleSheet;
  export default styles;
}

declare module '*.css.legacy.js' {
  const styles: {cssContent: string};
  export default styles;
}

// Remove once https://github.com/microsoft/TypeScript/pull/57748 is available.
// Also see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array.
interface ArrayConstructor {
  fromAsync<T>(asyncIterableLike: AsyncIterable<T>|Iterable<T|PromiseLike<T>>|
               ArrayLike<T|PromiseLike<T>>): Promise<T[]>;
  fromAsync<T, U>(
      asyncIterableLike: AsyncIterable<T>|Iterable<T>|ArrayLike<T>, mapFn: (value: Awaited<T>) => U,
      thisArg?: any): Promise<Awaited<U>[]>;
}
