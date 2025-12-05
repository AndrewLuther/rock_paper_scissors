import express from "express"
import path from "path"
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.sendFile(path.join(import.meta.dirname, "home.html"))
})

app.get('/game/:id', (req, res) => {
  console.log(req.params.id)  
  res.sendFile(path.join(import.meta.dirname, "game.html"))
})

app.post('/api/create-game', (req, res) => {
    res.json({
        id: "foo"
    })
})

wss.on("connection", (ws, request) => {

  ws.on("message", msg => {
    console.log(msg.toString())
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