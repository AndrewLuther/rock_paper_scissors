// type imports
import {
  ClientId,
  HelloMessage,
  ServerJoinMessage,
  LeaveMessage,
  GameStartMessage,
  GameEndMessage,
  ResultMessage,
  ClientJoinMessage,
  ClientSelectMessage,
  getElement,
} from "./shared.ts";

const messages: Array<HTMLElement> = [];
let messageNum = 0;

// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:3000");

const gameId = window.location.pathname.split("/").slice(-1)[0];
let clientId: ClientId | undefined = undefined; // this gets set when hello payload is received from server

// Connection opened, open a websocket now that someone is on the game page
socket.addEventListener("open", (event) => {
  const gameHeader = document.getElementById("gameHeader");
  if (gameHeader) {
    gameHeader.textContent = "game: " + gameId;
  }
  // send server info about the client that is connecting
  const clientInfo: ClientJoinMessage = {
    gameId: gameId,
    type: "join",
  };
  socket.send(JSON.stringify(clientInfo));
});

// START html generation

function addGameOption(optionName: "rock" | "paper" | "scissors") {
  const gameButton = document.createElement("button");
  gameButton.className = "gameButton";
  gameButton.addEventListener("click", async () => {
    if (!clientId) {
      throw new Error("This client's ID was never defined");
    }
    const gameMessage: ClientSelectMessage = {
      clientId,
      optionName,
      type: "select",
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

function updateGameInfoText(newText: string) {
  const gameInfoText = getElement("gameInfoText");
  gameInfoText.textContent = newText;
}

function removeGameElements() {
  const gameElements = getElement("gameElements");
  while (gameElements.firstChild) {
    gameElements.removeChild(gameElements.firstChild);
  }
}

// Would like to understand this a bit better, found it online
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animateGameSequence() {
  updateGameInfoText("Rock ...");
  await sleep(1000);
  updateGameInfoText("Paper ...");
  await sleep(1000);
  updateGameInfoText("Scissors ...");
  await sleep(1000);
  updateGameInfoText("Shoot!");
  await sleep(1000);
}

async function displayGameResult(data: ResultMessage) {
  if (!clientId) {
    throw new Error("clientId is undefined");
  }

  const yourSelection = data.selections[clientId];
  let otherSelection: "rock" | "paper" | "scissors" | undefined = undefined;

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

  await sleep(1000);

  secondHeader.textContent = "Opponent's selection:";
  tempDiv.remove();
  const opponentSelectionImage = document.createElement("img");
  opponentSelectionImage.src = "/images/" + otherSelection + ".png";
  opponentSelectionImage.className = "weaponImage2";
  gameElements.appendChild(opponentSelectionImage);

  await sleep(2000);

  secondHeader.remove();
  mainHeader.className = "gameInfoText";

  let result_message: string;

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

  await sleep(2000);

  yourSelectionImage.remove();
  opponentSelectionImage.remove();
}

// END html generation

// START websocket message handlers //
function handleHello(data: HelloMessage) {
  getElement("numPlayers").innerText = data.players.length.toString();
  clientId = data.clientId;
}

function handleJoin(data: ServerJoinMessage) {
  // update number of displayed players
  getElement("numPlayers").innerText = data.numClients.toString();

  // log a message saying that someone has joined
  console.log("client " + data.joinId + " has joined!");
  createMessage("Another player has joined!");
}

function handleGameStart(data: GameStartMessage) {
  console.log("Game started!");
  createMessage("Game started!");
  addGameOptions();
  updateGameInfoText("Choose your weapon!");
}

function handleGameEnd(data: GameEndMessage) {
  console.log("Game ended!");
  createMessage("Game ended!");
  removeGameElements();
  updateGameInfoText("Waiting for another player to join...");
}

function handleLeave(data: LeaveMessage) {
  // update number of displayed players
  getElement("numPlayers").innerText = data.numClients.toString();
  // log a message saying that someone has left
  console.log("client " + data.leaveId + " has left!");
  createMessage("A player has left!");
}

async function handleResult(data: ResultMessage) {
  await animateGameSequence();
  await displayGameResult(data);

  addGameOptions();
  updateGameInfoText("Choose your weapon!");
}

// END websocket message handlers //

function createMessage(message: string) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.id = "message" + messageNum;
  const messageText = document.createElement("p");
  messageText.innerText = message;
  messageText.className = "messageText";

  messageDiv.appendChild(messageText);

  const messageLog = getElement("messageLog");
  messageLog.appendChild(messageDiv);

  if (
    messageDiv.offsetTop + messageDiv.offsetHeight >
    messageLog.offsetTop + messageLog.offsetHeight
  ) {
    messages[0].remove();
    messages.shift(); // removes first element from list
  }

  messages.push(messageDiv);
  messageNum += 1;
}

// Listen for messages
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

document.addEventListener("DOMContentLoaded", (event) => {});
