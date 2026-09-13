import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parse, stringify } from "./index.js";
import { tests } from "./__fixtures__/tests.js";

describe("Stringify & re-parse", () => {
    describe("Own tests", () => {
        for (const [selector, expected, message] of tests) {
            it(`${message} (${selector})`, () => {
                expect(parse(stringify(expected))).toStrictEqual(expected);
            });
        }
    });

    it("Collected Selectors (qwery, sizzle, nwmatcher)", () => {
        const out = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8"),
        );
        for (const s of Object.keys(out)) {
            expect(parse(stringify(out[s]))).toStrictEqual(out[s]);
        }
    });
});
