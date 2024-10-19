import "../styles/main.scss";
import Snake from "./Snake";
const game = new Snake({
  gridSize: 5,
  pixelSize: 100,
});
window.game = game; 