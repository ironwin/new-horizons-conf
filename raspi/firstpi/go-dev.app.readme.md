# New Horizons 애플리케이션 및 Crontab 스케줄 명세서 (APP.md)

본 문서는 `new-horizons` 시스템의 Crontab에 등록되어 주기적으로 실행되는 **데이터 수집 애플리케이션, 리포트/알림 도구, 시스템 운영 및 백업 스크립트**의 전체 목록과 상세 규격을 정리한 명세서입니다.

---

## 🕒 한눈에 보는 실행 스케줄 타임라인 (평일 기준)

| 시간대 | 주기 | 대상 작업 (Application) | 분류 |
|:---:|:---:|:---|:---:|
| **09:00** | 매월 2주차 월~수 | 주민등록 인구통계 3일 단계별 수집 (`pp.cron.sh`) | 데이터 수집 |
| **09:00 ~ 15:50** | **매 10분마다** | 네이버 증권 장중 시세 크롤링 (`stock-crawler`) | 데이터 수집 |
| **10:00 ~ 16:00** | **매 1시간마다** | 주식 전종목 요약 현황 Slack 전송 (`stock-crawler --push`) | 데이터 수집/알림 |
| **10:05** | 매일 (평일) | 한국은행 ECOS 일별 금리/지표 수집 (`bok.go.kr.v4 daily`) | 데이터 수집 |
| **17:00** | 매일 (평일) | 공공데이터포털 일별 통계 수집 (`data.go.kr.v4 daily`) | 데이터 수집 |
| **17:35** | 매일 (평일) | 비트코인 및 국내외 주요 주가지수 수집 (`bitcoin`) | 데이터 수집 |
| **18:00** | 매일 (평일) | 공공데이터포털 환율 데이터 수집 (`data.go.kr.v4 exchange`) | 데이터 수집 |
| **18:00** | 매일 (평일) | 데이터 수집 주기별 현황 일일 리포트 (`collection_cycle_report.sh`) | 리포트 & 알림 |
| **18:15** | 매주 금요일 | 제임스 웹 우주망원경 데이터/이미지 수집 (`jwst`) | 데이터 수집 |
| **19:00** | 매일 (평일) | 설정 및 소스 변경사항 원격 백업 (`push.git.sh`) | 시스템 운영 |
| **19:00** | 매일 | 프론트엔드 변경 감지 시 보조 노드 배포 (`sync_to_secondpi.sh`) | 시스템 운영 |
| **19:05** | 매일 | MariaDB 일일 압축 덤프 및 Dropbox 백업 (`daily_dump.sh`) | 백업 |
| **19:30** | 매일 | 7일 초과된 오래된 로그 정리 (`find -mtime +7`) | 시스템 운영 |
| **20:20** | 매월 25일 | 한국은행 일반 경제지표 수집 (`bok.go.kr.v4 gindex`) | 데이터 수집 |
| **20:25** | 매월 25일 | 한국은행 금융시장 지표 수집 (`bok.go.kr.v4 mindex`) | 데이터 수집 |
| **20:30** | 매월 25일 | 한국은행 경제 트렌드 수집 (`bok.go.kr.v4 trends`) | 데이터 수집 |
| **20:10** | 매일 (평일) | 라즈베리파이 야간 자동 종료 (`shutdown -h now`) | 시스템 운영 |

---

## 1. 📊 데이터 수집 애플리케이션 (Data Collectors)

