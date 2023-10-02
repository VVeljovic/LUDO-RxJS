export interface currentPositions  {
    P1:number[],
    P2:number[]
}
export interface Player {
    id:Players,
    bet:number
}
export type Players = "P1" | "P2";