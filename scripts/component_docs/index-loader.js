
    const components = {
      'Icon': () => import('../../front_end/ui/components/icon_button/Icon.docs.js'),
    };

    const container = document.getElementById('container');

    async function loadComponent(name) {
      if (!components[name]) {
        return;
      }
      const {render} = await components[name]();
      container.innerHTML = '';
      render(container);
    }

    window.addEventListener('hashchange', () => {
      const componentName = window.location.hash.substr(1);
      loadComponent(componentName);
    });

    if (window.location.hash) {
      loadComponent(window.location.hash.substr(1));
    }
  