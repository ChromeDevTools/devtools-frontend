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
const chai = __importStar(require("chai"));
const DefaultMap_js_1 = require("./DefaultMap.js");
const expect = chai.expect;
describe('DefaultMap', () => {
    it('returns the default value when key does not exist', () => {
        const defaultValue = 42;
        const cutenessMap = new DefaultMap_js_1.DefaultMap(() => defaultValue, [['dog', 100]]);
        expect(cutenessMap.get('dog')).to.deep.equal(100);
        expect(cutenessMap.get('cat')).to.deep.equal(defaultValue);
        expect(Array.from(cutenessMap.keys())).to.deep.equal(['dog', 'cat']);
        expect(Array.from(cutenessMap.values())).to.deep.equal([100, defaultValue]);
    });
    it('sets and gets properly', () => {
        const cutenessMap = new DefaultMap_js_1.DefaultMap(() => 0);
        cutenessMap.set('cat', 50);
        expect(cutenessMap.get('cat')).to.deep.equal(50);
        expect(Array.from(cutenessMap.keys())).to.deep.equal(['cat']);
        expect(Array.from(cutenessMap.values())).to.deep.equal([50]);
    });
});
//# sourceMappingURL=DefaultMap.spec.js.map