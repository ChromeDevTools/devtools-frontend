/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as readline from 'node:readline';
import { type Browser } from './browser-data/browser-data.js';
/**
 * @public
 */
export declare class CLI {
    #private;
    constructor(opts?: string | {
        cachePath?: string;
        scriptName?: string;
        prefixCommand?: {
            cmd: string;
            description: string;
        };
        allowCachePathOverride?: boolean;
        pinnedBrowsers?: Partial<Record<Browser, {
            buildId: string;
            skipDownload: boolean;
        }>>;
    }, rl?: readline.Interface);
    run(argv: string[]): Promise<void>;
}
/**
 * @public
 */
export declare function makeProgressCallback(browser: Browser, buildId: string): (downloadedBytes: number, totalBytes: number) => void;
//# sourceMappingURL=CLI.d.ts.map