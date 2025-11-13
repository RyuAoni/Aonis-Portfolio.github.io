// --- Constants ---
const VALUES = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "01"]; // A=01
const VALUE_MAP = { "01": 14, "13": 13, "12": 12, "11": 11, "10": 10, "09": 9, "08": 8, "07": 7, "06": 6, "05": 5, "04": 4, "03": 3, "02": 2 };
const RANK_NAMES = { 10: 'ロイヤルフラッシュ', 9: 'ストレートフラッシュ', 8: 'フォーカード', 7: 'フルハウス', 6: 'フラッシュ', 5: 'ストレート', 4: 'スリーカード', 3: 'ツーペア', 2: 'ワンペア', 1: 'ハイカード' };

// --- Helper Functions ---

// Get rank value (2-14)
function getRank(card) { return VALUE_MAP[card.value]; }
// Get suit ('club', 'diamond', 'heart', 'spade')
function getSuit(card) { return card.suit; }

// Generate combinations (nCr)
function combinations(arr, k) {
    if (k < 0 || k > arr.length) return [];
    if (k === 0) return [[]];
    if (k === arr.length) return [[...arr]]; // Return a copy
    if (k === 1) return arr.map(item => [item]);

    const combs = [];
    for (let i = 0; i <= arr.length - k; i++) {
        const first = arr[i];
        const restCombs = combinations(arr.slice(i + 1), k - 1);
        restCombs.forEach(comb => {
            combs.push([first, ...comb]);
        });
    }
    return combs;
}


// Evaluate a 5-card hand
function evaluate5Cards(hand) {
    if (!hand || hand.length !== 5) return { rank: 0, name: 'Invalid Hand', kickers: [] };

    const ranks = hand.map(getRank).sort((a, b) => b - a);
    const suits = hand.map(getSuit);
    const isFlush = new Set(suits).size === 1;

    // Check for Straight (A-5 low straight included)
    let isStraight = false;
    let straightHighCard = 0;
    const uniqueRanksSorted = Array.from(new Set(ranks)).sort((a, b) => a - b); // Ascending for straight check
    if (uniqueRanksSorted.length >= 5) {
        for (let i = 0; i <= uniqueRanksSorted.length - 5; i++) {
            if (uniqueRanksSorted[i+4] - uniqueRanksSorted[i] === 4) {
                isStraight = true;
                straightHighCard = uniqueRanksSorted[i+4];
                break; // Highest straight found
            }
        }
    }
    // Check A-5 straight (Wheel)
    const isWheel = uniqueRanksSorted.length >= 5 && uniqueRanksSorted[0] === 2 && uniqueRanksSorted[1] === 3 && uniqueRanksSorted[2] === 4 && uniqueRanksSorted[3] === 5 && uniqueRanksSorted.includes(14);
    if (isWheel) {
        isStraight = true;
        straightHighCard = 5; // High card for A-5 is 5
    }

    const rankCounts = ranks.reduce((acc, rank) => { acc[rank] = (acc[rank] || 0) + 1; return acc; }, {});
    const counts = Object.values(rankCounts).sort((a, b) => b - a); // e.g., [3, 1, 1] or [2, 2, 1]

    // --- Determine Rank and Kickers ---
    let result = { rank: 0, name: '', kickers: [] };

    if (isStraight && isFlush) {
        if (straightHighCard === 14 && uniqueRanksSorted.includes(13)) { // Royal Flush (A, K, Q, J, 10)
             result = { rank: 10, kickers: [] }; // No kickers needed for Royal Flush
        } else {
             result = { rank: 9, kickers: [straightHighCard] }; // SF kicker is the high card
        }
    } else if (counts[0] === 4) {
        const fourRank = parseInt(Object.keys(rankCounts).find(r => rankCounts[r] === 4));
        const kicker = ranks.find(r => r !== fourRank);
        result = { rank: 8, kickers: [fourRank, kicker] };
    } else if (counts[0] === 3 && counts[1] === 2) {
        const threeRank = parseInt(Object.keys(rankCounts).find(r => rankCounts[r] === 3));
        const pairRank = parseInt(Object.keys(rankCounts).find(r => rankCounts[r] === 2));
        result = { rank: 7, kickers: [threeRank, pairRank] };
    } else if (isFlush) {
        result = { rank: 6, kickers: ranks.slice(0, 5) }; // Flush kickers are the 5 ranks
    } else if (isStraight) {
        result = { rank: 5, kickers: [straightHighCard] }; // Straight kicker is the high card
    } else if (counts[0] === 3) {
        const threeRank = parseInt(Object.keys(rankCounts).find(r => rankCounts[r] === 3));
        const kickers = ranks.filter(r => r !== threeRank).slice(0, 2);
        result = { rank: 4, kickers: [threeRank, ...kickers] };
    } else if (counts[0] === 2 && counts[1] === 2) {
        const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === 2).map(Number).sort((a, b) => b - a);
        const kicker = ranks.find(r => !pairRanks.includes(r));
        result = { rank: 3, kickers: [...pairRanks, kicker] };
    } else if (counts[0] === 2) {
        const pairRank = parseInt(Object.keys(rankCounts).find(r => rankCounts[r] === 2));
        const kickers = ranks.filter(r => r !== pairRank).slice(0, 3);
        result = { rank: 2, kickers: [pairRank, ...kickers] };
    } else {
        result = { rank: 1, kickers: ranks.slice(0, 5) }; // High card kickers are the 5 ranks
    }

    result.name = RANK_NAMES[result.rank] || 'Unknown Rank';
    return result;
}

// Evaluate 7 cards to find the best 5-card hand
function evaluateTexasHoldemHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    if (allCards.length < 5) return { rank: 0, name: 'Invalid Hand', kickers: [] };

    let bestHandRank = { rank: 0, name: 'No Rank', kickers: [] };
    const possibleHands = combinations(allCards, 5); // Get all 5-card combinations

    for (const hand of possibleHands) {
        const currentRank = evaluate5Cards(hand);
        if (currentRank.rank > bestHandRank.rank ||
            (currentRank.rank === bestHandRank.rank && compareKickers(currentRank.kickers, bestHandRank.kickers) > 0))
        {
            bestHandRank = currentRank;
        }
    }

    // Add name based on final rank
    bestHandRank.name = RANK_NAMES[bestHandRank.rank] || 'Unknown Rank';
    return bestHandRank;
}

// Compare kicker arrays
function compareKickers(k1, k2) {
    const len = Math.min(k1?.length || 0, k2?.length || 0);
    for (let i = 0; i < len; i++) {
        if (k1[i] !== k2[i]) {
            return k1[i] - k2[i];
        }
    }
    return 0; // Tie
}

module.exports = { evaluateTexasHoldemHand, compareKickers }; // Export compareKickers as well if needed elsewhere