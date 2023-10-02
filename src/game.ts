import { Player, Players, currentPositions } from "./interfaces"
import { Renderer, diceButtonElement, playerPieceElement, playerPiecesElements, resetButtonElement } from "./renderer";
import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS,URL } from "./constants";
import { Observable, Subscription, catchError, combineLatest, concatMap, debounceTime, distinctUntilChanged, filter, finalize, from, fromEvent, interval, map, merge, mergeMap, of, switchMap, takeUntil, takeWhile, tap, zip } from "rxjs";
export class Game{
   
    startGame()
    {
       
        this.listenDiceClick().subscribe(()=>this.onDiceClick()); 
        this.listenPieceClick().subscribe();
        const resetButtonClick$ =this.listenResetClick();
        const appStart$ = of(null);
         const resetEvents$ = merge(appStart$,resetButtonClick$);
        resetEvents$.pipe(
        tap(() => this.setStartPosition("P1")),
        tap(() => this.setStartPosition("P2"))
    ).subscribe();
    }
    getPlayers(player:Players):Observable<Player>{
        const promise = fetch(URL+player).then(response=>{
            if(!response.ok){
                throw new Error("Player not found")
            }
            else
            {
                return response.json();
            }
        }).catch(err=>console.log(err))
        return from(promise);
    }
    listenDiceClick():Observable<Event>
    {
        const buttonClick$ = fromEvent(diceButtonElement,'click').pipe(
            debounceTime(300),
            
        );
            return buttonClick$;
    }
    listenResetClick():Observable<Event>{
        const resetClick$ = fromEvent(resetButtonElement,'click').pipe(
            tap(()=>{
                this.setStartPosition("P1"),
                this.setStartPosition("P2");
            })
        )
        return resetClick$;
    }
  

