const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./db');
const auth = require('./auth');
const gameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

app.use(express.static(__dirname)); // ルート (修正後の index.html など)
app.use('/games/koikoi', express.static(__dirname + '/games/koikoi'));
app.use('/games/suuji-battle', express.static(__dirname + '/games/suuji-battle'));
app.use('/games/blackjack', express.static(__dirname + '/games/blackjack'));
app.use('/games/poker', express.static(__dirname + '/games/poker'));
// ★ 追加: Babanuki用
app.use('/games/babanuki', express.static(__dirname + '/games/babanuki'));

app.use('/images/hana', express.static(__dirname + '/images/hana'));
app.use('/images/cards', express.static(__dirname + '/images/cards'));
// ★ 追加: Babanuki カード画像用 (ルート直下)
app.use('/images', express.static(__dirname + '/images'));

app.use('/', auth.router);
app.use('/api', gameManager.apiRouter);

gameManager.initializeSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));