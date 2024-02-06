/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { BidiRealm } from './Realm.js';
/**
 * @internal
 */
export declare function releaseReference(client: BidiRealm, remoteReference: Bidi.Script.RemoteReference): Promise<void>;
/**
 * @internal
 */
export declare function createEvaluationError(details: Bidi.Script.ExceptionDetails): unknown;
//# sourceMappingURL=util.d.ts.map