import { appendRoomElement, updateNumberOfUsersInRoom } from "./views/room.mjs";
import { appendUserElement } from "./views/user.mjs";
import { showResultsModal, showMessageModal } from "./views/modal.mjs";
const username = sessionStorage.getItem("username");

if (!username) {
  window.location.replace("/login");
}
let currentRoom = null;

const socket = io("http://localhost:3002", { query: { username } });

socket.on("SET_ALL_ROOMS", setRooms);
function setRooms(rooms) {
  if (rooms) {
    rooms.forEach((item) => {
      appendRoomElement({
        name: item.name,
        numberOfUsers: item.users.length,
        onJoin: () => joinRoom(item.name),
      });
    });
  }
}
socket.on("error", function (err) {
  if (err) {
    showMessageModal({ message: "The room exists" });
  }
});

const buttonCreateRoom = document.querySelector("#add-room-btn");
const roomsPage = document.querySelector("#rooms-page");
const gamePage = document.querySelector("#game-page");
const exitButton = document.querySelector("#quit-room-btn");
const usersWrapper = document.querySelector("#users-wrapper");
const roomName = document.querySelector("#room-name");
const readyBtn = document.querySelector("#ready-btn");
const timer = document.querySelector("#timer");
const textContainer = document.querySelector("#text-container");
const gameTimer = document.querySelector("#game-timer");
const gameTimerSeconds = document.querySelector("#game-timer-seconds");

buttonCreateRoom.addEventListener("click", () => {
  const roomName = prompt("Please enter a room name");
  if (roomName) {
    socket.emit("ROOM", roomName);
  }
});

exitButton.addEventListener("click", () => {
  if (!currentRoom.name) {
    return;
  }
  socket.emit("EXIT_FROM_ROOM", currentRoom.name);
});

readyBtn.addEventListener("click", () => {
  const currentStatus = currentRoom.users.find(
    (user) => user.username === username
  );
  if (currentStatus.ready) {
    readyBtn.textContent = "READY";
  } else {
    readyBtn.textContent = "NOT READY";
  }

  socket.emit("IS_READY", {
    ready: !currentStatus.ready,
    nameRoom: currentRoom.name,
  });
});

socket.on("SEND_ROOM", getRooms);
function getRooms(room) {
  appendRoomElement({
    name: room.name,
    numberOfUsers: room.users.length,
    onJoin: () => joinRoom(room.name),
  });
}

socket.on("UPDATE_ROOMS", updateNumberOfUsersInRoom);

socket.on("JOIN_DONE", (room) => {
  currentRoom = room;

  exitButton.classList.remove("display-none");
  textContainer.innerHTML = "";
  readyBtn.classList.remove("display-none");
  timer.classList.add("display-none");
  gameTimer.classList.add("display-none");
  readyBtn.textContent = "READY";
  textContainer.classList.add("display-none");

  joinRoomDisplay(true, room.name);
  usersWrapper.innerHTML = "";
  currentRoom.users.forEach((user) => {
    if (user.username === username) {
      appendUserElement({ ...user, username: user.username + "(you)" });
    } else {
      appendUserElement(user);
    }
  });
});

socket.on("UPDATE_JOIN", (room) => {
  currentRoom = room;
  usersWrapper.innerHTML = "";
  currentRoom.users.forEach((user) => {
    if (user.username === username) {
      appendUserElement({ ...user, username: user.username + "(you)" });
    } else {
      appendUserElement(user);
    }
  });

  const readyStatus = currentRoom.users.filter((user) => user.ready === false);
  updateGameContainer(room);
  if (readyStatus.length === 0) {
    socket.emit("GET_TEXT_BY_ID", currentRoom.name);
    socket.emit("TIMER_START", currentRoom.name);
  }
});

socket.on("UPDATE_JOIN_PROGRESS", (room) => {
  currentRoom = room;
  usersWrapper.innerHTML = "";
  currentRoom.users.forEach((user) => {
    if (user.username === username) {
      if (user.progress >= 100) {
        appendUserElement({
          ...user,
          username: user.username + "(you)",
        }).querySelector(".user-progress").style.backgroundColor = "#00a2ff";
      } else {
        appendUserElement({ ...user, username: user.username + "(you)" });
      }
    } else {
      if (user.progress >= 100) {
        appendUserElement(user).querySelector(
          ".user-progress"
        ).style.backgroundColor = "#00a2ff";
      } else {
        appendUserElement(user);
      }
    }
  });
});

