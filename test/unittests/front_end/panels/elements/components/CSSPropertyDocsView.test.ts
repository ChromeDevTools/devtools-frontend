// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('CSSPropertyDocsView', async () => {
  it('renders every section', async () => {
    const cssProperty = {
      'name': 'display',
      'description':
          'In combination with \'float\' and \'position\', determines the type of box or boxes that are generated for an element.',
      'syntax':
          '[ <display-outside> || <display-inside> ] | <display-listitem> | <display-internal> | <display-box> | <display-legacy>',
      'references': [
        {
          'name': 'MDN Reference',
          'url': 'https://developer.mozilla.org/docs/Web/CSS/display',
        },
      ],
    };

    const popupComponent = new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(cssProperty);
    renderElementIntoDOM(popupComponent);

    assertShadowRoot(popupComponent.shadowRoot);

    const shadowRoot = popupComponent.shadowRoot;

    const popupDescriptionRendered = shadowRoot.querySelector('#description') !== null;
    const popupLearnMoreRendered = shadowRoot.querySelector('#learn-more') !== null;

    assert.isTrue(popupDescriptionRendered);
    assert.isTrue(popupLearnMoreRendered);
  });
});
