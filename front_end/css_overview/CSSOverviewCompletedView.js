// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {Events} from './CSSOverviewController.js';
import {CSSOverviewSidebarPanel, SidebarEvents} from './CSSOverviewSidebarPanel.js';

/**
 * @unrestricted
 */
export class CSSOverviewCompletedView extends UI.Panel.PanelWithSidebar {
  constructor(controller, target) {
    super('css_overview_completed_view');
    this.registerRequiredCSS('css_overview/cssOverviewCompletedView.css');

    this._controller = controller;
    this._formatter = new Intl.NumberFormat('en-US');

    this._mainContainer = new UI.SplitWidget.SplitWidget(true, true);
    this._resultsContainer = new UI.Widget.VBox();
    this._elementContainer = new DetailsView();

    // If closing the last tab, collapse the sidebar.
    this._elementContainer.addEventListener(UI.TabbedPane.Events.TabClosed, evt => {
      if (evt.data === 0) {
        this._mainContainer.setSidebarMinimized(true);
      }
    });

    // Dupe the styles into the main container because of the shadow root will prevent outer styles.
    this._mainContainer.registerRequiredCSS('css_overview/cssOverviewCompletedView.css');

    this._mainContainer.setMainWidget(this._resultsContainer);
    this._mainContainer.setSidebarWidget(this._elementContainer);
    this._mainContainer.setVertical(false);
    this._mainContainer.setSecondIsSidebar(true);
    this._mainContainer.setSidebarMinimized(true);

    this._sideBar = new CSSOverviewSidebarPanel();
    this.splitWidget().setSidebarWidget(this._sideBar);
    this.splitWidget().setMainWidget(this._mainContainer);

    this._cssModel = target.model(SDK.CSSModel.CSSModel);
    this._domModel = target.model(SDK.DOMModel.DOMModel);
    this._domAgent = target.domAgent();
    this._linkifier = new Components.Linkifier.Linkifier(/* maxLinkLength */ 20, /* useLinkDecorator */ true);

    this._viewMap = new Map();

    this._sideBar.addItem(ls`Overview summary`, 'summary');
    this._sideBar.addItem(ls`Colors`, 'colors');
    this._sideBar.addItem(ls`Font info`, 'font-info');
    this._sideBar.addItem(ls`Unused declarations`, 'unused-declarations');
    this._sideBar.addItem(ls`Media queries`, 'media-queries');
    this._sideBar.select('summary');

    this._sideBar.addEventListener(SidebarEvents.ItemSelected, this._sideBarItemSelected, this);
    this._sideBar.addEventListener(SidebarEvents.Reset, this._sideBarReset, this);
    this._controller.addEventListener(Events.Reset, this._reset, this);
    this._controller.addEventListener(Events.PopulateNodes, this._createElementsView, this);
    this._resultsContainer.element.addEventListener('click', this._onClick.bind(this));

    this._data = null;
  }


  /**
   * @override
   */
  wasShown() {
    super.wasShown();

    // TODO(paullewis): update the links in the panels in case source has been .
  }

  _sideBarItemSelected(event) {
    const section = this._fragment.$(event.data);
    if (!section) {
      return;
    }

    section.scrollIntoView();
  }

  _sideBarReset() {
    this._controller.dispatchEventToListeners(Events.Reset);
  }

  _reset() {
    this._resultsContainer.element.removeChildren();
    this._mainContainer.setSidebarMinimized(true);
    this._elementContainer.closeTabs();
    this._viewMap = new Map();
  }

