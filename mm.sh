#!/bin/bash


csh=/home/pi/new-horizons-conf/backimages.choice.sh
dow=$(date +"%u")
tday=$(date +"%Y%m%d")
nowm=$(date +"%Y%m%d-%H:%M")
nowh=$(date +"%-H")

cd /home/pi/MagicMirror
logger "magicmirror : ${dow} ${nowh}"

# 1. 일요일 (8시 이후) / 토요일 (9시 이후) : 주말 타임라인 슬라이드쇼 실행
if [[ "${dow}" == "7" && "${nowh}" -gt 8 ]]; then
    logger "magicmirror > timelineslideshow (일요일)"
    cp /home/pi/new-horizons-conf/magicmirror/config.js.timelineslideshow ./config/config.js
elif [[ "${dow}" == "6" && "${nowh}" -gt 9 ]]; then
    logger "magicmirror > timelineslideshow (토요일)"
    cp /home/pi/new-horizons-conf/magicmirror/config.js.timelineslideshow ./config/config.js
# 2. 평일(월~금) 20시 이후 : OnThisDay 슬라이드쇼 실행
elif [ "${nowh}" -ge 20 ]; then
    logger "magicmirror > onthisdayslideshow (20시)"
    $csh
# 3. 금요일 12시 이후 : OnThisDay 슬라이드쇼
elif [[ "${dow}" == "5" && "${nowh}" -gt 12 ]]; then
    logger "magicmirror > onthisdayslideshow (금요일 오후)"
    $csh
# 4. 평일 주간 및 주말 이른 아침 : 기본 화면 (달력, 날씨 등)
else
    cp ./config/config.js.base ./config/config.js
fi 

#pm2 restart mm
DISPLAY=:0 npm start
