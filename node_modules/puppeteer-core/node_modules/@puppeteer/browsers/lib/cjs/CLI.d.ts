/**
 * Copyright 2023 Google Inc. All rights reserved.
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
/// <reference types="node" />
import * as readline from 'readline';
import { Browser } from './browser-data/browser-data.js';
/**
 * @public
 */
export declare class CLI {
    #private;
    constructor(cachePath?: string, rl?: readline.Interface);
    run(argv: string[]): Promise<void>;
}
/**
 * @public
 */
export declare function makeProgressCallback(browser: Browser, buildId: string): (downloadedBytes: number, totalBytes: number) => void;
//# sourceMappingURL=CLI.d.ts.map