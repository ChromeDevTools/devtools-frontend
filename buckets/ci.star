load(
  '//lib/builders.star',
  'builder',
  'acls',
  'defaults',
  'dimensions',
)

BUCKET_NAME='ci'
SERVICE_ACCOUNT='devtools-frontend-ci-builder@chops-service-accounts.iam.gserviceaccount.com'

luci.bucket(
    name=BUCKET_NAME,
    acls=[
      acls.readers,
      acl.entry(
          roles=acl.BUILDBUCKET_TRIGGERER,
          users=[
            SERVICE_ACCOUNT,
            'luci-scheduler@appspot.gserviceaccount.com',
          ]
      ),
    ],
)

ci_builders=[]

def ci_builder(**kvargs):
  category=kvargs.pop('console_category')
  builder(
    bucket=BUCKET_NAME,
    mastername="client.devtools-frontend.integration",
    service_account=SERVICE_ACCOUNT,
    schedule="triggered",
    **kvargs
  )
  ci_builders.append((kvargs['name'], category))

ci_builder(
  name='DevTools Linux',
  recipe_name='chromium_integration',
  dimensions=dimensions.default_ubuntu,
  execution_timeout=2 * time.hour,
  console_category='Linux'
)

ci_builder(
  name="Stand-alone Linux",
  recipe_name="devtools/devtools-frontend",
  dimensions=dimensions.default_ubuntu,
  execution_timeout=2 * time.hour,
  console_category='Linux'
)

builder(
  name="Auto-roll - devtools deps",
  bucket=BUCKET_NAME,
  mastername="client.devtools-frontend.integration",
  service_account='devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com',
  schedule="0 3,12 * * *",
  recipe_name="v8/auto_roll_v8_deps",
  dimensions=dimensions.default_ubuntu,
  execution_timeout=2 * time.hour
)

luci.console_view(
  name="main",
  title="Main",
  repo=defaults.repo,
  refs=["refs/heads/master"],
  favicon=defaults.favicon,
  header={
    'tree_status_host': 'devtools-status.appspot.com'
  },
  entries=[
    luci.console_view_entry(builder=name, category=category)
    for name, category in ci_builders
  ]
)

luci.list_view(
  name="infra",
  title="Infra",
  favicon=defaults.favicon,
  entries =[luci.list_view_entry(builder="Auto-roll - devtools deps")],
)

luci.gitiles_poller(
  name='devtools-frontend-trigger',
  bucket=BUCKET_NAME,
  repo=defaults.repo,
  refs=['refs/heads/master'],
  triggers=[name for name, _ in ci_builders]
)
