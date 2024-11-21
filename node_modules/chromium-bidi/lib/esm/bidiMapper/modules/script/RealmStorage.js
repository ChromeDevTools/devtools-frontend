import { NoSuchFrameException, } from '../../../protocol/protocol.js';
import { WindowRealm } from './WindowRealm.js';
/** Container class for browsing realms. */
export class RealmStorage {
    /** Tracks handles and their realms sent to the client. */
    #knownHandlesToRealmMap = new Map();
    /** Map from realm ID to Realm. */
    #realmMap = new Map();
    get knownHandlesToRealmMap() {
        return this.#knownHandlesToRealmMap;
    }
    addRealm(realm) {
        this.#realmMap.set(realm.realmId, realm);
    }
    /** Finds all realms that match the given filter. */
    findRealms(filter) {
        return Array.from(this.#realmMap.values()).filter((realm) => {
            if (filter.realmId !== undefined && filter.realmId !== realm.realmId) {
                return false;
            }
            if (filter.browsingContextId !== undefined &&
                !realm.associatedBrowsingContexts
                    .map((browsingContext) => browsingContext.id)
                    .includes(filter.browsingContextId)) {
                return false;
            }
            if (filter.sandbox !== undefined &&
                (!(realm instanceof WindowRealm) || filter.sandbox !== realm.sandbox)) {
                return false;
            }
            if (filter.executionContextId !== undefined &&
                filter.executionContextId !== realm.executionContextId) {
                return false;
            }
            if (filter.origin !== undefined && filter.origin !== realm.origin) {
                return false;
            }
            if (filter.type !== undefined && filter.type !== realm.realmType) {
                return false;
            }
            if (filter.cdpSessionId !== undefined &&
                filter.cdpSessionId !== realm.cdpClient.sessionId) {
                return false;
            }
            return true;
        });
    }
    findRealm(filter) {
        const maybeRealms = this.findRealms(filter);
        if (maybeRealms.length !== 1) {
            return undefined;
        }
        return maybeRealms[0];
    }
    /** Gets the only realm that matches the given filter, if any, otherwise throws. */
    getRealm(filter) {
        const maybeRealm = this.findRealm(filter);
        if (maybeRealm === undefined) {
            throw new NoSuchFrameException(`Realm ${JSON.stringify(filter)} not found`);
        }
        return maybeRealm;
    }
    /** Deletes all realms that match the given filter. */
    deleteRealms(filter) {
        this.findRealms(filter).map((realm) => {
            realm.dispose();
            this.#realmMap.delete(realm.realmId);
            Array.from(this.knownHandlesToRealmMap.entries())
                .filter(([, r]) => r === realm.realmId)
                .map(([handle]) => this.knownHandlesToRealmMap.delete(handle));
        });
    }
}
//# sourceMappingURL=RealmStorage.js.map