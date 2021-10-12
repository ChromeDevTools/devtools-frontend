# This script expects to be called from the root of the repository
# Example:
# scripts/migration/class-fields/migrate.sh panels/console
#
$PWD/third_party/node/node.py --output scripts/migration/class-fields/migrate.js $1/
find $PWD/front_end/$1/ -type f -exec sed -i -e 's/SOME_STUPID_PREFIX_/#/g' {} \;
git cl format --js
NINJA_SUMMARIZE_BUILD=1 autoninja -C out/Default front_end/$1:bundle
git add .
git commit -m "Migrate to private class fields in $1" -m "" -m "R=szuend@chromium.org" -m "" -m "Bug: 1222126"
