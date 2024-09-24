# Building performance insights UI

If you want to add an insight to the Performance panel sidebar, you need to create and render an HTML component that follows certain conventions which will mean it integrates nicely into the rest of the performance panel, and all its overlays/active state/etc is managed for you.

## 1. Extend `BaseInsight`

When creating your component, extend the `BaseInsight` class (defined in `insights/Helpers.ts`). This class will set up some of the setters and data you need. Your component will then have access to a `this.data` object which will have on it:

1. `insights`: the `TraceInsightSets` generated for the current trace.
2. `navigationId`: the currently active navigation ID (as some Insights are per-navigation).
3. `activeInsight`: an object representing the current active (meaning the user has clicked to expand it) insight.
4. `activeCategory`: an `InsightsCategories` enum member representing if the user has chosen a category from the dropdown.

In your component you can access all this data via `this.data.X`, where `X` is one of the keys listed above.

You will have to define 4 properties on your component:

1. `static readonly litTagName` is the HTML tag name given to your element (define this just as you do for all custom elements).
2. `override insightCategory: InsightsCategories` is the category that your insight applies to. This is so it can be filtered when the user uses the sidebar dropdown to change category.
3. `override internalName: string` is a name used to identify the insight. It **must be unique across all insights** and is used to track if it is active or not.
4. `override userVisibleTitle: string` is the user facing name used in the sidebar when the insight is rendered.

> Note that in most components, we use private methods and variables for storing this data, but because we are extending a base class, these are all `protected` instead.

## 2. override the `render` method

You should then use `override render(): void` to implement the render method and follow the usual patterns of all our custom elements.

You can use the `shouldRenderForCategory` helper method to determine if the insight should even be shown or not. If it should not, you can render nothing:

```ts
override render(): void {
  const matchesCategory = shouldRenderForCategory({
    activeCategory: this.data.activeCategory,
    insightCategory: this.insightCategory,
  });
  const output = matchesCategory ? this.#renderMyInsight() : LitHtml.nothing;
  LitHtml.render(output, this.shadow, {host: this});
}
```

Within your `renderMyInsight` method (please choose a better name!), you should use the `SidebarInsight` component and use its `slot`s to place your content in. You also have access to the `this.isActive()` method to determine if this insight is expanded or not.

```
<${SidebarInsight.SidebarInsight.litTagName} .data=${{
  title: this.userVisibleTitle,
  expanded: this.isActive(),
} as SidebarInsight.InsightDetails}
@insighttoggleclick=${this.onSidebarClick}
>
  <div slot="insight-description" class="insight-description">
    <!-- the description (in the UI, this is above the border when expanded) goes here-->
  </div>
  <div slot="insight-content" class="insight-content">
    <!-- this content will be shown below the border in expanded mode -->
  </div>
</${SidebarInsight.SidebarInsight}>
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
