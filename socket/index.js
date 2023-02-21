"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const config = __importStar(require("./config"));
const data_1 = require("../data");
exports.default = (io) => {
    let sockets = [];
    let rooms = [];
    const getRoomByRoomName = (roomName) => {
        const room = rooms.find(({ name }) => name === roomName);
        if (!room) {
            return null;
        }
        return room;
    };
    const deleteUserFromRoom = (username, roomName) => rooms.map((room) => room.name !== roomName
        ? room
        : Object.assign(Object.assign({}, room), { users: room.users.filter((user) => user.username !== username) }));
    const deleteRoom = (roomName) => rooms.filter((room) => room.name !== roomName);
    const setStatusGame = (roomName, status) => rooms.map((room) => room.name !== roomName
        ? room
        : Object.assign(Object.assign({}, room), { gameStart: status }));
    const deleteUserFromRooms = (username) => rooms.map((room) => (Object.assign(Object.assign({}, room), { users: room.users.filter((user) => user.username !== username) })));
    const getUsersRoom = (username) => {
        const room = rooms.find(({ users }) => users.some((user) => user.username === username));
        if (!room) {
            return null;
        }
        return room;
    };
    const isReady = (isReady, roomName, username) => {
        return rooms.map((room) => room.name !== roomName
            ? room
            : Object.assign(Object.assign({}, room), { users: room.users.map((user) => user.username === username
                    ? Object.assign(Object.assign({}, user), { ready: isReady, error: 0 }) : user) }));
    };
    const setProgress = (progress, roomName, username) => {
        return rooms.map((room) => room.name !== roomName
            ? room
            : Object.assign(Object.assign({}, room), { users: room.users.map((user) => user.username === username
                    ? Object.assign(Object.assign({}, user), { progress, error: 0 }) : user) }));
    };
    const randomInteger = (min, max) => {
        let rand = min + Math.random() * (max + 1 - min);
        return Math.floor(rand);
    };
    let randomId = [];
    io.on("connection", (socket) => {
        const username = socket.handshake.query.username;
        if (username !== "null") {
            sockets.push(username);
        }
        socket.emit("SET_ALL_ROOMS", rooms);
        socket.on("ROOM", (roomName) => {
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
        socket.on("JOIN", (roomName) => {
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
                    return Object.assign(Object.assign({}, room), { users: [
                            ...room.users,
                            { username, ready: false, progress: 0, error: 0 },
                        ] });
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
        socket.on("EXIT_FROM_ROOM", (roomName) => {
            socket.leave(roomName);
            rooms = deleteUserFromRoom(username, roomName);
            const room = getRoomByRoomName(roomName);
            if (!room) {
                return;
            }
            socket.broadcast.emit("UPDATE_JOIN", room);
            socket.emit("EXIT_DONE");
            io.emit("UPDATE_ROOMS", {
                name: roomName,
                numberOfUsers: room.users.length,
            });
            if (room.users.length <= 0) {
                console.log("ok");
                rooms = setStatusGame(roomName, false);
                rooms = deleteRoom(roomName);
                io.emit('DELETE_ROOM');
            }
            console.log(room.users.length);
        });
        socket.on("IS_READY", ({ ready, nameRoom }) => {
            const newRoom = isReady(ready, nameRoom, username);
            rooms = newRoom;
            const room = getRoomByRoomName(nameRoom);
            io.emit("UPDATE_JOIN", room);
        });
        socket.on("GET_TEXT_BY_ID", () => {
            const randomNum = randomInteger(1, data_1.texts.length);
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
            }
            else {
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
        socket.on("GAME_START", (nameRoom) => {
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
        socket.on("PROGRESS", ({ progress, nameRoom }) => {
            const newRoom = setProgress(progress, nameRoom, username);
            rooms = newRoom;
            const room = getRoomByRoomName(nameRoom);
            io.emit("UPDATE_JOIN_PROGRESS", room);
        });
        socket.on("disconnect", () => {
            const newUserList = sockets.filter((el) => el !== username);
            sockets = newUserList;
            const room = getUsersRoom(username);
            rooms = deleteUserFromRooms(username);
            if (!room) {
                return;
            }
            const roomTwo = getRoomByRoomName(room === null || room === void 0 ? void 0 : room.name);
            if (!roomTwo) {
                return;
            }
            console.log(room);
            if (roomTwo.users.length === 0) {
                rooms = setStatusGame(room === null || room === void 0 ? void 0 : room.name, false);
            }
            const updatedRoom = getRoomByRoomName(room.name);
            console.log(room);
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
