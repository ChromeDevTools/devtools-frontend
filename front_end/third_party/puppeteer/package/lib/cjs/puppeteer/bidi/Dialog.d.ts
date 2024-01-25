/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { Dialog } from '../api/Dialog.js';
import type { BrowsingContext } from './BrowsingContext.js';
/**
 * @internal
 */
export declare class BidiDialog extends Dialog {
    #private;
    /**
     * @internal
     */
    constructor(context: BrowsingContext, type: Bidi.BrowsingContext.UserPromptOpenedParameters['type'], message: string, defaultValue?: string);
    /**
     * @internal
     */
    handle(options: {
        accept: boolean;
        text?: string;
    }): Promise<void>;
}
//# sourceMappingURL=Dialog.d.ts.map