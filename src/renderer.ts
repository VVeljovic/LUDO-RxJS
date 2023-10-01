import { fromEvent } from "rxjs";
import { COORDINATES_MAP, PLAYERS, STEP_LENGTH } from "./constants";
import { Players } from "./interfaces";
export const diceButtonElement = document.querySelector('#dice-btn');
export const resetButtonElement = document.querySelector('button#reset-btn');
export const playerPieceElement = document.querySelector('.player-pieces');
export const playerPiecesElements = {
    P1:document.querySelectorAll('[player-id="P1"].player-piece'),
    P2:document.querySelectorAll('[player-id="P2"].player-piece')
}
export class Renderer {
  
    static setPiecePosition(player:Players,piece:number,newPosition:number)
    {
        if(!playerPiecesElements[player]||!playerPiecesElements[player][piece])
        {
            console.log('greska');
        }
        const [x, y] = COORDINATES_MAP[newPosition as keyof typeof COORDINATES_MAP];
        const pieceElement = playerPiecesElements[player][piece] as HTMLElement;
        pieceElement.style.top=y*STEP_LENGTH+'%';
        pieceElement.style.left=x*STEP_LENGTH+'%';
    }
    static setTurn(index:number)
    {
        if(index<0|| index>PLAYERS.length)
        {console.error('index out of bound');return;}
        const player = PLAYERS[index];
        const activePlayerSpan = document.querySelector('.active-player span') as HTMLElement;
        activePlayerSpan.innerText = player;
        const activePlayerBase = document.querySelector('.player-base.highlight');
        if(activePlayerBase)
        activePlayerBase.classList.remove('highlight');

        document.querySelector(`[player-id="${player}"].player-base`).classList.add('highlight');
    }
    static enableDice(){
        diceButtonElement.removeAttribute('disabled');
    }
    static disableDice(){
        diceButtonElement.setAttribute('disabled','');
    }
    static highlightPieces(player:Players, pieces:number[]){
        pieces.forEach(piece=>{
            const pieceElement = playerPiecesElements[player][piece];
            pieceElement.classList.add('highlight');
        })
    }
    static unhighlightPieces(){
        document.querySelectorAll('.player-piece.highlight').forEach(el=>{
            el.classList.remove('highlight');
        })
    }
    static setDiceValue(value:number){
        const el = document.querySelector('.dice-value') as HTMLElement;
        el.innerHTML=value.toString();
    }
}
