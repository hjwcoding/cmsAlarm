const Database = require('better-sqlite3');
const db = new Database('./wincms_history.db');

const rows = db.prepare(`
  SELECT idx, post_id, detected_at
  FROM monitor_log
  ORDER BY detected_at DESC
  LIMIT 20
`).all();

if (rows.length === 0) {
  console.log('데이터 없음');
} else {
  console.table(rows);
  console.log(`총 ${rows.length}건`);
}