  _onClick(evt) {
    const type = evt.target.dataset.type;
    if (!type) {
      return;
    }

    let payload;
    switch (type) {
      case 'color': {
        const color = evt.target.dataset.color;
        const section = evt.target.dataset.section;
        if (!color) {
          return;
        }

        let nodes;
        switch (section) {
          case 'text':
            nodes = this._data.textColors.get(color);
            break;

          case 'background':
            nodes = this._data.backgroundColors.get(color);
            break;

          case 'fill':
            nodes = this._data.fillColors.get(color);
            break;

          case 'border':
            nodes = this._data.borderColors.get(color);
            break;
        }

        if (!nodes) {
          return;
        }

        // Remap the Set to an object that is the same shape as the unused declarations.
        nodes = Array.from(nodes).map(nodeId => ({nodeId}));
        payload = {type, color, nodes, section};
        break;
      }

      case 'unused-declarations': {
        const declaration = evt.target.dataset.declaration;
        const nodes = this._data.unusedDeclarations.get(declaration);
        if (!nodes) {
          return;
        }

        payload = {type, declaration, nodes};
        break;
      }

      case 'media-queries': {
        const text = evt.target.dataset.text;
        const nodes = this._data.mediaQueries.get(text);
        if (!nodes) {
          return;
        }

        payload = {type, text, nodes};
        break;
      }

      case 'font-info': {
        const value = evt.target.dataset.value;
        const [fontFamily, fontMetric] = evt.target.dataset.path.split('/');
        const nodesIds = this._data.fontInfo.get(fontFamily).get(fontMetric).get(value);
        if (!nodesIds) {
          return;
        }

        const nodes = nodesIds.map(nodeId => ({nodeId}));
        const name = `${value} (${fontFamily}, ${fontMetric})`;
        payload = {type, name, nodes};
        break;
      }

      default:
        return;
    }

    evt.consume();
    this._controller.dispatchEventToListeners(Events.PopulateNodes, payload);
    this._mainContainer.setSidebarMinimized(false);
  }

  _onMouseOver(evt) {
    // Traverse the event path on the grid to find the nearest element with a backend node ID attached. Use
    // that for the highlighting.
    const node = evt.path.find(el => el.dataset && el.dataset.backendNodeId);
    if (!node) {
      return;
    }

    const backendNodeId = Number(node.dataset.backendNodeId);
    this._controller.dispatchEventToListeners(Events.RequestNodeHighlight, backendNodeId);
  }

