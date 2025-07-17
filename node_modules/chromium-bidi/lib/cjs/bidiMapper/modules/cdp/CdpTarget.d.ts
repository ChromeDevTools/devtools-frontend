import type { Protocol } from 'devtools-protocol';
import type { CdpClient } from '../../../cdp/CdpClient.js';
import { type BrowsingContext, type ChromiumBidi, type Emulation, Session } from '../../../protocol/protocol.js';
import { Deferred } from '../../../utils/Deferred.js';
import type { LoggerFn } from '../../../utils/log.js';
import type { Result } from '../../../utils/result.js';
import type { UserContextConfig } from '../browser/UserContextConfig.js';
import type { BrowsingContextStorage } from '../context/BrowsingContextStorage.js';
import type { NetworkStorage } from '../network/NetworkStorage.js';
import type { ChannelProxy } from '../script/ChannelProxy.js';
import type { PreloadScriptStorage } from '../script/PreloadScriptStorage.js';
import type { RealmStorage } from '../script/RealmStorage.js';
import type { EventManager } from '../session/EventManager.js';
export declare class CdpTarget {
    #private;
    static create(targetId: Protocol.Target.TargetID, cdpClient: CdpClient, browserCdpClient: CdpClient, parentCdpClient: CdpClient, realmStorage: RealmStorage, eventManager: EventManager, preloadScriptStorage: PreloadScriptStorage, browsingContextStorage: BrowsingContextStorage, networkStorage: NetworkStorage, prerenderingDisabled: boolean, userContextConfig: UserContextConfig, unhandledPromptBehavior?: Session.UserPromptHandler, logger?: LoggerFn): CdpTarget;
    constructor(targetId: Protocol.Target.TargetID, cdpClient: CdpClient, browserCdpClient: CdpClient, parentCdpClient: CdpClient, eventManager: EventManager, realmStorage: RealmStorage, preloadScriptStorage: PreloadScriptStorage, browsingContextStorage: BrowsingContextStorage, networkStorage: NetworkStorage, prerenderingDisabled: boolean, userContextConfig: UserContextConfig, unhandledPromptBehavior?: Session.UserPromptHandler, logger?: LoggerFn);
    /** Returns a deferred that resolves when the target is unblocked. */
    get unblocked(): Deferred<Result<void>>;
    get id(): Protocol.Target.TargetID;
    get cdpClient(): CdpClient;
    get parentCdpClient(): CdpClient;
    get browserCdpClient(): CdpClient;
    /** Needed for CDP escape path. */
    get cdpSessionId(): Protocol.Target.SessionID;
    /**
     * Window id the target belongs to. If not known, returns 0.
     */
    get windowId(): number;
    toggleFetchIfNeeded(): Promise<void>;
    /**
     * Toggles CDP "Fetch" domain and enable/disable network cache.
     */
    toggleNetworkIfNeeded(): Promise<void>;
    toggleSetCacheDisabled(disable?: boolean): Promise<void>;
    toggleDeviceAccessIfNeeded(): Promise<void>;
    toggleNetwork(): Promise<void>;
    /**
     * All the ProxyChannels from all the preload scripts of the given
     * BrowsingContext.
     */
    getChannels(): ChannelProxy[];
    setViewport(viewport?: BrowsingContext.Viewport | null, devicePixelRatio?: number | null): Promise<void>;
    get topLevelId(): string;
    isSubscribedTo(moduleOrEvent: ChromiumBidi.EventNames): boolean;
    setGeolocationOverride(geolocation: Emulation.GeolocationCoordinates | Emulation.GeolocationPositionError | null): Promise<void>;
}
