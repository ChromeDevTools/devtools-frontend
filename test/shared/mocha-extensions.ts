// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';

const {beforeEach, describe} = Mocha;

export {
  beforeEach,
  describe,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function timeoutHook(done: Mocha.Done|undefined, err?: any) {
  function* joinStacks() {
    const scopes = AsyncScope.scopes;
    if (scopes.size === 0) {
      return;
    }
    for (const scope of scopes.values()) {
      const stack = scope.stack;
      if (stack) {
        yield `${stack.join('\n')}\n`;
      }
    }
  }

  const stacks = Array.from(joinStacks());
  if (stacks.length > 0) {
    console.error(`Pending async operations during failure:\n${stacks.join('\n\n')}`);
  }
  if (done) {
    return done(err);
  }
}

export function it(name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
  wrapMochaCall(Mocha.it, name, callback);
}

it.skip = function(name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
  wrapMochaCall(Mocha.it.skip, name, callback);
};

it.only = function(name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
  wrapMochaCall(Mocha.it.only, name, callback);
};

it.repeat = function(repeat: number, name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
  for (let i = 0; i < repeat; i++) {
    wrapMochaCall(Mocha.it.only, name, callback);
  }
};

function wrapMochaCall(
    call: Mocha.TestFunction|Mocha.PendingTestFunction|Mocha.ExclusiveTestFunction, name: string,
    callback: Mocha.Func|Mocha.AsyncFunc) {
  const test = call(name, function(done: Mocha.Done) {
    if (test) {
      const originalDone = test.callback;
      test.callback = timeoutHook.bind(undefined, originalDone);
      // If a timeout is already scheduled, reset it to install our new hook
      test.resetTimeout();
    }

    if (callback.length === 0) {
      (callback as Mocha.AsyncFunc).bind(this)().then(done, done);
    } else {
      (callback as Mocha.Func).bind(this)(done);
    }
  });
}

export class AsyncScope {
  static scopes: Set<AsyncScope> = new Set();
  private asyncStack: string[][] = [];

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
