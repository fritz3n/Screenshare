import { names } from "./first-names.js";

export const roomname = window.location.search !== "" ? window.location.search : window.location.pathname.substr(1);

export function getName(){
    //try to get name form disk
    let storedName = window.localStorage.getItem('name');
    if(!storedName){
        let randomName = names[Math.round(Math.random()*names.length)]

        storedName = (prompt("Please enter your name", randomName) || randomName).trim();
    }
    let name = storedName + " #" + Math.round(Math.random()*10000)
    document.getElementById("name").innerText = name;
    window.localStorage.setItem('name', storedName);
    return name;
}