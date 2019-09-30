// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.CSSOverviewCompletedView = class extends UI.PanelWithSidebar {
  constructor(controller) {
    super('css_overview_completed_view');
    this.registerRequiredCSS('css_overview/cssOverviewCompletedView.css');

    this._controller = controller;
    this._formatter = new Intl.NumberFormat('en-US');
    this._mainContainer = new UI.VBox();

    this._sideBar = new CssOverview.CSSOverviewSidebarPanel();
    this.splitWidget().setSidebarWidget(this._sideBar);
    this.splitWidget().setMainWidget(this._mainContainer);

    this._sideBar.addItem(ls`Overview summary`, 'summary');
    this._sideBar.addItem(ls`Colors`, 'colors');
    this._sideBar.select('summary');

    this._sideBar.addEventListener(CssOverview.SidebarEvents.ItemSelected, this._sideBarItemSelected, this);
    this._sideBar.addEventListener(CssOverview.SidebarEvents.Reset, this._sideBarReset, this);
    this._controller.addEventListener(CssOverview.Events.Reset, this._reset, this);
    this._render({});
  }

  _sideBarItemSelected(event) {
    const section = this._fragment.$(event.data);
    if (!section) {
      return;
    }

    section.scrollIntoView();
  }

  _sideBarReset() {
    this._controller.dispatchEventToListeners(CssOverview.Events.Reset);
  }

  _reset() {
    this._mainContainer.element.removeChildren();
  }

  _render(data) {
    if (!(data && ('textColors' in data) && ('backgroundColors' in data))) {
      return;
    }

    const {elementStyleStats, elementCount, backgroundColors, textColors, globalStyleStats} = data;

    // Convert rgb values from the computed styles to either undefined or HEX(A) strings.
    const nonTransparentBackgroundColors = this._getNonTransparentColorStrings(backgroundColors);
    const nonTransparentTextColors = this._getNonTransparentColorStrings(textColors);

    this._fragment = UI.Fragment.build`
    <div class="vbox overview-completed-view">
      <div $="summary" class="results-section summary">
        <h1>${ls`Overview summary`}</h1>

        <ul>
          <li>
            <div class="label">${ls`Elements processed`}</div>
            <div class="value">${this._formatter.format(elementCount)}</div>
          </li>
          <li>
            <div class="label">${ls`External stylesheets`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.externalSheets)}</div>
          </li>
          <li>
            <div class="label">${ls`Inline style elements`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.inlineStyles)}</div>
          </li>
          <li>
            <div class="label">${ls`Style rules`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.styleRules)}</div>
          </li>
          <li>
            <div class="label">${ls`Media rules`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.mediaRules)}</div>
          </li>
          <li>
            <div class="label">${ls`Type selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.type.size)}</div>
          </li>
          <li>
            <div class="label">${ls`ID selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.id.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Class selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.class.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Universal selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.universal.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Attribute selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.attribute.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Non-simple selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.nonSimple.size)}</div>
          </li>
        </ul>
      </div>

      <div $="colors" class="results-section colors">
        <h1>${ls`Colors`}</h1>
        <h2>${ls`Unique background colors: ${nonTransparentBackgroundColors.length}`}</h2>
        <ul>
          ${nonTransparentBackgroundColors.map(this._colorsToFragment)}
        </ul>

        <h2>${ls`Unique text colors: ${nonTransparentTextColors.length}`}</h2>
        <ul>
          ${nonTransparentTextColors.map(this._colorsToFragment)}
        </ul>
      </div>
    </div>`;

    this._mainContainer.element.appendChild(this._fragment.element());
  }

  _colorsToFragment(color) {
    const colorFormatted =
        color.hasAlpha() ? color.asString(Common.Color.Format.HEXA) : color.asString(Common.Color.Format.HEX);
    const blockFragment = UI.Fragment.build`<li>
      <div class="block" $="color"></div>
      <div class="block-title">${colorFormatted}</div>
    </li>`;

    const block = blockFragment.$('color');
    block.style.backgroundColor = colorFormatted;

    let [h, s, l] = color.hsla();
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    // Reduce the lightness of the border to make sure that there's always a visible outline.
    l = Math.max(0, l - 15);

    const borderString = `1px solid hsl(${h}, ${s}%, ${l}%)`;
    block.style.border = borderString;

    return blockFragment;
  }

  _getNonTransparentColorStrings(colors) {
    return Array.from(colors)
        .map(colorText => {
          const color = Common.Color.parse(colorText);
          if (color.rgba()[3] === 0) {
            return;
          }

          return color;
        })
        .filter(color => !!color);
  }

  setOverviewData(data) {
    this._render(data);
  }
};
