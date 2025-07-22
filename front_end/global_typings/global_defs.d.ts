// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Branded type used for CSS text bundled with our `*.css.js` files.
 */
type CSSInJS = string&{_tag: 'CSS-in-JS'};

declare module '*.css.js' {
  const styles: CSSInJS;
  export default styles;
}

// Types for the Scheduler API.
// These are taken from
// https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/wicg-task-scheduling
// but modified because within Chrome we can use the API without worrying that
// it is undefined.
// This code is licensed under the MIT license
/**
 * MIT License
 * Copyright (c) Microsoft Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE
 */
type PostTaskPriority = 'user-blocking'|'user-visible'|'background';

interface PostTaskOptions {
  priority?: PostTaskPriority;
  signal?: AbortSignal;
  delay?: number;
}

interface Scheduler {
  yield(): Promise<void>;
  postTask<T>(callback: () => T): Promise<T>;
  postTask<T>(callback: () => T, options: PostTaskOptions): Promise<T>;
}

interface Window {
  readonly scheduler: Scheduler;

  // Chromium only feature so not exposed on TypeScript lib.dom
  showSaveFilePicker(opts: {
    suggestedName: string,
  }): Promise<FileSystemFileHandle>;
}

interface WorkerGlobalScope {
  readonly scheduler?: Scheduler;
}
