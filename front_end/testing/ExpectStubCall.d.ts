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
export declare function expectCall<TArgs extends any[] = any[], TReturnValue = any>(stub: sinon.SinonStub<TArgs, TReturnValue>, options?: {
    fakeFn?: (...args: TArgs) => TReturnValue;
    callCount?: number;
}): Promise<TArgs>;
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
export declare function expectCalled<TArgs extends any[] = any[], TReturnValue = any>(stub: sinon.SinonStub<TArgs, TReturnValue>, options?: {
    fakeFn?: (...args: TArgs) => TReturnValue;
    callCount?: number;
}): Promise<TArgs>;
type Args<T> = T extends (...args: infer TArgs) => unknown ? TArgs : never;
type Ret<T> = T extends (...args: any[]) => infer TRet ? TRet : never;
/**
 * Spies on a method of an object and returns a Promise that resolves with the
 * arguments and result of the method's call.
 * The original method is restored after the first call.
 *
 * @param obj The object to spy on.
 * @param method The name of the method to spy on.
 * @returns A Promise that resolves with an object containing the `args` and `result` of the method call.
 */
export declare function spyCall<T, Fn extends keyof T>(obj: T, method: Fn): Promise<{
    args: Args<T[Fn]>;
    result: Ret<T[Fn]>;
}>;
export {};
