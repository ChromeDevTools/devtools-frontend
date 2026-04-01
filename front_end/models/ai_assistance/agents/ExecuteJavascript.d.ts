import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type { ChangeManager } from '../ChangeManager.js';
import type { AgentOptions as BaseAgentOptions, FunctionCallHandlerResult, FunctionDeclaration, FunctionHandlerOptions } from './AiAgent.js';
export type CreateExtensionScopeFunction = (changes: ChangeManager) => {
    install(): Promise<void>;
    uninstall(): Promise<void>;
};
export interface ExecuteJsAgentOptions extends BaseAgentOptions {
    changeManager?: ChangeManager;
    createExtensionScope?: CreateExtensionScopeFunction;
    execJs?: typeof executeJsCode;
}
export declare function executeJavaScriptFunction(executor: JavascriptExecutor): FunctionDeclaration<{
    title: string;
    explanation: string;
    code: string;
}, unknown>;
export declare function executeJsCode(functionDeclaration: string, { throwOnSideEffect, contextNode }: {
    throwOnSideEffect: boolean;
    contextNode: SDK.DOMModel.DOMNode | null;
}): Promise<string>;
export interface JavascriptExecutorOptions {
    readonly executionMode: Root.Runtime.HostConfigFreestylerExecutionMode;
    readonly getContextNode: () => SDK.DOMModel.DOMNode | null;
    readonly createExtensionScope: (changes: ChangeManager) => {
        install(): Promise<void>;
        uninstall(): Promise<void>;
    };
    readonly changes: ChangeManager;
}
export declare class JavascriptExecutor {
    #private;
    constructor(options: JavascriptExecutorOptions, execJs?: typeof executeJsCode);
    executeAction(action: string, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<unknown>>;
    generateObservation(action: string, { throwOnSideEffect, }: {
        throwOnSideEffect: boolean;
    }): Promise<{
        observation: string;
        sideEffect: boolean;
        canceled: boolean;
    }>;
}
