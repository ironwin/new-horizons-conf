# secondpi Crontab 작업 정의서

이 문서는 `secondpi`(라즈베리 파이 MagicMirror & Photo DB 기기)의 크론탭 스케줄 및 자동화 작업 흐름을 정리한 문서입니다.

* **설정 파일 원본**: [`secondpi.crontab`](file:///home/pi/new-horizons-conf/raspi/secondpi/secondpi.crontab)
* **최종 갱신일**: 2026-09-14

---

## 📌 목차
1. [기본 환경 설정 및 정책](#1-기본-환경-설정-및-정책)
2. [전체 작업 요약표](#2-전체-작업-요약표)
3. [분야별 상세 스케줄](#3-분야별-상세-스케줄)
   - [시스템 전원 자동화 (Daily Shutdown)](#시스템-전원-자동화-daily-shutdown)
   - [매직미러 화면 갱신 (Magic Mirror Flow)](#매직미러-화면-갱신-magic-mirror-flow)
   - [주간 데이터베이스 복구 (Weekly DB Restore)](#주간-데이터베이스-복구-weekly-db-restore)
   - [야간 백업 및 유지보수 (Backup & Maintenance)](#야간-백업-및-유지보수-backup--maintenance)
4. [요일별 시간 순 타임라인](#4-요일별-시간-순-타임라인)
5. [로그 파일 및 모니터링 안내](#5-로그-파일-및-모니터링-안내)

---

## 1. 기본 환경 설정 및 정책

```bash
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
CRON_LOG_DIR=/home/pi/cron_log
```

1. **로깅 정책 (Logging Policy)**:
   - 모든 크론 작업의 표준 출력(`stdout`)과 표준 에러(`stderr`)는 `$CRON_LOG_DIR/` 아래 개별 작업 로그 파일(`*.log`)로 리다이렉션하여 기록합니다.
2. **중복 실행 방지 락 정책 (Lock Policy)**:
   - 백업, 복구, Git 푸시 등의 중요 배치 작업은 `flock -n /tmp/*.lock`을 적용하여 이전 작업이 끝나지 않았을 경우 중복 실행을 즉시 스킵합니다.
3. **스마트 플러그 연동 정책**:
   - 외부 스마트 플러그 전원 OFF 스케줄(월~목 22:00)에 앞서 `21:55`에 OS를 안전하게 셧다운(`sudo shutdown -h now`)합니다.

---

## 2. 전체 작업 요약표

| 실행 시각 | 요일 | 작업 내용 | 실행 명령 | 로그 파일 |
| :--- | :--- | :--- | :--- | :--- |
| **07:15** | 월 ~ 금 | 매직미러 기상 루틴 반영 재시작 | `pm2 restart mm` | `mm_restart.log` |
| **08:00** | 월 ~ 금 | 아침 외출 후 자동 시스템 종료 | `sudo shutdown -h now` | syslog |
| **09:05** | 월 ~ 금 | 오전 화면 갱신 (휴일 재부팅 등 대비) | `pm2 restart mm` | `mm_restart.log` |
| **10:10** | 토, 일 | 주말 오전 화면 갱신 | `pm2 restart mm` | `mm_restart.log` |
| **20:00** | 금 | firstpi 최신 DB 덤프(stock, vote) 자동 복구 | `/home/pi/restore_backup.sh` (lock) | `restore_backup.log` |
| **20:00** | 매일 | 야간 슬라이드쇼 모듈 전환 재시작 | `pm2 restart mm` | `mm_restart.log` |
| **21:00** | 매일 | 설정 및 크론탭/프로필 Git 자동 푸시 | `/home/pi/new-horizons-conf/push.git.sh secondpi` (lock) | `push_git.log` |
| **21:00** | 매일 | photo MariaDB 일일 백업 생성 | `cd /home/pi/scripts && ./db_backup.sh` (lock) | `db_backup.log` |
| **21:00** | 매일 | SSD 내 구형 DB 백업 파일 정리 (7개 유지) | `/home/pi/cleanup_backup.sh` (lock) | `cleanup_backup.log` |
| **21:55** | 월 ~ 목 | 평일 야간 자동 셧다운 (22:00 스마트플러그 대비) | `sudo shutdown -h now` | syslog |
| **22:00** | 금 ~ 일 | 주말 야간 자동 셧다운 | `sudo shutdown -h now` | syslog |

---

## 3. 분야별 상세 스케줄

### 시스템 전원 자동화 (Daily Shutdown)
전력 절감 및 SD/SSD 보호를 위해 요일별 생활 루틴에 맞춰 자동 종료합니다.

* **평일 오전 종료**: `00 08 * * 1-5 sudo shutdown -h now`
  - 월~금 출근 및 외출 후 라즈베리 파이를 자동 종료합니다.
* **평일 야간 종료**: `55 21 * * 1-4 sudo shutdown -h now`
  - 22:00에 꺼지는 외부 스마트 플러그 전원 차단 5분 전에 OS를 안전하게 종료합니다.
* **주말/금요일 야간 종료**: `00 22 * * 5-7 sudo shutdown -h now`
  - 늦은 취침 시간에 맞춰 22:00에 시스템을 종료합니다.

---

### 매직미러 화면 갱신 (Magic Mirror Flow)
`mm.sh` 스크립트의 요일/시간대 조건에 따라 최신 모듈 화면을 반영하도록 PM2를 재시작합니다.

* **평일 아침 루틴 (07:15, 09:05)**:
  - `15 07 * * 1-5 pm2 restart mm >> $CRON_LOG_DIR/mm_restart.log 2>&1`
  - `05 09 * * 1-5 pm2 restart mm >> $CRON_LOG_DIR/mm_restart.log 2>&1`
  - 기상 시점의 날씨, 출근 교통, 뉴스, 일정 등을 갱신합니다.
* **매일 저녁 슬라이드쇼 전환 (20:00)**:
  - `00 20 * * * pm2 restart mm >> $CRON_LOG_DIR/mm_restart.log 2>&1`
  - **평일**: 과거의 오늘 사진 갤러리(`MMM-OnThisDaySlideshow`)로 전환.
  - **주말**: 시간순 타임라인 사진 갤러리(`MMM-TimelineSlideshow`)로 전환.
* **주말 오전 갱신 (10:10)**:
  - `10 10 * * 6-7 pm2 restart mm >> $CRON_LOG_DIR/mm_restart.log 2>&1`
  - 주말 늦은 아침 타임라인 슬라이드쇼 및 기상 정보 반영.

---

### 주간 데이터베이스 복구 (Weekly DB Restore)
* **스케줄**: `00 20 * * 5 flock -n /tmp/restore-backup.lock /home/pi/restore_backup.sh >> $CRON_LOG_DIR/restore_backup.log 2>&1`
* **주기**: 매주 금요일 저녁 20:00
* **내용**: `firstpi` 서버에서 생성되어 공유 저장소에 업로드된 최신 주식(`stock`) 및 투표(`vote`) DB 백업 덤프를 가져와 `secondpi`의 로컬 MariaDB에 자동 복구 및 동기화합니다.

---

### 야간 백업 및 유지보수 (Backup & Maintenance)
매일 밤 21:00에 3단계 일괄 유지보수가 실행됩니다:

1. **설정 및 형상 백업 (Git Push)**:
   - `00 21 * * * flock -n /tmp/push-git.lock /home/pi/new-horizons-conf/push.git.sh secondpi >> $CRON_LOG_DIR/push_git.log 2>&1`
   - crontab, profile, 매직미러 설정 등 변경 사항을 `new-horizons-conf` 원격 Git 저장소에 커밋/푸시합니다.
2. **Photo DB 덤프 백업**:
   - `00 21 * * * cd /home/pi/scripts && flock -n /tmp/db-backup.lock ./db_backup.sh >> $CRON_LOG_DIR/db_backup.log 2>&1`
   - `photo` 데이터베이스를 덤프하여 USB 외장 SSD(`/media/pi/SSD-256-USB/DB_BACKUP`)에 백업합니다.
3. **구형 백업 정리 (Retention)**:
   - `00 21 * * * flock -n /tmp/cleanup-backup.lock /home/pi/cleanup_backup.sh >> $CRON_LOG_DIR/cleanup_backup.log 2>&1`
   - 저장소 용량 관리를 위해 DB별 최신 7개 백업만 남기고 오래된 덤프 파일을 자동 삭제합니다.

---

## 4. 요일별 시간 순 타임라인

### 📅 평일 (월 ~ 목)
```text
07:15 ─── [MM] 아침 화면 갱신 (pm2 restart mm)
08:00 ─── [Power] 외출 후 자동 셧다운
  ... (스마트 플러그 등에 의해 낮 동안 OFF 또는 부팅 대기) ...
20:00 ─── [MM] 저녁 OnThisDay 슬라이드쇼 전환
21:00 ─── [Maintenance] Git 푸시 / Photo DB 백업 / 7일 보관 정리
21:55 ─── [Power] 야간 자동 셧다운 (22:00 스마트플러그 전원 차단 대비)
```

### 📅 금요일
```text
07:15 ─── [MM] 아침 화면 갱신
08:00 ─── [Power] 외출 후 자동 셧다운
20:00 ─── [DB] firstpi 최신 DB(stock, vote) 자동 복구
20:00 ─── [MM] 저녁 OnThisDay 슬라이드쇼 전환
21:00 ─── [Maintenance] Git 푸시 / Photo DB 백업 / 7일 보관 정리
22:00 ─── [Power] 주말 전 야간 자동 셧다운
```

### 📅 주말 (토, 일)
```text
10:10 ─── [MM] 주말 오전 타임라인 슬라이드쇼 갱신
20:00 ─── [MM] 저녁 타임라인 슬라이드쇼 갱신
21:00 ─── [Maintenance] Git 푸시 / Photo DB 백업 / 7일 보관 정리
22:00 ─── [Power] 야간 자동 셧다운
```

---

## 5. 로그 파일 및 모니터링 안내

모든 로그는 `/home/pi/cron_log/` 디렉토리에 보관됩니다:

* **매직미러 재시작 로그**: `/home/pi/cron_log/mm_restart.log`
* **DB 복구 로그**: `/home/pi/cron_log/restore_backup.log`
* **Git 자동 백업 로그**: `/home/pi/cron_log/push_git.log`
* **DB 일일 백업 로그**: `/home/pi/cron_log/db_backup.log`
* **백업 정리 로그**: `/home/pi/cron_log/cleanup_backup.log`
