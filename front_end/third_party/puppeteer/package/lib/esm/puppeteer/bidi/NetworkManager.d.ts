/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from '../common/EventEmitter.js';
import { type NetworkManagerEvents } from '../common/NetworkManagerEvents.js';
import type { BidiConnection } from './Connection.js';
import type { BidiFrame } from './Frame.js';
import { BidiHTTPResponse } from './HTTPResponse.js';
import type { BidiPage } from './Page.js';
/**
 * @internal
 */
export declare class BidiNetworkManager extends EventEmitter<NetworkManagerEvents> {
    #private;
    constructor(connection: BidiConnection, page: BidiPage);
    getNavigationResponse(navigationId?: string | null): BidiHTTPResponse | null;
    inFlightRequestsCount(): number;
    clearMapAfterFrameDispose(frame: BidiFrame): void;
    dispose(): void;
}
//# sourceMappingURL=NetworkManager.d.ts.map