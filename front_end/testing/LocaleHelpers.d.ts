export declare function initializeGlobalLocaleVars(): Promise<void>;
export declare function deinitializeGlobalLocaleVars(): void;
export declare function describeWithLocale(title: string, fn: (this: Mocha.Suite) => void): Mocha.Suite;
export declare namespace describeWithLocale {
    var only: (title: string, fn: (this: Mocha.Suite) => void) => Mocha.Suite;
    var skip: (title: string, fn: (this: Mocha.Suite) => void) => void | Mocha.Suite;
}
