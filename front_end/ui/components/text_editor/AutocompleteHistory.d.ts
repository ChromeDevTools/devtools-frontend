import type * as Common from '../../../core/common/common.js';
export declare class AutocompleteHistory {
    #private;
    /**
     * Creates a new settings-backed history. The class assumes it has sole
     * ownership of the setting.
     */
    constructor(setting: Common.Settings.Setting<string[]>);
    clear(): void;
    length(): number;
    /**
     * Pushes a committed text into the history.
     */
    pushHistoryItem(text: string): void;
    previous(currentText: string): string | undefined;
    next(): string | undefined;
    /** Returns a de-duplicated list of history entries that start with the specified prefix */
    matchingEntries(prefix: string, limit?: number): Set<string>;
}
