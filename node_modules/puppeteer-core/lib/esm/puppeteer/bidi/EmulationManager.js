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
            viewport,
        });
    }
}
//# sourceMappingURL=EmulationManager.js.map