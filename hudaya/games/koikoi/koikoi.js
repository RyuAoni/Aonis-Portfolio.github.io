const dbPool = require('../../db'); // 親ディレクトリのdb.jsをインポート
const { v4: uuidv4 } = require('uuid'); // 必要であれば
const crypto = require('crypto'); // 必要であれば

// --- 定数 ---
const CARDS = [
    // 1月 (松)
    { id: 1, month: 1, name: '松に鶴', type: 'hikari', value: 20 },
    { id: 2, month: 1, name: '松に赤短', type: 'tan', value: 5 },
    { id: 3, month: 1, name: '松のカス', type: 'kasu', value: 1 },
    { id: 4, month: 1, name: '松のカス', type: 'kasu', value: 1 },
    // 2月 (梅)
    { id: 5, month: 2, name: '梅に鶯', type: 'tane', value: 10 },
    { id: 6, month: 2, name: '梅に赤短', type: 'tan', value: 5 },
    { id: 7, month: 2, name: '梅のカス', type: 'kasu', value: 1 },
    { id: 8, month: 2, name: '梅のカス', type: 'kasu', value: 1 },
    // 3月 (桜)
    { id: 9, month: 3, name: '桜に幕', type: 'hikari', value: 20 },
    { id: 10, month: 3, name: '桜に赤短', type: 'tan', value: 5 },
    { id: 11, month: 3, name: '桜のカス', type: 'kasu', value: 1 },
    { id: 12, month: 3, name: '桜のカス', type: 'kasu', value: 1 },
    // 4月 (藤)
    { id: 13, month: 4, name: '藤に不如帰', type: 'tane', value: 10 },
    { id: 14, month: 4, name: '藤に短冊', type: 'tan', value: 5 },
    { id: 15, month: 4, name: '藤のカス', type: 'kasu', value: 1 },
    { id: 16, month: 4, name: '藤のカス', type: 'kasu', value: 1 },
    // 5月 (菖蒲)
    { id: 17, month: 5, name: '菖蒲に八橋', type: 'tane', value: 10 },
    { id: 18, month: 5, name: '菖蒲に短冊', type: 'tan', value: 5 },
    { id: 19, month: 5, name: '菖蒲のカス', type: 'kasu', value: 1 },
    { id: 20, month: 5, name: '菖蒲のカス', type: 'kasu', value: 1 },
    // 6月 (牡丹)
    { id: 21, month: 6, name: '牡丹に蝶', type: 'tane', value: 10 },
    { id: 22, month: 6, name: '牡丹に青短', type: 'tan', value: 5 },
    { id: 23, month: 6, name: '牡丹のカス', type: 'kasu', value: 1 },
    { id: 24, month: 6, name: '牡丹のカス', type: 'kasu', value: 1 },
    // 7月 (萩)
    { id: 25, month: 7, name: '萩に猪', type: 'tane', value: 10 },
    { id: 26, month: 7, name: '萩に短冊', type: 'tan', value: 5 },
    { id: 27, month: 7, name: '萩のカス', type: 'kasu', value: 1 },
    { id: 28, month: 7, name: '萩のカス', type: 'kasu', value: 1 },
    // 8月 (芒)
    { id: 29, month: 8, name: '芒に月', type: 'hikari', value: 20 },
    { id: 30, month: 8, name: '芒に雁', type: 'tane', value: 10 },
    { id: 31, month: 8, name: '芒のカス', type: 'kasu', value: 1 },
    { id: 32, month: 8, name: '芒のカス', type: 'kasu', value: 1 },
    // 9月 (菊)
    { id: 33, month: 9, name: '菊に盃', type: 'tane', value: 10 },
    { id: 34, month: 9, name: '菊に青短', type: 'tan', value: 5 },
    { id: 35, month: 9, name: '菊のカス', type: 'kasu', value: 1 },
    { id: 36, month: 9, name: '菊のカス', type: 'kasu', value: 1 },
    // 10月 (紅葉)
    { id: 37, month: 10, name: '紅葉に鹿', type: 'tane', value: 10 },
    { id: 38, month: 10, name: '紅葉に青短', type: 'tan', value: 5 },
    { id: 39, month: 10, name: '紅葉のカス', type: 'kasu', value: 1 },
    { id: 40, month: 10, name: '紅葉のカス', type: 'kasu', value: 1 },
    // 11月 (柳)
    { id: 41, month: 11, name: '柳に小野道風', type: 'hikari', value: 20 },
    { id: 42, month: 11, name: '柳に燕', type: 'tane', value: 10 },
    { id: 43, month: 11, name: '柳に短冊', type: 'tan', value: 5 },
    { id: 44, month: 11, name: '柳のカス', type: 'kasu', value: 1 },
    // 12月 (桐)
    { id: 45, month: 12, name: '桐に鳳凰', type: 'hikari', value: 20 },
    { id: 46, month: 12, name: '桐のカス', type: 'kasu', value: 1 },
    { id: 47, month: 12, name: '桐のカス', type: 'kasu', value: 1 },
    { id: 48, month: 12, name: '桐のカス', type: 'kasu', value: 1 },
];
const YAKU = {
    GOKO: { name: '五光', score: 10, card_ids: new Set([1, 9, 29, 41, 45]) },
    SHIKO: { name: '四光', score: 8, card_ids: new Set([1, 9, 29, 45]) }, // 柳(雨)を含まない四光
    AME_SHIKO: { name: '雨四光', score: 7, card_ids: new Set([1, 9, 29, 41]) }, // 桐(鳳凰)を含まない四光
    SANKO: { name: '三光', score: 5, card_ids: new Set([1, 9, 29, 45]) }, // 柳(雨)以外の光札3枚
    INOSHIKACHO: { name: '猪鹿蝶', score: 5, card_ids: new Set([21, 25, 37]) },
    AKATAN: { name: '赤短', score: 5, card_ids: new Set([2, 6, 10]) },
    AOTAN: { name: '青短', score: 5, card_ids: new Set([22, 34, 38]) },
    HANAMI_ZAKE: { name: '花見酒', score: 5, card_ids: new Set([9, 33]) },
    TSUKIMI_ZAKE: { name: '月見酒', score: 5, card_ids: new Set([29, 33]) },
};

