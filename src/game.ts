import { currentPositions } from "./interfaces"
import { Renderer, diceButtonElement, playerPieceElement, playerPiecesElements, resetButtonElement } from "./renderer";
import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS } from "./constants";
import { Observable, Subscription, combineLatest, concatMap, debounceTime, distinctUntilChanged, filter, finalize, from, fromEvent, interval, map, mergeMap, of, switchMap, takeUntil, takeWhile, tap } from "rxjs";
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
    startGame()
    {
        console.log('a');
        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();
        this.resetGame();
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
    onDiceClick()
    {
        console.log('dice is clicked');
        this.diceValue=Math.floor(Math.random() * 6) + 1;
        this.state=STATE.DICE_ROLLED;
        this.checkForEligiblePieces();
    }
    listenResetClick(){
        const resetClick$ = fromEvent(resetButtonElement,'click').pipe(
            tap(()=>{
                this.resetGame();
            })
        ).subscribe();
    }
    resetGame(){
        const resetGame$ = of(null).pipe(
            switchMap(() => {
              this.currentPositions = structuredClone(BASE_POSITIONS);
          
              return combineLatest(
                PLAYERS.map(player => from([0, 1, 2, 3]).pipe(
                  map(piece => {
                    if(player=='P1'||player==='P2')
                    this.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]);
                  })
                ))
              );
            })
        );
        resetGame$.subscribe({
            complete: () => {
              // Sve figure su postavljene na početne pozicije
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
                        if(this.state===STATE.DICE_ROLLED)
                        return this.movePiece(player, pieceNumber, this.diceValue); // Poziv funkcije movePiece sa player i brojem piece-a
                        else return of(null);
                    }
                }
                return of(null); // Vraćamo null kao rezultat ako nema akcije
            })
        );
    }
    setPiecePosition(player:'P1'|'P2',piece:number,newPosition:number){
        console.log(player,piece,newPosition);
        this.currentPositions[player][piece]=newPosition;
        Renderer.setPiecePosition(player,piece,newPosition);
       }
       movePiece(player: 'P1' | 'P2', piece: number, moveBy: number) {
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
                       { alert(`Player ${player} won`); this.resetGame();}
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
       incrementPiecePosition(player:'P1'|'P2',piece:number){
        this.setPiecePosition(player,piece,this.getIncrementedPosition(player,piece))
       }
       getIncrementedPosition(player:'P1'|'P2',piece:number){
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
    getEligiblePieces(player:'P1'|'P2'):number[]
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
    hasPlayerWon(player:'P1'|'P2'){
        return [0,1,2,3].every(piece=>this.currentPositions[player][piece]===HOME_POSITIONS[player])
       }
       checkForKill(player:'P1'|'P2',piece:number)
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
}