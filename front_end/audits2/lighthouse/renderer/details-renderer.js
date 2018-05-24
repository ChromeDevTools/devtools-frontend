/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* globals self CriticalRequestChainRenderer Util URL */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {import('./crc-details-renderer.js')} CRCDetailsJSON */

class DetailsRenderer {
  /**
   * @param {DOM} dom
   */
  constructor(dom) {
    /** @type {DOM} */
    this._dom = dom;
    /** @type {ParentNode} */
    this._templateContext; // eslint-disable-line no-unused-expressions
  }

  /**
   * @param {ParentNode} context
   */
  setTemplateContext(context) {
    this._templateContext = context;
  }

  /**
   * @param {DetailsJSON} details
   * @return {Element}
   */
  render(details) {
    switch (details.type) {
      case 'text':
        return this._renderText(/** @type {StringDetailsJSON} */ (details));
      case 'url':
        return this._renderTextURL(/** @type {StringDetailsJSON} */ (details));
      case 'bytes':
        return this._renderBytes(/** @type {NumericUnitDetailsJSON} */ (details));
      case 'ms':
        // eslint-disable-next-line max-len
        return this._renderMilliseconds(/** @type {NumericUnitDetailsJSON} */ (details));
      case 'link':
        // @ts-ignore - TODO(bckenny): Fix type hierarchy
        return this._renderLink(/** @type {LinkDetailsJSON} */ (details));
      case 'thumbnail':
        return this._renderThumbnail(/** @type {ThumbnailDetails} */ (details));
      case 'filmstrip':
        // @ts-ignore - TODO(bckenny): Fix type hierarchy
        return this._renderFilmstrip(/** @type {FilmstripDetails} */ (details));
      case 'table':
        // @ts-ignore - TODO(bckenny): Fix type hierarchy
        return this._renderTable(/** @type {TableDetailsJSON} */ (details));
      case 'code':
        return this._renderCode(details);
      case 'node':
        return this.renderNode(/** @type {NodeDetailsJSON} */(details));
      case 'criticalrequestchain':
        return CriticalRequestChainRenderer.render(this._dom, this._templateContext,
          // @ts-ignore - TODO(bckenny): Fix type hierarchy
          /** @type {CRCDetailsJSON} */ (details));
      default: {
        throw new Error(`Unknown type: ${details.type}`);
      }
    }
  }

  /**
   * @param {NumericUnitDetailsJSON} details
   * @return {Element}
   */
  _renderBytes(details) {
    // TODO: handle displayUnit once we have something other than 'kb'
    const value = Util.formatBytesToKB(details.value, details.granularity);
    return this._renderText({type: 'text', value});
  }

  /**
   * @param {NumericUnitDetailsJSON} details
   * @return {Element}
   */
  _renderMilliseconds(details) {
    let value = Util.formatMilliseconds(details.value, details.granularity);
    if (details.displayUnit === 'duration') {
      value = Util.formatDuration(details.value);
    }

    return this._renderText({type: 'text', value});
  }

  /**
   * @param {StringDetailsJSON} text
   * @return {HTMLElement}
   */
  _renderTextURL(text) {
    const url = text.value;

    let displayedPath;
    let displayedHost;
    let title;
    try {
      const parsed = Util.parseURL(url);
      displayedPath = parsed.file === '/' ? parsed.origin : parsed.file;
      displayedHost = parsed.file === '/' ? '' : `(${parsed.hostname})`;
      title = url;
    } catch (/** @type {!Error} */ e) {
      if (!(e instanceof TypeError)) {
        throw e;
      }
      displayedPath = url;
    }

    const element = /** @type {HTMLElement} */ (this._dom.createElement('div', 'lh-text__url'));
    element.appendChild(this._renderText({
      value: displayedPath,
      type: 'text',
    }));

    if (displayedHost) {
      const hostElem = this._renderText({
        value: displayedHost,
        type: 'text',
      });
      hostElem.classList.add('lh-text__url-host');
      element.appendChild(hostElem);
    }

    if (title) element.title = url;
    return element;
  }

  /**
   * @param {LinkDetailsJSON} details
   * @return {Element}
   */
  _renderLink(details) {
    const allowedProtocols = ['https:', 'http:'];
    const url = new URL(details.url);
    if (!allowedProtocols.includes(url.protocol)) {
      // Fall back to just the link text if protocol not allowed.
      return this._renderText({
        type: 'text',
        value: details.text,
      });
    }

    const a = /** @type {HTMLAnchorElement} */ (this._dom.createElement('a'));
    a.rel = 'noopener';
    a.target = '_blank';
    a.textContent = details.text;
    a.href = url.href;

    return a;
  }

  /**
   * @param {StringDetailsJSON} text
   * @return {Element}
   */
  _renderText(text) {
    const element = this._dom.createElement('div', 'lh-text');
    element.textContent = text.value;
    return element;
  }

  /**
   * Create small thumbnail with scaled down image asset.
   * If the supplied details doesn't have an image/* mimeType, then an empty span is returned.
   * @param {ThumbnailDetails} details
   * @return {Element}
   */
  _renderThumbnail(details) {
    const element = /** @type {HTMLImageElement}*/ (this._dom.createElement('img', 'lh-thumbnail'));
    /** @type {string} */
    // @ts-ignore - type should have a value if we get here.
    const strValue = details.value;
    element.src = strValue;
    element.title = strValue;
    element.alt = '';
    return element;
  }

