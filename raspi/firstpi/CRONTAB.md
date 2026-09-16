# firstpi Crontab 작업 정의서

이 문서는 `firstpi`(라즈베리 파이 데이터 수집 크롤러 & 백엔드/웹 서버 기기)의 크론탭 스케줄 및 자동화 작업 흐름을 정리한 문서입니다.

* **설정 파일 원본**: [`firstpi.crontab`](file:///home/pi/new-horizons-conf/raspi/firstpi/firstpi.crontab)
* **최종 갱신일**: 2026-09-16

---

## 📌 목차
1. [기본 환경 설정 및 정책](#1-기본-환경-설정-및-정책)
2. [전체 작업 요약표](#2-전체-작업-요약표)
3. [분야별 상세 스케줄](#3-분야별-상세-스케줄)
   - [시스템 전원 자동화 (Daily Shutdown)](#시스템-전원-자동화-daily-shutdown)
   - [주식 크롤링 (Naver Stock Crawling)](#주식-크롤링-naver-stock-crawling)
   - [공공/거시 데이터 수집 (Public Data & BOK)](#공공거시-데이터-수집-public-data--bok)
   - [월간 인구 데이터 자동 수집 (Monthly Population)](#월간-인구-데이터-자동-수집-monthly-population)
   - [백업 및 유지보수 (Backup & Maintenance)](#백업-및-유지보수-backup--maintenance)
   - [모니터링 및 리포팅 (Monitoring & Reporting)](#모니터링-및-리포팅-monitoring--reporting)
4. [요일별 시간 순 타임라인](#4-요일별-시간-순-타임라인)
5. [로그 파일 및 모니터링 안내](#5-로그-파일-및-모니터링-안내)

---

## 1. 기본 환경 설정 및 정책

```bash
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
CRON_LOG_DIR=/home/pi/new-horizons/log/cron
```

1. **로깅 정책 (Logging Policy)**:
   - 모든 크론 작업의 표준 출력(`stdout`)과 표준 에러(`stderr`)는 `$CRON_LOG_DIR/` 아래 개별 작업 로그 파일(`*.log`)로 분리 저장합니다.
2. **중복 실행 방지 락 정책 (Lock Policy)**:
   - `flock -n /tmp/*.lock`을 적용하여 이전 배치가 진행 중일 경우 다음 주기의 중복 실행을 방지합니다.
3. **환경 변수 로딩**:
   - Go 바이너리 및 설정 경로를 위해 각 작업 전 `. /home/pi/.profile`을 로드합니다.

---

## 2. 전체 작업 요약표

| 실행 시각 | 주기 / 요일 | 작업 내용 | 실행 명령 | 로그 파일 |
| :--- | :--- | :--- | :--- | :--- |
| **매 5분** | 상시 | 라즈베리 파이 CPU 온도 모니터링 (60°C 초과 시 Slack 경고) | `check_temperature.py` | `temperature_monitor.log` |
| **09:00** | 월 ~ 금 | 매월 2번째 월요일 인구 데이터 자동 수집 시퀀스 | `pp.cron.sh` | `population_cron.log` |
| **09~15시 (10분)** | 월 ~ 금 | 네이버 증권 시세 수집 (git pull 선행) | `stock-crawler` | `stock_crawler.log` |
| **10~16시 (매시)** | 월 ~ 금 | 네이버 증권 요약 푸시 (Push 모드) | `stock-crawler --push` | `stock_crawler_push.log` |
| **10:05** | 월 ~ 금 | 한국은행(BOK) 일별 경제지표 수집 (최근 7일) | `bok.go.kr.v4 --purpose=daily` | `bok_daily.log` |
| **17:00** | 월 ~ 금 | 공공데이터포털(data.go.kr) 일별 주식 데이터 수집 | `data.go.kr.v4` | `data_go_kr_daily.log` |
| **17:35** | 월 ~ 금 | 비트코인 시세 데이터 수집 | `bitcoin` | `bitcoin.log` |
| **18:00** | 월 ~ 금 | 공공데이터포털 환율 데이터 수집 (최근 7일) | `data.go.kr.v4 --purpose=exchange` | `data_go_kr_exchange.log` |
| **18:00** | 월 ~ 금 | 수집주기별 현황 요약 Slack 보고서 전송 | `collection_cycle_report.sh` | `collection_cycle_report.log` |
| **18:15** | 금요일 | JWST(제임스 웹 우주망원경) 데이터 수집 | `jwst` | `jwst.log` |
| **19:00** | 월 ~ 금 | crontab 및 profile Git 자동 백업 & 푸시 | `push.git.sh firstpi` | `push_git.log` |
| **19:00** | 매일 | 프론트엔드 소스코드 secondpi 동기화 | `sync_to_secondpi.sh` | `frontend_sync.log` |
| **19:05** | 매일 | MariaDB 전체 일일 덤프 생성 (stock, vote, movie) | `daily_dump.sh` | `db_backup.log` |
| **19:30** | 매일 | 7일 이전 구형 로그 파일 자동 정리 | `find ... -mtime +7 -exec rm` | - |
| **20:10** | 월 ~ 금 | 평일 야간 자동 시스템 종료 | `sudo shutdown -h now` | syslog |
| **20:20 (25일)**| 매월 25일 | BOK gindex 지표 수집 (최근 40일) | `bok.go.kr.v4 --purpose=gindex` | `bok_gindex.log` |
| **20:25 (25일)**| 매월 25일 | BOK mindex 지표 수집 (최근 40일) | `bok.go.kr.v4 --purpose=mindex` | `bok_mindex.log` |
| **20:30 (25일)**| 매월 25일 | BOK trends 지표 수집 (최근 30일) | `bok.go.kr.v4 --purpose=trends` | `bok_trends.log` |

---

## 3. 분야별 상세 스케줄

### 시스템 전원 자동화 (Daily Shutdown)
* **평일 야간 종료**: `10 20 * * 1-5 sudo shutdown -h now`
  - 모든 주간 배치 수집과 DB 백업, Git 푸시가 완료된 후 20:10에 자동 종료합니다.

---

### 주식 크롤링 (Naver Stock Crawling)
* **10분 주기 시세 수집**:
  - `*/10 9-15 * * 1-5 cd /home/pi/new-horizons-conf && git pull; stock-crawler ...`
  - 장 운영 시간(09:00 ~ 15:50) 동안 10분마다 최신 설정을 pull한 후 관심 종목을 수집합니다.

---

### 공공/거시 데이터 수집 (Public Data & BOK)
* **10:05 BOK 일별**: 한국은행 주요 일별 경제 지표 수집
* **17:00 data.go.kr 일별**: 마감된 주식 공공 데이터 수집
* **17:35 bitcoin**: 가상자산 시세 수집
* **18:00 data.go.kr 환율**: 일별 환율 데이터 수집

---

### 백업 및 유지보수 (Backup & Maintenance)
* **19:00 Git 자동 푸시**: crontab 및 profile 형상 관리
* **19:00 프론트엔드 동기화**: secondpi 기기로 최신 프론트엔드 변경분 동기화
* **19:05 DB 일일 백업**: stock, vote, movie 데이터베이스 압축 덤프 (`/home/pi/new-horizons/opt/db-backdup`)
* **19:30 로그 정리**: `$DEVEL_LOG` 디렉토리 내 7일 이상 경과된 파일 삭제

---

## 4. 요일별 시간 순 타임라인 (평일 기준)

```text
09:00 ─── [Batch] 월간 인구 자동 수집 스케줄러 (pp.cron.sh)
09:00~15:50 [Stock] 10분 주기 네이버 증권 시세 수집 (stock-crawler)
10:05 ─── [Data] 한국은행 일별 경제지표 수집 (bok.go.kr.v4)
17:00 ─── [Data] 공공데이터 주식 일별 데이터 수집 (data.go.kr.v4)
17:35 ─── [Data] 비트코인 시세 수집 (bitcoin)
18:00 ─── [Data] 공공데이터 환율 수집 (data.go.kr.v4)
18:00 ─── [Report] 수집주기별 현황 Slack 보고서 전송 (collection_cycle_report.sh)
18:15 ─── [Weekly] (금요일) 제임스 웹 우주망원경 수집 (jwst)
19:00 ─── [Git/Sync] new-horizons-conf Git 푸시 & secondpi 프론트엔드 동기화
19:05 ─── [Backup] MariaDB 전체 일일 덤프 백업 (daily_dump.sh)
19:30 ─── [Clean] 7일 경과 로그 파일 정리
20:10 ─── [Power] 평일 야간 자동 셧다운
```

---

## 5. 로그 파일 및 모니터링 안내

모든 크론 로그는 `/home/pi/new-horizons/log/cron/` 디렉토리에 보관됩니다:

* **주식 크롤링 로그**: `stock_crawler.log`
* **공공데이터 로그**: `data_go_kr_daily.log`, `data_go_kr_exchange.log`
* **한국은행 로그**: `bok_daily.log`
* **비트코인 로그**: `bitcoin.log`
* **인구 데이터 로그**: `population_cron.log`
* **수집 리포트 로그**: `collection_cycle_report.log`
* **DB 일일 백업 로그**: `db_backup.log`
* **Git 자동 푸시 로그**: `push_git.log`
* **secondpi 동기화 로그**: `frontend_sync.log`
* **온도 모니터링 로그**: `temperature_monitor.log`
