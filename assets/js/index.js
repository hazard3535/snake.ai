import "../styles/main.scss";
import Snake from "./Snake";
const game = new Snake({
  gridSize: 10,
  pixelSize: 60,
});
window.game = game; 