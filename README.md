# CMS 서비스 품질 모니터링 & 결함 관리 자동화

> 실서비스 이상 징후를 자동 감지하고 Jira 기반 결함 추적 프로세스와 연동한 QA 자동화 시스템입니다.

---

## 📌 프로젝트 배경 및 목적

CMS 게시판에서 처리 지연 항목(전달/등록)이 발생해도 담당자가 수동으로 확인하기 전까지 인지가 불가능한 구조였습니다.

이를 해결하기 위해 다음 QA 목표를 설정하고 자동화 시스템을 구축했습니다.

- **결함 조기 감지**: 서비스 이상 항목을 5분 이내 자동 탐지
- **결함 추적 자동화**: 감지된 이슈를 Jira 티켓으로 자동 생성
- **무중단 모니터링**: 24/7 스케줄 기반 회귀 감시 체계 구성
- **운영 이력 저장**: SQLite 기반 감지 이력 영구 보관
- **실시간 시각화**: Grafana 대시보드를 통한 유입 현황 모니터링

---

## 🔄 시스템 흐름

```
node-cron 트리거 (*/5 * * * *)
        ↓
Playwright 기반 서비스 자동 접근 및 상태 수집
        ↓
게시판 데이터 파싱 및 이상 항목 판별
        ↓
    ┌───┴───┐
  이상 감지     정상
    ↓            ↓
Jira 티켓    다음 주기 대기
자동 생성
    ↓
메신저 알림 발송
    ↓
SQLite DB 이력 저장
    ↓
Prometheus → Grafana 시각화
```

---

## 🛠 기술 스택

| 항목 | 내용 |
|---|---|
| 브라우저 자동화 | **Playwright** (Chromium headless) |
| 스케줄러 | node-cron |
| 이슈 추적 | **Jira REST API** |
| 알림 | 메신저 API |
| Runtime | Node.js |
| DB | **SQLite** (better-sqlite3) |
| 메트릭 수집 | **Prometheus** |
| 시각화 | **Grafana** |
| 컨테이너 | **Docker** |

---

## 🧪 QA 자동화 핵심 구현

### 1. 이상 감지 로직

- 완료여부 컬럼 기준 `전달` / `등록` 상태 필터링
- 정상 상태와 비정상 상태를 명확히 분류하는 판별 기준 정의
- iframe 중첩 구조 환경에서의 안정적인 요소 탐색

### 2. 결함 중복 방지

- `postId` 기준 `Set` 자료구조로 동일 이슈 중복 알림 차단
- 신규 / 기존 이슈 구분으로 결함 추적 정확도 향상

### 3. Jira 연동 결함 관리

- 이상 감지 즉시 Jira 티켓 자동 생성
- 담당자 자동 할당 및 이슈 추적 연결

### 4. 안정성 처리

- 세션 만료 시 자동 재로그인 후 재시도
- 토큰 만료(`401`) 감지 및 자동 갱신
- 예외 상황에서도 모니터링 중단 없이 지속 실행

---

## 🗄 운영 이력 저장 (SQLite)

감지된 항목을 SQLite DB에 영구 저장하여 운영 이력을 관리합니다.

### 테이블 구조

| 컬럼 | 타입 | 설명 |
|---|---|---|
| idx | INTEGER | 자동 증가 순번 (PK) |
| post_id | TEXT | WinCMS 게시물 ID (중복 방지) |
| detected_at | TEXT | 감지 시각 (ISO 8601) |

### 설치

```bash
npm install better-sqlite3
```

> ⚠️ Windows 환경에서는 빌드 도구가 필요할 수 있습니다.
> 설치 오류 발생 시 아래 명령어를 먼저 실행하세요.
> ```bash
> npm install --global node-gyp
> ```

### DB 확인 방법

```bash
node check_db.js
```

VS Code에서 확인하려면 확장 프로그램 **SQLite Viewer** (Florian Klampfer) 를 설치하면 `.db` 파일을 클릭만 해도 테이블 내용을 바로 볼 수 있습니다.

---

## 📊 Grafana 모니터링 대시보드

날짜별 / 시간별 유입 현황을 Grafana 대시보드로 실시간 시각화합니다.

### 전체 구조

```
metrics.js (:9091/metrics)
        ↓
Prometheus (:9090)  ← 15초마다 메트릭 수집
        ↓
Grafana (:3000)     ← 대시보드 시각화
```

### 1단계 — 패키지 설치

