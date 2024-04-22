// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectCall<TArgs extends any[] = any[], TReturnValue = any>(
    stub: sinon.SinonStub<TArgs, TReturnValue>, fakeFn?: (...args: TArgs) => TReturnValue): Promise<TArgs> {
  return new Promise<TArgs>(resolve => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stub.callsFake(function(this: any, ...args: TArgs) {
      resolve(args);
      return (fakeFn ? fakeFn.apply(this, args) : undefined) as TReturnValue;
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectCalled<TArgs extends any[] = any[], TReturnValue = any>(
    stub: sinon.SinonStub<TArgs, TReturnValue>, fakeFn?: (...args: TArgs) => TReturnValue): Promise<TArgs> {
  if (stub.called) {
    return Promise.resolve(stub.lastCall.args);
  }
  return expectCall(stub, fakeFn);
}
