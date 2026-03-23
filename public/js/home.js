(() => {
  // src/shared.ts
  function isHTMLElement(element) {
    return element instanceof HTMLElement;
  }
  function isHTMLButton(element) {
    return element instanceof HTMLButtonElement;
  }
  function getElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("The requested element does not exist.");
    } else {
      return element;
    }
  }
  function getElementsChild(element, childId) {
    const child = element.querySelector("." + childId);
    if (!child || !isHTMLElement(child)) {
      throw new Error("There are no child elements of the specified id.");
    } else {
      return child;
    }
  }

  // src/home.ts
  var socket = new WebSocket("ws://localhost:3000");
  socket.addEventListener("open", (event) => {
    const clientInfo = {
      type: "homepageJoin"
    };
    socket.send(JSON.stringify(clientInfo));
  });
  function handleHello(data) {
    const gamesDiv = getElement("games");
    data.gameList.forEach((game) => {
      const div = makeGameDiv(game);
      gamesDiv.appendChild(div);
    });
  }
  function handleNewGame(data) {
    const gamesDiv = getElement("games");
    const div = makeGameDiv(data.newGame);
    gamesDiv.appendChild(div);
  }
  function handlePlayerNumberUpdate(data) {
    const gamesDiv = getElement("games");
    for (let gameDiv of gamesDiv.children) {
      if (gameDiv.id === data.gameid && isHTMLElement(gameDiv)) {
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
  function handleGameDelete(data) {
    const gameDiv = getElement(data.gameId);
    gameDiv.remove();
  }
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
    console.log("DOM fully loaded and parsed");
    const button = getElement("create");
    button.addEventListener("click", async () => {
      const response = await fetch("/api/create-game", {
        method: "POST"
      });
      const data = await response.json();
      window.location.pathname = "/game/" + data.id;
    });
  });
})();
