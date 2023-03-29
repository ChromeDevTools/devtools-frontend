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
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const logHelper_js_1 = require("./logHelper.js");
describe('getRemoteValuesText', () => {
    it('single line input test', () => {
        const inputArgs = [{ type: 'string', value: 'line 1' }];
        const outputString = 'line 1';
        (0, chai_1.expect)((0, logHelper_js_1.getRemoteValuesText)(inputArgs, false)).to.equal(outputString);
    });
    it('multiple line input test', () => {
        const inputArgs = [
            { type: 'string', value: 'line 1' },
            { type: 'string', value: 'line 2' },
        ];
        const outputString = 'line 1\u0020line 2';
        (0, chai_1.expect)((0, logHelper_js_1.getRemoteValuesText)(inputArgs, false)).to.equal(outputString);
    });
    it('no input test', () => {
        const inputArgs = [];
        const outputString = '';
        (0, chai_1.expect)((0, logHelper_js_1.getRemoteValuesText)(inputArgs, false)).to.equal(outputString);
    });
});
//# sourceMappingURL=logHelper_getRemoteValuesText.spec.js.map