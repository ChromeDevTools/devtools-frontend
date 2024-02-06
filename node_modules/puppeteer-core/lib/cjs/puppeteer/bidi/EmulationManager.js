"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulationManager = void 0;
/**
 * @internal
 */
class EmulationManager {
    #browsingContext;
    constructor(browsingContext) {
        this.#browsingContext = browsingContext;
    }
    async emulateViewport(viewport) {
        await this.#browsingContext.connection.send('browsingContext.setViewport', {
            context: this.#browsingContext.id,
            viewport: viewport.width && viewport.height
                ? {
                    width: viewport.width,
                    height: viewport.height,
                }
                : null,
            devicePixelRatio: viewport.deviceScaleFactor
                ? viewport.deviceScaleFactor
                : null,
        });
    }
}
exports.EmulationManager = EmulationManager;
//# sourceMappingURL=EmulationManager.js.map