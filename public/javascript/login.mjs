const username = sessionStorage.getItem("username");
import { showMessageModal } from "./views/modal.mjs";
if (username) {
  window.location.replace("/game");
}
const submitButton = document.getElementById("submit-button");
const input = document.getElementById("username-input");

const getInputValue = () => input.value;

const onClickSubmitButton = () => {
  const inputValue = getInputValue();
  if (!inputValue) {
    return;
  }
  const socket = io("http://localhost:3002/login");
  socket.on("DATA_SOCKETS", dataSockets);
  function dataSockets(data) {
    if (data.some((socket) => inputValue === socket)) {
      showMessageModal({ message: "The username exists" });
      return;
    }
    sessionStorage.setItem("username", inputValue);
    window.location.replace("/game");
  }
};

const onKeyUp = (ev) => {
  const enterKeyCode = 13;
  if (ev.keyCode === enterKeyCode) {
    submitButton.click();
  }
};

submitButton.addEventListener("click", onClickSubmitButton);
window.addEventListener("keyup", onKeyUp);
