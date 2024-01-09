import axios from 'axios';
import {Logger} from 'homebridge';
import {AccessoryData, CharacteristicValue} from './accessory';
import {HapBridgeConfig} from './config';
import {BaseBridge} from './bridge';


export class HapBridge extends BaseBridge {
  //uniqueIds: string[];
  config: HapBridgeConfig;

  constructor(log: Logger, config: HapBridgeConfig) {
    super(log);
    this.config = config;
    //this.uniqueIds = [];
  }

  async start(): Promise<void> {
    const xxx = (await axios.get(`${this.config.url}/accessories`)).data.accessories;
    for(let i = 0; i < xxx.length; i++) {
      const y = xxx[i];
      this.log.info('hapy', y);
      for(let j = 0; j < y.services.length; j++) {
         this.log.info('hapys',y.services[j]);
      }
    }

    //const response = await axios({
    //  url: this.config.url+'/api/accessories',
    //  method: 'get',
    //  headers: { 'accept': '*/*', 'Authorization': `Bearer ${this.token}` },
    //});

    //if (response.status !== 200) {
    //  this.log.error('Could not get accessories');
    //  return;
    //}
    //this.log.warn('resp',response.data);


    //const accs : AccessoryAsItComesFromApi[] = response.data;
    //for(let j = 0; j < accs.length; j++) {
    //  const acc : AccessoryAsItComesFromApi = accs[j];
    //  if (acc.accessoryInformation !== undefined) {
    //    if (acc.accessoryInformation.Name !== undefined) {
    //      if (typeof acc.accessoryInformation.Name === 'string') {
    //        const name: string = acc.accessoryInformation.Name.trim();
    //        const cv: CharacteristicValue[] = [];
    //        for (const [key, value] of Object.entries(acc.values)) {
    //          cv[key] = value;
    //        }
    //        const accData: AccessoryData = new AccessoryData(name, cv);
    //        this.uniqueIds[name] = accs[j].uniqueId;
    //        this.accessories[name] = accData;
    //      }
    //    }
    //  }
    //}

  }

  async setAccessoryCharacteristic(accessoryName: string, characteristicType: string, value: number) {
    ////// const settings = [{aid: 189, iid: 12, value: 0}];

    //////   await axios.put(`${this.config.url}/characteristics`,{characteristics: settings},{headers: {Authorization: this.config.pin}});


    //await this.getValidToken();
    //const char: ApiCharacteristic = {characteristicType: characteristicType, value: value};

    //const response = await axios({
    //  url: this.config.url+'/api/accessories/'+this.uniqueIds[accessoryName],
    //  method: 'put',
    //  data: JSON.stringify(char),
    //  headers: { 'accept': '*/*', 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json'},
    //});

    //if (response.status !== 200) {
    //  this.log.error('hbapi', 'Could not set accessory characteristics', response.status);
    //  return undefined;
    //}
    //return true;
  }


}


