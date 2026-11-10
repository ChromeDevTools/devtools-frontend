// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import {resolve} from 'node:path';
import stylelint from 'stylelint';

const configBase = {
  config: {
    plugins: [resolve(import.meta.dirname, '../lib/check_scope_selectors.mjs')],
    rules: {'plugin/check_scope_selectors': [true]},
  },
};

async function lintAndGetWarnings(code) {
  const {
    results: [{warnings}],
  } = await stylelint.lint({
    code,
    ...configBase,
  });
  return warnings;
}

const createExpectedError = selector => `Unexpected selector "${
    selector}" inside @scope. Selectors targeting host, root, html, body, theme, or platform classes cannot match inside @scope without :scope or &. (plugin/check_scope_selectors)`;

function assertWarnings(warnings, expectedSelectors) {
  assert.deepEqual(
      warnings.map(w => w.text),
      expectedSelectors.map(createExpectedError),
  );
  for (const warning of warnings) {
    assert.strictEqual(warning.rule, 'plugin/check_scope_selectors');
    assert.strictEqual(warning.severity, 'error');
  }
}

describe('check_scope_selectors', () => {
  describe('flagging offending selectors inside @scope', () => {
    it('flags :host inside @scope', async () => {
      const code = `@scope {
  :host {
    display: block;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, [
        {
          column: 3,
          line: 2,
          endColumn: 8,
          endLine: 2,
          rule: 'plugin/check_scope_selectors',
          severity: 'error',
          text: createExpectedError(':host'),
          url: undefined,
          fix: undefined,
        },
      ]);
    });

    it('flags :host(.foo) inside @scope', async () => {
      const code = `@scope {
  :host(.foo) {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host(.foo)']);
    });

    it('flags :host-context(.theme-with-dark-background) .x inside @scope', async () => {
      const code = `@scope {
  :host-context(.theme-with-dark-background) .x {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host-context(.theme-with-dark-background) .x']);
    });

    it('flags :root inside @scope', async () => {
      const code = `@scope {
  :root {
    margin: 0;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':root']);
    });

    it('flags html .x inside @scope', async () => {
      const code = `@scope {
  html .x {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, ['html .x']);
    });

    it('flags body .x inside @scope', async () => {
      const code = `@scope {
  body .x {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, ['body .x']);
    });

    it('flags .theme-with-dark-background .x inside @scope', async () => {
      const code = `@scope {
  .theme-with-dark-background .x {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, ['.theme-with-dark-background .x']);
    });

    it('flags platform classes inside @scope', async () => {
      const platforms = ['mac', 'windows', 'linux', 'chromeos', 'android'];
      for (const platform of platforms) {
        const code = `@scope {
  .platform-${platform} {
    color: red;
  }
}`;
        const warnings = await lintAndGetWarnings(code);
        assertWarnings(warnings, [`.platform-${platform}`]);
      }
    });

    it('flags .overlay-scrollbar-enabled inside @scope', async () => {
      const code = `@scope {
  .overlay-scrollbar-enabled .scroll-area {
    scrollbar-width: thin;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, ['.overlay-scrollbar-enabled .scroll-area']);
    });

    it('flags bare :host even when accompanied by :scope or &', async () => {
      const code = `@scope {
  :host & {
    color: red;
  }
  & :host {
    color: green;
  }
  :scope :host {
    color: blue;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host &', '& :host', ':scope :host']);
    });

    it('flags offending selectors in @scope to (...)', async () => {
      const code = `@scope to (devtools-widget > *) {
  :host {
    display: flex;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host']);
    });

    it('flags offending selectors in @scope (...)', async () => {
      const code = `@scope (.insight-sources) {
  :root {
    display: block;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':root']);
    });

    it('flags offending selectors in nested @scope', async () => {
      const code = `@scope {
  @scope (.child) {
    :host {
      display: block;
    }
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host']);
    });

    it('flags offending selectors inside @media inside @scope', async () => {
      const code = `@scope {
  @media (prefers-color-scheme: dark) {
    :host {
      display: block;
    }
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host']);
    });
  });

  describe('multi-selector rules', () => {
    it('reports only offending selector in comma-separated list on one line', async () => {
      const code = `@scope {
  .valid, :host {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host']);
    });

    it('reports multiple offending selectors in multi-line comma-separated list', async () => {
      const code = `@scope {
  .theme-with-dark-background .timeline-details-warning,
  :host-context(.theme-with-dark-background) .timeline-details-warning {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [
        '.theme-with-dark-background .timeline-details-warning',
        ':host-context(.theme-with-dark-background) .timeline-details-warning',
      ]);
    });

    it('ignores valid sibling selectors while flagging offending one', async () => {
      const code = `@scope {
  .item,
  .theme-with-dark-background .item,
  .another-valid {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, ['.theme-with-dark-background .item']);
    });
  });

  describe('allowing selectors outside @scope', () => {
    it('allows :host, :root, html, body, theme and platform selectors outside @scope', async () => {
      const code = `
:host { display: block; }
:host(.foo) { color: red; }
:host-context(.theme-with-dark-background) .x { color: red; }
:root { margin: 0; }
html .x { color: red; }
body .x { color: red; }
.theme-with-dark-background .x { color: red; }
.platform-mac { color: red; }
.platform-windows { color: red; }
.platform-linux { color: red; }
.platform-chromeos { color: red; }
.platform-android { color: red; }
`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });
  });

  describe('allowing selectors inside @scope with :scope or &', () => {
    it('allows bare :scope', async () => {
      const code = `@scope {
  :scope {
    display: block;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });

    it('allows selector with :scope descendant or ancestor combinator', async () => {
      const code = `@scope {
  .theme-with-dark-background :scope .x {
    color: red;
  }
  :scope ul {
    color: blue;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });

    it('allows selector with & combinator', async () => {
      const code = `@scope {
  :host-context(.theme-with-dark-background) & .x {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });

    it('allows nested CSS rules referencing parent with &', async () => {
      const code = `@scope {
  .foo {
    .theme-with-dark-background & {
      color: red;
    }
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });
  });

  describe('allowing non-offending names inside @scope', () => {
    it('allows class names and tags with substring matches', async () => {
      const code = `@scope {
  .platform-fonts {
    flex-shrink: 0;
  }
  .body-row {
    display: flex;
  }
  .html-tag {
    color: blue;
  }
  devtools-body {
    display: block;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });

    it('allows attribute selectors with quoted strings matching target names', async () => {
      const code = `@scope {
  [data-tag="body"] {
    color: green;
  }
  [title=":host"] {
    color: green;
  }
  [data-platform='platform-mac'] {
    color: green;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });
  });

  describe('ignoring @keyframes inside @scope', () => {
    it('ignores @keyframes selectors inside @scope', async () => {
      const code = `@scope {
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });

    it('ignores vendor-prefixed @keyframes selectors inside @scope', async () => {
      const code = `@scope {
  @-webkit-keyframes fade {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });
  });

  describe('handling CSS comments in selectors', () => {
    it('does not allow CSS comments containing & to bypass checks', async () => {
      const code = `@scope {
  /* & */ :host {
    display: block;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assertWarnings(warnings, [':host']);
    });

    it('does not false-positive on comments containing offending keywords', async () => {
      const code = `@scope {
  .first,
  /* replace :host with :scope */
  .second {
    color: red;
  }
}`;
      const warnings = await lintAndGetWarnings(code);
      assert.deepEqual(warnings, []);
    });
  });
});