class KoikoiGame {
    constructor(roomId, players, settings, sessionId, io, dbPool) {
        this.roomId = roomId;
        this.io = io;
        this.dbPool = dbPool;
        this.gameState = this.initializeGame(players, settings, {}); // Initialize gameState
        this.gameState.sessionId = sessionId; // Assign session ID
        this.started = false; // Game start flag
    }

    // --- ゲームロジックメソッド (以前のグローバル関数をクラスメソッドに) ---
    
    initializeGame(players, settings, prevScores = {}) {
        console.log(`[KoikoiGame ${this.roomId}] Initializing game round ${settings.round || 1}`);
        const deck = [...CARDS].sort(() => Math.random() - 0.5);
        const playerStates = players.map(p => ({
            ...p, hand: [], capturedCards: [], koikoiCalled: false,
            score: prevScores[p.id] || 0, lastYakuScore: 0
        }));
        for (let i = 0; i < 8; i++) playerStates.forEach(player => player.hand.push(deck.pop()));
        const field = [];
        for (let i = 0; i < 8; i++) field.push(deck.pop());
        const oyaIndex = settings.nextOyaIndex !== undefined ? settings.nextOyaIndex : 0;
        
        // Return the initial gameState structure
        return {
            deck, field, players: playerStates, currentPlayerIndex: oyaIndex,
            round: settings.round || 1, 
            maxRounds: settings.rounds || 12, // 'settings.maxRounds' から 'settings.rounds' に変更
            koikoiCount: 0, lastWinnerId: settings.lastWinnerId || null, sessionId: settings.sessionId
        };
    }

