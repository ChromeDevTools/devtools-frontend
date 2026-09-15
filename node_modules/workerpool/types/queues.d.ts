/**
 * FIFO Queue implementation
 * @template [T=any]
 * @constructor
 * @implements {import('./types').TaskQueue<T>}
 */
export function FIFOQueue<T = any>(): void;
export class FIFOQueue<T = any> {
    /** @type {import('./types').Task<T>[]} */
    tasks: import("./types").Task<T>[];
    /**
     * @param {import('./types').Task<T>} task
     * @returns {void}
     */
    push(task: import("./types").Task<T>): void;
    /**
     * @returns {import('./types').Task<T> | undefined}
     */
    pop(): import("./types").Task<T> | undefined;
    /**
     * @returns {number}
     */
    size(): number;
    /**
     * @param {import('./types').Task<T>} task
     * @returns {boolean}
     */
    contains(task: import("./types").Task<T>): boolean;
    /**
     * @returns {void}
     */
    clear(): void;
}
/**
 * LIFO Queue implementation
 * @template [T=any]
 * @constructor
 * @implements {import('./types').TaskQueue<T>}
 */
export function LIFOQueue<T = any>(): void;
export class LIFOQueue<T = any> {
    /** @type {import('./types').Task<T>[]} */
    tasks: import("./types").Task<T>[];
    /**
     * @param {import('./types').Task<T>} task
     * @returns {void}
     */
    push(task: import("./types").Task<T>): void;
    /**
     * @returns {import('./types').Task<T> | undefined}
     */
    pop(): import("./types").Task<T> | undefined;
    /**
     * @returns {number}
     */
    size(): number;
    /**
     * @param {import('./types').Task<T>} task
     * @returns {boolean}
     */
    contains(task: import("./types").Task<T>): boolean;
    /**
     * @returns {void}
     */
    clear(): void;
}
