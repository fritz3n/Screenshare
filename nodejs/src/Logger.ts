export type Logtype = [string, string];
export const info:Logtype = ["[o]", "color:white;"];
export const error:Logtype = ["[-]", "color:red;"];
export const healty:Logtype = ["[+]", "color:green;"]

export const Logger = {
    log: function(m:string, type:Logtype = info){
        if(this.enabled){
            console.log("%c"+type[0], type[1], m);
        }
    },
    enabled: false,
};