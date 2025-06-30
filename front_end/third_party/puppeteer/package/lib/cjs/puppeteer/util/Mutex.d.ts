import { disposeSymbol } from './disposable.js';
/**
 * @internal
 */
export declare class Mutex {
    #private;
    static Guard: {
        new (mutex: Mutex, onRelease?: () => void): {
            "__#58009@#mutex": Mutex;
            "__#58009@#onRelease"?: () => void;
            [Symbol.dispose](): void;
        };
    };
    acquire(onRelease?: () => void): Promise<InstanceType<typeof Mutex.Guard>>;
    release(): void;
}
//# sourceMappingURL=Mutex.d.ts.map