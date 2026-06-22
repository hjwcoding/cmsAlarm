# CMS 서비스 품질 모니터링 & 결함 관리 자동화

> 실서비스 이상 징후를 자동 감지하고 Jira 기반 결함 추적 프로세스와 연동한 QA 자동화 시스템입니다.
> Playwright로 게시판을 주기적으로 점검하고, 이상 항목을 발견하면 Jira 티켓 생성 → 메신저 알림 → DB 이력 저장 → Grafana 시각화까지 자동으로 처리합니다.

---

## 📌 프로젝트 배경 및 목적

CMS 게시판에서 처리 지연 항목(전달/등록)이 발생해도 담당자가 수동으로 확인하기 전까지 인지가 불가능한 구조였습니다.

이를 해결하기 위해 다음 QA 목표를 설정하고 자동화 시스템을 구축했습니다.

- **결함 조기 감지**: 서비스 이상 항목을 5분 이내 자동 탐지
- **결함 추적 자동화**: 감지된 이슈를 Jira 티켓으로 자동 생성
- **무중단 모니터링**: 24/7 스케줄 기반 회귀 감시 체계 구성 (PM2 데몬화)
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
| 프로세스 관리 | **PM2** |

---

# 🚀 빠른 시작 (처음 사용하는 사람용)

> 이 프로젝트를 처음 보는 사람도 아래 순서대로만 따라 하면 전체 시스템을 실행할 수 있습니다.
> 용어가 생소해도 괜찮습니다. 각 단계마다 "이게 무엇인지"를 함께 설명합니다.

## 사전 준비물

설치를 시작하기 전에 아래 3가지가 PC에 설치되어 있어야 합니다.

| 프로그램 | 용도 | 확인 명령어 | 설치처 |
|---|---|---|---|
| **Node.js** (LTS) | 자바스크립트 실행 환경 | `node -v` | https://nodejs.org |
| **Git** | 소스 코드 내려받기 | `git --version` | https://git-scm.com |
| **Docker Desktop** | Grafana/Prometheus 실행 | `docker --version` | https://www.docker.com/products/docker-desktop |

> 명령어를 입력했을 때 버전 숫자가 나오면 정상 설치된 것입니다.
> 숫자가 안 나오고 "명령어를 찾을 수 없다"는 메시지가 나오면 해당 프로그램을 먼저 설치하세요.

---

## STEP 1. 소스 코드 내려받기

```bash
git clone https://github.com/hjwcoding/cmsAlarm.git
cd cmsAlarm
```

> `git clone`은 GitHub에 올라간 코드를 내 PC로 복사하는 명령어입니다.
> `cd cmsAlarm`은 복사된 폴더 안으로 이동하는 명령어입니다.

---

## STEP 2. 패키지 설치

이 프로젝트가 동작하는 데 필요한 외부 라이브러리들을 한 번에 설치합니다.

```bash
npm install
npx playwright install chromium
```

> - `npm install` : `package.json`에 적힌 라이브러리를 자동으로 모두 내려받습니다.
> - `npx playwright install chromium` : Playwright가 제어할 브라우저(Chromium)를 설치합니다.

### ⚠️ better-sqlite3 설치 오류가 난다면

`better-sqlite3`는 C++로 만들어진 모듈이라, Windows에서는 빌드 도구가 없으면 설치에 실패할 수 있습니다.
아래 명령어를 먼저 실행한 뒤 다시 `npm install` 하세요.

```bash
npm install --global node-gyp
```

설치가 잘 됐는지 확인:

```bash
node -e "require('better-sqlite3')(':memory:'); console.log('better-sqlite3 OK');"
```

`better-sqlite3 OK`가 출력되면 정상입니다.

---

## STEP 3. 환경 변수 설정 (.env 파일)

로그인 정보, API 주소 등 민감한 값은 코드에 직접 쓰지 않고 `.env` 파일에 따로 보관합니다.
프로젝트 루트(최상위 폴더)에 `.env` 파일을 새로 만들고 아래 내용을 채워 넣으세요.