socket.on("ERROR_ROOM_JOIN", (message) => {
  showMessageModal({ message });
});

socket.on("MAX_JOIN_LIMIT", (message) => {
  showMessageModal({ message });
});

socket.on("EXIT_DONE", () => {
  currentRoom = null;
  joinRoomDisplay(false);
});

socket.on("TIMER_DEC", (start) => {
  updateGameContainer(currentRoom, start);
});

socket.on("SET_TEXT_BY_ID", async (id) => {
  textContainer.innerHTML = "";
  const text = await getRandomText(id);
  text.split("").forEach((elem) => {
    textContainer.innerHTML += `<span>${elem}<span/>`;
  });
});

socket.on("END_GAME", (room) => {
  showResultsModal({
    usersSortedArray: currentRoom.users,
    onClose: () => endGame(room),
  });
});

function endGame(room) {
  currentRoom = room;
  exitButton.classList.remove("display-none");
  textContainer.innerHTML = "";
  textContainer.classList.add("display-none");
  readyBtn.classList.remove("display-none");
  timer.classList.add("display-none");
  gameTimer.classList.add("display-none");
  readyBtn.textContent = "READY";
  socket.emit("EXIT_FROM_ROOM", currentRoom.name);
}

function joinRoomDisplay(bool, currentRoomName) {
  if (bool) {
    roomsPage.classList.add("display-none");
    gamePage.classList.remove("display-none");
    roomName.textContent = currentRoomName;
  } else {
    roomsPage.classList.remove("display-none");
    gamePage.classList.add("display-none");
    socket.on("SET_ALL_ROOMS", setRooms);
  }
}

async function getRandomText(id) {
  const res = await fetch(`/game/texts/${id}`);
  return res.text();
}

function updateGameContainer(room, counter = 10) {
  room.users.forEach((user) => {
    if (user.username === username && user.ready === true) {
      const readyStatus = currentRoom.users.filter(
        (user) => user.ready === false
      );
      if (readyStatus.length > 0) {
      } else {
        exitButton.classList.add("display-none");
        readyBtn.classList.add("display-none");
        timer.classList.remove("display-none");
      }
      timer.textContent = counter;
      if (counter === 0) {
        timer.classList.add("display-none");
        textContainer.classList.remove("display-none");
        gameTimer.classList.remove("display-none");
        socket.emit("GAME_START", currentRoom.name);
        keyDownProgress(room.name);
      }
    }
  });
}

function keyDownProgress(nameRoom) {
  socket.on("UPDATE_SECONDS_FOR_GAME", (timer) => {
    gameTimerSeconds.textContent = timer;
  });
  const span = document.querySelectorAll("#text-container > span");

  if (span.length > 0) {
    let numArr = 0;
    const onePresent = 100 / span.length;
    let progress = 0.1;
    let error = 0;
    const newRoom = currentRoom.users.map((user) => {
      if (user.username == username) {
        return { ...user, progress, error };
      }
      return user;
    });
    currentRoom.users = newRoom;

    document.addEventListener("keydown", (e) => {
      if (e.key == span[numArr].textContent) {
        span[numArr].style.backgroundColor = "green";
        numArr++;
        progress += onePresent;

        const newRoom = currentRoom.users.map((user) => {
          if (user.username == username) {
            return { ...user, progress, error };
          }
          return user;
        });
        currentRoom.users = newRoom;

        if (numArr < span.length) {
          span[numArr].style.borderBottom = "1px solid green";
        }

        socket.emit("PROGRESS", { progress, nameRoom });
      } else {
        if (e.key !== "Shift") {
          span[numArr].style.backgroundColor = "red";
          error++;

          const newRoom = currentRoom.users.map((user) => {
            if (user.username == username) {
              return { ...user, progress, error };
            }
            return user;
          });
          currentRoom.users = newRoom;
        }
      }
    });
    document.addEventListener("keyup", (e) => {
      if (numArr <= span.length) {
        if (numArr < span.length) {
          span[numArr].style.backgroundColor = "white";
          span[numArr - 1].style.borderBottom = "none";
        }
      }
    });
  }
}

function joinRoom(nameRoom) {
  socket.emit("JOIN", nameRoom);
}
