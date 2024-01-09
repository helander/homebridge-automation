import {Logger} from 'homebridge';
import {AccessoryData, CharacteristicValue} from './accessory';

export abstract class BaseBridge {
  log: Logger;
  accessories: AccessoryData[] = [];
  constructor(log: Logger) {
    this.log = log;
  }

  getAccessoryCharacteristic(accessoryName: string): CharacteristicValue[] {
    return this.accessories[accessoryName].values;
  }

  abstract setAccessoryCharacteristic(accessoryName: string, characteristicType: string, value: number);
  abstract start(): Promise<void>;
}

export class NoBridge extends BaseBridge {
  constructor(log: Logger) {
    super(log);
  }

  async setAccessoryCharacteristic(accessoryName: string, characteristicType: string, value: number): Promise<void> {
    this.log.debug('NoBridge dummy setAccessoryCharacteristic method', accessoryName, characteristicType, value);
  }

  async start(): Promise<void> {
    return;
  }

  addAccessory(accessory: AccessoryData): void {
    this.accessories[accessory.name] = accessory;
  }
}