```
# WinCMS 로그인 정보
CONFIG_loginUrl=        # WinCMS 로그인 페이지 주소
CONFIG_boardUrl=        # 모니터링할 게시판 주소
CONFIG_id=              # WinCMS 아이디
CONFIG_pw=              # WinCMS 비밀번호
CONFIG_birth=           # 인증용 생년월일

# 다우메신저(알림) 정보
DAOU_CONFIG_loginUrl=   # 메신저 로그인 API 주소
DAOU_CONFIG_messageUrl= # 메신저 메시지 전송 API 주소
DAOU_CONFIG_chatRoomId= # 알림을 보낼 채팅방 ID
DAOU_CONFIG_id=         # 메신저 아이디
DAOU_CONFIG_pw=         # 메신저 비밀번호

# Jira 정보
JIRA_BASE_URL=          # Jira 인스턴스 주소
JIRA_EMAIL=             # Jira 계정 이메일
JIRA_API_TOKEN=         # Jira API 토큰
JIRA_PROJECT_KEY=       # 티켓을 생성할 프로젝트 키
```

> ⚠️ `.env` 파일은 비밀번호가 담겨 있으므로 **절대 GitHub에 올리면 안 됩니다.**
> 이 프로젝트의 `.gitignore`에는 이미 `.env`가 등록되어 있어 자동으로 제외됩니다.

---

## STEP 4. 모니터링 동작 테스트

먼저 정상 동작하는지 한 번 실행해 봅니다.

```bash
node monitor.js
```

> 콘솔에 "WinCMS 로그인 완료", "감지된 항목: N개" 같은 로그가 찍히면 정상 동작하는 것입니다.
> 확인이 끝나면 `Ctrl + C`로 종료하세요. (실제 운영은 STEP 7의 PM2로 합니다.)

---

## STEP 5. DB 데이터 확인

감지된 항목은 SQLite DB(`wincms_history.db`)에 자동으로 쌓입니다.

DB가 비어 있다면, 테스트용 목(mock) 데이터를 넣어볼 수 있습니다.

```bash
node insert_mock.js   # 테스트용 가짜 데이터 15건 삽입
node check_db.js      # DB에 저장된 데이터 확인
```

> - `insert_mock.js` : Grafana 화면을 미리 테스트할 수 있도록 날짜별 가짜 데이터를 넣습니다.
> - `check_db.js` : DB에 저장된 내용을 터미널에 표 형태로 보여줍니다.

**SQLite DB 테이블 구조**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| idx | INTEGER | 자동 증가 순번 (PK) |
| post_id | TEXT | WinCMS 게시물 ID (중복 방지) |
| detected_at | TEXT | 감지 시각 (ISO 8601) |

> 💡 VS Code 확장 **SQLite Viewer** (Florian Klampfer)를 설치하면
> `.db` 파일을 클릭하는 것만으로 데이터를 엑셀처럼 볼 수 있습니다.

---

## STEP 6. Grafana 모니터링 대시보드 구축

수집된 데이터를 그래프로 시각화합니다.
전체 구조는 다음과 같습니다.

```
metrics.js (:9091/metrics)   ← Node가 DB를 읽어 메트릭으로 노출
        ↓
Prometheus (:9090)           ← 15초마다 metrics.js를 긁어가 저장
        ↓
Grafana (:3000)              ← Prometheus 데이터를 그래프로 표시
```

> 처음 보면 복잡해 보이지만, 역할은 단순합니다.
> **metrics.js**(데이터 제공) → **Prometheus**(데이터 수집/저장) → **Grafana**(데이터 그리기) 의 3단 구조입니다.

### 6-1. 메트릭 노출 패키지 설치

```bash
npm install prom-client express
```

### 6-2. Metrics 서버 실행

```bash
node metrics.js
```

실행 후 브라우저에서 접속:
```
http://localhost:9091/metrics
```

아래처럼 숫자가 나오면 정상입니다.
```
# HELP wincms_daily_count 날짜별 WinCMS 유입 수
wincms_daily_count{date="2026-06-10"} 3
wincms_daily_count{date="2026-06-11"} 4
...
wincms_total_count 15
```

### 6-3. prometheus.yml 작성

프로젝트 루트에 `prometheus.yml` 파일을 만들고 아래 내용을 넣습니다.
이 파일은 "Prometheus가 어떤 주소에서 데이터를 가져올지" 알려주는 설정 파일입니다.

```yaml
global:
  scrape_interval: 15s          # 15초마다 데이터를 수집

scrape_configs:
  - job_name: 'wincms'
    static_configs:
      - targets: ['host.docker.internal:9091']   # metrics.js 주소
```

