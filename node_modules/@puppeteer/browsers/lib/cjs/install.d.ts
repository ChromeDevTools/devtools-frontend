/**
 * Copyright 2017 Google Inc. All rights reserved.
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
import { Browser, BrowserPlatform } from './browser-data/browser-data.js';
import { InstalledBrowser } from './Cache.js';
/**
 * @public
 */
export interface InstallOptions {
    /**
     * Determines the path to download browsers to.
     */
    cacheDir: string;
    /**
     * Determines which platform the browser will be suited for.
     *
     * @defaultValue **Auto-detected.**
     */
    platform?: BrowserPlatform;
    /**
     * Determines which browser to install.
     */
    browser: Browser;
    /**
     * Determines which buildId to download. BuildId should uniquely identify
     * binaries and they are used for caching.
     */
    buildId: string;
    /**
     * Provides information about the progress of the download.
     */
    downloadProgressCallback?: (downloadedBytes: number, totalBytes: number) => void;
    /**
     * Determines the host that will be used for downloading.
     *
     * @defaultValue Either
     *
     * - https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing or
     * - https://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central
     *
     */
    baseUrl?: string;
    /**
     * Whether to unpack and install browser archives.
     *
     * @defaultValue `true`
     */
    unpack?: boolean;
}
/**
 * @public
 */
export declare function install(options: InstallOptions & {
    unpack?: true;
}): Promise<InstalledBrowser>;
export declare function install(options: InstallOptions & {
    unpack: false;
}): Promise<string>;
/**
 * @public
 */
export interface UninstallOptions {
    /**
     * Determines the platform for the browser binary.
     *
     * @defaultValue **Auto-detected.**
     */
    platform?: BrowserPlatform;
    /**
     * The path to the root of the cache directory.
     */
    cacheDir: string;
    /**
     * Determines which browser to uninstall.
     */
    browser: Browser;
    /**
     * The browser build to uninstall
     */
    buildId: string;
}
/**
 *
 * @public
 */
export declare function uninstall(options: UninstallOptions): Promise<void>;
/**
 * @public
 */
export interface GetInstalledBrowsersOptions {
    /**
     * The path to the root of the cache directory.
     */
    cacheDir: string;
}
/**
 * Returns metadata about browsers installed in the cache directory.
 *
 * @public
 */
export declare function getInstalledBrowsers(options: GetInstalledBrowsersOptions): Promise<InstalledBrowser[]>;
/**
 * @public
 */
export declare function canDownload(options: InstallOptions): Promise<boolean>;
//# sourceMappingURL=install.d.ts.map