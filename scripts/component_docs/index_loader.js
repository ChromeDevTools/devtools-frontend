
    import {setup, cleanup} from './docs_environment.js';

    const components = {
      'Button': () => import('../../front_end/ui/components/buttons/Button.docs.js'),
'MarkdownView': () => import('../../front_end/ui/components/markdown_view/MarkdownView.docs.js'),
'Snackbars': () => import('../../front_end/ui/components/snackbars/Snackbars.docs.js'),
'Spinners': () => import('../../front_end/ui/components/spinners/Spinners.docs.js'),
'SurveyLink': () => import('../../front_end/ui/components/survey_link/SurveyLink.docs.js'),
'Switch': () => import('../../front_end/ui/components/switch/Switch.docs.js'),
'Tooltip': () => import('../../front_end/ui/components/tooltips/Tooltip.docs.js'),
'Card': () => import('../../front_end/ui/kit/cards/Card.docs.js'),
'Icon': () => import('../../front_end/ui/kit/icons/Icon.docs.js'),
'ContextMenu': () => import('../../front_end/ui/legacy/ContextMenu.docs.js'),
'RadioButton': () => import('../../front_end/ui/legacy/RadioButton.docs.js'),
'SelectMenu': () => import('../../front_end/ui/legacy/SelectMenu.docs.js'),
'Slider': () => import('../../front_end/ui/legacy/Slider.docs.js'),
'ThemeColors': () => import('../../front_end/ui/legacy/theme_support/ThemeColors.docs.js'),
    };

    const mainContent = document.querySelector('.main-content');

    async function loadComponent(name) {
      if (!components[name] || !mainContent) {
        return;
      }

      let container = document.getElementById('container');
      // Replace the container to start off with a clean one.
      if (container) {
        container.remove();
        await cleanup();
      }

      container = document.createElement('div');
      container.id = 'container';
      mainContent.appendChild(container);

      await setup();
      const {render} = await components[name]();
      render(container);
    }

    window.addEventListener('hashchange', () => {
      const componentName = window.location.hash.substr(1);
      loadComponent(componentName);
    });

    if (window.location.hash) {
      loadComponent(window.location.hash.substr(1));
    }
  