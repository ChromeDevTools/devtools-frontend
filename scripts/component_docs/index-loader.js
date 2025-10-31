
    const components = {
      'Button': () => import('../../front_end/ui/components/buttons/Button.docs.js'),
'Icon': () => import('../../front_end/ui/components/icon_button/Icon.docs.js'),
'Spinners': () => import('../../front_end/ui/components/spinners/Spinners.docs.js'),
'Tooltip': () => import('../../front_end/ui/components/tooltips/Tooltip.docs.js'),
'RadioButton': () => import('../../front_end/ui/legacy/RadioButton.docs.js'),
'SelectMenu': () => import('../../front_end/ui/legacy/SelectMenu.docs.js'),
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
      }

      container = document.createElement('div');
      container.id = 'container';
      mainContent.appendChild(container);

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
  