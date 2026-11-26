/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Point } from '../api/ElementHandle.js';
/**
 * @internal
 */
export interface MouseState {
    /**
     * The current position of the mouse.
     */
    position: Point;
    /**
     * The buttons that are currently being pressed.
     */
    buttons: number;
}
/**
 * @internal
 */
export declare class MouseStateTracker {
    #private;
    get position(): Point;
    get buttons(): number;
    /**
     * This is a shortcut for a typical update, commit/rollback lifecycle based on
     * the error of the action.
     */
    withTransaction(action: (update: (updates: Partial<MouseState>) => void) => Promise<unknown>): Promise<void>;
}
//# sourceMappingURL=MouseStateTracker.d.ts.map