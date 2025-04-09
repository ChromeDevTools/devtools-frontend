// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-imperative-dom-api.ts';

import {RuleTester} from './utils/tsUtils.ts';

new RuleTester().run('no-imperative-dom-api', rule, {
  valid: [
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `class SomeWidget extends UI.Widget.Widget {
          constructor() {
            super();
            this.someElement.className = 'some-class';
          }
      }`,
    },
  ],

  invalid: [
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `class SomeWidget extends UI.Widget.Widget {
          constructor() {
            super();
            this.element.className = 'some-class';
          }
      }`,
      output: `
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div class="some-class"></div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
          constructor() {
            super();
          }
      }`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.appendChild(document.createElement('div'));
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div></div>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.className = 'some-class';
    this.contentElement.setAttribute('aria-label', 'some-label');
    this.contentElement.textContent = 'some-text';
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div class="some-class" aria-label="some-label">some-text</div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.container = this.contentElement.createChild('div', 'some-class');
    this.container.classList.add('container');
    this.container.addEventListener('click', this.onClick.bind(this));
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div class="some-class container" @click=\${this.onClick.bind(this)}></div>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.style.width = '100%';
    this.contentElement.style.marginLeft = '10px';
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div style="width:100%; margin-left:10px"></div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const div = document.createElement('div');
    div.className = 'some-class';
    this.contentElement.appendChild(div);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div class="some-class"></div>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.createChild('span', 'some-class');
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <span class="some-class"></span>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const filterInput = new UI.Toolbar.ToolbarFilter('some-placeholder', 0.5, 1, undefined, this.complete.bind(this), false, 'some-filter');
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged.bind(this));
    toolbar.appendToolbarItem(filterInput);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-toolbar-input type="filter" placeholder="some-placeholder" list="completions"
            id="some-filter" @change=\${this.onFilterChanged.bind(this)}
            style="flex-grow:0.5; flex-shrink:1">
          <datalist id="completions">\${this.complete.bind(this)}</datalist>
        </devtools-toolbar-input>
      </devtools-toolbar>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const filterInput = new UI.Toolbar.ToolbarInput('some-placeholder', 'accessible-placeholder', 0.5, 1);
    toolbar.appendToolbarItem(filterInput);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-toolbar-input type="text" placeholder="some-placeholder"
            aria-label="accessible-placeholder" style="flex-grow:0.5; flex-shrink:1"></devtools-toolbar-input>
      </devtools-toolbar>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const adornerContent = document.createElement('span');
    adornerContent.innerHTML = '<div style="font-size: 12px;">💫</div>';
    const adorner = new Adorners.Adorner.Adorner();
    adorner.classList.add('fix-perf-icon');
    adorner.data = {
      name: i18nString(UIStrings.fixMe),
      content: adornerContent,
      jslogContext: 'fix-perf',
    };
    this.contentElement.appendChild(adorner);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-adorner class="fix-perf-icon" aria-label=\${i18nString(UIStrings.fixMe)}
          jslog=\${VisualLogging.adorner('fix-perf')}>
        <span><div style="font-size: 12px;">💫</div></span>
      </devtools-adorner>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const filterInput = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    toolbar.appendToolbarItem(filterInput);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-button title=\${i18nString(UIStrings.editName)}
            .variant=\${Buttons.Button.Variant.TOOLBAR} .iconName=\${'edit'}
            .jslogContext=\${'edit-name'}></devtools-button>
      </devtools-toolbar>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class Widget1 extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.createChild('div', 'widget1');
  }
}

class Widget2 extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.createChild('div', 'widget2');
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div class="widget1"></div>
    </div>\`,
    target, {host: input});
};

class Widget1 extends UI.Widget.Widget {
  constructor() {
    super();
  }
}


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div class="widget2"></div>
    </div>\`,
    target, {host: input});
};

class Widget2 extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}, {messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const filterInput = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    toolbar.appendToolbarItem(filterInput);
    const anotherElement = document.createElement('div');
    anotherElement.className = 'another-element';
    this.process(filterInput, anotherElement);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-button title=\${i18nString(UIStrings.editName)}
            .variant=\${Buttons.Button.Variant.TOOLBAR} .iconName=\${'edit'}
            .jslogContext=\${'edit-name'}></devtools-button>
      </devtools-toolbar>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const filterInput = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    const anotherElement = html\`
    <div class="another-element"></div>\`;
    this.process(filterInput, anotherElement);
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}, {messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor(label: HTMLElement, details: HTMLElement) {
    super();
    this.contentElement.appendChild(label);
    label.addEventListener('click', () => this.doSomething.bind(this));
    this.contentElement.appendChild(details);
    details.createChild('span');
    const banner = createBanner();
    this.contentElement.appendChild(banner);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      \${label}
      \${details}
      \${createBanner()}
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor(label: HTMLElement, details: HTMLElement) {
    super();
    label.addEventListener('click', () => this.doSomething.bind(this));
    details.createChild('span');
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'some-placeholder';
    input.value = 'some-value';
    input.disabled = !this.enabled;
    input.checked = true
    this.contentElement.append(input);

    const anchor = document.createElement('a');
    anchor.href = 'https://www.google.com';
    anchor.innerText = 'some-text';
    anchor.dataset.someKey = 'some-value';
    anchor.role = 'some-role';
    this.contentElement.insertBefore(anchor, input);

    const img = document.createElement('img');
    img.src = 'https://www.google.com/some-image.png';
    img.alt = 'some-alt';
    img.draggable = true;
    img.height = 100;
    img.hidden = 'hidden';
    img.href = 'https://www.google.com';
    img.id = 'some-id';
    img.name = 'some-name';
    img.rel = 'some-rel';
    img.scope = 'some-scope';

    input.insertAdjacentElement('beforebegin', img);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <a href="https://www.google.com" data-some-key="some-value" role="some-role">some-text</a>
      <img src="https://www.google.com/some-image.png" alt="some-alt" draggable="true" height="100"
          hidden="hidden" href="https://www.google.com" id="some-id" name="some-name" rel="some-rel"
          scope="some-scope"></img>
      <input type="text" placeholder="some-placeholder" value="some-value"
          ?disabled=\${!this.enabled} ?checked=\${true}></input>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    this.filterInput = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    toolbar.appendToolbarItem(this.filterInput);
    this.#banner = this.contentElement.createChild('div', 'banner');
    this.#banner.textContent = 'some-text';
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-button title=\${i18nString(UIStrings.editName)}
            .variant=\${Buttons.Button.Variant.TOOLBAR} .iconName=\${'edit'}
            .jslogContext=\${'edit-name'}></devtools-button>
      </devtools-toolbar>
      <div class="banner">some-text</div>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
  ],
});
