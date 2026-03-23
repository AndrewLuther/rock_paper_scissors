import type { WebSocket } from "ws";

export type ClientId = string;

export type Client = {
  id: ClientId;
  websocket: WebSocket;
};

export type GameInfo = {
  id: string;
  numPlayers: BigInt;
};

export type HelloMessage = {
  type: "hello";
  clientId: ClientId;
  players: Array<Client>;
};

export type ServerJoinMessage = {
  type: "join";
  numClients: number;
  joinId: ClientId;
};

export type ClientJoinMessage = {
  type: "join";
  gameId: string;
};

export type ClientSelectMessage = {
  type: "select";
  clientId: ClientId;
  optionName: "rock" | "paper" | "scissors";
};

export type LeaveMessage = {
  type: "leave";
  leaveId: ClientId;
  numClients: number;
};

export type GameStartMessage = {
  type: "gameStart";
};

export type GameEndMessage = {
  type: "gameEnd";
};

export type ResultMessage = {
  type: "result";
  winner: ClientId | undefined;
  selections: Record<string, "rock" | "paper" | "scissors">;
};

export type ClientHomepageJoinMessage = {
  type: "homepageJoin";
};

export type HomepageHelloMessage = {
  type: "hello";
  gameList: Array<GameInfo>;
};

export type HomepageNewGameMessage = {
  type: "newGame";
  newGame: {
    id: "string";
    numPlayers: number;
  };
};

export type HomepagePlayerNumberUpdateMessage = {
  type: "playerNumberUpdate";
};

export type HomepageGameDeleteMessage = {
  type: "gameDelete";
  gameId: string;
};

export function isHTMLElement(element: Element): element is HTMLElement {
  return element instanceof HTMLElement;
}

export function isHTMLButton(element: Element): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

export function getElement(elementId: string) {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error("The requested element does not exist.");
  } else {
    return element;
  }
}

export function getElementsChild(element: HTMLElement, childId: string) {
  const child = element.querySelector("." + childId);
  if (!child || !isHTMLElement(child)) {
    throw new Error("There are no child elements of the specified id.");
  } else {
    return child;
  }
}
