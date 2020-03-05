# Run this script to build the inspector.
# The built "inspector" folder needs to go here:
# (NOTE: inspector should be renamed "front_end")
# "PowwowDesigner/webapp/app/bower_components/devtools/front_end

# Clone Chromium depot_tools used to build.
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
# Replace the Chromium devtools-frontend repot location with Powwow's.
sed -i '' -f devtools_to_powwow.sed depot_tools/fetch_configs/devtools-frontend.py
sed -i '' -f devtools_to_powwow.sed depot_tools/recipes/recipe_modules/gclient/config.py
# Add depot tools to the path.
export PATH=./depot_tools:$PATH
# Get the devtools-frontend.
fetch --no-history devtools-frontend

# OR, to build a different branch other than master:
# fetch devtools-frontend
# cd devtools-frontend
# git checkout smartux-explorer-integration
# cd ..

# Build the devtools-frontend
cd devtools-frontend
gn gen out/Default
autoninja -C out/Default
# Copy the build resources to the top level
mv out/Default/resources/inspector ..

# Cleanup
cd ..
rm -rf devtools-frontend depot_tools .gclient_entries .gclient .cipd
