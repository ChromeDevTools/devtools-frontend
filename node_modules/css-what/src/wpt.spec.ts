/**
 * @fileoverview CSS Selector parsing tests from WPT
 * @see https://github.com/web-platform-tests/wpt/tree/0bb883967c888261a8372923fd61eb5ad14305b2/css/selectors/parsing
 * @license BSD-3-Clause (https://github.com/web-platform-tests/wpt/blob/master/LICENSE.md)
 */

import { describe, it, expect } from "vitest";
import { parse, stringify } from "./index.js";

function test_valid_selector(
    selector: string,
    serialized: string | string[] = selector,
) {
    const result = stringify(parse(selector));
    if (Array.isArray(serialized)) {
        // Should be a part of the array
        expect(serialized).toContain(result);
    } else {
        expect(result).toStrictEqual(serialized);
    }
}

function test_invalid_selector(selector: string) {
    expect(() => parse(selector)).toThrow(Error);
}

describe("Web Platform Tests", () => {
    it("Attribute selectors", () => {
        // Attribute presence and value selectors
        test_valid_selector("[att]");
        test_valid_selector("[att=val]", '[att="val"]');
        test_valid_selector("[att~=val]", '[att~="val"]');
        test_valid_selector("[att|=val]", '[att|="val"]');
        test_valid_selector("h1[title]");
        test_valid_selector("span[class='example']", 'span[class="example"]');
        test_valid_selector("a[hreflang=fr]", 'a[hreflang="fr"]');
        test_valid_selector("a[hreflang|='en']", 'a[hreflang|="en"]');

        // Substring matching attribute selectors
        test_valid_selector("[att^=val]", '[att^="val"]');
        test_valid_selector("[att$=val]", '[att$="val"]');
        test_valid_selector("[att*=val]", '[att*="val"]');
        test_valid_selector('object[type^="image/"]');
        test_valid_selector('a[href$=".html"]');
        test_valid_selector('p[title*="hello"]');

        // From Attribute selectors and namespaces examples in spec:
        test_valid_selector("[*|att]");
        test_valid_selector("[|att]", "[att]");
    });

    it("Child combinators", () => {
        test_valid_selector("body > p");
        test_valid_selector("div ol>li p", "div ol > li p");
    });

    it("Class selectors", () => {
        test_valid_selector("*.pastoral", ["*.pastoral", ".pastoral"]);
        test_valid_selector(".pastoral", ["*.pastoral", ".pastoral"]);
        test_valid_selector("h1.pastoral");
        test_valid_selector("p.pastoral.marine");
    });

    it("Descendant combinator", () => {
        test_valid_selector("h1 em");
        test_valid_selector("div * p");
        test_valid_selector("div p *[href]", ["div p *[href]", "div p [href]"]);
    });

    it(":focus-visible pseudo-class", () => {
        test_valid_selector(":focus-visible");
        test_valid_selector("a:focus-visible");
        test_valid_selector(":focus:not(:focus-visible)");
    });

    it("The relational pseudo-class", () => {
        test_valid_selector(":has(a)");
        test_valid_selector(":has(#a)");
        test_valid_selector(":has(.a)");
        test_valid_selector(":has([a])");
        test_valid_selector(':has([a="b"])');
        test_valid_selector(':has([a|="b"])');
        test_valid_selector(":has(:hover)");
        test_valid_selector("*:has(.a)", ["*:has(.a)", ":has(.a)"]);
        test_valid_selector(".a:has(.b)");
        test_valid_selector(".a:has(> .b)");
        test_valid_selector(".a:has(~ .b)");
        test_valid_selector(".a:has(+ .b)");
        test_valid_selector(".a:has(.b) .c");
        test_valid_selector(".a .b:has(.c)");
        test_valid_selector(".a .b:has(.c .d)");
        test_valid_selector(".a .b:has(.c .d) .e");
        test_valid_selector(".a:has(.b:has(.c))");
        test_valid_selector(".a:has(.b:is(.c .d))");
        test_valid_selector(".a:has(.b:is(.c:has(.d) .e))");
        test_valid_selector(".a:is(.b:has(.c) .d)");
        test_valid_selector(".a:not(:has(.b))");
        test_valid_selector(".a:has(:not(.b))");
        test_valid_selector(".a:has(.b):has(.c)");
        test_valid_selector("*|*:has(*)", ":has(*)");
        test_valid_selector(":has(*|*)");
        test_invalid_selector(".a:has()");
    });

    it("ID selectors", () => {
        test_valid_selector("h1#chapter1");
        test_valid_selector("#chapter1");
        test_valid_selector("*#z98y", ["*#z98y", "#z98y"]);
    });

    it("The Matches-Any Pseudo-class: ':is()'", () => {
        test_valid_selector(
            ":is(ul,ol,.list) > [hidden]",
            ":is(ul, ol, .list) > [hidden]",
        );
        test_valid_selector(":is(:hover,:focus)", ":is(:hover, :focus)");
        test_valid_selector("a:is(:not(:hover))");

        test_valid_selector(":is(#a)");
        test_valid_selector(".a.b ~ :is(.c.d ~ .e.f)");
        test_valid_selector(".a.b ~ .c.d:is(span.e + .f, .g.h > .i.j .k)");
    });

    it("The negation pseudo-class", () => {
        test_valid_selector("button:not([disabled])");
        test_valid_selector("*:not(foo)", ["*:not(foo)", ":not(foo)"]);
        test_valid_selector(":not(:link):not(:visited)");
        test_valid_selector("*|*:not(*)", ":not(*)");
        test_valid_selector(":not(:hover)");
        test_valid_selector(":not(*|*)");
        test_valid_selector("foo:not(bar)");
        test_valid_selector(":not(:not(foo))");
        test_valid_selector(":not(.a .b)");
        test_valid_selector(":not(.a + .b)");
        test_valid_selector(":not(.a .b ~ c)");
        test_valid_selector(":not(span.a, div.b)");
        test_valid_selector(":not(.a .b ~ c, .d .e)");
        test_valid_selector(":not(:host)");
        test_valid_selector(":not(:host(.a))");
        test_valid_selector(":host(:not(.a))");
        test_valid_selector(":not(:host(:not(.a)))");
        test_valid_selector(
            ":not([disabled][selected])",
            ":not([disabled][selected])",
        );
        test_valid_selector(
            ":not([disabled],[selected])",
            ":not([disabled], [selected])",
        );

        test_invalid_selector(":not()");
        test_invalid_selector(":not(:not())");
    });

    it("Sibling combinators", () => {
        test_valid_selector("math + p");
        test_valid_selector("h1.opener + h2");
        test_valid_selector("h1 ~ pre");
    });

    it("Universal selector", () => {
        test_valid_selector("*");
        test_valid_selector("div :first-child", [
            "div *:first-child",
            "div :first-child",
        ]);
        test_valid_selector("div *:first-child", [
            "div *:first-child",
            "div :first-child",
        ]);
    });

    it("The Specificity-adjustment Pseudo-class: ':where()'", () => {
        test_valid_selector(
            ":where(ul,ol,.list) > [hidden]",
            ":where(ul, ol, .list) > [hidden]",
        );
        test_valid_selector(":where(:hover,:focus)", ":where(:hover, :focus)");
        test_valid_selector("a:where(:not(:hover))");

        test_valid_selector(":where(#a)");
        test_valid_selector(".a.b ~ :where(.c.d ~ .e.f)");
        test_valid_selector(".a.b ~ .c.d:where(span.e + .f, .g.h > .i.j .k)");
    });
});
