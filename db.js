const Database = require('better-sqlite3');
const db = new Database('./wincms_history.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS monitor_log (
    index       INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     TEXT UNIQUE NOT NULL,
    detected_at TEXT NOT NULL
  )
`);

function insertLog(post) {
  db.prepare(`
    INSERT OR IGNORE INTO monitor_log (post_id, detected_at)
    VALUES (?, ?)
  `).run(post.postId, new Date().toISOString());
}

module.exports = { db, insertLog };