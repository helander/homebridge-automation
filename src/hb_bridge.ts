import axios from 'axios';
import {Logger,PlatformConfig} from 'homebridge';




type X =  {
  characteristicType: string,
  value: any
};


export class HomebridgeBridge {

   token: string;
   url: string;
   log: Logger;
   username: string;
   password: string;
   selection: any;
   devices: any;
   accessories: any[];

   constructor(log: Logger, config: any) {
     this.log = log;
     this.url = config.url ;
     this.username = config.username ;
     this.password = config.password ;
     this.selection = {};
     for(let i = 0; i < config.devices.length; i++) {
       this.selection[config.devices[i].device] = config.devices[i].accessory;
     }
     //this.log.debug('Selection',this.selection);
     this.token = "";
     this.accessories = [];
   }

   async start() {
     await this.getNewToken();
     if (this.token == undefined) {
       this.log.error('Unable to login user',this.username,'at homebridge server',this.url);
     } else {
       this.log.info('Successful login of user',this.username,'at homebridge server',this.url);
     }

     this.devices = {};
     this.accessories = await this.getAccessories();
     for(const key in this.selection) {
        const accessory = this.accessories.find((element) => element.accessoryInformation.Name.trim() == this.selection[key]);
        this.devices[key] = accessory;
     }
     this.log.info('Number of accessories:',this.accessories.length);


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
            accs = response.data;
         }
      return accs;
   }



    async getAccessoryCharacteristics(key) {

       await this.getValidToken()
       if (this.devices[key] == undefined) {
          this.log.error('getAccessoryCharacteristics no such device',key)
          return undefined
       } 
       const response = await axios({
          url: this.url+"/api/accessories/"+this.devices[key].uniqueId,
          method: "get",
          headers: { "accept": "* / *", "Authorization": `Bearer ${this.token}` },
       });


        if (response.status != 200) {
            this.log.error('Could not get accessory charcteristics',response.status)
            return undefined
        }
  
        return response.data.values
   }

   async setAccessoryCharacteristics(key,charKey,charValue) {

      await this.getValidToken()
      let char: X  = {characteristicType: "", value: ""}
      char.characteristicType = charKey
      char.value = charValue
      if (this.devices[key] == undefined) {
         this.log.error('setAccessoryCharacteristics no such device',key)
         return undefined
      }
      const response = await axios({
         url: this.url+"/api/accessories/"+this.devices[key].uniqueId,
         method: "put",
         data: JSON.stringify(char),
         headers: { "accept": "* / *", "Authorization": `Bearer ${this.token}`, "Content-Type": "application/json"},
      });

      if (response.status != 200) {
         this.log.error('hbapi','Could not set accessory charcteristics',response.status)
         return undefined
      }
      return true
   } 

}


export class AutomationContext {
  log: Logger;
  bridges: HomebridgeBridge[];
  constructor(log: Logger, bridges: HomebridgeBridge[]) {
    this.log = log;
    this.bridges = bridges;
  }
  async get(key: string) {
     for(let i = 0; i < this.bridges.length; i++) {
       if (this.bridges[i].devices[key] != undefined) {
         this.log.debug('AutomationContext.get() Found device with name',key,'in bridge',i)
         return await this.bridges[i].getAccessoryCharacteristics(key);
       }
     }
     this.log.error('AutomationContext.get() No device with name '+key+' found');
     return undefined; 
  }
  async set(key: string, ctype: string, cvalue: any) {
     for(let i = 0; i < this.bridges.length; i++) {
       if (this.bridges[i].devices[key] != undefined) {
         this.log.debug('AutomationContext.set() Found device with name',key,'in bridge',i)
         return await this.bridges[i].setAccessoryCharacteristics(key,ctype,cvalue);
       }
     }
     this.log.error('AutomationContext.set() No device with name '+key+' found');
     return undefined; 
  }

  after(hour,minute) {
     const now = new Date()
     const hours = now.getHours()
     const minutes = now.getMinutes()

     if (hours > hour) return true
     if (hours < hour) return false
     return minutes >= minute
   }

   before(hour,minute) {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      if (hours < hour) return true
      if (hours > hour) return false
      return minutes < minute
   }

}
