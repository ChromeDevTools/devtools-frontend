import { parse, stringify } from "css-what";
import { describe, expect, it } from "vitest";
import { sortRules } from "./selectors.js";

/**
 * Sorts the rules of a selector and turns it back into a string.
 *
 * Note that the order of the rules might not be legal, and the resulting
 * string might not be parseable again.
 *
 * @param selector Selector to sort
 * @returns Sorted selector, which might not be a valid selector anymore.
 */
function parseSortStringify(selector: string): string {
    const parsed = parse(selector);

    for (const token of parsed) {
        sortRules(token);
    }

    return stringify(parsed);
}

describe("sortRules", () => {
    it("should move tag selectors last", () => {
        expect(parseSortStringify("div[class]:empty")).toBe(":empty[class]div");
    });

    it("should move universal selectors last", () => {
        expect(parseSortStringify("*[class]")).toBe("[class]*");
    });

    it("should sort attribute selectors", () => {
        expect(
            parseSortStringify(
                ".foo#bar[foo=bar][foo^=bar][foo$=bar][foo!=bar][foo=bar i][foo!=bar s]",
            ),
        ).toBe(
            '.foo#bar[foo="bar" i][foo^="bar"][foo$="bar"][foo!="bar"][foo!="bar" s][foo="bar"]',
        );
    });

    it("should sort pseudo selectors", () => {
        expect(
            parseSortStringify(
                ":not(:empty):empty:contains(a):icontains(a):has(div):is(div):is(foo bar):is([foo])",
            ),
        ).toBe(
            ":contains(a):icontains(a):has(div):is(foo bar):not(:empty):empty:is([foo]):is(div)",
        );
    });

    it("should support traversals", () => {
        expect(
            parseSortStringify("div > *:empty[foo] + [bar=foo i]:is(div)"),
        ).toBe('div > :empty[foo]* + [bar="foo" i]:is(div)');
    });
});
