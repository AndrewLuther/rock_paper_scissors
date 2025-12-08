import express from "express"
import path from "path"
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });
const app = express()
const port = 3000

const rooms = new Map();

app.get('/', (req, res) => {
  res.sendFile(path.join(import.meta.dirname, "home.html"))
})

app.get('/game/:id', (req, res) => {
  console.log(req.params.id)  
  res.sendFile(path.join(import.meta.dirname, "game.html"))
})

app.post('/api/create-game', (req, res) => {

    const room_id = createRoomId()
    res.json({
        id: room_id
    })

    if (!rooms.get(room_id)) {
      rooms.set(room_id, new Set())
    }
})

wss.on("connection", (ws, request) => {

  ws.on("message", msg => {
    msg = JSON.parse(msg.toString())
    const room_clients = rooms.get(msg.room_id)
    room_clients.add(msg.client_id)
    rooms.set(msg.room_id, room_clients)

    console.log(rooms)
  });

  ws.on("close", () => {
    console.log("closed")
  });
});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit("connection", ws, request);
  });
});

function createRoomId() {
  return "foo"
}