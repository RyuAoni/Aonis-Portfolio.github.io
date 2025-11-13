const mysql = require('mysql2/promise');

// データベース接続プールを作成
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'No_twenty_one', // ご自身の環境に合わせてください
    password: 'bo0wRoi20sniNvso2982', // ご自身の環境に合わせてください
    database: 'cardgame_db', // ご自身の環境に合わせてください
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 必要に応じて他のオプションを追加
});

// 接続プールをエクスポート
module.exports = dbPool;

