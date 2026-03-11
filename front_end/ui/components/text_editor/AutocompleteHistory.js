// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class AutocompleteHistory {
    static #historySize = 300;
    #setting;
    /**
     * The data mirrors the setting. We have the mirror for 2 reasons:
     *   1) The setting is size limited
     *   2) We track the user's current input, even though it's not committed yet.
     */
    #data = [];
    /** 1-based entry in the history stack. */
    #historyOffset = 1;
    #uncommittedIsTop = false;
    /**
     * Tracks session-local edits made to history entries during navigation.
     * Maps history index to edited text. Cleared when a new command is committed.
     */
    #editedEntries = new Map();
    /**
     * The prefix used for filtering history during navigation (zsh-style).
     * Set on first navigation when user has typed something.
     */
    #searchPrefix = '';
    /**
     * Stack of history indices visited during filtered navigation.
     * Used to navigate forward through the same filtered entries.
     */
    #filteredIndices = [];
    /**
     * Creates a new settings-backed history. The class assumes it has sole
     * ownership of the setting.
     */
    constructor(setting) {
        this.#setting = setting;
        this.#data = this.#setting.get();
    }
    clear() {
        this.#data = [];
        this.#setting.set([]);
        this.#historyOffset = 1;
        this.#editedEntries.clear();
        this.#searchPrefix = '';
        this.#filteredIndices = [];
    }
    length() {
        return this.#data.length;
    }
    /**
     * Pushes a committed text into the history.
     */
    pushHistoryItem(text) {
        if (this.#uncommittedIsTop) {
            this.#data.pop();
            this.#uncommittedIsTop = false;
        }
        this.#historyOffset = 1;
        this.#editedEntries.clear();
        this.#searchPrefix = '';
        this.#filteredIndices = [];
        if (text !== this.#currentHistoryItem()) {
            this.#data.push(text);
        }
        this.#store();
    }
    /**
     * Pushes the current (uncommitted) text into the history.
     */
    #pushCurrentText(currentText) {
        if (this.#uncommittedIsTop) {
            this.#data.pop();
        } // Throw away obsolete uncommitted text.
        this.#uncommittedIsTop = true;
        this.#data.push(currentText);
    }
    previous(currentText) {
        if (this.#historyOffset > this.#data.length) {
            return undefined;
        }
        currentText = currentText ?? '';
        if (this.#historyOffset === 1) {
            this.#pushCurrentText(currentText);
            this.#filteredIndices = [];
            this.#searchPrefix = currentText;
        }
        else {
            // Save edits made to history entries at non-uncommitted positions.
            // #saveCurrentEdit() compares against #currentHistoryItem() and no-ops for
            // pure navigation.
            this.#saveCurrentEdit(currentText);
        }
        // If no prefix filter, use simple sequential navigation
        if (this.#searchPrefix.length === 0) {
            ++this.#historyOffset;
            return this.#currentHistoryItem();
        }
        // Find the next matching entry for prefix-filtered navigation
        const result = this.#findNextMatch();
        if (!result) {
            // On initial navigation with a non-empty prefix and no matches, fall back to
            // unfiltered history navigation.
            if (this.#historyOffset === 1) {
                this.#searchPrefix = '';
                ++this.#historyOffset;
                return this.#currentHistoryItem();
            }
            return undefined;
        }
        this.#filteredIndices.push(result.index);
        this.#historyOffset = this.#data.length - result.index;
        return result.value;
    }
    /**
     * Finds the next history entry that matches the search prefix.
     * Returns undefined if no more matches are found.
     */
    #findNextMatch() {
        // Start searching from the current position
        const startIndex = this.#data.length - this.#historyOffset - 1;
        for (let i = startIndex; i >= 0; --i) {
            const storedValue = this.#data[i];
            if (storedValue.startsWith(this.#searchPrefix)) {
                const value = this.#editedEntries.get(i) ?? storedValue;
                return { index: i, value };
            }
        }
        return undefined;
    }
    /**
     * Saves the current text as an edit if it differs from the current history item
     * (which may already have edits from a previous navigation).
     * Only saves non-empty edits to avoid issues with navigation-only calls.
     */
    #saveCurrentEdit(text) {
        const index = this.#data.length - this.#historyOffset;
        const currentValue = this.#currentHistoryItem();
        if (text === currentValue) {
            return;
        }
        const original = this.#data[index];
        if (text !== original && text.length > 0) {
            this.#editedEntries.set(index, text);
        }
        else {
            // Remove edit if text was restored to original (or emptied)
            this.#editedEntries.delete(index);
        }
    }
    next(currentText) {
        if (this.#historyOffset === 1) {
            return undefined;
        }
        currentText = currentText ?? this.#currentHistoryItem() ?? '';
        this.#saveCurrentEdit(currentText);
        // If no prefix filter was used, use simple sequential navigation
        if (this.#searchPrefix.length === 0) {
            --this.#historyOffset;
            return this.#currentHistoryItem();
        }
        // Pop the current position from the filtered indices stack
        this.#filteredIndices.pop();
        if (this.#filteredIndices.length === 0) {
            // No more filtered entries - return to the uncommitted text
            this.#historyOffset = 1;
            return this.#currentHistoryItem();
        }
        // Move to the previous filtered position
        const prevIndex = this.#filteredIndices[this.#filteredIndices.length - 1];
        this.#historyOffset = this.#data.length - prevIndex;
        return this.#currentHistoryItem();
    }
    /** Returns a de-duplicated list of history entries that start with the specified prefix */
    matchingEntries(prefix, limit = 50) {
        const result = new Set();
        for (let i = this.#data.length - 1; i >= 0 && result.size < limit; --i) {
            const entry = this.#data[i];
            if (entry.startsWith(prefix)) {
                result.add(entry);
            }
        }
        return result;
    }
    #currentHistoryItem() {
        const index = this.#data.length - this.#historyOffset;
        // Return edited version if available, otherwise return original
        return this.#editedEntries.get(index) ?? this.#data[index];
    }
    #store() {
        this.#setting.set(this.#data.slice(-AutocompleteHistory.#historySize));
    }
}
//# sourceMappingURL=AutocompleteHistory.js.map