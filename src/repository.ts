import {NoBridge} from './bridge';
import {HapBridge} from './hap-bridge';
import {ApiBridge} from './api-bridge';
import {AccessoryData} from './accessory';

export type Bridge = HapBridge | ApiBridge | NoBridge;

export class AccessoryRepository {
  accessories: Bridge[] = [];
  get(accessoryName: string): AccessoryData {
    //console.log('get',accessoryName,this.accessories);
    const bridge: Bridge = this.accessories[accessoryName];
    //console.log('bridge',bridge,this.accessories);
    return bridge.accessories[accessoryName];
  }

  addBridge(bridge: Bridge): void {
    //console.log('add bridge',bridge);
    for(const accessoryName of Object.keys(bridge.accessories)) {
      //console.log('accessory',accessoryName);
      this.accessories[accessoryName] = bridge;
    }
    //console.log('bridge added',this.accessories);
  }

  getAccessoryCharacteristic(accessoryName: string, characteristicsType: string): number {
    const bridge: Bridge = this.accessories[accessoryName];
    //console.log('bridge',bridge);
    //console.log('xxx',accessoryName,characteristicsType);
    //console.log('yyy',bridge.getAccessoryCharacteristic(accessoryName));
    return bridge.getAccessoryCharacteristic(accessoryName)[characteristicsType];
  }

  async setAccessoryCharacteristic(accessoryName: string, characteristicsType: string, value: number): Promise<void> {
    const bridge: Bridge = this.accessories[accessoryName];
    await bridge.setAccessoryCharacteristic(accessoryName, characteristicsType, value);
  }
}
