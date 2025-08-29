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
import { type Browser, type EmptyResult, type Session } from '../../../protocol/protocol.js';
import type { CdpClient } from '../../BidiMapper.js';
import type { MapperOptionsStorage } from '../../MapperOptions.js';
import type { BrowsingContextStorage } from '../context/BrowsingContextStorage.js';
import type { UserContextStorage } from './UserContextStorage.js';
export declare class BrowserProcessor {
    #private;
    constructor(browserCdpClient: CdpClient, browsingContextStorage: BrowsingContextStorage, mapperOptionsStorage: MapperOptionsStorage, userContextStorage: UserContextStorage);
    close(): EmptyResult;
    createUserContext(params: Record<string, any>): Promise<Browser.CreateUserContextResult>;
    removeUserContext(params: Browser.RemoveUserContextParameters): Promise<EmptyResult>;
    getUserContexts(): Promise<Browser.GetUserContextsResult>;
    getClientWindows(): Promise<Browser.GetClientWindowsResult>;
}
/**
 * Proxy config parse implementation:
 * https://source.chromium.org/chromium/chromium/src/+/main:net/proxy_resolution/proxy_config.h;drc=743a82d08e59d803c94ee1b8564b8b11dd7b462f;l=107
 */
export declare function getProxyStr(proxyConfig: Session.ProxyConfiguration): string | undefined;
