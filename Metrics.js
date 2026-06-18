const express = require('express');
const client = require('prom-client');
const { db } = require('./db');

const app = express();
const register = new client.Registry();

// 날짜별 유입 수 게이지
const dailyCount = new client.Gauge({
  name: 'cms_daily_count',
  help: '날짜별 cms 유입 수',
  labelNames: ['date'],
  registers: [register],
});

// 시간별 유입 수 게이지
const hourlyCount = new client.Gauge({
  name: 'cms_hourly_count',
  help: '시간별 cms 유입 수',
  labelNames: ['hour'],
  registers: [register],
});

// 전체 누적 건수 게이지
const totalCount = new client.Gauge({
  name: 'cms_total_count',
  help: 'cms 전체 누적 유입 수',
  registers: [register],
});

app.get('/metrics', async (req, res) => {
  // 날짜별 집계
  const dailyRows = db.prepare(`
    SELECT strftime('%Y-%m-%d', detected_at) AS date, COUNT(*) AS cnt
    FROM monitor_log
    GROUP BY date
    ORDER BY date
  `).all();

  dailyCount.reset();
  for (const row of dailyRows) {
    dailyCount.set({ date: row.date }, row.cnt);
  }

  // 시간별 집계
  const hourlyRows = db.prepare(`
    SELECT strftime('%H', detected_at) AS hour, COUNT(*) AS cnt
    FROM monitor_log
    GROUP BY hour
    ORDER BY hour
  `).all();

  hourlyCount.reset();
  for (const row of hourlyRows) {
    hourlyCount.set({ hour: row.hour + '시' }, row.cnt);
  }

  // 전체 누적
  const total = db.prepare(`
    SELECT COUNT(*) AS cnt FROM monitor_log
  `).get();

  totalCount.set(total.cnt);

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const PORT = 9091;
app.listen(PORT, () => {
  console.log(`✅ Metrics 서버 실행 중: http://localhost:${PORT}/metrics`);
});