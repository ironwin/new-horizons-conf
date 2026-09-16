#!/bin/bash
# ==============================================================================
# Login Status Banner (firstpi)
# ==============================================================================

# 색상 정의
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_RED='\033[31m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_BLUE='\033[34m'
C_CYAN='\033[36m'
C_GRAY='\033[90m'

# 기본 시스템 정보
HOSTNAME=$(hostname)
IP_ADDR=$(hostname -I | awk '{print $1}')
KERNEL=$(uname -rm)
UPTIME=$(uptime -p 2>/dev/null | sed 's/up //' || uptime | awk -F'( |,|:)+' '{print $6,"hrs",$7,"min"}')
NOW_STR=$(date '+%Y-%m-%d (%a) %H:%M:%S')

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

DB_BACKUP_DIR="/home/pi/new-horizons/opt/db-backdup"
if [ -d "$DB_BACKUP_DIR" ]; then
    DB_COUNT=$(ls -1 "$DB_BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
    DB_SIZE=$(du -sh "$DB_BACKUP_DIR" 2>/dev/null | awk '{print $1}')
    LATEST_DUMP=$(ls -t "$DB_BACKUP_DIR"/*.gz 2>/dev/null | head -n 1 | sed -E 's/.*\.([0-9]{8})\..*/\1/')
    if [ -n "$LATEST_DUMP" ]; then
        DB_BACKUP_STATUS="${DB_SIZE} (${DB_COUNT} files, 최근: ${LATEST_DUMP})"
    else
        DB_BACKUP_STATUS="${DB_SIZE} (${DB_COUNT} files)"
    fi
else
    DB_BACKUP_STATUS="N/A"
fi

EXT_MOUNT=$(LC_ALL=C df -h | grep '/media/pi' | head -n 1)
if [ -n "$EXT_MOUNT" ]; then
    EXT_NAME=$(echo "$EXT_MOUNT" | awk '{print $6}')
    EXT_USAGE=$(echo "$EXT_MOUNT" | awk '{print $3 " / " $2 " (" $5 ")"}')
    EXT_STATUS="${C_GREEN}🟢 Mounted${C_RESET} (${EXT_NAME} - ${EXT_USAGE})"
fi

# 필수 서비스 상태
systemctl is-active --quiet new-horizons-api && API_STATUS="${C_GREEN}🟢 Active${C_RESET} (Port 18080)" || API_STATUS="${C_RED}🔴 Inactive${C_RESET}"
systemctl is-active --quiet new-horizons-frontend && FE_STATUS="${C_GREEN}🟢 Active${C_RESET} (Port 3000)" || FE_STATUS="${C_RED}🔴 Inactive${C_RESET}"
systemctl is-active --quiet mariadb && MARIADB_STATUS="${C_GREEN}🟢 Active${C_RESET} (Port 3306)" || MARIADB_STATUS="${C_RED}🔴 Inactive${C_RESET}"
systemctl is-active --quiet cron && CRON_STATUS="${C_GREEN}🟢 Active${C_RESET}" || CRON_STATUS="${C_RED}🔴 Inactive${C_RESET}"
systemctl is-active --quiet wayvnc && VNC_STATUS="${C_GREEN}🟢 Active${C_RESET} (Port 5900)" || VNC_STATUS="${C_RED}🔴 Inactive${C_RESET}"

# 실행 중인 크론/배치 프로세스 감지
CURRENT_PID=$$
RUNNING_JOBS=$(pgrep -f "stock-crawler|data\.go\.kr|bok\.go\.kr|bitcoin|jwst|daily_dump|sync_to_secondpi|pp\.cron\.sh|collection_cycle_report" | grep -v "^$CURRENT_PID$" | while read -r pid; do
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null)
    case "$cmd" in
        stock-crawler)    echo "stock-crawler" ;;
        data.go.kr*)      echo "data.go.kr" ;;
        bok.go.kr*)       echo "bok.go.kr" ;;
        bitcoin*)         echo "bitcoin" ;;
        jwst*)            echo "jwst" ;;
        daily_dump*)      echo "daily_dump" ;;
        sync_to_second*)  echo "sync_to_secondpi" ;;
        pp.cron.sh)       echo "population-cron" ;;
        collection_cycl*) echo "collect-report" ;;
    esac
