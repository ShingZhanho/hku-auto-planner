#!/bin/bash

# Run this script on GitHub Actions to deploy the site.

# Update public/last-updated.json
LATEST_COMMIT_DATE=$(TZ='Asia/Hong_Kong' git log -1 --format=%cd --date=format-local:'%Y-%m-%d %H:%M:%S' -- public/built-in-data.xlsx)
echo "{\"last_updated_at\":\"$LATEST_COMMIT_DATE\"}" > public/last-updated.json