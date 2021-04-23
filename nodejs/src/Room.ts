import { JsxEmit } from "typescript";
import { Client } from "./Client";
import { info, Logger } from "./Logger";
import { Server } from "./Server";

export class Room
{
    private Clients: Map<string, Client> =  new Map<string, Client>();
    private Name:string;
    private Server:Server;

    public constructor(name:string, server:Server){
        this.Name = name;
        this.Server = server;
    }

    public Join(cli: Client, username: string):void{
        cli.Room = this;
        
        cli.SendMessage(JSON.stringify({
            type: 'userlist',
            users: Array.from(this.Clients).map( (e)=>{return {username: e[0], streaming: e[1].Streaming};}),
        }));

        this.Clients.set(username, cli);
        this.Broadcast(JSON.stringify({
            type: "join",
            username: username,
        }), cli);

    }
    public Leave(username:string):void{
        Logger.log("removing client " + username, info);
        this.Clients.delete(username);
        if(this.Clients.size === 0){
            this.Server.RemoveEmptyRoom(this.Name);
        }else{
            this.Broadcast(JSON.stringify({
                type: "leave",
                username: username,
            }));
        }
    }
    public HasName(username: string):boolean{
        return this.Clients.has(username);
    }

    public Broadcast(msg: string, ignore:any = undefined):void{
        this.Clients.forEach( (cli) => { if(cli !== ignore) { cli.SendMessage(msg); }});
    }

    public GetRTC(caller:Client, callee:string):void{
        let c = this.Clients.get(callee);

        if(c === undefined){
            caller.Error("User not found.");
        }else{
            c.SendMessage(JSON.stringify({
                type: "get-rtc",
                from: caller.GetUsername(),
            }));
        }
    }

    public ForwardRTC(from: Client, to:string, rtc:string):void{
        let c = this.Clients.get(to);
        if(c){
            c.SendMessage(JSON.stringify({
                type: "resp-rtc",
                from: from.GetUsername(),
                rtc: rtc,
            }));
        }
    }
}