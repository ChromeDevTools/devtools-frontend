/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @internal
 */
export class MouseStateTracker {
    #_state = {
        position: { x: 0, y: 0 },
        buttons: 0,
    };
    get #state() {
        return Object.assign({ ...this.#_state }, ...this.#transactions);
    }
    get position() {
        return this.#state.position;
    }
    get buttons() {
        return this.#state.buttons;
    }
    // Transactions can run in parallel, so we store each of them in this array.
    #transactions = [];
    #createTransaction() {
        const transaction = {};
        this.#transactions.push(transaction);
        const popTransaction = () => {
            this.#transactions.splice(this.#transactions.indexOf(transaction), 1);
        };
        return {
            update: (updates) => {
                Object.assign(transaction, updates);
            },
            commit: () => {
                this.#_state = { ...this.#_state, ...transaction };
                popTransaction();
            },
            rollback: popTransaction,
        };
    }
    /**
     * This is a shortcut for a typical update, commit/rollback lifecycle based on
     * the error of the action.
     */
    async withTransaction(action) {
        const { update, commit, rollback } = this.#createTransaction();
        try {
            await action(update);
            commit();
        }
        catch (error) {
            rollback();
            throw error;
        }
    }
}
//# sourceMappingURL=MouseStateTracker.js.map