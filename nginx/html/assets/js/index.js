import { Communication } from "./Communication.js"
import { getName, roomname } from "./Data.js";
import { Gui } from "./Gui.js";
import { RtcPeerManager } from "./RtcPeerManager.js";

window.onload = (function() {
    let gui = new Gui(document.getElementById("users"));
    let rtc = new RtcPeerManager();

    let userLeaveCallbacks = [
        rtc.destroyRtc.bind(rtc),
        gui.removeUser.bind(gui)
    ]

    let addSourceCallbacks = [
        rtc.addSource.bind(rtc),
        gui.addSourceStream.bind(gui)
    ]

    let removeSourceCallbacks = [
        rtc.removeSource.bind(rtc),
        gui.removeSourceStream.bind(gui)
    ]

    let callbacks = {
        doRtc: rtc.doRTC.bind(rtc),
        gotRTC: rtc.acceptRTC.bind(rtc),
        renderUsers: gui.drawUsers.bind(gui),
        renderUser: gui.drawUser.bind(gui),
        onVideoStream: gui.setStream.bind(gui),
        onUserLeave: (u) => userLeaveCallbacks.forEach(c => c(u)),
        onAddSource: (s) => addSourceCallbacks.forEach(c => c(s)),
        onRemoveSource: (s) => removeSourceCallbacks.forEach(c => c(s)),
        updateUserState: gui.updateUserState.bind(gui),
        onStoppedStreaming: rtc.stoppedStreaming.bind(rtc)
    }

    let name = getName();
    let comms = new Communication(roomname, name, callbacks);
    window.rtc = rtc;
    window.comms = comms;
    window.callbacks = callbacks;

    callbacks.sendNegotiate = (msg, user) => comms.sendRtc(msg, user);

    comms.connect();
})

window.addEventListener("click", ()=>{Array.from(document.getElementsByTagName("video")).forEach(v =>{try{v.play();}catch{}});})