import { fromEvent } from "rxjs";
import { COORDINATES_MAP, PLAYERS, STEP_LENGTH } from "./constants";
const diceButtonElement = document.querySelector('#dice-btn');
const resetButtonElement = document.querySelector('button#reset-btn');
const playerPieceElement = document.querySelector('.player-pieces');
const playerPiecesElements = {
    P1:document.querySelectorAll('[player-id="P1"].player-piece'),
    P2:document.querySelectorAll('[player-id="P2"].player-piece')
}
export class Renderer {
    static listenDiceClick(callback:any){
        const clickObservable = fromEvent(diceButtonElement, 'click');
    
        clickObservable.subscribe(callback);
    }
    static listenResetClick(callback:any)
    {
        const clickObservable = fromEvent(resetButtonElement, 'click');
    
        clickObservable.subscribe(callback);
    }
    static listenPieceClick(callback:any)
    {
        const clickObservable = fromEvent(playerPieceElement, 'click');
    
        clickObservable.subscribe(callback);
    }
    static setPiecePosition(player:'P1'|'P2',piece:number,newPosition:number)
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

        document.querySelector(`[player-id="${player}"].player-base`).classList.add('highlight');
    }
}
