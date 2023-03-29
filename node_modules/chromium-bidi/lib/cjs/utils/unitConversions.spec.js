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
const unitConversions_js_1 = require("./unitConversions.js");
describe('unit conversions', () => {
    it('inches from cm', () => {
        (0, chai_1.expect)((0, unitConversions_js_1.inchesFromCm)(2.54)).to.equal(1);
        (0, chai_1.expect)((0, unitConversions_js_1.inchesFromCm)(27.94)).to.equal(11);
    });
});
//# sourceMappingURL=unitConversions.spec.js.map