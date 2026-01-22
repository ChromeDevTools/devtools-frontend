// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Returns a Promise that resolves with the arguments of the `stub`'s call once
 * it has been called `callCount` times.
 * If `fakeFn` is provided, it will be used as the fake implementation for the stub.
 *
 * @param stub The Sinon stub to observe.
 * @param options An object that can contain:
 *   - `fakeFn`: An optional function to use as the fake implementation of the stub.
 *   - `callCount`: The number of times the stub should be called before the Promise resolves. Defaults to 1.
 * @returns A Promise that resolves with the arguments of the `stub`'s last call.
 */
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

/**
 * Returns a Promise that resolves with the arguments of the `stub`'s call once
 * it has been called `callCount` times.
 * If the `stub` has already been called `callCount` times or more, the Promise
 * resolves immediately. This means you don't have to call this before the stub
 * might be called.
 * If `fakeFn` is provided, it will be used as the fake implementation for the stub.
 *
 * @param stub The Sinon stub to observe.
 * @param options An object that can contain:
 *   - `fakeFn`: An optional function to use as the fake implementation of the stub.
 *   - `callCount`: The number of times the stub should be called before the Promise resolves. Defaults to 1.
 * @returns A Promise that resolves with the arguments passed to the `stub` on its last call.
 */
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

/**
 * Spies on a method of an object and returns a Promise that resolves with the
 * arguments and result of the method's call.
 * The original method is restored after the first call.
 *
 * @param obj The object to spy on.
 * @param method The name of the method to spy on.
 * @returns A Promise that resolves with an object containing the `args` and `result` of the method call.
 */
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
