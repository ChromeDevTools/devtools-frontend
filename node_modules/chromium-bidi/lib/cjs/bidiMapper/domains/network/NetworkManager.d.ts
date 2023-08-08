import type { ICdpClient } from '../../../cdp/cdpClient.js';
import type { IEventManager } from '../events/EventManager.js';
export declare class NetworkManager {
    #private;
    private constructor();
    static create(cdpClient: ICdpClient, eventManager: IEventManager): NetworkManager;
    dispose(): void;
}
