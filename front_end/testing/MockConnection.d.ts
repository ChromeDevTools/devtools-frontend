import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import type * as SDK from '../core/sdk/sdk.js';
import type { ProtocolMapping } from '../generated/protocol-mapping.js';
type ProtocolCommand = keyof ProtocolMapping.Commands;
type CommandParams<C extends keyof ProtocolMapping.Commands> = ProtocolClient.CDPConnection.CommandParams<C>;
type CommandResult<C extends keyof ProtocolMapping.Commands> = ProtocolClient.CDPConnection.CommandResult<C>;
export type ProtocolCommandHandler<C extends keyof ProtocolMapping.Commands> = (param: CommandParams<C>) => Omit<CommandResult<C>, 'getError'> | {
    getError(): string;
} | PromiseLike<Omit<CommandResult<C>, 'getError'> | {
    getError(): string;
}>;
export type MessageCallback = (result: string | Object) => void;
export declare function setMockConnectionResponseHandler<C extends ProtocolCommand>(command: C, handler: ProtocolCommandHandler<C>): void;
export declare function clearMockConnectionResponseHandler(method: ProtocolCommand): void;
export declare function clearAllMockConnectionResponseHandlers(): void;
export declare function registerListenerOnOutgoingMessage(method: ProtocolCommand): Promise<void>;
export declare function dispatchEvent<E extends keyof ProtocolMapping.Events>(target: SDK.Target.Target, eventName: E, ...payload: ProtocolMapping.Events[E]): void;
export declare function describeWithMockConnection(title: string, fn: (this: Mocha.Suite) => void, opts?: {
    reset: boolean;
}): Mocha.Suite;
export declare namespace describeWithMockConnection {
    var only: (title: string, fn: (this: Mocha.Suite) => void, opts?: {
        reset: boolean;
    }) => Mocha.Suite;
}
export {};
