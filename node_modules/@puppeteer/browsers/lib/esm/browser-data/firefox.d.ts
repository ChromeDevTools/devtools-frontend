/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserPlatform, type ProfileOptions } from './types.js';
export declare function resolveDownloadUrl(platform: BrowserPlatform, buildId: string, baseUrl?: string): string;
export declare function resolveDownloadPath(platform: BrowserPlatform, buildId: string): string[];
export declare function relativeExecutablePath(platform: BrowserPlatform, _buildId: string): string;
export declare function resolveBuildId(channel?: 'FIREFOX_NIGHTLY'): Promise<string>;
export declare function createProfile(options: ProfileOptions): Promise<void>;
//# sourceMappingURL=firefox.d.ts.map