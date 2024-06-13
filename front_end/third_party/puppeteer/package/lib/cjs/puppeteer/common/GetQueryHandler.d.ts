/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { QueryHandler } from './QueryHandler.js';
/**
 * @internal
 */
export declare function getQueryHandlerAndSelector(selector: string): {
    updatedSelector: string;
    selectorHasPseudoClasses: boolean;
    QueryHandler: typeof QueryHandler;
};
//# sourceMappingURL=GetQueryHandler.d.ts.map