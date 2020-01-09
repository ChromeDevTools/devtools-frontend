load(
  '//lib/builders.star',
  'builder',
  'defaults',
  'dimensions',
  'config_section',
  'builder_descriptor',
  'generate_ci_configs',
)

defaults.build_numbers.set(True)

generate_ci_configs(
    configurations = [
      config_section(
        name="ci",
        branch='refs/heads/master',
        view='Main',
        name_suffix='',
        mastername="client.devtools-frontend.integration"
      ),
      config_section(
        name="chromium",
        repo='https://chromium.googlesource.com/chromium/src',
        branch='refs/heads/master',
        view='Chromium',
        name_suffix = ' (chromium)',
        mastername="chromium.devtools-frontend"
      ),
      config_section(
        name="beta",
        branch='refs/heads/chromium/3987',
        view='Beta',
        name_suffix = ' beta',
        mastername="client.devtools-frontend.integration"
      ),
    ],
    builders = [
      builder_descriptor(
        name='DevTools Linux',
        recipe_name='chromium_integration',
        excluded_from=['beta']
      ),
      builder_descriptor(
        name="Stand-alone Linux",
        recipe_name="devtools/devtools-frontend",
        excluded_from=['chromium']
      ),
    ]
)

builder(
    name="Auto-roll - devtools deps",
    bucket="ci",
    mastername="client.devtools-frontend.integration",
    service_account='devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com',
    schedule="0 3,12 * * *",
    recipe_name="v8/auto_roll_v8_deps",
    dimensions=dimensions.default_ubuntu,
    execution_timeout=2 * time.hour
)

luci.list_view(
    name="infra",
    title="Infra",
    favicon=defaults.favicon,
    entries =[luci.list_view_entry(builder="Auto-roll - devtools deps")],
)
