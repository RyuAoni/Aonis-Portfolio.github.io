const pool = require('../../db'); // 修正: db.js のインポートパス

// --- 定数 ---
// トランプのデッキを作成
const SUITS = ['club', 'diamond', 'heart', 'spade'];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// カードの強さを返すヘルパー
function getCardValue(cardName) { //例: "clubK"
    const rank = cardName.slice(cardName.length - 1);
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    if (rank === "K") return 13;
    // "club10" の場合
    if (cardName.endsWith("10")) return 10;
    // "club2" など
    return parseInt(rank, 10);
}

// カードのフルネーム（例: clubK）からID（例: c13）を生成
function getCardId(cardName) {
    const suitMap = { club: 'c', diamond: 'd', heart: 'h', spade: 's' };
    const suit = suitMap[cardName.slice(0, -1).replace('10', '')];
    const rank = cardName.slice(cardName.length - 1);
    
    if (cardName.endsWith("10")) return suit + '10';
    if (rank === "A") return suit + '1';
    if (rank === "J") return suit + '11';
    if (rank === "Q") return suit + '12';
    if (rank === "K") return suit + '13';
    return suit + rank;
}

class SuujiBattleGame {
    constructor(roomId, players, settings, sessionId, io, dbPool) {
        this.roomId = roomId;
        this.io = io;
        this.dbPool = dbPool;
        this.gameState = this.initializeGame(players, {}); // settings は使わない (常に5ラウンド)
        this.gameState.sessionId = sessionId;
        this.started = false;
    }

    // --- ゲームロジック ---

    initializeGame(players, prevScores = {}) {
        console.log(`[SuujiBattle ${this.roomId}] Initializing game`);
        
        let deck = [];
        for (const s of SUITS) {
            for (const r of RANKS) {
                const cardName = s + r;
                deck.push({ id: getCardId(cardName), name: cardName });
            }
        }
        deck.sort(() => Math.random() - 0.5); // シャッフル

        const playerStates = players.map(p => ({
            ...p,
            hand: [], 
            score: prevScores[p.id] || 0,
            // ★ 追加: このラウンドでカードを選択したか
            hasPlayed: false, 
        }));

        for (let i = 0; i < 5; i++) {
            playerStates.forEach(player => player.hand.push(deck.pop()));
        }

        return {
            deck,
            players: playerStates,
            // currentPlayerIndex: 0, // ★ 削除 (ターン制ではないため)
            round: 1, 
            maxRounds: 5, 
            p1Card: null, 
            p2Card: null, 
            lastWinnerId: null, 
            sessionId: null,
        };
    }

