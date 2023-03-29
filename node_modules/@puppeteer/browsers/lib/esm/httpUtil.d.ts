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
/// <reference types="node" />
import * as http from 'http';
import { URL } from 'url';
export declare function headHttpRequest(url: URL): Promise<boolean>;
export declare function httpRequest(url: URL, method: string, response: (x: http.IncomingMessage) => void, keepAlive?: boolean): http.ClientRequest;
/**
 * @internal
 */
export declare function downloadFile(url: URL, destinationPath: string, progressCallback?: (downloadedBytes: number, totalBytes: number) => void): Promise<void>;
//# sourceMappingURL=httpUtil.d.ts.map