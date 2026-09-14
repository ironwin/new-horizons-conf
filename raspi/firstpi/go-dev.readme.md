# New Horizons (My New Horizons)

라즈베리 파이(Raspberry Pi) 기반의 데이터 수집, 가공, 저장, 분석 및 통합 웹 대시보드 모니터링 플랫폼입니다.  
금융/주식, 거시경제 지표, 공공데이터(인구·휴일·천문), 기업 전자공시(DART), 영화 박스오피스, 역대 선거 통계, 우주 관측 데이터(JWST) 등 다양한 도메인의 데이터를 주기적으로 수집하고 가공하여 웹 대시보드와 슬랙 알림 등으로 제공합니다.

> 💡 **애플리케이션 및 수집 주기 상세 안내**: Crontab에 등록된 애플리케이션 목록, 수집 대상, 수집 주기 및 실행 인자는 **[APP.md](file:///home/pi/new-horizons/APP.md)** 문서를 참고하세요.


---

## 📂 디렉토리별 구조 및 내용 정리

프로젝트 루트의 주요 디렉토리별 역할과 구성 요소는 다음과 같습니다:

```
new-horizons/
├── go-dev.v4/       # [주력] 최신 Go 백엔드 서비스 및 데이터 수집기 개발 환경
├── go-dev.v3/       # [레거시] v3 Go 서비스 소스 아카이브
├── go-dev.v2/       # [레거시] v2 Go 서비스 소스 아카이브
├── frontend/        # React + TypeScript + Vite 대시보드 웹 앱 및 단독 배포 서버
├── bin/             # 빌드된 Go 실행 바이너리 및 크론 실행 스크립트
├── cfg/             # 운영 환경용 공통 및 서비스별 설정 파일 (.conf, .env)
├── movie/           # 전세계(The Numbers) & 국내(KOBIS) 박스오피스 수집 및 분석
├── vote/            # 역대 대한민국 대통령 선거(13~21대) 개표·인구 데이터 인제스트
├── raspberryPi/     # 라즈베리파이 하드웨어 설정, 팬/온도 제어, systemd 서비스 유닛
├── bash-utils/      # 인프라(K8s, Redis, Helm, Docker, Linux) 운영용 Bash 유틸리티
├── opt/             # MariaDB 일일 백업(Dropbox 동기화) 및 Grafana 백업
├── docker/          # Go 애플리케이션 컨테이너 이미지 빌드 환경
├── log/             # 서비스 실행 로그 및 Crontab 작업 로그
└── images/          # 대시보드 및 시스템 모니터링 스크린샷 이미지
```

---

### 1. `go-dev.v4/` (메인 백엔드 서비스)
현재 활발하게 개발·운영 중인 최신 Go 기반 마이크로서비스 및 데이터 파이프라인 모음입니다.

- **`services/`**: 도메인별 데이터 수집 및 API 마이크로서비스
  - **`api/`**: 모니터링 대시보드 웹 프론트엔드를 위한 REST API 서버 (`new-horizons-api`)
  - **`bitcoin/`**: 비트코인 및 글로벌/국내 주요 주가지수 수집기 (`stock.major_indices`)
  - **`bok.go.kr/`**: 한국은행(ECOS) API 연동 (금리 `girate`, 일반지수 `gindex`, 시장지수 `mindex`, 경제트렌드 `trend`)
  - **`crawler/`**: 증권 포털 사이트 크롤러 (주식 시세, 종목 정보 등)
  - **`dart.go.kr/`**: 금융감독원 전자공시(DART) 수집기 (기업 기본정보 `corp`, 주요 재무정보 `acnt`, 전년 재무 `acnt.lastyear`, 주요 지표 `indx`)
  - **`data.go.kr/`**: 공공데이터포털 API 연동 (일별 코로나 `daily`, 인구통계 `population`/`population.lv1`, 환율 `exchange`, 금융 `finance`, 천문 `astro`, 한국지수 `kindex`)
  - **`googlephoto/`**: Google Photos API 연동 및 앨범/사진 관리
  - **`holiday-kor/`**: 한국 천문연구원 공휴일 정보 수집기
  - **`jwst/`**: 제임스 웹 우주망원경(JWST) 관측 데이터 및 이미지 수집기
  - **`slack/`**: Slack Webhook 및 WebSocket 연동 알림 봇
- **`common/`**: 공통 Go 프레임워크 및 유틸리티 (DB 연결/풀링, HTTP 요청 유틸, 슬랙 알림, SCP 등)
- **`report/`**: 일일 데이터 수집 현황 요약, 통계 리포트, 이메일 및 슬랙 알림 자동화 스크립트 (Python/Bash/SQL)
- **`qry/`**: MariaDB 테이블 DDL 스키마, 마이그레이션 및 집계 쿼리문 모음
- **`cfg/`**: v4 서비스 전용 설정 템플릿 (`common.conf`, `openapi.conf`, `crawler.list`)
- **`build_all.sh`**: 전체 Go 마이크로서비스 일괄 빌드 스크립트
- **`crontab.final.*.txt`**: 실제 라즈베리파이에 등록되어 운용 중인 크론 스케줄러 설정 백업

---

### 2. `go-dev.v2/` & `go-dev.v3/` (레거시 아카이브)
- Go 백엔드 서비스의 이전 버전 소스코드입니다.
- 초기 구축 단계(v2)와 중간 개편 단계(v3)의 데이터 수집 파이프라인 및 프레임워크 히스토리를 보존하고 있습니다.

---

### 3. `frontend/` (대시보드 웹 애플리케이션)
수집된 데이터를 시각화하고 시스템 상태를 모니터링할 수 있는 프론트엔드 프로젝트입니다.

- **`MyNewHorizons/`**:
  - React 19 + TypeScript + Vite + TailwindCSS v4 기반 최신 대시보드 웹 애플리케이션
  - 상태 관리(`zustand`), 아이콘(`lucide-react`) 적용
- **`standalone-server/`**:
  - 라즈베리 파이(ARM64) 환경에서 Node.js/npm 없이 단독 실행 가능한 경량 Go 웹 서버(`new-horizons-frontend`) 및 백엔드 API 번들 패키지
  - 부팅 시 자동 실행을 위한 systemd 서비스 파일 및 `run.sh` 스크립트 포함
- **`sync_to_secondpi.sh`**:
  - 빌드된 프론트엔드 결과물을 보조 라즈베리파이(Second Pi)로 rsync/배포하는 자동화 스크립트

---

### 4. `bin/` (실행 바이너리)
빌드 완료된 네이티브 Go 실행 파일들과 주기적 데이터 수집 스크립트가 모여 있는 디렉토리입니다.
- 실행 파일: `new-horizons-api`, `data.go.kr.v4`, `bok.go.kr.v4`, `dart.go.kr.v4`, `bitcoin`, `stock-crawler`, `holiday-kor`, `jwst`, `slack` 등
- 스크립트: `pp.cron.sh` (인구통계 주기 수집 스크립트)

---

### 5. `cfg/` (런타임 환경 설정)
운영 환경에서 서비스 실행 시 참조하는 설정 파일 모음입니다.
- `common.conf`: DB 접속 정보, 공통 경로 및 로그 레벨 설정
- `openapi.conf`: 공공데이터포털 API 키 및 엔드포인트 설정
- `openbok.conf`: 한국은행 ECOS API 키 및 통계 항목 설정
- `opendart.conf`: 금융감독원 DART API 인증키 설정
- `crawler.list`: 주식 및 데이터 크롤링 대상 종목/회사 목록
- `*.slack.env`: 라즈베리파이 노드별(First Pi, Second Pi) 슬랙 웹훅 및 봇 토큰 환경변수

---

### 6. `movie/` (영화 박스오피스 수집/분석)
전세계 및 국내 영화 박스오피스 통계를 수집하여 MariaDB `movie` 데이터베이스에 적재하는 파이썬 모듈입니다.
- **`collector.py`**: [The Numbers](https://www.the-numbers.com) 웹사이트에서 1980년부터 현재까지의 연도별 전세계/북미/해외 박스오피스 순위 및 흥행 수익 크롤링
- **`import_kobis.py`**: 영화진흥위원회(KOBIS) 통합전산망의 연도별 박스오피스 엑셀 파일(`.xls`) 파싱 및 DB 적재
- **`stat-kr/`**: 수집된 KOBIS 연도별 박스오피스 엑셀 원본 데이터셋
- **`schema.sql`**: `box_office_yearly` 테이블 스키마 정의

---

### 7. `vote/` (선거 통계 데이터셋 및 인제스트)
대한민국 역대 대통령 선거 개표 데이터 및 유권자 인구 통계를 관리하는 모듈입니다.
- **`ingest_president_election.py`**: 엑셀 데이터를 파싱하여 MariaDB `vote` 데이터베이스에 적재하는 파이썬 스크립트
- **엑셀 원본 파일**:
  - `개표현황[제13대~제21대][대통령선거].xlsx`
  - `인구수현황[제15대~제21대][대통령선거].xlsx`

---

### 8. `raspberryPi/` (라즈베리파이 시스템 및 하드웨어 관리)
라즈베리파이 노드 운영, 발열 관리, 시스템 서비스 등록을 위한 스크립트와 가이드입니다.
- **`thermal-control/service.py`**: CPU 온도에 따라 쿨링팬 속도/동작을 자동으로 제어하는 파이썬 백그라운드 데몬
- **`raspi-sensors-collector.sh`**: CPU 온도, 메모리, 디스크 등 하드웨어 상태 센서 모니터링 스크립트
- **`services/`**: systemd 서비스 유닛 파일 모음
  - `new-horizons-frontend.service` / `new-horizons-api.service`: 프론트엔드 및 백엔드 API 데몬
  - `slackalert.service` / `slackapp.service`: 시스템 장애 알림 및 슬랙 봇 데몬
  - `node_exporter.service` / `pushgateway.service`: 프로메테우스 모니터링 메트릭 수집기
  - `magicmirror.service`: 매직미러 대시보드 디스플레이 데몬
- **`install.MD`, `24.04.md`, `24.11.md`**: Ubuntu/라즈베리파이 OS 설치 및 버전별 셋업 가이드

---

### 9. `bash-utils/` (인프라 & 개발 Bash 유틸리티)
시스템 엔지니어링 및 개발 생산성 향상을 위한 카테고리별 쉘 스크립트 라이브러리입니다.
- **`kubernetes/`**: K8s 파드 로그 확인(`log.sh`), exec 명령어 실행(`get-exec.sh`), 파드 attach 스크립트
- **`redis/`**: Redis 독립 서버, Sentinel 고가용성, Cluster 구성 자동화 스크립트 (`redis4*.sh`)
- **`helm/`**: Helm 차트 설치, 삭제 및 클린업 유틸리티
- **`linux/`**: 프로세스 모니터링(`proc-info.sh`), 파일 트리 출력(`tree.sh`), 마운트 초기화, FTP 자동화 등
- **`docker/`**: 컨테이너 관리 유틸
- **`sysbench/`**: 디스크 I/O 벤치마크 테스트 스크립트 (`disk.sh`)
- **`virsh/`**: KVM/QEMU 가상머신 자동 생성 스크립트 (`create.vm.sh`)
- **`go/`**: Go 벤치마크 테스트 실행 헬퍼 (`bench.sh`)

---

### 10. `opt/` (DB 백업 및 외부 동기화)
- **`db-backdup/`**:
  - `daily_dump.sh`: MariaDB `stock`, `vote` 등의 데이터베이스를 매일 자동으로 gzip 압축 덤프
  - `dropbox.sh`: 압축된 DB 덤프 파일을 Dropbox 클라우드 스토리지로 안전하게 전송 및 동기화
- **`grafana/`**:
  - Grafana 설정 및 대시보드 데이터를 Dropbox로 백업하는 스크립트

---

### 11. `docker/` (컨테이너화)
Go 애플리케이션을 가벼운 컨테이너 이미지로 빌드하기 위한 환경입니다.
- `Dockerfile`: 멀티스테이지 또는 경량 베이스 이미지를 활용한 Go 앱 컨테이너 명세
- `build.sh`: `docker.env` 설정 및 `version.txt` 버전을 기반으로 도커 이미지 일괄 빌드

---

### 12. `log/` (로그 저장소)
수집 서비스와 크론 작업이 남기는 실행 로그 디렉토리입니다.
- 일별 서비스 실행 로그: `data.go.kr.v4.*.log`, `bok.go.kr.v4.*.log`, `stock-crawler.*.log`, `bitcoin.*.log`
- `cron/`: Crontab에서 정기 실행되는 작업별 전용 로그 디렉토리 (`data_go_kr_daily.log`, `bok_daily.log`, `population_cron.log`, `stock_crawler.log` 등)

---

### 13. `images/` (스크린샷 및 시각 자료)
README 및 기술 문서에 사용되는 모니터링 화면 캡처 이미지들을 보관합니다.

---

## 🛠️ 개발 및 실행 가이드

### Go 환경 설정 및 전체 서비스 빌드
```bash
# 전체 Go 마이크로서비스 일괄 컴파일 (결과물은 /bin 디렉토리에 생성됨)
cd go-dev.v4
./build_all.sh
```

### 프론트엔드 대시보드 로컬 개발 및 빌드
```bash
cd frontend/MyNewHorizons
npm install
npm run dev     # 로컬 개발 서버 실행 (Vite)
npm run build   # 프로덕션 빌드 생성 (dist/)
```

### 라즈베리파이 단독 실행 (Standalone)
```bash
cd frontend/standalone-server
chmod +x new-horizons-frontend bin/new-horizons-api run.sh
./run.sh        # 백엔드 API 및 프론트엔드 웹 서버 동시 구동
# 웹 브라우저 접속: http://<RaspberryPi_IP>:3000
```

---

## 📊 기존 대시보드 및 인프라 아키텍처 참고

### Kubernetes HA Control Plane
Calico, Keepalived, HAProxy, Ceph 기반의 고가용성 제어 평면 구성
<br/>
<img src="images/kube-status.PNG" width="900px" title="kubernetes HA" alt="kubernetes status">
<br/>

### COVID-19 공공데이터 모니터링 (Grafana 연동)
- **일별 확진/사망 통계**:
  <br/>
  <img src="images/covid.PNG" width="900px" title="covid 일별 통계" alt="covid daily">
  <br/>
- **전세계 누적 확진 Worldmap**:
  <br/>
  <img src="images/worldmap.PNG" width="900px" title="covid 전세계 월드맵" alt="covid worldmap">
  <br/>
- **국내 지역별 누적 현황**:
  <br/>
  <img src="images/covid-korea.PNG" width="900px" title="covid 국내 현황" alt="covid korea">
