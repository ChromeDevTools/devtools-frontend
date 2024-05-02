// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class AsyncScope {
  static scopes: Set<AsyncScope> = new Set();
  private asyncStack: Array<{description?: string, frames: string[]}> = [];
  private canceled: boolean = false;

  setCanceled(): void {
    this.canceled = true;
  }

  isCanceled(): boolean {
    return this.canceled;
  }

  get descriptions(): string[] {
    return this.asyncStack.map(({description}) => description).filter(d => d) as string[];
  }
  get stack(): null|string[] {
    if (this.asyncStack.length === 0) {
      return null;
    }
    return this.asyncStack[this.asyncStack.length - 1].frames;
  }

  push(description?: string) {
    const stack = new Error().stack;
    if (!stack) {
      throw new Error('Could not get stack trace');
    }

    if (this.asyncStack.length === 0) {
      AsyncScope.scopes.add(this);
    }
    const frames = stack.split('\n').filter(
        value =>
            !(value === 'Error' || value.includes('AsyncScope') || value.includes('runMicrotasks') ||
              value.includes('processTicksAndRejections')));
    this.asyncStack.push({description, frames});
  }

  pop() {
    this.asyncStack.pop();
    if (this.asyncStack.length === 0) {
      AsyncScope.scopes.delete(this);
    }
  }

  async exec<T>(callable: () => Promise<T>, description?: string) {
    this.push(description);
    try {
      const result = await callable();
      return result;
    } finally {
      this.pop();
    }
  }

  execSync<T>(callable: () => T, description?: string) {
    this.push(description);
    try {
      const result = callable();
      return result;
    } finally {
      this.pop();
    }
  }
}
