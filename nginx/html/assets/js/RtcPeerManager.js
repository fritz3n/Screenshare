import {RtcPeer} from './RtcPeer.js';


export class RtcPeerManager
{
    constructor(callbacks){
        this.connections = new Map();
        this.sources = new Map();
        this.callbacks = callbacks;
        this.streaming = false;
    }

    async doRTC(user){
        if(! this.connections.has(user)){

            let con = new RtcPeer(user, true);
            this.connections.set(user, con);
            this.onRtcFinished(con);
            window.rtcClient = con;

            return await con.getOffer();
        }
    }

    async acceptRTC(user, offer){
        if(! this.connections.has(user)){
            let con = new RtcPeer(user, false);
            this.connections.set(user, con);
            con.onFinished = this.onRtcFinished.bind(this);
            window.rtcClient = con;
        }

        let con = this.connections.get(user);
        return await con.handleMessage(offer);
    }

    async stoppedStreaming(user){
        if(!this.streaming)
            this.destroyRtc(user);
    }

    async destroyRtc(user){
        if(this.connections.has(user)){
            this.connections.get(user).destroy();
            this.connections.delete(user);
        }
    }

    addSource(stream){
        if(this.sources.size === 0){
            this.streaming = true;
            window.comms.updateStream(true);
        }
        this.sources.set(stream.id, stream);
        this.connections.forEach(con => {
            con.addStream(stream);
        });
    }

    removeSource(stream){
        if(!this.sources.has(stream.id))
            return;
        this.sources.delete(stream.id, stream);
        this.connections.forEach(con => {
            con.removeStream(stream);
        });
        if(this.sources.size === 0){
            this.streaming = false;
            window.comms.updateStream(false);
        }
    }

    onRtcFinished(con, user){
        this.sources.forEach((stream, name) => {
            con.addStream(stream);
        });
    }
}