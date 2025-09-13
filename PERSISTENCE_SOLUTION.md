# Persistence Solution for QuickPoll

## Problem
Current in-memory storage loses all data when server restarts, causing "No active poll found" errors.

## Solution Options

### Option 1: SQLite Database (Recommended)
```javascript
// server/storage/sqliteStore.js
const sqlite3 = require('sqlite3').verbose();

class SQLiteStore {
  constructor() {
    this.db = new sqlite3.Database('quickpoll.db');
    this.initializeDatabase();
  }

  initializeDatabase() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        options TEXT NOT NULL,
        require_auth BOOLEAN DEFAULT TRUE,
        valid_emails TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        session_id TEXT,
        is_closed BOOLEAN DEFAULT FALSE,
        closed_at DATETIME
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER,
        vote_data TEXT NOT NULL,
        voter_identifier TEXT,
        session_id TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poll_id) REFERENCES polls (id)
      )
    `);
  }

  async getCurrentPoll() {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM polls WHERE is_closed = FALSE ORDER BY created_at DESC LIMIT 1",
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? this.formatPoll(row) : null);
        }
      );
    });
  }

  async createPoll(pollData) {
    return new Promise((resolve, reject) => {
      // First close any existing polls
      this.db.run("UPDATE polls SET is_closed = TRUE WHERE is_closed = FALSE", (err) => {
        if (err) return reject(err);
        
        // Create new poll
        const stmt = this.db.prepare(`
          INSERT INTO polls (title, description, type, options, require_auth, valid_emails, created_by, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
          pollData.title,
          pollData.description,
          pollData.type,
          JSON.stringify(pollData.options),
          pollData.requireAuth,
          JSON.stringify(pollData.validEmails || []),
          pollData.createdBy,
          pollData.sessionId
        ], function(err) {
          if (err) reject(err);
          else {
            // Retrieve the created poll
            this.db.get("SELECT * FROM polls WHERE id = ?", [this.lastID], (err, row) => {
              if (err) reject(err);
              else resolve(this.formatPoll(row));
            });
          }
        });
        
        stmt.finalize();
      });
    });
  }

  formatPoll(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      options: JSON.parse(row.options),
      requireAuth: Boolean(row.require_auth),
      validEmails: JSON.parse(row.valid_emails || '[]'),
      createdAt: row.created_at,
      createdBy: row.created_by,
      sessionId: row.session_id,
      isClosed: Boolean(row.is_closed),
      closedAt: row.closed_at
    };
  }
}

module.exports = SQLiteStore;
```

### Option 2: File-Based Storage
```javascript
// server/storage/fileStore.js
const fs = require('fs').promises;
const path = require('path');

class FileStore {
  constructor() {
    this.dataFile = path.join(__dirname, '../data/polls.json');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    const dir = path.dirname(this.dataFile);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { currentPoll: null, votes: [] };
    }
  }

  async saveData(data) {
    await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
  }

  async getCurrentPoll() {
    const data = await this.loadData();
    return data.currentPoll;
  }

  async createPoll(pollData) {
    const data = await this.loadData();
    data.currentPoll = {
      ...pollData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isClosed: false
    };
    data.votes = []; // Clear votes for new poll
    await this.saveData(data);
    return data.currentPoll;
  }
}

module.exports = FileStore;
```

### Option 3: Environment Variable Configuration
```javascript
// server/storage/index.js
const MemoryStore = require('./memoryStore');
const SQLiteStore = require('./sqliteStore');
const FileStore = require('./fileStore');

function createStore() {
  const storeType = process.env.STORAGE_TYPE || 'memory';
  
  switch (storeType) {
    case 'sqlite':
      return new SQLiteStore();
    case 'file':
      return new FileStore();
    case 'memory':
    default:
      console.warn('⚠️  Using in-memory storage - data will be lost on restart');
      return new MemoryStore();
  }
}

module.exports = { createStore };
```

## Implementation Steps

1. **Choose Storage Type**: SQLite recommended for production
2. **Install Dependencies**: `npm install sqlite3` (for SQLite option)
3. **Replace Storage**: Update server.js to use persistent store
4. **Test Migration**: Verify polls persist across server restarts
5. **Deploy**: Set environment variables for production

## Environment Variables
```bash
# For development
STORAGE_TYPE=file

# For production
STORAGE_TYPE=sqlite
DATABASE_PATH=/app/data/quickpoll.db
```

This solution will ensure polls persist across server restarts and deployments.
