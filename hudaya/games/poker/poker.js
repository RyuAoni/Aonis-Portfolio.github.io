const pool = require('../../db');
const { evaluateTexasHoldemHand } = require('./pokerEvaluator'); // Assumes pokerEvaluator.js is in the same directory

// --- Constants ---
const SUITS = ["club", "diamond", "heart", "spade"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]; // A=01
const VALUE_MAP = { "01": 14, "13": 13, "12": 12, "11": 11, "10": 10, "09": 9, "08": 8, "07": 7, "06": 6, "05": 5, "04": 4, "03": 3, "02": 2 };
const INITIAL_POINTS = 1000;
const DEBT_LIMIT = -1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const MAX_ROUNDS = 10; // Number of hands

class PokerGame {
    constructor(roomId, players, settings, sessionId, io, dbPool) {
        this.roomId = roomId;
        this.io = io;
        this.dbPool = dbPool;
        this.gameState = this.initializeGame(players);
        this.gameState.sessionId = sessionId;
        this.started = false;
        this.playerSockets = {}; // userId -> socketId
        this.turnTimeout = null; // Turn timer
    }

    initializeGame(players) {
        console.log(`[Poker ${this.roomId}] Initializing game`);
        const numPlayers = players.length;
        const playerStates = players.map((p, index) => ({
            id: p.id,
            nickname: p.nickname,
            hand: [],
            points: INITIAL_POINTS,
            currentBet: 0,      // Total bet in this HAND
            actionAmount: 0,   // Bet/Raise amount in this PHASE
            status: 'waiting',  // 'waiting', 'playing', 'fold', 'allin', 'out'
            isTurn: false,
            isDealer: index === 0,
            isSB: index === 1 % numPlayers,
            isBB: index === (numPlayers > 2 ? 2 % numPlayers : 1 % numPlayers), // Adjust BB for heads-up
            handRank: null,
        }));

        return {
            deck: [],
            players: playerStates,
            communityCards: [],
            pot: 0,
            currentMaxBet: 0, // Highest total bet in the current PHASE
            lastRaiserId: null,
            round: 0, // Hand number
            maxRounds: MAX_ROUNDS,
            phase: 'waiting', // 'waiting', 'preflop', 'flop', 'turn', 'river', 'showdown', 'roundEnd'
            dealerIndex: 0,
            currentPlayerIndex: -1,
            sessionId: null,
            log: [],
        };
    }

    log(message) {
        this.gameState.log.push(message);
        console.log(`[Poker ${this.roomId}] ${message}`);
        this.io.to(this.roomId).emit('gameLog', message); // Send log to client
    }

