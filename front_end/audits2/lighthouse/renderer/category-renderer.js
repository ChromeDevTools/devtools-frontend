/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* globals self, Util */

class CategoryRenderer {
  /**
   * @param {!DOM} dom
   * @param {!DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @private {!DOM} */
    this._dom = dom;
    /** @private {!DetailsRenderer} */
    this._detailsRenderer = detailsRenderer;
    /** @private {!Document|!Element} */
    this._templateContext = this._dom.document();

    this._detailsRenderer.setTemplateContext(this._templateContext);
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @return {!Element}
   */
  _renderAuditScore(audit) {
    const tmpl = this._dom.cloneTemplate('#tmpl-lh-audit-score', this._templateContext);

    const scoringMode = audit.result.scoringMode;
    const description = audit.result.helpText;
    let title = audit.result.description;

    if (audit.result.displayValue) {
      title += `:  ${audit.result.displayValue}`;
    }
    if (audit.result.optimalValue) {
      title += ` (target: ${audit.result.optimalValue})`;
    }

    if (audit.result.debugString) {
      const debugStrEl = tmpl.appendChild(this._dom.createElement('div', 'lh-debug'));
      debugStrEl.textContent = audit.result.debugString;
    }

    // Append audit details to header section so the entire audit is within a <details>.
    const header = /** @type {!HTMLDetailsElement} */ (this._dom.find('.lh-score__header', tmpl));
    if (audit.result.details) {
      header.appendChild(this._detailsRenderer.render(audit.result.details));
    }

    const scoreEl = this._dom.find('.lh-score', tmpl);
    if (audit.result.informative) {
      scoreEl.classList.add('lh-score--informative');
    }
    if (audit.result.manual) {
      scoreEl.classList.add('lh-score--manual');
    }

    return this._populateScore(tmpl, audit.score, scoringMode, title, description);
  }

