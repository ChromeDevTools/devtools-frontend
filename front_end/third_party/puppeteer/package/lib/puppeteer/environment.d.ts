/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FileHandle } from 'node:fs/promises';
import type Path from 'node:path';
import type { Writable } from 'node:stream';
import type { debuglog } from 'node:util';
import type { ScreenRecorder } from './node/ScreenRecorder.js';
/**
 * @internal
 */
export declare const isNode: boolean;
export interface EnvironmentDependencies {
    path?: typeof Path;
    ScreenRecorder: typeof ScreenRecorder;
    debuglog?: typeof debuglog;
    followSymlinks: boolean;
    readFile: {
        (path: string, encoding: 'utf8' | 'ascii'): Promise<string>;
        (path: string): Promise<Uint8Array>;
    };
    writeFile: (path: string, data: Uint8Array | string) => Promise<void>;
    openFileForWriting: (path: string) => Promise<FileHandle>;
    createWriteStream: (path: string, options?: {
        encoding?: BufferEncoding;
        overwrite?: boolean;
    }) => Writable;
    mkdir: (path: string, options?: {
        recursive?: boolean;
    }) => Promise<void>;
}
/**
 * Holder for environment dependencies. These dependencies cannot
 * be used during the module instantiation.
 */
export declare const environment: {
    value: EnvironmentDependencies;
};
//# sourceMappingURL=environment.d.ts.map