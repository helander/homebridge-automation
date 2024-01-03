import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import {AutomationBridge} from './automation_bridge';

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
    this.log.info('Full config',config)
        
    setInterval(() => {
     try {
       (async() => {
          this.log.info('Periodic poll start')
          let accessories: any[] = [];
          /////let bridges: AutomationBridge[] = [];
          for (let i = 0; i < config.bridge.length; i++) {
             const bridge: AutomationBridge = new AutomationBridge(this.log,config.bridge[i]);
             /////bridges.push(bridge);
             await bridge.start();
             const accs : any[] = await bridge.getAccessories();
             for(let j = 0; j < accs.length; j++) {
               accs[j].bridge = bridge;
               accessories.push(accs[j]);
             }
          }
          this.log.debug('Total number of accessories:',accessories.length);
          //for(let i = 0 ; i < accessories.length; i++) {
             //this.log.debug('Accessory',accessories[i].accessoryInformation.Name); 
          //}
          //this.log.debug('Accessories:',accessories);
          const timeNow = new Date();

          for(let i = 0; i < config.scenes.length; i++) {
             let scene = config.scenes[i];
             //this.log.debug('scene',scene.name);
             let triggersOk = false;
             for(let j = 0; j < scene.triggers.length; j++) {
               let trigger = scene.triggers[j];
               //this.log.debug('   trigger',j,trigger.inverted);
               let conditionsOk = true;
               for(let k = 0; k < trigger.conditions.length; k++) {
                  let condition = trigger.conditions[k];
                  //this.log.debug('      condition',condition);
                  let subjectValue;
                  let conditionValue;
                  if (condition.accessory == 'datetime') {
                     subjectValue = timeNow.getMinutes() + (60 * timeNow.getHours());
                     const parts = condition.value.split(':');
                     if (parts.length == 1) {
                       conditionValue = Number(parts[0])
                     } else {
                       conditionValue = (60 * Number(parts[0])) + Number(parts[1])
                     }
                  } else {
                    try {
                     conditionValue = Number(condition.value)
                     const accessory = accessories.find((element) => 
                                 element.accessoryInformation.Name.trim() == condition.accessory)
                     const values = accessory.values;
                     subjectValue = values[condition.characteristic]
                    } catch(error) {
                      this.log.error('Accessory condition',error);
                    }
                  }
                  if (condition.operator == 'equal') {
                    if (subjectValue != conditionValue) conditionsOk = false;
                  } else if (condition.operator == 'notequal') {
                    if (subjectValue == conditionValue) conditionsOk = false;
                  } else if (condition.operator == 'higher') {
                    if (subjectValue < conditionValue) conditionsOk = false;
                  } else if (condition.operator == 'lower') {
                    if (subjectValue >= conditionValue) conditionsOk = false;
                  } else {
                     this.log.error('Unknown condition operator',condition.operator);
                  }
               }
               if (trigger.inverted) conditionsOk = !conditionsOk;
               if (conditionsOk) triggersOk = true;
               this.log.info('Scene',config.scenes[i].name,'trigger',j,conditionsOk);
             }
             let actions;
             if (triggersOk) {
                actions = config.scenes[i].open;
                this.log.info('Scene',config.scenes[i].name,'opened'); 
             } else {
                actions = config.scenes[i].close
                this.log.info('Scene',config.scenes[i].name,'closed');
             }
             ///execute actions
             for(let a = 0; a < actions.length; a++) {
               const action = actions[a];
               try {
                const accessory = accessories.find((element) =>  
                          element.accessoryInformation.Name.trim() == action.accessory)
                 //this.log.debug('ACTION',action.accessory,action.characteristic,action.value);

                    await accessory.bridge.setAccessoryCharacteristics(
                                   accessory,action.characteristic,action.value);
               } catch(error) {
                  this.log.error('Action',action.accessory,error);
               }

             }
          }


          this.log.info('Periodic poll end');
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