    initializeDeck() {
        this.gameState.deck = [];
        for (let suit of SUITS) {
            for (let value of VALUES) {
                this.gameState.deck.push({ suit: suit, value: value });
            }
        }
        // Shuffle
        for (let i = this.gameState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.gameState.deck[i], this.gameState.deck[j]] = [this.gameState.deck[j], this.gameState.deck[i]];
        }
    }

    drawCard() {
        if (this.gameState.deck.length === 0) this.initializeDeck();
        if (this.gameState.deck.length === 0) { // Still empty after trying to re-initialize (should not happen with 52 cards)
             console.error(`[Poker ${this.roomId}] Deck is empty, cannot draw card!`);
             return null; // Or handle appropriately
        }
        return this.gameState.deck.pop();
    }

    getGameStateForUser(userId) {
        // Find player's hand if they are playing
        const playerState = this.gameState.players.find(p => p.id === userId);
        const handToSend = (playerState && playerState.status !== 'fold' && playerState.status !== 'out')
                           ? playerState.hand.map(card => ({...card}))
                           : [];
        return {
             boardState: this.getBoardStateForBroadcast(false), // Initially hide hands for late joiner
             myHand: handToSend
        };
    }

    getBoardStateForBroadcast(showAllHands = false) {
        const activePlayers = this.gameState.players.filter(p => p.status !== 'out'); // Exclude those permanently out
        return {
            players: activePlayers.map(p => ({ // Only send active player data
                id: p.id, nickname: p.nickname,
                // Show hands only on showdown or if requested (GM/Spectator view on update)
                hand: (showAllHands || this.gameState.phase === 'showdown' || p.status === 'showdown') ? p.hand.map(c=>({...c})) : [],
                handCount: p.hand.length,
                points: p.points, currentBet: p.currentBet, actionAmount: p.actionAmount,
                status: p.status, isTurn: p.isTurn,
                isDealer: p.isDealer, isSB: p.isSB, isBB: p.isBB,
                handRank: p.handRank,
            })),
            communityCards: this.gameState.communityCards.map(c=>({...c})),
            pot: this.gameState.pot,
            currentMaxBet: this.gameState.currentMaxBet,
            round: this.gameState.round, maxRounds: this.gameState.maxRounds,
            phase: this.gameState.phase,
            dealerIndex: this.gameState.dealerIndex, // Relative to active players might be better later
            currentPlayerId: this.gameState.currentPlayerIndex >= 0 ? activePlayers[this.gameState.currentPlayerIndex]?.id : null, // Use active player index
            log: this.gameState.log.slice(-5),
        };
    }

    broadcastUpdate(showAllHands = false) {
        console.log(`[Poker ${this.roomId}] Broadcasting update (Phase: ${this.gameState.phase})`);
        const connectedSockets = this.io.sockets.adapter.rooms.get(this.roomId);
        if (!connectedSockets) return;

        // Determine if hands should be shown based on phase or explicit request
        const shouldShowAll = showAllHands || this.gameState.phase === 'showdown';

        for (const socketId of connectedSockets) {
            const sock = this.io.sockets.sockets.get(socketId);
            if (!sock || !sock.data || !sock.data.userId) continue;

            const userRole = sock.data.role;
            const playerState = this.gameState.players.find(p => p.id === sock.data.userId);

            // GM/観戦者には全手札公開 (showdown or GM role)
            const boardState = this.getBoardStateForBroadcast(shouldShowAll || userRole !== 'player');

            let myHandToSend = [];
            // プレイヤーには自分の手札のみ送る (fold/out以外)
            if (userRole === 'player' && playerState && playerState.status !== 'fold' && playerState.status !== 'out') {
                myHandToSend = playerState.hand.map(card => ({...card}));
            }

            this.io.to(socketId).emit('updateBoard', {
                boardState: boardState,
                myHand: myHandToSend,
                myRole: userRole,
            });
        }
    }

    async saveGameResults() {
        console.log(`[Poker ${this.roomId}] Saving game results to DB...`);
        const connection = await this.dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE game_sessions SET status = ?, finished_at = NOW() WHERE id = ?', ['finished', this.gameState.sessionId]);
            for (const player of this.gameState.players) {
                // Save final points as score
                await connection.execute('UPDATE session_participants SET final_score = ? WHERE session_id = ? AND user_id = ?', [player.points, this.gameState.sessionId, player.id]);
                // Add points to overall ranking (game_type_id IS NULL)
                // Consider if points should contribute to ranking or just wins/losses
                await connection.execute(
                    `INSERT INTO user_rankings (user_id, game_type_id, total_score) VALUES (?, NULL, ?) ON DUPLICATE KEY UPDATE total_score = total_score + VALUES(total_score)`,
                    [player.id, player.points] // Using points as score contribution
                );
            }
            await connection.commit();
            console.log(`[Poker ${this.roomId}] Game session ${this.gameState.sessionId} results saved.`);
        } catch (error) {
            await connection.rollback();
            console.error(`[Poker ${this.roomId}] Failed to save game results:`, error);
        } finally {
            connection.release();
        }
    }


    async startGame(socket) {
        this.playerSockets[socket.data.userId] = socket.id;
        try {
            await this.dbPool.execute('UPDATE game_sessions SET status = ? WHERE id = ?', ['playing', this.gameState.sessionId]);
            this.started = true;
            this.startNextHand();
        } catch (error) {
            console.error(`[Poker ${this.roomId}] Error updating game status:`, error);
            socket.emit('error', 'DBエラーでゲームを開始できませんでした。');
        }
    }

    startNextHand() {
        this.gameState.round++;
        if (this.gameState.round > this.gameState.maxRounds) {
            this.endGame(); return;
        }
        this.log(`--- Round ${this.gameState.round} 開始 ---`);

        // Reset player states for the new hand
        this.gameState.players.forEach(p => {
            p.hand = [];
            if (p.status !== 'out') p.status = 'playing'; // Keep 'out' status
            p.currentBet = 0; p.actionAmount = 0; p.isTurn = false; p.handRank = null;

            if (p.status !== 'out' && p.points <= DEBT_LIMIT) {
                 p.status = 'out';
                 this.log(`${p.nickname} は借金限度を超えたためゲームオーバーです。`);
            }
        });

        const activePlayers = this.gameState.players.filter(p => p.status !== 'out');
        if (activePlayers.length <= 1) {
             this.endGame(activePlayers.length === 1 ? activePlayers[0] : null); return;
        }
        const numActivePlayers = activePlayers.length;


        this.gameState.communityCards = [];
        this.gameState.pot = 0;
        this.gameState.currentMaxBet = 0;
        this.gameState.lastRaiserId = null;

        // Rotate Dealer, SB, BB among ACTIVE players
        this.gameState.dealerIndex = (this.gameState.dealerIndex + 1) % numActivePlayers;
        const sbIndex = (this.gameState.dealerIndex + 1) % numActivePlayers;
        const bbIndex = (numActivePlayers > 2) ? (this.gameState.dealerIndex + 2) % numActivePlayers : sbIndex; // Heads-up: SB is also BB

        activePlayers.forEach((p, index) => {
             p.isDealer = (index === this.gameState.dealerIndex);
             p.isSB = (index === sbIndex);
             p.isBB = (index === bbIndex);
             // Also reset flags for inactive players just in case
             if (p.status === 'out') { p.isDealer = p.isSB = p.isBB = false; }
        });
        // Update the main gameState.players array as well
        this.gameState.players.forEach(p => {
             const activeP = activePlayers.find(ap => ap.id === p.id);
             if (activeP) {
                 p.isDealer = activeP.isDealer; p.isSB = activeP.isSB; p.isBB = activeP.isBB;
             } else {
                 p.isDealer = p.isSB = p.isBB = false;
             }
        });


        this.initializeDeck();

        // Blinds
        const sbPlayer = activePlayers[sbIndex];
        const bbPlayer = activePlayers[bbIndex];
        const sbAmount = Math.min(SMALL_BLIND, sbPlayer.points > 0 ? sbPlayer.points : 0); // Can't bet less than 0
        const bbAmount = Math.min(BIG_BLIND, bbPlayer.points > 0 ? bbPlayer.points : 0);

        if (sbAmount > 0) this.forceBet(sbPlayer, sbAmount, true); // True for blind
        this.log(`${sbPlayer.nickname} posts Small Blind: ${sbAmount}`);
        if (bbAmount > 0) this.forceBet(bbPlayer, bbAmount, true);
        this.log(`${bbPlayer.nickname} posts Big Blind: ${bbAmount}`);

        this.gameState.currentMaxBet = bbAmount;
        this.gameState.lastRaiserId = bbPlayer.id; // BB acts last preflop if no raise

        // Preflop Deal
        for (let i = 0; i < 2; i++) {
            activePlayers.forEach(p => {
                const card = this.drawCard();
                if(card) p.hand.push(card);
            });
        }

        this.gameState.phase = 'preflop';

        // First player to act (UTG - Under The Gun)
        const utgIndex = (numActivePlayers > 2) ? (bbIndex + 1) % numActivePlayers : sbIndex; // Heads-up: SB acts first
        this.gameState.currentPlayerIndex = utgIndex; // Index within activePlayers

        this.broadcastUpdate();
        this.promptNextAction();
    }

    forceBet(player, amount, isBlind = false) {
         const actualBet = Math.max(0, amount);
         player.points -= actualBet;
         player.currentBet += actualBet;
         player.actionAmount = actualBet; // Blinds count as the first action
         this.gameState.pot += actualBet;
         if (player.points === 0) {
             player.status = 'allin';
             this.log(`${player.nickname} is all-in from the blind.`);
         }
    }

    promptNextAction() {
        // if (this.turnTimeout) clearTimeout(this.turnTimeout);

        const activePlayers = this.gameState.players.filter(p => p.status !== 'out');
        if (this.gameState.currentPlayerIndex < 0 || this.gameState.currentPlayerIndex >= activePlayers.length) {
             console.error(`[Poker ${this.roomId}] Invalid currentPlayerIndex: ${this.gameState.currentPlayerIndex}. Resetting turn.`);
             // 最初のプレイヤーから再開するなどのリカバリ処理が必要になる場合がある
             this.nextTurn(); // とりあえず次のターンに進めてみる
             return;
        }

        const currentPlayer = activePlayers[this.gameState.currentPlayerIndex];

        if (!currentPlayer || currentPlayer.status !== 'playing') {
            this.log(`Skipping ${currentPlayer?.nickname}'s turn (status: ${currentPlayer?.status}).`);
            this.nextTurn();
            return;
        }

        currentPlayer.isTurn = true;
        this.broadcastUpdate(); // Show whose turn it is

        const callAmount = this.gameState.currentMaxBet - currentPlayer.actionAmount;
        this.io.to(this.roomId).emit('promptAction', {
            playerId: currentPlayer.id,
            options: this.getAvailableActions(currentPlayer),
            minRaise: this.calculateMinRaise(),
            callAmount: callAmount,
            maxBet: currentPlayer.points,
        });

        // this.turnTimeout = setTimeout(() => {
        //     this.log(`${currentPlayer.nickname} timed out.`);
        //     this.handlePlayerAction(null, { action: callAmount > 0 ? 'fold' : 'check' }); // Timeout -> fold if bet exists, else check
        // }, 30000); // 30 seconds
    }

    getAvailableActions(player) {
        const options = [];
        const callAmount = this.gameState.currentMaxBet - player.actionAmount;

        if (player.status !== 'playing') return []; // Folded or All-in

        // Always possible to fold (unless all-in already handled)
        options.push('fold');

        // Check or Call
        if (callAmount === 0) {
            options.push('check');
        } else {
            options.push('call'); // Client will show amount needed, possibly All-in
        }

        // Bet or Raise (only if player has points > amount needed to call)
        if (player.points > callAmount) {
            options.push(this.gameState.currentMaxBet > 0 ? 'raise' : 'bet');
        }

        return options;
    }

    calculateMinRaise() {
        // Find the amount of the last raise
        let lastRaiseAmount = BIG_BLIND; // Default min raise is BB
        let previousBetLevel = 0;
        // Find the highest bet level before the current one
        const betLevels = [...new Set(this.gameState.players.map(p => p.actionAmount))].sort((a,b)=>a-b);
        if (betLevels.length > 1) {
            previousBetLevel = betLevels[betLevels.length - 2];
            lastRaiseAmount = this.gameState.currentMaxBet - previousBetLevel;
        }
        // Min raise must be at least the amount of the last raise OR BB, whichever is greater
        return Math.max(BIG_BLIND, lastRaiseAmount);
    }

    handlePlayerAction(socket, data) {
         // if (this.turnTimeout) clearTimeout(this.turnTimeout);

         const activePlayers = this.gameState.players.filter(p => p.status !== 'out');
         const playerIndexInActive = this.gameState.currentPlayerIndex;
         if (!socket) return;
         const player = activePlayers[playerIndexInActive];

         // If triggered by timeout, player might be different if original player folded already
         if (!player || player.id !== socket.data.userId || !player.isTurn || player.status !== 'playing') {
             socket.emit('error', 'アクションできません。');
             // this.promptNextAction(); // 無闇に再プロンプトしない
             return;
         }
         // Handle cases where player might already be out/folded before timeout action
         /*if (!player || player.status !== 'playing') {
              this.log(`Action received for inactive player ${player?.nickname}, moving to next turn.`);
              this.nextTurn();
              return;
         }*/


         const action = data.action.toLowerCase();
         let amount = parseInt(data.amount) || 0; // bet/raise amount provided BY PLAYER
         const callAmount = this.gameState.currentMaxBet - player.actionAmount;

         player.isTurn = false; // Action taken

         switch(action) {
             case 'fold':
                 player.status = 'fold';
                 this.log(`${player.nickname} folds.`);
                 break;
             case 'check':
                 if (callAmount > 0) {
                     if (socket) socket.emit('error', 'チェックできません。コール/レイズ/フォールドしてください。');
                     player.isTurn = true; this.promptNextAction(); return;
                 }
                 this.log(`${player.nickname} checks.`);
                 break;
             case 'call':
                 if (callAmount <= 0) { // Call when check was possible
                      if (socket) socket.emit('error', 'コールは不要です。チェック/ベット/フォールドしてください。');
                      player.isTurn = true; this.promptNextAction(); return;
                 }
                 const actualCall = Math.min(callAmount, player.points);
                 player.points -= actualCall;
                 player.actionAmount += actualCall;
                 player.currentBet += actualCall; // Keep track of total bet in hand
                 this.gameState.pot += actualCall;
                 this.log(`${player.nickname} calls ${actualCall}.`);
                 if (player.points === 0) {
                     player.status = 'allin'; this.log(`${player.nickname} is all-in.`);
                 }
                 break;
             case 'bet':
             case 'raise':
                 const totalBetForPhase = amount; // The TOTAL amount player wants to have bet this phase
                 const amountToAdd = totalBetForPhase - player.actionAmount; // How much more to add now
                 const minRaiseAmount = this.calculateMinRaise();
                 const minTotalBet = this.gameState.currentMaxBet + minRaiseAmount; // Minimum total bet after raise

                 // --- Validation ---
                 if (amountToAdd <= 0) { // Didn't actually bet/raise
                      if (socket) socket.emit('error', 'ベット/レイズ額が不正です。');
                      player.isTurn = true; this.promptNextAction(); return;
                 }
                 if (player.points < amountToAdd) { // Not enough points for the specified bet/raise
                     if (socket) socket.emit('error', `ポイントが不足しています(${amountToAdd}必要)。`);
                     player.isTurn = true; this.promptNextAction(); return;
                 }
                 if (action === 'raise' && totalBetForPhase < minTotalBet && player.points > amountToAdd) { // Raise too small (unless it's all-in)
                     if (socket) socket.emit('error', `レイズ額が小さすぎます。最低 ${minTotalBet - player.actionAmount} (合計 ${minTotalBet}) 必要です。`);
                     player.isTurn = true; this.promptNextAction(); return;
                 }
                 if (action === 'bet' && amount < BIG_BLIND && player.points > amount) { // Bet too small (unless all-in)
                      if (socket) socket.emit('error', `最低ベット額は ${BIG_BLIND} です。`);
                      player.isTurn = true; this.promptNextAction(); return;
                 }
                 // --- End Validation ---


                 const actualAdd = Math.min(amountToAdd, player.points); // Handle all-in case implicitly
                 player.points -= actualAdd;
                 player.actionAmount += actualAdd; // This phase action amount
                 player.currentBet += actualAdd; // Total bet for the hand
                 this.gameState.pot += actualAdd;
                 this.gameState.currentMaxBet = player.actionAmount; // Update highest bet level
                 this.gameState.lastRaiserId = player.id; // Mark this player as the last aggressor
                 this.log(`${player.nickname} ${action}s ${actualAdd}. Total bet: ${player.actionAmount}`);
                 if (player.points === 0) {
                     player.status = 'allin'; this.log(`${player.nickname} is all-in.`);
                 }
                 break;
             default:
                 if (socket) socket.emit('error', '無効なアクションです。');
                 player.isTurn = true; this.promptNextAction(); return;
         }

         this.nextTurn();
    }


    nextTurn() {
        const activePlayers = this.gameState.players.filter(p => p.status !== 'out' && p.status !== 'fold');
        const activePlayingPlayers = activePlayers.filter(p => p.status === 'playing'); // Exclude all-in players for turn check

        // Check if only one player left who hasn't folded
        if (activePlayers.length <= 1) {
            this.awardPotToWinner(activePlayers.length > 0 ? activePlayers[0] : null); // Award pot if one player remains
            this.gameState.phase = 'roundEnd'; // Move to round end for next hand button
            this.broadcastUpdate();
            return;
        }

        // --- Betting Round End Condition Check ---
        let bettingRoundOver = false;
        // Condition 1: All active, non-all-in players have acted AND their current action amount matches the max bet.
        const everyoneActed = activePlayingPlayers.every(p =>
             (p.actionAmount === this.gameState.currentMaxBet)
        );
        // Condition 2: The turn has come back around to the last raiser OR the big blind (preflop only if no raise occurred)
        const currentActivePlayer = activePlayers[this.gameState.currentPlayerIndex];
        const nextActivePlayerIndex = (this.gameState.currentPlayerIndex + 1) % activePlayers.length;
        const nextActivePlayer = activePlayers[nextActivePlayerIndex];

        // Check if the next player to act is the one who made the last aggressive action
        // or if it's the BB preflop and no one raised.
        let turnHasCompleted = false;
        if (this.gameState.lastRaiserId) {
             turnHasCompleted = nextActivePlayer.id === this.gameState.lastRaiserId;
        } else if (this.gameState.phase === 'preflop') {
             // Preflop, if no raise, BB gets the option to check or raise
             const bbPlayer = activePlayers.find(p=>p.isBB);
             turnHasCompleted = nextActivePlayer.id === bbPlayer?.id;
        } else {
             // Postflop, if no bet/raise, turn completes when it gets back to the first actor (e.g., SB pos)
             // This needs a marker for the first actor in the phase, simplified here.
             // Assume check-around completes when turn returns to player after dealer
              const firstActorIndex = (this.gameState.dealerIndex + 1) % activePlayers.length;
              turnHasCompleted = nextActivePlayerIndex === firstActorIndex;
        }


        // Betting ends if everyone has acted (matched the bet or checked when possible) AND the turn completes.
        // Exception: If only one 'playing' player is left (others are fold/all-in), betting ends immediately.
        if (activePlayingPlayers.length <= 1 || (everyoneActed && turnHasCompleted)) {
            bettingRoundOver = true;
        }
        // --- End Condition Check ---


        if (bettingRoundOver) {
            this.log(`Betting round finished.`);
            this.collectBetsAndProceed(); // Collect bets into main pot visually, then next phase
        } else {
            // Find next player who is 'playing'
            let nextPlayerSearchIndex = (this.gameState.currentPlayerIndex + 1) % activePlayers.length;
            while(activePlayers[nextPlayerSearchIndex].status !== 'playing') {
                nextPlayerSearchIndex = (nextPlayerSearchIndex + 1) % activePlayers.length;
                if (nextPlayerSearchIndex === this.gameState.currentPlayerIndex) {
                     // Should not happen if bettingRoundOver check is correct, but safeguard
                     console.error("Infinite loop detected in nextTurn - betting round end check failed?");
                     this.collectBetsAndProceed(); // Force proceed
                     return;
                }
            }
            this.gameState.currentPlayerIndex = nextPlayerSearchIndex;
            this.promptNextAction();
        }
    }

    // Visually collect bets and move to next phase
    collectBetsAndProceed() {
         // Reset action amounts for the next phase
         this.gameState.players.forEach(p => p.actionAmount = 0);
         this.gameState.currentMaxBet = 0;
         this.gameState.lastRaiserId = null;

         // Determine who acts first post-flop (player after dealer)
         const activePlayers = this.gameState.players.filter(p => p.status !== 'out');
         let firstActorIndex = (this.gameState.dealerIndex + 1) % activePlayers.length;
         while(activePlayers[firstActorIndex].status !== 'playing') {
              firstActorIndex = (firstActorIndex + 1) % activePlayers.length;
              // Safeguard
              if (firstActorIndex === (this.gameState.dealerIndex + 1) % activePlayers.length) break;
         }
         this.gameState.currentPlayerIndex = firstActorIndex;

         // Move to next phase
         if (this.gameState.phase === 'preflop') this.dealFlop();
         else if (this.gameState.phase === 'flop') this.dealTurn();
         else if (this.gameState.phase === 'turn') this.dealRiver();
         else if (this.gameState.phase === 'river') this.showdown();
    }


    dealFlop() {
        this.gameState.phase = 'flop';
        this.log('Dealing Flop...');
        for(let i=0; i<3; i++) { const card = this.drawCard(); if(card) this.gameState.communityCards.push(card); }
        this.broadcastUpdate();
        this.promptNextAction();
    }
    dealTurn() {
        this.gameState.phase = 'turn';
        this.log('Dealing Turn...');
        const card = this.drawCard(); if(card) this.gameState.communityCards.push(card);
        this.broadcastUpdate();
        this.promptNextAction();
    }
    dealRiver() {
        this.gameState.phase = 'river';
        this.log('Dealing River...');
        const card = this.drawCard(); if(card) this.gameState.communityCards.push(card);
        this.broadcastUpdate();
        this.promptNextAction();
    }

    showdown() {
        this.gameState.phase = 'showdown';
        this.log('--- Showdown ---');
        const activePlayers = this.gameState.players.filter(p => p.status === 'playing' || p.status === 'allin');

        if (activePlayers.length <= 1) {
            this.awardPotToWinner(activePlayers.length > 0 ? activePlayers[0] : null);
            this.gameState.phase = 'roundEnd';
            this.broadcastUpdate(true); // Show winner's hand
            return;
        }

        activePlayers.forEach(player => {
            player.handRank = evaluateTexasHoldemHand(player.hand, this.gameState.communityCards);
            this.log(`${player.nickname} has ${player.handRank.name}`);
            player.status = 'showdown'; // Mark for hand display
        });

        // Determine winner(s)
        let winners = [activePlayers[0]];
        for (let i = 1; i < activePlayers.length; i++) {
             const comparison = this.compareHandRanks(winners[0].handRank, activePlayers[i].handRank);
             if (comparison < 0) winners = [activePlayers[i]];
             else if (comparison === 0) winners.push(activePlayers[i]);
        }

        this.awardPotToWinner(winners);
        this.gameState.phase = 'roundEnd';
        this.broadcastUpdate(true); // Show all hands at showdown/round end
    }

    compareHandRanks(rank1, rank2) {
         if (!rank1 || !rank2) return 0; // Should not happen
         if (rank1.rank !== rank2.rank) return rank1.rank - rank2.rank;
         for (let i = 0; i < Math.min(rank1.kickers?.length || 0, rank2.kickers?.length || 0); i++) {
              if (rank1.kickers[i] !== rank2.kickers[i]) return rank1.kickers[i] - rank2.kickers[i];
         }
         return 0; // Tie
    }

    awardPotToWinner(winners) {
        if (!winners || winners.length === 0) {
             this.log("Pot award error: No winners.");
             // Pot might carry over in some rules, but here we'll just reset
             this.gameState.pot = 0;
             return;
        }

        const winnerArray = Array.isArray(winners) ? winners : [winners];
        const potShare = Math.floor(this.gameState.pot / winnerArray.length);
        const remainder = this.gameState.pot % winnerArray.length;

        let winnerNicknames = [];
        winnerArray.forEach((winner, index) => {
             const share = potShare + (index === 0 ? remainder : 0);
             winner.points += share;
             this.log(`${winner.nickname} wins ${share} from the pot.`);
             winnerNicknames.push(winner.nickname);
        });

        // Emit result for modal display (simplified)
        this.io.to(this.roomId).emit('roundResult', {
            winnerNicknames: winnerNicknames,
            potAmount: this.gameState.pot,
            handName: winnerArray[0].handRank?.name || (winnerArray.length === 1 ? 'Fold win' : 'Split'), // Display name of first winner's hand
            communityCards: this.gameState.communityCards.map(c=>({...c})),
            playersData: this.gameState.players.filter(p=> p.status !== 'out').map(p => ({ // Send data for modal display
                id: p.id, nickname: p.nickname, hand: p.hand.map(c=>({...c})),
                handRank: p.handRank, points: p.points, status: p.status
            })),
            isFinalRound: (this.gameState.round >= this.gameState.maxRounds),
            gmId: null // TODO: Get GM ID if needed
        });


        this.gameState.pot = 0;
    }

    async endGame(winner = null) {
         this.log(`--- Game Over ---`);
         if (winner) this.log(`${winner.nickname} is the final winner!`);
         else this.log(`Game ended.`);

         this.gameState.phase = 'gameOver'; // Set a final phase
         this.broadcastUpdate(true); // Show final hands

         const finalResults = this.gameState.players.map(p => ({
             id: p.id, nickname: p.nickname, score: p.points // Final score is points
         }));
         this.io.to(this.roomId).emit('gameOver', { results: finalResults });
         await this.saveGameResults();
         // gameManager handles removal via handleNextRound returning true
    }

    async handleNextRound(socket) {
        if (socket.data.role !== 'gm') return socket.emit('error', '権限がありません。');
        if (this.gameState.phase !== 'roundEnd' && this.gameState.phase !== 'gameOver') {
             return socket.emit('error', 'まだラウンド/ゲームが終了していません。');
        }

        const activePlayers = this.gameState.players.filter(p => p.status !== 'out');
        const isFinalRound = (this.gameState.round >= this.gameState.maxRounds) || activePlayers.length <= 1;

        if (isFinalRound) {
            // Ensure endGame was called if needed
            if (this.gameState.phase !== 'gameOver') {
                 this.endGame(activePlayers.length === 1 ? activePlayers[0] : null);
            }
            return true; // Signal game end to gameManager
        } else {
            this.startNextHand();
            return false; // Signal game continues
        }
    }
}

module.exports = PokerGame;