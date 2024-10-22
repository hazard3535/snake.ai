import { rnd } from "../functions.js";

import DQNAgent from "./AI.js";
import ApexCharts from "apexcharts";

export default class Snake {
  directions = ["up", "down", "left", "right"];
  constructor({ gridSize = 5, pixelSize = 40 } = {}) {
    this.pixelSize = pixelSize;
    this.gridSize = gridSize;
    this.rectSize = this.gridSize * this.pixelSize;
    this.round = 0;
    this.maxScore = 0;
    //
    this.resetGame();
    this.agent = new DQNAgent(this.directions, this.getState().length);

    this.init();
  }
  async init() {
    this.canvas = document.getElementById("canvas");
    this.ctx = canvas.getContext("2d");
    this.scoreItem = document.getElementById("score");
    this.maxScoreItem = document.getElementById("maxScore");
    this.levelItem = document.getElementById("level");
    this.gameOverItem = document.getElementById("gameOver");
    this.roundItem = document.getElementById("round");
    this.chartElem = document.getElementById("chart");
    this.startButton = document.getElementById("startButton");
    this.selectModel = document.getElementById("selectModel");

    // change
    this.changeModelFunc = this.changeModel.bind(this);
    this.selectModel.addEventListener("change", this.changeModelFunc);
    this.changeModel()

    // start
    this.startFunc = this.start.bind(this);
    this.startButton.addEventListener("click", this.startFunc);

    // resize
    this.resizeFunc = this.resize.bind(this);
    window.addEventListener("resize", this.resizeFunc);
    this.resize();

    // keydown
    this.changeDirectionFunc = this.changeDirection.bind(this);
    document.addEventListener("keydown", this.changeDirectionFunc);

    this.draw(); // this.render();
  }

  async start() {
    this.resetGame(true); // Check for collisions
    this.startButton.style.display = "none";
    this.modelName = this.selectModel.value;

    this.isUserControl = this.modelName === "user";
    this.isTraining = this.modelName === "learn";

    const state = this.getState();
    await this.agent.createModel({
      modelName: this.modelName,
      isTraining: this.isTraining,
      isUserControl: this.isUserControl,
      state
    });

    this.render();
    if (this.isUserControl) {
      this.renderInterval = setInterval(
        this.render.bind(this),
        1000 - this.level * 50
      );
    }

    if (this.isTraining) this.initChart();
  }

  update() {
    this.reward = false;
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

    this.snake.unshift(head);
    const done = this.isGameOver();

    // Check for food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.food = this.getRandomFoodPosition();
      this.score++;

      if (this.score > this.maxScore) this.maxScore = this.score;
      this.reward = true;
    } else if (!done) {
      this.snake.pop();
    }

