/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @internal
 */
export const isNode = !!(typeof process !== 'undefined' && process.version);
/**
 * Holder for environment dependencies. These dependencies cannot
 * be used during the module instantiation.
 */
export const environment = {
    value: {
        followSymlinks: true,
        ScreenRecorder: class {
            constructor() {
                throw new Error('ScreenRecorder is not available in this environment');
            }
        },
        readFile: (() => {
            throw new Error('readFile is not available in this environment');
        }),
        writeFile: () => {
            throw new Error('writeFile is not available in this environment');
        },
        openFileForWriting: () => {
            throw new Error('openFileForWriting is not available in this environment');
        },
        createWriteStream: () => {
            throw new Error('createWriteStream is not available in this environment');
        },
        mkdir: () => {
            throw new Error('mkdir is not available in this environment');
        },
    },
};
//# sourceMappingURL=environment.js.map