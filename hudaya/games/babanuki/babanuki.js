const pool = require('../../db'); // DB接続 (ランキング等で使う場合)

// --- 定数 ---
// ★ 修正: サーバー内部では数字(1-13)と文字列("A","K","Q","J")のどちらで扱うか？
// 元コードに合わせて文字列 Rank ("A", "2", ..., "K") を使用
const SUITS = ["spade", "heart", "diamond", "club"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]; // Rank 文字列

class BabanukiGame {
    constructor(roomId, players, settings, sessionId, io, dbPool) {
        this.roomId = roomId;
        this.io = io;
        this.dbPool = dbPool;
        this.gameState = this.initializeGame(players);
        this.gameState.sessionId = sessionId;
        this.started = false;
        // this.playerSockets = {}; // 必要なら
    }

    // --- ゲーム初期化 ---
    initializeGame(players) {
        console.log(`[Babanuki ${this.roomId}] Initializing game for ${players.length} players`);
        const playerStates = players.map((p, index) => ({
            id: p.id, nickname: p.nickname, hand: [], status: 'playing', order: index,
        }));
        return {
            players: playerStates, discardPile: [], currentTurnIndex: 0, finishedOrder: [],
            deck: [], phase: 'waiting', sessionId: null, log: [],
        };
    }

    log(message) {
        this.gameState.log.push(message);
        console.log(`[Babanuki ${this.roomId}] ${message}`);
        this.io.to(this.roomId).emit('gameLog', message);
    }


