export declare const enum MutationType {
    ADD = "ADD",
    REMOVE = "REMOVE",
    TEXT_UPDATE = "TEXT_UPDATE"
}
export declare const TEXT_NODE = "TEXT_NODE";
interface ExpectedMutation {
    max?: number;
    target: keyof HTMLElementTagNameMap | typeof TEXT_NODE;
    type?: MutationType;
}
/**
 * Check that a given component causes the expected amount of mutations. Useful
 * when testing a component to ensure it's updating the DOM performantly and not
 * unnecessarily.
 */
export declare const withMutations: <T extends Node>(expectedMutations: ExpectedMutation[], shadowRoot: T, functionToObserve: (shadowRoot: T) => void) => Promise<void>;
/**
 * Ensure that a code block runs whilst making no mutations to the DOM. Given an
 * element and a callback, it will execute th e callback function and ensure
 * afterwards that a MutatonObserver saw no changes.
 */
export declare const withNoMutations: <T extends Node>(element: T, fn: (shadowRoot: T) => void) => Promise<void>;
export declare const someMutations: <T extends Node>(element: T) => Promise<void>;
export {};
