import { Server } from "socket.io";
import * as config from "./config";
import { texts } from "../data";

interface IIsReady {
  ready: boolean;
  nameRoom: string;
}

interface IUser {
  username: string;
  ready: boolean;
  progress: number;
  error: number;
}

interface IRoom {
  name: string;
  gameStart: boolean;
  users: IUser[];
}

export default (io: Server) => {
  let sockets: string[] = [];
  let rooms: IRoom[] = [];

  const getRoomByRoomName = (roomName: string): IRoom | null => {
    const room = rooms.find(({ name }) => name === roomName);
    if (!room) {
      return null;
    }
    return room;
  };
  const deleteUserFromRoom = (username: string, roomName: string) =>
    rooms.map((room) =>
      room.name !== roomName
        ? room
        : {
            ...room,
            users: room.users.filter((user) => user.username !== username),
          }
    );

  const setStatusGame = (roomName: string, status: boolean) =>
    rooms.map((room) =>
      room.name !== roomName
        ? room
        : {
            ...room,
            gameStart: status,
          }
    );

  const deleteUserFromRooms = (username: string) =>
    rooms.map((room) => ({
      ...room,
      users: room.users.filter((user) => user.username !== username),
    }));

  const getUsersRoom = (username: string): IRoom | null => {
    const room = rooms.find(({ users }) =>
      users.some((user) => user.username === username)
    );
    if (!room) {
      return null;
    }
    return room;
  };

  const isReady = (
    isReady: boolean,
    roomName: string,
    username: string
  ): IRoom[] => {
    return rooms.map((room) =>
      room.name !== roomName
        ? room
        : {
            ...room,
            users: room.users.map((user) =>
              user.username === username
                ? { ...user, ready: isReady, error: 0 }
                : user
            ),
          }
    );
  };
  const setProgress = (
    progress: number,
    roomName: string,
    username: string
  ): IRoom[] => {
    return rooms.map((room) =>
      room.name !== roomName
        ? room
        : {
            ...room,
            users: room.users.map((user) =>
              user.username === username
                ? { ...user, progress, error: 0 }
                : user
            ),
          }
    );
  };
  const randomInteger = (min: number, max: number): number => {
    let rand: number = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
  };
  let randomId: number[] = [];

  io.on("connection", (socket) => {
    const username = socket.handshake.query.username as string;
    if (username !== "null") {
      sockets.push(username);
    }
    socket.emit("SET_ALL_ROOMS", rooms);

    socket.on("ROOM", (roomName: string) => {
      if (rooms.some((el) => el.name === roomName)) {
        socket.emit("error", true);
        return;
      }
      socket.join(roomName);
      const room = {
        name: roomName,
        gameStart: false,
        users: [{ username, ready: false, progress: 0, error: 0 }],
      };

      rooms.push(room);
      socket.emit("JOIN_DONE", room);
      io.emit("SEND_ROOM", room);
    });

    socket.on("JOIN", (roomName: string) => {
      const roomJoin = getRoomByRoomName(roomName);
      if (!roomJoin) {
        return;
      }
      if (roomJoin.users.length >= config.MAXIMUM_USERS_FOR_ONE_ROOM) {
        socket.emit("MAX_JOIN_LIMIT", "Maximum 5 players");
        return;
      }

      socket.join(roomName);

      const gameStatus = rooms.map((room) => {
        if (room.name === roomName) {
          return room.gameStart;
        }
      });
      if (gameStatus[0]) {
        socket.emit("ERROR_ROOM_JOIN", "The game has already started");
        return;
      }

      const newRooms = rooms.map((room) => {
        if (room.name === roomName) {
          return {
            ...room,
            users: [
              ...room.users,
              { username, ready: false, progress: 0, error: 0 },
            ],
          };
        }
        return room;
      });
      if (newRooms === undefined) {
        return;
      }
      rooms = newRooms;

      const room = getRoomByRoomName(roomName);
      if (!room) {
        return;
      }
      io.in(roomName).emit("JOIN_DONE", room);

      io.emit("UPDATE_ROOMS", {
        name: roomName,
        numberOfUsers: room.users.length,
      });
      io.in(roomName).emit("test", "hello");
    });

    socket.on("EXIT_FROM_ROOM", (roomName: string) => {
      socket.leave(roomName);
      rooms = deleteUserFromRoom(username, roomName);
      const room = getRoomByRoomName(roomName);
      if (!room) {
        return;
      }
      if (room.users.length <= 0) {
        console.log("ok");
        rooms = setStatusGame(roomName, false);
      }

      socket.emit("EXIT_DONE");
      socket.broadcast.emit("UPDATE_JOIN", room);
      io.emit("UPDATE_ROOMS", {
        name: roomName,
        numberOfUsers: room.users.length,
      });
      console.log(room.users.length);
    });

    socket.on("IS_READY", ({ ready, nameRoom }: IIsReady) => {
      const newRoom = isReady(ready, nameRoom, username);
      rooms = newRoom;
      const room = getRoomByRoomName(nameRoom);
      io.emit("UPDATE_JOIN", room);
    });
    socket.on("GET_TEXT_BY_ID", () => {
      const randomNum = randomInteger(1, texts.length);
      randomId.push(randomNum);
      socket.emit("SET_TEXT_BY_ID", randomId[0]);
    });

    socket.on("TIMER_START", (nameRoom) => {
      const room = getRoomByRoomName(nameRoom);
      if (!room) {
        return;
      }
      if (room.users.length === 0) {
        console.log("ok");
        rooms = setStatusGame(nameRoom, false);
      } else {
        rooms = setStatusGame(nameRoom, true);
      }
      console.log("render");
      let numTimer = config.SECONDS_TIMER_BEFORE_START_GAME;
      socket.emit("TIMER_DEC", numTimer);
      const timeout = setInterval(() => {
        numTimer -= 1;
        socket.emit("TIMER_DEC", numTimer);
        if (numTimer <= 0) {
          clearInterval(timeout);
        }
      }, 1000);
    });

    socket.on("GAME_START", (nameRoom: string) => {
      randomId.length = 0;
      let numTimer = config.SECONDS_FOR_GAME;
      const timeout = setInterval(() => {
        numTimer -= 1;
        socket.emit("UPDATE_SECONDS_FOR_GAME", numTimer);
        if (numTimer <= 0) {
          clearInterval(timeout);
          const newRoom = isReady(false, nameRoom, username);
          rooms = newRoom;
          const room = getRoomByRoomName(nameRoom);
          socket.emit("END_GAME", room);
        }
      }, 1000);
    });

    socket.on(
      "PROGRESS",
      ({ progress, nameRoom }: { progress: number; nameRoom: string }) => {
        const newRoom = setProgress(progress, nameRoom, username);
        rooms = newRoom;
        const room = getRoomByRoomName(nameRoom);
        io.emit("UPDATE_JOIN_PROGRESS", room);
      }
    );

    socket.on("disconnect", () => {
      const newUserList = sockets.filter((el) => el !== username);
      sockets = newUserList;
      const room = getUsersRoom(username);
      rooms = deleteUserFromRooms(username);

      if (!room) {
        return;
      }
      const roomTwo = getRoomByRoomName(room?.name);
      if (!roomTwo) {
        return;
      }
      if (roomTwo.users.length === 0) {
        rooms = setStatusGame(room?.name, false);
      }

      const updatedRoom = getRoomByRoomName(room.name);

      if (!updatedRoom) {
        return;
      }

      io.emit("UPDATE_ROOMS", {
        name: updatedRoom.name,
        numberOfUsers: updatedRoom.users.length,
      });
    });
  });

  io.of("/login").on("connection", (socket) => {
    socket.emit("DATA_SOCKETS", sockets);
  });
};