| 애플리케이션명 | 바이너리 / 스크립트 경로 | 수집 대상 (데이터 소스) | 수집 주기 (Cron 표현식) | 주요 실행 인자 | 로그 파일 (`log/cron/`) | 비고 / 잠금(Lock) |
|:---|:---|:---|:---|:---|:---|:---|
| **네이버 주식 크롤러** | `bin/stock-crawler` | 네이버 증권 포털 (관심종목 장중 시세, 호가, 등락률) | 평일 09:00~15:50<br/>`*/10 9-15 * * 1-5` | `--conf=$DEVEL_CFG/common.conf`<br/>`--list=$EXTERN_CFG/crawler.list` | `stock_crawler.log` | • 실행 전 `git pull` 자동 수행<br/>• 조건 충족 시 Slack 발송<br/>• `stock-crawler.lock` |
| **주식 전종목 요약 푸시** | `bin/stock-crawler` | 네이버 증권 포털 (관심 전종목 요약 브리핑) | 평일 10:00~16:00 (정시)<br/>`0 10-16 * * 1-5` | `--push`<br/>`--conf=$DEVEL_CFG/common.conf`<br/>`--list=$EXTERN_CFG/crawler.list` | `stock_crawler_push.log` | • 임계치 필터링 없이 전체 요약 Slack 전송<br/>• `stock-crawler-push.lock` |
| **한국은행 일별 지표** | `bin/bok.go.kr.v4` | 한국은행 ECOS API (기준금리, 콜금리, 국고채 등 일별 금융 데이터) | 평일 10:05<br/>`05 10 * * 1-5` | `--purpose=daily`<br/>`--since=7` | `bok_daily.log` | • 최근 7일치 데이터 동기화<br/>• `bok-go-kr-daily.lock` |
| **공공데이터 일별 통계** | `bin/data.go.kr.v4` | 공공데이터포털 API (COVID-19 감염/사망 현황 등 일별 공공통계) | 평일 17:00<br/>`00 17 * * 1-5` | (기본 목적: daily) | `data_go_kr_daily.log` | • 일별 통계 수집 및 저장<br/>• `data-go-kr.lock` |
| **암호화폐 및 주요 지수** | `bin/bitcoin` | 글로벌 거래소 및 증시 (비트코인 시세, 코스피/코스닥/다우/나스닥/S&P500) | 평일 17:35<br/>`35 17 * * 1-5` | `--conf=$DEVEL_CFG/common.conf` | `bitcoin.log` | • `stock.major_indices` 테이블 저장<br/>• `bitcoin.lock` |
| **환율 공공데이터** | `bin/data.go.kr.v4` | 공공데이터포털 / 수출입은행 API (주요국 통화별 매매기준율 환율) | 평일 18:00<br/>`00 18 * * 1-5` | `--purpose=exchange`<br/>`--since=7` | `data_go_kr_exchange.log` | • 최근 7일치 환율 데이터 동기화<br/>• `data-go-kr-exchange.lock` |
| **월별 인구통계 자동 스케줄러** | `go-dev.v4/.../pp.cron.sh`<br/>(내부 호출: `data.go.kr.v4`) | 행정안전부 주민등록 인구통계 (전국 시군구/읍면동/연령대별 인구·세대수) | 평일 09:00<br/>`00 09 * * 1-5`<br/>(2번째 월요일 기점 3일간) | `--purpose=population`<br/>`--purpose=population.lv1`<br/>`--today`, `--task="..."` | `population_cron.log` | • 매월 2주차 월요일 공개 감지<br/>• 3영업일간 분할 수집<br/>• 완료 후 비교 리포트 발송<br/>• `population-cron.lock` |
| **우주 관측 데이터 (JWST)** | `bin/jwst` | NASA/STScI 제임스 웹 우주망원경 공개 관측 메타데이터 및 천체 이미지 | 매주 금요일 18:15<br/>`15 18 * * 5` | `--common-conf=$DEVEL_CFG/common.conf` | `jwst.log` | • 주간 공개 관측 데이터/이미지 수집<br/>• `jwst.lock` |
| **한국은행 일반 경제지수** | `bin/bok.go.kr.v4` | 한국은행 ECOS API (소비자물가지수, 생산자물가지수, 수출입물가지수 등) | 매월 25일 20:20<br/>`20 20 25 * *` | `--purpose=gindex`<br/>`--since=40` | `bok_gindex.log` | • 최근 40개월 지표 수집<br/>• `bok-gindex.lock` |
| **한국은행 금융시장 지수** | `bin/bok.go.kr.v4` | 한국은행 ECOS API (통화량 M1/M2, 본원통화, 예금 및 대출 잔액 등) | 매월 25일 20:25<br/>`25 20 25 * *` | `--purpose=mindex`<br/>`--since=40` | `bok_mindex.log` | • 최근 40개월 지표 수집<br/>• `bok-mindex.lock` |
| **한국은행 경제 트렌드** | `bin/bok.go.kr.v4` | 한국은행 ECOS API (경기선행/동행지수, 경제심리지수 ESI 등 트렌드 지표) | 매월 25일 20:30<br/>`30 20 25 * *` | `--purpose=trends`<br/>`--since=30` | `bok_trends.log` | • 최근 30개월 트렌드 데이터 수집<br/>• `bok-trends.lock` |

---

## 2. 📈 모니터링 리포트 및 상태 알림 (Reporting & Monitoring)

