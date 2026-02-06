/**
 * Session DB - SQLite-based session storage
 * Replaces file-based JSON session storage with WAL-mode SQLite.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'sessions.db');

// Ensure data/ directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 3000');

// Create sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Prepared statements (reusable for performance)
const stmts = {
  get: db.prepare('SELECT data FROM sessions WHERE id = ?'),
  upsert: db.prepare(`
    INSERT INTO sessions (id, data, created_at, updated_at)
    VALUES (@id, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET data = @data, updated_at = @updated_at
  `),
  delete: db.prepare('DELETE FROM sessions WHERE id = ?'),
  list: db.prepare('SELECT id, data, created_at, updated_at FROM sessions ORDER BY created_at DESC'),
  deleteExpired: db.prepare('DELETE FROM sessions WHERE created_at < ?'),
  count: db.prepare('SELECT COUNT(*) as cnt FROM sessions'),
};

/**
 * Get a session by ID
 * @param {string} id - Session ID
 * @returns {object|undefined} Parsed session data or undefined
 */
function getSession(id) {
  const row = stmts.get.get(id);
  if (!row) return undefined;
  try {
    return JSON.parse(row.data);
  } catch (e) {
    console.warn(`[SessionDB] Failed to parse session ${id}:`, e.message);
    return undefined;
  }
}

/**
 * Save (upsert) a session
 * @param {string} id - Session ID
 * @param {object} data - Session data object
 */
function saveSession(id, data) {
  const now = new Date().toISOString();
  const createdAt = data.createdAt || now;
  stmts.upsert.run({
    id,
    data: JSON.stringify(data),
    created_at: createdAt,
    updated_at: now,
  });
}

/**
 * Delete a session by ID
 * @param {string} id - Session ID
 */
function deleteSession(id) {
  stmts.delete.run(id);
}

/**
 * List all sessions (returns parsed data)
 * @returns {Array<object>} Array of session objects
 */
function listSessions() {
  const rows = stmts.list.all();
  return rows.map(row => {
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Delete sessions created before the given ISO timestamp
 * @param {string} beforeISO - ISO timestamp cutoff
 * @returns {number} Number of deleted sessions
 */
function deleteExpired(beforeISO) {
  const result = stmts.deleteExpired.run(beforeISO);
  return result.changes;
}

/**
 * Get total session count
 * @returns {number}
 */
function count() {
  return stmts.count.get().cnt;
}

/**
 * Close the database (for graceful shutdown)
 */
function close() {
  db.close();
}

module.exports = {
  getSession,
  saveSession,
  deleteSession,
  listSessions,
  deleteExpired,
  count,
  close,
};
