/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserPlatform } from './types.js';
export declare function resolveDownloadUrl(platform: BrowserPlatform, buildId: string, baseUrl?: string): string;
export declare function resolveDownloadPath(platform: BrowserPlatform, buildId: string): string[];
export declare function relativeExecutablePath(platform: BrowserPlatform, _buildId: string): string;
export declare function resolveBuildId(platform: BrowserPlatform): Promise<string>;
//# sourceMappingURL=chromium.d.ts.map