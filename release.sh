#!/bin/bash

# Extract version from command line argument
tag_arg=$(echo "$1")
echo $tag_arg
version="${tag_arg#tag}"  # Remove "tag" prefix

if [[ -z "$version" ]]; then
    echo "Usage: ./release.sh -tag <version> (e.g., ./release.sh -tag 1.0.7)"
    exit 1
fi

# 1. Update manifest.json 
jq '.version = "'"$version"'"' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json

# # 2. Update package.json
# npm version --no-git-tag-version "$version" 2>/dev/null || {
#     echo "Failed to update version in package.json."
#     exit 1
# }

# 3. Build (with error handling)
if ! npm run build; then
    echo "Build failed. Aborting release."
    exit 1
fi

# 4. Git Commit (only if changes were made)
git add .
if ! git diff --cached --quiet; then
    git commit -m "release commit $version"
fi

# 5. Ask for Permission to Push
read -p "Push changes and tag? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
    echo "Aborting release."
    exit 0
fi

# 6. Git Tag and Push
git tag -a "$version" -m "$version"
git push origin "$version"

echo "Release $version completed successfully!"
