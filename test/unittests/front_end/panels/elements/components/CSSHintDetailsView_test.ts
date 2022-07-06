// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import type * as ElementsModule from '../../../../../../front_end/panels/elements/elements.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const {assert} = chai;

describeWithEnvironment('CSSHintDetailsView', async () => {
    let Elements: typeof ElementsModule;

    before(async () => {
        Elements = await import('../../../../../../front_end/panels/elements/elements.js');
    });

    it('renders every section', async () => {
        const hintMessage = new Elements.CSSRuleValidator.AuthoringHint(
            'align-content',
            Elements.CSSRuleValidator.AuthoringHintType.RULE_VALIDATION,
            'This element has <code class="unbreakable-text"><span class="property">flex-wrap</span>: nowrap</code> rule, therefore <code class="unbreakable-text"><span class="property">align-content</span></code> has no effect.',
            'For this property to work, please remove or change the value of <code class="unbreakable-text"><span class="property">flex-wrap</span></code> rule.',
            true,
        );

        const popupComponent = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hintMessage);
        renderElementIntoDOM(popupComponent);

        assertShadowRoot(popupComponent.shadowRoot);

        const shadowRoot = popupComponent.shadowRoot;

        const popupReasonRendered = shadowRoot.querySelector('.hint-popup-reason') !== null;
        const popupPossibleFixRendered = shadowRoot.querySelector('.hint-popup-possible-fix') !== null;
        const popupLearnMoreRendered = shadowRoot.querySelector('#learn-more') !== null;

        assert.isTrue(popupReasonRendered);
        assert.isTrue(popupPossibleFixRendered);
        assert.isTrue(popupLearnMoreRendered);
    });

    it('does not render learn more', async () => {
        const hintMessage = new Elements.CSSRuleValidator.AuthoringHint(
            'align-content',
            Elements.CSSRuleValidator.AuthoringHintType.RULE_VALIDATION,
            'This element has <code class="unbreakable-text"><span class="property">flex-wrap</span>: nowrap</code> rule, therefore <code class="unbreakable-text"><span class="property">align-content</span></code> has no effect.',
            'For this property to work, please remove or change the value of <code class="unbreakable-text"><span class="property">flex-wrap</span></code> rule.',
            false,
        );

        const popupComponent = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hintMessage);
        renderElementIntoDOM(popupComponent);

        assertShadowRoot(popupComponent.shadowRoot);

        const shadowRoot = popupComponent.shadowRoot;

        const popupReasonRendered = shadowRoot.querySelector('.hint-popup-reason') !== null;
        const popupPossibleFixRendered = shadowRoot.querySelector('.hint-popup-possible-fix') !== null;
        const popupLearnMoreRendered = shadowRoot.querySelector('#learn-more') !== null;

        assert.isTrue(popupReasonRendered);
        assert.isTrue(popupPossibleFixRendered);
        assert.isFalse(popupLearnMoreRendered);
    });
});
