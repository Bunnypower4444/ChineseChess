/**
 * Represents the Chinese Chess board
 */
class Board {
    static NumRanks = 10;
    static NumFiles = 9;
    static RiverStart = 4;
    static StartingPosition = "rheakaehr/" +
        "/" +
        "1c5c/" +
        "p1p1p1p1p/" +
        "/" +
        "/" +
        "P1P1P1P1P/" +
        "1C5C/" +
        "/" +
        "RHEAKAEHR";
    static positionInBounds(file, rank) {
        return file >= 0 && file < Board.NumFiles && rank >= 0 && rank < Board.NumRanks;
    }
    static positionInPalace(file, rank, color) {
        return file >= Math.floor(Board.NumFiles / 2) - 1 &&
            file <= Math.floor(Board.NumFiles / 2) + 1 &&
            (color === PieceColor.Black ?
                rank <= 2 :
                rank >= Board.NumRanks - 3);
    }
    get pieces() {
        return [...this.#pieces];
    }
    moves;
    movingPlayer = PieceColor.Red;
    redKing;
    blackKing;
    #grid = new Array(Board.NumFiles);
    #pieces = [];
    #playedMoves = [];
    constructor() {
        for (let i = 0; i < Board.NumFiles; i++) {
            this.#grid[i] = new Array(Board.NumRanks).fill(null);
        }
    }
    setPosition(fen) {
        let rank = 0;
        let file = -1;
        for (const char of fen) {
            file++;
            // If it's a digit (and not 0): skip spaces
            let digit;
            if (digit = Number(char)) {
                // Set everything that was skipped to empty
                let max = file + digit - 1;
                for (; file <= max; file++) {
                    if (Board.positionInBounds(file, rank))
                        this.setPiece(file, rank, null);
                }
                file = max;
                continue;
            }
            // If it's a slash: next rank
            else if (char == "/") {
                // Set everything that was skipped to null
                for (; file < Board.NumFiles; file++)
                    this.setPiece(file, rank, null);
                file = -1;
                rank++;
                continue;
            }
            // Create a piece using the symbol
            else {
                let type = Piece.getTypeFromSymbol(char);
                if (type !== null && Board.positionInBounds(file, rank)) {
                    let piece = new Piece(type, char.toUpperCase() == char ?
                        PieceColor.Red :
                        PieceColor.Black, file, rank);
                    this.setPiece(file, rank, piece);
                    if (piece.type == PieceType.King && piece.color == PieceColor.Red)
                        this.redKing = piece;
                    else if (piece.type == PieceType.King)
                        this.blackKing = piece;
                }
                continue;
            }
        }
        file++;
        // If we're not at the end of the board, make sure to set the rest to empty
        for (; rank < Board.NumRanks; rank++) {
            for (; file < Board.NumFiles; file++)
                this.setPiece(file, rank, null);
            file = 0;
        }
        this.#playedMoves.length = 0;
    }
    setPiece(file, rank, piece) {
        if (!Board.positionInBounds(file, rank))
            return console.error(`Position out of board bounds (${file}, ${rank})`);
        // If there's already a piece in the position, 
        //  replace it
        if (this.#grid[file][rank] != null) {
            const index = this.#pieces.indexOf(this.#grid[file][rank]);
            if (piece)
                this.#pieces[index] = piece;
            else
                this.#pieces.splice(index, 1);
        }
        else if (piece)
            this.#pieces.push(piece);
        this.#grid[file][rank] = piece;
        if (piece) {
            piece.file = file;
            piece.rank = rank;
        }
    }
    getPiece(file, rank) {
        return this.#grid[file]?.[rank];
    }
    switchTurn() {
        if (this.movingPlayer === PieceColor.Red)
            this.movingPlayer = PieceColor.Black;
        else
            this.movingPlayer = PieceColor.Red;
    }
    makeMove(move, final = false) {
        const movingPiece = this.getPiece(move.fromFile, move.fromRank);
        if (!movingPiece)
            return console.error("There is no piece on the move start square");
        const capturedPiece = this.getPiece(move.toFile, move.toRank);
        this.setPiece(move.fromFile, move.fromRank, null);
        this.setPiece(move.toFile, move.toRank, movingPiece);
        if (final)
            this.#playedMoves.push(new MoveInfo(move, movingPiece, capturedPiece));
    }
    undoMove() {
        const it = this.#playedMoves.pop();
        if (!it)
            return false;
        this.setPiece(it.move.fromFile, it.move.fromRank, it.movingPiece);
        this.setPiece(it.move.toFile, it.move.toRank, it.capturedPiece);
        return true;
    }
    updateMoves(player = this.movingPlayer) {
        this.moves = MoveGenerator.generateMoves(this, player);
    }
    playerInCheck(player) {
        if (player === PieceColor.Black)
            return this.blackInCheck();
        else
            return this.redInCheck();
    }
    redInCheck() {
        if (this.kingsCanSee())
            return true;
        let opponentMoves = MoveGenerator.generateMoves(this, PieceColor.Black, true);
        for (const move of opponentMoves) {
            if (move.toFile == this.redKing.file && move.toRank == this.redKing.rank)
                return true;
        }
        return false;
    }
    blackInCheck() {
        if (this.kingsCanSee())
            return true;
        let opponentMoves = MoveGenerator.generateMoves(this, PieceColor.Red, true);
        for (const move of opponentMoves) {
            if (move.toFile == this.blackKing.file && move.toRank == this.blackKing.rank)
                return true;
        }
        return false;
    }
    kingsCanSee() {
        if (this.redKing.file != this.blackKing.file)
            return false;
        for (let rank = this.blackKing.rank + 1; rank < this.redKing.rank; rank++)
            if (this.getPiece(this.redKing.file, rank))
                return false;
        return true;
    }
    /**
     * Draws the Chinese Chess board in its current state.
     * @param x X-position of top left corner to draw
     * @param y Y-position of top left corner to draw
     * @param size Height of board
     */
    draw(x, y, size) {
        push();
        translate(x, y);
        push();
        // Draw the grid
        stroke(0);
        strokeWeight(2);
        // add 1 to account for margins, but minus 1 because it's the lines, not the squares
        let boardWidth = size * Board.NumFiles / Board.NumRanks;
        let gridSpacing = size / Board.NumRanks;
        let margin = gridSpacing * 0.5;
        // Horizontal lines
        for (let i = 0; i < Board.NumRanks; i++) {
            DrawUtils.line(margin, i * gridSpacing + margin, (Board.NumFiles - 1) * gridSpacing, 0);
        }
        // Vertical lines
        let riverStart = Board.RiverStart * gridSpacing;
        for (let i = 1; i < Board.NumFiles - 1; i++) {
            // split into two lines because of the river
            DrawUtils.line(i * gridSpacing + margin, margin, 0, riverStart);
            DrawUtils.line(i * gridSpacing + margin, riverStart + gridSpacing + margin, 0, riverStart);
        }
        // edges
        DrawUtils.line(margin, margin, 0, (Board.NumRanks - 1) * gridSpacing);
        DrawUtils.line(boardWidth - margin, margin, 0, (Board.NumRanks - 1) * gridSpacing);
        // Palace
        let palaceLeft = Math.ceil((Board.NumFiles - 1) / 2) - 1;
        let redPalaceTop = Board.NumRanks - 3;
        let blackPalaceBottom = 2;
        DrawUtils.line(palaceLeft * gridSpacing + margin, redPalaceTop * gridSpacing + margin, 2 * gridSpacing, 2 * gridSpacing);
        DrawUtils.line(palaceLeft * gridSpacing + margin, size - margin, 2 * gridSpacing, -2 * gridSpacing);
        DrawUtils.line(palaceLeft * gridSpacing + margin, margin, 2 * gridSpacing, 2 * gridSpacing);
        DrawUtils.line(palaceLeft * gridSpacing + margin, blackPalaceBottom * gridSpacing + margin, 2 * gridSpacing, -2 * gridSpacing);
        // Starting positions of cannons and pawns
        function positionMarker(file, rank) {
            // top left
            DrawUtils.line(file * gridSpacing + margin - 0.125 * gridSpacing, rank * gridSpacing + margin - 0.125 * gridSpacing, -0.25 * gridSpacing, -0.25 * gridSpacing);
            // top right
            DrawUtils.line(file * gridSpacing + margin + 0.125 * gridSpacing, rank * gridSpacing + margin - 0.125 * gridSpacing, 0.25 * gridSpacing, -0.25 * gridSpacing);
            // bottom right
            DrawUtils.line(file * gridSpacing + margin + 0.125 * gridSpacing, rank * gridSpacing + margin + 0.125 * gridSpacing, 0.25 * gridSpacing, 0.25 * gridSpacing);
            // bottom left
            DrawUtils.line(file * gridSpacing + margin - 0.125 * gridSpacing, rank * gridSpacing + margin + 0.125 * gridSpacing, -0.25 * gridSpacing, 0.25 * gridSpacing);
        }
        pop();
        // 楚河漢界 (river)
        push();
        noStroke();
        fill(0);
        DrawUtils.text(MainFont, "漢\n界", Math.floor(Board.NumFiles / 4) * gridSpacing + margin, 0.5 * size, 0.8 * gridSpacing, CENTER, CENTER, -Math.PI / 2);
        DrawUtils.text(MainFont, "楚\n河", Math.floor(3 * Board.NumFiles / 4) * gridSpacing + margin, 0.5 * size, 0.8 * gridSpacing, CENTER, CENTER, Math.PI / 2);
        pop();
        // Draw the pieces
        for (const iterator of this.#pieces) {
            iterator.draw(margin + iterator.file * gridSpacing, margin + iterator.rank * gridSpacing, 0.8 * gridSpacing);
        }
        pop();
    }
}
var PieceType;
(function (PieceType) {
    PieceType[PieceType["Pawn"] = 0] = "Pawn";
    PieceType[PieceType["Advisor"] = 1] = "Advisor";
    PieceType[PieceType["Elephant"] = 2] = "Elephant";
    PieceType[PieceType["Horse"] = 3] = "Horse";
    PieceType[PieceType["Cannon"] = 4] = "Cannon";
    PieceType[PieceType["Chariot"] = 5] = "Chariot";
    PieceType[PieceType["King"] = 6] = "King";
})(PieceType || (PieceType = {}));
;
var PieceColor;
(function (PieceColor) {
    PieceColor[PieceColor["Red"] = 0] = "Red";
    PieceColor[PieceColor["Black"] = 8] = "Black";
})(PieceColor || (PieceColor = {}));
;
class Piece {
    /*
     * Dictionary of piece names. To access the name of a piece,
     *  use the key PieceColor | PieceType
     * @deprecated
     *
    public static readonly Names: { [k: number]: string } =
    {
        0b0000 : "兵",
        0b0001 : "仕",
        0b0010 : "相",
        0b0011 : "傌",
        0b0100 : "炮",
        0b0101 : "俥",
        0b0110 : "帥",
        0b1000 : "兵",
        0b1001 : "仕",
        0b1010 : "相",
        0b1011 : "傌",
        0b1100 : "炮",
        0b1101 : "俥",
        0b1110 : "帥"
    };*/
    static getPieceSymbol(piece) {
        let res;
        switch (piece.type) {
            case PieceType.King:
                res = "k";
                break;
            case PieceType.Advisor:
                res = "a";
                break;
            case PieceType.Elephant:
                res = "e";
                break;
            case PieceType.Chariot:
                res = "r";
                break;
            case PieceType.Cannon:
                res = "c";
                break;
            case PieceType.Horse:
                res = "h";
                break;
            case PieceType.Pawn:
                res = "p";
                break;
            default:
                res = null;
                break;
        }
        return piece.color == PieceColor.Red ? res.toUpperCase() : res;
    }
    static getTypeFromSymbol(symbol) {
        switch (symbol.toLowerCase()) {
            case "k": return PieceType.King;
            case "a": return PieceType.Advisor;
            case "e": return PieceType.Elephant;
            case "r": return PieceType.Chariot;
            case "c": return PieceType.Cannon;
            case "h": return PieceType.Horse;
            case "p": return PieceType.Pawn;
            default: return null;
        }
    }
    type;
    color;
    file;
    rank;
    constructor(type, color, file, rank) {
        // Check if rank and file are in an acceptable range
        if (file % 1 != 0 || file < 0 && file >= Board.NumFiles)
            throw new RangeError("Piece file is not valid");
        if (rank % 1 != 0 || rank < 0 && rank >= Board.NumRanks)
            throw new RangeError("Piece rank is not valid");
        this.type = type;
        this.color = color;
        this.file = file;
        this.rank = rank;
    }
    draw(x, y, size) {
        push();
        stroke(0);
        strokeWeight(2);
        fill("#ecb382");
        circle(x, y, size);
        fill(this.color == PieceColor.Black ? "black" : "red");
        noStroke();
        DrawUtils.text(MainFont, this.name, x, y, size * 0.6);
        pop();
    }
    get name() {
        switch (this.color | this.type) {
            case 0b0000: return "兵";
            case 0b0001: return "仕";
            case 0b0010: return "相";
            case 0b0011: return "傌";
            case 0b0100: return "炮";
            case 0b0101: return "俥";
            case 0b0110: return "帥";
            case 0b1000: return "卒";
            case 0b1001: return "士";
            case 0b1010: return "象";
            case 0b1011: return "馬";
            case 0b1100: return "砲";
            case 0b1101: return "車";
            case 0b1110: return "將";
            default: return "";
        }
    }
}
class Move {
    // Format (each is 8 bits):
    // fromFile fromRank toFile toRank
    #moveValue;
    constructor(v1, v2, v3, v4) {
        // fromFile, fromRank, toFile, toRank
        if (arguments.length > 1 && typeof v1 == "number")
            this.#moveValue = (v1 << 24) | (v2 << 16) | (v3 << 8) | v4;
        // piece, toFile, toRank
        else if (v1 instanceof Piece)
            this.#moveValue = (v1.file << 24) | (v1.rank << 16) | (v2 << 8) | v3;
        // moveValue
        else
            this.#moveValue = v1;
    }
    get moveValue() {
        return this.#moveValue;
    }
    get fromFile() {
        return this.#moveValue >> 24;
    }
    get fromRank() {
        return (this.#moveValue & 0x00ff0000) >> 16;
    }
    get toFile() {
        return (this.#moveValue & 0x0000ff00) >> 8;
    }
    get toRank() {
        return this.#moveValue & 0x000000ff;
    }
    equals(other) {
        return this.#moveValue == other.moveValue;
    }
}
class MoveInfo {
    move;
    movingPiece;
    capturedPiece;
    constructor(move, movingPiece, capturedPiece) {
        this.move = move;
        this.movingPiece = movingPiece;
        this.capturedPiece = capturedPiece;
    }
}
class MoveGenerator {
    constructor() {
        throw new TypeError("Cannot make instance of MoveGenerator");
    }
    /**
     * Checks whether a square can be moved to either by capturing
     * or moving to an empty square, and if the square is on the board.
     * @param board The board the pieces are on
     * @param pieceColor The color of the moving piece
     * @param file The target file
     * @param rank The target rank
     * @returns Whether the target square can be legally moved to
     */
    static canCaptureOrMoveTo(board, pieceColor, file, rank) {
        return Board.positionInBounds(file, rank) &&
            board.getPiece(file, rank)?.color !== pieceColor;
    }
    static generateMoves(board, player, ignoreCheck = false) {
        let moves = [];
        // Call the right function to get moves
        for (const piece of board.pieces) {
            if (piece.color === player)
                switch (piece.type) {
                    case PieceType.Pawn:
                        this.generatePawnMoves(board, piece, moves);
                        break;
                    case PieceType.Advisor:
                        this.generateAdvisorMoves(board, piece, moves);
                        break;
                    case PieceType.Elephant:
                        this.generateElephantMoves(board, piece, moves);
                        break;
                    case PieceType.Horse:
                        this.generateHorseMoves(board, piece, moves);
                        break;
                    case PieceType.Cannon:
                        this.generateCannonMoves(board, piece, moves);
                        break;
                    case PieceType.Chariot:
                        this.generateChariotMoves(board, piece, moves);
                        break;
                    case PieceType.King:
                        this.generateKingMoves(board, piece, moves);
                        break;
                }
        }
        if (ignoreCheck)
            return moves;
        let safeMoves = [];
        // Play each move, and make sure they don't put the player in check
        for (const move of moves) {
            // keep track of the piece that we capture
            let piece = board.getPiece(move.toFile, move.toRank);
            board.makeMove(move);
            if (!board.playerInCheck(player))
                safeMoves.push(move);
            // undo the move
            board.makeMove(new Move(move.toFile, move.toRank, move.fromFile, move.fromRank));
            if (piece)
                board.setPiece(move.toFile, move.toRank, piece);
        }
        return safeMoves;
    }
    static generatePawnMoves(board, pawn, moves) {
        if (pawn.color === PieceColor.Red) {
            // forward
            if (this.canCaptureOrMoveTo(board, PieceColor.Red, pawn.file, pawn.rank - 1))
                moves.push(new Move(pawn.file, pawn.rank, pawn.file, pawn.rank - 1));
            // sideways
            if (pawn.rank <= Board.RiverStart) {
                if (this.canCaptureOrMoveTo(board, PieceColor.Red, pawn.file - 1, pawn.rank))
                    moves.push(new Move(pawn.file, pawn.rank, pawn.file - 1, pawn.rank));
                if (this.canCaptureOrMoveTo(board, PieceColor.Red, pawn.file + 1, pawn.rank))
                    moves.push(new Move(pawn.file, pawn.rank, pawn.file + 1, pawn.rank));
            }
        }
        else {
            // forward
            if (this.canCaptureOrMoveTo(board, PieceColor.Black, pawn.file, pawn.rank + 1))
                moves.push(new Move(pawn, pawn.file, pawn.rank + 1));
            // sideways
            if (pawn.rank > Board.RiverStart) {
                if (this.canCaptureOrMoveTo(board, PieceColor.Black, pawn.file - 1, pawn.rank))
                    moves.push(new Move(pawn, pawn.file - 1, pawn.rank));
                if (this.canCaptureOrMoveTo(board, PieceColor.Black, pawn.file + 1, pawn.rank))
                    moves.push(new Move(pawn, pawn.file + 1, pawn.rank));
            }
        }
    }
    static generateAdvisorMoves(board, advisor, moves) {
        // diagonal down right
        if (this.canCaptureOrMoveTo(board, advisor.color, advisor.file + 1, advisor.rank + 1) &&
            Board.positionInPalace(advisor.file + 1, advisor.rank + 1, advisor.color))
            moves.push(new Move(advisor, advisor.file + 1, advisor.rank + 1));
        // down left
        if (this.canCaptureOrMoveTo(board, advisor.color, advisor.file - 1, advisor.rank + 1) &&
            Board.positionInPalace(advisor.file - 1, advisor.rank + 1, advisor.color))
            moves.push(new Move(advisor, advisor.file - 1, advisor.rank + 1));
        // up left
        if (this.canCaptureOrMoveTo(board, advisor.color, advisor.file - 1, advisor.rank - 1) &&
            Board.positionInPalace(advisor.file - 1, advisor.rank - 1, advisor.color))
            moves.push(new Move(advisor, advisor.file - 1, advisor.rank - 1));
        // up right
        if (this.canCaptureOrMoveTo(board, advisor.color, advisor.file + 1, advisor.rank - 1) &&
            Board.positionInPalace(advisor.file + 1, advisor.rank - 1, advisor.color))
            moves.push(new Move(advisor, advisor.file + 1, advisor.rank - 1));
    }
    static generateElephantMoves(board, elephant, moves) {
        function rankOnHomeSide(rank, color) {
            return color === PieceColor.Black ?
                rank <= Board.RiverStart :
                rank > Board.RiverStart;
        }
        // diagonal down right
        if (this.canCaptureOrMoveTo(board, elephant.color, elephant.file + 2, elephant.rank + 2) &&
            rankOnHomeSide(elephant.rank + 2, elephant.color) &&
            !board.getPiece(elephant.file + 1, elephant.rank + 1))
            moves.push(new Move(elephant, elephant.file + 2, elephant.rank + 2));
        // down left
        if (this.canCaptureOrMoveTo(board, elephant.color, elephant.file - 2, elephant.rank + 2) &&
            rankOnHomeSide(elephant.rank + 2, elephant.color) &&
            !board.getPiece(elephant.file - 1, elephant.rank + 1))
            moves.push(new Move(elephant, elephant.file - 2, elephant.rank + 2));
        // up left
        if (this.canCaptureOrMoveTo(board, elephant.color, elephant.file - 2, elephant.rank - 2) &&
            rankOnHomeSide(elephant.rank - 2, elephant.color) &&
            !board.getPiece(elephant.file - 1, elephant.rank - 1))
            moves.push(new Move(elephant, elephant.file - 2, elephant.rank - 2));
        // up right
        if (this.canCaptureOrMoveTo(board, elephant.color, elephant.file + 2, elephant.rank - 2) &&
            rankOnHomeSide(elephant.rank - 2, elephant.color) &&
            !board.getPiece(elephant.file + 1, elephant.rank - 1))
            moves.push(new Move(elephant, elephant.file + 2, elephant.rank - 2));
    }
    // Each item contains the position offsets for one move.
    // The first set of offsets is the square that you can block a horse with,
    //  the second is the actual destination square.
    static #horseMoves = [
        [{ file: +1, rank: +0 }, { file: +2, rank: +1 }],
        [{ file: +1, rank: +0 }, { file: +2, rank: -1 }],
        [{ file: +0, rank: +1 }, { file: +1, rank: +2 }],
        [{ file: +0, rank: +1 }, { file: -1, rank: +2 }],
        [{ file: -1, rank: +0 }, { file: -2, rank: +1 }],
        [{ file: -1, rank: +0 }, { file: -2, rank: -1 }],
        [{ file: +0, rank: -1 }, { file: +1, rank: -2 }],
        [{ file: +0, rank: -1 }, { file: -1, rank: -2 }]
    ];
    static generateHorseMoves(board, horse, moves) {
        for (const move of this.#horseMoves) {
            // Check first square for blocking pieces
            if (board.getPiece(horse.file + move[0].file, horse.rank + move[0].rank))
                continue;
            // Check destination square
            if (this.canCaptureOrMoveTo(board, horse.color, horse.file + move[1].file, horse.rank + move[1].rank)) {
                moves.push(new Move(horse, horse.file + move[1].file, horse.rank + move[1].rank));
            }
        }
    }
    static #slidingDirections = [
        { file: 1, rank: 0 },
        { file: -1, rank: 0 },
        { file: 0, rank: 1 },
        { file: 0, rank: -1 }
    ];
    static generateCannonMoves(board, cannon, moves) {
        for (const dir of this.#slidingDirections) {
            let pos = { file: cannon.file, rank: cannon.rank };
            let jump = false;
            while (true) {
                pos.file += dir.file;
                pos.rank += dir.rank;
                // Make sure it is an empty square, cannons cannot capture like this
                if (!Board.positionInBounds(pos.file, pos.rank))
                    break;
                // If there is a piece, we will search for captures after
                if (board.getPiece(pos.file, pos.rank)) {
                    jump = true;
                    break;
                }
                moves.push(new Move(cannon, pos.file, pos.rank));
            }
            if (jump) {
                while (true) {
                    pos.file += dir.file;
                    pos.rank += dir.rank;
                    if (!Board.positionInBounds(pos.file, pos.rank))
                        break;
                    // Check for captures or blocking pieces
                    let piece = board.getPiece(pos.file, pos.rank);
                    if (piece && piece.color !== cannon.color) {
                        moves.push(new Move(cannon, pos.file, pos.rank));
                        break;
                    }
                    else if (piece)
                        break;
                }
            }
        }
    }
    static generateChariotMoves(board, chariot, moves) {
        for (const dir of this.#slidingDirections) {
            let pos = { file: chariot.file, rank: chariot.rank };
            while (true) {
                pos.file += dir.file;
                pos.rank += dir.rank;
                // Check if the square can be moved to
                if (!this.canCaptureOrMoveTo(board, chariot.color, pos.file, pos.rank))
                    break;
                moves.push(new Move(chariot, pos.file, pos.rank));
                // If there is a piece that we can capture, also stop our search
                if (board.getPiece(pos.file, pos.rank))
                    break;
            }
        }
    }
    static generateKingMoves(board, king, moves) {
        for (const dir of this.#slidingDirections) {
            const pos = { file: king.file + dir.file, rank: king.rank + dir.rank };
            if (this.canCaptureOrMoveTo(board, king.color, pos.file, pos.rank) &&
                Board.positionInPalace(pos.file, pos.rank, king.color))
                moves.push(new Move(king.file, king.rank, pos.file, pos.rank));
        }
    }
}
