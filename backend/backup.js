const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'rosanah.db');
  const backupPath = path.join(backupDir, `rosanah_${timestamp}.db`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    console.warn(`⚠️  Backup skipped: source DB not found at ${dbPath}`);
    return;
  }

  let src;
  try {
    src = new Database(dbPath, { readonly: true });
  } catch (err) {
    console.error('❌ Backup failed opening source database:', err.message);
    return;
  }

  src.backup(backupPath)
    .then(() => {
      console.log(`✅ Backup created: ${backupPath}`);
      src.close();

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .sort()
        .reverse();

      files.slice(7).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
        console.log(`🗑️  Old backup removed: ${f}`);
      });
    })
    .catch(err => {
      console.error('❌ Backup failed:', err);
      src.close();
    });
}

if (require.main === module) {
  backup();
}

module.exports = { backup };
