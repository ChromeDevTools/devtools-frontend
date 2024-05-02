/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type ProtocolMapping from 'devtools-protocol/types/protocol-mapping.js';
import { CDPSession } from '../api/CDPSession.js';
import type { Connection as CdpConnection } from '../cdp/Connection.js';
import type { BidiFrame } from './Frame.js';
/**
 * @internal
 */
export declare class BidiCdpSession extends CDPSession {
    #private;
    static sessions: Map<string, BidiCdpSession>;
    readonly frame: BidiFrame;
    constructor(frame: BidiFrame, sessionId?: string);
    connection(): CdpConnection | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, params?: ProtocolMapping.Commands[T]['paramsType'][0]): Promise<ProtocolMapping.Commands[T]['returnType']>;
    detach(): Promise<void>;
    id(): string;
}
//# sourceMappingURL=CDPSession.d.ts.map