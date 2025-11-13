const pool = require('./db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { authenticateToken, authenticateOwner, JWT_SECRET } = require('./auth');

const KoikoiGame = require('./games/koikoi/koikoi.js');
const SuujiBattleGame = require('./games/suuji-battle/suuji-battle.js');
const BlackjackGame = require('./games/blackjack/blackjack.js');
const PokerGame = require('./games/poker/poker.js');
// ★ 追加: Babanukiロジック
const BabanukiGame = require('./games/babanuki/babanuki.js');


const activeGames = {};
let ioServer = null;

const apiRouter = express.Router();

// 新規ゲーム作成 API
apiRouter.post('/games/create', authenticateToken, authenticateOwner, async (req, res) => {
    // (変更なし)
    const { gameType } = req.body;
    const userId = req.user.id;
    if (!gameType) return res.status(400).json({ success: false, message: 'ゲームの種類を選択してください。' });
    const connection = await pool.getConnection(); 
    try {
        await connection.beginTransaction();
        const [gameTypeRows] = await connection.execute('SELECT id FROM game_types WHERE name = ?', [gameType]);
        if (gameTypeRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: '無効なゲームタイプです。(DBに登録されていますか？)' });
        }
        const gameTypeId = gameTypeRows[0].id;
        const sessionId = uuidv4();
        const roomToken = sessionId.split('-')[0];
        await connection.execute(
            'INSERT INTO game_sessions (id, game_type_id, created_by_user_id, room_token, status) VALUES (?, ?, ?, ?, ?)',
            [sessionId, gameTypeId, userId, roomToken, 'waiting']
        );
        await connection.execute(
            'INSERT INTO session_participants (session_id, user_id, role) VALUES (?, ?, ?)',
            [sessionId, userId, 'gm']
        );
        await connection.commit();
        res.status(201).json({ success: true, roomId: roomToken, sessionId: sessionId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating new game:', error);
        res.status(500).json({ success: false, message: 'ゲーム作成中にエラーが発生しました。' });
    } finally {
        connection.release(); 
    }
});

// ルームIDからゲームタイプを取得するAPI (変更なし)
apiRouter.get('/games/info/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ success: false, message: 'ルームIDが必要です。' });
    try {
        const [rows] = await pool.execute(
            `SELECT gt.name as gameType 
             FROM game_sessions gs 
             JOIN game_types gt ON gs.game_type_id = gt.id 
             WHERE gs.room_token = ?`,
            [roomId]
        );
        if (rows.length > 0) {
            res.json({ success: true, gameType: rows[0].gameType });
        } else {
            res.status(404).json({ success: false, message: 'ルームが見つかりません。' });
        }
    } catch (error) {
        console.error('Error fetching game info:', error);
        res.status(500).json({ success: false, message: 'サーバーエラー。' });
    }
});


// ランキング取得 API (変更なし)
apiRouter.get('/rankings', authenticateToken, async (req, res) => {
     try {
        const [rows] = await pool.execute(
            `SELECT u.nickname, ur.total_score
             FROM user_rankings ur JOIN users u ON ur.user_id = u.id
             WHERE ur.game_type_id IS NULL ORDER BY ur.total_score DESC LIMIT 20`
        );
        res.json({ success: true, rankings: rows });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ success: false, message: 'ランキング取得エラー。' });
    }
});


// ゲームインスタンスを作成・管理する関数
function createAndManageGame(gameType, roomId, players, settings, sessionId) {
     if (gameType === 'koikoi') {
         const gameInstance = new KoikoiGame(roomId, players, settings, sessionId, ioServer, pool);
         activeGames[roomId] = gameInstance; return gameInstance;
     }
     if (gameType === 'suuji-battle') {
         const gameInstance = new SuujiBattleGame(roomId, players, settings, sessionId, ioServer, pool);
         activeGames[roomId] = gameInstance; return gameInstance;
     }
     if (gameType === 'blackjack') {
         const gameInstance = new BlackjackGame(roomId, players, settings, sessionId, ioServer, pool);
         activeGames[roomId] = gameInstance; return gameInstance;
     }
     // ★ 追加: Poker の分岐
     if (gameType === 'poker') {
         console.log(`[Game Manager] Creating PokerGame instance for room ${roomId}`);
         // settings は Poker では使わないかもしれない
         const gameInstance = new PokerGame(roomId, players, settings, sessionId, ioServer, pool);
         activeGames[roomId] = gameInstance;
         return gameInstance;
     }
     if (gameType === 'babanuki') {
         console.log(`[Game Manager] Creating BabanukiGame instance for room ${roomId}`);
         const gameInstance = new BabanukiGame(roomId, players, settings, sessionId, ioServer, pool);
         activeGames[roomId] = gameInstance;
         return gameInstance;
     }

     console.warn(`[Game Manager] Unknown gameType: ${gameType} for room ${roomId}`);
     return null;
}

// ゲームインスタンスを削除する関数 (変更なし)
function removeGame(roomId) {
    if (activeGames[roomId]) {
        console.log(`[Game Manager] Removing game instance for room ${roomId}`);
        delete activeGames[roomId];
    }
}


