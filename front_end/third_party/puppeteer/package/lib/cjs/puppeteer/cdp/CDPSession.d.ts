import { type ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';
import { type CDPEvents, CDPSession } from '../api/CDPSession.js';
import { type Connection } from './Connection.js';
import { type CdpTarget } from './Target.js';
/**
 * @internal
 */
export declare class CdpCDPSession extends CDPSession {
    #private;
    /**
     * @internal
     */
    constructor(connection: Connection, targetType: string, sessionId: string, parentSessionId: string | undefined);
    /**
     * Sets the {@link CdpTarget} associated with the session instance.
     *
     * @internal
     */
    _setTarget(target: CdpTarget): void;
    /**
     * Gets the {@link CdpTarget} associated with the session instance.
     *
     * @internal
     */
    _target(): CdpTarget;
    connection(): Connection | undefined;
    parentSession(): CDPSession | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * @internal
     */
    _onMessage(object: {
        id?: number;
        method: keyof CDPEvents;
        params: CDPEvents[keyof CDPEvents];
        error: {
            message: string;
            data: any;
            code: number;
        };
        result?: any;
    }): void;
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    detach(): Promise<void>;
    /**
     * @internal
     */
    _onClosed(): void;
    /**
     * Returns the session's id.
     */
    id(): string;
}
//# sourceMappingURL=CDPSession.d.ts.map