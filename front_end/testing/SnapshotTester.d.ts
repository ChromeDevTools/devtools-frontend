/**
 * Provides snapshot testing for karma unit tests.
 * See README.md for more.
 *
 * Note: karma.conf.ts implements the server logic (see snapshotTesterFactory).
 */
declare class BaseSnapshotTester {
    #private;
    protected snapshotPath: string;
    constructor(context: Mocha.Suite, meta: ImportMeta);
    load(): Promise<void>;
    assert(context: Mocha.Context, actual: string): void;
    finish(): Promise<void>;
    protected serializeSnapshotFileContent(): string;
    protected checkIfUpdateMode(): Promise<boolean>;
    protected postUpdate(): Promise<void>;
    protected loadSnapshot(_snapshotPath: string): Promise<string | undefined>;
}
declare class WebSnapshotTester extends BaseSnapshotTester {
    protected checkIfUpdateMode(): Promise<boolean>;
    protected postUpdate(): Promise<void>;
    protected loadSnapshot(snapshotPath: string): Promise<string | undefined>;
}
declare class NodeSnapshotTester extends BaseSnapshotTester {
    #private;
    protected checkIfUpdateMode(): Promise<boolean>;
    protected postUpdate(): Promise<void>;
    protected loadSnapshot(snapshotPath: string): Promise<string | undefined>;
}
export type SnapshotTester = NodeSnapshotTester | WebSnapshotTester;
declare const SnapshotTesterValue: typeof WebSnapshotTester | typeof NodeSnapshotTester;
export { SnapshotTesterValue as SnapshotTester };
