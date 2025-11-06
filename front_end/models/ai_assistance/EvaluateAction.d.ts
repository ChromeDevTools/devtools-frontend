import * as SDK from '../../core/sdk/sdk.js';
export declare function formatError(message: string): string;
export declare class SideEffectError extends Error {
}
export interface GetErrorStackOutput {
    message: string;
    stack?: string;
}
export declare function getErrorStackOnThePage(this: Error): GetErrorStackOutput;
export declare function stringifyObjectOnThePage(this: unknown): string;
export declare function stringifyRemoteObject(object: SDK.RemoteObject.RemoteObject, functionDeclaration: string): Promise<string>;
export interface Options {
    throwOnSideEffect: boolean;
}
export declare class EvaluateAction {
    static execute(functionDeclaration: string, args: SDK.RemoteObject.RemoteObject[], executionContext: SDK.RuntimeModel.ExecutionContext, { throwOnSideEffect }: Options): Promise<string>;
    static getExecutedLineFromStack(stack: string, pageExposedFunctions: string[]): number | null;
    static stringifyError(result: GetErrorStackOutput, functionDeclaration: string): string;
}
