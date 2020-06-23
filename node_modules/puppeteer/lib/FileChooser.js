"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
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
exports.FileChooser = void 0;
const helper_1 = require("./helper");
class FileChooser {
    constructor(element, event) {
        this._handled = false;
        this._element = element;
        this._multiple = event.mode !== 'selectSingle';
    }
    isMultiple() {
        return this._multiple;
    }
    async accept(filePaths) {
        helper_1.assert(!this._handled, 'Cannot accept FileChooser which is already handled!');
        this._handled = true;
        await this._element.uploadFile(...filePaths);
    }
    async cancel() {
        helper_1.assert(!this._handled, 'Cannot cancel FileChooser which is already handled!');
        this._handled = true;
    }
}
exports.FileChooser = FileChooser;
