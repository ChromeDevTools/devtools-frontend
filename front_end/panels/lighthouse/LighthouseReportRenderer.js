// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as LighthouseReport from '../../third_party/lighthouse/report/report.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
const { widget } = UI.Widget;
const MaxLengthForLinks = 40;
function renderContent(input) {
    switch (input.type) {
        case 'node':
            return html `${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {
                node: input.node,
                options: { tooltip: input.snippet },
            })}`;
        case 'source-location':
            return Components.Linkifier.Linkifier.renderLinkifiedUrl(input.url, {
                lineNumber: input.lineNumber,
                columnNumber: input.columnNumber,
                showColumnNumber: false,
                maxLength: MaxLengthForLinks,
            });
        case 'report': {
            if (!input.report) {
                return nothing;
            }
            const reportEl = LighthouseReport.renderReport(input.report, {
                disableDarkMode: true,
                onViewTrace: input.onViewTrace,
                onSaveFileOverride: input.onSaveFileOverride,
                onPrintOverride: input.onPrintOverride,
                getStandaloneReportHTML: input.getStandaloneReportHTML,
            });
            reportEl.classList.add('lh-devtools');
            reportEl.classList.toggle('lh-dark', input.darkMode);
            LighthouseReportRenderer.installVisualLogging(reportEl);
            return html `${reportEl}`;
        }
        default:
            Platform.assertNever(input, 'Unknown Lighthouse view input type');
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    render(renderContent(input), target);
};
export class LighthouseReportRenderer extends UI.Widget.Widget {
    #view;
    #report = null;
    #artifacts;
    #beforePrint;
    #afterPrint;
    #isRendered = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    get report() {
        return this.#report;
    }
    set report(report) {
        if (this.#report === report) {
            return;
        }
        this.#report = report;
        this.#isRendered = false;
        this.requestUpdate();
    }
    set artifacts(artifacts) {
        if (this.#artifacts === artifacts) {
            return;
        }
        this.#artifacts = artifacts;
        this.#isRendered = false;
        this.requestUpdate();
    }
    set beforePrint(beforePrint) {
        if (this.#beforePrint === beforePrint) {
            return;
        }
        this.#beforePrint = beforePrint;
        this.#isRendered = false;
        this.requestUpdate();
    }
    set afterPrint(afterPrint) {
        if (this.#afterPrint === afterPrint) {
            return;
        }
        this.#afterPrint = afterPrint;
        this.#isRendered = false;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#onThemeChange);
        this.#onThemeChange();
        if (!this.#isRendered) {
            this.requestUpdate();
        }
    }
    willHide() {
        ThemeSupport.ThemeSupport.instance().removeEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#onThemeChange);
        super.willHide();
    }
    #onThemeChange = () => {
        const darkMode = ThemeSupport.ThemeSupport.hasInstance() && ThemeSupport.ThemeSupport.instance().themeName() === 'dark';
        this.contentElement.querySelector('.lh-devtools')?.classList.toggle('lh-dark', darkMode);
    };
    performUpdate() {
        this.#isRendered = true;
        const darkMode = ThemeSupport.ThemeSupport.hasInstance() && ThemeSupport.ThemeSupport.instance().themeName() === 'dark';
        const reportOptions = LighthouseReportRenderer.#createReportOptions(this.#report, this.#artifacts, {
            beforePrint: this.#beforePrint,
            afterPrint: this.#afterPrint,
        });
        this.#view({ type: 'report', report: this.#report, darkMode, ...reportOptions }, undefined, this.contentElement);
        const reportEl = this.contentElement.querySelector('.lh-devtools');
        if (this.#report && reportEl) {
            LighthouseReportRenderer.#finalizeRenderedReport(reportEl, this.#report, this.#artifacts, this.#view);
        }
    }
    static #createReportOptions(lhr, artifacts, opts) {
        let onViewTrace = undefined;
        if (artifacts) {
            onViewTrace = async () => {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseViewTrace);
                const trace = new SDK.TraceObject.TraceObject(artifacts.Trace.traceEvents);
                void Common.Revealer.reveal(trace);
            };
        }
        async function onSaveFileOverride(blob) {
            if (!lhr) {
                return;
            }
            const domain = new Common.ParsedURL.ParsedURL(lhr.finalUrl || lhr.finalDisplayedUrl).domain();
            const sanitizedDomain = domain.replace(/[^a-z0-9.-]+/gi, '_');
            const timestamp = Platform.DateUtilities.toISO8601Compact(new Date(lhr.fetchTime));
            const ext = blob.type.match('json') ? '.json' : '.html';
            const basename = `${sanitizedDomain}-${timestamp}${ext}`;
            const base64 = await blob.arrayBuffer().then(Common.Base64.encode);
            await Workspace.FileManager.FileManager.instance().save(basename, new TextUtils.ContentData.ContentData(base64, /* isBase64= */ true, blob.type), 
            /* forceSaveAs=*/ true);
            Workspace.FileManager.FileManager.instance().close(basename);
        }
        async function onPrintOverride(rootEl) {
            const clonedReport = rootEl.cloneNode(true);
            const printWindow = window.open('', '_blank', 'channelmode=1,status=1,resizable=1');
            if (!printWindow) {
                return;
            }
            printWindow.document.body.replaceWith(clonedReport);
            await LighthouseReportRenderer.linkifyNodeDetails(clonedReport);
            opts?.beforePrint?.();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
            opts?.afterPrint?.();
        }
        function getStandaloneReportHTML() {
            // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
            return Lighthouse.ReportGenerator.ReportGenerator.generateReportHtml(lhr);
        }
        return { onViewTrace, onSaveFileOverride, onPrintOverride, getStandaloneReportHTML };
    }
    static #finalizeRenderedReport(reportEl, lhr, artifacts, view = DEFAULT_VIEW) {
        // @ts-expect-error Expose LHR on DOM for e2e tests
        reportEl._lighthouseResultForTesting = lhr;
        // @ts-expect-error Expose Artifacts on DOM for e2e tests
        reportEl._lighthouseArtifactsForTesting = artifacts;
        void LighthouseReportRenderer.waitForMainTargetLoad().then(() => {
            void LighthouseReportRenderer.linkifyNodeDetails(reportEl, view);
            void LighthouseReportRenderer.linkifySourceLocationDetails(reportEl, view);
        });
    }
    static renderLighthouseReport(lhr, artifacts, opts) {
        const reportOptions = LighthouseReportRenderer.#createReportOptions(lhr, artifacts, opts);
        const reportEl = LighthouseReport.renderReport(lhr, {
            disableDarkMode: true,
            ...reportOptions,
        });
        reportEl.classList.add('lh-devtools');
        const updateDarkModeIfNecessary = () => {
            reportEl.classList.toggle('lh-dark', ThemeSupport.ThemeSupport.instance().themeName() === 'dark');
        };
        ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, updateDarkModeIfNecessary);
        updateDarkModeIfNecessary();
        LighthouseReportRenderer.installVisualLogging(reportEl);
        LighthouseReportRenderer.#finalizeRenderedReport(reportEl, lhr, artifacts);
        return reportEl;
    }
    /**
     * Renders only the score gauges component of the Lighthouse report, stripping out
     * topbar, categories, and footer. Used by the Lighthouse report walkthrough widget.
     *
     * The Lighthouse renderer places the gauges differently depending on the number of categories:
     * - Multiple categories: a `.lh-scores-header` row at the top holds one gauge per category.
     * - Single category: the renderer skips `.lh-scores-header`, so the only gauge is the one in the
     *   category's own section heading (`.lh-category-header .lh-score__gauge`).
     *
     * Returns null if neither element exists. This happens for single-category performance reports in
     * navigation mode, because the Lighthouse performance renderer replaces `.lh-score__gauge` in its
     * section heading with a larger animated gauge, which this widget does not use.
     */
    static renderLighthouseScores(lhr) {
        // Ideally, we would only render the scores header, but since it's imported from lighthouse
        // and it doesn't expose a way to render only the scores header, we render the full report
        // and strip out the other components.
        const reportEl = LighthouseReportRenderer.renderLighthouseReport(lhr);
        const reportContainer = reportEl.querySelector('.lh-container');
        const scores = reportEl.querySelector('.lh-scores-header') ?? reportEl.querySelector('.lh-category-header .lh-score__gauge');
        if (!scores || !reportContainer) {
            return null;
        }
        reportContainer.replaceChildren(scores);
        const topbar = reportEl.querySelector('.lh-topbar');
        topbar?.remove();
        return reportEl;
    }
    static async waitForMainTargetLoad() {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
        if (!resourceTreeModel) {
            return;
        }
        await resourceTreeModel.once(SDK.ResourceTreeModel.Events.Load);
    }
    static async linkifyNodeDetails(el, view = DEFAULT_VIEW) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        const domModel = mainTarget.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return;
        }
        for (const origElement of el.getElementsByClassName('lh-node')) {
            const origHTMLElement = origElement;
            const detailsItem = origHTMLElement.dataset;
            if (!detailsItem.path) {
                continue;
            }
            const nodeId = await domModel.pushNodeByPathToFrontend(detailsItem.path);
            if (!nodeId) {
                continue;
            }
            const node = domModel.nodeForId(nodeId);
            if (!node) {
                continue;
            }
            UI.Tooltip.Tooltip.install(origHTMLElement, '');
            const screenshotElement = origHTMLElement.querySelector('.lh-element-screenshot');
            const linkContainer = document.createElement('span');
            origHTMLElement.replaceChildren(...(screenshotElement ? [screenshotElement] : []), linkContainer);
            view({ type: 'node', node, snippet: detailsItem.snippet }, undefined, linkContainer);
        }
    }
    static async linkifySourceLocationDetails(el, view = DEFAULT_VIEW) {
        for (const origElement of el.getElementsByClassName('lh-source-location')) {
            const origHTMLElement = origElement;
            const detailsItem = origHTMLElement.dataset;
            if (!detailsItem.sourceUrl || !detailsItem.sourceLine || !detailsItem.sourceColumn) {
                continue;
            }
            UI.Tooltip.Tooltip.install(origHTMLElement, '');
            origHTMLElement.replaceChildren();
            view({
                type: 'source-location',
                url: detailsItem.sourceUrl,
                lineNumber: Number(detailsItem.sourceLine),
                columnNumber: Number(detailsItem.sourceColumn),
            }, undefined, origHTMLElement);
        }
    }
    static installVisualLogging(el) {
        for (const auditEl of el.getElementsByClassName('lh-audit')) {
            const summaryEl = auditEl.querySelector('summary');
            if (!summaryEl) {
                continue;
            }
            const id = auditEl.id;
            if (!id) {
                continue;
            }
            auditEl.setAttribute('jslog', `${VisualLogging.item(`lighthouse.audit.${id}`).track({ resize: true })}`);
            let state;
            for (const className of auditEl.classList) {
                switch (className) {
                    case 'lh-audit--pass':
                        state = 'pass';
                        break;
                    case 'lh-audit--average':
                        state = 'average';
                        break;
                    case 'lh-audit--fail':
                        state = 'fail';
                        break;
                    case 'lh-audit--informative':
                        state = 'informative';
                        break;
                }
            }
            if (!state) {
                continue;
            }
            summaryEl.setAttribute('jslog', `${VisualLogging.expand(`lighthouse.audit-summary.${state}`).track({ click: true })}`);
        }
    }
}
//# sourceMappingURL=LighthouseReportRenderer.js.map