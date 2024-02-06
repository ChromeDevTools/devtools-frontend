"use strict";
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiDialog = void 0;
const Dialog_js_1 = require("../api/Dialog.js");
/**
 * @internal
 */
class BidiDialog extends Dialog_js_1.Dialog {
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
exports.BidiDialog = BidiDialog;
//# sourceMappingURL=Dialog.js.map