  async _render(data) {
    if (!data || !('backgroundColors' in data) || !('textColors' in data)) {
      return;
    }

    this._data = data;
    const {
      elementCount,
      backgroundColors,
      textColors,
      fillColors,
      borderColors,
      globalStyleStats,
      mediaQueries,
      unusedDeclarations,
      fontInfo
    } = this._data;

    // Convert rgb values from the computed styles to either undefined or HEX(A) strings.
    const sortedBackgroundColors = this._sortColorsByLuminance(backgroundColors);
    const sortedTextColors = this._sortColorsByLuminance(textColors);
    const sortedFillColors = this._sortColorsByLuminance(fillColors);
    const sortedBorderColors = this._sortColorsByLuminance(borderColors);

    this._fragment = UI.Fragment.Fragment.build`
    <div class="vbox overview-completed-view">
      <div $="summary" class="results-section horizontally-padded summary">
        <h1>${ls`Overview summary`}</h1>

        <ul>
          <li>
            <div class="label">${ls`Elements`}</div>
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
            <div class="label">${ls`Media queries`}</div>
            <div class="value">${this._formatter.format(mediaQueries.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Type selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.type)}</div>
          </li>
          <li>
            <div class="label">${ls`ID selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.id)}</div>
          </li>
          <li>
            <div class="label">${ls`Class selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.class)}</div>
          </li>
          <li>
            <div class="label">${ls`Universal selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.universal)}</div>
          </li>
          <li>
            <div class="label">${ls`Attribute selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.attribute)}</div>
          </li>
          <li>
            <div class="label">${ls`Non-simple selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.nonSimple)}</div>
          </li>
        </ul>
      </div>

      <div $="colors" class="results-section horizontally-padded colors">
        <h1>${ls`Colors`}</h1>
        <h2>${ls`Background colors: ${sortedBackgroundColors.length}`}</h2>
        <ul>
          ${sortedBackgroundColors.map(this._colorsToFragment.bind(this, 'background'))}
        </ul>

        <h2>${ls`Text colors: ${sortedTextColors.length}`}</h2>
        <ul>
          ${sortedTextColors.map(this._colorsToFragment.bind(this, 'text'))}
        </ul>

        <h2>${ls`Fill colors: ${sortedFillColors.length}`}</h2>
        <ul>
          ${sortedFillColors.map(this._colorsToFragment.bind(this, 'fill'))}
        </ul>

        <h2>${ls`Border colors: ${sortedBorderColors.length}`}</h2>
        <ul>
          ${sortedBorderColors.map(this._colorsToFragment.bind(this, 'border'))}
        </ul>
      </div>

      <div $="font-info" class="results-section font-info">
        <h1>${ls`Font info`}</h1>
        ${
        fontInfo.size > 0 ? this._fontInfoToFragment(fontInfo) :
                            UI.Fragment.Fragment.build`<div>${ls`There are no fonts.`}</div>`}
      </div>

      <div $="unused-declarations" class="results-section unused-declarations">
        <h1>${ls`Unused declarations`}</h1>
        ${
        unusedDeclarations.size > 0 ?
            this._groupToFragment(unusedDeclarations, 'unused-declarations', 'declaration') :
            UI.Fragment.Fragment.build`<div class="horizontally-padded">${ls`There are no unused declarations.`}</div>`}
      </div>

      <div $="media-queries" class="results-section media-queries">
        <h1>${ls`Media queries`}</h1>
        ${
        mediaQueries.size > 0 ?
            this._groupToFragment(mediaQueries, 'media-queries', 'text') :
            UI.Fragment.Fragment.build`<div class="horizontally-padded">${ls`There are no media queries.`}</div>`}
      </div>
    </div>`;

    this._resultsContainer.element.appendChild(this._fragment.element());
  }

  _createElementsView(evt) {
    const {type, nodes} = evt.data;

    let id = '';
    let tabTitle = '';

    switch (type) {
      case 'color': {
        const {section, color} = evt.data;
        id = `${section}-${color}`;
        tabTitle = `${color.toUpperCase()} (${section})`;
        break;
      }

      case 'unused-declarations': {
        const {declaration} = evt.data;
        id = `${declaration}`;
        tabTitle = `${declaration}`;
        break;
      }

      case 'media-queries': {
        const {text} = evt.data;
        id = `${text}`;
        tabTitle = `${text}`;
        break;
      }

      case 'font-info': {
        const {name} = evt.data;
        id = `${name}`;
        tabTitle = `${name}`;
        break;
      }
    }

    let view = this._viewMap.get(id);
    if (!view) {
      view = new ElementDetailsView(this._controller, this._domModel, this._cssModel, this._linkifier);
      view.populateNodes(nodes);
      this._viewMap.set(id, view);
    }

    this._elementContainer.appendTab(id, tabTitle, view, true);
  }

  _fontInfoToFragment(fontInfo) {
    const fonts = Array.from(fontInfo.entries());
    return UI.Fragment.Fragment.build`
      ${fonts.map(([font, fontMetrics]) => {
      return UI.Fragment.Fragment.build
      `<section class="font-family"><h2>${font}</h2> ${this._fontMetricsToFragment(font, fontMetrics)}</section>`;
    })}
    `;
  }

  _fontMetricsToFragment(font, fontMetrics) {
    const fontMetricInfo = Array.from(fontMetrics.entries());

    return UI.Fragment.Fragment.build`
      <div class="font-metric">
      ${fontMetricInfo.map(([label, values]) => {
      const sanitizedPath = `${font}/${label}`;
      return UI.Fragment.Fragment.build`
          <div>
            <h3>${label}</h3>
            ${this._groupToFragment(values, 'font-info', 'value', sanitizedPath)}
          </div>`;
    })}
      </div>`;
  }

  _groupToFragment(items, type, dataLabel, path = '') {
    // Sort by number of items descending.
    const values = Array.from(items.entries()).sort((d1, d2) => {
      const v1Nodes = d1[1];
      const v2Nodes = d2[1];
      return v2Nodes.length - v1Nodes.length;
    });

    const total = values.reduce((prev, curr) => prev + curr[1].length, 0);

    return UI.Fragment.Fragment.build`<ul>
    ${values.map(([title, nodes]) => {
      const width = 100 * nodes.length / total;
      const itemLabel = nodes.length === 1 ? ls`occurrence` : ls`occurrences`;

      return UI.Fragment.Fragment.build`<li>
        <div class="title">${title}</div>
        <button data-type="${type}" data-path="${path}" data-${dataLabel}="${title}">
          <div class="details">${ls`${nodes.length} ${itemLabel}`}</div>
          <div class="bar-container">
            <div class="bar" style="width: ${width}%"></div>
          </div>
        </button>
      </li>`;
    })}
    </ul>`;
  }

  _colorsToFragment(section, color) {
    const blockFragment = UI.Fragment.Fragment.build`<li>
      <button data-type="color" data-color="${color}" data-section="${section}" class="block" $="color"></button>
      <div class="block-title">${color}</div>
    </li>`;

    const block = blockFragment.$('color');
    block.style.backgroundColor = color;

    const borderColor = Common.Color.Color.parse(color);
    let [h, s, l] = borderColor.hsla();
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    // Reduce the lightness of the border to make sure that there's always a visible outline.
    l = Math.max(0, l - 15);

    const borderString = `1px solid hsl(${h}, ${s}%, ${l}%)`;
    block.style.border = borderString;

    return blockFragment;
  }

  _sortColorsByLuminance(srcColors) {
    return Array.from(srcColors.keys()).sort((colA, colB) => {
      const colorA = Common.Color.Color.parse(colA);
      const colorB = Common.Color.Color.parse(colB);
      return Common.Color.Color.luminance(colorB.rgba()) - Common.Color.Color.luminance(colorA.rgba());
    });
  }

  setOverviewData(data) {
    this._render(data);
  }
}

CSSOverviewCompletedView.pushedNodes = new Set();

export class DetailsView extends UI.Widget.VBox {
  constructor() {
    super();

    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.show(this.element);
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, () => {
      this.dispatchEventToListeners(UI.TabbedPane.Events.TabClosed, this._tabbedPane.tabIds().length);
    });
  }

  /**
   * @param {string} id
   * @param {string} tabTitle
   * @param {!UI.Widget.Widget} view
   * @param {boolean=} isCloseable
   */
  appendTab(id, tabTitle, view, isCloseable) {
    if (!this._tabbedPane.hasTab(id)) {
      this._tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
    }

    this._tabbedPane.selectTab(id);
  }

  closeTabs() {
    this._tabbedPane.closeTabs(this._tabbedPane.tabIds());
  }
}

export class ElementDetailsView extends UI.Widget.Widget {
  constructor(controller, domModel, cssModel, linkifier) {
    super();

    this._controller = controller;
    this._domModel = domModel;
    this._cssModel = cssModel;
    this._linkifier = linkifier;

    this._elementGridColumns = [
      {id: 'nodeId', title: ls`Element`, visible: false, sortable: true, hideable: true, weight: 50},
      {id: 'declaration', title: ls`Declaration`, visible: false, sortable: true, hideable: true, weight: 50},
      {id: 'sourceURL', title: ls`Source`, visible: true, sortable: false, hideable: true, weight: 100}
    ];

    this._elementGrid = new DataGrid.SortableDataGrid.SortableDataGrid(
        {displayName: ls`CSS Overview Elements`, columns: this._elementGridColumns});
    this._elementGrid.element.classList.add('element-grid');
    this._elementGrid.element.addEventListener('mouseover', this._onMouseOver.bind(this));
    this._elementGrid.setStriped(true);
    this._elementGrid.addEventListener(
        DataGrid.DataGrid.Events.SortingChanged, this._sortMediaQueryDataGrid.bind(this));

    this.element.appendChild(this._elementGrid.element);
  }

  _sortMediaQueryDataGrid() {
    const sortColumnId = this._elementGrid.sortColumnId();
    if (!sortColumnId) {
      return;
    }

    const comparator = DataGrid.SortableDataGrid.SortableDataGrid.StringComparator.bind(null, sortColumnId);
    this._elementGrid.sortNodes(comparator, !this._elementGrid.isSortOrderAscending());
  }

  _onMouseOver(evt) {
    // Traverse the event path on the grid to find the nearest element with a backend node ID attached. Use
    // that for the highlighting.
    const node = evt.path.find(el => el.dataset && el.dataset.backendNodeId);
    if (!node) {
      return;
    }

    const backendNodeId = Number(node.dataset.backendNodeId);
    this._controller.dispatchEventToListeners(Events.RequestNodeHighlight, backendNodeId);
  }

  async populateNodes(data) {
    this._elementGrid.rootNode().removeChildren();

    if (!data.length) {
      return;
    }

    const [firstItem] = data;
    const visibility = {
      'nodeId': !!firstItem.nodeId,
      'declaration': !!firstItem.declaration,
      'sourceURL': !!firstItem.sourceURL
    };

    let relatedNodesMap;
    if (visibility.nodeId) {
      // Grab the nodes from the frontend, but only those that have not been
      // retrieved already.
      const nodeIds = data.reduce((prev, curr) => {
        if (CSSOverviewCompletedView.pushedNodes.has(curr.nodeId)) {
          return prev;
        }

        CSSOverviewCompletedView.pushedNodes.add(curr.nodeId);
        return prev.add(curr.nodeId);
      }, new Set());
      relatedNodesMap = await this._domModel.pushNodesByBackendIdsToFrontend(nodeIds);
    }

    for (const item of data) {
      if (visibility.nodeId) {
        const frontendNode = relatedNodesMap.get(item.nodeId);
        if (!frontendNode) {
          continue;
        }

        item.node = frontendNode;
      }

      const node = new ElementNode(this._elementGrid, item, this._linkifier, this._cssModel);
      node.selectable = false;
      this._elementGrid.insertChild(node);
    }

    this._elementGrid.setColumnsVisiblity(visibility);
    this._elementGrid.renderInline();
    this._elementGrid.wasShown();
  }
}

export class ElementNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
  /**
   * @param {!DataGrid.SortableDataGrid.SortableDataGrid} dataGrid
   * @param {!Object<string,*>} data
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {!SDK.CSSModel.CSSModel} cssModel
   */
  constructor(dataGrid, data, linkifier, cssModel) {
    super(dataGrid, data.hasChildren);

    this.data = data;
    this._linkifier = linkifier;
    this._cssModel = cssModel;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    // Nodes.
    if (columnId === 'nodeId') {
      const cell = this.createTD(columnId);
      cell.textContent = '...';

      Common.Linkifier.Linkifier.linkify(this.data.node).then(link => {
        cell.textContent = '';
        link.dataset.backendNodeId = this.data.node.backendNodeId();
        cell.appendChild(link);
      });
      return cell;
    }

    // Links to CSS.
    if (columnId === 'sourceURL') {
      const cell = this.createTD(columnId);

      if (this.data.range) {
        const link = this._linkifyRuleLocation(
            this._cssModel, this._linkifier, this.data.styleSheetId,
            TextUtils.TextRange.TextRange.fromObject(this.data.range));

        if (link.textContent !== '') {
          cell.appendChild(link);
        } else {
          cell.textContent = '(unable to link)';
        }
      } else {
        cell.textContent = '(unable to link to inlined styles)';
      }
      return cell;
    }

    return super.createCell(columnId);
  }

  _linkifyRuleLocation(cssModel, linkifier, styleSheetId, ruleLocation) {
    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    const matchingSelectorLocation = new SDK.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
  }
}
