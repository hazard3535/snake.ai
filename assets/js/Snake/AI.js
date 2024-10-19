import * as tf from '@tensorflow/tfjs';

class DQNAgent {
  constructor(actions, alpha = 0.001, gamma = 0.9, epsilon = 0.1) {
    this.actions = actions;
    this.stateSize = actions.length;
    this.alpha = alpha;
    this.gamma = gamma;
    this.epsilon = epsilon;
    this.model = this.createModel();
  }

  createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 24, inputShape: [this.stateSize], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
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

  async train(state, action, reward, nextState, done) {
    const target = reward + (done ? 0 : this.gamma * Math.max(...await this.predict(nextState)));
    const targetQValues = await this.predict(state);
    targetQValues[this.actions.indexOf(action)] = target;

    const input = tf.tensor2d([state], [1, this.stateSize]);
    const targetTensor = tf.tensor2d([targetQValues], [1, this.actions.length]);

    await this.model.fit(input, targetTensor, { epochs: 1 });
  }
}

export default DQNAgent;