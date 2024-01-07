
export type CharacteristicValue = string |number ;



export class AccessoryData {
  name: string;
  values : CharacteristicValue[] = [];
  constructor(name: string, values: CharacteristicValue[]) {
    this.name = name;
    this.values = values;
  }
}