  /**
   * @param {TableDetailsJSON} details
   * @return {Element}
   */
  _renderTable(details) {
    if (!details.items.length) return this._dom.createElement('span');

    const tableElem = this._dom.createElement('table', 'lh-table');
    const theadElem = this._dom.createChildOf(tableElem, 'thead');
    const theadTrElem = this._dom.createChildOf(theadElem, 'tr');

    for (const heading of details.headings) {
      const itemType = heading.itemType || 'text';
      const classes = `lh-table-column--${itemType}`;
      this._dom.createChildOf(theadTrElem, 'th', classes).appendChild(this.render({
        type: 'text',
        value: heading.text || '',
      }));
    }

    const tbodyElem = this._dom.createChildOf(tableElem, 'tbody');
    for (const row of details.items) {
      const rowElem = this._dom.createChildOf(tbodyElem, 'tr');
      for (const heading of details.headings) {
        const key = /** @type {keyof DetailsJSON} */ (heading.key);
        // TODO(bckenny): type should be naturally inferred here.
        const value = /** @type {number|string|DetailsJSON|undefined} */ (row[key]);

        if (typeof value === 'undefined' || value === null) {
          this._dom.createChildOf(rowElem, 'td', 'lh-table-column--empty');
          continue;
        }
        // handle nested types like code blocks in table rows.
        // @ts-ignore - TODO(bckenny): narrow first
        if (value.type) {
          const valueAsDetails = /** @type {DetailsJSON} */ (value);
          const classes = `lh-table-column--${valueAsDetails.type}`;
          this._dom.createChildOf(rowElem, 'td', classes).appendChild(this.render(valueAsDetails));
          continue;
        }

        // build new details item to render
        const item = {
          value: /** @type {number|string} */ (value),
          type: heading.itemType,
          displayUnit: heading.displayUnit,
          granularity: heading.granularity,
        };

        /** @type {string|undefined} */
        // @ts-ignore - TODO(bckenny): handle with refactoring above
        const valueType = value.type;
        const classes = `lh-table-column--${valueType || heading.itemType}`;
        this._dom.createChildOf(rowElem, 'td', classes).appendChild(this.render(item));
      }
    }
    return tableElem;
  }

  /**
   * @param {NodeDetailsJSON} item
   * @return {Element}
   * @protected
   */
  renderNode(item) {
    const element = /** @type {HTMLSpanElement} */ (this._dom.createElement('span', 'lh-node'));
    if (item.snippet) {
      element.textContent = item.snippet;
    }
    if (item.selector) {
      element.title = item.selector;
    }
    if (item.path) element.setAttribute('data-path', item.path);
    if (item.selector) element.setAttribute('data-selector', item.selector);
    if (item.snippet) element.setAttribute('data-snippet', item.snippet);
    return element;
  }

  /**
   * @param {FilmstripDetails} details
   * @return {Element}
   */
  _renderFilmstrip(details) {
    const filmstripEl = this._dom.createElement('div', 'lh-filmstrip');

    for (const thumbnail of details.items) {
      const frameEl = this._dom.createChildOf(filmstripEl, 'div', 'lh-filmstrip__frame');
      this._dom.createChildOf(frameEl, 'img', 'lh-filmstrip__thumbnail', {
        src: `data:image/jpeg;base64,${thumbnail.data}`,
        alt: `Screenshot`,
      });
    }
    return filmstripEl;
  }

  /**
   * @param {DetailsJSON} details
   * @return {Element}
   */
  _renderCode(details) {
    const pre = this._dom.createElement('pre', 'lh-code');
    pre.textContent = /** @type {string} */ (details.value);
    return pre;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailsRenderer;
} else {
  self.DetailsRenderer = DetailsRenderer;
}

// TODO, what's the diff between DetailsJSON and NumericUnitDetailsJSON?
/**
 * @typedef {{
      type: string,
      value: (string|number|undefined),
      summary?: OpportunitySummary,
      granularity?: number,
      displayUnit?: string
  }} DetailsJSON
 */

/**
 * @typedef {{
      type: string,
      value: string,
      granularity?: number,
      displayUnit?: string,
  }} StringDetailsJSON
 */

/**
 * @typedef {{
      type: string,
      value: number,
      granularity?: number,
      displayUnit?: string,
  }} NumericUnitDetailsJSON
 */

/**
 * @typedef {{
      type: string,
      path?: string,
      selector?: string,
      snippet?: string
  }} NodeDetailsJSON
 */

/**
 * @typedef {{
      itemType: string,
      key: string,
      text?: string,
      granularity?: number,
      displayUnit?: string,
  }} TableHeaderJSON
 */

/** @typedef {{
      type: string,
      items: Array<DetailsJSON>,
      headings: Array<TableHeaderJSON>
  }} TableDetailsJSON
 */

/** @typedef {{
      type: string,
      value?: string,
  }} ThumbnailDetails
 */

/** @typedef {{
      type: string,
      text: string,
      url: string
  }} LinkDetailsJSON
 */

/** @typedef {{
      type: string,
      scale: number,
      items: Array<{timing: number, timestamp: number, data: string}>,
  }} FilmstripDetails
 */


/** @typedef {{
      wastedMs?: number,
      wastedBytes?: number
  }} OpportunitySummary
 */