> `host.docker.internal`은 "도커 컨테이너 안에서 내 PC(호스트)를 가리키는 특별한 주소"입니다.
> 컨테이너 안의 Prometheus가 PC에서 돌아가는 metrics.js(:9091)에 접근하려면 이 주소를 써야 합니다.

### 6-4. Docker로 Grafana & Prometheus 실행

> Docker Desktop이 실행 중(고래 아이콘이 떠 있는 상태)인지 먼저 확인하세요.

```bash
# Grafana 실행
docker run -d --name grafana -p 3000:3000 grafana/grafana

# Prometheus 실행 (경로는 본인 PC의 실제 경로로 바꾸세요)
docker run -d --name prometheus -p 9090:9090 -v C:\Users\사용자명\경로\cmsAlarm\prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

> ⚠️ Windows에서는 리눅스식 `${PWD}`가 동작하지 않습니다. **반드시 절대 경로**를 적어주세요.
> 예: `C:\Users\kwic\Desktop\ggg\wcms_daoualarm\prometheus.yml`

컨테이너가 잘 떴는지 확인:

```bash
docker ps
```

`grafana`와 `prometheus`가 목록에 보이면 성공입니다.

### 6-5. Prometheus 수집 상태 확인

```
http://localhost:9090
```

접속 후 상단 메뉴 **Status → Targets** 에서 `wincms` 항목이 **UP** 이면 정상 수집 중입니다.

### 6-6. Grafana에서 Prometheus 연결

1. `http://localhost:3000` 접속 (초기 계정: **admin / admin**, 첫 로그인 시 비밀번호 변경)
2. 좌측 메뉴 **Connections → Data sources**
3. **Add data source → Prometheus** 선택
4. Connection URL 입력:
   ```
   http://host.docker.internal:9090
   ```
   > `localhost`가 아니라 `host.docker.internal`을 써야 합니다.
   > Grafana도 도커 컨테이너 안에서 돌기 때문에, PC의 Prometheus에 접근하려면 이 주소가 필요합니다.
5. 하단 **Save & test** 클릭 → `Successfully queried` 가 뜨면 연결 완료

### 6-7. 대시보드 패널 만들기

**① 날짜별 유입 수**

1. 좌측 **Dashboards → New → New dashboard → Add visualization**
2. Data source: **Prometheus** 선택
3. 하단 Metric: `wincms_daily_count`
4. 하단 **Options → Type: Instant** 로 변경
5. 우측 상단 시각화 타입을 **Bar chart** 로 변경
6. 우측 상단 Title: `날짜별 WinCMS 유입 수`

> 💡 그래프가 안 보이면 우측 상단 시간 범위를 **Last 7 days** 등으로 넓혀 보세요.
> 데이터가 들어온 날짜가 그 범위 안에 있어야 표시됩니다.

**② 시간별 유입 수**

1. 패널 추가 → Metric: `wincms_hourly_count`
2. Options → Type: **Instant**
3. 시각화 타입: **Bar chart**
4. Title: `시간별 WinCMS 유입 수`

**③ 전체 누적 건수**

1. 패널 추가 → Metric: `wincms_total_count`
2. 시각화 타입: **Stat**
3. Title: `전체 누적 유입 수`

마지막으로 우측 상단 **Save** 를 눌러 대시보드를 저장합니다.

---

## STEP 7. PM2로 무중단 운영 (24/7 자동 실행)

`node monitor.js`로 직접 실행하면 터미널을 닫는 순간 모니터링도 멈춥니다.
실제 운영에서는 **PM2**라는 도구를 사용해, 터미널을 닫아도 백그라운드에서 계속 돌게 만들고,
오류로 프로세스가 죽어도 자동으로 다시 살아나게 합니다.

### 7-1. PM2 설치

```bash
npm install --global pm2
```

### 7-2. 모니터링 & 메트릭 서버 실행

```bash
# 모니터링 프로세스 실행
pm2 start monitor.js --name cms-monitor

# 메트릭 서버 실행
pm2 start metrics.js --name cms-metrics
```

> `--name`은 프로세스에 알아보기 쉬운 이름을 붙여주는 옵션입니다.

### 7-3. 상태 확인 & 로그 보기

```bash
pm2 status            # 실행 중인 프로세스 목록 확인
pm2 logs cms-monitor  # 모니터링 로그 실시간 확인
pm2 logs cms-metrics  # 메트릭 서버 로그 확인
```