const initializeSocket = (io) => {
    ioServer = io;
    io.on('connection', (socket) => {
        console.log('a user connected:', socket.id);

        socket.on('joinLobby', async ({ token, roomId }) => {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const userId = decoded.id;
                const [sessionRows] = await pool.execute(
                    `SELECT gs.id, gs.status, gt.name as gameType 
                     FROM game_sessions gs 
                     JOIN game_types gt ON gs.game_type_id = gt.id 
                     WHERE gs.room_token = ?`, 
                     [roomId]
                );

                if (sessionRows.length === 0) return socket.emit('error', '無効なルームIDです。');
                const sessionId = sessionRows[0].id;
                const gameStatus = sessionRows[0].status;
                const gameType = sessionRows[0].gameType; 

                if (gameStatus === 'finished') {
                     return socket.emit('error', 'このゲームは既に終了しています。');
                }

                let userRole = decoded.role === 'owner' ? 'gm' : 'spectator';
                const [existingParticipant] = await pool.execute('SELECT role FROM session_participants WHERE session_id = ? AND user_id = ?', [sessionId, userId]);
                
                if (existingParticipant.length > 0) userRole = existingParticipant[0].role;
                else {
                    if (gameStatus === 'playing' && userRole !== 'gm') {
                        userRole = 'spectator';
                    } else if (userRole !== 'gm') {
                        // ★ 修正: Babanuki は最大4人
                        const maxPlayers = (gameType === 'babanuki' || gameType === 'poker' || gameType === 'blackjack') ? 4 :
                                           (gameType === 'koikoi' || gameType === 'suuji-battle') ? 2 : 2; // Default 2
                        const [players] = await pool.execute("SELECT COUNT(*) as playerCount FROM session_participants WHERE session_id = ? AND role = 'player'", [sessionId]);
                        if (players[0].playerCount < maxPlayers) userRole = 'player';
                        // ★ 追加: プレイヤー数がmaxでも観戦者にする
                        else userRole = 'spectator';
                    }
                    await pool.execute('INSERT INTO session_participants (session_id, user_id, role) VALUES (?, ?, ?)', [sessionId, userId, userRole]);
                }
                
                socket.join(roomId);
                socket.data.userId = userId;
                socket.data.roomId = roomId;
                socket.data.sessionId = sessionId;
                socket.data.role = userRole;
                socket.data.gameType = gameType; 
                
                const [participants] = await pool.execute(`SELECT u.id, u.nickname, sp.role FROM session_participants sp JOIN users u ON sp.user_id = u.id WHERE sp.session_id = ?`, [sessionId]);
                io.to(roomId).emit('updateLobby', { participants });

                // 途中参加処理 (変更なし)
                 if (gameStatus === 'playing' && activeGames[roomId]) {
                     const gameInstance = activeGames[roomId];
                     if (typeof gameInstance.getGameStateForUser === 'function') {
                         const gameState = gameInstance.getGameStateForUser(userId); 
                         if (gameState) {
                             socket.emit('gameStarted', {
                                 ...gameState, 
                                 myRole: userRole
                             });
                         } else {
                              console.warn(`[Join Lobby] Could not get game state for user ${userId} in started game ${roomId}`);
                         }
                     }
                 } else if (gameStatus === 'playing' && !activeGames[roomId]) {
                     console.error(`[Join Lobby] Game ${roomId} is playing in DB but not found in memory!`);
                     socket.emit('error', 'ゲーム状態の取得に失敗しました。サーバー管理者に連絡してください。');
                 }

            } catch (err) {
                 console.error('joinLobby error:', err);
                 socket.emit('error', '認証または参加処理エラー。');
            }
        });

        // --- ゲームイベントのルーティング ---
        socket.on('startGame', async (data) => {
            const { roomId, settings, gameType } = data;
            const { userId, sessionId } = socket.data;

            if (socket.data.role !== 'gm') return socket.emit('error', '権限がありません。');
            if (gameType !== socket.data.gameType) return socket.emit('error', 'ゲームタイプの不一致。');
            
            try {
                 // ★ 修正: Poker は 2～4 人
                 const minPlayers = (gameType === 'babanuki' || gameType === 'poker') ? 2 : (gameType === 'blackjack') ? 1 : 2;
                 const maxPlayers = (gameType === 'babanuki' || gameType === 'poker' || gameType === 'blackjack') ? 4 : 2;
                 
                 const [dbPlayers] = await pool.execute(
                    `SELECT u.id, u.nickname, sp.role 
                     FROM session_participants sp JOIN users u ON sp.user_id = u.id 
                     WHERE sp.session_id = ? AND sp.role = 'player'`, [sessionId]
                 );
                 
                 // ★ 修正: プレイヤー数チェック
                 if (dbPlayers.length < minPlayers || dbPlayers.length > maxPlayers) {
                     return socket.emit('error', `プレイヤーが${minPlayers}～${maxPlayers}人ではありません。`);
                 }

                 const gameInstance = createAndManageGame(gameType, roomId, dbPlayers, settings, sessionId);
                 
                 if (gameInstance && typeof gameInstance.startGame === 'function') {
                    await gameInstance.startGame(socket); 
                 } else {
                     console.error(`[Start Game] Failed to create or start game instance for room ${roomId}`);
                     socket.emit('error', 'ゲームの開始に失敗しました。');
                 }
            } catch (error) {
                 console.error('[Start Game Error]:', error);
                 socket.emit('error', 'ゲーム開始処理中にエラーが発生しました。');
            }
        });

        // ★ 追加: Babanuki用カード引きイベント
        socket.on('pickCard', (data) => {
            const gameInstance = activeGames[data.roomId];
            // BabanukiGame クラスに handlePickCard メソッドを実装する必要がある
            if (gameInstance && typeof gameInstance.handlePickCard === 'function') {
                // data に { index: X } が含まれる想定だったが、サーバーでランダムに引くので不要
                gameInstance.handlePickCard(socket); // 引数なしでOK
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });

        // ★ 追加: Poker用アクションイベント
        socket.on('pokerAction', (data) => {
             const gameInstance = activeGames[data.roomId];
             if (gameInstance && typeof gameInstance.handlePlayerAction === 'function') {
                 // data には { action: 'bet'/'call'/'raise'/'fold'/'check', amount: 100 (レイズ時など) } が入る想定
                 gameInstance.handlePlayerAction(socket, data);
             } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });
        // ★ 追加: Poker用カード交換イベント (5カードドローの場合に使う)
        // socket.on('exchangeCards', (data) => {
        //     const gameInstance = activeGames[data.roomId];
        //     if (gameInstance && typeof gameInstance.handleExchangeCards === 'function') {
        //         // data には { discardedCardIds: [id1, id2, ...] } が入る想定
        //         gameInstance.handleExchangeCards(socket, data.discardedCardIds);
        //     } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        // });

        // ★ 追加: placeBet イベント (Blackjack用)
        socket.on('placeBet', (data) => {
            const gameInstance = activeGames[data.roomId];
            if (gameInstance && typeof gameInstance.handlePlaceBet === 'function') {
                gameInstance.handlePlaceBet(socket, data.amount); // amount は賭け金
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });

        // ★ 追加: hit イベント (Blackjack用)
        socket.on('hit', (data) => {
            const gameInstance = activeGames[data.roomId];
            if (gameInstance && typeof gameInstance.handleHit === 'function') {
                gameInstance.handleHit(socket);
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });
        
        // ★ 追加: stand イベント (Blackjack用)
        socket.on('stand', (data) => {
            const gameInstance = activeGames[data.roomId];
            if (gameInstance && typeof gameInstance.handleStand === 'function') {
                gameInstance.handleStand(socket);
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });


        // --- 既存イベント ---
        socket.on('pickCard', (data) => { // data に { roomId, index } が入ってくる
            const gameInstance = activeGames[data.roomId];
            if (gameInstance && typeof gameInstance.handlePickCard === 'function') {
                // data (index情報を含む) をそのまま渡す
                gameInstance.handlePickCard(socket, data); 
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });

        socket.on('declareAction', (data) => { // (koikoi 用)
            const gameInstance = activeGames[data.roomId];
             if (gameInstance && typeof gameInstance.handleDeclareAction === 'function') {
                gameInstance.handleDeclareAction(socket, data.action);
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });

         socket.on('nextRound', async (data) => { // (全ゲーム共通)
            const gameInstance = activeGames[data.roomId];
             if (gameInstance && typeof gameInstance.handleNextRound === 'function') {
                try { 
                    const isGameOver = await gameInstance.handleNextRound(socket); 
                    if (isGameOver) {
                        console.log(`[Game Manager] Game ${data.roomId} finished. Removing from active games.`);
                        removeGame(data.roomId); 
                    }
                } catch (error) {
                    console.error(`[Game Manager] Error during nextRound for ${data.roomId}:`, error);
                    socket.emit('error', '次のラウンドへの移行中にサーバーエラーが発生しました。');
                }
            } else socket.emit('error', 'ゲームが見つからないか、操作が無効です。');
        });

        socket.on('disconnect', () => {
            console.log('user disconnected:', socket.id);
            const { roomId, userId, gameType } = socket.data; // gameTypeも取得
            if (roomId && userId && activeGames[roomId]) {
                const gameInstance = activeGames[roomId];
                // ★ 追加: 各ゲームクラスに handleDisconnect を実装して委譲
                if (typeof gameInstance.handleDisconnect === 'function') {
                    gameInstance.handleDisconnect(socket);
                } else {
                    console.warn(`[Game Manager] handleDisconnect not implemented for ${gameType}`);
                    // デフォルトの処理 (単純削除など) をここに書くか、何もしない
                }
            }
            // TODO: DBの参加者リストからの削除 or 状態更新も検討
        });
    });
};

module.exports = {
    initializeSocket,
    apiRouter,
    removeGame 
};