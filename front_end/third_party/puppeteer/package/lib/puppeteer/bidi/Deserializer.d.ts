/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'webdriver-bidi-protocol';
import type { Logger } from '../common/Debug.js';
/**
 * @internal
 */
export declare class BidiDeserializer {
    #private;
    static deserialize(result: Bidi.Script.RemoteValue, logger?: Logger): any;
}
//# sourceMappingURL=Deserializer.d.ts.map