import {Logger} from 'homebridge';
import {ConditionConfig, TriggerConfig, ActionConfig, SceneConfig} from './config';
import {AccessoryRepository} from './repository';



class Condition {

  //accessory: string;
  //characteristic: string;
  //operator: string;
  value: number;
  config: ConditionConfig;
  log: Logger;

  constructor(log: Logger, config: ConditionConfig) {
    this.log = log;
    this.config = config;
    const parts = config.value.split(':');
    if (parts.length === 1) {
      this.value = Number(parts[0]);
    } else {
      this.value = (60 * Number(parts[0])) + Number(parts[1]);
    }
  }

  getAccessoryName(): string {
    return this.config.accessory;
  }

  state(accessories: AccessoryRepository): boolean {
    let conditionsOk = true;

    if (accessories.get(this.config.accessory) === undefined) {
      this.log.error('Condition requires missing accessory', this.config.accessory);
      return false;
    }

    const subjectValue = accessories.getAccessoryCharacteristic(this.config.accessory, this.config.characteristic);

    if (this.config.operator === 'equal') {
      if (subjectValue !== this.value) {
        conditionsOk = false;
      }
    } else if (this.config.operator === 'notequal') {
      if (subjectValue === this.value) {
        conditionsOk = false;
      }
    } else if (this.config.operator === 'higher') {
      if (subjectValue < this.value) {
        conditionsOk = false;
      }
    } else if (this.config.operator === 'lower') {
      if (subjectValue >= this.value) {
        conditionsOk = false;
      }
    } else {
      this.log.error('Unknown condition operator', this.config.operator);
      return false;
    }
    this.log.info('Condition',
      conditionsOk,
      'current',
      subjectValue,
      this.config.accessory,
      this.config.characteristic,
      this.config.operator,
      this.value);
    return conditionsOk;
  }

}


class Trigger {
  //inverted: boolean;
  conditions: Condition[];
  config: TriggerConfig;
  log: Logger;

  constructor(log: Logger, config: TriggerConfig) {
    this.log = log;
    this.config = config;
    //this.inverted = config.inverted;
    this.conditions = [];
    for(let i = 0; i < config.conditions.length; i++) {
      const condition: Condition = new Condition(this.log, config.conditions[i]);
      this.conditions.push(condition);
    }
  }

  getAccessoryNames(): string[] {
    const names: string[] = [];
    for (let i = 0; i < this.conditions.length; i++) {
      names.push(this.conditions[i].getAccessoryName());
    }
    return names;
  }

  state(accessories: AccessoryRepository): boolean {
    let triggerOk = true;
    for(let i = 0; i < this.conditions.length; i++) {
      const conditionState = this.conditions[i].state(accessories);
      if (!conditionState) {
        triggerOk = false;
      }
    }
    if (this.config.inverted) {
      triggerOk = !triggerOk;
    }
    this.log.debug('Trigger', triggerOk);
    return triggerOk;
  }

}


class Action {
  //accessory: string;
  //characteristic: string;
  value: number;
  config: ActionConfig;
  log: Logger;

  constructor(log: Logger, config: ActionConfig) {
    this.log = log;
    this.config = config;
    //this.accessory = config.accessory;
    //this.characteristic = config.characteristic;
    this.value = Number(config.value);
  }

  getAccessoryName(): string {
    return this.config.accessory;
  }

  async execute(accessories: AccessoryRepository): Promise<void> {
    if (accessories.get(this.config.accessory) === undefined) {
      this.log.error('Action requires missing accessory', this.config.accessory);
      return;
    }
    this.log.warn('Set', this.config.accessory, this.config.characteristic, this.value);
    await accessories.setAccessoryCharacteristic(this.config.accessory, this.config.characteristic, this.value);
  }
}


class Scene {
  name: string;
  triggers: Trigger[];
  opened: Action[];
  closed: Action[];
  log: Logger;

  constructor(log: Logger, config: SceneConfig){
    this.log = log;
    this.name = config.name;
    this.triggers = [];
    for(let i = 0; i < config.triggers.length; i++) {
      const trigger: Trigger = new Trigger(this.log, config.triggers[i]);
      this.triggers.push(trigger);
    }
    this.opened = [];
    for(let i = 0; i < config.open.length; i++) {
      const action: Action = new Action(this.log, config.open[i]);
      this.opened.push(action);
    }
    this.closed = [];
    for(let i = 0; i < config.close.length; i++) {
      const action: Action = new Action(this.log, config.close[i]);
      this.closed.push(action);
    }
  }

  getAccessoryNames(): string[] {
    const names: string[] = [];
    for (let i = 0; i < this.opened.length; i++) {
      names.push(this.opened[i].getAccessoryName());
    }
    for (let i = 0; i < this.closed.length; i++) {
      names.push(this.closed[i].getAccessoryName());
    }
    for (let i = 0; i < this.triggers.length; i++) {
      const triggerNames: string[] = this.triggers[i].getAccessoryNames();
      for (let j = 0; j < triggerNames.length; j++) {
        names.push(triggerNames[j]);
      }
    }
    return names;
  }

  async run(accessories: AccessoryRepository): Promise<void> {
    this.log.info('Scene', this.name);
    let triggersOk = false;
    for(let i = 0; i < this.triggers.length; i++) {
      if (this.triggers[i].state(accessories)) {
        triggersOk = true;
      }
    }

    let actions: Action[];
    if (triggersOk) {
      actions = this.opened;
      this.log.info('Scene opened');
    } else {
      actions = this.closed;
      this.log.info('Scene closed');
    }
    for(let i = 0; i < actions.length; i++) {
      await actions[i].execute(accessories);
    }
  }
}



export class AutomationScenes {
  scenes: Scene[];
  log: Logger;

  constructor(log: Logger, config: SceneConfig[]) {
    this.log = log;
    this.scenes = [];
    if (config !== undefined) {
      for(let i = 0; i < config.length; i++) {
        this.scenes.push(new Scene(this.log, config[i]));
      }
    } else {
      this.log.warn('No scenes configured. Please configure at least one scene.');
    }

  }

  requiredAccessoryNames(): string[] {
    const names: string[] = [];
    for (let i = 0; i < this.scenes.length; i++) {
      const sceneNames: string[] = this.scenes[i].getAccessoryNames();
      for (let j = 0; j < sceneNames.length; j++) {
        names.push(sceneNames[j]);
      }
    }
    return Array.from(new Set(names));
  }

  async run(accessories: AccessoryRepository): Promise<void> {
    for(let i = 0; i < this.scenes.length; i++) {
      await this.scenes[i].run(accessories);
    }
  }

}

