#!/bin/bash
# ==============================================================================
# Login Status Banner (secondpi)
# ==============================================================================

# 색상 정의
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_RED='\033[31m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_BLUE='\033[34m'
C_CYAN='\033[36m'

# 기본 시스템 정보
HOSTNAME=$(hostname)
IP_ADDR=$(hostname -I | awk '{print $1}')
KERNEL=$(uname -rm)
UPTIME=$(uptime -p 2>/dev/null | sed 's/up //' || uptime | awk -F'( |,|:)+' '{print $6,"hrs",$7,"min"}')

# CPU 온도
if command -v vcgencmd &>/dev/null; then
    CPU_TEMP=$(vcgencmd measure_temp | tr -d "temp=")
else
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0)
    CPU_TEMP="$(awk "BEGIN {printf \"%.1f\", $TEMP_RAW/1000}")'C"
fi

# 메모리 사용량 (로케일 무관 처리)
MEM_INFO=$(LC_ALL=C free -h | awk '/^Mem:/ {print $3 " / " $2}')
MEM_PCT=$(LC_ALL=C free | awk '/^Mem:/ {printf "%d", $3/$2 * 100}')

# 스토리지 사용량 (로케일 무관 처리)
ROOT_USAGE=$(LC_ALL=C df -h / | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}')
SSD_MOUNT_POINT="/media/pi/SSD-256-USB"
if mountpoint -q "$SSD_MOUNT_POINT"; then
    read -r SSD_USED SSD_TOTAL SSD_PCT < <(LC_ALL=C df -h "$SSD_MOUNT_POINT" | awk 'NR==2 {print $3, $2, $5}')
    SSD_USAGE="$SSD_USED / $SSD_TOTAL ($SSD_PCT)"
    SSD_STATUS="${C_GREEN}🟢 Mounted${C_RESET} ($SSD_MOUNT_POINT, $SSD_PCT)"
else
    SSD_USAGE="Not Mounted"
    SSD_STATUS="${C_RED}🔴 Not Mounted${C_RESET}"
fi

# 필수 서비스 상태
if timeout 2s pm2 describe mm 2>/dev/null | grep -q "status.*online"; then
    MM_STATUS="${C_GREEN}🟢 Online${C_RESET} (PM2 mm)"
else
    MM_STATUS="${C_RED}🔴 Offline${C_RESET}"
fi

systemctl is-active --quiet mariadb && MARIADB_STATUS="${C_GREEN}🟢 Active${C_RESET}" || MARIADB_STATUS="${C_RED}🔴 Inactive${C_RESET}"
systemctl is-active --quiet cron && CRON_STATUS="${C_GREEN}🟢 Active${C_RESET}" || CRON_STATUS="${C_RED}🔴 Inactive${C_RESET}"

# 현재 활성화된 슬라이드쇼 모듈명 추출
SLIDESHOW_MOD=$(grep -E 'module:[[:space:]]*"[^"]*Slideshow"' /home/pi/MagicMirror/config/config.js 2>/dev/null | sed -E 's/.*"([^"]+)".*/\1/' | head -n 1)
if [ -n "$SLIDESHOW_MOD" ]; then
    SS_STATUS="${C_GREEN}🟢 ${SLIDESHOW_MOD}${C_RESET}"
else
    SS_STATUS="${C_RESET}⚪ None (Base)${C_RESET}"
fi

