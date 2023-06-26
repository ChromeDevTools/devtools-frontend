import type { ICdpClient } from '../../../cdp/cdpClient.js';
import type { RealmStorage } from '../script/realmStorage.js';
import type { IEventManager } from '../events/EventManager.js';
import { Deferred } from '../../../utils/deferred.js';
import type { PreloadScriptStorage } from './PreloadScriptStorage.js';
export declare class CdpTarget {
    #private;
    static create(targetId: string, parentTargetId: string | null, cdpClient: ICdpClient, cdpSessionId: string, realmStorage: RealmStorage, eventManager: IEventManager, preloadScriptStorage: PreloadScriptStorage): CdpTarget;
    private constructor();
    /** Returns a promise that resolves when the target is unblocked. */
    get targetUnblocked(): Deferred<void>;
    get targetId(): string;
    get cdpClient(): ICdpClient;
    /**
     * Needed for CDP escape path.
     */
    get cdpSessionId(): string;
    /**
     * Enables the Network domain (creates NetworkProcessor on the target's cdp
     * client) if it is not enabled yet.
     */
    enableNetworkDomain(): Promise<void>;
}
