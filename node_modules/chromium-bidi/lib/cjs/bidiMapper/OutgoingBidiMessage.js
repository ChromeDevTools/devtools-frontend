"use strict";
/**
 * Copyright 2021 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
exports.OutgoingBidiMessage = void 0;
class OutgoingBidiMessage {
    #message;
    #channel;
    constructor(message, channel) {
        this.#message = message;
        this.#channel = channel;
    }
    static async createFromPromise(messagePromise, channel) {
        return messagePromise.then((message) => new OutgoingBidiMessage(message, channel));
    }
    static createResolved(message, channel) {
        return Promise.resolve(new OutgoingBidiMessage(message, channel));
    }
    get message() {
        return this.#message;
    }
    get channel() {
        return this.#channel;
    }
}
exports.OutgoingBidiMessage = OutgoingBidiMessage;
//# sourceMappingURL=OutgoingBidiMessage.js.map