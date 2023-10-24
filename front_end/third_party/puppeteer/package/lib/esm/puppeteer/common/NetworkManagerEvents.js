/**
 * Copyright 2022 Google Inc. All rights reserved.
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
 * We use symbols to prevent any external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export var NetworkManagerEvent;
(function (NetworkManagerEvent) {
    NetworkManagerEvent.Request = Symbol('NetworkManager.Request');
    NetworkManagerEvent.RequestServedFromCache = Symbol('NetworkManager.RequestServedFromCache');
    NetworkManagerEvent.Response = Symbol('NetworkManager.Response');
    NetworkManagerEvent.RequestFailed = Symbol('NetworkManager.RequestFailed');
    NetworkManagerEvent.RequestFinished = Symbol('NetworkManager.RequestFinished');
})(NetworkManagerEvent || (NetworkManagerEvent = {}));
//# sourceMappingURL=NetworkManagerEvents.js.map