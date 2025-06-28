
/**
 * Represents the Chinese Chess board
 */
class Board
{
    public static readonly NumRanks = 10;
    public static readonly NumFiles = 9;
    public static readonly RiverStart = 4;

    public static readonly StartingPosition =
        "rheakaehr/" +
        "/"          + 
        "1c5c/"      +
        "p1p1p1p1p/" +
        "/"          +
        "/"          +
        "P1P1P1P1P/" +
        "1C5C/"      +
        "/"          +
        "RHEAKAEHR";

    public static positionInBounds(file: number, rank: number)
    {
        return file >= 0 && file < Board.NumFiles && rank >= 0 && rank < Board.NumRanks;
    }

    public static positionInPalace(file: number, rank: number, color: PieceColor)
    {
        return file >= Math.floor(Board.NumFiles / 2) - 1 &&
            file <= Math.floor(Board.NumFiles / 2) + 1 &&
            (
                color === PieceColor.Black ?
                    rank <= 2 :
                    rank >= Board.NumRanks - 3
            );
    }

    public get pieces()
    {
        return [...this.#pieces];
    }

    public * pieceIterator()
    {
        for (const piece of this.#pieces) {
            yield piece;
        }
    }

    public moves: Move[];
    public movingPlayer = PieceColor.Red;
    public redKing: Piece;
    public blackKing: Piece;

    readonly #grid: (Piece | null)[][] = new Array(Board.NumFiles);
    readonly #pieces: Piece[] = [];
    readonly #playedMoves: MoveInfo[] = [];

    #dirty = false;
    #redInCheck = false; 
    #blackInCheck = false; 

    public constructor()
    {
        for (let i = 0; i < Board.NumFiles; i++) {
            this.#grid[i] = new Array(Board.NumRanks).fill(null);
        }
    }

    public setPosition(fen: string)
    {
        let rank = 0;
        let file = -1;
        for (const char of fen)
        {
            file++;
            // If it's a digit (and not 0): skip spaces
            let digit: number;
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
                    let piece = new Piece(type,
                        char.toUpperCase() == char ?
                            PieceColor.Red :
                            PieceColor.Black,
                        file, rank);
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
        for (; rank < Board.NumRanks; rank++)
        {
            for (; file < Board.NumFiles; file++)
                this.setPiece(file, rank, null);

            file = 0;
        }

        this.#playedMoves.length = 0;
        this.#dirty = true;
    }

    public setPiece(file: number, rank: number, piece: Piece | null)
    {
        if (!Board.positionInBounds(file, rank))
            return console.error(`Position out of board bounds (${file}, ${rank})`);

        // If there's already a piece in the position, 
        //  replace it
        if (this.#grid[file][rank] != null)
        {
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

        this.#dirty = true;
    }

    public getPiece(file: number, rank: number): Piece | null
    {
        return this.#grid[file]?.[rank];
    }

    public switchTurn()
    {
        if (this.movingPlayer === PieceColor.Red)
            this.movingPlayer = PieceColor.Black;
        else
            this.movingPlayer = PieceColor.Red;

        this.#dirty = true;
    }

    public makeMove(move: Move, final = false)
    {
        const movingPiece = this.getPiece(move.fromFile, move.fromRank);
        if (!movingPiece)
            return console.error("There is no piece on the move start square");

        const capturedPiece = this.getPiece(move.toFile, move.toRank);

        this.setPiece(move.fromFile, move.fromRank, null);
        this.setPiece(move.toFile, move.toRank, movingPiece);

        if (final)
            this.#playedMoves.push(new MoveInfo(move, movingPiece, capturedPiece));

        this.#dirty = true;
    }

    public undoMove()
    {
        const it = this.#playedMoves.pop();
        if (!it)
            return false;

        this.setPiece(it.move.fromFile, it.move.fromRank, it.movingPiece);
        this.setPiece(it.move.toFile, it.move.toRank, it.capturedPiece);

        this.#dirty = true;

        return true;
    }

    public updateMoves(player: PieceColor = this.movingPlayer)
    {
        this.moves = MoveGenerator.generateMoves(this, player);
    }

    public playerInCheck(player: PieceColor)
    {
        if (!this.#dirty)
            return player === PieceColor.Black
                ? this.#blackInCheck : this.#redInCheck;

        this.#dirty = false;

        this.#redInCheck = this.redInCheck();
        this.#blackInCheck = this.blackInCheck();

        return player === PieceColor.Black
            ? this.#blackInCheck : this.#redInCheck;
    }

    public redInCheck()
    {
        if (!this.redKing)
            return false;

        if (this.kingsCanSee())
            return true;

        let opponentMoves = MoveGenerator.generateMoves(this, PieceColor.Black, true);
        for (const move of opponentMoves) {
            if (move.toFile == this.redKing.file && move.toRank == this.redKing.rank)
                return true;
        }
        return false;
    }

    public blackInCheck()
    {
        if (!this.blackKing)
            return false;

        if (this.kingsCanSee())
            return true;

        let opponentMoves = MoveGenerator.generateMoves(this, PieceColor.Red, true);
        for (const move of opponentMoves) {
            if (move.toFile == this.blackKing.file && move.toRank == this.blackKing.rank)
                return true;
        }
        return false;
    }

    public kingsCanSee()
    {
        if (this.redKing.file != this.blackKing.file)
            return false;

        for (let rank = this.blackKing.rank + 1; rank < this.redKing.rank; rank++)
            if (this.getPiece(this.redKing.file, rank))
                return false;

        return true;
    }
}

enum PieceType { Pawn, Advisor, Elephant, Horse, Cannon, Chariot, King };
enum PieceColor { Red = 0 << 3, Black = 1 << 3 };
class Piece
{
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

    public static getPieceSymbol(piece: Piece)
    {
        let res: string;
        switch (piece.type)
        {
            case PieceType.King    : res = "k"; break;
            case PieceType.Advisor : res = "a"; break;
            case PieceType.Elephant: res = "e"; break;
            case PieceType.Chariot : res = "r"; break;
            case PieceType.Cannon  : res = "c"; break;
            case PieceType.Horse   : res = "h"; break;
            case PieceType.Pawn    : res = "p"; break;
            default                : res = null; break;
        }

        return piece.color == PieceColor.Red ? res.toUpperCase() : res;
    }

    public static getTypeFromSymbol(symbol: string)
    {
        switch (symbol.toLowerCase())
        {
            case "k": return PieceType.King    ;
            case "a": return PieceType.Advisor ;
            case "e": return PieceType.Elephant;
            case "r": return PieceType.Chariot ;
            case "c": return PieceType.Cannon  ;
            case "h": return PieceType.Horse   ;
            case "p": return PieceType.Pawn    ;
            default : return null              ;
        }
    }

    public type: PieceType;
    public color: PieceColor;
    public file: number;
    public rank: number;

    public constructor(type: PieceType, color: PieceColor, file: number, rank: number)
    {
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

    public draw(x: number, y: number, size: number,
        pieceCol: ColorLike = Color.Piece,
        redCol: ColorLike = Color.Red, blackCol: ColorLike = Color.Black)
    {
        push();
        stroke(0);
        strokeWeight(2);
        fill(pieceCol);
        circle(x, y, size);

        fill(this.color == PieceColor.Black ? blackCol : redCol);
        noStroke();
        DrawUtils.text(MainFont, this.name, x, y, size * 0.6);
        pop();
    }

    public get name(): string
    {
        switch (this.color | this.type)
        {
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
            default    : return "";
        }
    }
}

class Move
{
    // Format (each is 8 bits):
    // fromFile fromRank toFile toRank
    readonly #moveValue: number;

    public constructor(moveValue: number);
    public constructor(piece: Piece, toFile: number, toRank: number);
    public constructor(fromFile: number, fromRank: number, toFile: number, toRank: number);
    public constructor(v1: number | Piece, v2?: number, v3?: number, v4?: number)
    {
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

    public get moveValue()
    {
        return this.#moveValue;
    }

    public get fromFile()
    {
        return this.#moveValue >> 24;
    }
    public get fromRank()
    {
        return (this.#moveValue & 0x00ff0000) >> 16;
    }
    public get toFile()
    {
        return (this.#moveValue & 0x0000ff00) >> 8;
    }
    public get toRank()
    {
        return this.#moveValue & 0x000000ff;
    }

    public equals(other: Move)
    {
        return this.#moveValue == other.moveValue;
    }
}

class MoveInfo
{
    public readonly move: Move;
    public readonly movingPiece: Piece;
    public readonly capturedPiece?: Piece;

    public constructor(move: Move, movingPiece: Piece, capturedPiece?: Piece)
    {
        this.move = move;
        this.movingPiece = movingPiece;
        this.capturedPiece = capturedPiece;
    }
}

class MoveGenerator
{
    private constructor()
    {
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
    public static canCaptureOrMoveTo(board: Board, pieceColor: PieceColor, file: number, rank: number)
    {
        return Board.positionInBounds(file, rank) &&
            board.getPiece(file, rank)?.color !== pieceColor;
    }

    public static generateMoves(board: Board, player: PieceColor, ignoreCheck = false)
    {
        let moves: Move[] = [];

        // Call the right function to get moves
        for (const piece of board.pieces)
        {
            if (piece.color === player)
                switch (piece.type)
                {
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

        let safeMoves: Move[] = [];
        
        // Play each move, and make sure they don't put the player in check
        for (const move of moves)
        {
            // keep track of the piece that we capture
            let piece: Piece = board.getPiece(move.toFile, move.toRank);
            
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

    public static generatePawnMoves(board: Board, pawn: Piece, moves: Move[])
    {
        if (pawn.color === PieceColor.Red)
        {
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
        else
        {
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

    public static generateAdvisorMoves(board: Board, advisor: Piece, moves: Move[])
    {
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

    public static generateElephantMoves(board: Board, elephant: Piece, moves: Move[])
    {
        function rankOnHomeSide(rank: number, color: PieceColor)
        {
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
    static readonly #horseMoves = [
        [{file: +1, rank: +0 }, { file: +2, rank: +1 }],
        [{file: +1, rank: +0 }, { file: +2, rank: -1 }],
        [{file: +0, rank: +1 }, { file: +1, rank: +2 }],
        [{file: +0, rank: +1 }, { file: -1, rank: +2 }],
        [{file: -1, rank: +0 }, { file: -2, rank: +1 }],
        [{file: -1, rank: +0 }, { file: -2, rank: -1 }],
        [{file: +0, rank: -1 }, { file: +1, rank: -2 }],
        [{file: +0, rank: -1 }, { file: -1, rank: -2 }]
    ];

    public static generateHorseMoves(board: Board, horse: Piece, moves: Move[])
    {
        for (const move of this.#horseMoves)
        {
            // Check first square for blocking pieces
            if (board.getPiece(horse.file + move[0].file, horse.rank + move[0].rank))
                continue;

            // Check destination square
            if (this.canCaptureOrMoveTo(board, horse.color,
                horse.file + move[1].file, horse.rank + move[1].rank))
            {
                moves.push(new Move(horse,
                    horse.file + move[1].file, horse.rank + move[1].rank));
            }
        }
    }

    static readonly #slidingDirections = [
        { file: 1 , rank: 0  },
        { file: -1, rank: 0  },
        { file: 0 , rank: 1  },
        { file: 0 , rank: -1 }
    ];

    public static generateCannonMoves(board: Board, cannon: Piece, moves: Move[])
    {
        for (const dir of this.#slidingDirections)
        {
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

            if (jump)
            {
                while (true) {
                    pos.file += dir.file;
                    pos.rank += dir.rank;
    
                    if (!Board.positionInBounds(pos.file, pos.rank))
                        break;
                    
                    // Check for captures or blocking pieces
                    let piece: Piece = board.getPiece(pos.file, pos.rank);
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

    public static generateChariotMoves(board: Board, chariot: Piece, moves: Move[])
    {
        for (const dir of this.#slidingDirections)
        {
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

    public static generateKingMoves(board: Board, king: Piece, moves: Move[])
    {
        for (const dir of this.#slidingDirections)
        {
            const pos = { file: king.file + dir.file, rank: king.rank + dir.rank };

            if (this.canCaptureOrMoveTo(board, king.color, pos.file, pos.rank) &&
                Board.positionInPalace(pos.file, pos.rank, king.color))
                moves.push(new Move(king.file, king.rank, pos.file, pos.rank));
        }
    }
}