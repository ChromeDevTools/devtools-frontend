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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai = __importStar(require("chai"));
const chai_1 = require("chai");
const sinon = __importStar(require("sinon"));
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const transportStub_spec_js_1 = require("../utils/transportStub.spec.js");
const cdpConnection_js_1 = require("./cdpConnection.js");
chai.use(chai_as_promised_1.default);
const TEST_TARGET_ID = 'TargetA';
const ANOTHER_TARGET_ID = 'TargetB';
describe('CdpClient', () => {
    it(`when command is called cdpBindings should have proper values`, () => {
        const expectedMessageStr = JSON.stringify({
            id: 0,
            method: 'Target.activateTarget',
            params: {
                targetId: TEST_TARGET_ID,
            },
        });
        const mockCdpServer = new transportStub_spec_js_1.StubTransport();
        const cdpConnection = new cdpConnection_js_1.CdpConnection(mockCdpServer);
        const cdpClient = cdpConnection.browserClient();
        void cdpClient.sendCommand('Target.activateTarget', {
            targetId: TEST_TARGET_ID,
        });
        sinon.assert.calledOnceWithExactly(mockCdpServer.sendMessage, expectedMessageStr);
    });
    it(`when command is called and it's done, sendMessage promise is resolved`, async () => {
        const mockCdpServer = new transportStub_spec_js_1.StubTransport();
        const cdpConnection = new cdpConnection_js_1.CdpConnection(mockCdpServer);
        const cdpClient = cdpConnection.browserClient();
        // Send CDP command and store returned promise.
        const commandPromise = cdpClient.sendCommand('Target.activateTarget', {
            targetId: TEST_TARGET_ID,
        });
        // Verify CDP command was sent.
        sinon.assert.calledOnce(mockCdpServer.sendMessage);
        // Notify 'cdpClient' the CDP command is finished.
        await mockCdpServer.emulateIncomingMessage({ id: 0, result: {} });
        // Assert 'cdpClient' resolved message promise.
        await (0, chai_1.expect)(commandPromise).to.eventually.deep.equal({});
    });
    it(`when some command is called 2 times and it's done each command promise is resolved with proper results`, async () => {
        const mockCdpServer = new transportStub_spec_js_1.StubTransport();
        const cdpConnection = new cdpConnection_js_1.CdpConnection(mockCdpServer);
        const cdpClient = cdpConnection.browserClient();
        const expectedResult1 = {
            someResult: 1,
        };
        const expectedResult2 = {
            anotherResult: 2,
        };
        const commandResult1 = { id: 0, result: expectedResult1 };
        const commandResult2 = { id: 1, result: expectedResult2 };
        // Send 2 CDP commands and store returned promises.
        const commandPromise1 = cdpClient.sendCommand('Target.attachToTarget', {
            targetId: TEST_TARGET_ID,
        });
        const commandPromise2 = cdpClient.sendCommand('Target.attachToTarget', {
            targetId: ANOTHER_TARGET_ID,
        });
        // Verify CDP command was sent.
        sinon.assert.calledTwice(mockCdpServer.sendMessage);
        // Notify 'cdpClient' the command2 is finished.
        await mockCdpServer.emulateIncomingMessage(commandResult2);
        // Assert second message promise is resolved.
        const actualResult2 = await commandPromise2;
        // Notify 'cdpClient' the command1 is finished.
        await mockCdpServer.emulateIncomingMessage(commandResult1);
        // Assert first message promise is resolved.
        const actualResult1 = await commandPromise1;
        (0, chai_1.expect)(actualResult1).to.deep.equal(expectedResult1);
        (0, chai_1.expect)(actualResult2).to.deep.equal(expectedResult2);
    });
    it('gets event callbacks when events are received from CDP', async () => {
        const mockCdpServer = new transportStub_spec_js_1.StubTransport();
        const cdpConnection = new cdpConnection_js_1.CdpConnection(mockCdpServer);
        const cdpClient = cdpConnection.browserClient();
        // Register event callbacks.
        const genericCallback = sinon.fake();
        cdpClient.on('*', genericCallback);
        const typedCallback = sinon.fake();
        cdpClient.on('Target.attachedToTarget', typedCallback);
        // Send a CDP event.
        await mockCdpServer.emulateIncomingMessage({
            method: 'Target.attachedToTarget',
            params: { targetId: TEST_TARGET_ID },
        });
        // Verify that callbacks are called.
        sinon.assert.calledOnceWithExactly(genericCallback, 'Target.attachedToTarget', { targetId: TEST_TARGET_ID });
        genericCallback.resetHistory();
        sinon.assert.calledOnceWithExactly(typedCallback, {
            targetId: TEST_TARGET_ID,
        });
        typedCallback.resetHistory();
        // Unregister callbacks.
        cdpClient.off('*', genericCallback);
        cdpClient.off('Target.attachedToTarget', typedCallback);
        // Send another CDP event.
        await mockCdpServer.emulateIncomingMessage({
            params: { targetId: TEST_TARGET_ID },
        });
        sinon.assert.notCalled(genericCallback);
        sinon.assert.notCalled(typedCallback);
    });
    describe('sendCommand()', () => {
        it('sends raw CDP messages and returns a promise that will be resolved with the result', async () => {
            const mockCdpServer = new transportStub_spec_js_1.StubTransport();
            const cdpConnection = new cdpConnection_js_1.CdpConnection(mockCdpServer);
            const cdpClient = cdpConnection.browserClient();
            // Send CDP command and store returned promise.
            const commandPromise = cdpClient.sendCommand('Target.attachToTarget', {
                targetId: TEST_TARGET_ID,
            });
            // Verify CDP command was sent.
            sinon.assert.calledOnce(mockCdpServer.sendMessage);
            // Notify 'cdpClient' the CDP command is finished.
            await mockCdpServer.emulateIncomingMessage({
                id: 0,
                result: { targetId: TEST_TARGET_ID },
            });
            // Assert sendCommand resolved message promise.
            await (0, chai_1.expect)(commandPromise).to.eventually.deep.equal({
                targetId: TEST_TARGET_ID,
            });
        });
        it('sends raw CDP messages and returns a promise that will reject on error', async () => {
            const mockCdpServer = new transportStub_spec_js_1.StubTransport();
            const cdpConnection = new cdpConnection_js_1.CdpConnection(mockCdpServer);
            const cdpClient = cdpConnection.browserClient();
            const expectedError = {
                code: 'some error',
                message: 'something happened',
            };
            // Send CDP command and store returned promise.
            const commandPromise = cdpClient.sendCommand('Target.attachToTarget', {
                targetId: TEST_TARGET_ID,
            });
            // Verify CDP command was sent.
            sinon.assert.calledOnce(mockCdpServer.sendMessage);
            // Notify 'cdpClient' the CDP command is finished.
            await mockCdpServer.emulateIncomingMessage({
                id: 0,
                error: expectedError,
            });
            // Assert sendCommand rejects with error.
            await (0, chai_1.expect)(commandPromise).to.be.eventually.rejectedWith(expectedError);
        });
    });
});
//# sourceMappingURL=cdpClient.spec.js.map