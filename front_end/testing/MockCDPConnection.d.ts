import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
export type CommandHandler<C extends ProtocolClient.CDPConnection.Command> = (params: ProtocolClient.CDPConnection.CommandParams<C>, sessionId: string | undefined) => Promise<{
    result: ProtocolClient.CDPConnection.CommandResult<C>;
} | {
    error: ProtocolClient.CDPConnection.CDPError;
}> | {
    result: ProtocolClient.CDPConnection.CommandResult<C>;
} | {
    error: ProtocolClient.CDPConnection.CDPError;
};
export type CommandAndHandler<C extends ProtocolClient.CDPConnection.Command> = [C, CommandHandler<C>];
/**
 * This class fulfills a similar role as `describeWithMockConnection` with the main difference
 * being that it doesn't operate global.
 *
 * The right usage is to create a `MockCDPConnection` instance with your handlers, and then pass
 * it along to {@link createTarget}.
 *
 * This means a `MockCDPConnection` only affects the targets explicitly created with it and doesn't
 * leak anywhere else.
 */
export declare class MockCDPConnection implements ProtocolClient.CDPConnection.CDPConnection {
    #private;
    constructor(handlers?: Array<CommandAndHandler<ProtocolClient.CDPConnection.Command>>);
    /**
     * Sets the provided handler or clears an existing handler when passing `null`.
     *
     * Throws if a set would overwrite an existing handler.
     */
    setHandler<T extends ProtocolClient.CDPConnection.Command>(method: T, handler: CommandHandler<T> | null): void;
    send<T extends ProtocolClient.CDPConnection.Command>(method: T, params: ProtocolClient.CDPConnection.CommandParams<T>, sessionId: string | undefined): Promise<{
        result: ProtocolClient.CDPConnection.CommandResult<T>;
    } | {
        error: ProtocolClient.CDPConnection.CDPError;
    }>;
    dispatchEvent<T extends ProtocolClient.CDPConnection.Event>(event: T, params: ProtocolClient.CDPConnection.EventParams<T>, sessionId: string | undefined): void;
    observe(observer: ProtocolClient.CDPConnection.CDPConnectionObserver): void;
    unobserve(observer: ProtocolClient.CDPConnection.CDPConnectionObserver): void;
}
