import * as SDK from '../../../../core/sdk/sdk.js';
export declare class JavaScriptREPL {
    static wrapObjectLiteral(code: string): string;
    static evaluate(text: string, executionContext: SDK.RuntimeModel.ExecutionContext, throwOnSideEffect: boolean, replMode: boolean, timeout?: number, objectGroup?: string, awaitPromise?: boolean, silent?: boolean): Promise<SDK.RuntimeModel.EvaluationResult | null>;
    static evaluateAndBuildPreview(text: string, throwOnSideEffect: boolean, replMode: boolean, timeout?: number, allowErrors?: boolean, objectGroup?: string, awaitPromise?: boolean, silent?: boolean): Promise<{
        preview: DocumentFragment;
        result: SDK.RuntimeModel.EvaluationResult | null;
    }>;
}
