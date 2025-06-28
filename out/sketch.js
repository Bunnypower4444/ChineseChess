//#region Imports
var DrawUtils = p5Utils.DrawUtils;
var Vec2 = p5Utils.Vector2;
//#endregion
//#region Constants
var Color;
(function (Color) {
    Color["Red"] = "red";
    Color["Black"] = "black";
    Color["RedBG"] = "lightcoral";
    Color["BlackBG"] = "lightgray";
    Color["Piece"] = "#ecb382";
    Color["Check"] = "red";
})(Color || (Color = {}));
//#endregion
//#region Globals
let board = new Board();
board.setPosition(Board.StartingPosition);
board.updateMoves();
let panel;
const settings = {
    allowIllegalMoves: false,
    showLegalMoves: true
};
//#endregion
//#region Canvas
const WindowAspect = 0.95;
const MainFont = "Trebuchet MS";
// Arbritrary values representing 100% of the screen height and width
const ScreenHeight = 600;
const ScreenWidth = ScreenHeight * WindowAspect;
let canvasScale = 1;
function setup() {
    // Setup the canvas
    let canvasSize = p5Utils.CanvasUtils.aspectToSize(WindowAspect, windowWidth, windowHeight);
    createCanvas(canvasSize.x, canvasSize.y, document.getElementById("defaultCanvas0"));
    canvasScale = height / ScreenHeight;
    panel = new BoardPanel(board, new Vec2(0.5 * ScreenWidth, 0.5 * ScreenHeight), ScreenHeight);
}
function draw() {
    background("#c16d26");
    push();
    scale(canvasScale);
    panel.drawParams.showLegalMoves = settings.showLegalMoves;
    panel.draw();
    // canvas border
    strokeWeight(8);
    stroke(0);
    noFill();
    rectMode(CORNER);
    rect(0, 0, ScreenWidth, ScreenHeight);
    pop();
}
function windowResized() {
    let canvasSize = p5Utils.CanvasUtils.aspectToSize(WindowAspect, windowWidth, windowHeight);
    resizeCanvas(canvasSize.x, canvasSize.y, true);
    canvasScale = height / ScreenHeight;
}
//#endregion
//#region Input
function mouseReleased() {
    let pos = Vec2.getMousePositionVector().div(canvasScale);
    if (panel.positionInBounds(pos))
        panel.onMouseReleased(pos);
}
// HTML input stuff
function switchTurn() {
    board.switchTurn();
    board.updateMoves();
    panel.drawParams.selectedSquare = null;
}
function undoMove() {
    if (board.undoMove()) {
        board.switchTurn();
        board.updateMoves();
        panel.drawParams.selectedSquare = null;
    }
}
function resetGame() {
    board.setPosition(Board.StartingPosition);
    board.movingPlayer = PieceColor.Red;
    board.updateMoves();
    panel.drawParams.selectedSquare = null;
}
function setCustomPosition(fen) {
    board.setPosition(fen);
    board.movingPlayer = PieceColor.Red;
    board.updateMoves();
    panel.drawParams.selectedSquare = null;
}
function setAllowIllegalMoves(value) {
    settings.allowIllegalMoves = value;
}
function setShowLegalMoves(value) {
    settings.showLegalMoves = value;
}
//#endregion
