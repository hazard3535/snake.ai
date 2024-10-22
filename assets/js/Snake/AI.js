import * as tf from "@tensorflow/tfjs";

class DQNAgent {
  constructor(
    actions,
    stateSize,
    alpha = 0.001,
    gamma = 0.9,
    epsilon = 0.2,
    epsilonDecay = 0.995,
    minEpsilon = 0.01
  ) {
    this.actions = actions;
    this.stateSize = stateSize;
    this.alpha = alpha;
    this.gamma = gamma;
    this.epsilon = epsilon;
    this.epsilonDecay = epsilonDecay;
    this.minEpsilon = minEpsilon;
    this.memory = [];
    this.batchSize = 6;
  }
  async createModel({ modelName, isTraining, isUserControl, state }) {
    this.isTraining = isTraining;
    if (isTraining) {
      const { success } = await fetch("http://localhost:3001/create-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state }),
      }).then((res) => res.json());
      return success;
    }

    return (this.model = await this.loadModelFromFiles(modelName));
  }

  async predict(state) {
    const input = tf.tensor2d([state], [1, this.stateSize]);
    const prediction = this.model.predict(input);
    return prediction.dataSync();
  }

  async act(state) {
    if (this.isTraining) {
      const { action } = await fetch("http://localhost:3001/act", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state }),
      }).then((res) => res.json());
      return action;
    } else {
      if (Math.random() < this.epsilon) {
        return this.actions[Math.floor(Math.random() * this.actions.length)];
      } else {
        const qValues = await this.predict(state);
        const maxQValue = Math.max(...qValues);
        return this.actions[qValues.indexOf(maxQValue)];
      }
    }
  }

  async train(state, action, reward, nextState, done) {
    await fetch("http://localhost:3001/train", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state, action, reward, nextState, done }),
    });
  }

  async saveModel(path) {
    await this.model.save(path);
  }

  async loadModel(path) {
    this.model = await tf.loadLayersModel(path);
  }
  async saveModelToFile({ round, maxScore, gridSize }) {
    const { success } = await fetch("http://localhost:3001/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ round, maxScore, gridSize }),
    }).then((res) => res.json());
    return success;
  }
  async loadModelFromFiles(modelName) {
    const modelJsonPath = `assets/models/${modelName}/model.json`;
    const modelWeightsPath = `assets/models/${modelName}/weights.bin`;
    console.log("loadModelFromFiles", modelJsonPath, modelWeightsPath);

    return await tf.loadLayersModel(
      tf.io.browserHTTPRequest(modelJsonPath, modelWeightsPath)
    );
  }
}

export default DQNAgent;
