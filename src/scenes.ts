import {Logger} from 'homebridge';

import {AutomationBridge,AccessoryData} from './automation_bridge';


class Condition {

  accessory: string;
  characteristic: string;
  operator: string;
  value: number;
  log: Logger;

  constructor(log: Logger,config: any) {
     this.log = log;
     this.accessory = config.accessory;
     this.characteristic = config.characteristic;
     this.operator = config.operator;
     const parts = config.value.split(':');
     if (parts.length == 1) {
        this.value = Number(parts[0])
     } else {
        this.value = (60 * Number(parts[0])) + Number(parts[1])
     }
  }

  getAccessoryName(): string {return this.accessory};

  state(accessories: AccessoryData[]): boolean {
     let conditionsOk = true;

     if (accessories[this.accessory] == undefined) {
        this.log.error('Condition requires missing accessory',this.accessory);
        return false;
     }
  
     const values = accessories[this.accessory].values;
     const subjectValue = values[this.characteristic];
    
     if (this.operator == 'equal') {
                    if (subjectValue != this.value) conditionsOk = false;
     } else if (this.operator == 'notequal') {
                    if (subjectValue == this.value) conditionsOk = false;
     } else if (this.operator == 'higher') {
                    if (subjectValue < this.value) conditionsOk = false;
     } else if (this.operator == 'lower') {
                    if (subjectValue >= this.value) conditionsOk = false;
     } else {
                     this.log.error('Unknown condition operator',this.operator);
                     return false;
     }
      this.log.info('Condition',
                     conditionsOk,
                     this.accessory,
                     this.characteristic,
                     this.operator,
                     this.value);
     return conditionsOk;
  }

}


class Trigger {
  inverted: boolean;
  conditions: Condition[];
  log: Logger;

  constructor(log: Logger,config) {
    this.log = log;
    this.inverted = config.inverted;
    this.conditions = [];
    for(let i = 0; i < config.conditions.length; i++) {
       let condition: Condition = new Condition(this.log,config.conditions[i]);
       this.conditions.push(condition);
    }
  }

  getAccessoryNames(): string[] {
    let names: string[] = [];
    for (let i = 0; i < this.conditions.length; i++) {
       names.push(this.conditions[i].getAccessoryName());
    }
    return names;
  }

  state(accessories: AccessoryData[]): boolean {
    let triggerOk: boolean = true;
    for(let i = 0; i < this.conditions.length; i++) {
      const conditionState = this.conditions[i].state(accessories);
      if (!conditionState) triggerOk = false;
    }
    if (this.inverted) triggerOk = !triggerOk
    this.log.debug('Trigger',triggerOk);
    return triggerOk;
  }

}

class Action {
  accessory: string;
  characteristic: string;
  value: number;
  log: Logger;

  constructor(log: Logger,config: any) {
     this.log = log;
     this.accessory = config.accessory;
     this.characteristic = config.characteristic;
     this.value = config.value;
  }

  getAccessoryName(): string {return this.accessory};

  async execute(accessories: AccessoryData[]): Promise<void> {
    if (accessories[this.accessory] == undefined) {
        this.log.error('Action requires missing accessory',this.accessory);
        return;
    }
    const accData = accessories[this.accessory];
    if (accData.bridge != null) {
      this.log.warn('Set',this.accessory,this.characteristic,this.value);
      await accData.bridge.setAccessoryCharacteristics(
         accData.uniqueId,
         this.characteristic,
         this.value
      );
    }
  }
}

class Scene {
  name: string;
  triggers: Trigger[];
  opened: Action[];
  closed: Action[];
  log: Logger;

  constructor(log: Logger,config: any){
    this.log = log;
    this.name = config.name;
    this.triggers = [];
    for(let i = 0; i < config.triggers.length; i++) {
       let trigger: Trigger = new Trigger(this.log,config.triggers[i]);
       this.triggers.push(trigger);
    }
    this.opened = [];
    for(let i = 0; i < config.open.length; i++) {
       let action: Action = new Action(this.log,config.open[i]);
       this.opened.push(action);
    }
    this.closed = [];
    for(let i = 0; i < config.close.length; i++) {
       let action: Action = new Action(this.log,config.close[i]);
       this.closed.push(action);
    }
  }

  getAccessoryNames(): string[] {
    let names: string[] = [];
    for (let i = 0; i < this.opened.length; i++) {
       names.push(this.opened[i].getAccessoryName());
    }
    for (let i = 0; i < this.closed.length; i++) {
       names.push(this.closed[i].getAccessoryName());
    }
    for (let i = 0; i < this.triggers.length; i++) {
       let triggerNames: string[] = this.triggers[i].getAccessoryNames();
       for (let j = 0; j < triggerNames.length; j++) {
         names.push(triggerNames[j]);
       }
    }
    return names;
  }

  async run(accessories: AccessoryData[]): Promise<void> {
     this.log.info('Scene',this.name);
     let triggersOk = false;
     for(let i = 0; i < this.triggers.length; i++) {
        if (this.triggers[i].state(accessories)) triggersOk = true;
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

  constructor(log: Logger, config: any[]) {
    this.log = log;
    this.scenes = [];
    for(let i = 0; i < config.length; i++) {
       this.scenes.push(new Scene(this.log,config[i]));
    }

  }

  requiredAccessoryNames(): string[] {
    let names: string[] = [];
    for (let i = 0; i < this.scenes.length; i++) {
       let sceneNames: string[] = this.scenes[i].getAccessoryNames();
       for (let j = 0; j < sceneNames.length; j++) {
          names.push(sceneNames[j]);
       }
    }
    return Array.from(new Set(names));
  }

  async run(accessories: AccessoryData[]): Promise<void> {
    for(let i = 0; i < this.scenes.length; i++) await this.scenes[i].run(accessories);
  }

}

