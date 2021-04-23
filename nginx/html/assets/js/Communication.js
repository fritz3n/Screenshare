export class Communication{
    
    constructor(room, username, callbacks){
        this.room = room;
        this.username = username;
        this.callbacks = callbacks;
        this.streamingStates = new Map();
    }
 
    connect(){
        this.ws = new WebSocket("wss://share.hllm.tk/wss");
        this.ws.onclose = this.onclose.bind(this);
        this.ws.onopen = function (){
            this.send({ 
                room: this.room,
                username: this.username,
            });
            console.log("Connected as " + this.username + " to room " + this.room)
        }.bind(this);
        this.ws.onmessage = this.onmessage.bind(this);
        setInterval(this.sendPing.bind(this), 1000)
    }

    sendPing(){
        this.send({type: 'ping'});
    }

    send(msg){
        if(msg.type != 'ping')
            console.log("[<]", msg);
        JSON.parse(JSON.stringify(msg));
        this.ws.send(JSON.stringify(msg));
    }

    onmessage(event){
        let data = event.data;
        let msg = JSON.parse(data);

        if(msg.type != 'pong')
            console.log('[>] ', msg);

        switch(msg.type){
            case 'error':
                alert(msg.message);
                window.location.reload();
                break;
            case 'join':
                console.log(msg.username);
                this.callbacks.renderUser(msg.username);
                this.streamingStates.set(msg.username, false);
                break;
            case 'userlist':
                let t = this;
                msg.users.forEach((u)=>{
                    if(u.streaming)
                        t.reqRTC(u.username)
                    this.streamingStates.set(u.username, u.streaming);
                });
                this.callbacks.renderUsers(msg.users.map(u => u.username));
                break;
            case 'resp-rtc':
                this.callbacks.gotRTC(msg.from, msg.rtc).then(answer => {
                    if(answer !== null && answer !== undefined)
                        this.sendRtc(answer, msg.from);
                });
                break;
            case 'get-rtc':
            	this.callbacks.doRtc(msg.from).then(answer => {
                    if(answer !== null && answer !== undefined)
                        this.sendRtc(answer, msg.from);
                });
                break;
            case 'set-stream':
                this.streamingStates.set(msg.username, msg.state);
                if(msg.state)
                    this.reqRTC(msg.username);
                else
                    window.callbacks.onStoppedStreaming(msg.username);
                break;
            case 'leave':
                console.log("user left: " + msg.username);
                window.callbacks.onUserLeave(msg.username);
                this.streamingStates.delete(msg.username);
                break;
            case 'pong':
                break;
            default:
                console.log(msg);
                debugger;
        }
    }

    sendRtc(data, user){
        this.send({
            type: 'resp-rtc',
            to: user,
            rtc: data
        });
    }

    reqRTC(username){
        this.send({
            type: 'get-rtc',
            username: username,
        });
    }

    updateStream(state){
        if(!state){
            this.streamingStates.forEach((state, user) => {
                if(!state)
                    window.callbacks.onStoppedStreaming(user);
            });
        }

        this.send({
            type: 'set-stream',
            state: state,
        });
    }

    onclose(){
        console.log("Reconnecting....");
        window.location.reload();
    }
}