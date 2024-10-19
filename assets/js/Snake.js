import { rnd } from "./functions.js";
export default class Snake {
  directions = ["up", "down", "left", "right"];
  constructor({ gridSize = 10, pixelSize = 40 } = {}) {
    this.pixelSize = pixelSize;
    this.gridSize = gridSize;
    this.rectSize = this.gridSize * this.pixelSize;
    //
    this.resetGame();
    this.init();
  }
  init() {
    this.canvas = document.getElementById("canvas");
    this.ctx = canvas.getContext("2d");
    this.scoreItem = document.getElementById("score");
    this.levelItem = document.getElementById("level");

    // resize
    this.resizeFunc = this.resize.bind(this);
    window.addEventListener("resize", this.resizeFunc);
    this.resize();

    // keydown
    this.changeDirectionFunc = this.changeDirection.bind(this);
    document.addEventListener("keydown", this.changeDirectionFunc);

    this.render();
    setInterval(this.render.bind(this), 1000 - this.level * 50);
  }

  update() {
    const head = (() => {
      if (this.direction === "up") {
        return { x: this.snake[0].x, y: this.snake[0].y - 1 };
      } else if (this.direction === "down") {
        return { x: this.snake[0].x, y: this.snake[0].y + 1 };
      } else if (this.direction === "left") {
        return { x: this.snake[0].x - 1, y: this.snake[0].y };
      } else if (this.direction === "right") {
        return { x: this.snake[0].x + 1, y: this.snake[0].y };
      }
    })();

    // Check for collisions with walls
    if (
      head.x < 0 ||
      head.x >= this.gridSize ||
      head.y < 0 ||
      head.y >= this.gridSize
    ) {
      this.resetGame();
      return;
    }

    // Check for collisions with itself
    for (let segment of this.snake) {
      if (head.x === segment.x && head.y === segment.y) {
        this.resetGame();
        return;
      }
    }

    this.snake.unshift(head);

    // Check for food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.food = this.getRandomFoodPosition();
      this.score++
    } else {
      this.snake.pop();
    }

    this.scoreItem.textContent = this.score;
    this.levelItem.textContent = this.level;

  }
  drawGrid() {
    const size = this.rectSize;
    const x = this.canvas.width / 2 - size / 2;
    const y = this.canvas.height / 2 - size / 2;

    const rows = this.rectSize / this.pixelSize;
    const cols = this.rectSize / this.pixelSize;

    this.ctx.strokeStyle = "lightgrey"; // Цвет границ ячеек
    this.ctx.lineWidth = 1; // Толщина границ ячеек

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const newX = x + col * this.pixelSize;
        const newY = y + row * this.pixelSize;
        this.ctx.strokeRect(newX, newY, this.pixelSize, this.pixelSize);
      }
    }
  }
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake
    this.snake.forEach((segment, index) => {
      this.ctx.fillStyle = !index ? "#64c064" : "#468646"; // color head
      const left = this.canvas.width / 2 - this.rectSize / 2;
      const top = this.canvas.height / 2 - this.rectSize / 2;
      const x = left + this.pixelSize * segment.x;
      const y = top + this.pixelSize * segment.y;

      this.ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
    });

    // Draw food
    this.ctx.fillStyle = "#a72c20";
    const left = this.canvas.width / 2 - this.rectSize / 2;
    const top = this.canvas.height / 2 - this.rectSize / 2;
    const x = left + this.pixelSize * this.food.x;
    const y = top + this.pixelSize * this.food.y;
    this.ctx.fillRect(x, y, this.pixelSize, this.pixelSize);

        // main rect
        this.drawGrid();
  }
  getRandomFoodPosition() {
    let x = rnd(0, this.gridSize - 1);
    let y = rnd(0, this.gridSize - 1);

    while (this.snake.some((segment) => segment.x === x && segment.y === y)) {
      x = rnd(0, this.gridSize - 1);
      y = rnd(0, this.gridSize - 1);
    }

    return { x, y };
  }
  render() {
    this.update();
    this.draw();
    console.log("render", {
      // snake: this.snake,
      // food: this.food,
      direction: this.direction,
    });
  }
  changeDirection(event) {
    switch (event.key) {
      case "ArrowUp":
        this.direction = "up";
        break;
      case "ArrowDown":
        this.direction = "down";
        break;
      case "ArrowLeft":
        this.direction = "left";
        break;
      case "ArrowRight":
        this.direction = "right";
        break;
    }
  }
  resetGame() {
    this.level = 10;
    this.score = 0;
    this.direction = this.directions[rnd(0, this.directions.length - 1)];
    this.snake = [
      { x: Math.floor(this.gridSize / 2), y: Math.floor(this.gridSize / 2) },
    ];
    this.food = this.getRandomFoodPosition();
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  destroy() {
    window.removeEventListener("resize", this.resizeFunc);
    document.removeEventListener("keydown", this.changeDirectionFunc);
    this.resizeFunc = null;
  }
}
