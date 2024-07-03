#!/bin/bash
git config --local user.email "action@github.com"
git config --local user.name "GitHub Action"

function compare_version() {
    test "$(echo "$@" | tr " " "\n" | sort -V | head -n 1)" != "$1"
}

RELEASE_TAG=$(curl -s https://raw.githubusercontent.com/winw1010/tataru-assistant/main/package.json | jq -r .version)
PUBLISHED_TAG=$(curl -s https://api.github.com/repos/dalamudx/tataru-assistant/releases | jq -r '.[] | .tag_name' | head -n 1|sed 's/v//g')
LOCAL_TAG=$(cat package.json | jq -r .version)

echo "上游版本: ${RELEASE_TAG}"
echo "当前版本: ${PUBLISHED_TAG}"

if [ "${PUBLISHED_TAG}" == "" ] || compare_version ${RELEASE_TAG} ${PUBLISHED_TAG}
then
    if [ "${PUBLISHED_TAG}" == "" ]
    then
        echo "release_tag=${LOCAL_TAG}" >> $GITHUB_OUTPUT
    else
        echo "release_tag=${RELEASE_TAG}" >> $GITHUB_OUTPUT
    fi
    echo "status=ready" >> $GITHUB_OUTPUT
    #fix steps
    #version link
    UPSTEAMLINK="https://raw.githubusercontent.com/winw1010/tataru-assistant-text/main/version.json"
    LOCALLINK="https://raw.githubusercontent.com/dalamudx/tataru-assistant/main/version.json"
    sed -i "s|${UPSTEAMLINK}|${LOCALLINK}|g" src/module/system/ipc-module.js
    #remove models limit
    sed -i '/if (regGptModel.test(element)) {/,/}/ s// /' src/module/translator/gpt.js
    #new version link
    UPSTREAMPACKAGE="https://github.com/winw1010/tataru-assistant/releases/latest/"
    LOCALPACKAGE="https://github.com/dalamudx/tataru-assistant/releases/latest/"
    sed -i "s|${UPSTREAMPACKAGE}|${LOCALPACKAGE}|g" src/html/util/index.js
    #update version.json
    curl -s https://raw.githubusercontent.com/winw1010/tataru-assistant-text/main/version.json > version.json
    #apply changes
    git add .
    git commit -m "Auto fix with github actions"
    git push origin main -f
fi
