import { createSensor } from './lib/create';
import { install } from './lib/plugin';
import DaSDK, { DA_OPTIONS } from './lib/DaSDK';

const init = (options: DA_OPTIONS) => {
  return new DaSDK(options);
};

const sensors = createSensor('origin-sensors');

export default { init, install, createSensor, sensors };

export { init, sensors, createSensor };
