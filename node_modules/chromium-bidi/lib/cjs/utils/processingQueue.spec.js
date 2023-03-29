"use strict";
/**
 * Copyright 2022 Google LLC.
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = __importStar(require("sinon"));
const deferred_js_1 = require("./deferred.js");
const processingQueue_js_1 = require("./processingQueue.js");
describe('ProcessingQueue', () => {
    it('should wait and call processor in order', async () => {
        const processor = sinon.stub().returns(Promise.resolve());
        const queue = new processingQueue_js_1.ProcessingQueue(processor);
        const deferred1 = new deferred_js_1.Deferred();
        const deferred2 = new deferred_js_1.Deferred();
        const deferred3 = new deferred_js_1.Deferred();
        queue.add(deferred1);
        await wait(1);
        sinon.assert.notCalled(processor);
        queue.add(deferred2);
        queue.add(deferred3);
        await wait(1);
        sinon.assert.notCalled(processor);
        deferred3.resolve(3);
        deferred2.resolve(2);
        await wait(1);
        sinon.assert.notCalled(processor);
        deferred1.resolve(1);
        await wait(1);
        const processedValues = processor.getCalls().map((c) => c.firstArg);
        (0, chai_1.expect)(processedValues).to.deep.equal([1, 2, 3]);
    });
    it('rejects should not stop processing', async () => {
        const error = new Error('Processor reject');
        const processor = sinon.stub().returns(Promise.reject(error));
        const mycatch = sinon.spy();
        const queue = new processingQueue_js_1.ProcessingQueue(processor, mycatch);
        const deferred1 = new deferred_js_1.Deferred();
        const deferred2 = new deferred_js_1.Deferred();
        queue.add(deferred1);
        queue.add(deferred2);
        deferred1.reject(1);
        deferred2.resolve(2);
        await wait(1);
        // Assert processor was called with successful value.
        sinon.assert.calledOnceWithExactly(processor, 2);
        // Assert `_catch` was called for waiting entry and processor call.
        const processedValues = mycatch.getCalls().map((c) => c.firstArg);
        (0, chai_1.expect)(processedValues).to.deep.equal([1, error]);
    });
    it('processing starts over when new values are added', async () => {
        const processor = sinon.stub().returns(Promise.resolve());
        const queue = new processingQueue_js_1.ProcessingQueue(processor);
        queue.add(Promise.resolve(1));
        await wait(1);
        sinon.assert.calledOnceWithExactly(processor, 1);
        processor.reset();
        queue.add(Promise.resolve(2));
        await wait(1);
        sinon.assert.calledOnceWithExactly(processor, 2);
        const processedValues = processor.getCalls().map((c) => c.firstArg);
        (0, chai_1.expect)(processedValues).to.deep.equal([2]);
    });
});
function wait(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}
//# sourceMappingURL=processingQueue.spec.js.map