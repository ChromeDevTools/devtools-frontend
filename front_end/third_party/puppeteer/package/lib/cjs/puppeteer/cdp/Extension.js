"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpExtension = void 0;
const api_js_1 = require("../api/api.js");
const util_js_1 = require("../common/util.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Connection_js_1 = require("./Connection.js");
class CdpExtension extends api_js_1.Extension {
    // needed to access the CDPSession to trigger an extension action.
    #browser;
    /*
     * @internal
     */
    constructor(id, version, name, browser) {
        super(id, version, name);
        this.#browser = browser;
    }
    async workers() {
        const targets = this.#browser.targets();
        const extensionWorkers = targets.filter((target) => {
            const targetUrl = target.url();
            return (target.type() === 'service_worker' &&
                targetUrl.startsWith('chrome-extension://' + this.id));
        });
        const workers = [];
        for (const target of extensionWorkers) {
            try {
                const worker = await target.worker();
                if (worker) {
                    workers.push(worker);
                }
            }
            catch (err) {
                if (this.#canIgnoreError(err)) {
                    (0, util_js_1.debugError)(err);
                    continue;
                }
                throw err;
            }
        }
        return workers;
    }
    async pages() {
        const targets = this.#browser.targets();
        const extensionPages = targets.filter((target) => {
            const targetUrl = target.url();
            return ((target.type() === 'page' || target.type() === 'background_page') &&
                targetUrl.startsWith('chrome-extension://' + this.id));
        });
        const pages = await Promise.all(extensionPages.map(async (target) => {
            try {
                return await target.asPage();
            }
            catch (err) {
                if (this.#canIgnoreError(err)) {
                    (0, util_js_1.debugError)(err);
                    return null;
                }
                throw err;
            }
        }));
        return pages.filter((page) => {
            return page !== null;
        });
    }
    async triggerAction(page) {
        await this.#browser._connection.send('Extensions.triggerAction', {
            id: this.id,
            targetId: page._tabId,
        });
    }
    #canIgnoreError(error) {
        return ((0, ErrorLike_js_1.isErrorLike)(error) &&
            ((0, Connection_js_1.isTargetClosedError)(error) ||
                error.message.includes('No target with given id found')));
    }
}
exports.CdpExtension = CdpExtension;
//# sourceMappingURL=Extension.js.map