    // 盤面情報を全プレイヤーに送信
    broadcastUpdate(isStart = false) {
        console.log(`[SuujiBattle ${this.roomId}] Broadcasting update`);
        const connectedSockets = this.io.sockets.adapter.rooms.get(this.roomId);
        if (!connectedSockets) return;

        // ★ 修正: ターン制ではない
        const { players, round } = this.gameState;

        const publicBoardState = {
            players: players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                handCount: p.hand.length,
                score: p.score,
                hasPlayed: p.hasPlayed, // ★ 追加
            })),
            // currentPlayerId: players[currentPlayerIndex]?.id, // ★ 削除
            round: round,
            battlefield: [], // ★ 修正: バトルフィールドは使わない (モーダルで表示)
        };

        for (const socketId of connectedSockets) {
            const sock = this.io.sockets.sockets.get(socketId);
            if (!sock || !sock.data || !sock.data.userId) continue;

            const userRole = sock.data.role;
            const playerState = players.find(p => p.id === sock.data.userId);

            if (userRole === 'player' && playerState) {
                this.io.to(sock.id).emit(isStart ? 'gameStarted' : 'updateBoard', {
                    boardState: publicBoardState,
                    myHand: playerState.hand,
                    myRole: 'player',
                });
            } else { // GM or Spectator
                this.io.to(sock.id).emit(isStart ? 'gameStarted' : 'updateBoard', {
                    boardState: publicBoardState,
                    myHand: [], 
                    myRole: userRole,
                });
            }
        }
    }

    // 途中参加者用のゲーム状態取得
    getGameStateForUser(userId) {
        // ★ 修正: ターン制ではない
        const { players, round } = this.gameState;
        
        const publicBoardState = {
            players: players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                handCount: p.hand.length,
                score: p.score,
                hasPlayed: p.hasPlayed, // ★ 追加
            })),
            // currentPlayerId: players[currentPlayerIndex]?.id, // ★ 削除
            round: round,
            battlefield: [], // ★ 修正: バトルフィールドは使わない
        };
        
        const playerState = players.find(p => p.id === userId);
        
        return {
            boardState: publicBoardState,
            myHand: playerState ? playerState.hand : [],
        };
    }
    
    // DBに最終結果を保存
    async saveGameResults() {
        // (この関数は変更なし)
        console.log(`[SuujiBattle ${this.roomId}] Saving game results to DB...`);
        const connection = await this.dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE game_sessions SET status = ?, finished_at = NOW() WHERE id = ?', ['finished', this.gameState.sessionId]);
            for (const player of this.gameState.players) {
                await connection.execute('UPDATE session_participants SET final_score = ? WHERE session_id = ? AND user_id = ?', [player.score, this.gameState.sessionId, player.id]);
                await connection.execute(
                    `INSERT INTO user_rankings (user_id, game_type_id, total_score) VALUES (?, NULL, ?) ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)`,
                    [player.id, player.score]
                );
            }
            await connection.commit();
            console.log(`[SuujiBattle ${this.roomId}] Game session ${this.gameState.sessionId} results saved.`);
        } catch (error) {
            await connection.rollback();
            console.error(`[SuujiBattle ${this.roomId}] Failed to save game results:`, error);
        } finally {
            connection.release();
        }
    }


    // --- WebSocket Event Handlers ---

    async startGame(socket) {
        // (この関数は変更なし)
        console.log(`[SuujiBattle ${this.roomId}] Starting game initiated by ${socket.data.userId}`);
        try {
            await this.dbPool.execute('UPDATE game_sessions SET status = ? WHERE id = ?', ['playing', this.gameState.sessionId]);
            this.started = true;
            this.broadcastUpdate(true); 
        } catch (error) {
             console.error(`[SuujiBattle ${this.roomId}] Error updating game status to playing:`, error);
             socket.emit('error', 'データベースエラーでゲームを開始できませんでした。');
        }
    }

    // ★★★ ここからロジック大幅変更 ★★★
    // P1 or P2 がカードを出した
    handlePlayCard(socket, cardId) {
        if (!this.started) return socket.emit('error', 'ゲームが開始されていません。');
        
        // どのプレイヤーが操作したか特定
        const player = this.gameState.players.find(p => p.id === socket.data.userId);
        if (!player) return socket.emit('error', 'あなたはプレイヤーではありません。');

        // 既に出していないかチェック
        if (player.hasPlayed) return socket.emit('error', '既に出しています。');
        
        const cardInHandIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardInHandIndex === -1) return socket.emit('error', 'そのカードは持っていません。');
        
        const playedCard = player.hand.splice(cardInHandIndex, 1)[0];
        player.hasPlayed = true;

        // P1かP2かによって、保持する場所を変える
        if (this.gameState.players[0].id === player.id) { // P1が出した
            this.gameState.p1Card = playedCard;
        } else { // P2が出した
            this.gameState.p2Card = playedCard;
        }

        // 盤面更新 (「選択済み」を表示するため)
        this.broadcastUpdate();

        // **両方** のプレイヤーが出したかチェック
        if (this.gameState.players.every(p => p.hasPlayed)) {
            // 両方出したら、即バトル判定
            this.battle(); 
        }
    }
    // ★★★ ここまでロジック大幅変更 ★★★

    // P2がカードを出し、勝負！
    async battle() {
        const { p1Card, p2Card } = this.gameState;
        if (!p1Card || !p2Card) return; // ありえないが念のため

        const p1Value = getCardValue(p1Card.name);
        const p2Value = getCardValue(p2Card.name);

        let roundWinnerId = null;
        let roundWinnerText = "引き分け！";

        if (p1Value > p2Value) {
            this.gameState.players[0].score++;
            roundWinnerId = this.gameState.players[0].id;
            roundWinnerText = `${this.gameState.players[0].nickname} の勝ち！`;
        } else if (p2Value > p1Value) {
            this.gameState.players[1].score++;
            roundWinnerId = this.gameState.players[1].id;
            roundWinnerText = `${this.gameState.players[1].nickname} の勝ち！`;
        }

        const scoreText = `${this.gameState.players[0].score} vs ${this.gameState.players[1].score}`;
        
        this.gameState.round++;
        const isFinalRound = (this.gameState.round > this.gameState.maxRounds);

        let gmId = null;
        const sockets = await this.io.in(this.roomId).fetchSockets();
        const gmSocket = sockets.find(s => s.data.role === 'gm');
        if (gmSocket) gmId = gmSocket.data.userId;

        // ★ 修正: 3秒待機はクライアント側に任せる
        // すべての情報を即時送信する
        this.io.to(this.roomId).emit('roundEnd', {
            winner: roundWinnerText,
            scoreText: scoreText, 
            p1Card: p1Card, 
            p2Card: p2Card, 
            isFinalRound: isFinalRound,
            gmId: gmId
        });
        
        // 盤面情報をクリア
        this.gameState.p1Card = null;
        this.gameState.p2Card = null;
        // ★ 追加: 全員の hasPlayed フラグをリセット
        this.gameState.players.forEach(p => p.hasPlayed = false);
    }

    // GMが「次のラウンドへ」または「最終結果へ」を押した
    async handleNextRound(socket) {
         if (socket.data.role !== 'gm') return socket.emit('error', '権限がありません。');
         
        const isFinalRound = (this.gameState.round > this.gameState.maxRounds);

        if (isFinalRound) {
            console.log(`[SuujiBattle ${this.roomId}] Game over.`);
            const finalResults = this.gameState.players.map(p => ({ 
                id: p.id, 
                nickname: p.nickname, 
                score: p.score 
            }));
            
            this.io.to(this.roomId).emit('gameOver', { results: finalResults });
            await this.saveGameResults();
            return true; 
            
        } else {
            console.log(`[SuujiBattle ${this.roomId}] Proceeding to round ${this.gameState.round}`);
            // ★ 修正: 盤面更新 (hasPlayed がリセットされた状態を通知)
            this.broadcastUpdate(false); 
            return false;
        }
    }
}

module.exports = SuujiBattleGame;