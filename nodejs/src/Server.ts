import WebSocket = require('ws');
import { Client } from './Client';
import { healty, info, Logger } from './Logger';
import { JoinMessage } from './Message';
import { Room } from './Room';
import { WebSocketServer } from './ws';


export class Server{

    private Rooms:Map<string, Room> = new Map<string, Room>();

    public Run():void{
        let wss = new WebSocketServer({port: 5000});
        wss.on('connection', this.OnConnect.bind(this));
        Logger.log("Running...", healty);
    }

    private OnConnect(ws:WebSocket, req:any):void{
        let t = this;
        function msg(data:string){
            Logger.log('Received join request: ' + data, info);
            let m = JSON.parse(data) as JoinMessage;
            ws.off('message', msg);

            if(!m.room || !m.username){
                ws.close();
                return;
            }

            t.AddClientToRoom(ws, m.room, m.username);
        }

        ws.on('message', msg);
    }

    private AddClientToRoom(ws:WebSocket, roomname:string, username:string):void{
        let room = this.Rooms.get(roomname);

        if(room === undefined){
            room = new Room(roomname, this);
            this.Rooms.set(roomname, room);
        }

        let cli = new Client(ws, username);
        if(!room.HasName(username)){
            room.Join(cli, username);
        }else{
            cli.Error("Username taken");
        }
    }

    public RemoveEmptyRoom(roomname:string):void{
        this.Rooms.delete(roomname);
    }
}