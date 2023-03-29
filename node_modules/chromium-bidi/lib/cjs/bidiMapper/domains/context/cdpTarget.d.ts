import { CdpClient } from '../../CdpConnection';
import { RealmStorage } from '../script/realmStorage';
import { IEventManager } from '../events/EventManager';
import { Deferred } from '../../../utils/deferred';
export declare class CdpTarget {
    #private;
    static create(targetId: string, cdpClient: CdpClient, cdpSessionId: string, realmStorage: RealmStorage, eventManager: IEventManager): CdpTarget;
    private constructor();
    /**
     * Returns a promise that resolves when the target is unblocked.
     */
    get targetUnblocked(): Deferred<void>;
    get targetId(): string;
    get cdpClient(): CdpClient;
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