### 7-4. 자주 쓰는 PM2 명령어

```bash
pm2 restart cms-monitor   # 재시작
pm2 stop cms-monitor      # 중지
pm2 delete cms-monitor    # 프로세스 목록에서 제거
```

### 7-5. PC 재부팅 후 자동 실행 설정

```bash
pm2 startup     # 부팅 시 자동 실행 등록 (안내되는 명령어를 한 번 더 실행)
pm2 save        # 현재 실행 중인 프로세스 목록을 저장
```

> `pm2 save`까지 하면, PC를 재부팅해도 등록한 프로세스가 자동으로 다시 실행됩니다.

### ⚠️ Playwright + PM2 사용 시 주의 (Chromium 실행 오류)

PM2 백그라운드 환경에서는 GPU 관련 문제로 Chromium이 실행되지 않을 수 있습니다.
이 경우 `monitor.js`의 브라우저 실행 옵션에 아래 인자를 추가하세요.

```js
browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu', '--disable-software-rasterizer'],
});
```

---

## 📈 성과

| 지표 | 개선 내용 |
|---|---|
| 이상 감지 시간 | 수동 확인 대비 평균 감지 시간 단축 |
| 결함 누락률 | Jira 자동 생성으로 수동 등록 누락 제거 |
| 모니터링 커버리지 | PM2 기반 24/7 무중단 자동 감시 체계 구축 |
| 운영 이력 | SQLite 기반 전체 감지 이력 영구 보관 |
| 시각화 | Grafana 대시보드로 날짜/시간별 유입 현황 실시간 확인 |

---

## 📂 디렉토리 구조

```
cmsAlarm/
├── monitor.js          # 서비스 상태 감지 및 이상 탐지 (메인)
├── jiraTicketSend.js   # Jira 결함 티켓 자동 생성
├── scheduler.ts        # 모니터링 스케줄 관리
├── db.js               # SQLite DB 초기화 및 이력 저장
├── metrics.js          # Prometheus 메트릭 노출 서버
├── check_db.js         # DB 데이터 확인 스크립트 (개발용)
├── insert_mock.js      # 테스트용 목데이터 삽입 (개발용)
├── prometheus.yml      # Prometheus 수집 설정
├── wincms_history.db   # SQLite DB (gitignore 처리, 자동 생성)
├── .env                # 환경 변수 (gitignore 처리, 직접 생성)
└── package.json
```

---

## 🧪 QA 자동화 핵심 구현 (상세)

### 1. 이상 감지 로직
- 완료여부 컬럼 기준 `전달` / `등록` 상태 필터링
- 정상 상태와 비정상 상태를 명확히 분류하는 판별 기준 정의
- iframe 중첩 구조 환경에서의 안정적인 요소 탐색

### 2. 결함 중복 방지
- `postId` 기준 `Set` 자료구조로 동일 이슈 중복 알림 차단
- 신규 / 기존 이슈 구분으로 결함 추적 정확도 향상
- SQLite `UNIQUE` 제약으로 DB 레벨 중복 저장 방지

### 3. Jira 연동 결함 관리
- 이상 감지 즉시 Jira 티켓 자동 생성
- 담당자 자동 할당 및 이슈 추적 연결

### 4. 안정성 처리
- 세션 만료 시 자동 재로그인 후 재시도
- 토큰 만료(`401`) 감지 및 자동 갱신
- 예외 상황에서도 모니터링 중단 없이 지속 실행
- PM2 프로세스 관리로 비정상 종료 시 자동 복구

---

## ❓ 자주 묻는 문제 (Troubleshooting)

| 증상 | 원인 | 해결 |
|---|---|---|
| `better-sqlite3` 설치 실패 | 빌드 도구 부재 | `npm install --global node-gyp` 후 재설치 |
| Grafana에서 No data | 시간 범위 밖의 데이터 | 우측 상단 시간 범위를 Last 7 days로 확대 |
| Grafana datasource 연결 실패 | `localhost` 사용 | URL을 `host.docker.internal:9090`으로 변경 |
| Docker 이미지 다운로드 실패 | 사내 프록시 차단 | 프록시(예: Fiddler) 가동 후 재시도 |
| PM2에서 Chromium 실행 안 됨 | GPU 렌더링 문제 | launch args에 `--disable-gpu` 추가 |
