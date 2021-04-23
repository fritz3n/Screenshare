export class Gui{
    constructor(elm){
        this.userList = new Map();
        this.sourceList = new Map();
        this.selectedQueue = [];
        this.selectedName = null;
        this.selectedMuted = null;

        this.userDiv = elm;
        this.sourcesDiv = document.getElementById("sources");
        this.selectedVideoName = document.getElementById("selectedVideoName");
        this.selectedVideo = document.getElementById("selectedVideo");
        this.selectedVideo.ondblclick = this.fullscreen.bind(this);
        
        this.selectedContainer = document.getElementById("selectedContainer");
        this.fullscreenButton = document.getElementById("fullscreenButton");
        this.fullscreenButton.onclick = this.fullscreen.bind(this);

        this.volumeControl = document.getElementById("volume");
        this.volumeControl.oninput = () => this.selectedVideo.volume = this.volumeControl.value / 100;

        this.modal = new bootstrap.Modal(document.getElementById('cameraModal'));
        this.modalCamSelect = document.getElementById("modalCamera");
        this.modalMicSelect = document.getElementById("modalMicrophone");
        this.modalSaveButton = document.getElementById("modalSave");
        this.modalSaveButton.onclick = this.modalSave.bind(this);

        document.getElementById("addButton").onclick = this.newSourceDisplay.bind(this);
        document.getElementById("displayAddButton").onclick = this.newSourceDisplay.bind(this);
        document.getElementById("videoAddButton").onclick = this.newSourceCamera.bind(this);
    }

    async newSourceDisplay(){
        const stream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true});
        console.log('Received local stream');
        window.callbacks.onAddSource(stream);
    }

    async newSourceCamera(){
        let perm = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        perm.getTracks().forEach(t => t.stop()); // get permission so we can user the enumeratemediadvices api

        let devices = await navigator.mediaDevices.enumerateDevices();
        let audioDevices = devices.filter(d => d.kind === "audioinput");
        let videoDevices = devices.filter(d => d.kind === "videoinput");

        this.modalMicSelect.innerHTML = "";
        let option = document.createElement("option");
        option.value = "none";
        option.text = "None";
        this.modalMicSelect.append(option);
        audioDevices.forEach(d => {
            let option = document.createElement("option");
            option.value = d.deviceId;
            option.text = d.label;
            this.modalMicSelect.append(option);
        });

        this.modalCamSelect.innerHTML = "";
        videoDevices.forEach(d => {
            let option = document.createElement("option");
            option.value = d.deviceId;
            option.text = d.label;
            this.modalCamSelect.append(option);
        });

        this.modal.show();
    }

    async modalSave(){
        this.modal.hide();

        let video = this.modalCamSelect.value;
        let audio = this.modalMicSelect.value;

        let stream;
        if(audio === "none"){
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    width: { min: 1280, ideal: 1920, max: 1920 },
                    height: { min: 720, ideal: 1080, max: 1080 },
                    deviceId: video
                }
            });
        }else{
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {deviceId: audio},
                video: {
                    width: { min: 1280, ideal: 1920, max: 1920 },
                    height: { min: 720, ideal: 1080, max: 1080 },
                    deviceId: video
                }
            });
        }
        console.log('Received local stream');
        window.callbacks.onAddSource(stream);
    }

    drawUsers(users){
        let t = this;
        users.forEach( (user) => {
            t.drawUser(user);
        });
    }

    updateUserState(user, state){
        if(!this.userList.has(user))
            return;
        let info = this.userList.get(user);
        info.spinner.classList.remove(...info.spinner.classList);

        if(state){
            let type = (state.type ? state.type : "border");
            if(type === "icon"){
                let icon = state.icon;
                info.spinner.classList.add("text-" + state.color, "h5", "m-0", "float-end", "bi", "bi-" + icon);
            }else
                info.spinner.classList.add("spinner-" + type, "text-" + state.color, "float-end", "spinner-" + type + "-sm");
        }
        else
            info.spinner.classList.add("d-none");
        
    }

    drawUser(user){
        if(!this.userList.has(user)){
            let div = document.createElement('div');
            div.classList.add("card");
            let nametag = document.createElement('div');
            nametag.innerText = user;
            nametag.classList.add("card-header")

            let spinner = document.createElement("div");
            spinner.classList.add("d-none");
            nametag.append(spinner);
            div.append(nametag);

            this.userDiv.append(div);
            this.userList.set(user, {
                videos: [],
                div: div,
                spinner: spinner
            });
        }
    }

    fullscreen(){
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
        } else {
            this.selectedContainer.requestFullscreen();
            this.fullscreenButton.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
        }
    }

    unselectVideo(stream){
        const index = this.selectedQueue.findIndex(s => s.stream.id === stream.id);
        if (index > -1) {
            this.selectedQueue.splice(index, 1);
        }
        if(this.selectedVideo.srcObject && this.selectedVideo.srcObject.id === stream.id){
            let newStream = this.selectedQueue.pop();
            if(newStream){
                this.selectedVideo.srcObject = newStream.stream;
                this.volumeControl.disabled = this.selectedMuted = this.selectedVideo.muted = newStream.muted || newStream.getAudioTracks().length === 0;
                this.selectedVideoName.innerText = this.selectedName = newStream.name;
            }else{
                this.selectedVideo.srcObject = null;
                this.selectedContainer.classList.remove("selected");
            }
        }
    }

    selectVideo(name, stream, muted, maybe = false){
        if(maybe && this.streamSelected()){
            this.selectedQueue.push({name, stream, muted});
        }else{
            if(this.selectedVideo.srcObject)
                this.selectedQueue.push({
                    name: this.selectedName, 
                    stream: this.selectedVideo.srcObject, 
                    muted: this.selectedMuted
                });
            
            if(this.selectedVideo.srcObject !== stream){ // only change if needed, to remove flicker
                this.selectedVideo.srcObject = stream;
            }
            try{video.play();}catch{}
            this.volumeControl.disabled = this.selectedMuted = this.selectedVideo.muted = muted  || stream.getAudioTracks().length === 0;
            this.selectedVideoName.innerText = this.selectedName = name;
            this.selectedContainer.classList.add("selected");
        }
    }

    streamSelected(){
        return this.selectedVideo.srcObject != null;
    }

    removeUser(user){
        if(this.userList.has(user)){
            let video = this.userList.get(user);
            video.div.remove();
            this.userList.delete(user);
        }
    }

    removeVideo(user, stream){
        if(!this.userList.has(user))
            return;
        let info = this.userList.get(user);
        if(info.videos.some(v => v.id === stream.id)){
            let video = info.videos.find(v => v.id === stream.id);
            video.container.remove();
            this.unselectVideo(video.stream);
        }
    }

    addVideo(user, stream){
        if(!this.userList.has(user))
            return;
        let info = this.userList.get(user);
        
        let card = document.createElement("div");
        card.classList.add("card", "m-1");

        let container = document.createElement("div");
        container.classList.add("ratio", "ratio-16x9");

        container.onclick = () => this.selectVideo(user + "'s stream", stream, false);

        let video = document.createElement('video');
        video.autoplay = true;
        video.controls = false;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        try{video.play();}catch{}

        stream.oninactive = console.log;
        stream.inactive = console.log;
        stream.onremovetrack = console.log;
        
        stream.onremovetrack = stream.oninactive = () => {
            console.log(user + ": removed stream " + stream.id);
            this.removeVideo(user, stream);
        };

        container.append(video);
        card.append(container);
        info.div.append(card);
        info.videos.push({
            id: stream.id,
            video: video,
            stream: stream,
            container: card
        });
        
        this.selectVideo(user + "'s stream", stream, false, true);
    }

    setStream(user, track, streams){
        let stream = streams[0];
        let video = this.userList.get(user);

        if(video.videos.some((v) => v.id === stream.id))
            video.videos.find((v) => v.id === stream.id).video.srcObject = stream;
        else
            this.addVideo(user, stream);
    }

    addSourceStream(stream) {
        if(this.sourceList.has(stream.id))
            return;
        
        let container = document.createElement("div");
        container.classList.add("col-6", "col-md-4", "col-lg-3", "col-xl-2", "v-container");

        container.onclick = () => this.selectVideo("Your video", stream, true);
        
        let card = document.createElement("div");
        card.classList.add("card",);
        
        let ratio = document.createElement("div");
        ratio.classList.add("ratio", "ratio-16x9");

        let video = document.createElement('video');
        video.autoplay = true;
        video.controls = false;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        try{video.play();}catch{}

        let closeButton = document.createElement("i");
        closeButton.classList.add("bi", "bi-x", "closeButton", "text-center");
        closeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.callbacks.onRemoveSource(stream);
        }


        stream.oninactive = console.log;
        stream.inactive = console.log;
        stream.onremovetrack = console.log;

        ratio.append(video);
        card.append(ratio);
        container.append(card);
        container.append(closeButton);

        this.sourceList.set(stream.id, {
            video: video,
            stream: stream,
            container: container
        });

        this.sourcesDiv.prepend(container);
        this.selectVideo("Your video", stream, true, true);
    }

    removeSourceStream(stream){
        if(!this.sourceList.has(stream.id))
            return;
        let info = this.sourceList.get(stream.id);
        this.sourceList.delete(stream.id);
        info.stream.getTracks().forEach(t => t.stop());
        info.container.remove();
        this.unselectVideo(info.stream);
    }
}