```bash
npm install prom-client express
```

### 2단계 — Grafana & Prometheus Docker 실행

> Docker Desktop이 실행 중인 상태에서 진행하세요.

```bash
# Grafana 실행
docker run -d --name grafana -p 3000:3000 grafana/grafana

# Prometheus 실행 (프로젝트 루트에서 실행)
docker run -d --name prometheus -p 9090:9090 \
  -v C:\{프로젝트경로}\prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

> ⚠️ Windows에서는 `${PWD}` 대신 절대 경로를 사용해야 합니다.

### 3단계 — Metrics 서버 실행

```bash
node metrics.js
```

실행 후 브라우저에서 확인:
```
http://localhost:9091/metrics
```

아래와 같이 출력되면 정상입니다.
```
# HELP wincms_daily_count 날짜별 WinCMS 유입 수
wincms_daily_count{date="2026-06-10"} 3
wincms_daily_count{date="2026-06-11"} 4
...
wincms_total_count 15
```

### 4단계 — Grafana Datasource 연결

1. `http://localhost:3000` 접속 (초기 계정: admin / admin)
2. 좌측 메뉴 **Connections → Data sources**
3. **Add data source → Prometheus** 선택
4. Connection URL 입력:
   ```
   http://host.docker.internal:9090
   ```
   > `localhost`가 아닌 `host.docker.internal`을 사용해야 Docker 컨테이너에서 로컬 호스트에 접근할 수 있습니다.
5. **Save & test** 클릭 → `Successfully queried` 확인

### 5단계 — 대시보드 패널 구성

**날짜별 유입 수 패널**

1. **Dashboards → New → New dashboard → Add visualization**
2. Metric: `wincms_daily_count`
3. Options → Type: **Instant**
4. 시각화 타입: **Bar chart**
5. Title: `날짜별 WinCMS 유입 수`

**시간별 유입 수 패널**

1. 동일하게 패널 추가
2. Metric: `wincms_hourly_count`
3. Options → Type: **Instant**
4. 시각화 타입: **Bar chart**
5. Title: `시간별 WinCMS 유입 수`

**전체 누적 건수 패널**

1. 동일하게 패널 추가
2. Metric: `wincms_total_count`
3. 시각화 타입: **Stat**
4. Title: `전체 누적 유입 수`

### prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'wincms'
    static_configs:
      - targets: ['host.docker.internal:9091']
```

---

## 📈 성과

| 지표 | 개선 내용 |
|---|---|
| 이상 감지 시간 | 수동 확인 대비 평균 감지 시간 단축 |
| 결함 누락률 | Jira 자동 생성으로 수동 등록 누락 제거 |
| 모니터링 커버리지 | 24/7 무중단 자동 감시 체계 구축 |
| 운영 이력 | SQLite 기반 전체 감지 이력 영구 보관 |
| 시각화 | Grafana 대시보드로 날짜/시간별 유입 현황 실시간 확인 |

---

## 📂 디렉토리 구조

```
project/
├── monitor.js          # 서비스 상태 감지 및 이상 탐지
├── jiraTicketSend.js   # Jira 결함 티켓 자동 생성
├── scheduler.ts        # 모니터링 스케줄 관리
├── scraper.ts          # 서비스 데이터 수집
├── db.js               # SQLite DB 초기화 및 이력 저장
├── metrics.js          # Prometheus 메트릭 노출 서버
├── check_db.js         # DB 데이터 확인 스크립트
├── prometheus.yml      # Prometheus 수집 설정
├── wincms_history.db   # SQLite DB (gitignore 처리)
└── package.json
```

---

## 🔧 실행

```bash
# 패키지 설치
npm install
npx playwright install chromium

# 모니터링 시작
node monitor.js

# 메트릭 서버 시작 (별도 터미널)
node metrics.js

# Docker 컨테이너 실행
docker run -d --name grafana -p 3000:3000 grafana/grafana
docker run -d --name prometheus -p 9090:9090 \
  -v C:\{프로젝트경로}\prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

---

## ⚙️ 환경 변수 (.env)

```
CONFIG_loginUrl=
CONFIG_boardUrl=
CONFIG_id=
CONFIG_pw=
CONFIG_birth=
DAOU_CONFIG_loginUrl=
DAOU_CONFIG_messageUrl=
DAOU_CONFIG_chatRoomId=
DAOU_CONFIG_id=
DAOU_CONFIG_pw=
```
