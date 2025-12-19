import express from "express";
import path from "path";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from 'uuid';

const wss = new WebSocketServer({ noServer: true });
const app = express();
app.use(express.static(path.join(import.meta.dirname, 'public')))
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

app.get("/api/get-games", (req, res) => {
  const gameList = []
  for (const [key, value] of games.entries()){
    gameList.push(key)
  }
  res.json(gameList)
})

wss.on("connection", (ws, request) => {
  const clientId = uuidv4()

  let game

  // broadcast a message to all clients connected to the specified game
  function broadcast(msg, game) {
    game.clients.forEach((client) => {
      if (client.id != clientId) {
        client.websocket.send(JSON.stringify(msg))
      }
    })
  }

  function handleJoin(msg) {
    game = games.get(msg.gameId);

    if (!game) {
      console.log("Websocket requested a game that didn't exist.")
      ws.close()
      return 
    }

    game.clients.add({
      id: clientId, 
      websocket: ws
    });

    // the first thing we send when someone first connects to the socket
    // includes clientid and list of other clients in room
    const helloPayload = {
      clientId,
      players: Array.from(game.clients),
      type: "hello"
    }
    ws.send(JSON.stringify(helloPayload))

    // need to broadcast to all other websockets that someone has joined
    const joinMessage = {
      joinId: clientId,
      numClients: game.clients.size,
      type: "join"
    }
    broadcast(joinMessage, game)
  }

  ws.on("message", (msg) => {
    msg = JSON.parse(msg.toString());
    switch (msg.type){
      case "join":
        handleJoin(msg);
        break;
      
      default:
        console.log("Unknown message type.")
        ws.close()
    }
  });

  ws.on("close", () => {
    if (game) {
      // when a client closes (disconnects) we need to remove them from the server's
      // list of clients for this game
      game.clients.forEach((client) => {
        if (client.id == clientId) {
          game.clients.delete(client)
        }
      })

      const leaveMessage = {
        leaveId: clientId,
        numClients: game.clients.size,
        type: "leave"
      }

      broadcast(leaveMessage, game)
    }
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
