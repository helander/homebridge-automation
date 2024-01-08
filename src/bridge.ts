import axios from 'axios';
import {Logger} from 'homebridge';
import {AccessoryData, CharacteristicValue} from './accessory';
import {ApiBridgeConfig, HapBridgeConfig} from './config';

//type Value = string | number;
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


//type X = string | number;
type AccessoryAsItComesFromApi = {
  accessoryInformation: {Name: string};
  values: (string|number)[];
  uniqueId: string;
};

type ApiCharacteristic = {
  characteristicType: string;
  value: number| string;
};

export class ApiBridge extends BaseBridge {
  uniqueIds: string[];
  token: string;
  //url: string;
  //username: string;
  //password: string;
  config: ApiBridgeConfig;

  constructor(log: Logger, config: ApiBridgeConfig) {
    super(log);
    this.config = config;
    //this.url = config.url ;
    //this.username = config.username ;
    //this.password = config.password ;
    this.token = '';
    this.uniqueIds = [];
  }


  async getNewToken() {
    try {
      const bodyObject = { username: this.config.username, password: this.config.password, otp: 'string' };
      const bodyString = JSON.stringify(bodyObject);
      try {
        const response = await axios({
          url: this.config.url+'/api/auth/login',
          method: 'post',
          data: bodyString,
          headers: { 'Content-Type': 'application/json', 'accept': '*/*' },
        });

        this.token = await response.data.access_token;
      } catch(error) {
        this.log.error('catch capture', error);
      }
    } catch (erro) {
      this.log.error('lehswe', erro);
    }
  }

  async getValidToken() {
    try {
      const response = await axios({
        url: this.config.url+'/api/auth/check',
        method: 'get',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${this.token}` },
      });

      if (response.status !== 200) {
        this.log.error('Token not valid, get new token');
        this.getNewToken();
      }
    } catch (error) {
      this.log.error('GVT error', error);
      this.getNewToken();
    }
  }

  async start(): Promise<void> {
    await this.getNewToken();
    if (this.token === undefined) {
      this.log.error('Unable to login user', this.config.username, 'at homebridge server', this.config.url);
    } else {
      this.log.info('Successful login of user', this.config.username, 'at homebridge server', this.config.url);
    }

    await this.getValidToken();

    const response = await axios({
      url: this.config.url+'/api/accessories',
      method: 'get',
      headers: { 'accept': '*/*', 'Authorization': `Bearer ${this.token}` },
    });

    if (response.status !== 200) {
      this.log.error('Could not get accessories');
      return;
    }
    //this.log.warn('resp',response.data);


    const accs : AccessoryAsItComesFromApi[] = response.data;
    for(let j = 0; j < accs.length; j++) {
      const acc : AccessoryAsItComesFromApi = accs[j];
      if (acc.accessoryInformation !== undefined) {
        if (acc.accessoryInformation.Name !== undefined) {
          if (typeof acc.accessoryInformation.Name === 'string') {
            const name: string = acc.accessoryInformation.Name.trim();
            const cv: CharacteristicValue[] = [];
            for (const [key, value] of Object.entries(acc.values)) {
              cv[key] = value;
            }
            const accData: AccessoryData = new AccessoryData(name, cv);
            this.uniqueIds[name] = accs[j].uniqueId;
            this.accessories[name] = accData;
          }
        }
      }
    }

  }

  async setAccessoryCharacteristic(accessoryName: string, characteristicType: string, value: number) {
    await this.getValidToken();
    const char: ApiCharacteristic = {characteristicType: characteristicType, value: value};

    const response = await axios({
      url: this.config.url+'/api/accessories/'+this.uniqueIds[accessoryName],
      method: 'put',
      data: JSON.stringify(char),
      headers: { 'accept': '*/*', 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json'},
    });

    if (response.status !== 200) {
      this.log.error('hbapi', 'Could not set accessory characteristics', response.status);
      return undefined;
    }
    return true;
  }


}


