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
const deferred_js_1 = require("./deferred.js");
describe('Deferred', () => {
    describe('isFinished', () => {
        it('resolve', async () => {
            const deferred = new deferred_js_1.Deferred();
            const deferredThen = deferred.then((v) => v);
            deferred.catch((e) => {
                throw e;
            });
            (0, chai_1.expect)(deferred.isFinished).to.be.false;
            deferred.resolve('done');
            (0, chai_1.expect)(deferred.isFinished).to.be.true;
            await (0, chai_1.expect)(deferredThen).to.eventually.equal('done');
        });
        it('reject', async () => {
            const deferred = new deferred_js_1.Deferred();
            const deferredThen = deferred.then(() => { });
            const deferredCatch = deferred.catch((e) => e);
            (0, chai_1.expect)(deferred.isFinished).to.be.false;
            deferred.reject('some error');
            (0, chai_1.expect)(deferred.isFinished).to.be.true;
            await (0, chai_1.expect)(deferredThen).to.eventually.be.rejectedWith('some error');
            await (0, chai_1.expect)(deferredCatch).to.eventually.equal('some error');
        });
    });
});
//# sourceMappingURL=deferred.spec.js.map