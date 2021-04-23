import { names } from "./first-names.js";

export const roomname = window.location.search !== "" ? window.location.search : window.location.pathname.substr(1);

export function getName(){
    //try to get name form disk
    let dname = window.localStorage.getItem('name');
    //let dname;
    if(!dname){
        // Only request the names if it isn't saved
        
        let prename = names[Math.round(Math.random()*names.length)]

        dname = (prompt("Please enter your name", prename) || prename).trim() + " #" + Math.round(Math.random()*10000);
    }
    document.getElementById("name").innerText = dname;
    window.localStorage.setItem('name', dname);
    return dname;
}