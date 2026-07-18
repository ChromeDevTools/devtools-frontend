import type * as Mocha from 'mocha';
export declare function pruneSuite(suite: Mocha.Suite, shouldIncludeTest: (test: Mocha.Test) => boolean): void;
export declare function duplicateTests(suite: Mocha.Suite, repetitions: number): void;
