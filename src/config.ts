
export type ApiBridgeConfig = {
  url: string;
  username: string;
  password: string;
};

export type HapBridgeConfig = {
  url: string;
  pin: string;
};

export type ConditionConfig = {
  accessory: string;
  characteristic: string;
  operator: string;
  value: string;
};


export type TriggerConfig = {
  inverted: boolean;
  conditions: ConditionConfig[];
};


export type ActionConfig = {
  accessory: string;
  characteristic: string;
  value: string;
};

export type SceneConfig = {
  name: string;
  triggers: TriggerConfig[];
  open: ActionConfig[];
  close: ActionConfig[];
};

export type AutomationConfig = {
   name: string;
   pollPeriod: number;
   scenes: SceneConfig[];
   apibridge: ApiBridgeConfig[];
   hapbridge: HapBridgeConfig[];
};
