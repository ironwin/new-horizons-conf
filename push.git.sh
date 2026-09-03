#!/bin/bash

# work path
WORK=/home/pi/new-horizons-conf
TODAY=$(date '+%Y-%m-%d')
THIS="${1:-$(hostname -s)}"

if [ -z "$THIS" ]; then
    echo "[ERROR] Hostname could not be determined and no argument provided." >&2
    exit 1
fi

cd "$WORK" || exit 1

git pull

# Backup ./raspi/....
mkdir -p "$WORK/raspi/$THIS"
crontab -l > "$WORK/raspi/$THIS/$THIS.crontab"
if [ -f "$HOME/.profile" ]; then
    cp "$HOME/.profile" "$WORK/raspi/$THIS/$THIS.profile"
fi

# Stage backup files and any modified tracked files
git add "$WORK/raspi/$THIS/$THIS.crontab" "$WORK/raspi/$THIS/$THIS.profile"
git add -u

# Commit only if there are changes
if ! git diff --cached --quiet; then
    git commit -m "$TODAY updated"
else
    echo "No changes to commit."
fi

# Push changes
if ! git push; then
    echo "Push failed. Retrying with git pull --rebase..."
    git pull --rebase && git push
fi