  /**
   * @param {!DocumentFragment|!Element} element DOM node to populate with values.
   * @param {number} score
   * @param {string} scoringMode
   * @param {string} title
   * @param {string} description
   * @return {!Element}
   */
  _populateScore(element, score, scoringMode, title, description) {
    // Fill in the blanks.
    const valueEl = this._dom.find('.lh-score__value', element);
    valueEl.textContent = Util.formatNumber(score);
    valueEl.classList.add(`lh-score__value--${Util.calculateRating(score)}`,
        `lh-score__value--${scoringMode}`);

    this._dom.find('.lh-score__title', element).appendChild(
        this._dom.convertMarkdownCodeSnippets(title));
    this._dom.find('.lh-score__description', element)
        .appendChild(this._dom.convertMarkdownLinkSnippets(description));

    return /** @type {!Element} **/ (element);
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!Element}
   */
  _renderCategoryScore(category) {
    const tmpl = this._dom.cloneTemplate('#tmpl-lh-category-score', this._templateContext);
    const score = Math.round(category.score);

    const gaugeContainerEl = this._dom.find('.lh-score__gauge', tmpl);
    const gaugeEl = this.renderScoreGauge(category);
    gaugeContainerEl.appendChild(gaugeEl);

    return this._populateScore(tmpl, score, 'numeric', category.name, category.description);
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @return {!Element}
   */
  _renderAudit(audit) {
    const element = this._dom.createElement('div', 'lh-audit');
    element.appendChild(this._renderAuditScore(audit));
    return element;
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @param {number} scale
   * @return {!Element}
   */
  _renderTimelineMetricAudit(audit, scale) {
    const element = this._dom.createElement('div',
        `lh-timeline-metric lh-timeline-metric--${Util.calculateRating(audit.score)}`);

    const sparklineContainerEl = this._dom.createChildOf(element, 'div',
        'lh-timeline-metric__sparkline');
    const titleEl = this._dom.createChildOf(element, 'div', 'lh-timeline-metric__title');
    const titleNameEl = this._dom.createChildOf(titleEl, 'span', 'lh-timeline-metric__name');
    const titleValueEl = this._dom.createChildOf(titleEl, 'span', 'lh-timeline-metric__value');
    titleNameEl.textContent = audit.result.description;
    titleValueEl.textContent = audit.result.displayValue;

    if (typeof audit.result.rawValue !== 'number') {
      const debugStrEl = this._dom.createChildOf(element, 'div', 'lh-debug');
      debugStrEl.textContent = audit.result.debugString || 'Report error: no metric information';
      return element;
    }

    const sparklineEl = this._dom.createChildOf(sparklineContainerEl, 'div',
        'lh-sparkline lh-sparkline--thin');
    const sparklineBarEl = this._dom.createChildOf(sparklineEl, 'div', 'lh-sparkline__bar');
    sparklineBarEl.style.width = `${audit.result.rawValue / scale * 100}%`;

    const descriptionEl = this._dom.createChildOf(element, 'div',
        'lh-timeline-metric__description');
    descriptionEl.appendChild(this._dom.convertMarkdownLinkSnippets(audit.result.helpText));

    return element;
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @param {number} scale
   * @return {!Element}
   */
  _renderPerfHintAudit(audit, scale) {
    const extendedInfo = /** @type {!CategoryRenderer.PerfHintExtendedInfo}
        */ (audit.result.extendedInfo);
    const tooltipAttrs = {title: audit.result.displayValue};

    const element = this._dom.createElement('details', [
      'lh-perf-hint',
      `lh-perf-hint--${Util.calculateRating(audit.score)}`,
      'lh-expandable-details',
    ].join(' '));

    const summary = this._dom.createChildOf(element, 'summary', 'lh-perf-hint__summary ' +
        'lh-expandable-details__summary');
    const titleEl = this._dom.createChildOf(summary, 'div', 'lh-perf-hint__title');
    titleEl.textContent = audit.result.description;

    if (!extendedInfo || typeof audit.result.rawValue !== 'number') {
      const debugStrEl = this._dom.createChildOf(summary, 'div', 'lh-debug');
      debugStrEl.textContent = audit.result.debugString || 'Report error: no extended information';
      return element;
    }

    const sparklineContainerEl = this._dom.createChildOf(summary, 'div', 'lh-perf-hint__sparkline',
        tooltipAttrs);
    const sparklineEl = this._dom.createChildOf(sparklineContainerEl, 'div', 'lh-sparkline');
    const sparklineBarEl = this._dom.createChildOf(sparklineEl, 'div', 'lh-sparkline__bar');
    sparklineBarEl.style.width = audit.result.rawValue / scale * 100 + '%';

    const statsEl = this._dom.createChildOf(summary, 'div', 'lh-perf-hint__stats', tooltipAttrs);
    const statsMsEl = this._dom.createChildOf(statsEl, 'div', 'lh-perf-hint__primary-stat');
    statsMsEl.textContent = Util.formatMilliseconds(audit.result.rawValue);

    this._dom.createChildOf(summary, 'div', 'lh-toggle-arrow', {title: 'See resources'});

    if (extendedInfo.value.wastedKb) {
      const statsKbEl = this._dom.createChildOf(statsEl, 'div', 'lh-perf-hint__secondary-stat');
      statsKbEl.textContent = extendedInfo.value.wastedKb.toLocaleString() + ' KB';
    }

    const descriptionEl = this._dom.createChildOf(element, 'div', 'lh-perf-hint__description');
    descriptionEl.appendChild(this._dom.convertMarkdownLinkSnippets(audit.result.helpText));

    if (audit.result.details) {
      element.appendChild(this._detailsRenderer.render(audit.result.details));
    }

    return element;
  }

  /**
   * Renders the group container for a group of audits. Individual audit elements can be added
   * directly to the returned element.
   * @param {!ReportRenderer.GroupJSON} group
   * @return {!HTMLDetailsElement}
   */
  _renderAuditGroup(group) {
    const auditGroupElem = /** @type {!HTMLDetailsElement} */ (this._dom.createElement('details',
          'lh-audit-group lh-expandable-details'));
    const auditGroupHeader = this._dom.createElement('div',
          'lh-audit-group__header lh-expandable-details__header');
    auditGroupHeader.textContent = group.title;

    const auditGroupDescription = this._dom.createElement('div', 'lh-audit-group__description');
    auditGroupDescription.appendChild(this._dom.convertMarkdownLinkSnippets(group.description));

    const auditGroupSummary = this._dom.createElement('summary',
          'lh-audit-group__summary lh-expandable-details__summary');
    const auditGroupArrow = this._dom.createElement('div', 'lh-toggle-arrow', {
      title: 'See audits',
    });
    auditGroupSummary.appendChild(auditGroupHeader);
    auditGroupSummary.appendChild(auditGroupArrow);

    auditGroupElem.appendChild(auditGroupSummary);
    auditGroupElem.appendChild(auditGroupDescription);
    return auditGroupElem;
  }

  /**
   * @param {!Array<!Element>} elements
   * @return {!Element}
   */
  _renderPassedAuditsSection(elements) {
    const passedElem = this._dom.createElement('details', 'lh-passed-audits');
    const passedSummary = this._dom.createElement('summary', 'lh-passed-audits-summary');
    passedElem.appendChild(passedSummary);
    passedSummary.textContent = `View ${elements.length} passed items`;
    elements.forEach(elem => passedElem.appendChild(elem));
    return passedElem;
  }

  /**
   * @param {!Array<!ReportRenderer.AuditJSON>} manualAudits
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groupDefinitions
   * @param {!Element} element Parent container to add the manual audits to.
   */
  _renderManualAudits(manualAudits, groupDefinitions, element) {
    const auditsGroupedByGroup = /** @type {!Object<string,
        !Array<!ReportRenderer.AuditJSON>>} */ ({});
    manualAudits.forEach(audit => {
      const group = auditsGroupedByGroup[audit.group] || [];
      group.push(audit);
      auditsGroupedByGroup[audit.group] = group;
    });

    Object.keys(auditsGroupedByGroup).forEach(groupId => {
      const group = groupDefinitions[groupId];
      const auditGroupElem = this._renderAuditGroup(group);
      auditGroupElem.classList.add('lh-audit-group--manual');

      auditsGroupedByGroup[groupId].forEach(audit => {
        auditGroupElem.appendChild(this._renderAudit(audit));
      });

      element.appendChild(auditGroupElem);
    });
  }

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
    this._templateContext = context;
    this._detailsRenderer.setTemplateContext(context);
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!DocumentFragment}
   */
  renderScoreGauge(category) {
    const tmpl = this._dom.cloneTemplate('#tmpl-lh-gauge', this._templateContext);
    this._dom.find('.lh-gauge__wrapper', tmpl).href = `#${category.id}`;
    this._dom.find('.lh-gauge__label', tmpl).textContent = category.name;

    const score = Math.round(category.score);
    const fillRotation = Math.floor((score / 100) * 180);

    const gauge = this._dom.find('.lh-gauge', tmpl);
    gauge.setAttribute('data-progress', score); // .dataset not supported in jsdom.
    gauge.classList.add(`lh-gauge--${Util.calculateRating(score)}`);

    this._dom.findAll('.lh-gauge__fill', gauge).forEach(el => {
      el.style.transform = `rotate(${fillRotation}deg)`;
    });

    this._dom.find('.lh-gauge__mask--full', gauge).style.transform =
        `rotate(${fillRotation}deg)`;
    this._dom.find('.lh-gauge__fill--fix', gauge).style.transform =
        `rotate(${fillRotation * 2}deg)`;
    this._dom.find('.lh-gauge__percentage', gauge).textContent = score;

    return tmpl;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groups
   * @return {!Element}
   */
  render(category, groups) {
    switch (category.id) {
      case 'performance':
        return this._renderPerformanceCategory(category, groups);
      case 'accessibility':
        return this._renderAccessibilityCategory(category, groups);
      default:
        return this._renderDefaultCategory(category, groups);
    }
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groupDefinitions
   * @return {!Element}
   */
  _renderDefaultCategory(category, groupDefinitions) {
    const element = this._dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.appendChild(this._renderCategoryScore(category));

    const manualAudits = category.audits.filter(audit => audit.result.manual);
    const nonManualAudits = category.audits.filter(audit => !manualAudits.includes(audit));
    const passedAudits = nonManualAudits.filter(audit => audit.score === 100);
    const nonPassedAudits = nonManualAudits.filter(audit => !passedAudits.includes(audit));

    for (const audit of nonPassedAudits) {
      element.appendChild(this._renderAudit(audit));
    }

    // Create a passed section if there are passing audits.
    if (passedAudits.length) {
      const passedElements = passedAudits.map(audit => this._renderAudit(audit));
      const passedElem = this._renderPassedAuditsSection(passedElements);
      element.appendChild(passedElem);
    }

    // Render manual audits after passing.
    this._renderManualAudits(manualAudits, groupDefinitions, element);

    return element;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groups
   * @return {!Element}
   */
  _renderPerformanceCategory(category, groups) {
    const element = this._dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.appendChild(this._renderCategoryScore(category));

    const metricAudits = category.audits.filter(audit => audit.group === 'perf-metric');
    const metricAuditsEl = this._renderAuditGroup(groups['perf-metric']);
    const timelineContainerEl = this._dom.createChildOf(metricAuditsEl, 'div',
        'lh-timeline-container');
    const timelineEl = this._dom.createChildOf(timelineContainerEl, 'div', 'lh-timeline');

    let perfTimelineScale = 0;
    metricAudits.forEach(audit => {
      if (typeof audit.result.rawValue === 'number' && audit.result.rawValue) {
        perfTimelineScale = Math.max(perfTimelineScale, audit.result.rawValue);
      }
    });

    const thumbnailAudit = category.audits.find(audit => audit.id === 'screenshot-thumbnails');
    const thumbnailResult = thumbnailAudit && thumbnailAudit.result;
    if (thumbnailResult && thumbnailResult.details) {
      const thumbnailDetails = /** @type {!DetailsRenderer.FilmstripDetails} */
          (thumbnailResult.details);
      perfTimelineScale = Math.max(perfTimelineScale, thumbnailDetails.scale);
      const filmstripEl = this._detailsRenderer.render(thumbnailDetails);
      timelineEl.appendChild(filmstripEl);
    }

    metricAudits.forEach(item => {
      if (item.id === 'speed-index-metric' || item.id === 'estimated-input-latency') {
        return metricAuditsEl.appendChild(this._renderAudit(item));
      }

      timelineEl.appendChild(this._renderTimelineMetricAudit(item, perfTimelineScale));
    });

    metricAuditsEl.open = true;
    element.appendChild(metricAuditsEl);

    const hintAudits = category.audits
        .filter(audit => audit.group === 'perf-hint' && audit.score < 100)
        .sort((auditA, auditB) => auditB.result.rawValue - auditA.result.rawValue);
    if (hintAudits.length) {
      const maxWaste = Math.max(...hintAudits.map(audit => audit.result.rawValue));
      const scale = Math.ceil(maxWaste / 1000) * 1000;
      const hintAuditsEl = this._renderAuditGroup(groups['perf-hint']);
      hintAudits.forEach(item => hintAuditsEl.appendChild(this._renderPerfHintAudit(item, scale)));
      hintAuditsEl.open = true;
      element.appendChild(hintAuditsEl);
    }

    const infoAudits = category.audits
        .filter(audit => audit.group === 'perf-info' && audit.score < 100);
    if (infoAudits.length) {
      const infoAuditsEl = this._renderAuditGroup(groups['perf-info']);
      infoAudits.forEach(item => infoAuditsEl.appendChild(this._renderAudit(item)));
      infoAuditsEl.open = true;
      element.appendChild(infoAuditsEl);
    }

    const passedElements = category.audits
        .filter(audit => (audit.group === 'perf-hint' || audit.group === 'perf-info') &&
            audit.score === 100)
        .map(audit => this._renderAudit(audit));

    if (!passedElements.length) return element;

    const passedElem = this._renderPassedAuditsSection(passedElements);
    element.appendChild(passedElem);
    return element;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groupDefinitions
   * @return {!Element}
   */
  _renderAccessibilityCategory(category, groupDefinitions) {
    const element = this._dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.appendChild(this._renderCategoryScore(category));

    const auditsGroupedByGroup = /** @type {!Object<string,
        {passed: !Array<!ReportRenderer.AuditJSON>,
        failed: !Array<!ReportRenderer.AuditJSON>}>} */ ({});
    category.audits.forEach(audit => {
      const groupId = audit.group;
      const groups = auditsGroupedByGroup[groupId] || {passed: [], failed: []};

      if (audit.score === 100) {
        groups.passed.push(audit);
      } else {
        groups.failed.push(audit);
      }

      auditsGroupedByGroup[groupId] = groups;
    });

    const passedElements = /** @type {!Array<!Element>} */ ([]);
    Object.keys(auditsGroupedByGroup).forEach(groupId => {
      const group = groupDefinitions[groupId];
      const groups = auditsGroupedByGroup[groupId];
      if (groups.failed.length) {
        const auditGroupElem = this._renderAuditGroup(group);
        groups.failed.forEach(item => auditGroupElem.appendChild(this._renderAudit(item)));
        auditGroupElem.open = true;
        element.appendChild(auditGroupElem);
      }

      if (groups.passed.length) {
        const auditGroupElem = this._renderAuditGroup(group);
        groups.passed.forEach(item => auditGroupElem.appendChild(this._renderAudit(item)));
        passedElements.push(auditGroupElem);
      }
    });

    // don't create a passed section if there are no passed
    if (!passedElements.length) return element;

    const passedElem = this._renderPassedAuditsSection(passedElements);
    element.appendChild(passedElem);
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoryRenderer;
} else {
  self.CategoryRenderer = CategoryRenderer;
}


/**
 * @typedef {{
 *     value: {
 *       wastedMs: (number|undefined),
 *       wastedKb: (number|undefined),
 *     }
 * }}
 */
CategoryRenderer.PerfHintExtendedInfo; // eslint-disable-line no-unused-expressions
