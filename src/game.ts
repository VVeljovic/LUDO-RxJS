import { Player, Players, currentPositions } from "./interfaces"
import { Renderer, diceButtonElement, playerPieceElement, playerPiecesElements, resetButtonElement } from "./renderer";
import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS,URL } from "./constants";
import { Observable, Subscription, catchError, combineLatest, concatMap, debounceTime, distinctUntilChanged, filter, finalize, from, fromEvent, interval, map, merge, mergeMap, of, switchMap, takeUntil, takeWhile, tap } from "rxjs";
export class Game{
   
    startGame()
    {
        console.log('a');
        this.listenDiceClick();
        const resetButtonClick$ =this.listenResetClick();
        this.listenPieceClick();
        const appStart$ = of(null);
         const resetEvents$ = merge(appStart$,resetButtonClick$);

    
    resetEvents$.pipe(
        tap(() => this.resetGame())
    ).subscribe();

    }
    updatePlayer(player:string,newData:any):Observable<any>{
        return from(fetch(URL + player, {
            method: 'PATCH', 
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newData),
          })).pipe(
            switchMap((response) => {
              if (!response.ok) {
                throw new Error('Player data update failed');
              } else {
                console.log(response);
                return from(response.json());
              }
            }),
            catchError((error) => {
              console.error(error);
              throw error;
            })
          );
        }
    listenDiceClick()
    {
        const buttonClick$ = fromEvent(diceButtonElement,'click').pipe(
            debounceTime(300), //Ignorise brze uzastopne klikove
            distinctUntilChanged(),//Ignorisanje uzastopnih istih klikova
        );
            buttonClick$.subscribe(() => {
                this.onDiceClick();
            });
    }
    listenResetClick():Observable<Event>{
        const resetClick$ = fromEvent(resetButtonElement,'click').pipe(
            tap(()=>{
                this.resetGame();
            })
        )
        return resetClick$;
    }
    resetGame(){
        const player$ = from(PLAYERS as Players[]);
  const piece$ = from([0, 1, 2, 3]);

  const resetGame$ = merge(
    player$.pipe(
      mergeMap(player => piece$.pipe(
        map(piece => ({ player, piece }))
      ))
    )
  ).pipe(
    switchMap(({ player, piece }) => {
      this.currentPositions = structuredClone(BASE_POSITIONS);

      this.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]);
      return of(null);
    })
  );

  resetGame$.subscribe({
    complete: () => {
      this.turn = 0;
      this.state = STATE.DICE_NOT_ROLLED;
      console.log('Game reset completed.');
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
        pieceClick$.subscribe(()=>console.log('piece was clicked'));
    }
    handlePieceClick(player: string, piece: string) {
        return of(player).pipe(
            map(() => parseInt(piece, 10)), // Pretvaranje piece u broj
            switchMap((pieceNumber) => {
                if (player === 'P1' || player === 'P2') {
                    const currentPosition = this.currentPositions[player][pieceNumber];
                    if (BASE_POSITIONS[player].includes(currentPosition) &&this.diceValue===6 && this.state===STATE.DICE_ROLLED) {
                        // Ako je trenutna pozicija uključena u BASE_POSITIONS, postavite na START_POSITIONS
                        this.setPiecePosition(player, pieceNumber, START_POSITIONS[player]);
                        this.state = STATE.DICE_NOT_ROLLED;
                    } else {
                        // Inače, pozovite movePiece
                        if(this.state===STATE.DICE_ROLLED&&!BASE_POSITIONS[player].includes(currentPosition))
                        return this.movePiece(player, pieceNumber, this.diceValue); // Poziv funkcije movePiece sa player i brojem piece-a
                        else return of(null);
                    }
                }
                return of(null); // Vraćamo null kao rezultat ako nema akcije
            })
        );
    }
    setPiecePosition(player:Players,piece:number,newPosition:number){
        console.log(player,piece,newPosition);
        this.currentPositions[player][piece]=newPosition;
        Renderer.setPiecePosition(player,piece,newPosition);
       }
       movePiece(player: Players, piece: number, moveBy: number) {
        const interval$ = interval(200).pipe(
            takeWhile(() => moveBy > 0),
            concatMap(() => {
                this.incrementPiecePosition(player, piece);
                moveBy--;
                return of(null); // Vraćanje Observable sa null vrednošću
            }),
            finalize(() => {
                if (moveBy === 0) {
                    if(this.hasPlayerWon(player))
                       { alert(`Player ${player} won`); 
                       if(this._turn===0)
                       {  const p1 : Player ={
                           id:"P1",
                           numberOfSix:this.sum1
                          }
                          this.updatePlayer(p1.id,p1).subscribe(response=>
                            response.preventDefault()
                            
                            );
                       }
                       this.resetGame();}
                       else if(this.checkForKill(player,piece)||this.diceValue === 6)
                       {
                            this.state = STATE.DICE_NOT_ROLLED;
                       }
                       else
                    this.changeTurn(); // Poziv incrementTurn kada je moveBy === 0
                }
            })
        );
        return interval$; // Vraćanje Observable sa intervalom
    }
       incrementPiecePosition(player:Players,piece:number){
        this.setPiecePosition(player,piece,this.getIncrementedPosition(player,piece))
       }
       getIncrementedPosition(player:Players,piece:number){
        const currentPosition = this.currentPositions[player][piece];
        console.log(currentPosition);
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
        {const eligiblePieces:number[]=this.getEligiblePieces(player);
        if(eligiblePieces.length){
            Renderer.highlightPieces(player,eligiblePieces);
        }
        else{
            this.changeTurn();
        }
    }
    }
    getEligiblePieces(player:Players):number[]
    {
        return [0,1,2,3].filter(piece=>{
            const currentPosition = this.currentPositions[player][piece]
            if(currentPosition==HOME_POSITIONS[player]){
                return false;
            }
            if(BASE_POSITIONS[player].includes(currentPosition)&& this.diceValue!==6)
            {
                return false;
            }
            if(HOME_ENTRANCE[player].includes(currentPosition)&& this._diceValue>HOME_POSITIONS[player]-currentPosition){
                return false;
            }
            return true;
        })
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
       console.log('dice is clicked');
       this.diceValue=Math.floor(Math.random() * 6) + 1;
       if(this.diceValue===6 && this.turn===0)
       this.sum1=1;
       if(this.diceValue===6 && this.turn===1)
       this.sum2=1;
       console.log(this.sum1,this.sum2);
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
_sum1:number=0;
get sum1(){
    return this._sum1;
}
set sum1(value){
    this._sum1+=value;
}
_sum2:number=0;
get sum2(){
    return this._sum2;
}
set sum2(value){
    this._sum2+=value;
}
}