# 크론탭 스케줄 정보 계산
DOW=$(LC_ALL=C date +%u)
DOW_NAME=$(LC_ALL=C date +%a)
CUR_TIME=$(LC_ALL=C date +%H:%M)
CUR_MIN=$(( 10#${CUR_TIME%:*} * 60 + 10#${CUR_TIME#*:} ))

case "$DOW" in
    1|2|3|4)
        TODAY_SCHEDULE="07:15(MM) → 08:00(Off) → 20:00(MM) → 21:00(Backup) → 21:55(Off)"
        if   [ $CUR_MIN -lt 435 ];  then NEXT_ACTION="07:15 - MM Morning Restart"
        elif [ $CUR_MIN -lt 480 ];  then NEXT_ACTION="08:00 - Morning Auto-Shutdown"
        elif [ $CUR_MIN -lt 545 ];  then NEXT_ACTION="09:05 - MM Morning Refresh"
        elif [ $CUR_MIN -lt 1200 ]; then NEXT_ACTION="20:00 - MM Evening Switch"
        elif [ $CUR_MIN -lt 1260 ]; then NEXT_ACTION="21:00 - Daily Backup (Git/DB/Clean)"
        elif [ $CUR_MIN -lt 1315 ]; then NEXT_ACTION="21:55 - Night Auto-Shutdown"
        else NEXT_ACTION="Done for today (Tomorrow 07:15)"
        fi
        ;;
    5)
        TODAY_SCHEDULE="07:15(MM) → 08:00(Off) → 20:00(MM/Restore) → 21:00(Backup) → 22:00(Off)"
        if   [ $CUR_MIN -lt 435 ];  then NEXT_ACTION="07:15 - MM Morning Restart"
        elif [ $CUR_MIN -lt 480 ];  then NEXT_ACTION="08:00 - Morning Auto-Shutdown"
        elif [ $CUR_MIN -lt 545 ];  then NEXT_ACTION="09:05 - MM Morning Refresh"
        elif [ $CUR_MIN -lt 1200 ]; then NEXT_ACTION="20:00 - DB Restore & MM Switch"
        elif [ $CUR_MIN -lt 1260 ]; then NEXT_ACTION="21:00 - Daily Backup (Git/DB/Clean)"
        elif [ $CUR_MIN -lt 1320 ]; then NEXT_ACTION="22:00 - Weekend Auto-Shutdown"
        else NEXT_ACTION="Done for today (Tomorrow 10:10)"
        fi
        ;;
    6|7)
        TODAY_SCHEDULE="10:10(MM) → 20:00(MM) → 21:00(Backup) → 22:00(Off)"
        if   [ $CUR_MIN -lt 610 ];  then NEXT_ACTION="10:10 - MM Weekend Refresh"
        elif [ $CUR_MIN -lt 1200 ]; then NEXT_ACTION="20:00 - MM Evening Refresh"
        elif [ $CUR_MIN -lt 1260 ]; then NEXT_ACTION="21:00 - Daily Backup (Git/DB/Clean)"
        elif [ $CUR_MIN -lt 1320 ]; then NEXT_ACTION="22:00 - Night Auto-Shutdown"
        else NEXT_ACTION="Done for today"
        fi
        ;;
esac

# 렌더링
echo -e "${C_CYAN}========================================================================${C_RESET}"
echo -e " ${C_BOLD}🖥️  System Status:${C_RESET} ${C_YELLOW}${HOSTNAME}${C_RESET} (${IP_ADDR})"
echo -e "${C_CYAN}========================================================================${C_RESET}"
echo -e " • OS / Kernel : ${KERNEL}"
echo -e " • Uptime      : ${UPTIME}"
echo -e " • CPU Temp    : ${CPU_TEMP}"
echo -e " • Memory      : ${MEM_INFO} (${MEM_PCT}%)"
echo ""
echo -e " ${C_BOLD}[Storage]${C_RESET}"
echo -e " • SD Root (/) : ${ROOT_USAGE}"
echo -e " • SSD Backup  : ${SSD_USAGE}"
echo ""
echo -e " ${C_BOLD}[Core Services]${C_RESET}"
echo -e " • MagicMirror : ${MM_STATUS}"
echo -e " • SlideShow   : ${SS_STATUS}"
echo -e " • MariaDB     : ${MARIADB_STATUS}"
echo -e " • Cron Daemon : ${CRON_STATUS}"
echo -e " • SSD Mount   : ${SSD_STATUS}"
echo ""
echo -e " ${C_BOLD}[Crontab Schedule]${C_RESET}"
echo -e " • Today (${DOW_NAME})   : ${C_YELLOW}${TODAY_SCHEDULE}${C_RESET}"
echo -e " • Next Action   : ${C_CYAN}${NEXT_ACTION}${C_RESET}"
echo -e " • MM Restart    : 07:15, 09:05 (Mon~Fri) | 10:10 (Sat~Sun) | 20:00 (Daily)"
echo -e " • Daily Backup  : 21:00 (Git Push, Photo DB, Cleanup)"
echo -e " • DB Restore    : 20:00 (Every Fri - Stock, Vote)"
echo -e " • Auto Shutdown : 08:00 (Mon~Fri) | 21:55 (Mon~Thu) | 22:00 (Fri~Sun)"
echo ""
echo -e " ${C_BOLD}[Quick Shortcuts]${C_RESET}"
echo -e " • mm 로그/재시작 : ${C_BLUE}pm2 logs mm${C_RESET}  |  ${C_BLUE}pm2 restart mm${C_RESET}"
echo -e " • 모니터 제어    : ${C_BLUE}monitoron${C_RESET}   |  ${C_BLUE}monitoroff${C_RESET}"
echo -e " • 데이터베이스   : ${C_BLUE}mydb${C_RESET} (stock) |  ${C_BLUE}mydbv${C_RESET} (vote)  |  ${C_BLUE}mydba${C_RESET} (root)"
echo -e " • 크론탭/로그    : ${C_BLUE}crontab -l${C_RESET}  |  ${C_BLUE}tail ~/cron_log/*.log${C_RESET}"
echo -e "${C_CYAN}========================================================================${C_RESET}"
