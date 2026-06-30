/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type FS from 'node:fs';
import type Path from 'node:path';
import type { debuglog } from 'node:util';
import type { ScreenRecorder } from './node/ScreenRecorder.js';
/**
 * @internal
 */
export declare const isNode: boolean;
export interface EnvironmentDependencies {
    fs: typeof FS;
    path?: typeof Path;
    ScreenRecorder: typeof ScreenRecorder;
    debuglog?: typeof debuglog;
}
/**
 * Holder for environment dependencies. These dependencies cannot
 * be used during the module instantiation.
 */
export declare const environment: {
    value: EnvironmentDependencies;
};
//# sourceMappingURL=environment.d.ts.map