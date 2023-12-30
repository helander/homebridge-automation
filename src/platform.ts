import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
//import { ExamplePlatformAccessory } from './platformAccessory';

//import {setLogger,selectDevices,setApiUrl,getNewToken,getValidToken,getAccessories,getAccessoryCharacteristics,setAccessoryCharacteristics} from './hbapi'

//////import {runAutomation} from './automation';
///import {HomebridgeApi} from './hb';
import {HomebridgeBridge, AutomationContext} from './hb_bridge';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */



export class AutomationHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Initializing platform:', this.config.name);
    this.log.debug('Poll period',this.config.pollPeriod || 60000);
        
    setInterval(() => {
     try {
       (async() => {
          this.log.debug('Periodic poll start')
          let bridges: HomebridgeBridge[] = [];
          for (let i = 0; i < config.bridge.length; i++) {
             const bridge: HomebridgeBridge = new HomebridgeBridge(this.log,config.bridge[i]);
             bridges.push(bridge);
             await bridge.start();
          }
          let context: AutomationContext = new AutomationContext(this.log,bridges);
          for (let i = 0; i < this.config.modulePath.length; i++) {
            let modulePath = this.config.modulePath[i];
            this.log.debug('Module at',modulePath);
            try {
               let moduleImport = await import(modulePath);
               await moduleImport.runAutomation(context);
               this.log.debug('Module execution done',modulePath);
            } catch(error) {
               this.log.error('Module error at '+modulePath,error);
            }
          }
          this.log.debug('Periodic poll end');
       })()

      } catch(error) {
         console.log('Poll period error:',error)
      }
     }, this.config.pollPeriod || 20000);
 
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {}

}
