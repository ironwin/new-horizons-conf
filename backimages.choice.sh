#!/bin/bash

cd /home/pi/new-horizons-conf

FILTER="jwst"  # 필터링할 문자열(여러개라면 정규식 사용 가능)
IMAGE_PATH="/media/pi/SSD-256-USB/PHOTOS"
CONFIG_BASE="./magicmirror/config.js.backimages"
CONFIG_LAST="/home/pi/MagicMirror/config/config.js"


# 1. 디렉토리 목록 생성 및 필터링
dirs=()
while IFS= read -r -d '' dir; do
  dir_name=$(basename "$dir")
  [[ "$dir_name" == *$FILTER* ]] && continue
  dirs+=("$dir")
done < <(find ${IMAGE_PATH} -mindepth 1 -maxdepth 1 -type d -print0)

# 필터링 결과가 없을 때 처리
if [ ${#dirs[@]} -eq 0 ]; then
  echo "필터 \"$FILTER\"를 포함하는 디렉토리가 없습니다."
  exit 1
fi

# 2. 생성일자 추출 및 정렬
dirinfo=()
for dir in "${dirs[@]}"; do
  btime=$(stat -c '%W' "$dir" 2>/dev/null || stat -f '%B' "$dir")
  [ "$btime" = "0" ] && btime=$(date +%s -r "$dir" 2>/dev/null)
  dirinfo+=("$btime|$dir")
done

IFS=$'\n' sorted=($(sort <<<"${dirinfo[*]}"))
unset IFS

# 3. 올해의 현재 주차(0부터 시작)
week_num=$(date +%d)
week_index=$((10#$week_num - 1))

# 4. 모듈러 연산
dir_count=${#sorted[@]}
mod_idx=$((week_index % dir_count))

# 5. 출력
TARGET=""
for i in "${!sorted[@]}"; do
  entry="${sorted[$i]}"
  dir_path="${entry#*|}"
  dir_name=$(basename "$dir_path")
  btime="${entry%%|*}"
  btime_human=$(date -d @"$btime" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -r "$btime" "+%Y-%m-%d %H:%M:%S")
  if [[ $i -eq $mod_idx ]]; then
    printf "[%d] %-30s %s   <-- 선택됨(week mod count)\n" "$i" "$dir_name" "$btime_human"
    #TARGET=${IMAGE_PATH}/"${dir_name}"
    TARGET="${dir_name}"
  else
    printf "[%d] %-30s %s\n" "$i" "$dir_name" "$btime_human"
  fi
done

echo ${TARGET}
#sed "s"|@IMG_DIR@|${TARGET}|g"  "$CONFIG_BASE" > "$CONFIG_LAST"
sed "s/@IMG_DIR@/${TARGET}/g"  "$CONFIG_BASE" > "$CONFIG_LAST"

