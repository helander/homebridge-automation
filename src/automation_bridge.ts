import axios from 'axios';
import {Logger,PlatformConfig} from 'homebridge';




type XX =  {
  characteristicType: string,
  value: any
};


export class AutomationBridge {

   token: string;
   url: string;
   log: Logger;
   username: string;
   password: string;
   selection: any;
//   devices: any;
///   accessories: any[];

   constructor(log: Logger, config: any) {
     this.log = log;
     this.url = config.url ;
     this.username = config.username ;
     this.password = config.password ;
//     this.selection = {};
//     for(let i = 0; i < config.devices.length; i++) {
//       this.selection[config.devices[i].device] = config.devices[i].accessory;
//     }
//     //this.log.debug('Selection',this.selection);
     this.token = "";
///     this.accessories = [];
   }

   async start() {
     await this.getNewToken();
     if (this.token == undefined) {
       this.log.error('Unable to login user',this.username,'at homebridge server',this.url);
     } else {
       this.log.info('Successful login of user',this.username,'at homebridge server',this.url);
     }

//     this.devices = {};
     //let accessories = await this.getAccessories();
     //for(let i = 0; i < accessories.length; i++) {
        //accessories[i].bridge = this;
     //}
//     for(const key in this.selection) {
//        const accessory = this.accessories.find((element) => element.accessoryInformation.Name.trim() == this.selection[key]);
//        this.devices[key] = accessory;
//     }
     //this.log.info('Number of accessories:',accessories.length);

     //return accessories;


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



    async getAccessoryCharacteristics(accessory) {

       await this.getValidToken()
       const response = await axios({
          url: this.url+"/api/accessories/"+accessory.uniqueId,
          method: "get",
          headers: { "accept": "* / *", "Authorization": `Bearer ${this.token}` },
       });


        if (response.status != 200) {
            this.log.error('Could not get accessory charcteristics',response.status)
            return undefined
        }
  
        return response.data.values
   }

   async setAccessoryCharacteristics(accessory,charKey,charValue) {

      await this.getValidToken()
      let char: XX  = {characteristicType: "", value: ""}
      char.characteristicType = charKey
      char.value = charValue
      this.log.debug('SET',accessory.accessoryInformation.Name,charKey,charValue);
      //return true;
      const response = await axios({
         url: this.url+"/api/accessories/"+accessory.uniqueId,
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