done | sort -u | paste -sd, - | sed 's/,/, /g')

if [ -n "$RUNNING_JOBS" ]; then
    BATCH_STATUS="${C_GREEN}🟢 Running${C_RESET} (${RUNNING_JOBS})"
else
    BATCH_STATUS="${C_RESET}⚪ Idle (대기 중)${C_RESET}"
fi

CRON_JOB_COUNT=$(crontab -l 2>/dev/null | grep -E '^[0-9*]' | wc -l)

# 렌더링
echo -e "${C_CYAN}========================================================================${C_RESET}"
echo -e " ${C_BOLD}🖥️  System Status:${C_RESET} ${C_YELLOW}${HOSTNAME}${C_RESET} (${IP_ADDR})  ${C_GRAY}[${NOW_STR}]${C_RESET}"
echo -e "${C_CYAN}========================================================================${C_RESET}"
echo -e " • OS / Kernel : ${KERNEL}"
echo -e " • Uptime      : ${UPTIME}"
echo -e " • CPU Temp    : ${CPU_TEMP}"
echo -e " • Memory      : ${MEM_INFO} (${MEM_PCT}%)"
echo ""
echo -e " ${C_BOLD}[Storage]${C_RESET}"
echo -e " • SD Root (/) : ${ROOT_USAGE}"
echo -e " • DB Backup   : ${DB_BACKUP_STATUS}"
if [ -n "$EXT_STATUS" ]; then
    echo -e " • Ext Storage : ${EXT_STATUS}"
fi
echo ""
echo -e " ${C_BOLD}[Core Services]${C_RESET}"
echo -e " • Backend API : ${API_STATUS}"
echo -e " • Frontend    : ${FE_STATUS}"
echo -e " • MariaDB     : ${MARIADB_STATUS}"
echo -e " • Cron Daemon : ${CRON_STATUS}"
echo -e " • VNC Server  : ${VNC_STATUS}"
echo ""
echo -e " ${C_BOLD}[Crontab & Batch Schedule]${C_RESET} (${CRON_JOB_COUNT} active jobs)"
echo -e " • 현재 실행 작업 : ${BATCH_STATUS}"
echo -e " • 주식 시세 수집 : 평일 09:00 ~ 15:50 (10분 주기, stock-crawler)"
echo -e " • 공공/거시 데이터: 10:05(BOK) | 17:00(공공일별) | 17:35(BTC) | 18:00(환율)"
echo -e " • 수집 현황 보고 : 평일 18:00 (수집주기별 보고서 Slack 전송)"
echo -e " • 백업 및 동기화 : 19:00(Git Push / secondpi 동기화) | 19:05(DB 덤프)"
echo -e " • 시스템 자동종료: 평일 20:10 (Auto Shutdown)"
echo ""
echo -e " ${C_BOLD}[Quick Shortcuts]${C_RESET}"
echo -e " • 서비스 제어    : ${C_BLUE}sudo systemctl restart new-horizons-api | new-horizons-frontend${C_RESET}"
echo -e " • 서비스 로그    : ${C_BLUE}journalctl -u new-horizons-api -f${C_RESET}  |  ${C_BLUE}-u new-horizons-frontend -f${C_RESET}"
echo -e " • 데이터베이스   : ${C_BLUE}mydb${C_RESET} (stock) |  ${C_BLUE}mydbv${C_RESET} (vote)  |  ${C_BLUE}mydba${C_RESET} (root)"
echo -e " • 디렉토리 이동  : ${C_BLUE}cddev${C_RESET} (루트) |  ${C_BLUE}cdbin${C_RESET} (바이너리) |  ${C_BLUE}cdlog${C_RESET} (로그) |  ${C_BLUE}cdsql${C_RESET}"
echo -e " • 모니터 제어    : ${C_BLUE}monitoron${C_RESET}  |  ${C_BLUE}monitoroff${C_RESET}"
echo -e "${C_CYAN}========================================================================${C_RESET}"
