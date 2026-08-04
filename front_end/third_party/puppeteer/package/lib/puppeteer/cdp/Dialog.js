/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Dialog } from '../api/Dialog.js';
/**
 * @internal
 */
export class CdpDialog extends Dialog {
    #client;
    constructor(client, type, message, defaultValue = '') {
        super(type, message, defaultValue);
        this.#client = client;
        client.once('Page.javascriptDialogClosed', this.#onDialogClosed);
    }
    async handle(options) {
        await this.#client.send('Page.handleJavaScriptDialog', {
            accept: options.accept,
            promptText: options.text,
        });
        this.#client.off('Page.javascriptDialogClosed', this.#onDialogClosed);
    }
    #onDialogClosed = () => {
        this.handled = true;
    };
}
//# sourceMappingURL=Dialog.js.map