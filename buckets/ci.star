load(
  '//lib/builders.star',
  'builder',
  'defaults',
  'dimensions',
  'generate_ci_configs',
)

generate_ci_configs(
    configurations = [
      struct(
        bucket_name="ci",
        branch='refs/heads/master',
        view='Main',
        name_suffix = ''
      ),
      struct(
        bucket_name="beta",
        branch='refs/heads/chromium/3987',
        view='Beta',
        name_suffix = ' beta'
      ),
    ],
    builders = [
      struct(
        name='DevTools Linux',
        recipe_name='chromium_integration',
      ),
      struct(
        name="Stand-alone Linux",
        recipe_name="devtools/devtools-frontend",
      ),
    ],
    exceptions = {
      'beta' : ['DevTools Linux']
    }
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
