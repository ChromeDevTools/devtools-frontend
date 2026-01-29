// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class AsyncScope {
  static scopes = new Set<AsyncScope>();
  static abortSignal: AbortSignal|undefined;
  private asyncStack: Array<{description?: string, frames: string[], messages: string[]}> = [];

  get descriptions(): string[] {
    return this.asyncStack.flatMap(({description, messages}) => {
      const indentedMessages = messages.map(message => ` - ${message}`);
      return (description || indentedMessages.length > 0) ? [description ?? '[no description]', ...indentedMessages] :
                                                            [];
    });
  }
  get stack(): null|string[] {
    if (this.asyncStack.length === 0) {
      return null;
    }
    return this.asyncStack[this.asyncStack.length - 1].frames;
  }

  push(description?: string): string[] {
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
    const messages: string[] = [];
    this.asyncStack.push({description, frames, messages});
    return messages;
  }

  pop() {
    this.asyncStack.pop();
    if (this.asyncStack.length === 0) {
      AsyncScope.scopes.delete(this);
    }
  }

  async exec<T>(callable: (messages: string[]) => Promise<T>, description?: string) {
    const messages = this.push(description);
    try {
      const result = await callable(messages);
      return result;
    } finally {
      this.pop();
    }
  }

  execSync<T>(callable: (messages: string[]) => T, description?: string) {
    const messages = this.push(description);
    try {
      const result = callable(messages);
      return result;
    } finally {
      this.pop();
    }
  }
}
