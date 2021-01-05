# Performs validity check on anchor hrefs. Warns when anchors are used as buttons. (anchor-is-valid)

The HTML `<a>` element, with a valid `href` attribute, is formally defined as representing a **hyperlink**. That is, a link between one HTML document and another, or between one location inside an HTML document and another location inside the same document.

In fact, the interactive, underlined `<a>` element has become so synonymous with web navigation that this expectation has become entrenched inside browsers, assistive technologies such as screen readers and in how people generally expect the internet to behave. In short, anchors should navigate.

The use of JavaScript frameworks and libraries has made it very easy to add or subtract functionality from the standard HTML elements. This has led to _anchors_ often being used in applications based on how they look and function instead of what they represent.

Whilst it is possible, for example, to turn the `<a>` element into a fully functional `<button>` element with ARIA, the native user agent implementations of HTML elements are to be preferred over custom ARIA solutions.

## How do I resolve this error?

### Case: I want to perform an action and need a clickable UI element

The native user agent implementations of the `<a>` and `<button>` elements not only differ in how they look and how they act when activated, but also in how the user is expected to interact with them. Both are perfectly clickable when using a mouse, but keyboard users expect `<a>` to activate on `enter` only and `<button>` to activate on _both_ `enter` and `space`.

This is exacerbated by the expectation sighted users have of how _buttons_ and _anchors_ work based on their appearance. Therefore we find that using _anchors_ as _buttons_ can easily create confusion without a relatively complicated ARIA and CSS implementation that only serves to create an element HTML already offers and browsers already implement fully accessibly.

We are aware that sometimes _anchors_ are used instead of _buttons_ to achieve a specific visual design. When using the `<button>` element this can still be achieved with styling but, due to the meaning many people attach to the standard underlined `<a>` due its appearance, please reconsider this in the design.

Consider the following:

```js
html`
  <a href="javascript:void(0)" @click=${foo}>Perform action</a>
  <a href="#" @click=${foo}>Perform action</a>
  <a @click=${foo}>Perform action</a>
`;
```

All these _anchor_ implementations indicate that the element is only used to execute JavaScript code. All the above should be replaced with:

```js
html` <button @click=${foo}>Perform action</button> `;
```

### Case: I want navigable links

An `<a>` element without an `href` attribute no longer functions as a hyperlink. That means that it can no longer accept keyboard focus or be clicked on. The documentation for [no-noninteractive-tabindex](no-noninteractive-tabindex.md) explores this further. Preferably use another element (such as `div` or `span`) for display of text.

To properly function as a hyperlink, the `href` attribute should be present and also contain a valid _URL_. _JavaScript_ strings, empty values or using only **#** are not considered valid `href` values.

Valid `href` attributes values are:

```js
html`
  <a href="/some/valid/uri">Navigate to page</a>
  <a href="/some/valid/uri#top">Navigate to page and location</a>
  <a href="#top">Navigate to internal page location</a>
`;
```

### Case: I need the HTML to be interactive, don't I need to use an `a` tag for that?

An `<a>` tag is not inherently interactive. Without an href attribute, it really is no different to a `<div>`.

Let's look at an example that is not accessible by all users:

```js
html`
  <a class="thing" @mouseenter=${() => (this.showSomething = true)}>
    ${label}
  </a>
`;
```

If you need to create an interface element that the user can click on, consider using a button:

```js
html`
  <button class="thing"
      @click={() => this.showSomething = true}>
    ${label}
  </button>
`;
```

If you want to navigate while providing the user with extra functionality, for example in the `@mouseenter` event, use an anchor with an `href` attribute containing a URL or path as its value.

```js
html`
  <a class="thing" href=${someValidPath} @mouseenter=${() => (this.showSomething = true)}>
    ${label}
  </a>
`;
```

If you need to create an interface element that the user can mouse over or mouse out of, consider using a div element. In this case, you may need to apply a role of presentation or an interactive role. Interactive ARIA roles include `button`, `link`, `checkbox`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `option`, `radio`, `searchbox`, `switch` and `textbox`.

