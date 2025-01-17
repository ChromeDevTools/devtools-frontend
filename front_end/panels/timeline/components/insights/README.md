# Building performance insights UI

**Last updated: Jan 2025**

If you want to add an insight to the Performance panel sidebar, you need to create and render an HTML component that follows certain conventions which will mean it integrates nicely into the rest of the performance panel, and all its overlays/active state/etc is managed for you.

## 1. Extend `BaseInsightComponent`

When creating your component, extend the `BaseInsightComponent` class (defined in `components/insights/BaseInsightComponent.ts`). This class will set up some of the setters and data you need. Your component will then have access to a `this.data` object which will have on it:

1. `bounds`: the current time window.
2. `insightSetKey`: the currently active navigation ID, or NO_NAVIGATION.

In your component you can access all this data via `this.data.X`, where `X` is one of the keys listed above.

You will have to define 4 properties on your component:

1. `static readonly litTagName` is the HTML tag name given to your element (define this just as you do for all custom elements).
2. `override internalName: string` is a name used to identify the insight. It **must be unique across all insights** and is used to track if it is active or not.

> Go to KnownContextValues.ts and add your insight: `timeline.toggle-insight.your-insight-name` and `timeline.insights.your-insight-name`.

> Note that in most components, we use private methods and variables for storing this data, but because we are extending a base class, these are all `protected` instead.

## 2. override the `renderContent` method

You should then use `override renderContent(): LitHtml.LitTemplate` to implement the render method and follow the usual patterns of all our custom elements.

You can use the `shouldRenderForCategory` helper method to determine if the insight should even be shown or not. If it should not, you can render nothing:

```ts
override renderContent(): LitHtml.LitTemplate {
  const matchesCategory = shouldRenderForCategory({
    activeCategory: this.data.activeCategory,
    insightCategory: this.insightCategory,
  });
  if (!matchesCategory) {
    return LitHtml.nothing;
  }

  return LitHtml.html`
    <div class="insight-section">Insight content goes here</div>
  `;
}
```

## 3. Override the `createOverlays()` method

If your component should render overlays when it is expanded, you will need to define those in the `createOverlays` method.

This should return an array of `Overlays.Overlays.TimelineOverlay` objects. When your insight is expanded/collapsed, they will automatically be created / destroyed.

## 4. Custom styling

If you need to inject any custom styling, you can override the `connectedCallback` method:

```ts
override connectedCallback(): void {
  super.connectedCallback();
  this.shadow.adoptedStyleSheets.push(myCustomStyles);
}
```

**Don't forget to call `super.connectedCallback`** and make sure **you `push` the stylesheet** to not override the default stylesheet that is injected by the `BaseInsight` class.

## 5. Render!

Add your insight to the UI in `SidebarSingleInsightSet.ts` in the `#renderInsights` method.
