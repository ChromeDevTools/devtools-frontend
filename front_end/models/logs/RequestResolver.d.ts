import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import { NetworkLog } from './NetworkLog.js';
/**
 * A class that facilitates resolving a requestId to a network request. If the requestId does not resolve, a listener
 * is installed on the network request to wait for the request to appear. This is useful if an attempt to resolve the
 * requestId is made before the network request got reported.
 *
 * This functionality is intentionally provided in this class (instead of as part of NetworkLog) to enable clients
 * to control the duration of the wait and the lifetime of the associated promises by using the `clear` method on
 * this class.
 */
export declare class RequestResolver extends Common.ResolverBase.ResolverBase<Protocol.Network.RequestId, SDK.NetworkRequest.NetworkRequest> {
    private networkListener;
    private networkLog;
    constructor(networkLog?: NetworkLog);
    protected getForId(id: Protocol.Network.RequestId): SDK.NetworkRequest.NetworkRequest | null;
    private onRequestAdded;
    protected startListening(): void;
    protected stopListening(): void;
}
