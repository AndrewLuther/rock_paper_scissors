import {
  getElement,
  getElementsChild,
  HomepageGameDeleteMessage,
  HomepageHelloMessage,
  HomepageNewGameMessage,
  isHTMLButton,
  isHTMLElement,
} from "./shared";

// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:3000");
socket.addEventListener("open", (event) => {
  const clientInfo = {
    type: "homepageJoin",
  };
  socket.send(JSON.stringify(clientInfo));
});

function handleHello(data: HomepageHelloMessage) {
  const gamesDiv = getElement("games");
  data.gameList.forEach((game) => {
    const div = makeGameDiv(game);
    gamesDiv.appendChild(div);
  });
}

function handleNewGame(data: HomepageNewGameMessage) {
  const gamesDiv = getElement("games");
  const div = makeGameDiv(data.newGame);
  gamesDiv.appendChild(div);
}

function handlePlayerNumberUpdate(data) {
  const gamesDiv = getElement("games");
  for (let gameDiv of gamesDiv.children) {
    if (gameDiv.id === data.gameid && isHTMLElement(gameDiv)) {
      //const gamePlayers = getElementFromElement(gameDiv, "gamePlayers");
      const gamePlayers = getElementsChild(gameDiv, "gamePlayers");
      gamePlayers.innerText = "players: " + data.numClients + "/2";
      const joinButton = getElementsChild(gameDiv, "joinGameButton");
      console.log(joinButton);
      if (data.numClients < 2 && isHTMLButton(joinButton)) {
        joinButton.disabled = false;
      }
      if (data.numClients >= 2 && isHTMLButton(joinButton)) {
        joinButton.disabled = true;
      }
    }
  }
}

function handleGameDelete(data: HomepageGameDeleteMessage) {
  const gameDiv = getElement(data.gameId);
  gameDiv.remove();
}

// Listen for messages
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("Message from server ", data);
  switch (data.type) {
    case "hello":
      handleHello(data);
      break;
    case "newGame":
      handleNewGame(data);
      break;
    case "playerNumberUpdate":
      handlePlayerNumberUpdate(data);
      break;
    case "gameDelete":
      handleGameDelete(data);
      break;
    default:
      console.log("Unknown message type");
      socket.close();
  }
});

function makeGameDiv(gameObject) {
  const div = document.createElement("div");
  div.className = "game";
  div.id = gameObject.id;

  const gameTitle = document.createElement("h2");
  gameTitle.innerText = gameObject.id;
  gameTitle.className = "gameTitle";

  const joinGameButton = document.createElement("button");
  joinGameButton.className = "joinGameButton";
  joinGameButton.innerText = "join game";
  joinGameButton.id = gameObject.id + "JoinButton";
  joinGameButton.addEventListener("click", () => {
    window.location.pathname = "/game/" + gameObject.id;
  });
  if (gameObject.numPlayers >= 2) {
    joinGameButton.disabled = true;
  }

  const playerCount = document.createElement("p");
  playerCount.innerText = "players: " + gameObject.numPlayers + "/2";
  playerCount.className = "gamePlayers";

  div.appendChild(gameTitle);
  div.appendChild(playerCount);
  div.appendChild(joinGameButton);

  return div;
}

document.addEventListener("DOMContentLoaded", async (event) => {
  // Create the event listener for the create game button
  console.log("DOM fully loaded and parsed");
  const button = getElement("create");
  button.addEventListener("click", async () => {
    const response = await fetch("/api/create-game", {
      method: "POST",
    });

    const data = await response.json();
    window.location.pathname = "/game/" + data.id;
  });
});
