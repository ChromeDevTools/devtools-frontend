# Creating components

A component is created by extending `HTMLElement`. The name of the component should match the filename. The component should be exported by the file.

```ts
// ElementBreadcrumbs.ts
export class ElementBreadcrumbs extends HTMLElement {
}
```

## Where to put components

If the component is for a specific panel, and not expected to be re-usable, it should be created within the panel's folder, within a sub-directory of `components`:

```
front_end/panels/elements/components/ElementsBreadcrumbs.ts
```

If a component is designed to be re-usable, it should live in `front_end/ui/components`, in its own folder. That folder also contains an entrypoint, along with files for the component's definition.

```
front_end/ui/components/button/button.ts // entrypoint
front_end/ui/components/button/Button.ts // component definition
```

## Defining and naming a component

A component should be given a `static readonly litTagName` property, which defines its name:

```ts
// ElementBreadcrumbs.ts
export class ElementBreadcrumbs extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-elements-breadcrumbs`;
}
```

> Remember that all custom elements **must** contain a hyphen. Prefer `devtools-` as the prefix by default.

We then use the `ComponentHelpers` module (`front_end/ui/components/helpers`) to define the component and register it with the browser:

```ts
ComponentHelpers.CustomElements.defineComponent('devtools-elements-breadcrumbs', ElementsBreadcrumbs);
```

And finally we tell TypeScript that this component exists:

```ts
declare global {
  interface HTMLElementTagNameMap {
    'devtools-elements-breadcrumbs': ElementsBreadcrumbs;
  }
}
```

By doing this, TypeScript understands that `document.querySelector('devtools-elements-breadcrumbs')` returns an `ElementsBreadcrumbs` instance.

We have a custom ESLint rule that ensures that the tag name is used consistently in all the locations where it is required.

## Creating a shadow root

Each component gets its own Shadow Root to ensure that styles and events that occur within it are encapsulated and do not leak out:

```ts
export class ElementsBreadcrumbs extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-elements-breadcrumbs`;
  readonly #shadow = this.attachShadow({mode: 'open'});
}
```

> We set the mode to `open` so it's open to inspection via DevTools. [See this MDN explainer](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode) for more details.

## Rendering a component

Each component defines a `#render` method which is responsible for invoking LitHtml and having the component render HTML into the DOM.

> The `#` symbol indicates a [private class method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields).

The `#render` method calls `LitHtml.render`, building up a template with `LitHtml.html`:

```ts
LitHtml.render(LitHtml.html``, this.#shadow, {host: this});
```

There is unfortunately a [clang-format bug](crbug.com/1079231) which makes its auto-formatting of LitHtml templates very unreadable, so we usually disable clang-format round the call:

```ts
// clang-format off
LitHtml.render(...)
// clang-format on
```

## Scheduled and batched rendering

To have your component render, you could manually call `this.#render()`. However, if you were to have multiple updates to a component (perhaps some values it's passed get changed), we want to avoid having multiple renders where possible and instead batch them.

We can use the `ScheduledRender` helper (`front_end/ui/components/helpers/scheduled-render.ts`) to achieve this. First, bind the `#render` method of your component, to ensure it's always bound to the component instance's scope:

```ts
export class ElementsBreadcrumbs extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-chrome-link`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
}
```

Then, rather than call `this.#render()` directly, you instead call the scheduler:

```ts
void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
```

> `scheduleRender` returns a promise; we use the `void` keyword to instruct TypeScript that we are purposefully not using `await` to wait for the promise to resolve. When scheduling a render it's most common to "fire and forget".
