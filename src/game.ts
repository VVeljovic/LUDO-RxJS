import { currentPositions } from "./interfaces"
import { Renderer, diceButtonElement, playerPieceElement, playerPiecesElements, resetButtonElement } from "./renderer";
import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS } from "./constants";
import { Observable, Subscription, concatMap, filter, from, fromEvent, interval, map, mergeMap, of, switchMap, takeUntil, takeWhile, tap } from "rxjs";
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
    constructor(){
        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();
        this.resetGame.subscribe();
        
    }
    listenDiceClick(){
      
       const diceClickObservable = fromEvent(diceButtonElement, 'click').pipe(
        map(() => Math.floor(Math.random() * 7))
      );
  
      diceClickObservable.subscribe((diceValue) => {
        console.log('dice clicked');
        this.diceValue = diceValue;
        this.state = STATE.DICE_ROLLED;
  
        this.checkForEligiblePieces();
      });
    
    }
    onDiceClick(){
        console.log('dice clicked');
        this.diceValue=Math.floor(Math.random()*7);
        this.state = STATE.DICE_ROLLED;

        this.checkForEligiblePieces();
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
    changeTurn()
    {
        this.turn=this.turn===0?1:0;
            this.state=STATE.DICE_NOT_ROLLED;
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
    listenResetClick(){
        const resetClickObservable = fromEvent(resetButtonElement, 'click').pipe(
            tap(() => {
              console.log('reset button clicked');
              this.resetGame.subscribe();
            })
          );
      
          resetClickObservable.subscribe();
        
    }
    resetGame = new Observable<void>((observer) => {
        console.log('reset game');
        this.currentPositions = structuredClone(BASE_POSITIONS);
      
        // Iteriramo kroz PLAYERS i koristimo mergeMap za obradu svakog igrača asinhrono
        from(PLAYERS).pipe(
          mergeMap((player) =>
            // Generišemo brojeve od 0 do 3 za svakog igrača
            from([0, 1, 2, 3]).pipe(
              // Ovde možete dodati logiku za postavljanje pozicija igrača
              map((piece) => {
                if (player === 'P1' || player === 'P2') {
                  this.setPiecePosition(player, piece, this.currentPositions[player][piece]);
                }
              })
            )
          )
        ).subscribe({
          complete: () => {
            // Kada su sve operacije završene, postavite ostala stanja
            this.turn = 0;
            this.state = STATE.DICE_NOT_ROLLED;
            // Emitujemo 'complete' događaj kada je resetiranje igre završeno
            observer.complete();
          },
        });
      });
   listenPieceClick(){
    const pieceClickObservable = fromEvent(playerPieceElement, 'click').pipe(
        filter((event) => {
          const target = event.target as HTMLElement;
          return target.classList.contains('player-piece');
        }),
        map((event) => {
          const target = event.target as HTMLElement;
          const player = target.getAttribute('player-id');
          const piece = target.getAttribute('piece');
          return { player, piece };
        }),
        switchMap(({ player, piece }) => {
          return this.handlePieceClick(player, piece);
        }),
        takeUntil(fromEvent(resetButtonElement, 'click'))
      );
  
      pieceClickObservable.subscribe();
   }
   onPieceClick(event:Event){
    const target = event.target as HTMLElement;
    if(!target.classList.contains('player-piece')){
        return;
    }
    console.log('piece clicked');
    const player = target.getAttribute('player-id');
    const piece = target.getAttribute('piece');
    this.handlePieceClick(player,piece);
   }
   handlePieceClick(player: string, piece: string) {
    return new Observable<void>((observer) => {
      console.log(player, piece);
      const pieceNum: number = parseInt(piece, 10);
      if (player === 'P1' || player === 'P2') {
        const currentPosition = this.currentPositions[player][pieceNum];
        if (BASE_POSITIONS[player].includes(currentPosition)) {
          this.setPiecePosition(player, pieceNum, START_POSITIONS[player]);
          this.state = STATE.DICE_NOT_ROLLED;
          observer.complete();
        } else {
          Renderer.unhighlightPieces();
          this.movePiece(player, pieceNum, this.diceValue).subscribe({
            complete: () => {
              observer.complete();
            },
          });
        }
      } else {
        observer.complete();
      }
    });
  }
   setPiecePosition(player:'P1'|'P2',piece:number,newPosition:number){
    this.currentPositions[player][piece]=newPosition;
    Renderer.setPiecePosition(player,piece,newPosition);
   }
   movePiece(player: 'P1' | 'P2', piece: number, moveBy: number): Observable<void> {
    return new Observable<void>((observer) => {
      const interval$ = interval(200).pipe(
        takeWhile(() => moveBy > 0),
        concatMap(() => {
          this.incrementPiecePosition(player, piece);
          moveBy--;

          if (moveBy === 0) {
            if (this.hasPlayerWon(player)) {
              alert(`Player:${player} has won!`);
              this.resetGame.subscribe({
                complete: () => {
                  observer.complete();
                },
              });
            } else {
              const isKill = this.checkForKill(player, piece);
              if (isKill || this.diceValue === 6) {
                this.state = STATE.DICE_NOT_ROLLED;
              }
              this.changeTurn();
              observer.complete();
            }
          }
          return of(null);
        })
      );

      this.movePieceSubscription = interval$.subscribe();
    });
  }
  private movePieceSubscription: Subscription | undefined;
  // Dodajte metodu za otkazivanje pretplate ako je potrebno
  cancelMovePieceSubscription() {
    if (this.movePieceSubscription) {
      this.movePieceSubscription.unsubscribe();
    }
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
   hasPlayerWon(player:'P1'|'P2'){
    return [0,1,2,3].every(piece=>this.currentPositions[player][piece]===HOME_POSITIONS[player])
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
}

