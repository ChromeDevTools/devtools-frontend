/**
 * @internal
 */
export class EmulationManager {
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
//# sourceMappingURL=EmulationManager.js.map