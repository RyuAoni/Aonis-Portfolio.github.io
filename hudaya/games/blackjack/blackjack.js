const pool = require('../../db');

// --- 定数 ---
const SUITS = ["spade", "heart", "diamond", "club"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const INITIAL_POINTS = 100; // 初期ポイント
const MAX_ROUNDS = 8;       // 最大ラウンド数
const BLACKJACK_PAYOUT = 1.5; // ブラックジャックの倍率
const WIN_PAYOUT = 1.0;       // 通常勝ちの倍率

// カードの値を取得 (Aceの処理を含む)
function getCardNumericValue(cardValue, currentTotal) {
    if (["J", "Q", "K"].includes(cardValue)) return 10;
    if (cardValue === "A") return currentTotal + 11 <= 21 ? 11 : 1;
    return parseInt(cardValue);
}

// 手札の合計値を計算
function calculateHandValue(hand) {
    let total = 0;
    let aceCount = hand.filter(card => card.value === "A").length;
    
    // まずAce以外を計算
    for (let card of hand) {
        if (card.value !== "A") {
            total += getCardNumericValue(card.value, 0); // Ace以外の計算ではcurrentTotalは0でよい
        }
    }
    
    // Aceの値を決定 (11か1)
    for (let i = 0; i < aceCount; i++) {
        if (total + 11 <= 21) {
            total += 11;
        } else {
            total += 1;
        }
    }
    return total;
}

// カードのファイル名を取得 (例: spadeA.png)
function getCardImageFilename(card) {
    return `${card.suit}${card.value}.png`;
}


class BlackjackGame {
    constructor(roomId, players, settings, sessionId, io, dbPool) {
        this.roomId = roomId;
        this.io = io;
        this.dbPool = dbPool;
        this.gameState = this.initializeGame(players);
        this.gameState.sessionId = sessionId;
        this.started = false;
        this.playerSockets = {};
    }

    initializeGame(players) {
        console.log(`[Blackjack ${this.roomId}] Initializing game`);
        const playerStates = players.map(p => ({
            id: p.id,
            nickname: p.nickname,
            hand: [],
            score: 0, // 手札の合計値
            points: INITIAL_POINTS, // 持ち点
            currentBet: 0, // 現在のベット額
            status: 'betting', // 'betting', 'playing', 'stand', 'bust', 'blackjack'
            isTurn: false, // 現在ターンかどうか
        }));

        return {
            deck: [],
            players: playerStates,
            dealerHand: [],
            dealerScore: 0,
            round: 0, // 0回戦目 (ベット前)
            maxRounds: MAX_ROUNDS,
            phase: 'waiting', // 'waiting', 'betting', 'dealing', 'playerTurn', 'dealerTurn', 'scoring', 'roundEnd'
            currentPlayerIndex: -1, // ターンプレイヤーのインデックス (-1はディーラー or 該当なし)
            allBetsPlaced: false, // 全員がベットしたか
            sessionId: null,
        };
    }

    initializeDeck() {
        this.gameState.deck = [];
        for (let suit of SUITS) {
            for (let value of VALUES) {
                this.gameState.deck.push({ suit: suit, value: value });
            }
        }
        // シャッフル
        for (let i = this.gameState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.gameState.deck[i], this.gameState.deck[j]] = [this.gameState.deck[j], this.gameState.deck[i]];
        }
    }

    drawCard() {
        if (this.gameState.deck.length === 0) this.initializeDeck();
        return this.gameState.deck.pop();
    }
    
    // 途中参加者用の状態取得 (変更なし)
    getGameStateForUser(userId) {
        return { boardState: this.getBoardStateForBroadcast(), myHand: [] }; // BJでは手札個別送信しないので空
    }

    // ★★★ ここから修正 ★★★
    // ブロードキャスト用のゲーム状態を作成
    // GM/観戦者用に手札を含めるかどうかを引数で制御
    getBoardStateForBroadcast(includePlayerHands = false, hideDealerCard = true) {
        return {
            players: this.gameState.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                // 手札を含める場合のみ hand を追加
                hand: includePlayerHands ? p.hand.map(card => ({...card})) : [],
                handCount: p.hand.length,
                score: p.score,
                points: p.points,
                currentBet: p.currentBet,
                status: p.status,
                isTurn: p.isTurn,
            })),
            dealerHand: hideDealerCard && this.gameState.dealerHand.length > 0
                ? [this.gameState.dealerHand[0], { suit: 'back', value: '' }]
                : this.gameState.dealerHand.map(card => ({...card})),
            dealerScore: hideDealerCard ? 0 : this.gameState.dealerScore,
            round: this.gameState.round,
            maxRounds: this.gameState.maxRounds,
            phase: this.gameState.phase,
            currentPlayerId: this.gameState.currentPlayerIndex >= 0
                ? this.gameState.players[this.gameState.currentPlayerIndex]?.id
                : null,
        };
    }

    // ★★★ ここから修正 ★★★
    // ゲーム状態を全クライアントに送信
    broadcastUpdate() { // hideDealerCard 引数を削除
        console.log(`[Blackjack ${this.roomId}] Broadcasting update (Phase: ${this.gameState.phase})`);

        const connectedSockets = this.io.sockets.adapter.rooms.get(this.roomId);
        if (!connectedSockets) return;

        // ★ ディーラーのカードを隠すかどうかはフェーズで決定
        const hideDealerCard = !['dealerTurn', 'scoring', 'roundEnd'].includes(this.gameState.phase);

        for (const socketId of connectedSockets) {
            const sock = this.io.sockets.sockets.get(socketId);
            if (!sock || !sock.data || !sock.data.userId) continue;

            const userRole = sock.data.role;
            const playerState = this.gameState.players.find(p => p.id === sock.data.userId);

            // GM/観戦者にはプレイヤー手札情報を含める
            const includeHands = (userRole !== 'player');
            const boardState = this.getBoardStateForBroadcast(includeHands, hideDealerCard); // ★ hideDealerCard を渡す

            let myHandToSend = [];
            if (userRole === 'player' && playerState) {
                myHandToSend = playerState.hand.map(card => ({...card}));
            }

            this.io.to(socketId).emit('updateBoard', {
                boardState: boardState,
                myHand: myHandToSend,
                myRole: userRole,
            });
        }
    }
     // ★★★ ここまで修正 ★★★
    
    // DB保存 (変更なし)
    async saveGameResults() {
        console.log(`[Blackjack ${this.roomId}] Saving game results to DB...`);
        const connection = await this.dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE game_sessions SET status = ?, finished_at = NOW() WHERE id = ?', ['finished', this.gameState.sessionId]);
            for (const player of this.gameState.players) {
                await connection.execute('UPDATE session_participants SET final_score = ? WHERE session_id = ? AND user_id = ?', [player.points, this.gameState.sessionId, player.id]); // score でなく points を保存
                await connection.execute(
                    `INSERT INTO user_rankings (user_id, game_type_id, total_score) VALUES (?, NULL, ?) ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)`,
                    [player.id, player.points] // score でなく points を総合ランキングに加算？仕様確認
                );
            }
            await connection.commit();
            console.log(`[Blackjack ${this.roomId}] Game session ${this.gameState.sessionId} results saved.`);
        } catch (error) {
            await connection.rollback();
            console.error(`[Blackjack ${this.roomId}] Failed to save game results:`, error);
        } finally {
            connection.release();
        }
    }

    // --- WebSocket Event Handlers ---

    async startGame(socket) {
        console.log(`[Blackjack ${this.roomId}] Starting game initiated by ${socket.data.userId}`);
        this.playerSockets[socket.data.userId] = socket.id; // GMのソケットID保存
        try {
            await this.dbPool.execute('UPDATE game_sessions SET status = ? WHERE id = ?', ['playing', this.gameState.sessionId]);
            this.started = true;
            this.startBettingPhase();
        } catch (error) {
             console.error(`[Blackjack ${this.roomId}] Error updating game status:`, error);
             socket.emit('error', 'DBエラーでゲームを開始できませんでした。');
        }
    }
    
    startBettingPhase() {
        this.gameState.round++;
        console.log(`[Blackjack ${this.roomId}] Starting Round ${this.gameState.round} Betting Phase`);
        this.gameState.phase = 'betting';
        this.gameState.allBetsPlaced = false;
        // プレイヤーの状態をリセット
        this.gameState.players.forEach(p => {
            p.hand = [];
            p.score = 0;
            p.currentBet = 0;
            p.status = 'betting'; //全員ベット待ち状態
            p.isTurn = false;
        });
        this.gameState.dealerHand = [];
        this.gameState.dealerScore = 0;
        this.gameState.currentPlayerIndex = -1;
        
        // ベットを促すメッセージと共に盤面更新
        this.broadcastUpdate(); 
        this.io.to(this.roomId).emit('promptBet', { message: `ラウンド ${this.gameState.round}: ベットしてください` });
    }

    // ★★★ ここから修正 (handlePlaceBet) ★★★
    handlePlaceBet(socket, amount) {
        if (this.gameState.phase !== 'betting') return socket.emit('error', 'ベット時間外です。');

        const player = this.gameState.players.find(p => p.id === socket.data.userId);
        if (!player) return socket.emit('error', 'プレイヤー情報が見つかりません。');
        if (player.status !== 'betting') return socket.emit('error', '既にベット済みか、ベットできません。');

        const betAmount = parseInt(amount, 10);

        if (isNaN(betAmount) || betAmount <= 0) {
            return socket.emit('error', '無効なベット額です（1以上で入力）。');
        }

        const pointsAfterBet = player.points - betAmount;
        const debtLimit = -100; // 借金限度額
        if (pointsAfterBet < debtLimit) {
            const maxBetAllowed = player.points + Math.abs(debtLimit);
            // Handle case where maxBetAllowed is less than 1 (already at debt limit)
            if (maxBetAllowed < 1) {
                 return socket.emit('error', `ポイントが不足しており、借金限度額(${debtLimit}pt)のためベットできません。`);
            }
            return socket.emit('error', `ベット額が大きすぎます。最大 ${maxBetAllowed} ptまでベットできます（借金限度${debtLimit}pt）。`);
        }

        // ポイントを先に引く
        player.points -= betAmount;
        player.currentBet = betAmount; // 賭けた額を記録 (払い戻し計算用)
        player.status = 'betPlaced';
        console.log(`[Blackjack ${this.roomId}] Player ${player.nickname} bet ${betAmount}. New points: ${player.points}`);

        this.gameState.allBetsPlaced = this.gameState.players.every(p => p.status === 'betPlaced' || p.status === 'waiting');

        // ★ ポイントが更新されたので broadcastUpdate を呼ぶ
        this.broadcastUpdate();

        // 全員ベットしたらディール開始 (broadcastUpdateの後でOK)
        if (this.gameState.allBetsPlaced) {
            console.log(`[Blackjack ${this.roomId}] All bets placed. Dealing cards...`);
            // 少し待ってからディールを開始 (ベット額反映を確認する時間)
            setTimeout(() => this.startDealingPhase(), 500);
        }
    }
    // ★★★ ここまで修正 ★★★
    
    startDealingPhase() {
        this.gameState.phase = 'dealing';
        this.initializeDeck();

        // 各プレイヤーとディーラーに2枚ずつ配る
        for (let i = 0; i < 2; i++) {
            this.gameState.players.forEach(p => {
                if(p.status === 'betPlaced') p.hand.push(this.drawCard()); // ベットした人だけ
            });
            this.gameState.dealerHand.push(this.drawCard());
        }

        // 各プレイヤーの初期スコア計算とBJチェック
        this.gameState.players.forEach(p => {
            if (p.hand.length === 2) {
                p.score = calculateHandValue(p.hand);
                if (p.score === 21) {
                    p.status = 'blackjack';
                    console.log(`[Blackjack ${this.roomId}] Player ${p.nickname} has Blackjack!`);
                } else {
                    p.status = 'playing'; // プレイ中状態へ
                }
            } else {
                 p.status = 'waiting'; // ベットしてないので待機
            }
        });

        // ディーラーのスコアも計算 (ただし表示は後で)
        this.gameState.dealerScore = calculateHandValue(this.gameState.dealerHand);
        
        // 最初のターンプレイヤーを探す
        this.gameState.currentPlayerIndex = this.gameState.players.findIndex(p => p.status === 'playing');

        if (this.gameState.currentPlayerIndex !== -1) {
            this.gameState.players[this.gameState.currentPlayerIndex].isTurn = true;
            this.gameState.phase = 'playerTurn';
            console.log(`[Blackjack ${this.roomId}] Player ${this.gameState.players[this.gameState.currentPlayerIndex].nickname}'s turn`);
            this.broadcastUpdate(true); //ディーラーカードを隠して更新
        } else {
            // 全員BJか、誰もベットしてない場合 -> ディーラーターンへ
            console.log(`[Blackjack ${this.roomId}] No players in 'playing' status. Proceeding to dealer turn.`);
            this.startDealerTurn();
        }
    }
    
    nextPlayerTurn() {
        // 現在のプレイヤーのターン終了
        if (this.gameState.currentPlayerIndex >= 0) {
            this.gameState.players[this.gameState.currentPlayerIndex].isTurn = false;
        }

        // 次の 'playing' 状態のプレイヤーを探す
        let nextIndex = -1;
        for (let i = this.gameState.currentPlayerIndex + 1; i < this.gameState.players.length; i++) {
            if (this.gameState.players[i].status === 'playing') {
                nextIndex = i;
                break;
            }
        }

        if (nextIndex !== -1) {
            // 次のプレイヤーが見つかった
            this.gameState.currentPlayerIndex = nextIndex;
            this.gameState.players[nextIndex].isTurn = true;
            this.gameState.phase = 'playerTurn';
             console.log(`[Blackjack ${this.roomId}] Player ${this.gameState.players[nextIndex].nickname}'s turn`);
            this.broadcastUpdate();
        } else {
            // 全プレイヤーのターンが終了 -> ディーラーターンへ
            console.log(`[Blackjack ${this.roomId}] All player turns finished. Proceeding to dealer turn.`);
            this.startDealerTurn();
        }
    }

    handleHit(socket) {
        if (this.gameState.phase !== 'playerTurn') return socket.emit('error', 'あなたのターンではありません。');
        
        const player = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!player || player.id !== socket.data.userId || !player.isTurn) {
            return socket.emit('error', 'あなたのターンではありません。');
        }
        if (player.status !== 'playing') return socket.emit('error', 'ヒットできません。');

        player.hand.push(this.drawCard());
        player.score = calculateHandValue(player.hand);
        console.log(`[Blackjack ${this.roomId}] Player ${player.nickname} hits. Score: ${player.score}`);

        if (player.score > 21) {
            player.status = 'bust';
            player.isTurn = false; // バーストしたらターン終了
             console.log(`[Blackjack ${this.roomId}] Player ${player.nickname} busted!`);
            this.broadcastUpdate(); // バースト状態を反映
            // 少し待ってから次のターンへ (アニメーション用)
            setTimeout(() => this.nextPlayerTurn(), 1000); 
        } else {
            // バーストしてなければ、そのままターン継続
            this.broadcastUpdate();
        }
    }

    handleStand(socket) {
        if (this.gameState.phase !== 'playerTurn') return socket.emit('error', 'あなたのターンではありません。');
        
        const player = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!player || player.id !== socket.data.userId || !player.isTurn) {
            return socket.emit('error', 'あなたのターンではありません。');
        }
        if (player.status !== 'playing') return socket.emit('error', 'スタンドできません。');

        player.status = 'stand';
        player.isTurn = false; // スタンドしたらターン終了
        console.log(`[Blackjack ${this.roomId}] Player ${player.nickname} stands. Score: ${player.score}`);

        this.broadcastUpdate(); // スタンド状態を反映
        // すぐに次のターンへ
        this.nextPlayerTurn();
    }
    
    startDealerTurn() {
        this.gameState.phase = 'dealerTurn';
        this.gameState.currentPlayerIndex = -1; // 誰もターンプレイヤーではない
        console.log(`[Blackjack ${this.roomId}] Dealer's turn. Initial score: ${this.gameState.dealerScore}`);
        
        // ディーラーのカードを公開
        this.broadcastUpdate(); 
        
        // プレイヤーが全員バーストしているかチェック
        const allPlayersBustedOrBJ = this.gameState.players.every(p => p.status === 'bust' || p.status === 'blackjack' || p.status === 'waiting');
        
        if(allPlayersBustedOrBJ && this.gameState.dealerScore !== 21) {
             console.log(`[Blackjack ${this.roomId}] All players busted or got BJ. Dealer doesn't need to draw.`);
             // ディーラーがBJでなければ、引かずにスコアリングへ
             setTimeout(() => this.startScoringPhase(), 1500); // 結果表示のために少し待つ
             return;
        }

        // ディーラーが17未満ならヒットし続ける (非同期的に見えるようにsetTimeoutを使う)
        const dealerHitLoop = () => {
            if (this.gameState.dealerScore < 17) {
                console.log(`[Blackjack ${this.roomId}] Dealer hits (Score: ${this.gameState.dealerScore})`);
                this.gameState.dealerHand.push(this.drawCard());
                this.gameState.dealerScore = calculateHandValue(this.gameState.dealerHand);
                this.broadcastUpdate(); // カード追加を反映
                setTimeout(dealerHitLoop, 1000); // 1秒待って再帰
            } else {
                console.log(`[Blackjack ${this.roomId}] Dealer stands (Score: ${this.gameState.dealerScore})`);
                // ディーラーのアクション終了 -> スコアリングへ
                 setTimeout(() => this.startScoringPhase(), 1000); 
            }
        };
        
        // 初回呼び出し (少し間を置いて開始)
        setTimeout(dealerHitLoop, 1500);
    }
    
    // ★★★ ここから修正 (startScoringPhase) ★★★
    async startScoringPhase() {
        this.gameState.phase = 'scoring';
        console.log(`[Blackjack ${this.roomId}] Scoring phase.`);
        const dealerScore = this.gameState.dealerScore;
        const dealerBusted = dealerScore > 21;
        const dealerHasBJ = this.gameState.dealerHand.length === 2 && dealerScore === 21;

        let results = [];

        this.gameState.players.forEach(player => {
            if (player.status === 'waiting') return; // ベットしてない人はスキップ

            let result = 'lose';
            let payoutRate = 0; // 払い戻し倍率 (0 = 没収, 1.0 = 返金, 2.0 = 勝ち, 2.5 = BJ勝ち)

            if (player.status === 'bust') {
                result = 'lose';
                payoutRate = 0; // Bet already deducted
            } else if (player.status === 'blackjack') {
                if (dealerHasBJ) {
                    result = 'push';
                    payoutRate = 1.0; // Return original bet
                } else {
                    result = 'blackjack';
                    payoutRate = 1.0 + BLACKJACK_PAYOUT; // Return original bet + payout
                }
            } else if (dealerBusted) {
                result = 'win';
                payoutRate = 1.0 + WIN_PAYOUT; // Return original bet + payout
            } else if (dealerHasBJ) {
                 result = 'lose';
                 payoutRate = 0; // Bet already deducted
            } else if (player.score > dealerScore) {
                result = 'win';
                payoutRate = 1.0 + WIN_PAYOUT;
            } else if (player.score === dealerScore) {
                result = 'push';
                payoutRate = 1.0;
            } else { // player.score < dealerScore
                result = 'lose';
                payoutRate = 0;
            }

            // 払い戻し額を計算 (賭け金 + 勝ち分)
            const payoutAmount = Math.floor(player.currentBet * payoutRate);
            // 利益 (表示用)
            const profit = payoutAmount - player.currentBet;

            // ポイント更新: ベット時に引いた分があるので、払い戻し額をそのまま加算する
            player.points += payoutAmount;

            console.log(`[Blackjack ${this.roomId}] Player ${player.nickname}: ${result}, Bet: ${player.currentBet}, Payout: ${payoutAmount}, Profit: ${profit}, New Points: ${player.points}`);

            results.push({
                nickname: player.nickname,
                result: result,
                profit: profit,
                playerScore: player.score,
                playerStatus: player.status,
            });
        });

        this.gameState.phase = 'roundEnd';
        const isFinalRound = (this.gameState.round >= this.gameState.maxRounds);
        let gmId = null; // (GM ID取得は省略)

        this.io.to(this.roomId).emit('roundResult', {
            results: results,
            dealerHand: this.gameState.dealerHand.map(card => ({...card})),
            dealerScore: dealerScore,
            dealerBusted: dealerBusted,
            dealerHasBJ: dealerHasBJ,
            isFinalRound: isFinalRound,
            gmId: gmId
        });

        // ポイントが更新されたので broadcastUpdate を呼ぶ
        this.broadcastUpdate();
    }
    // ★★★ ここまで修正 ★★★
    
    async handleNextRound(socket) {
        if (socket.data.role !== 'gm') return socket.emit('error', '権限がありません。');
        if (this.gameState.phase !== 'roundEnd') return socket.emit('error', 'まだラウンドが終了していません。');

        const isFinalRound = (this.gameState.round >= this.gameState.maxRounds);

        if (isFinalRound) {
            console.log(`[Blackjack ${this.roomId}] Game over.`);
            const finalResults = this.gameState.players.map(p => ({ 
                id: p.id, 
                nickname: p.nickname, 
                score: p.points // 最終スコアはポイント
            }));
            
            this.io.to(this.roomId).emit('gameOver', { results: finalResults });
            await this.saveGameResults();
            return true; // gameManagerにゲーム終了を通知
            
        } else {
            // 次のベットフェーズへ
            this.startBettingPhase();
            return false; // ゲーム続行
        }
    }
}

module.exports = BlackjackGame;