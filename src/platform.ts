import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import {AutomationBridge, AccessoryData} from './automation_bridge';

import {AutomationScenes} from './scenes';

/**
 * AutomationHomebridgePlatform
 * This class is the main constructor for the plugin.
 */


export class AutomationHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  private scenes: AutomationScenes;
  private requiredAccessories: string[];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log.info('Full config', config);
    this.scenes = new AutomationScenes(this.log, config.scenes);
    this.requiredAccessories = this.scenes.requiredAccessoryNames();
    this.log.warn('Required accessories', this.requiredAccessories);

    setInterval(() => {
      try {
        (async() => {
          this.log.info('Periodic poll start');

          const accessories: AccessoryData[] = [];

          // Create the 'datetime' accessory
          const accDatetime: AccessoryData = new AccessoryData();
          const timeNow: Date = new Date();
          accDatetime.values['DayMinutes'] = timeNow.getMinutes() + (60*timeNow.getHours());
          accessories['datetime'] = accDatetime;

          // Get accessories from all configured bridges. Save the ones required by the scenes.
          for (let i = 0; i < config.bridge.length; i++) {
            const bridge: AutomationBridge = new AutomationBridge(this.log, config.bridge[i]);
            await bridge.start();
            const accs : any[] = await bridge.getAccessories();
            for(let j = 0; j < accs.length; j++) {
              const name: string = accs[j].accessoryInformation.Name.trim();
              if (this.requiredAccessories.includes(name)) {
                const accData: AccessoryData = new AccessoryData();
                accData.values = accs[j].values;
                accData.uniqueId = accs[j].uniqueId;
                accData.bridge = bridge;
                accessories[name] = accData;
              }
            }
          }
          // Check if all required accessories have been found.
          for (let i = 0; i < this.requiredAccessories.length; i++) {
            if (accessories[this.requiredAccessories[i]] === undefined) {
              this.log.error('No accessory found with name', this.requiredAccessories[i]);
            }
          }
          // "Run" the configured scenes
          await this.scenes.run(accessories);

          this.log.info('Periodic poll end');
        })();

      } catch(error) {
        this.log.error('Poll period error:', error);
      }
    }, this.config.pollPeriod || 20000);

  }

  /**
   * This platform does not create any accessories, but the method needs to be defined.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.debug('configureAccessory() method is deliberately empty in this plugin.');
    this.log.debug('Accessory:', accessory);
  }

}
