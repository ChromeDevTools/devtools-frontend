import type Protocol from 'devtools-protocol';
import type { ICdpClient } from '../../../cdp/cdpClient.js';
import { Deferred } from '../../../utils/deferred.js';
import type { IEventManager } from '../events/EventManager.js';
import type { ChannelProxy } from '../script/channelProxy.js';
import type { RealmStorage } from '../script/realmStorage.js';
import type { PreloadScriptStorage } from '../script/PreloadScriptStorage.js';
import type { Result } from '../../../utils/result.js';
export declare class CdpTarget {
    #private;
    static create(targetId: Protocol.Target.TargetID, cdpClient: ICdpClient, cdpSessionId: Protocol.Target.SessionID, realmStorage: RealmStorage, eventManager: IEventManager, preloadScriptStorage: PreloadScriptStorage): CdpTarget;
    private constructor();
    /** Returns a promise that resolves when the target is unblocked. */
    get targetUnblocked(): Deferred<Result<void>>;
    get targetId(): Protocol.Target.TargetID;
    get cdpClient(): ICdpClient;
    /**
     * Needed for CDP escape path.
     */
    get cdpSessionId(): Protocol.Target.SessionID;
    /**
     * All the ProxyChannels from all the preload scripts of the given
     * BrowsingContext.
     */
    getChannels(): ChannelProxy[];
}
