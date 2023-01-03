# Performance of Components

Because we call the `#render()` method of a component frequently whenever any data changes, it is possible to create very inefficient component render calls that can lead to a poor experience for users.

If the `#render()` method is expensive to run, and the component's data frequently changes, we will deliver a janky experience to users. This document lists some common causes of issues and ways to mitigate or avoid them. Most of these come from real world instances on DevTools; please feel free to add any that you come across!

## Manually creating component instances

When you re-render a component, Lit is smart and does the minimal amount of work. For example, given a `#render()` method that looks like this:

```
return html`<devtools-foo .name=${name}></devtools-foo>`
```

Lit knows that the only dynamic part of that template is the `name` property, and as such on each re-render it only updates that part (and only if it has changed). It will not recreate `devtools-foo`.

> You can read more about this in the [Lit templates documentation](https://lit.dev/docs/templates/overview/).

However, if we change the `#render()` method to:

```
const foo = new DevToolsFoo();
foo.name = name;
return html`${foo}`
```

Now, we wil recreate `foo` on each re-render. This is not only wasted effort, but can mess with the user's experience if they had focused the node, only to have it destroyed and recreated.

You should always let Lit manage instances of components. If you cannot do this, you should ensure some layer of caching to make sure instnaces are re-used whenver possible. However, **be careful!** It is very hard to implement a reliable cache for elements, and should be done only as a last resort.

## Integrating DevTools widgets & Lit and causing re-renders

This issue is similar to the one above; often we can hit performance issues when using Lit to render a DevTools widget that we want to use. In a perfect world we would always re-build these widgets into Lit components, but that is often a huge undertaking and one that is not justifiable. The design of the widgets system is that they are only expected to be created once, and not re-evaluated. They expect to have their `update()` method called to trigger an update.

In this instance, you will need to:

1. Manage the instance(s) of the widget, and ensure that we are not destroying and recreating the widget on each render.
2. Ensure the `update()` method of the widget is called when the relevant data changes (or on each `#render()` call).

For example, this is likely to cause issues:

```ts
// within #render()
const someWidget = new SomeWidget();
return html`<div>${someWidget.element}</div>`
```

Because the widget will be created on each render. Instead, store the widget and `update()` it:

```ts
// within the component
#widgetInstance = new SomeWidget();

// within #render()
this.#widgetInstance.update();
return html`<div>${this.#widgetInstance.element}</div>`;
```

## Swap from `set data` to individual properties

When introducing lit-html into the DevTools codebase we made the decision to prefer:

```ts
set data(data: FooData) {
  this.#x = data.x;
  this.#y = data.y;
  // And so on
}
```

Rather than:

```ts
set x(x: number) {
  this.#x = x;
}

set y(y: number) {
  this.#y = y;
}
```

We did this for two reasons:

1. We can provide _some_ type-safety via `.data=${{x: 1, y: 2} as FooData}`.
2. We avoided having to immediately implement batched rendering.

However, this decision came with a performance penalty. Lit will only trigger a re-render of a component if one of its properties changes. But when we pass in a new object on each render, we are effectively triggering a re-render every time. Normally this impact isn't noticable, and most components don't re-render with the frequency required to cause performance issues. When a component that takes an object via `set data()` is frequently re-rendered, that causes a non-negligible amount of garbage collection to tidy up the one-use objects we create.

Therefore, if a component is re-rendered often and you are seeing issues, you can switch it to:

```
<devtools-foo .x=${x} .y=${y}></devtools-foo>
```

If you take this approach, ensure each property setter uses the render scheduler to batch updates. Otherwise we trigger N renders, one per property, rather than 1.

```ts
set x(x: number) {
  this.#x = x;
  void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
}
```

## Passing callback functions that are recreated on each render

A general theme of performance in frontend is to avoid re-renders whenever possible. When a property passed into a component changes, that will trigger a re-render (as in our components we schedule renders in any setters). One pattern that can cause many re-renders is passing functions into components.

For example, imagine this `#render()` method:

```ts
const onClick = function(event: Event) {
  // do something
}

return html`<devtools-foo .onClick=${onClick}></devtools-foo>`
```

And within `devtools-foo`, we have:

```
set onClick(func: (event: Event) => void) {
  if (this.#onClick === func) {
    return;
  }
  this.#onClick = func;
  void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
}
```

On each `#render()` call, `onClick` is recreated, so it is considered to be a new function, and thus we trigger a re-render. We could fix this by making `onClick` stable, and not re-creating it on each render, but a better way is to lean into the browser and use events.

In this example, we would update `devtools-foo` to dispatch an event when the user performs an action. We could then update our `#render()` method to:

```ts
return html`<devtools-foo @click=${this.#onClick}></devtools-foo>`
```

Lit will manage this event listener and ensure that it is not needlessly unbound and rebound. Now, we don't cause `devtools-foo` to re-render when really nothing is changing.
