# Listening to and dispatching events

Within your component it is likely that you will need to listen to user events, or dispatch custom events to enable other components to be notified of some event or user action.

## Listening to events

To bind event listeners, we can use Lit-Html's event binding syntax in our template. Take the event you want to listen to, and prefix it with a `@`:

```ts
LitHtml.render(LitHtml.html`
  <button @click=${this.#onButtonClick}>Click me!</button>
`, this.#shadow, {host: this});
```

Event listeners are defined as private class methods that will be called with an `Event`:

```ts
#onButtonClick(event: Event): void {
  // ...
}
```

You do not need to worry about the event listener not being bound to the component's scope - Lit-Html takes care of this when we pass `{host: this}` into the `LitHtml.render` call. This tells Lit to bind event listeners on our behalf. In DevTools we have an ESLint rule which ensures that we use this option, so you cannot forget it!

## Dispatching events

Sometimes you may need to dispatch an event from your component that another element higher in the DOM tree can listen to.

The first step is to define the custom event. You do this by extending the built in `Event` class:

```ts
export class AddBreakpointEvent extends Event {
  static readonly eventName = 'addbreakpoint';

  constructor(public index: number) {
    super(AddBreakpointEvent.eventName, {bubbles: true, composed: true});
  }
}
```

Custom events must have a `static readonly eventName` property (this is also enforced by an ESLint rule). We try to mimic the conventions of built in DOM events - event names should be lowercase and contain no spaces or dashes.

They must also define a `constructor` which takes in any data that you want to be available on this event. This is how you can attach information to the events you dispatch for listeners to have access to. By declaring a `public node: DOMNode` above, we are declaring that this event must be initialised with a `node`, and that listeners will be able to access it via `event.node`.

Within the constructor, we call `super` with our custom event name. We then pass two options in which are recommended (but not required if you know you do not need them):

1. `bubbles`: setting this to `true` means that when this event is emitted it will bubble up through the DOM tree. You usually want this because it is how built in browser events behave and it means that any listeners can be anywhere "above" the element that is dispatching the event and still be able to listen for it.
2. `composed`: this setting declares if the event will propogate through the shadow boundary and into the standard DOM. Setting this to `false` means that all event listeners must be within the shadow DOM to be able to listen to the event.

MDN has some useful articles on these concepts if you want to learn more:

1. [Introduction to Events: Event bubbling](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_bubbling)
2. [Event: composed property](https://developer.mozilla.org/en-US/docs/Web/API/Event/composed)
3. [Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
