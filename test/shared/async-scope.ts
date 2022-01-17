// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class AsyncScope {
  static scopes: Set<AsyncScope> = new Set();
  private asyncStack: string[][] = [];
  private canceled: boolean = false;

  setCanceled(): void {
    this.canceled = true;
  }

  isCanceled(): boolean {
    return this.canceled;
  }

  get stack() {
    if (this.asyncStack.length === 0) {
      return null;
    }
    return this.asyncStack[this.asyncStack.length - 1];
  }

  push() {
    const stack = new Error().stack;
    if (!stack) {
      throw new Error('Could not get stack trace');
    }

    if (this.asyncStack.length === 0) {
      AsyncScope.scopes.add(this);
    }
    const filteredStack = stack.split('\n').filter(
        value =>
            !(value === 'Error' || value.includes('AsyncScope') || value.includes('runMicrotasks') ||
              value.includes('processTicksAndRejections')));
    this.asyncStack.push(filteredStack);
  }

  pop() {
    this.asyncStack.pop();
    if (this.asyncStack.length === 0) {
      AsyncScope.scopes.delete(this);
    }
  }

  async exec<T>(callable: () => Promise<T>) {
    this.push();
    try {
      const result = await callable();
      return result;
    } finally {
      this.pop();
    }
  }

  execSync<T>(callable: () => T) {
    this.push();
    try {
      const result = callable();
      return result;
    } finally {
      this.pop();
    }
  }
}