    processTurn(playedCard) {
        console.log(`[KoikoiGame ${this.roomId}] Processing turn for player ${this.gameState.players[this.gameState.currentPlayerIndex]?.id} playing card ${playedCard.id}`);
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        const handCardIndex = currentPlayer.hand.findIndex(c => c.id === playedCard.id);
        if (handCardIndex > -1) {
            const cardFromHand = currentPlayer.hand.splice(handCardIndex, 1)[0];
            const matchInField = this.gameState.field.find(c => c.month === cardFromHand.month);
            if (matchInField) {
                this.gameState.field.splice(this.gameState.field.findIndex(c => c.id === matchInField.id), 1);
                currentPlayer.capturedCards.push(cardFromHand, matchInField);
                 console.log(`[KoikoiGame ${this.roomId}] Player captured ${cardFromHand.name} and ${matchInField.name}`);
            } else {
                this.gameState.field.push(cardFromHand);
                 console.log(`[KoikoiGame ${this.roomId}] Player placed ${cardFromHand.name} on the field`);
            }
        }
        if (this.gameState.deck.length > 0) {
            const cardFromDeck = this.gameState.deck.pop();
            const matchInFieldAfterDraw = this.gameState.field.find(c => c.month === cardFromDeck.month);
            if (matchInFieldAfterDraw) {
                this.gameState.field.splice(this.gameState.field.findIndex(c => c.id === matchInFieldAfterDraw.id), 1);
                currentPlayer.capturedCards.push(cardFromDeck, matchInFieldAfterDraw);
                 console.log(`[KoikoiGame ${this.roomId}] Player drew ${cardFromDeck.name} and captured ${matchInFieldAfterDraw.name}`);
            } else {
                this.gameState.field.push(cardFromDeck);
                 console.log(`[KoikoiGame ${this.roomId}] Player drew ${cardFromDeck.name} and placed it on the field`);
            }
        }
        // No need to return gameState as 'this.gameState' is modified directly
    }

    checkYaku(capturedCards) {
        console.log(`[KoikoiGame ${this.roomId}] Checking Yaku...`);
        const capturedIds = new Set(capturedCards.map(c => c.id));
        const achievedYaku = [];
        const hikariCards = [1, 9, 29, 41, 45];
        const capturedHikari = hikariCards.filter(id => capturedIds.has(id));
        if (capturedHikari.length === 5) achievedYaku.push(YAKU.GOKO);
        else if (capturedHikari.length === 4) {
            if (capturedIds.has(41)) achievedYaku.push(YAKU.AME_SHIKO); else achievedYaku.push(YAKU.SHIKO);
        } else if (capturedHikari.length === 3 && !capturedIds.has(41)) achievedYaku.push(YAKU.SANKO);
        const ino = capturedIds.has(25), shika = capturedIds.has(37), cho = capturedIds.has(21);
        if (ino && shika && cho) achievedYaku.push(YAKU.INOSHIKACHO);
        const akatanIds = [2, 6, 10];
        if (akatanIds.every(id => capturedIds.has(id))) achievedYaku.push(YAKU.AKATAN);
        const aotanIds = [22, 34, 38];
        if (aotanIds.every(id => capturedIds.has(id))) achievedYaku.push(YAKU.AOTAN);
        const taneCards = capturedCards.filter(c => c.type === 'tane');
        if (taneCards.length >= 5) {
            let score = taneCards.length - 4;
            if (ino && shika && cho && achievedYaku.includes(YAKU.INOSHIKACHO)) score -= YAKU.INOSHIKACHO.score;
            if (score > 0) achievedYaku.push({ name: 'タネ', score: score });
        }
        const tanCards = capturedCards.filter(c => c.type === 'tan');
        if (tanCards.length >= 5) {
            let score = tanCards.length - 4;
            if (akatanIds.every(id => capturedIds.has(id)) && achievedYaku.includes(YAKU.AKATAN)) score -= YAKU.AKATAN.score;
            if (aotanIds.every(id => capturedIds.has(id)) && achievedYaku.includes(YAKU.AOTAN)) score -= YAKU.AOTAN.score;
            if (score > 0) achievedYaku.push({ name: '短冊', score: score });
        }
        const kasuCards = capturedCards.filter(c => c.type === 'kasu');
        if (kasuCards.length >= 10) achievedYaku.push({ name: 'カス', score: kasuCards.length - 9 });
        const totalScore = achievedYaku.reduce((sum, yaku) => sum + yaku.score, 0);
        console.log(`[KoikoiGame ${this.roomId}] Yaku check result: ${achievedYaku.length > 0 ? achievedYaku.map(y=>y.name).join(',') : 'None'}, Score: ${totalScore}`);
        return { hasYaku: achievedYaku.length > 0, yakuList: achievedYaku, totalScore };
    }

