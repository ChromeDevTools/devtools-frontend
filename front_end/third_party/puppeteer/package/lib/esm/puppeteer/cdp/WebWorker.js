import { WebWorker } from '../api/WebWorker.js';
import { TimeoutSettings } from '../common/TimeoutSettings.js';
import { debugError } from '../common/util.js';
import { ExecutionContext } from './ExecutionContext.js';
import { IsolatedWorld } from './IsolatedWorld.js';
import { CdpJSHandle } from './JSHandle.js';
/**
 * @internal
 */
export class CdpWebWorker extends WebWorker {
    #world;
    #client;
    constructor(client, url, consoleAPICalled, exceptionThrown) {
        super(url);
        this.#client = client;
        this.#world = new IsolatedWorld(this, new TimeoutSettings());
        this.#client.once('Runtime.executionContextCreated', async (event) => {
            this.#world.setContext(new ExecutionContext(client, event.context, this.#world));
        });
        this.#client.on('Runtime.consoleAPICalled', async (event) => {
            try {
                return consoleAPICalled(event.type, event.args.map((object) => {
                    return new CdpJSHandle(this.#world, object);
                }), event.stackTrace);
            }
            catch (err) {
                debugError(err);
            }
        });
        this.#client.on('Runtime.exceptionThrown', exceptionThrown);
        // This might fail if the target is closed before we receive all execution contexts.
        this.#client.send('Runtime.enable').catch(debugError);
    }
    mainRealm() {
        return this.#world;
    }
    get client() {
        return this.#client;
    }
}
//# sourceMappingURL=WebWorker.js.map