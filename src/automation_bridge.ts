import axios from 'axios';
import {Logger} from 'homebridge';

type CharacteristicValue =  {
  characteristicType: string,
  value: any
};

export class AutomationBridge {

   token: string;
   url: string;
   log: Logger;
   username: string;
   password: string;

   constructor(log: Logger, config: any) {
     this.log = log;
     this.url = config.url ;
     this.username = config.username ;
     this.password = config.password ;
     this.token = "";

   }

   async start() {
     await this.getNewToken();
     if (this.token == undefined) {
       this.log.error('Unable to login user',this.username,'at homebridge server',this.url);
     } else {
       this.log.info('Successful login of user',this.username,'at homebridge server',this.url);
     }
   }

   async getNewToken() {
    try {
      const bodyObject = { username: this.username, password: this.password, otp: "string" };
      const bodyString = JSON.stringify(bodyObject);
         try {
           const response = await axios({
             url: this.url+"/api/auth/login",
             method: "post",
             data: bodyString,
             headers: { "Content-Type": "application/json","accept": "*/*" },
           });

           this.token = await response.data.access_token
         } catch(error) {
           this.log.error('catch capture',error);
         }
    } catch (erro) {
      this.log.error('lehswe',erro);
    }
   }

   async getValidToken() {
         try {
            const response = await axios({
               url: this.url+"/api/auth/check", 
               method: "get",
               headers: { "accept": "*/*", "Authorization": `Bearer ${this.token}` },
            });

            if (response.status != 200) {
               this.log.error('Token not valid, get new token');
               this.getNewToken();
            }
         } catch (error) {
            this.log.error('GVT error',error);
            this.getNewToken();
         }
   }

   async getAccessories() {
      let accs: any[] = [];

         await this.getValidToken()

         const response = await axios({
            url: this.url+"/api/accessories", 
            method: "get",
            headers: { "accept": "*/*", "Authorization": `Bearer ${this.token}` },
         });

         if (response.status != 200) {
            this.log.error('Could not get accessories');
         } else {
            //this.log.warn('resp',response.data);
            accs = response.data;
         }
      return accs;
   }

   async setAccessoryCharacteristics(uniqueId,charKey,charValue) {

      await this.getValidToken()
      let char: CharacteristicValue = {characteristicType: "", value: ""}
      char.characteristicType = charKey
      char.value = charValue
      //this.log.debug('SET',uniqueId,charKey,charValue);

      const response = await axios({
         url: this.url+"/api/accessories/"+uniqueId,
         method: "put",
         data: JSON.stringify(char),
         headers: { "accept": "*/*", "Authorization": `Bearer ${this.token}`, "Content-Type": "application/json"},
      });

      if (response.status != 200) {
         this.log.error('hbapi','Could not set accessory characteristics',response.status)
         return undefined
      }
      return true
   } 

}

type Nullable<T>  = T | null


export class AccessoryData {

  bridge : Nullable<AutomationBridge>;   
  values : CharacteristicValue[] = [];
  uniqueId : string = "";

  constructor() {
    this.bridge = null;
  }

}
