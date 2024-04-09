// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Elements from '../elements.js';

import * as ElementsComponents from './components.js';

describeWithEnvironment('CSSHintDetailsView', () => {
  it('renders every section', async () => {
    const hintMessage = new Elements.CSSRuleValidator.Hint(
        'This element has <code class="unbreakable-text"><span class="property">flex-wrap</span>: nowrap</code> rule, therefore <code class="unbreakable-text"><span class="property">align-content</span></code> has no effect.',
        'For this property to work, please remove or change the value of <code class="unbreakable-text"><span class="property">flex-wrap</span></code> rule.',
        'align-content',
    );

    const popupComponent = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hintMessage);
    renderElementIntoDOM(popupComponent);

    assert.isNotNull(popupComponent.shadowRoot!.querySelector('.hint-popup-reason'));
    assert.isNotNull(popupComponent.shadowRoot!.querySelector('.hint-popup-possible-fix'));
    assert.isNotNull(popupComponent.shadowRoot!.querySelector('#learn-more'));
  });

  it('does not render learn more', async () => {
    const hint = new Elements.CSSRuleValidator.Hint(
        'This element has <code class="unbreakable-text"><span class="property">flex-wrap</span>: nowrap</code> rule, therefore <code class="unbreakable-text"><span class="property">align-content</span></code> has no effect.',
        'For this property to work, please remove or change the value of <code class="unbreakable-text"><span class="property">flex-wrap</span></code> rule.',
    );

    const popupComponent = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hint);
    renderElementIntoDOM(popupComponent);

    assert.isNotNull(popupComponent.shadowRoot!.querySelector('.hint-popup-reason'));
    assert.isNotNull(popupComponent.shadowRoot!.querySelector('.hint-popup-possible-fix'));
    assert.isNull(popupComponent.shadowRoot!.querySelector('#learn-more'));
  });
});