    if (this.scoreItem) this.scoreItem.textContent = this.score;
    if (this.maxScoreItem) this.maxScoreItem.textContent = this.maxScore;
    if (this.levelItem) this.levelItem.textContent = this.level;
    if (this.roundItem) this.roundItem.textContent = this.round;
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
  step(action = this.direction) {
    // Выполняет действие и возвращает новое состояние, награду и флаг завершения игры
    this.direction = action;
    this.update();
    const done = this.isGameOver();
    const reward = this.getReward();
    return { state: this.getState(), reward, done };
  }
  async render() {
    const state = this.getState();

    const action = this.isUserControl ? undefined : await this.agent.act(state);
    const { state: nextState, reward, done } = this.step(action);

    // console.log("render", {
    //   // snake: this.snake,
    //   // food: this.food,
    //   action,
    //   direction: this.direction,
    //   reward: reward,
    // });

    if (this.isTraining) {
      await this.agent.train(state, action, reward, nextState, done);
    }

    if (done) {
      this.updateChart();
      this.gameOverItem.style.display = "block";
      this.resetGame(); // Check for collisions
      if (this.isUserControl) return;
      return this.render();
    }
    this.gameOverItem.style.display = "none";
    this.draw();

    if (reward) {
      console.log({
        reward,
        round: this.round,
        score: this.score,
      });
    }
    if (!this.isUserControl && this.isTraining) {
      if (this.round < document.getElementById("numberRounds").value) {
        this.render();
      } else {
        console.log("Training is complete");
        this.startButton.style.display = "block";
        this.saveModelToFile()
      }
    }
    if (!this.isUserControl && !this.isTraining) {
      requestAnimationFrame(this.render.bind(this));
    }
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
  resetGame(reset = false) {
    this.round++;
    this.level = 10;
    this.score = 0;
    this.direction = this.directions[rnd(0, this.directions.length - 1)];
    this.snake = [
      { x: Math.floor(this.gridSize / 2), y: Math.floor(this.gridSize / 2) },
    ];
    this.food = this.getRandomFoodPosition();
    if (reset) {
      this.round = 0;
      this.maxScore = 0;
      this.score = 0;
    }
  }
  getState() {
    const head = this.snake[0];
    const food = this.food;
    const direction = this.direction;

    // Расстояние до еды
    const distanceToFoodX = food.x - head.x;
    const distanceToFoodY = food.y - head.y;

    // Наличие препятствий (стены и тело змейки) в непосредственной близости от головы
    const isWallUp = head.y === 0;
    const isWallDown = head.y === this.gridSize - 1;
    const isWallLeft = head.x === 0;
    const isWallRight = head.x === this.gridSize - 1;

    const isBodyUp = this.snake.some(
      (segment) => segment.x === head.x && segment.y === head.y - 1
    );
    const isBodyDown = this.snake.some(
      (segment) => segment.x === head.x && segment.y === head.y + 1
    );
    const isBodyLeft = this.snake.some(
      (segment) => segment.x === head.x - 1 && segment.y === head.y
    );
    const isBodyRight = this.snake.some(
      (segment) => segment.x === head.x + 1 && segment.y === head.y
    );

    return [
      head.x,
      head.y,
      food.x,
      food.y,
      distanceToFoodX,
      distanceToFoodY,
      direction === "up" ? 1 : 0,
      direction === "down" ? 1 : 0,
      direction === "left" ? 1 : 0,
      direction === "right" ? 1 : 0,
      isWallUp ? 1 : 0,
      isWallDown ? 1 : 0,
      isWallLeft ? 1 : 0,
      isWallRight ? 1 : 0,
      isBodyUp ? 1 : 0,
      isBodyDown ? 1 : 0,
      isBodyLeft ? 1 : 0,
      isBodyRight ? 1 : 0,
    ];
  }
  isGameOver(head = this.snake[0]) {
    return (
      head.x < 0 ||
      head.x >= this.gridSize ||
      head.y < 0 ||
      head.y >= this.gridSize ||
      this.snake
        .slice(1)
        .some((segment) => segment.x === head.x && segment.y === head.y)
    );
  }
  getReward() {
    // Возвращает награду за текущее состояние
    if (this.isGameOver()) return -1;
    return this.reward ? 1 : 0;
  }
  resize() {
    this.canvas.width = this.rectSize;
    this.canvas.height = this.rectSize;
    this.canvas.style.width = this.rectSize + "px";
    this.canvas.style.height = this.rectSize + "px";

    document.documentElement.style.setProperty(
      "--canvasWidth",
      this.rectSize + "px"
    );
  }

  initChart() {
    this.chartSeries = {
      name: "Max Score",
      data: [],
    };
    const options = {
      series: [this.chartSeries],
      xaxis: {
        type: "numeric",
      },
      noData: {
        text: "Loading...",
      },
      chart: {
        id: "realtime",
        height: 350,
        type: "line",
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
        animations: {
          enabled: true,
          easing: "linear",
          dynamicAnimation: {
            speed: 250,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "straight",
      },
    };

    this.chart = new ApexCharts(this.chartElem, options);
    this.chart.render();
  }
  updateChart() {
    if (!this.chart) return;
    this.chartSeries.data.push({ x: this.round, y: this.maxScore });
    this.chart.updateSeries([this.chartSeries]);
  }
  async saveModelToFile() {
    await this.agent.saveModelToFile({
      round: this.round,
      maxScore: this.maxScore,
      gridSize: this.gridSize,
    });
  }
  changeModel(value) {
    console.log("changeModel", this.selectModel.value);

    document.getElementById("learnParams").style.display =
      this.selectModel.value === "learn" ? "block" : "none";
    this.destroy();
    // this.resetGame(true);
    // this.start();
  }
  destroy() {
    console.log("destroy");

    // window.removeEventListener("resize", this.resizeFunc);
    // document.removeEventListener("keydown", this.changeDirectionFunc);
    // this.selectModel.removeEventListener("change", this.changeModelFunc);
    // this.resizeFunc = null;
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    clearInterval(this.renderInterval);

    this.round = 0;
    this.maxScore = 0;
    this.score = 0;
  }
}
