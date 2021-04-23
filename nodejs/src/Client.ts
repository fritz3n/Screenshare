import WebSocket = require('ws');
import { error, info, Logger } from './Logger';
import { TypedMessage } from './Message';
import { Room } from './Room';

export class Client{
    private Ws:WebSocket;
    private Username:string;
    public Room: Room | undefined;
    public Streaming:boolean = false;

    public constructor(ws:WebSocket, username:string){
        this.Ws = ws;
        this.Username = username;
        ws.on("message", this.OnMessage.bind(this));
        ws.on("close", this.Leave.bind(this));
    }

    public GetUsername():string{
        return this.Username;
    }

    private OnMessage(data:string):void{
        if(typeof data === "undefined")
            return;
        let msg = JSON.parse(data) as TypedMessage;
        switch(msg.type){
            case 'ping':
                this.SendMessage(JSON.stringify({type: 'pong'}))
                break;
            case 'get-rtc': // client wants the rtc string of a client
                if(typeof (msg as any).username === "undefined"){
                    this.Error("No username provided!"); return;
                }
                Logger.log(this.Username + " requested rtc of " + (msg as any).username, info);
                this.Room?.GetRTC(this, (msg as any).username);
            break;
            case 'resp-rtc': // client responded to a rtc req. 
                if(typeof (msg as any).to === "undefined"){
                    this.Error("No recipient provided!"); return;
                }
                if(typeof (msg as any).rtc === "undefined"){
                    this.Error("No rtc provided!"); return;
                }
                this.Room?.ForwardRTC(this, (msg as any).to, (msg as any).rtc);
            break;
            case 'set-stream':
                this.Streaming = (msg as any).state;
                this.Room?.Broadcast(JSON.stringify({username: this.Username, type: "set-stream", state: this.Streaming}), this);
            break;
        }
    }

    private Leave():void{
        Logger.log(this.Username + " left", info);
        if(this.Room !== undefined){
            this.Room.Leave(this.Username);
        }

        this.Ws.close();
    }

    public SendMessage(msg: string):void{
        this.Ws.send(msg);
    }

    public Error(message: string):void{

        Logger.log(this.Username + " " + message , error)

        this.SendMessage(JSON.stringify({
            type: "error",
            message: message,
        }));

        this.Leave();
    }
}