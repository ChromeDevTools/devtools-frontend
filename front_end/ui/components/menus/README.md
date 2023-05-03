# Select Menu
The SelectMenu component is a drop-down list that allows the user to pick one or more options. It can be used in the most simple use cases, like a simple select component and in more complex scenarios, like when choosing multiple items or rendering custom items.

## Options to customize the menu
The SelectMenu defines several properties which can be used to customize its behaviour. These are defined in the `SelectMenuData` interface. Please refer to the documentation of the properties inside the SelectMenu.ts file for more details on what the options are and how to use them.

## Passing data
There are two Web Components that constitute the SelectMenu as a whole. The `SelectMenu` component itself (`<devtools-select-menu>`) and a helper `MenuItem` component (`<devtools-menu-item>`). The `MenuItem` component is used to wrap each of the items in the menu. Each item can be an HTML template which will be rendered as an item of the `SelectMenu` instance. The resultant set of `MenuItem` elements must itself be wrapped by a `SelectMenu` component. For example, the HTML of a simple select menu with three items could look like (omitting the use of static Lit tag names):
```html
<devtools-select-menu>
  <devtools-menu-item>
    <span>Item 1</span>
  </devtools-menu-item>
  <devtools-menu-item>
    <span>Item 2</span>
  </devtools-menu-item>
  <devtools-menu-item>
    <span>Item 3</span>
  </devtools-menu-item>
</devtools-select-menu>
```
Each `MenuItem` element must have a value as well, which is set using the `value` property. Please refer to the documentation in the `MenuItemData` interface for more details on the properties of the `MenuItem` class.

## Customizing items
As shown above, each item can itself be an HTML template for which a set of CSS rules can be defined. Although complex styling of the items is discouraged to keep SelectMenu components as consistent as possible with DevTools' design system, items can be customized using basic CSS and HTML.

To do so, the styles defined for the items should be part of the styles adopted by the shadow root of the component that owns a SelectMenu instance, using `ShadowRoot.adoptedStyleSheets` (note using inline styles is deprecated in DevTools in favor of using dedicated CSS files). Taking up the previous example, if we wanted to add custom styles to the menu items we could achieve this as follows:

```css
/* In example.css */

#hello-world {
  color: blue;
}
.my-item {
  color: red;
}
```

```ts
// In Example.ts
import exampleStyles from './example.css.js';
export class Example extends HTMLElement{

…

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [exampleStyles];
  }

…

 private render(): void {
    LitHtml.render(
        LitHtml.html`
```
```html
          <span id="hello-world">Hello world!!1</span>
          <devtools-select-menu>
            <devtools-menu-item>
              <span class="my-item">Item 1</span>
            </devtools-menu-item>
            <devtools-menu-item>
              <span class="my-item">Item 2</span>
                  </devtools-menu-item>
            <devtools-menu-item>
              <span class="my-item">Item 3</span>
            </devtools-menu-item>
          </devtools-select-menu>
        `,
```
```ts
        this.shadow);
  }
}
```

## Data state and selection events handling
The implementation of the component assumes the owner of a SelectMenu instance handles the state of the menu's data, including keeping track of the currently selected item(s). The selected item should be marked with the `selected` flag set to true.

So that the owner of a SelectMenu instance is notified about item selections in the menu, they must add a listener to the `SelectMenuItemSelectedEvent` (`selectmenuselected`), dispatched by the component each time an item is selected. The payload of the event is the value that was set to the selected item using the `value` property of the `SelectMenuItem` component. Here is a simple example of the implementation of this workflow:


```ts
// In Example.ts
import exampleStyles from './example.css.js';
export class Example extends HTMLElement{
  private currentValue = 0;

…

  onItemSelected(evt: Components.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.currentValue = evt.itemValue;
  }
…

 private render(): void {
    LitHtml.render(
        LitHtml.html`
```
```html
          <devtools-select-menu
            @selectmenuselected=${this.onItemSelected}
          >
            <devtools-menu-item .value=${1} .selected=${this.currentValue === 1}>
              <span class="my-item">Item 1</span>
            </devtools-menu-item>
            <devtools-menu-item .value=${2}  .selected=${this.currentValue === 2}>
              <span class="my-item">Item 2</span>
                  </devtools-menu-item>
            <devtools-menu-item .value=${3}  .selected=${this.currentValue === 3}>
              <span class="my-item">Item 3</span>
            </devtools-menu-item>
          </devtools-select-menu>
        `,
```
```ts
        this.shadow, {host: this});
  }
}
```
