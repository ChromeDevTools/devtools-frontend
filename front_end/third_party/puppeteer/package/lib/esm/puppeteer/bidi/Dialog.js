/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Dialog } from '../api/Dialog.js';
/**
 * @internal
 */
export class BidiDialog extends Dialog {
    #context;
    /**
     * @internal
     */
    constructor(context, type, message, defaultValue) {
        super(type, message, defaultValue);
        this.#context = context;
    }
    /**
     * @internal
     */
    async handle(options) {
        await this.#context.connection.send('browsingContext.handleUserPrompt', {
            context: this.#context.id,
            accept: options.accept,
            userText: options.text,
        });
    }
}
//# sourceMappingURL=Dialog.js.map