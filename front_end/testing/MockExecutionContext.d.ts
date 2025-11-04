import * as SDK from '../core/sdk/sdk.js';
export declare class MockExecutionContext extends SDK.RuntimeModel.ExecutionContext {
    constructor(target: SDK.Target.Target);
    evaluate(_options: SDK.RuntimeModel.EvaluationOptions, userGesture: boolean, _awaitPromise: boolean): Promise<SDK.RuntimeModel.EvaluationResult>;
}
