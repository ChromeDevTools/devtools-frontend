import type { CdpClient } from '../../../cdp/CdpClient.js';
import type { CdpConnection } from '../../../cdp/CdpConnection.js';
import type { Browser, Session } from '../../../protocol/protocol.js';
import { type LoggerFn } from '../../../utils/log.js';
import type { BluetoothProcessor } from '../bluetooth/BluetoothProcessor.js';
import type { UserContextStorage } from '../browser/UserContextStorage';
import type { BrowsingContextStorage } from '../context/BrowsingContextStorage.js';
import type { NetworkStorage } from '../network/NetworkStorage.js';
import type { PreloadScriptStorage } from '../script/PreloadScriptStorage.js';
import type { RealmStorage } from '../script/RealmStorage.js';
import type { EventManager } from '../session/EventManager.js';
export declare class CdpTargetManager {
    #private;
    constructor(cdpConnection: CdpConnection, browserCdpClient: CdpClient, selfTargetId: string, eventManager: EventManager, browsingContextStorage: BrowsingContextStorage, userContextStorage: UserContextStorage, realmStorage: RealmStorage, networkStorage: NetworkStorage, bluetoothProcessor: BluetoothProcessor, preloadScriptStorage: PreloadScriptStorage, defaultUserContextId: Browser.UserContext, prerenderingDisabled: boolean, unhandledPromptBehavior?: Session.UserPromptHandler, logger?: LoggerFn);
}
