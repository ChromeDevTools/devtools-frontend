"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const helper_1 = require("./helper");
/* TODO(jacktfranklin): protocol.d.ts defines this
 * so let's ditch this and avoid the duplication
 */
var DialogType;
(function (DialogType) {
    DialogType["Alert"] = "alert";
    DialogType["BeforeUnload"] = "beforeunload";
    DialogType["Confirm"] = "confirm";
    DialogType["Prompt"] = "prompt";
})(DialogType = exports.DialogType || (exports.DialogType = {}));
class Dialog {
    constructor(client, type, message, defaultValue = '') {
        this._handled = false;
        this._client = client;
        this._type = type;
        this._message = message;
        this._defaultValue = defaultValue;
    }
    type() {
        return this._type;
    }
    message() {
        return this._message;
    }
    defaultValue() {
        return this._defaultValue;
    }
    async accept(promptText) {
        helper_1.assert(!this._handled, 'Cannot accept dialog which is already handled!');
        this._handled = true;
        await this._client.send('Page.handleJavaScriptDialog', {
            accept: true,
            promptText: promptText
        });
    }
    async dismiss() {
        helper_1.assert(!this._handled, 'Cannot dismiss dialog which is already handled!');
        this._handled = true;
        await this._client.send('Page.handleJavaScriptDialog', {
            accept: false
        });
    }
}
exports.Dialog = Dialog;
Dialog.Type = DialogType;
