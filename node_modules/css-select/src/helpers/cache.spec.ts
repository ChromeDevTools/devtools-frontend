import * as boolbase from "boolbase";
import type { Element, Node } from "domhandler";
import * as DomUtils from "domutils";
import { parseDocument } from "htmlparser2";
import { describe, expect, it, vi } from "vitest";
import * as CSSselect from "../index.js";
import type { InternalOptions } from "../types.js";
import { cacheParentResults } from "./cache.js";

const cacheParentResultsOptions = {
    adapter: DomUtils,
} as unknown as InternalOptions<Node, Element>;

describe("cacheParentResults", () => {
    it("should rely on parent for matches", () => {
        const documentWithoutFoo = parseDocument(
            "<a><b><c><d><e>bar</e></d></c><f><g>bar</g></f></b></a>",
        );

        const fn = vi.fn((elem) => DomUtils.getText(elem).includes("foo"));
        const hasfoo = cacheParentResults<Node, Element>(
            boolbase.trueFunc,
            cacheParentResultsOptions,
            fn,
        );

        const options = {
            pseudos: {
                hasfoo,
            },
        };

        expect(
            CSSselect.selectAll<Node, Element>(
                ":hasfoo",
                documentWithoutFoo,
                options,
            ),
        ).toHaveLength(0);

        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should cache results for subtrees", () => {
        const documentWithFoo = parseDocument(
            "<a><b><c><d><e>foo</e></d></c><f><g>bar</g></f></b></a>",
        );

        const fn = vi.fn((elem) => DomUtils.getText(elem).includes("foo"));
        const hasfoo = cacheParentResults<Node, Element>(
            boolbase.trueFunc,
            cacheParentResultsOptions,
            fn,
        );

        const options = {
            pseudos: {
                hasfoo,
            },
        };

        expect(
            CSSselect.selectAll<Node, Element>(
                ":hasfoo",
                documentWithFoo,
                options,
            ),
        ).toHaveLength(5);

        expect(fn).toHaveBeenCalledTimes(6);
    });

    it("should use cached result for multiple matches", () => {
        const documentWithFoo = parseDocument(
            "<a><b><c><d><e>foo</e></d></c><f><g>bar</g></f></b></a>",
        );

        const fn = vi.fn((elem) => DomUtils.getText(elem).includes("foo"));
        const hasfoo = cacheParentResults<Node, Element>(
            boolbase.trueFunc,
            cacheParentResultsOptions,
            fn,
        );

        const options = {
            pseudos: {
                hasfoo,
            },
        };

        expect(
            CSSselect.selectAll<Node, Element>(
                ":hasfoo :hasfoo",
                documentWithFoo,
                options,
            ),
        ).toHaveLength(4);

        expect(fn).toHaveBeenCalledTimes(6);
    });
});
