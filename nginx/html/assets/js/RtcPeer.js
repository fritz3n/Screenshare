export const States = {
    WillSendOffer: 0,
    WillReceiveOffer: 1,
    WillSendAnswer: 2,
    WillReceiveAnswer: 3,
    Finished: 4
}

const config = {'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
}

const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  };
  

export class RtcPeer {
    constructor(remoteName, isCalling){
        this.connection = new RTCPeerConnection(config);
        this.connection.onconnectionstatechange = this.onStateChange.bind(this);
        this.connection.onicegatheringstatechange = () => console.log("%c" + this.remoteName + " ICEGatheringstatechange: " + this.connection.iceGatheringState, 'background: #222; color: #ba55da');
        this.connection.onsignalingstatechange = () => console.log("%c" + this.remoteName + " Signalingstatechange: " + this.connection.signalingState, 'background: #222; color: #55bada');
        this.connection.oniceconnectionstatechange = () => console.log("%c" + this.remoteName + " ICEconnectionstatechange: " + this.connection.iceConnectionState, 'background: #222; color: #00ff00');
        this.connection.onnegotiationneeded = this.renegotiate.bind(this);
        this.connection.ontrack = this.onTrack.bind(this);
        this.connection.onicecandidate = this.sendIce.bind(this);

        this.senders = new Map();
        this.destroyed = false;

        this.remoteName = remoteName;
        this.onStateChanged = undefined;
        this.onFinished = undefined;
        this.firstFinished = true;
        if(isCalling)
            this.changeState(States.WillSendOffer);
        else
            this.changeState(States.WillReceiveOffer);
        this.finished = false;
        
        console.log("%c" + this.remoteName + " CREATED", "color: DeepPink;");
    }

    addStream(stream){
        if(this.destroyed)
            return;
        console.log(this.remoteName + ': adding stream ' + stream.id);
        stream.getTracks().forEach(track =>{ 
            let sender = this.connection.addTrack(track, stream);
            if(!this.senders.has(stream.id)){
                this.senders.set(stream.id, {
                    senders: [sender]
                });
            }else{
                this.senders.get(stream.id).senders.push(sender);
            }
        });
    }

    removeStream(stream){
        if(this.destroyed)
            return;
        console.log(this.remoteName + ': removing stream ' + stream.id);
        if(!this.senders.has(stream.id))
            return;
        let senders = this.senders.get(stream.id).senders;
        this.senders.delete(stream.id);

        senders.forEach(sender => this.connection.removeTrack(sender));
    }

    async getOffer(){
        let offer = await this.connection.createOffer(offerOptions);
        await this.connection.setLocalDescription(offer);

        this.changeState(States.WillReceiveAnswer);
        return offer;
    }

    async handleMessage(msg){
        if(this.destroyed)
            return;
        if(msg.type === 'ice'){
            this.receiveIce(msg.ice);
            return;
        }

        switch(msg.type){
            case "ice":
                this.receiveIce(msg.ice);
                return;
            case "offer":
                return await this.receiveOffer(msg);
            case "answer":
                return await this.receiveAnswer(msg);
            case 'error':
                window.location.reload();
                break;
        }
    }

    async receiveOffer(msg){
        if(this.destroyed)
            return;
        this.changeState(States.WillSendAnswer);
        await this.connection.setRemoteDescription(msg);
        console.log(this.connection.signalingState);
        let answer = await this.connection.createAnswer(offerOptions);
        await this.connection.setLocalDescription(answer);

        this.changeState(States.Finished);
        return answer;
    }

    async receiveAnswer(msg){
        if(this.destroyed)
            return;
        try{
            await this.connection.setRemoteDescription(msg);
            this.changeState(States.Finished);
        }catch(e){
            console.log("%c" + this.remoteName + ' answer error: ' + e, "color:red;");
        }
    }

    onTrack(e){
        console.log("%c" + this.remoteName + ' received ' + e.track.kind + ' track', 'background: #222; color: #0055ff');
        window.callbacks.onVideoStream(this.remoteName, e.track, e.streams)
    }

    async sendIce(event){
        if(this.destroyed)
            return;
        window.comms.sendRtc({type: 'ice', ice: event.candidate}, this.remoteName);
        if(!event.candidate){
            await this.renegotiate();
        }else{
            window.comms.sendRtc({type: 'ice', ice: event.candidate}, this.remoteName);

        }
    }

    async receiveIce(ice){
        if(this.destroyed)
            return;
        try{
            await this.connection.addIceCandidate(ice);
        }catch(e){
            console.log("%c" + this.remoteName + ' ice error: ' + e, "color:red;");
        }
    }

    async renegotiate(){
        if(this.destroyed)
            return;
        console.log(this.remoteName + ": renegotiating");
        let offer = await this.getOffer()
        window.comms.sendRtc(offer, this.remoteName);
        this.changeState(States.WillReceiveAnswer);
    }

    onStateChange(){
        if(this.destroyed)
            return;

        console.log("%c" + this.remoteName + " Connectionstatechange: " + this.connection.connectionState, 'background: #222; color: #bada55');

        let state = {
            new: {color: "primary"},
            connecting: {color: "info"},
            connected: {color: "success", type: "icon", icon: "check"},
            disconnected: {color: "danger", type: "grow"},
            failed: {color: "danger", type: "grow"},
            closed: null
        };
        window.callbacks.updateUserState(this.remoteName, state[this.connection.connectionState]);
    }

    async destroy(){
        this.destroyed = true;
        this.connection.close();
        window.callbacks.updateUserState(this.remoteName, null);
        console.log("%c" + this.remoteName + " DESTROYED", "color: DeepPink;");
    }

    changeState(state){
        console.log(this.remoteName + ': rtc connection state ' + state);
        this.state = state;
        if(state === States.Finished)
            this.finished = true;
        if(this.onStateChanged !== undefined)
            this.onStateChanged(this.remoteName, state);
        if(this.finished && this.firstFinished && this.onFinished !== undefined){
            this.onFinished(this, this.remoteName);
            this.firstFinished = false;
        }
    }
}