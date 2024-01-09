/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Viewport } from '../common/Viewport.js';
import type { BrowsingContext } from './BrowsingContext.js';
/**
 * @internal
 */
export declare class EmulationManager {
    #private;
    constructor(browsingContext: BrowsingContext);
    emulateViewport(viewport: Viewport): Promise<void>;
}
//# sourceMappingURL=EmulationManager.d.ts.map