    setStartPosition(player:Players) {
        const player$ = from([player]);
        const piece$ = from([0, 1, 2, 3]);
    
        
        const resetGame$ = combineLatest([player$, piece$]).pipe(
            map(([player, piece]) => {
                 {
                    this.currentPositions = structuredClone(BASE_POSITIONS);
                    
                   
                        this.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]);
                    
                }
                return null; 
            })
        );
    
        resetGame$.subscribe({
            complete: () => {
                this.turn = 0;
                this.state = STATE.DICE_NOT_ROLLED;
               
            }
        });
    }      
      
    listenPieceClick(){
        const pieceClick$ = fromEvent(playerPieceElement,'click').pipe(
            filter((event)=>{
                const target = event.target as HTMLElement;
                return target.classList.contains('player-piece');
            }),
            map((event)=>{
                const target = event.target as HTMLElement;
                const player = target.getAttribute('player-id');
                const piece = target.getAttribute('piece');
                return{player,piece};
            }),
            switchMap(({player,piece})=>{
                return this.handlePieceClick(player,piece);
            })
        )
        return pieceClick$;
        
    }
    handlePieceClick(player: string, piece: string) {
        return of(player).pipe(
            map(() => parseInt(piece, 10)),
            switchMap((pieceNumber) => {
                if (
                    (this.turn===0&&player==="P1")||(this.turn==1&&player==="P2")
                ) {
                    const currentPosition = this.currentPositions[player][pieceNumber];
                    if (BASE_POSITIONS[player].includes(currentPosition) &&this.diceValue===6 && this.state===STATE.DICE_ROLLED) {
                        
                        this.setPiecePosition(player, pieceNumber, START_POSITIONS[player]);
                        this.state = STATE.DICE_NOT_ROLLED;
                    } else {
                        
                        if(this.state===STATE.DICE_ROLLED&&!BASE_POSITIONS[player].includes(currentPosition))
                        return this.movePiece(player, pieceNumber, this.diceValue);
                        else return of(null);
                    }
                }
                return of(null);
            })
        );
    }
    setPiecePosition(player:Players,piece:number,newPosition:number){
        
        this.currentPositions[player][piece]=newPosition;
        Renderer.setPiecePosition(player,piece,newPosition);
       }
       movePiece(player: Players, piece: number, moveBy: number) {
        const interval$ = interval(200).pipe(
            takeWhile(() => moveBy > 0),
            concatMap(() => {
                this.incrementPiecePosition(player, piece);
                moveBy--;
                return of(null);
            }),
            finalize(() => {
                if (moveBy === 0) {
                    if(this.hasPlayerWon(player))
                       { 
                        
                        const playerType: Players = this._turn === 0 ? "P1" : "P2";
                            this.getPlayers(playerType).subscribe((response)=>{
                                
                                alert(`Player ${playerType} has won and got ${2*response.bet}`);
                              })
                       
                       this.setStartPosition("P1");
                       this.setStartPosition("P2");}
                       else if(this.checkForKill(player,piece)||this.diceValue === 6)
                       {
                            this.state = STATE.DICE_NOT_ROLLED;
                       }
                       else
                    this.changeTurn(); 
                }
            })
        );
        return interval$; 
    }
    getEligiblePieces(player: Players): Observable<number[]> {
        return of([0, 1, 2, 3]).pipe(
          map(pieces => pieces.filter(piece => {
            const currentPosition = this.currentPositions[player][piece];
      
            if (currentPosition === HOME_POSITIONS[player]) {
              return false;
            }
            if (BASE_POSITIONS[player].includes(currentPosition) && this.diceValue !== 6) {
              return false;
            }
            if (HOME_ENTRANCE[player].includes(currentPosition) && this._diceValue > HOME_POSITIONS[player] - currentPosition) {
              return false;
            }
            return true;
          }))
        );
      }
       incrementPiecePosition(player:Players,piece:number){
        this.setPiecePosition(player,piece,this.getIncrementedPosition(player,piece))
       }
       getIncrementedPosition(player:Players,piece:number){
        const currentPosition = this.currentPositions[player][piece];
       
        if(currentPosition===TURNING_POINTS[player]){
            return HOME_ENTRANCE[player][0];
        }
       else if(currentPosition===51){
            return 0;
        }
       
            return currentPosition+1;
       }
       changeTurn()
    {
        this.turn=this.turn===0?1:0;
            this.state=STATE.DICE_NOT_ROLLED;
    }
    checkForEligiblePieces()
    {
        const player = PLAYERS[this.turn];
        if(player ==='P1'||player==='P2')
        {this.getEligiblePieces(player).subscribe((players)=>{
            const eligiblePieces:number[]=players;
            console.log(eligiblePieces);
            if(eligiblePieces.length){
                Renderer.highlightPieces(player,eligiblePieces);
            }
            else{
                this.changeTurn();
            }
        });
    }
    }




    hasPlayerWon(player:Players){
        return [0,1].every(piece=>this.currentPositions[player][piece]===HOME_POSITIONS[player])
       }
       checkForKill(player:Players,piece:number)
   {
    const currentPosition = this.currentPositions[player][piece];
    const opponent = player ==='P1'?'P2':'P1';
    let kill = false;
    [0,1,2,3].forEach(piece=>{
        const opponentPosition = this.currentPositions[opponent][piece];
        if(currentPosition===opponentPosition&&!SAFE_POSITIONS.includes(currentPosition))
        {
            this.setPiecePosition(opponent,piece,BASE_POSITIONS[opponent][piece]);
            kill=true;
        }
    })
    return kill;
   }
   onDiceClick()
   {
      
       this.diceValue=Math.floor(Math.random() * 6) + 1;
       this.state=STATE.DICE_ROLLED;
       this.checkForEligiblePieces();
      
   }
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
_turn:number; 
get turn(){
    return this._turn;
}
set turn(value){
    this._turn = value;
    Renderer.setTurn(value);
}
_state : string ; 
get state(){
    return this._state;
}
set state(value){
    this._state= value ; 
    if(value === STATE.DICE_NOT_ROLLED)
    {
        Renderer.enableDice();
        Renderer.unhighlightPieces();
    }
    else
    {
        Renderer.disableDice();
    }
}
}