/**
 * Copyright 2022 Google Inc. All rights reserved.
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
import { BrowserContext as BrowserContextBase } from '../../api/BrowserContext.js';
/**
 * @internal
 */
export class BrowserContext extends BrowserContextBase {
    #browser;
    #connection;
    #defaultViewport;
    #isDefault = false;
    constructor(browser, options) {
        super();
        this.#browser = browser;
        this.#connection = this.#browser.connection;
        this.#defaultViewport = options.defaultViewport;
        this.#isDefault = options.isDefault;
    }
    targets() {
        return this.#browser.targets().filter(target => {
            return target.browserContext() === this;
        });
    }
    waitForTarget(predicate, options = {}) {
        return this.#browser.waitForTarget(target => {
            return target.browserContext() === this && predicate(target);
        }, options);
    }
    get connection() {
        return this.#connection;
    }
    async newPage() {
        const { result } = await this.#connection.send('browsingContext.create', {
            type: "tab" /* Bidi.BrowsingContext.CreateType.Tab */,
        });
        const target = this.#browser._getTargetById(result.context);
        // TODO: once BiDi has some concept matching BrowserContext, the newly
        // created contexts should get automatically assigned to the right
        // BrowserContext. For now, we assume that only explicitly created pages go
        // to the current BrowserContext. Otherwise, the contexts get assigned to
        // the default BrowserContext by the Browser.
        target._setBrowserContext(this);
        const page = await target.page();
        if (!page) {
            throw new Error('Page is not found');
        }
        if (this.#defaultViewport) {
            try {
                await page.setViewport(this.#defaultViewport);
            }
            catch {
                // No support for setViewport in Firefox.
            }
        }
        return page;
    }
    async close() {
        if (this.#isDefault) {
            throw new Error('Default context cannot be closed!');
        }
        await this.#browser._closeContext(this);
    }
    browser() {
        return this.#browser;
    }
    async pages() {
        const results = await Promise.all([...this.targets()].map(t => {
            return t.page();
        }));
        return results.filter((p) => {
            return p !== null;
        });
    }
    isIncognito() {
        return !this.#isDefault;
    }
}
//# sourceMappingURL=BrowserContext.js.map