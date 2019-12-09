defaults=struct(
  cipd_package="infra/recipe_bundles/chromium.googlesource.com/chromium/tools/build",
  cipd_version="refs/heads/master",
  swarming_tags=["vpython:native-python-wrapper"],
  repo="https://chromium.googlesource.com/devtools/devtools-frontend",
  favicon="https://storage.googleapis.com/chrome-infra-public/logo/devtools.png",
)

acls=struct(
  readers=acl.entry(
    roles=acl.BUILDBUCKET_READER,
    groups='all',
  ),
)

dimensions=struct(
  ubuntu={
    "os":"Ubuntu-16.04",
  },
  default_ubuntu={
    'host_class':'default',
    'os':'Ubuntu-16.04',
  },
  baremetal_ubuntu={
    "host_class":"baremetal",
    "os":"Ubuntu-16.04",
  },
  win10={
    "cpu":"x86-64",
    "os":"Windows-10",
  }
)

def recipe(
    name,
    cipd_package=defaults.cipd_package,
    cipd_version=defaults.cipd_version):
  """Create recipe declaration with dtf defaults"""
  return luci.recipe(
    name=name,
    cipd_package=cipd_package,
    cipd_version=cipd_version,
  )

def builder(
    recipe_name,
    swarming_tags=defaults.swarming_tags,
    **kvargs):
  """Create builder with dtf defaults"""
  mastername=kvargs.pop('mastername')
  properties=kvargs.pop('properties', {})
  properties.update(mastername=mastername)
  kvargs['properties']=properties
  kvargs['executable']=recipe(recipe_name)

  luci.builder(
    swarming_tags=swarming_tags,
    **kvargs
  )

def generate_ci_configs(configurations, builders, exceptions = {}):
  # Generate full configuration for ci builders:
  #   bucket, builders, console, scheduler.
  # Arguments:
  #   - configurations: list of struct with following propeties:
  #     - bucket_name: name of the bucket
  #     - branch: branch reference
  #     - view: name for the corresponding console view
  #     - name_suffix: suffix to be added to all builders under this bucket
  #   - builders: list of struct with following propeties:
  #     - name: name of the builder='DevTools Linux'
  #     - recipe_name: recipe to be run by the builder
  #   - exceptions: dict(bucket_name, [builder_name]) with builders to be excluded
  #     from the specified bucket

  SERVICE_ACCOUNT='devtools-frontend-ci-builder@chops-service-accounts.iam.gserviceaccount.com'

  for c in configurations:
    builders_refs=[]

    def ci_builder(**kvargs):
      category=kvargs.pop('console_category')
      builder(
          bucket=c.bucket_name,
          mastername="client.devtools-frontend.integration",
          service_account=SERVICE_ACCOUNT,
          schedule="triggered",
          **kvargs
      )
      builders_refs.append((kvargs['name'], category))

    luci.bucket(
        name=c.bucket_name,
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

    for b in builders:
      if b.name not in exceptions.get(c.bucket_name, []):
        ci_builder(
          name=b.name + c.name_suffix,
          recipe_name=b.recipe_name,
          dimensions=dimensions.default_ubuntu,
          execution_timeout=2 * time.hour,
          console_category='Linux'
        )

    luci.console_view(
      name=c.view.lower(),
      title=c.view,
      repo=defaults.repo,
      refs=[c.branch],
      favicon=defaults.favicon,
      header={
        'tree_status_host': 'devtools-status.appspot.com'
      },
      entries=[
        luci.console_view_entry(builder=name, category=category)
        for name, category in builders_refs
      ]
    )

    luci.gitiles_poller(
      name='devtools-frontend-trigger-' + c.view.lower(),
      bucket=c.bucket_name,
      repo=defaults.repo,
      refs=[c.branch],
      triggers=[name for name, _ in builders_refs]
    )
