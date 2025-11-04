/**
 * Completely cleans out the test DOM to ensure it's empty for the next test run.
 * This is run automatically between tests - you should not be manually calling this yourself.
 **/
export declare const cleanTestDOM: (testName?: string) => void;
/**
 * Sets up the DOM for testing,
 * If not clean logs an error and cleans itself
 **/
export declare const setupTestDOM: () => Promise<void>;
