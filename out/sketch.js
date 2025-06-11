//#region Imports
var DrawUtils = p5Utils.DrawUtils;
//#endregion
//#region Globals
let board = new Board();
board.setPosition(Board.StartingPosition);
board.updateMoves();
let inCheck = board.playerInCheck(board.movingPlayer);
let selectedSquare;
const settings = {
    allowIllegalMoves: false
};
//#endregion
//#region Canvas
const WindowAspect = 1;
const MainFont = "Trebuchet MS";
function setup() {
    // Setup the canvas
    let canvasSize = p5Utils.CanvasUtils.aspectToSize(WindowAspect, windowWidth, windowHeight);
    createCanvas(canvasSize.x, canvasSize.y, document.getElementById("defaultCanvas0"));
}
function draw() {
    background("#c16d26");
    let gridSpacing = height / Board.NumRanks;
    // highlight king if in check
    if (inCheck) {
        push();
        fill("red");
        noStroke();
        let king = board.movingPlayer === PieceColor.Black ? board.blackKing : board.redKing;
        square(gridSpacing * king.file, gridSpacing * king.rank, gridSpacing);
        pop();
    }
    // highlight selected square
    if (selectedSquare) {
        push();
        fill("yellow");
        noStroke();
        square(gridSpacing * selectedSquare.file, gridSpacing * selectedSquare.rank, gridSpacing);
        pop();
    }
    board.draw(0, 0, height);
    // show legal moves
    if (selectedSquare && board.getPiece(selectedSquare.file, selectedSquare.rank).color === board.movingPlayer) {
        push();
        for (const move of board.moves) {
            if (move.fromFile == selectedSquare.file &&
                move.fromRank == selectedSquare.rank) {
                if (board.getPiece(move.toFile, move.toRank)) {
                    noFill();
                    stroke(0, 128);
                    strokeWeight(10);
                    circle((move.toFile + 0.5) * gridSpacing, (move.toRank + 0.5) * gridSpacing, 0.8 * gridSpacing);
                }
                else {
                    fill(0, 128);
                    noStroke();
                    circle((move.toFile + 0.5) * gridSpacing, (move.toRank + 0.5) * gridSpacing, 0.4 * gridSpacing);
                }
            }
        }
        pop();
    }
}
//#endregion
//#region Input
function mouseReleased() {
    let gridSpacing = height / Board.NumRanks;
    let file = Math.floor(mouseX / gridSpacing);
    let rank = Math.floor(mouseY / gridSpacing);
    let pSelectedSquare = selectedSquare ?
        { file: selectedSquare.file, rank: selectedSquare.rank } : null;
    if (!Board.positionInBounds(file, rank))
        selectedSquare = null;
    else if (file !== pSelectedSquare?.file ||
        rank !== pSelectedSquare?.rank)
        selectedSquare = { file, rank };
    else
        selectedSquare = null;
    if (pSelectedSquare && selectedSquare &&
        board.getPiece(pSelectedSquare.file, pSelectedSquare.rank).color === board.movingPlayer) {
        let move = new Move(pSelectedSquare.file, pSelectedSquare.rank, selectedSquare.file, selectedSquare.rank);
        if (settings.allowIllegalMoves || board.moves.some(m => m.equals(move))) {
            board.makeMove(move, true);
            board.switchTurn();
            board.updateMoves();
            inCheck = board.playerInCheck(board.movingPlayer);
        }
        selectedSquare = null;
    }
    if (selectedSquare && !board.getPiece(selectedSquare.file, selectedSquare.rank))
        selectedSquare = null;
}
// HTML input stuff
function switchTurn() {
    board.switchTurn();
    board.updateMoves();
    inCheck = board.playerInCheck(board.movingPlayer);
    selectedSquare = null;
}
function undoMove() {
    if (board.undoMove()) {
        board.switchTurn();
        board.updateMoves();
        inCheck = board.playerInCheck(board.movingPlayer);
        selectedSquare = null;
    }
}
function resetGame() {
    board.setPosition(Board.StartingPosition);
    board.movingPlayer = PieceColor.Red;
    board.updateMoves();
    inCheck = board.playerInCheck(board.movingPlayer);
    selectedSquare = null;
}
function setCustomPosition(fen) {
    board.setPosition(fen);
    board.movingPlayer = PieceColor.Red;
    board.updateMoves();
    inCheck = board.playerInCheck(board.movingPlayer);
    selectedSquare = null;
}
function setAllowIllegalMoves(value) {
    settings.allowIllegalMoves = value;
}
//#endregion
