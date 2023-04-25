"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogManager = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const logHelper_js_1 = require("./logHelper.js");
/** Converts CDP StackTrace object to BiDi StackTrace object. */
function getBidiStackTrace(cdpStackTrace) {
    const stackFrames = cdpStackTrace?.callFrames.map((callFrame) => {
        return {
            columnNumber: callFrame.columnNumber,
            functionName: callFrame.functionName,
            lineNumber: callFrame.lineNumber,
            url: callFrame.url,
        };
    });
    return stackFrames ? { callFrames: stackFrames } : undefined;
}
function getLogLevel(consoleApiType) {
    if (['assert', 'error'].includes(consoleApiType)) {
        return 'error';
    }
    if (['debug', 'trace'].includes(consoleApiType)) {
        return 'debug';
    }
    if (['warn', 'warning'].includes(consoleApiType)) {
        return 'warn';
    }
    return 'info';
}
class LogManager {
    #eventManager;
    #realmStorage;
    #cdpTarget;
    constructor(cdpTarget, realmStorage, eventManager) {
        this.#cdpTarget = cdpTarget;
        this.#realmStorage = realmStorage;
        this.#eventManager = eventManager;
    }
    static create(cdpTarget, realmStorage, eventManager) {
        const logManager = new LogManager(cdpTarget, realmStorage, eventManager);
        logManager.#initialize();
        return logManager;
    }
    #initialize() {
        this.#initializeLogEntryAddedEventListener();
    }
    #initializeLogEntryAddedEventListener() {
        this.#cdpTarget.cdpClient.on('Runtime.consoleAPICalled', (params) => {
            // Try to find realm by `cdpSessionId` and `executionContextId`,
            // if provided.
            const realm = this.#realmStorage.findRealm({
                cdpSessionId: this.#cdpTarget.cdpSessionId,
                executionContextId: params.executionContextId,
            });
            const argsPromise = realm === undefined
                ? Promise.resolve(params.args)
                : // Properly serialize arguments if possible.
                    Promise.all(params.args.map((arg) => {
                        return realm.serializeCdpObject(arg, 'none');
                    }));
            this.#eventManager.registerPromiseEvent(argsPromise.then((args) => ({
                method: protocol_js_1.Log.EventNames.LogEntryAddedEvent,
                params: {
                    level: getLogLevel(params.type),
                    source: {
                        realm: realm?.realmId ?? 'UNKNOWN',
                        context: realm?.browsingContextId ?? 'UNKNOWN',
                    },
                    text: (0, logHelper_js_1.getRemoteValuesText)(args, true),
                    timestamp: Math.round(params.timestamp),
                    stackTrace: getBidiStackTrace(params.stackTrace),
                    type: 'console',
                    // Console method is `warn`, not `warning`.
                    method: params.type === 'warning' ? 'warn' : params.type,
                    args,
                },
            })), realm?.browsingContextId ?? 'UNKNOWN', protocol_js_1.Log.EventNames.LogEntryAddedEvent);
        });
        this.#cdpTarget.cdpClient.on('Runtime.exceptionThrown', (params) => {
            // Try to find realm by `cdpSessionId` and `executionContextId`,
            // if provided.
            const realm = this.#realmStorage.findRealm({
                cdpSessionId: this.#cdpTarget.cdpSessionId,
                executionContextId: params.exceptionDetails.executionContextId,
            });
            // Try all the best to get the exception text.
            const textPromise = (async () => {
                if (!params.exceptionDetails.exception) {
                    return params.exceptionDetails.text;
                }
                if (realm === undefined) {
                    return JSON.stringify(params.exceptionDetails.exception);
                }
                return realm.stringifyObject(params.exceptionDetails.exception);
            })();
            this.#eventManager.registerPromiseEvent(textPromise.then((text) => ({
                method: protocol_js_1.Log.EventNames.LogEntryAddedEvent,
                params: {
                    level: 'error',
                    source: {
                        realm: realm?.realmId ?? 'UNKNOWN',
                        context: realm?.browsingContextId ?? 'UNKNOWN',
                    },
                    text,
                    timestamp: Math.round(params.timestamp),
                    stackTrace: getBidiStackTrace(params.exceptionDetails.stackTrace),
                    type: 'javascript',
                },
            })), realm?.browsingContextId ?? 'UNKNOWN', protocol_js_1.Log.EventNames.LogEntryAddedEvent);
        });
    }
}
exports.LogManager = LogManager;
//# sourceMappingURL=logManager.js.map