// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectCall<TArgs extends any[] = any[], TReturnValue = any>(
    stub: sinon.SinonStub<TArgs, TReturnValue>,
    options: {fakeFn?: (...args: TArgs) => TReturnValue, callCount?: number} = {}): Promise<TArgs> {
  return new Promise<TArgs>(resolve => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stub.callsFake(function(this: any, ...args: TArgs) {
      if (stub.callCount >= (options.callCount ?? 1)) {
        resolve(args);
      }
      return (options.fakeFn ? options.fakeFn.apply(this, args) : undefined) as TReturnValue;
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectCalled<TArgs extends any[] = any[], TReturnValue = any>(
    stub: sinon.SinonStub<TArgs, TReturnValue>,
    options: {fakeFn?: (...args: TArgs) => TReturnValue, callCount?: number} = {}): Promise<TArgs> {
  const remainingCalls = (options.callCount ?? 1) - stub.callCount;
  if (remainingCalls <= 0) {
    return Promise.resolve(stub.lastCall.args);
  }
  return expectCall(stub, {...options, callCount: remainingCalls});
}

type Args<T> = T extends(...args: infer TArgs) => unknown ? TArgs : never;
type Ret<T> = T extends(...args: any[]) => infer TRet ? TRet : never;

export function spyCall<T, Fn extends keyof T>(obj: T, method: Fn): Promise<{args: Args<T[Fn]>, result: Ret<T[Fn]>}> {
  const {promise, resolve} = Promise.withResolvers<{args: Args<T[Fn]>, result: Ret<T[Fn]>}>();

  const original = obj[method] as (...args: Args<T[Fn]>) => Ret<T[Fn]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub = sinon.stub(obj, method).callsFake(function(this: any, ...args: any) {
    const result = original.apply(this, args);
    resolve({args, result});
    stub.restore();
  });

  return promise;
}
