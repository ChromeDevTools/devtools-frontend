/**
 * @file This file contains a list of all known context values for visual
 * logging. These values are used to generate stable hashes for logs.
 *
 * DO NOT REMOVE any values from this list, as it will break log analysis
 * for historical data. New values should be added to the end of the list
 * (the list is automatically sorted and maintained by the ESLint rule).
 *
 * See crbug.com/504758084 for details.
 */
export declare const knownContextValues: Set<string>;