    calculateScore(yakuResult) {
         let score = yakuResult.totalScore;
        if (score >= 7) score *= 2;
        if (this.gameState.koikoiCount > 0) score *= (2 * this.gameState.koikoiCount);
        const opponent = this.gameState.players.find(p => p.id !== this.gameState.players[this.gameState.currentPlayerIndex].id);
        if (opponent && opponent.koikoiCalled) score *= 2;
        console.log(`[KoikoiGame ${this.roomId}] Calculated final score: ${score}`);
        return score;
    }

    async saveGameResults() {
        console.log(`[KoikoiGame ${this.roomId}] Saving game results to DB...`);
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
            console.log(`[KoikoiGame ${this.roomId}] Game session ${this.gameState.sessionId} results saved.`);
        } catch (error) {
            await connection.rollback();
            console.error(`[KoikoiGame ${this.roomId}] Failed to save game results:`, error);
        } finally {
            connection.release();
        }
    }

    broadcastUpdate(isStart = false) {
        console.log(`[KoikoiGame ${this.roomId}] Broadcasting update (isStart: ${isStart})`);
        const connectedSockets = this.io.sockets.adapter.rooms.get(this.roomId);
        if (!connectedSockets) return;

        const publicBoardState = {
            field: this.gameState.field, deckCount: this.gameState.deck.length,
            players: this.gameState.players.map(p => ({
                id: p.id, nickname: p.nickname, handCount: p.hand.length,
                capturedCards: p.capturedCards, score: p.score
            })),
            currentPlayerId: this.gameState.players[this.gameState.currentPlayerIndex]?.id,
            round: this.gameState.round
        };

        for (const socketId of connectedSockets) {
            const sock = this.io.sockets.sockets.get(socketId);
            if (sock && sock.data && sock.data.userId) {
                const userRole = sock.data.role;
                const playerState = this.gameState.players.find(p => p.id === sock.data.userId);

                if (userRole === 'player' && playerState) {
                    this.io.to(sock.id).emit(isStart ? 'gameStarted' : 'updateBoard', {
                        boardState: publicBoardState, myHand: playerState.hand, myRole: 'player'
                    });
                } else {
                    this.io.to(sock.id).emit(isStart ? 'gameStarted' : 'updateBoard', {
                        boardState: publicBoardState, myHand: [], myRole: userRole
                    });
                }
            }
        }
    }

    async endRound(winnerId, isDraw = false) {
        console.log(`[KoikoiGame ${this.roomId}] Ending round ${this.gameState.round}`);
        let finalScore = 0;
        let winnerNickname = '引き分け';
        let yakuListResult = [];
        this.gameState.lastWinnerId = isDraw ? null : winnerId;

        if (!isDraw && winnerId) {
            const winner = this.gameState.players.find(p => p.id === winnerId);
            if (winner) {
                const yakuResult = this.checkYaku(winner.capturedCards);
                finalScore = this.calculateScore(yakuResult);
                winner.score += finalScore;
                winnerNickname = winner.nickname;
                yakuListResult = yakuResult.yakuList;
            } else {
                 console.error(`[KoikoiGame ${this.roomId}] Winner with ID ${winnerId} not found in gameState!`);
            }
        }
        
        // Find the GM socket ID to send the gmId correctly
        let gmId = null;
        const sockets = await this.io.in(this.roomId).fetchSockets();
        const gmSocket = sockets.find(s => s.data.role === 'gm');
        if(gmSocket) gmId = gmSocket.data.userId;

        this.io.to(this.roomId).emit('roundEnd', {
            winner: winnerNickname, score: finalScore, yakuList: yakuListResult,
            // ★★★ ここから修正 ★★★
            // 'isDraw' による判定を削除し、ラウンド数のみで判定
            isFinalRound: (this.gameState.round >= this.gameState.maxRounds),
            // ★★★ ここまで修正 ★★★
            gmId: gmId
        });
        
         // Do not proceed automatically, wait for GM's 'nextRound' event
         console.log(`[KoikoiGame ${this.roomId}] Round ended. Waiting for GM action.`);
    }

    // --- WebSocket Event Handlers ---
    
    async startGame(socket) {
        console.log(`[KoikoiGame ${this.roomId}] Starting game initiated by ${socket.data.userId}`);
        // Update game status in DB (moved from gameManager)
        try {
            await this.dbPool.execute('UPDATE game_sessions SET status = ? WHERE id = ?', ['playing', this.gameState.sessionId]);
            this.started = true;
            this.broadcastUpdate(true); // Broadcast initial state
        } catch (error) {
             console.error(`[KoikoiGame ${this.roomId}] Error updating game status to playing:`, error);
             socket.emit('error', 'データベースエラーでゲームを開始できませんでした。');
        }
    }

    isStarted() {
        return this.started;
    }
    
    // Method for gameManager to get state for late joiners
    getGameStateForUser(userId) {
        const playerState = this.gameState.players.find(p => p.id === userId);
        const boardState = {
             field: this.gameState.field, deckCount: this.gameState.deck.length,
             players: this.gameState.players.map(p => ({
                 id: p.id, nickname: p.nickname, handCount: p.hand.length,
                 capturedCards: p.capturedCards, score: p.score
             })),
             currentPlayerId: this.gameState.players[this.gameState.currentPlayerIndex]?.id,
             round: this.gameState.round
        };
        return {
            boardState,
            myHand: playerState ? playerState.hand : [], // Return hand only if player
        };
    }

    handlePlayCard(socket, cardId) {
        console.log(`[KoikoiGame ${this.roomId}] Received playCard event for card ${cardId} from ${socket.data.userId}`);
        if (!this.gameState || !this.started) return socket.emit('error', 'ゲームが開始されていません。');
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.id !== socket.data.userId) return socket.emit('error', 'あなたのターンではありません。');
        
        const playedCard = currentPlayer.hand.find(c => c.id === cardId);
        if (!playedCard) return socket.emit('error', '無効なカードです。');

        try {
            this.processTurn(playedCard);
            const yakuResult = this.checkYaku(currentPlayer.capturedCards);

            // Check if player already called koikoi and made a new yaku
            const previousScore = currentPlayer.lastYakuScore || 0;
            if (yakuResult.hasYaku && yakuResult.totalScore > previousScore) {
                console.log(`[KoikoiGame ${this.roomId}] Player ${currentPlayer.id} made a yaku.`);
                currentPlayer.lastYakuScore = yakuResult.totalScore; // Update last score to prevent repeated prompts for the same score level
                this.io.to(socket.id).emit('promptAction', { yakuResult });
            } else {
                 // Check for draw condition
                 if (this.gameState.players.every(p => p.hand.length === 0) || this.gameState.deck.length === 0) {
                      console.log(`[KoikoiGame ${this.roomId}] Draw condition met.`);
                      this.endRound(null, true); // isDraw = true
                 } else {
                    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
                    this.broadcastUpdate();
                 }
            }
        } catch (error) {
            console.error(`[KoikoiGame ${this.roomId}] Error processing turn:`, error);
            socket.emit('error', 'カード処理中にエラーが発生しました。');
        }
    }

    handleDeclareAction(socket, action) {
        console.log(`[KoikoiGame ${this.roomId}] Received declareAction event: ${action} from ${socket.data.userId}`);
        if (!this.gameState || !this.started) return socket.emit('error', 'ゲームが開始されていません。');
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.id !== socket.data.userId) return socket.emit('error', '不正な操作です。');

        try {
            if (action === 'koikoi') {
                const yakuResult = this.checkYaku(currentPlayer.capturedCards);
                if (!yakuResult.hasYaku) return socket.emit('error', '役がないため「こいこい」できません。');

                currentPlayer.koikoiCalled = true;
                //currentPlayer.lastYakuScore = yakuResult.totalScore; // Store the score when koikoi was called
                this.gameState.koikoiCount++;
                this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
                console.log(`[KoikoiGame ${this.roomId}] Player ${currentPlayer.id} called Koikoi.`);
                this.broadcastUpdate();
            } else { // 'shobu'
                 console.log(`[KoikoiGame ${this.roomId}] Player ${currentPlayer.id} called Shobu.`);
                this.endRound(currentPlayer.id);
            }
        } catch (error) {
            console.error(`[KoikoiGame ${this.roomId}] Error declaring action:`, error);
            socket.emit('error', 'アクション処理中にエラーが発生しました。');
        }
    }

    async handleNextRound(socket) {
        console.log(`[KoikoiGame ${this.roomId}] Received nextRound event from GM ${socket.data.userId}`);
         if (socket.data.role !== 'gm') return socket.emit('error', '権限がありません。');
         if (!this.gameState) return socket.emit('error', 'ゲーム状態が見つかりません。');
         
        try {
            // ★★★ ここから修正 ★★★
            // const isDraw = this.gameState.lastWinnerId === null; // この行は判定に不要
            // 'isDraw' による判定を削除し、ラウンド数のみで判定
            const isFinalRound = this.gameState.round >= this.gameState.maxRounds;
            // ★★★ ここまで修正 ★★★

            if (isFinalRound) {
                console.log(`[KoikoiGame ${this.roomId}] Game over.`);
                const finalResults = this.gameState.players.map(p => ({ id: p.id, nickname: p.nickname, score: p.score }));
                this.io.to(this.roomId).emit('gameOver', { results: finalResults });
                await this.saveGameResults();
                
                return true; // ゲーム終了を通知
            } else {
                console.log(`[KoikoiGame ${this.roomId}] Proceeding to round ${this.gameState.round + 1}`);
                const currentScores = {};
                this.gameState.players.forEach(p => { currentScores[p.id] = p.score; });
                
                const newSettings = {
                    round: this.gameState.round + 1,
                    maxRounds: this.gameState.maxRounds,
                    nextOyaIndex: this.gameState.players.findIndex(p => p.id === this.gameState.lastWinnerId),
                    sessionId: this.gameState.sessionId,
                    lastWinnerId: this.gameState.lastWinnerId
                };
                
                // Use existing player list in memory, assuming no changes
                const participants = this.gameState.players.map(p => ({id: p.id, nickname: p.nickname, role: 'player'}));

                this.gameState = this.initializeGame(participants, newSettings, currentScores); // Overwrite gameState
                
                this.broadcastUpdate(true); // Broadcast new round start
                
                return false; // ゲーム続行を通知
            }
        } catch (error) {
             console.error(`[KoikoiGame ${this.roomId}] Error handling next round:`, error);
             socket.emit('error', '次のラウンドへの移行中にエラーが発生しました。');
             return false; // エラー時もゲームは終了しない
        }
    }

}

module.exports = KoikoiGame;