| 작업명 | 스크립트 경로 | 실행 목적 및 대상 | 실행 주기 | 주요 동작 | 로그 파일 |
|:---|:---|:---|:---|:---|:---|
| **수집주기별 일일 수집 현황 리포트** | `go-dev.v4/report/collection_cycle_report.sh` | 전체 수집 데이터베이스 적재 상태 종합 점검 | 평일 18:00<br/>`00 18 * * 1-5` | 1. `collection_cycle_report.sql` 쿼리 실행<br/>2. `stock.daily_report` 테이블에 결과 저장<br/>3. 환경변수 설정 시 이메일/Slack 발송 | `collection_cycle_report.log` |
| **월간 인구 비교 리포트** | `go-dev.v4/report/population_report.py` | 전월 및 전년 동월 대비 인구 증감 분석 | 인구 3일 수집 완료 시점 (3일차 자동 호출) | 1. 전국/시도별 인구 증감률 통계 분석<br/>2. Slack 채널로 종합 인구 리포트 발송 | `population_cron.log` |

---

## 3. 🛠️ 시스템 운영, 백업 및 동기화 작업 (Operations & Backup)

| 작업명 | 실행 명령 / 스크립트 | 대상 및 작업 내용 | 실행 주기 | 비고 / 잠금(Lock) |
|:---|:---|:---|:---|:---|
| **설정/코드 원격 푸시** | `/home/pi/new-horizons-conf/push.git.sh firstpi` | 소스코드 및 설정 파일 변경분을 Git 원격 저장소로 자동 푸시 | 평일 19:00<br/>`00 19 * * 1-5` | `push_git.log` |
| **프론트엔드 보조 노드 동기화** | `frontend/sync_to_secondpi.sh` | 변경된 프론트엔드 빌드 결과물을 Second Pi(보조 라즈베리파이)로 자동 rsync/배포 | 매일 19:00<br/>`00 19 * * *` | `frontend_sync.log`<br/>`frontend-sync.lock` |
| **MariaDB 일일 백업** | `opt/db-backdup/daily_dump.sh` | MariaDB `stock`, `vote` 데이터베이스 일일 압축 덤프 및 Dropbox 클라우드 전송 | 매일 19:05<br/>`05 19 * * *` | `db_backup.log`<br/>`db-backup.lock` |
| **오래된 로그 정리 (Cleanup)** | `find /home/pi/new-horizons/log -type f -mtime +7 -exec rm -f {} \;` | 7일 이상 경과한 런타임 및 크론 로그 파일 자동 삭제 디스크 용량 확보 | 매일 19:30<br/>`30 19 * * *` | - |
| **라즈베리파이 야간 자동 종료** | `sudo shutdown -h now` | 야간 비가동 시간대 절전 및 기기 발열 방지를 위한 자동 셧다운 | 평일 20:10<br/>`10 20 * * 1-5` | 백업 및 수집 작업 완료 확인 후 셧다운 |

---

## 4. ⚙️ 공통 운영 환경 및 안전 정책 (Execution Policy)

### 1) 환경 변수 및 설정 파일 경로
- `$DEVEL_CFG`: `/home/pi/new-horizons/cfg` (또는 `go-dev.v4/cfg`)
  - `common.conf`: DB 연결 문자열, 공통 경로 및 로깅 레벨
  - `openapi.conf`: 공공데이터포털 API Key & Endpoints
  - `openbok.conf`: 한국은행 ECOS API Key & 통계 코드
  - `opendart.conf`: 금융감독원 DART API Key
- `$EXTERN_CFG`: 크롤링 종목 리스트(`crawler.list`) 등 외부 참조 설정
- `CRON_LOG_DIR`: `/home/pi/new-horizons/log/cron` (표준출력 및 에러 로그 자동 분리/기록)

### 2) 중복 실행 방지 정책 (Lock Policy)
- 모든 중요 수집 작업은 리눅스 `flock -n /tmp/<task-name>.lock` 유틸리티를 적용하여 실행됩니다.
- 이전 주기의 작업이 아직 종료되지 않은 경우 새로운 스케줄은 대기하지 않고 **즉시 스킵(Non-blocking)**되어 시스템 리소스 고갈 및 DB 트랜잭션 충돌을 방지합니다.

### 3) 선거/영화 수집기 등 비정기 인제스트 도구 참고
- **`vote/ingest_president_election.py`**: 대통령 선거 데이터 적재 (선거 주기별 수동/이벤트성 실행)
- **`movie/collector.py` / `movie/import_kobis.py`**: 전세계/국내 박스오피스 수집 (연도별 수동/배치 실행)
