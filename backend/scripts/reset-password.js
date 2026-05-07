const bcrypt = require('bcryptjs');
const { initDb, getDb } = require('../db/init');

initDb();

const [, , username, newPassword] = process.argv;
if (!username || !newPassword || newPassword.length < 6) {
  console.error('Usage: npm run reset-password -- <username> <newPassword>');
  console.error('Example: npm run reset-password -- jane_admin NewSecurePass1');
  process.exit(1);
}

const db = getDb();
const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
if (!user) {
  console.error('User not found:', username);
  process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 10);
db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
console.log('Password updated for', user.username);
