#!/bin/bash

# work path
WORK=/home/pi/new-horizons-conf
TODAY=$(date '+%Y-%m-%d')
THIS=$1
cd $WORK

git pull

# Backup ./raspi/....
crontab -l > ./raspi/$THIS/$THIS.crontab
cp ~/.profile ./raspi/$THIS/$THIS.profile

git commit -a -m "$TODAY updated"
git push



