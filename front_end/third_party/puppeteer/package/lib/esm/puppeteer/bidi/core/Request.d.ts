/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { EventEmitter } from '../../common/EventEmitter.js';
import { disposeSymbol } from '../../util/disposable.js';
import type { BrowsingContext } from './BrowsingContext.js';
/**
 * @internal
 */
export declare class Request extends EventEmitter<{
    /** Emitted when the request is redirected. */
    redirect: Request;
    /** Emitted when the request succeeds. */
    success: Bidi.Network.ResponseData;
    /** Emitted when the request fails. */
    error: string;
}> {
    #private;
    static from(browsingContext: BrowsingContext, event: Bidi.Network.BeforeRequestSentParameters): Request;
    private constructor();
    get disposed(): boolean;
    get error(): string | undefined;
    get headers(): Bidi.Network.Header[];
    get id(): string;
    get initiator(): Bidi.Network.Initiator;
    get method(): string;
    get navigation(): string | undefined;
    get redirect(): Request | undefined;
    get response(): Bidi.Network.ResponseData | undefined;
    get url(): string;
    private dispose;
    [disposeSymbol](): void;
}
//# sourceMappingURL=Request.d.ts.map