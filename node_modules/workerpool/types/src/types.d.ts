export type WorkerArg = {
    /**
     * The `forkArgs` option of this pool
     */
    forkArgs?: string[] | undefined;
    /**
     * The `forkOpts` option of this pool
     */
    forkOpts?: any;
    /**
     * The `workerOpts` option of this pool
     */
    workerOpts?: WorkerOptions | undefined;
    /**
     * The `workerThreadOpts` option of this pool
     */
    workerThreadOpts?: any;
    /**
     * The `script` option of this pool
     */
    script?: string | undefined;
};
export type Resolver = {
    /**
     * - The promise object
     */
    promise: Promise<any>;
    /**
     * - Function to resolve the promise
     */
    resolve: Function;
    /**
     * - Function to reject the promise
     */
    reject: Function;
};
export type Task<T = any> = {
    /**
     * - The method name or function to execute
     */
    method: string | Function;
    /**
     * - Parameters to pass to the method
     */
    params?: any[] | undefined;
    /**
     * - Promise resolver for the task result
     */
    resolver: Resolver;
    /**
     * - Timeout value for the task
     */
    timeout: number | null;
    /**
     * - Execution options
     */
    options?: ExecOptions<T> | undefined;
};
export type TaskQueue<T = any> = {
    /**
     * - Add a task to the queue
     */
    push: (task: Task<T>) => void;
    /**
     * - Remove and return the next task
     */
    pop: () => Task<T> | undefined;
    /**
     * - Get the current queue size
     */
    size: () => number;
    /**
     * - Check if the task is in the queue
     */
    contains: (task: Task<T>) => boolean;
    /**
     * - Clear all tasks from the queue
     */
    clear: () => void;
};
export type WorkerPoolOptions = {
    /**
     * The minimum number of workers that must be initialized and kept available. Setting this to `'max'` will create `maxWorkers` default workers
     */
    minWorkers?: number | "max" | undefined;
    /**
     * The default number of maxWorkers is the number of CPU's minus one. When the number of CPU's could not be determined (for example in older browsers), `maxWorkers` is set to 3.
     */
    maxWorkers?: number | undefined;
    /**
     * The maximum number of tasks allowed to be queued. Can be used to prevent running out of memory. If the maximum is exceeded, adding a new task will throw an error. The default value is `Infinity`.
     */
    maxQueueSize?: number | undefined;
    /**
     * - In case of `'auto'` (default), workerpool will automatically pick a suitable type of worker: when in a browser environment, `'web'` will be used. When in a node.js environment, `worker_threads` will be used if available (Node.js >= 11.7.0), else `child_process` will be used.
     * - In case of `'web'`, a Web Worker will be used. Only available in a browser environment.
     * - In case of `'process'`, `child_process` will be used. Only available in a node.js environment.
     * - In case of `'thread'`, `worker_threads` will be used. If `worker_threads` are not available, an error is thrown. Only available in a node.js environment.
     */
    workerType?: "auto" | "web" | "process" | "thread" | undefined;
    /**
     * - Queue scheduling strategy
     * - In case of `'fifo'` (default), tasks are executed in the order they are added (first in, first out).
     * - In case of `'lifo'`, tasks are executed in reverse order (last in, first out).
     * - A custom queue object can be provided as well, as long as it implements the `TaskQueue` interface.
     */
    queueStrategy?: TaskQueue<any> | "fifo" | "lifo" | undefined;
    /**
     * The path to the worker script. By default, an internal worker script is used that can be used in combination with `pool.exec()`, `pool.proxy()` and `pool.worker()`. A custom worker script can be used to create a pool of workers that are initialized with a custom script. See the documentation for more information and examples.
     */
    script?: string | undefined;
    /**
     * The timeout in milliseconds to wait for a worker to clean up it's resources on termination before stopping it forcefully. Default value is `1000`.
     */
    workerTerminateTimeout?: number | undefined;
    /**
     * For `process` worker type. An array passed as `args` to [child_process.fork](https://nodejs.org/api/child_process.html#child_processforkmodulepath-args-options)
     */
    forkArgs?: string[] | undefined;
    /**
     * For `process` worker type. An object passed as `options` to [child_process.fork](https://nodejs.org/api/child_process.html#child_processforkmodulepath-args-options). *
     */
    forkOpts?: any;
    /**
     * For `web` worker type. An object passed to the [constructor of the web worker](https://html.spec.whatwg.org/multipage/workers.html#dom-worker). See [WorkerOptions specification](https://html.spec.whatwg.org/multipage/workers.html#workeroptions) for available options.
     */
    workerOpts?: WorkerOptions | undefined;
    /**
     * Object`. For `worker` worker type. An object passed to [worker_threads.options](https://nodejs.org/api/worker_threads.html#new-workerfilename-options).
     */
    workerThreadOpts?: any;
    /**
     * Capture stdout and stderr from the worker and emit them via the `stdout` and `stderr` events. Not supported by the `web` worker type.
     */
    emitStdStreams?: boolean | undefined;
    /**
     * A callback that is called whenever a worker is being created. It can be used to allocate resources for each worker for example. Optionally, this callback can return an object containing one or more of the `WorkerArg` properties. The provided properties will be used to override the Pool properties for the worker being created.
     */
    onCreateWorker?: ((arg: WorkerArg) => WorkerArg | undefined) | undefined;
    /**
     * A callback that is called whenever a worker is being terminated. It can be used to release resources that might have been allocated for this specific worker. The callback is passed as argument an object as described for `onCreateWorker`, with each property sets with the value for the worker being terminated.
     */
    onTerminateWorker?: ((arg: WorkerArg) => void) | undefined;
};
export type ExecOptions<T = any> = {
    /**
     * An event listener, to handle events sent by the worker for this execution.
     */
    on?: ((payload: any) => unknown) | undefined;
    /**
     * A list of transferable objects to send to the worker. Not supported by `process` worker type. See ./examples/transferableObjects.js for usage.
     */
    transfer?: Object[] | undefined;
    /**
     * Custom metadata that will be attached to the task. This can be used in combination with a custom queue implementation for example, to prioritize tasks.
     */
    metadata?: T | undefined;
};
export type WorkerRegisterOptions = {
    /**
     * A callback that is called whenever a worker is being terminated. It can be used to release resources that might have been allocated for this specific worker. The difference with pool's `onTerminateWorker` is that this callback runs in the worker context, while onTerminateWorker is executed on the main thread.
     */
    onTerminate?: ((code: number | undefined) => PromiseLike<void> | void) | undefined;
    /**
     * The timeout in milliseconds to wait for a worker to clean up it's resources if an abort listener does not resolve, before stopping the worker forcefully. Default value is `1000`.
     */
    abortListenerTimeout?: number | undefined;
};
/**
 * <T>
 */
export type Proxy<T extends {
    [k: string]: (...args: any[]) => any;
}> = { [M in keyof T]: (...args: Parameters<T[M]>) => import("./Promise.js").Promise<ReturnType<T[M]>>; };
