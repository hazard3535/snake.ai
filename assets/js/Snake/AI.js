import * as tf from '@tensorflow/tfjs';

class DQNAgent {
  constructor(actions, stateSize, alpha = 0.001, gamma = 0.9, epsilon = 0.1, epsilonDecay = 0.995, minEpsilon = 0.01) {
    this.actions = actions;
    this.stateSize = stateSize;
    this.alpha = alpha;
    this.gamma = gamma;
    this.epsilon = epsilon;
    this.epsilonDecay = epsilonDecay;
    this.minEpsilon = minEpsilon;
    this.model = this.createModel();
    this.memory = [];
    this.batchSize = 6;
  }

  createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, inputShape: [this.stateSize], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: this.actions.length, activation: 'linear' }));
    model.compile({ optimizer: tf.train.adam(this.alpha), loss: 'meanSquaredError' });
    return model;
  }

  async predict(state) {
    const input = tf.tensor2d([state], [1, this.stateSize]);
    const prediction = this.model.predict(input);
    return prediction.dataSync();
  }

  async act(state) {
    if (Math.random() < this.epsilon) {
      return this.actions[Math.floor(Math.random() * this.actions.length)];
    } else {
      const qValues = await this.predict(state);
      const maxQValue = Math.max(...qValues);
      return this.actions[qValues.indexOf(maxQValue)];
    }
  }

  remember(state, action, reward, nextState, done) {
    this.memory.push({ state, action, reward, nextState, done });
    if (this.memory.length > 10000) {
      this.memory.shift();
    }
  }

  async replay() {
    if (this.memory.length < this.batchSize) return;

    const batch = [];
    for (let i = 0; i < this.batchSize; i++) {
      batch.push(this.memory[Math.floor(Math.random() * this.memory.length)]);
    }

    for (const { state, action, reward, nextState, done } of batch) {
      const target = reward + (done ? 0 : this.gamma * Math.max(...await this.predict(nextState)));
      const targetQValues = await this.predict(state);
      targetQValues[this.actions.indexOf(action)] = target;

      const input = tf.tensor2d([state], [1, this.stateSize]);
      const targetTensor = tf.tensor2d([targetQValues], [1, this.actions.length]);

      await this.model.fit(input, targetTensor, { epochs: 1 });
    }

    if (this.epsilon > this.minEpsilon) {
      this.epsilon *= this.epsilonDecay;
    }
  }

  async train(state, action, reward, nextState, done) {
    this.remember(state, action, reward, nextState, done);
    await this.replay();
  }
}

export default DQNAgent;