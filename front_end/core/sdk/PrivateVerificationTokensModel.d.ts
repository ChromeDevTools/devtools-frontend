import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import { SDKModel } from './SDKModel.js';
import { type Target } from './Target.js';
export declare class PrivateVerificationTokensModel extends SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
    #private;
    constructor(target: Target);
    setTracking(enable: boolean): void;
    getTokens(): Promise<Protocol.Storage.PrivateVerificationToken[]>;
    getIssuerConfigs(): Promise<Protocol.Storage.PrivateVerificationTokensIssuerConfig[]>;
    clearTokens(issuerOrigin: string): Promise<void>;
    deleteToken(tokenId: string): Promise<void>;
    privateVerificationTokensUpdated(): void;
}
export declare const enum Events {
    TOKENS_UPDATED = "TokensUpdated"
}
export interface EventTypes {
    [Events.TOKENS_UPDATED]: void;
}
