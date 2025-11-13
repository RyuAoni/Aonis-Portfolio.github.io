const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // ★ 修正: { pool } から pool に変更

const router = express.Router();
const JWT_SECRET = 'your_super_secret_key'; // より安全な方法で管理してください

// --- JWT認証ミドルウェア ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verify Error:', err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// --- オーナー権限認証ミドルウェア ---
const authenticateOwner = (req, res, next) => {
    if (!req.user || req.user.role !== 'owner') { // req.userが存在するか確認
        return res.status(403).json({ success: false, message: 'アクセス権限がありません。オーナーとしてログインしてください。' });
    }
    next();
};


// --- APIエンドポイント ---

// アカウント登録 API (メール認証スキップ版)
router.post('/register', async (req, res) => {
    const { email, password, role = 'player' } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: '必須項目が不足しています。' });
    if (!['player', 'owner'].includes(role)) return res.status(400).json({ success: false, message: '無効な役割です。' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute(
            'INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, ?, TRUE)',
            [email, hashedPassword, role]
        );
        res.status(201).json({ success: true, message: 'アカウントが正常に作成されました。すぐにログインできます。' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'このメールアドレスは既に使用されています。' });
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'サーバーエラーが発生しました。' });
    }
});

// ログイン API (認証チェックはコメントアウト中)
router.post('/login', async (req, res) => {
    console.log('[ログイン診断 1] /login APIが呼び出されました。');
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: '必須項目が不足しています。' });
    try {
        console.log(`[ログイン診断 2] DB検索: ${email}`);
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            console.log('[ログイン診断 失敗] ユーザー未発見');
            return res.status(401).json({ success: false, message: '認証情報が正しくありません。' });
        }
        const user = rows[0];
        console.log(`[ログイン診断 3] ユーザー発見: ID ${user.id}`);
        /* // is_verified check disabled
        if (!user.is_verified) { ... }
        */
        console.log('[ログイン診断 4] パスワード照合開始...');
        const match = await bcrypt.compare(password, user.password_hash);
        console.log(`[ログイン診断 5] 照合結果: ${match}`);
        if (match) {
            console.log('[ログイン診断 成功] トークン発行');
            const payload = { id: user.id, email: user.email, role: user.role, nickname: user.nickname };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
            res.json({ success: true, token });
        } else {
            console.log('[ログイン診断 失敗] パスワード不一致');
            res.status(401).json({ success: false, message: '認証情報が正しくありません。' });
        }
    } catch (error) {
        console.error('[ログイン診断 エラー]:', error);
        res.status(500).json({ success: false, message: 'サーバーエラーが発生しました。' });
    }
});

// ユーザー情報取得 API
router.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, email, nickname, role FROM users WHERE id = ?', [req.user.id]);
        if (rows.length > 0) res.json({ success: true, user: rows[0] });
        else res.status(404).json({ success: false, message: 'ユーザーが見つかりません。' });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ success: false, message: 'サーバーエラーが発生しました。' });
    }
});

// ニックネーム更新 API
router.put('/api/me/update', authenticateToken, async (req, res) => {
    const { nickname } = req.body;
    const userId = req.user.id;
    if (!nickname || nickname.trim().length === 0) return res.status(400).json({ success: false, message: 'ニックネームは必須です。' });
    if (nickname.length > 50) return res.status(400).json({ success: false, message: 'ニックネームが長すぎます。' });
    try {
        const [existing] = await pool.execute('SELECT id FROM users WHERE nickname = ? AND id != ?', [nickname, userId]);
        if (existing.length > 0) return res.status(409).json({ success: false, message: 'このニックネームは既に使用されています。' });
        await pool.execute('UPDATE users SET nickname = ? WHERE id = ?', [nickname, userId]);
        res.json({ success: true, message: 'ニックネームが更新されました。' });
    } catch (error) {
        console.error('Error updating nickname:', error);
        res.status(500).json({ success: false, message: 'サーバーエラーが発生しました。' });
    }
});

// 他の認証関連API (メール認証など) はここに記述

module.exports = { router, authenticateToken, authenticateOwner, JWT_SECRET }; // ミドルウェアとシークレットもエクスポート