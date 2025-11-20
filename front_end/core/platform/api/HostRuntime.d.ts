/**
 * Provides abstractions for host features that require different implementations depending
 * on whether DevTools runs in the browser or Node.js
 */
export interface HostRuntime {
    createWorker(url: string): Worker;
}
/**
 * Abstracts away the differences between browser web workers and Node.js worker threads.
 */
export interface Worker {
    dispose?(): void;
}
