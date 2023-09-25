import { currentPositions } from "./interfaces"
import { Renderer } from "./renderer";

export class Game{
    currentPositions : currentPositions= {
        P1:[],
        P2:[]
    }
    _diceValue : number ;
    get diceValue(){
        return this._diceValue;
    } 
    set diceValue(value){
        this._diceValue = value;
        Renderer.setDiceValue(value);
    }
    constructor(){
        this.diceValue=4;
        this.turn=1;
    }
    _turn:number; 
    get turn(){
        return this._turn;
    }
    set turn(value){
        this._turn = value;
        Renderer.setTurn(value);
    }
}