    // --- デッキ関連 ---
    createAndShuffleDeck() {
        let deck = [];
        for (let s of SUITS) { for (let v of VALUES) { deck.push({ suit: s, rank: v }); } }
        deck.push({ suit: "joker", rank: "JOKER" }); // ★ Jokerの形式確認

        for (let i = deck.length - 1; i > 0; i--) { /* シャッフル */
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        this.gameState.deck = deck;
    }

    dealCards() {
        const deck = this.gameState.deck; const players = this.gameState.players; let i = 0;
        while (deck.length > 0) { players[i % players.length].hand.push(deck.pop()); i++; }
        this.gameState.deck = [];
    }

    // --- ペア削除 ---
    removePairs(player) {
        if (!player || !player.hand) return false; // 変更: 戻り値 boolean
        const rankGroups = {}; const hand = player.hand;
        for (const card of hand) { if (card.rank === "JOKER") continue; const key = card.rank; if (!rankGroups[key]) rankGroups[key] = []; rankGroups[key].push(card); }
        const newHand = hand.filter(card => card.rank === "JOKER");
        let pairsRemoved = false;
        for (const rank in rankGroups) {
            const cardsInGroup = rankGroups[rank]; const numPairs = Math.floor(cardsInGroup.length / 2);
            if (numPairs > 0) {
                pairsRemoved = true;
                const removedCards = cardsInGroup.slice(0, numPairs * 2);
                this.gameState.discardPile.push(...removedCards);
                // ★ ログ変更: 枚数ではなく「ペア」を捨てたことを示す
                this.log(`${player.nickname} discarded a pair of ${rank}s.`);
            }
            if (cardsInGroup.length % 2 !== 0) { newHand.push(cardsInGroup[cardsInGroup.length - 1]); }
        }
        player.hand = newHand;
        this.checkPlayerFinished(player); // 上がり判定
        return pairsRemoved; // ペアが削除されたかどうかを返す
    }

    // 上がり判定
    checkPlayerFinished(player) {
        if (player.status === 'playing' && player.hand.length === 0) {
            player.status = 'finished';
            this.gameState.finishedOrder.push(player.id);
            this.log(`🏁 ${player.nickname} finished in position ${this.gameState.finishedOrder.length}!`);
            this.io.to(this.roomId).emit('playerFinished', { playerId: player.id, rank: this.gameState.finishedOrder.length });
            this.checkEndGameCondition(); // ★ ゲーム終了チェックをここでも呼ぶ
        }
    }


    // --- 状態送信 ---
    getGameStateForUser(userId) { /* (変更なし) */ return { boardState: this.getBoardStateForBroadcast(), myHand: [] }; }

    getBoardStateForBroadcast() {
        const activePlayers = this.gameState.players.filter(p => p.status === 'playing');
        return {
            players: this.gameState.players.map(p => ({
                id: p.id, nickname: p.nickname, handCount: p.hand.length,
                status: p.status, order: p.order,
                // ★ 修正: isTurnはplayingのプレイヤーのみ対象
                isTurn: p.status === 'playing' && this.gameState.players[this.gameState.currentTurnIndex]?.id === p.id,
            })),
            discardPile: this.gameState.discardPile.map(c => ({...c})),
            phase: this.gameState.phase,
            currentPlayerId: this.gameState.currentTurnIndex >= 0 && this.gameState.currentTurnIndex < this.gameState.players.length
                            ? this.gameState.players[this.gameState.currentTurnIndex]?.id
                            : null, // 範囲チェック追加
            finishedOrder: this.gameState.finishedOrder.slice(),
            log: this.gameState.log.slice(-5),
        };
    }

    broadcastUpdate() {
        console.log(`[Babanuki ${this.roomId}] Broadcasting update (Phase: ${this.gameState.phase})`);
        const connectedSockets = this.io.sockets.adapter.rooms.get(this.roomId);
        if (!connectedSockets) return;
        const boardState = this.getBoardStateForBroadcast();
        for (const socketId of connectedSockets) {
            const sock = this.io.sockets.sockets.get(socketId);
            if (!sock || !sock.data || !sock.data.userId) continue;
            const userRole = sock.data.role;
            const playerState = this.gameState.players.find(p => p.id === sock.data.userId);
            let myHandToSend = [];
            if (userRole === 'player' && playerState && playerState.status !== 'finished') { myHandToSend = playerState.hand.map(card => ({...card})); }
            this.io.to(socketId).emit('updateBoard', { boardState: boardState, myHand: myHandToSend, myRole: userRole });
        }
    }

    async saveGameResults() {
        console.log(`[Babanuki ${this.roomId}] Saving game results...`);
         const connection = await this.dbPool.getConnection();
         try {
             await connection.beginTransaction();
             await connection.execute('UPDATE game_sessions SET status = ?, finished_at = NOW() WHERE id = ?', ['finished', this.gameState.sessionId]);

             // ババ抜きのスコア付け (例: 上がり順位、負けは0点など)
             const numPlayers = this.gameState.players.length;
             const scores = {};
             this.gameState.finishedOrder.forEach((playerId, index) => {
                 scores[playerId] = numPlayers - 1 - index; // 1位が高得点
             });
             // 負けたプレイヤー (最後の一人)
             const loser = this.gameState.players.find(p => p.status === 'playing');
             if (loser) scores[loser.id] = 0; // 負けは0点

             for (const player of this.gameState.players) {
                  const finalScore = scores[player.id] !== undefined ? scores[player.id] : 0; // 途中抜けなどは0点
                 await connection.execute('UPDATE session_participants SET final_score = ? WHERE session_id = ? AND user_id = ?', [finalScore, this.gameState.sessionId, player.id]);
                 // 総合ランキングへの加算
                 await connection.execute(
                     `INSERT INTO user_rankings (user_id, game_type_id, total_score) VALUES (?, NULL, ?) ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)`,
                     [player.id, finalScore]
                 );
             }
             await connection.commit();
             this.log(`Game session ${this.gameState.sessionId} results saved.`);
         } catch (error) {
             await connection.rollback();
             console.error(`[Babanuki ${this.roomId}] Failed to save game results:`, error);
         } finally {
             connection.release();
         }
    }

    // --- ゲーム進行 ---
    async startGame(socket) {
        try {
            await this.dbPool.execute('UPDATE game_sessions SET status = ? WHERE id = ?', ['playing', this.gameState.sessionId]);
            this.started = true; this.gameState.phase = 'playing'; this.gameState.round = 1;
            this.createAndShuffleDeck(); this.dealCards();
            this.log("Initial pairs removed:");
            this.gameState.players.forEach(player => { this.removePairs(player); });
            this.gameState.currentTurnIndex = 0;
            this.ensureTurnOnActivePlayer(); // 最初のターンプレイヤー設定
            this.broadcastUpdate();
            this.promptNextAction();
        } catch (error) { console.error(`[Babanuki ${this.roomId}] Error starting game:`, error); socket.emit('error', 'ゲーム開始エラー'); }
    }

    // ターンプレイヤーがアクティブか確認し、スキップする
    ensureTurnOnActivePlayer() {
        if (!this.started || this.gameState.phase === 'gameOver') return;
        let attempts = 0; const numPlayers = this.gameState.players.length; if (numPlayers === 0) return;
        let currentIndex = this.gameState.currentTurnIndex % numPlayers;
        // status が 'playing' のプレイヤーが見つかるまで回す
        while (this.gameState.players[currentIndex]?.status !== 'playing' && attempts < numPlayers) {
            currentIndex = (currentIndex + 1) % numPlayers; attempts++;
        }
        this.gameState.currentTurnIndex = currentIndex;
        this.checkEndGameCondition(); // ターン設定後に終了チェック
    }


    // カードを引く処理
    handlePickCard(socket, data) { // data = { roomId, index }
        if (this.gameState.phase !== 'playing') return socket.emit('error', 'ゲームが進行中ではありません。');
        
        const playerId = socket.data.userId; // DB IDを使用
        const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
        const currentPlayer = this.gameState.players[playerIndex];
        const currentTurnPlayerId = this.gameState.players[this.gameState.currentTurnIndex]?.id;

        if (!currentPlayer || currentTurnPlayerId !== playerId || currentPlayer.status !== 'playing') {
            return socket.emit('error', 'あなたのターンではありません。');
        }

        // 引く相手 (左隣のアクティブプレイヤー) を決定
        let targetPlayerIndex = -1;
        let nextIndex = (playerIndex + 1) % this.gameState.players.length;
        let attempts = 0;
        while (attempts < this.gameState.players.length) {
            const potentialTarget = this.gameState.players[nextIndex];
            if (potentialTarget && potentialTarget.status === 'playing' && potentialTarget.id !== currentPlayer.id) {
                 if (potentialTarget.hand.length > 0) { targetPlayerIndex = nextIndex; break; }
            }
            nextIndex = (nextIndex + 1) % this.gameState.players.length; attempts++;
        }

        if (targetPlayerIndex === -1) {
             this.log(`${currentPlayer.nickname} が引ける相手がいません。ターンをスキップします。`);
             this.nextTurn(); return;
        }

        const targetPlayer = this.gameState.players[targetPlayerIndex];
        
        // --- 修正: クライアントから送られた index を使用 ---
        let pickedCardIndex = parseInt(data.index, 10);

        // インデックスの妥当性チェック (不正ならランダムフォールバック)
        if (isNaN(pickedCardIndex) || pickedCardIndex < 0 || pickedCardIndex >= targetPlayer.hand.length) {
            this.log(`警告: 無効なカードインデックス(${data.index})。ランダムに引きます。`);
            pickedCardIndex = Math.floor(Math.random() * targetPlayer.hand.length);
        }

        const pickedCard = targetPlayer.hand.splice(pickedCardIndex, 1)[0];
        // --- ここまで修正 ---

        if (!pickedCard) { console.error("Picked card is undefined!"); this.nextTurn(); return; }

        this.log(`${currentPlayer.nickname} が ${targetPlayer.nickname} からカードを引きました。`);
        currentPlayer.hand.push(pickedCard);
        const pairRemoved = this.removePairs(currentPlayer);

        this.checkPlayerFinished(targetPlayer);
        this.broadcastUpdate();

        setTimeout(() => {
             this.nextTurn();
        }, pairRemoved ? 1500 : 500);
    }

    // 次のターンへ
    nextTurn() {
         if (this.gameState.phase !== 'playing') return;
         // ターンインデックスを進める前に終了チェック
         this.checkEndGameCondition();
         if (this.gameState.phase === 'gameOver') return; // ゲームが終了していたら進めない

         this.gameState.currentTurnIndex = (this.gameState.currentTurnIndex + 1) % this.gameState.players.length;
         this.ensureTurnOnActivePlayer(); // 上がったプレイヤー等をスキップ
         if (this.gameState.phase === 'playing') { // ensureTurnが終了させなかった場合
             this.promptNextAction();
         }
    }

    // 次のアクションを促す
    promptNextAction() {
        if (this.gameState.phase !== 'playing') return;
        const currentPlayer = this.gameState.players[this.gameState.currentTurnIndex];
        if (!currentPlayer || currentPlayer.status !== 'playing') { this.checkEndGameCondition(); return; }

        this.io.to(this.roomId).emit('turnInfo', { currentPlayerId: currentPlayer.id });
        const playerSocketId = this.findSocketId(currentPlayer.id);
        if (playerSocketId) { this.io.to(playerSocketId).emit('yourTurn'); }
        else { console.warn(`[Babanuki ${this.roomId}] Socket ID not found for player ${currentPlayer.id}`); }
        this.broadcastUpdate();
    }
    
    // DB IDから Socket ID を検索 (単純な実装)
    findSocketId(userId) {
         // playerSockets マッピングがあればそれを使うのが効率的
         // ない場合は io.sockets.adapter.rooms から探す (少し重い)
         const roomSockets = this.io.sockets.adapter.rooms.get(this.roomId);
         if (!roomSockets) return null;
         for (const socketId of roomSockets) {
              const sock = this.io.sockets.sockets.get(socketId);
              if (sock && sock.data && sock.data.userId === userId) {
                   return socketId;
              }
         }
         return null;
    }


    // 終了条件チェック (主に上がり判定後)
    checkEndGameCondition() {
        const remainingPlayers = this.gameState.players.filter(p => p.status === 'playing');
        if (remainingPlayers.length === 1 && this.started) { this.endGame(remainingPlayers[0].id); }
        else if (remainingPlayers.length === 0 && this.started) { this.endGame(null); }
    }


    // ゲーム終了処理
    async endGame(loserId) {
        if (this.gameState.phase === 'gameOver') return; // 多重呼び出し防止
        this.gameState.phase = 'gameOver';
        this.log(`--- ゲーム終了 ---`);

        let winnerId = null;
        if (loserId) {
            const loser = this.gameState.players.find(p => p.id === loserId);
            if(loser) {
                loser.status = 'lost'; // 負け状態
                this.log(`💀 ${loser.nickname} がババを持っていました。`);
            }
             // 最後に上がった人が勝者 (finishedOrderの最後)
             if(this.gameState.finishedOrder.length > 0) {
                 winnerId = this.gameState.finishedOrder[this.gameState.finishedOrder.length - 1];
             }
        } else {
            this.log("引き分け？ または予期せぬ終了。");
             // 引き分けの場合や勝者が不明瞭な場合の処理
        }

        // 最終結果を計算 (例: ポイントや順位)
        const finalResults = this.gameState.players.map(p => ({
            id: p.id,
            nickname: p.nickname,
            // スコア (上がり順位に基づく - 早いほど高得点)
            score: p.status === 'lost' ? 0 : (this.gameState.players.length - (this.gameState.finishedOrder.indexOf(p.id) + 1))
        }));

        this.io.to(this.roomId).emit('gameOver', { loserId: loserId, winnerId: winnerId, results: finalResults });
        await this.saveGameResults();
        this.broadcastUpdate(); // 最終状態を表示

        // gameManagerへの通知は handleNextRound で行う (ババ抜きには nextRound がないため、ここで通知が必要かも)
        // -> gameManager.removeGame(this.roomId); を直接呼ぶのは避けるべき
        // 代わりに、gameManager が handleDisconnect などで終了を検知するか、
        // ゲーム終了時に特別なイベントを emit する
        this.io.to(this.roomId).emit('gameActuallyEnded', { roomId: this.roomId }); // 例
    }

    // ★ handleNextRound は不要なので削除 or 空にする
    // async handleNextRound(socket) { return true; } // 即時終了扱い

    // ★ 切断処理
    handleDisconnect(socket) {
        const disconnectedUserId = socket.data.userId;
        const disconnectedPlayer = this.gameState.players.find(p => p.id === disconnectedUserId);

        if (disconnectedPlayer) {
            this.log(`⚠️ ${disconnectedPlayer.nickname} が切断しました。`);
             // プレイヤーリストからは削除せず、ステータスを変更
             disconnectedPlayer.status = 'disconnected'; // or 'out'
             // finishedOrder からも削除
             const finishedIndex = this.gameState.finishedOrder.indexOf(disconnectedUserId);
             if (finishedIndex !== -1) this.gameState.finishedOrder.splice(finishedIndex, 1);

            // ターンプレイヤーが切断した場合、ターンを進める
            if (this.gameState.players[this.gameState.currentTurnIndex]?.id === disconnectedUserId) {
                 this.nextTurn();
            } else {
                 this.broadcastUpdate(); // 状態更新のみ通知
            }
            this.checkEndGameCondition(); // 残りプレイヤー数チェック

        } else {
             this.log(`観戦者が切断しました。`);
             this.broadcastUpdate(); // 念のため更新
        }
    }
}

module.exports = BabanukiGame;