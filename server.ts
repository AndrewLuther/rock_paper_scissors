import express from "express";
import path from "path";
import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'node:fs';

type Client = {
  id:string,
  websocket:WebSocket
}

type Game = {
  clients: Set<Client>;
  started: boolean;
  selections: Record<string, "rock" | "paper" | "scissors">;
  id: string
}

type ClientMessage = {
  type: string,
  clientId: string,
  optionName: "rock" | "paper" | "scissors",
  gameId: string
}

type GameInfo = {
  id: string,
  numPlayers:BigInt
}

const wss = new WebSocketServer({ noServer: true });
const app = express();
app.use(express.static(path.join(import.meta.dirname, 'public')))
const port = 3000;

const games= new Map();

// a map of all clients on the homepage of the app, so message can be specifically
// broadcasted to homepage clients
const homepageClients: Map<string, WebSocket> = new Map<string, WebSocket>();

function broadcastHomepage(msg:object) {
  homepageClients.forEach((ws, clientId) => {
    ws.send(JSON.stringify(msg))
  })
}

app.get("/", (req, res) => {
  res.sendFile(path.join(import.meta.dirname, "home.html"));
});

app.get("/game/:id", (req, res) => {
  const game = createGame(req.params.id);

  console.log(game.clients.size)

  if (game.clients.size == 2) {
    console.log("someone tried to join a full game")
    res.sendFile(path.join(import.meta.dirname, "error.html"))

  } else {
    res.sendFile(path.join(import.meta.dirname, "game.html"));
  }

  
});

app.post("/api/create-game", (req, res) => {
  const game = createGame();
  res.json({
    id: game.id,
  });
});

// app.get("/api/get-games", (req, res) => {
//   const gameList:Array<GameInfo> = []
//   for (const [gameId, game] of games.entries()){
//     const gameInfo = {
//       id: gameId,
//       numPlayers: game.clients.size
//     }
//     gameList.push(gameInfo)
//   }
//   res.json(gameList)
// })

wss.on("connection", (ws, request) => {
  const clientId = uuidv4()

  // these are defined per websocket connection
  let game: Game
  let onHomepage:boolean = false

  // broadcast a message to all clients connected to the specified game
  function broadcastOthers(msg:object) {
    game.clients.forEach((client) => {
      if (client.id != clientId) {
        client.websocket.send(JSON.stringify(msg))
      }
    })
  }

  function broadcastAll(msg:object) {
    console.log("broadcasting", msg)
    game.clients.forEach((client) => {
      client.websocket.send(JSON.stringify(msg))
    })
  }

  function startGame() {
    game.started = true;
    const startMsg = {
      type: "gameStart"
    }
    broadcastAll(startMsg);
  }

  function endGame() {
    game.started = false;
    const endMsg = {
      type: "gameEnd"
    }
    broadcastAll(endMsg);
  }

  function calculateResult() {

    const clientArray = Array.from(game.clients);
    const client1 = clientArray[0];
    const client2 = clientArray[1];

    const player1Selection = game.selections[client1.id];
    const player2Selection = game.selections[client2.id];

    let winner:string|undefined

    if (didPlayerWin(player1Selection, player2Selection)) {
      winner = client1.id
      console.log(client1.id + " wins!")
    } else if (didPlayerWin(player2Selection, player1Selection)) {
      winner = client2.id
      console.log(client2.id + " wins!")
    } else {
      winner = undefined;
      console.log("It's a draw!")
    }

    const resultMessage = {
      winner,
      type: "result",
      selections: game.selections
    }

    broadcastAll(resultMessage)

    game.selections = {};
    
  }

  function didPlayerWin(selection:"rock" | "paper" | "scissors", otherSelection:"rock" | "paper" | "scissors") {
    if (selection == "rock" && otherSelection == "scissors") {
      return true
    }

    if (selection == "paper" && otherSelection == "rock") {
      return true
    }

    if (selection == "scissors" && otherSelection == "paper") {
      return true
    }

    return false
  }

  function handleJoin(msg:ClientMessage) {
    onHomepage = false
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
    broadcastOthers(joinMessage)

    const homepageJoinMessage = {
      type: "playerNumberUpdate",
      gameid: game.id,
      numClients: game.clients.size
    }

    broadcastHomepage(homepageJoinMessage)

    if (game.clients.size == 2) {
      startGame();
    } else if (game.started) {
      console.log("Game ended because too many players!")
      endGame();
    }
  }

  function handleSelect(msg:ClientMessage) {
    console.log(msg.clientId + " from game " + 
      game.id + " has selected " + msg.optionName + "!")

    game.selections[msg.clientId] = msg.optionName
    console.log(game.selections)

    if (Object.keys(game.selections).length == 2) {
      calculateResult()
    }
  }

  function handleHomepageJoin(msg:ClientMessage) {
    onHomepage = true

    // add the client to the list of clients on the homepage
    homepageClients.set(clientId, ws)

    // get the list of games together
    const gameList:Array<GameInfo> = []
    for (const [gameId, game] of games.entries()){
      const gameInfo = {
        id: gameId,
        numPlayers: game.clients.size
      }
      gameList.push(gameInfo)
    }

    // send back a message with the list of games
    const helloPayload = {
      type: "hello",
      gameList: gameList
    }

    ws.send(JSON.stringify(helloPayload))
  }

  ws.on("message", (msg:ClientMessage) => {
    msg = JSON.parse(msg.toString());
    switch (msg.type){
      case "join":
        handleJoin(msg);
        break;
      case "select":
        handleSelect(msg);
        break;
      case "homepageJoin":
        handleHomepageJoin(msg);
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

      broadcastOthers(leaveMessage);

      const homepageLeaveMessage = {
        type: "playerNumberUpdate",
        gameid: game.id,
        numClients: game.clients.size
      }

      broadcastHomepage(homepageLeaveMessage)

      if (game.clients.size == 2) {
        startGame();
      } else if (game.started) {
        console.log("Game ended because someone left!")
        endGame();
      }

      // remove this game from the list of games if there is no one in it anymore
      if (game.clients.size == 0) {
        const gameDeleteMessage = {
          type: "gameDelete",
          gameId: game.id
        }
        broadcastHomepage(gameDeleteMessage)
        games.delete(game.id)
      }
    }

    if (onHomepage) {
      homepageClients.delete(clientId)
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

function createGame(id?:string) :Game {
  const existingGame = games.get(id)
  if (existingGame) {return existingGame}

  // otherwise make a game
  const game = {
    clients: new Set<Client>(),
    started: false,
    selections: {},
    id: id ? id : createGameId()
  };

  const newGameMessage = {
    type:"newGame",
    newGame: {
      id: game.id,
      numPlayers: game.clients.size
    }
  }
  broadcastHomepage(newGameMessage)

  games.set(game.id, game);
  return game
}

function createGameId() {
  
  const nounsBuffer = readFileSync("nouns.txt");
  const nouns = nounsBuffer.toString().split(/\r?\n/);

  const adjBuffer = readFileSync("adjectives.txt");
  const adjectives = adjBuffer.toString().split(/\r?\n/);

  let gameId;

  while (!gameId || games.has(gameId)) {
    const random_noun = nouns[Math.floor(Math.random()*nouns.length)];
    const random_adjective = adjectives[Math.floor(Math.random()*adjectives.length)];
    gameId = random_adjective + "-" + random_noun;
  }

  console.log("game name is " + gameId)
  return gameId;
}
