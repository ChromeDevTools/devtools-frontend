import type * as Mocha from 'mocha';
export declare function createTestIdMap(suite: Mocha.Suite): Map<Mocha.Test, string>;
export declare function checkForDuplicateTests(testIdMap: ReadonlyMap<Mocha.Test, string>): void;
export interface PruneSuiteOptions {
    testIds?: ReadonlySet<string>;
    skippedTests?: readonly string[];
}
export declare function listContainsTestOrSuite(list: Iterable<string>, testId: string): boolean;
export declare function pruneSuite(suite: Mocha.Suite, testIdMap: ReadonlyMap<Mocha.Test, string>, options?: PruneSuiteOptions): void;
export declare function duplicateTests(suite: Mocha.Suite, repetitions: number): void;
