// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-imperative-dom-api.ts';

import {RuleTester} from './utils/RuleTester.ts';

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
    this.contentElement.createChild('span', 'some-class').textContent = 'some-text';
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <span class="some-class">some-text</span>
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
    filterInput.element.classList.add('completions');
    filterInput.element.setAttribute('aria-hidden', 'true');
    toolbar.appendToolbarItem(filterInput);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-toolbar-input class="completions" type="filter" placeholder="some-placeholder"
            list="completions" id="some-filter" aria-hidden="true"
            @change=\${this.onFilterChanged.bind(this)} style="flex-grow:0.5; flex-shrink:1">
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
    const editButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    editButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.onClick.bind(this));
    toolbar.appendToolbarItem(editButton);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-toolbar>
        <devtools-button title=\${i18nString(UIStrings.editName)} @click=\${this.onClick.bind(this)}
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
    this.footer = createFooter();
    this.contentElement.appendChild(this.footer);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      \${label}
      \${details}
      \${createBanner()}
      \${createFooter()}
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
          ?disabled=\${!this.enabled} checked>
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
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const select = document.createElement('select');
    select.add(UI.UIUtils.createOption('Option 1', '1', 'option-1'));
    this.contentElement.appendChild(UI.UIUtils.createLabel('Some label:', 'some-label', select));
    this.contentElement.appendChild(UI.UIUtils.createTextButton('Some button', onClick, {
      className: 'some-class',
      jslogContext: 'some-button',
      variant: Buttons.Button.Variant.PRIMARY,
      title: i18nString(UIStrings.someTitle),
      iconName: 'some-icon'
    }));
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <label class="some-label">Some label:
        <select>
          <option value="1" jslog=\${VisualLogging.dropDown('1').track({click: true})}>Option 1</option>
        </select>
      </label>
      <devtools-button class="some-class" title=\${i18nString(UIStrings.someTitle)} @click=\${onClick}
          .jslogContext=\${'some-button'} .variant=\${Buttons.Button.Variant.PRIMARY}>Some button</devtools-button>
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
    UI.UIUtils.createTextChild(this.contentElement.createChild('div', 'some-class'), 'some-text');
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div class="some-class">some-text</div>
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
    this.button = new Buttons.Button.Button();
    this.button.data = {
      jslogContext: 'some-button',
      variant: Buttons.Button.Variant.PRIMARY,
      title: i18nString(UIStrings.someTitle),
    };
    UI.ARIAUtils.markAsPresentation(this.button);
    UI.Tooltip.Tooltip.install(this.button, i18nString(UIStrings.someTooltip));
  }
}`,
      output: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.button = html\`
    <devtools-button role="presentation" title=\${i18nString(UIStrings.someTooltip)}
        .data=\${{
      jslogContext: 'some-button',
      variant: Buttons.Button.Variant.PRIMARY,
      title: i18nString(UIStrings.someTitle),
    }}
    ></devtools-button>\`;
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
    const icon = new IconButton.Icon.Icon();
    icon.data = {iconName: 'checkmark', color: 'var(--icon-checkmark-green)', width: '14px', height: '14px'};
    this.contentElement.appendChild(icon);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-icon name="checkmark"
          style="color:var(--icon-checkmark-green); width:14px; height:14px"></devtools-icon>
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
    this.contentElement.appendChild(UI.UIUtils.CheckboxLabel.create(
          i18nString(UIStrings.someTitle), true, i18nString(UIStrings.someTooltip),
          undefined, 'some-checkbox', true));
    this.contentElement.appendChild(UI.UIUtils.CheckboxLabel.create());
    this.contentElement.appendChild(UI.UIUtils.CheckboxLabel.createWithStringLiteral(
        ':hover', undefined, undefined, 'some-other-checkbox'));

    const toolbar = this.contentElement.createChild('devtools-toolbar');
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.someToolbarTitle), i18nString(UIStrings.someToolbarTooltip),
        this.someToolbarCheckboxClicked.bind(this), 'some-toolbar-checkbox'));
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.someSetting, i18nString(UIStrings.someToolbarTooltip), i18nString(UIStrings.alternateToolbarTitle)));
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(this.someOtherSetting));
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-checkbox class="small" checked>\${i18nString(UIStrings.someTitle)}</devtools-checkbox>
      <devtools-checkbox></devtools-checkbox>
      <devtools-checkbox class="small">:hover</devtools-checkbox>
      <devtools-toolbar>
        <devtools-checkbox title=\${i18nString(UIStrings.someToolbarTooltip)}
            @click=\${this.someToolbarCheckboxClicked.bind(this)}
            .jslogContext=\${'some-toolbar-checkbox'}>\${i18nString(UIStrings.someToolbarTitle)}</devtools-checkbox>
        <devtools-checkbox title=\${i18nString(UIStrings.someToolbarTooltip)}
            \${bindToSetting(this.someSetting)}>\${i18nString(UIStrings.alternateToolbarTitle)}</devtools-checkbox>
        <devtools-checkbox \${bindToSetting(this.someOtherSetting)}>\${this.someOtherSetting.title()}</devtools-checkbox>
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
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', '');
    iframe.tabIndex = -1;
    this.contentElement.appendChild(iframe);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <iframe sandbox tabindex="-1"></iframe>
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
    this.contentElement.appendChild(UI.UIUtils.createInput('add-source-map', 'text', 'url'));
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <input class="harmony-input add-source-map" spellcheck="false" type="text"
          jslog=\${VisualLogging.textField('url').track({keydown: 'Enter', change: true})}>
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
    this.#columns = [
      {
        id: 'node-id',
        title: i18nString(UIStrings.element),
        sortable: true,
        weight: 50,
        align: undefined,
      },
      {
        id: 'declaration',
        title: i18nString(UIStrings.declaration),
      },
      {
        id: 'source-url',
        title: i18nString(UIStrings.source),
        sortable: false,
        weight: 100,
        align: DataGrid.DataGrid.Align.RIGHT,
      },
    ];

    this.#dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.someTitle),
      columns: this.#columns,
      deleteCallback: undefined,
      refreshCallback: undefined,
    });
    this.#dataGrid.setStriped(true);
    this.#dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SORTING_CHANGED, this.#sortMediaQueryDataGrid.bind(this));

    this.#dataGrid.asWidget().show(this.element);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-data-grid name=\${i18nString(UIStrings.someTitle)} striped
          @sort=\${this.#sortMediaQueryDataGrid.bind(this)}>
        <table>
          <tr>
            <th id="node-id" weight="50" sortable>\${i18nString(UIStrings.element)}</th>
            <th id="declaration">\${i18nString(UIStrings.declaration)}</th>
            <th id="source-url" weight="100" align="right">\${i18nString(UIStrings.source)}</th>
          </tr>
        </table>
      </devtools-data-grid>
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
class ElementNode extends DataGrid.SortableDataGrid.SortableDataGridNode<ElementNode> {
  override createCell(columnId: string): HTMLElement {
    if (columnId === 'node-id') {
      const cell = this.createTD(columnId);
      cell.classList.add('node-id');
      cell.createChild('span', 'node-id-text').textContent = this.data.id;
      return cell;
    }
    if (columnId === 'source-url') {
      const cell = this.createTD(columnId);
      if (this.data.range) {
        if (!this.#link) {
          cell.textContent = i18nString(UIStrings.unableToLink);
        } else {
          cell.appendChild(this.#link);
        }
      } else {
        cell.textContent = i18nString(UIStrings.unableToLinkToInlineStyle);
      }
      return cell;
    }
  }
}`,
      output: `
class ElementNode extends DataGrid.SortableDataGrid.SortableDataGridNode<ElementNode> {
  override createCell(columnId: string): HTMLElement {
    if (columnId === 'node-id') {
      const cell = html\`
    <td class="node-id">
      <span class="node-id-text">\${this.data.id}</span>
    </td>\`;
      return cell;
    }
    if (columnId === 'source-url') {
      const cell = html\`
    <td>\${i18nString(UIStrings.unableToLinkToInlineStyle)}
      \${this.#link}
    </td>\`;
      if (this.data.range) {
        if (!this.#link) {
        } else {
        }
      } else {
      }
      return cell;
    }
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
    const columns = ([
      {
        id: 'node-id',
        title: i18nString(UIStrings.element),
        weight: 50,
        align: undefined,
      },
      {
        id: 'declaration',
        title: i18nString(UIStrings.declaration),
      },
      {
        id: 'source-url',
        title: i18nString(UIStrings.source),
        weight: 100,
        align: this.editable ? DataGrid.DataGrid.Align.RIGHT : DataGrid.DataGrid.Align.LEFT,
      },
    ] as DataGrid.DataGrid.ColumnDescriptor[]);

    const config = {
      displayName: i18nString(UIStrings.someTitle),
      columns,
      deleteCallback: this.#deleteCallback.bind(this),
      refreshCallback: undefined,
    };

    this.#dataGrid = new DataGrid.ViewportDataGrid.ViewportDataGrid(config);
    this.#dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SORTING_CHANGED, this.#sortMediaQueryDataGrid.bind(this));

    this.#dataGrid.asWidget().show(this.element);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-data-grid name=\${i18nString(UIStrings.someTitle)}
          @delete=\${this.#deleteCallback.bind(this)}
          @sort=\${this.#sortMediaQueryDataGrid.bind(this)}>
        <table>
          <tr>
            <th id="node-id" weight="50">\${i18nString(UIStrings.element)}</th>
            <th id="declaration">\${i18nString(UIStrings.declaration)}</th>
            <th id="source-url" weight="100"
                align=\${this.editable ? DataGrid.DataGrid.Align.RIGHT : DataGrid.DataGrid.Align.LEFT}
            >\${i18nString(UIStrings.source)}</th>
          </tr>
        </table>
      </devtools-data-grid>
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
    this.#dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.someTitle),
      columns: [
        {
          id: 'node-id',
          title: i18nString(UIStrings.element),
          weight: 50,
          fixedWidth: this.fixedWidth,
          align: undefined,
          dataType: this.dataType,
        },
        {
          id: 'active',
          title: i18nString(UIStrings.active),
          dataType: DataGrid.DataGrid.DataType.BOOLEAN,
        },
        {
          id: 'source-url',
          title: i18nString(UIStrings.source),
          weight: 100,
          dataType: DataGrid.DataGrid.DataType.STRING,
        },
      ],
      refreshCallback: this.#refreshCallback.bind(this),
    });

    this.#dataGrid.asWidget().show(this.element);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-data-grid name=\${i18nString(UIStrings.someTitle)}
          @refresh=\${this.#refreshCallback.bind(this)}>
        <table>
          <tr>
            <th id="node-id" weight="50" dataType=\${this.dataType} ?fixed=\${this.fixedWidth}>\${i18nString(UIStrings.element)}</th>
            <th id="active" dataType="boolean">\${i18nString(UIStrings.active)}</th>
            <th id="source-url" weight="100" dataType="string">\${i18nString(UIStrings.source)}</th>
          </tr>
        </table>
      </devtools-data-grid>
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
    this.#splitWidget = new UI.SplitWidget.SplitWidget(this.vertical, false, undefined, 200);
    this.#splitWidget.show(this.element);

    this.#mainContainer = new UI.SplitWidget.SplitWidget(true, true);
    this.#resultsContainer = new UI.Widget.EmptyWidget();
    this.#elementContainer = new DetailsView();

    this.#mainContainer.setMainWidget(this.#resultsContainer);
    this.#mainContainer.setSidebarWidget(this.#elementContainer);
    this.#mainContainer.setVertical(false);
    this.#mainContainer.setSecondIsSidebar(this.dockedLeft);

    this.#sideBar = new SidebarPanel();
    this.#sideBar.setMinimumSize(100, 25);
    this.#splitWidget.setSidebarWidget(this.#sideBar);
    this.#splitWidget.setMainWidget(this.#mainContainer);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-split-view direction=\${this.vertical ? 'column' : 'row'} sidebar-position="first"
          sidebar-initial-size="200">
        <devtools-widget slot="sidebar" .widgetConfig=\${widgetConfig(SidebarPanel,
            {minimumSize: {width: 100, height: 25}})}></devtools-widget>
        <devtools-split-view direction="column" sidebar-position="second" slot="main"
            direction="row" sidebar-position="$this.dockedLeft ? 'second' : 'first'}">
          <devtools-widget slot="main" .widgetConfig=\${widgetConfig(UI.Widget.EmptyWidget)}></devtools-widget>
          <devtools-widget slot="sidebar" .widgetConfig=\${widgetConfig(DetailsView)}></devtools-widget>
        </devtools-split-view>
      </devtools-split-view>
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
    const contrastFragment = UI.Fragment.Fragment.build\`
      <div class="contrast-container-in-grid" $="contrast-container-element">
        <span class="contrast-preview">Aa</span>
        <span>\${contrastRatioString}</span>
      </div>\`;
    this.contentElement.appendChild(contrastFragment.element());
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, output, target) => {
  render(html\`
    <div>
      <div class="contrast-container-in-grid" \${ref(e => { output.contrastContainerElement = e; })}>
        <span class="contrast-preview">Aa</span>
        <span>\${contrastRatioString}</span>
      </div>
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
    const contrastFragment = UI.Fragment.Fragment.build\`
      <div class="contrast-container-in-grid" $="contrast-container-element">
        <span class="contrast-preview">Aa</span>
        <span>\${contrastRatioString}</span>
      </div>\`;
    const container = contrastFragment.$('contrast-container-element');
    container.createChild('span', 'contrast-preview').textContent = 'Aa';
  }
}`,
      output: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const contrastFragment = UI.Fragment.Fragment.build\`
      <div class="contrast-container-in-grid" $="contrast-container-element">
        <span class="contrast-preview">Aa</span>
        <span>\${contrastRatioString}</span>
      </div>\`;
    const container = html\`
    <template id="contrast-container-element">
      <span class="contrast-preview">Aa</span>
    </template>\`;
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
    this.button = this.contentElement.createChild('button');
    UI.ARIAUtils.markAsMenuButton(this.button);
    const tree = this.contentElement.createChild('ul');
    UI.ARIAUtils.markAsTree(tree);
    UI.ARIAUtils.markAsTreeitem(tree.createChild('li'));
    const alert = this.contentElement.createChild('span');
    alert.textContent = 'Alert';
    UI.ARIAUtils.markAsAlert(alert);
    const slider = this.contentElement.createChild('input');
    UI.ARIAUtils.markAsSlider(slider, 10);

    UI.ARIAUtils.setDescription(this.button, 'Some button');
    UI.ARIAUtils.setInvalid(slider, this.valid);

    const progress = this.contentElement.createChild('div');
    UI.ARIAUtils.markAsProgressBar(progress);
    UI.ARIAUtils.setProgressBarValue(progress, 0.5, '50% done');
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <button role="button" aria-haspopup="true" aria-description="Some button"></button>
      <ul role="tree">
        <li role="treeitem"></li>
      </ul>
      <span role="alert" aria-live="polite">Alert</span>
      <input role="slider" aria-valuemin="10" aria-valuemax="100" aria-invalid=\${this.valid}>
      <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0.5"
          aria-valuetext="50% done"></div>
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
    const widget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.nothingToSeeHere), this.explanation);
    widget.link = 'http://www.google.com';
    widget.show(this.element);
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <devtools-widget .widgetConfig=\${widgetConfig(UI.EmptyWidget.EmptyWidget,{
          header: i18nString(UIStrings.nothingToSeeHere), text: this.explanation,
          link: 'http://www.google.com',})}></devtools-widget>
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
