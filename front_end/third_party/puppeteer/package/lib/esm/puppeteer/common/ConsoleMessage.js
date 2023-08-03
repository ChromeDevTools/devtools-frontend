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
/**
 * ConsoleMessage objects are dispatched by page via the 'console' event.
 * @public
 */
export class ConsoleMessage {
    #type;
    #text;
    #args;
    #stackTraceLocations;
    /**
     * @public
     */
    constructor(type, text, args, stackTraceLocations) {
        this.#type = type;
        this.#text = text;
        this.#args = args;
        this.#stackTraceLocations = stackTraceLocations;
    }
    /**
     * The type of the console message.
     */
    type() {
        return this.#type;
    }
    /**
     * The text of the console message.
     */
    text() {
        return this.#text;
    }
    /**
     * An array of arguments passed to the console.
     */
    args() {
        return this.#args;
    }
    /**
     * The location of the console message.
     */
    location() {
        return this.#stackTraceLocations[0] ?? {};
    }
    /**
     * The array of locations on the stack of the console message.
     */
    stackTrace() {
        return this.#stackTraceLocations;
    }
}
//# sourceMappingURL=ConsoleMessage.js.map