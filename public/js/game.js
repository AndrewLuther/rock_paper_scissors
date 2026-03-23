(() => {
  // src/shared.ts
  function getElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("The requested element does not exist.");
    } else {
      return element;
    }
  }

  // src/game.ts
  var messages = [];
  var messageNum = 0;
  var socket = new WebSocket("ws://localhost:3000");
  var gameId = window.location.pathname.split("/").slice(-1)[0];
  var clientId = void 0;
  socket.addEventListener("open", (event) => {
    const gameHeader = document.getElementById("gameHeader");
    if (gameHeader) {
      gameHeader.textContent = "game: " + gameId;
    }
    const clientInfo = {
      gameId,
      type: "join"
    };
    socket.send(JSON.stringify(clientInfo));
  });
  function addGameOption(optionName) {
    const gameButton = document.createElement("button");
    gameButton.className = "gameButton";
    gameButton.addEventListener("click", async () => {
      if (!clientId) {
        throw new Error("This client's ID was never defined");
      }
      const gameMessage = {
        clientId,
        optionName,
        type: "select"
      };
      socket.send(JSON.stringify(gameMessage));
      removeGameElements();
      updateGameInfoText("Waiting for other player to choose...");
    });
    const img = document.createElement("img");
    img.src = "/images/" + optionName + ".png";
    img.className = "weaponImage";
    gameButton.appendChild(img);
    const gameElements = getElement("gameElements");
    gameElements.appendChild(gameButton);
  }
  function addGameOptions() {
    addGameOption("rock");
    addGameOption("paper");
    addGameOption("scissors");
  }
  function updateGameInfoText(newText) {
    const gameInfoText = getElement("gameInfoText");
    gameInfoText.textContent = newText;
  }
  function removeGameElements() {
    const gameElements = getElement("gameElements");
    while (gameElements.firstChild) {
      gameElements.removeChild(gameElements.firstChild);
    }
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function animateGameSequence() {
    updateGameInfoText("Rock ...");
    await sleep(1e3);
    updateGameInfoText("Paper ...");
    await sleep(1e3);
    updateGameInfoText("Scissors ...");
    await sleep(1e3);
    updateGameInfoText("Shoot!");
    await sleep(1e3);
  }
  async function displayGameResult(data) {
    if (!clientId) {
      throw new Error("clientId is undefined");
    }
    const yourSelection = data.selections[clientId];
    let otherSelection = void 0;
    for (const [key, value] of Object.entries(data.selections)) {
      if (key !== clientId) {
        otherSelection = value;
      }
    }
    if (!otherSelection) {
      throw new Error("could not find any other clientId in result message");
    }
    const gameUITextDiv = getElement("gameUITextDiv");
    const mainHeader = getElement("gameInfoText");
    mainHeader.className = "splitGameInfoText";
    updateGameInfoText("Your selection:");
    const secondHeader = document.createElement("h1");
    secondHeader.className = "splitGameInfoText";
    gameUITextDiv.appendChild(secondHeader);
    const gameElements = getElement("gameElements");
    const yourSelectionImage = document.createElement("img");
    yourSelectionImage.src = "/images/" + yourSelection + ".png";
    yourSelectionImage.className = "weaponImage2";
    const tempDiv = document.createElement("div");
    tempDiv.className = "weaponImage2";
    gameElements.appendChild(yourSelectionImage);
    gameElements.appendChild(tempDiv);
    await sleep(1e3);
    secondHeader.textContent = "Opponent's selection:";
    tempDiv.remove();
    const opponentSelectionImage = document.createElement("img");
    opponentSelectionImage.src = "/images/" + otherSelection + ".png";
    opponentSelectionImage.className = "weaponImage2";
    gameElements.appendChild(opponentSelectionImage);
    await sleep(2e3);
    secondHeader.remove();
    mainHeader.className = "gameInfoText";
    let result_message;
    if (data.winner) {
      if (clientId == data.winner) {
        result_message = "You win!";
      } else {
        result_message = "You lose!";
      }
    } else {
      result_message = "It's a tie!";
    }
    console.log(result_message);
    createMessage(result_message);
    updateGameInfoText(result_message);
    await sleep(2e3);
    yourSelectionImage.remove();
    opponentSelectionImage.remove();
  }
  function handleHello(data) {
    getElement("numPlayers").innerText = data.players.length.toString();
    clientId = data.clientId;
  }
  function handleJoin(data) {
    getElement("numPlayers").innerText = data.numClients.toString();
    console.log("client " + data.joinId + " has joined!");
    createMessage("Another player has joined!");
  }
  function handleGameStart(data) {
    console.log("Game started!");
    createMessage("Game started!");
    addGameOptions();
    updateGameInfoText("Choose your weapon!");
  }
  function handleGameEnd(data) {
    console.log("Game ended!");
    createMessage("Game ended!");
    removeGameElements();
    updateGameInfoText("Waiting for another player to join...");
  }
  function handleLeave(data) {
    getElement("numPlayers").innerText = data.numClients.toString();
    console.log("client " + data.leaveId + " has left!");
    createMessage("A player has left!");
  }
  async function handleResult(data) {
    await animateGameSequence();
    await displayGameResult(data);
    addGameOptions();
    updateGameInfoText("Choose your weapon!");
  }
  function createMessage(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";
    messageDiv.id = "message" + messageNum;
    const messageText = document.createElement("p");
    messageText.innerText = message;
    messageText.className = "messageText";
    messageDiv.appendChild(messageText);
    const messageLog = getElement("messageLog");
    messageLog.appendChild(messageDiv);
    if (messageDiv.offsetTop + messageDiv.offsetHeight > messageLog.offsetTop + messageLog.offsetHeight) {
      messages[0].remove();
      messages.shift();
    }
    messages.push(messageDiv);
    messageNum += 1;
  }
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("Message from server ", data);
    switch (data.type) {
      case "hello":
        handleHello(data);
        break;
      case "join":
        handleJoin(data);
        break;
      case "leave":
        handleLeave(data);
        break;
      case "gameStart":
        handleGameStart(data);
        break;
      case "gameEnd":
        handleGameEnd(data);
        break;
      case "result":
        handleResult(data);
        break;
      default:
        console.log("Unknown message type");
        socket.close();
    }
  });
  document.addEventListener("DOMContentLoaded", (event) => {
  });
})();
