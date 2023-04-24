import { CDPSession } from './Connection.js';
import { Viewport } from './PuppeteerViewport.js';
/**
 * @internal
 */
export declare class EmulationManager {
    #private;
    constructor(client: CDPSession);
    emulateViewport(viewport: Viewport): Promise<boolean>;
}
//# sourceMappingURL=EmulationManager.d.ts.map