```js
html`
  <div class="thing" role="menuitem" @click=${() => (this.showSomething = true)}>
    @mouseenter=${() => (this.showSomething = true)}> ${label}
  </div>
`;
```

In the example immediately above an `@click` event handler was added to provide the same experience mouse users enjoy to keyboard-only and touch-screen users. Never fully rely on mouse events alone to expose functionality.

### Case: I understand the previous cases but still need an element resembling a link that is purely clickable

We recommend, without reserve, that elements resembling anchors should navigate. This will provide a superior user experience to a larger group of users out there.

However, we understand that developers are not always in total control of the visual design of web applications. In cases where it is imperative to provide an element resembling an anchor that purely acts as a click target with no navigation as result, we would like to recommend a compromise.

Again change the element to a `<button>`:

```js
html`
  <button class="link-button" type="button" @click=${() => (this.showSomething = true)}>
    Press me, I look like a link
  </button>
`;
```

Then use styling to change its appearance to that of a link:

```css
.link-button {
  background-color: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  display: inline;
  margin: 0;
  padding: 0;
}

.link-button:hover,
.link-button:focus {
  text-decoration: none;
}
```

This button element can now also be used inline in text.

Once again we stress that this is an inferior implementation and some users will encounter difficulty to use your website, however, it will allow a larger group of people to interact with your website than the alternative of ignoring the rule's warning.

## Rule Details

This rule takes one optional object argument of type object:

```json
{
  "rules": {
    "lit-a11y/anchor-is-valid": [
      "error",
      {
        "allowHash": true,
        "aspects": ["noHref", "invalidHref", "preferButton"]
      }
    ]
  }
}
```

For the `allowHash` option (default `true`), if set to `false`, the empty hash or "scroll-to-top" link will be considered an error.

Examples of **incorrect** code for this rule with `"allowHash": false`:

```js
html` <a href="#"></a> `;
```

Examples of **correct** code for this rule with `"allowHash": false`:

```js
html` <a href="#top"></a> `;
```

For the `aspects` option, these strings determine which sub-rules are run. This allows omission of certain error types in restrictive environments.

- `noHref`: Checks whether an anchor contains an `href` attribute.
- `invalidHref`: Checks if a given `href` value is valid.
- `preferButton`: Checks if anchors have been used as buttons.

If omitted, all sub-rule aspects will be run by default. This is the recommended configuration for all cases except where the rule becomes unusable due to well founded restrictions.

The option must contain at least one `aspect`.

Examples of **incorrect** code for this rule:

Anchors should be a button:

```js
html`
  <a @click=${foo}></a>
  <a href="javascript:void(0)" @click=${foo}></a>
  <a href=${'javascript:void(0)'} @click=${foo}></a>
  <a href=${`javascript:void(0)`} @click=${foo}></a>
`;
```

Missing `href` attribute:

```js
html`
  <a></a>
  <a href="{undefined}"></a>
  <a href="{null}"></a>
`;
```

Invalid `href` attribute:

```js
html`
  <a href="javascript:void(0)"></a>
  <a href={"javascript:void(0)"}></a>
  <a href={`javascript:void(0)`}></a>
`;
```

Examples of **correct** code for this rule:

```js
html`
  <a href="https://github.com"></a>
  <a href="#"></a>
  <a href="#section"></a>
  <a href="foo"></a>
  <a href="/foo/bar"></a>
  <a href=${someValidPath}></a>
  <a href="https://github.com" @click=${foo}></a>
  <a href="#section" @click=${foo}></a>
  <a href="foo" @click=${foo}></a>
  <a href="/foo/bar" @click=${foo}></a>
  <a href=${someValidPath} @click=${foo}></a>
`;
```

## Further Reading

- [WCAG 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [WebAIM - Introduction to Links and Hypertext](http://webaim.org/techniques/hypertext/)
- [Links vs. Buttons in Modern Web Applications](https://marcysutton.com/links-vs-buttons-in-modern-web-applications/)
- [Using ARIA - Notes on ARIA use in HTML](https://www.w3.org/TR/using-aria/#NOTES)
