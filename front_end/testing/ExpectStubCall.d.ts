export declare function expectCall<TArgs extends any[] = any[], TReturnValue = any>(stub: sinon.SinonStub<TArgs, TReturnValue>, options?: {
    fakeFn?: (...args: TArgs) => TReturnValue;
    callCount?: number;
}): Promise<TArgs>;
export declare function expectCalled<TArgs extends any[] = any[], TReturnValue = any>(stub: sinon.SinonStub<TArgs, TReturnValue>, options?: {
    fakeFn?: (...args: TArgs) => TReturnValue;
    callCount?: number;
}): Promise<TArgs>;
type Args<T> = T extends (...args: infer TArgs) => unknown ? TArgs : never;
type Ret<T> = T extends (...args: any[]) => infer TRet ? TRet : never;
export declare function spyCall<T, Fn extends keyof T>(obj: T, method: Fn): Promise<{
    args: Args<T[Fn]>;
    result: Ret<T[Fn]>;
}>;
export {};
