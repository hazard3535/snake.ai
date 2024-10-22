import express from "express";
// import tf from "@tensorflow/tfjs-node";
import tf from "@tensorflow/tfjs-node-gpu";
import cors from "cors";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let model;
const actions = ["up", "down", "left", "right"];
let stateSize = 18;
const alpha = 0.001;
const gamma = 0.9;
let epsilon = 0.2;
const epsilonDecay = 0.995;
const minEpsilon = 0.01;
const batchSize = 6;
let memory = [];

function createModel({ state }) {
  if (state) stateSize = state.length;
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 64, inputShape: [stateSize], activation: "relu" })
  );
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dense({ units: actions.length, activation: "linear" }));
  model.compile({ optimizer: tf.train.adam(alpha), loss: "meanSquaredError" });
  return model;
}

async function predict(state) {
  const input = tf.tensor2d([state], [1, stateSize]);
  const prediction = model.predict(input);
  return prediction.dataSync();
}

async function replay() {
  if (memory.length < batchSize) return;

  const batch = [];
  for (let i = 0; i < batchSize; i++) {
    batch.push(memory[Math.floor(Math.random() * memory.length)]);
  }

  for (const { state, action, reward, nextState, done } of batch) {
    const target =
      reward + (done ? 0 : gamma * Math.max(...(await predict(nextState))));
    const targetQValues = await predict(state);
    targetQValues[actions.indexOf(action)] = target;

    const input = tf.tensor2d([state], [1, stateSize]);
    const targetTensor = tf.tensor2d([targetQValues], [1, actions.length]);

    await model.fit(input, targetTensor, { epochs: 1 });
  }

  if (epsilon > minEpsilon) {
    epsilon *= epsilonDecay;
  }
}

async function act(state) {
  if (Math.random() < epsilon) {
    return actions[Math.floor(Math.random() * actions.length)];
  } else {
    const qValues = await predict(state);
    const maxQValue = Math.max(...qValues);
    return actions[qValues.indexOf(maxQValue)];
  }
}

app.post("/create-model", async (req, res) => {
  model = createModel(req.body);
  res.json({ success: true, message: "Model created" });
});

app.post("/act", async (req, res) => {
  const { state } = req.body;
  const action = await act(state);
  res.json({ success: true, action });
});
app.post("/train", async (req, res) => {
  const { state, action, reward, nextState, done } = req.body;
  memory.push({ state, action, reward, nextState, done });
  if (memory.length > 10000) {
    memory.shift();
  }
  await replay();
  res.send("Model trained");
});

app.post("/save", async (req, res) => {
  const { round, maxScore, gridSize } = req.body;

  const pathFile = path.join(
    __dirname,
    "assets/models",
    `model-${gridSize + 'x' + gridSize}-grid-${round}-rounds-${maxScore}-score`
  );
  console.log("save", { round, maxScore });

  await model.save(`file://${pathFile}`);
  res.json({ success: true, path: pathFile, message: "Model saved" });
});

app.get("/load", async (req, res) => {
  const { path } = req.query;
  model = await tf.loadLayersModel(`file://${path}/model.json`);
  res.send("Model loaded");
});

app.listen(3001, () => {
  console.log("Server is running on port 3001!");
});
