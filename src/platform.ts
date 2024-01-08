import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import {AccessoryData} from './accessory';
import {AccessoryRepository} from './repository';
import {NoBridge, ApiBridge} from './bridge';
import {AutomationScenes} from './scenes';
import {AutomationConfig} from './config';

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
  private cfg: AutomationConfig;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.cfg = config as unknown as AutomationConfig;
    this.log.info('Full config', this.cfg);
    this.scenes = new AutomationScenes(this.log, this.cfg.scenes);
    this.requiredAccessories = this.scenes.requiredAccessoryNames();
    this.log.warn('Required accessories', this.requiredAccessories);

    setInterval(() => {
      try {
        (async() => {
          this.log.info('Periodic poll start');

          const repo: AccessoryRepository = new AccessoryRepository();

          // Create the 'datetime' accessory
          const accDatetime: AccessoryData = new AccessoryData('datetime', []);
          const timeNow: Date = new Date();
          accDatetime.values['DayMinutes'] = timeNow.getMinutes() + (60*timeNow.getHours());

          const nobridge = new NoBridge(this.log);
          nobridge.addAccessory(accDatetime);

          repo.addBridge(nobridge);

          // Get accessories from all configured bridges.
          if (this.cfg.apibridge !== undefined) {
            for (let i = 0; i < this.cfg.apibridge.length; i++) {
              const bridge: ApiBridge = new ApiBridge(this.log, this.cfg.apibridge[i]);
              await bridge.start();
              repo.addBridge(bridge);
            }
            // Check if all required accessories have been found.
            for (let i = 0; i < this.requiredAccessories.length; i++) {
              if (repo.get(this.requiredAccessories[i]) === undefined) {
                this.log.error('No accessory found with name', this.requiredAccessories[i]);
              }
            }
            // "Run" the configured scenes
            await this.scenes.run(repo);
          } else {
            this.log.warn('No bridges have been defined. Please configure at least one bridge.');
          }
          this.log.info('Periodic poll end');
        })();

      } catch(error) {
        this.log.error('Poll period error:', error);
      }
    }, this.cfg.pollPeriod || 20000);

  }

  /**
   * This platform does not create any accessories, but the method needs to be defined.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.debug('configureAccessory() method is deliberately empty in this plugin.');
    this.log.debug('Accessory:', accessory);
  }

}
