import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
export declare function createTarget({ id, name, type, parentTarget, subtype, url, connection, targetManager, }?: {
    id?: Protocol.Target.TargetID;
    name?: string;
    type?: SDK.Target.Type;
    parentTarget?: SDK.Target.Target;
    subtype?: string;
    url?: string;
    connection?: ProtocolClient.CDPConnection.CDPConnection;
    targetManager?: SDK.TargetManager.TargetManager;
}): SDK.Target.Target;
