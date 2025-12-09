import express from "express";
import path from "path";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });
const app = express();
const port = 3000;

const games = new Map();

app.get("/", (req, res) => {
  res.sendFile(path.join(import.meta.dirname, "home.html"));
});

app.get("/game/:id", (req, res) => {
  const game = createGame(req.params.id);

  console.log(req.params.id);
  res.sendFile(path.join(import.meta.dirname, "game.html"));
});

app.post("/api/create-game", (req, res) => {
  const game = createGame();
  res.json({
    id: game.id,
  });
});

wss.on("connection", (ws, request) => {
  const clientId = Math.random()
  ws.send(JSON.stringify({clientId}))

  ws.on("message", (msg) => {
    msg = JSON.parse(msg.toString());

    const game = games.get(msg.gameId);

    if (!game) {
      console.log("Websocket requested a game that didn't exist.")
      ws.close()
      return 
    }

    game.clients.add(clientId);

    console.log(games);
  });

  ws.on("close", () => {
    console.log("closed");
  });
});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

function createGame(id=undefined) {
  const existingGame = games.get(id)
  if (existingGame) {return existingGame}

  // otherwise make a game
  const game = {
    clients: new Set(),
    id: id ? id : createGameId()
  };

  games.set(game.id, game);
  return game
}

function createGameId() {
  return "foo";
}
