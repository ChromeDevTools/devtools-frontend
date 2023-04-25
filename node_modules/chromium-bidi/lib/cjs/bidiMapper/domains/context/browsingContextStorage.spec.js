"use strict";
/**
 * Copyright 2023 Google LLC.
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
const chai_1 = require("chai");
const browsingContextStorage_1 = require("./browsingContextStorage");
describe('BrowsingContextStorage', () => {
    let browsingContextStorage;
    beforeEach(() => {
        browsingContextStorage = new browsingContextStorage_1.BrowsingContextStorage();
    });
    it('initial state', () => {
        (0, chai_1.expect)(browsingContextStorage.getAllContexts()).to.be.empty;
        (0, chai_1.expect)(browsingContextStorage.getTopLevelContexts()).to.be.empty;
    });
    describe('find top-level context ID', () => {
        it('top-level context', () => {
            (0, chai_1.expect)(browsingContextStorage.findTopLevelContextId(null)).to.be.null;
        });
    });
});
//# sourceMappingURL=browsingContextStorage.spec.js.map