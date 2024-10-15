/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type FS from 'fs';
import type Path from 'path';
import type { ScreenRecorder } from './node/ScreenRecorder.js';
/**
 * @internal
 */
export declare const isNode: boolean;
export interface EnvironmentDependencies {
    fs: typeof FS;
    path: typeof Path;
    ScreenRecorder: typeof ScreenRecorder;
}
/**
 * Holder for environment dependencies. These dependencies cannot
 * be used during the module instantiation.
 */
export declare const environment: {
    value: EnvironmentDependencies;
};
//# sourceMappingURL=environment.d.ts.map