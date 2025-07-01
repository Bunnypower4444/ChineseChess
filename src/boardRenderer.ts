
enum Color
{
    Board = "#c16d26",
    Line = "black",
    Red = "red",
    Black = "black",
    RedBG = "lightcoral",
    BlackBG = "lightgray",
    Piece = "#ecb382",
    Check = "red",
    Selected = "yellow",
    MoveIndicator = "rgba(0, 0, 0, 0.5)"
}

abstract class Panel
{
    public position: Vec2 = Vec2.zero;

    public constructor(position: Vec2)
    {
        this.position = position;
    }

    public update(): void {};
    public abstract draw(): void;
}

interface IMouseListener
{
    positionInBounds(position: Vec2): boolean;

    onMouseReleased?(position: Vec2): void;
}

class BoardPanel extends Panel implements IMouseListener
{
    public height: number;
    
    public get width(): number
    {
        // add 1 to account for margins, but minus 1 because it's the lines, not the squares
        return this.height * Board.NumFiles / Board.NumRanks;
    }

    public set width(val: number)
    {
        this.height = val * Board.NumRanks / Board.NumFiles;
    }

    #board: Board;

    public get board()
    {
        return this.#board;
    }

    public set board(val: Board)
    {
        this.#board = val;
        this.moveAnimTimer = 0;
        this.gameEndAnimTimer = 0;
    }

    public constructor(board: Board, position: Vec2, height: number)
    {
        super(position);
        this.board = board;
        this.height = height;
    }

    static readonly #defaultSettings: BoardPanel.Settings =
    {
        allowIllegalMoves: false
    }

    public static getDefaultSettings(): BoardPanel.Settings
    {
        return structuredClone(this.#defaultSettings);
    }

    public settings: BoardPanel.Settings = BoardPanel.getDefaultSettings();

    private moveAnimTimer = 0;
    private gameEndAnimTimer = 0;

    public update(): void
    {
        if (!this.board)
            return;
    }

    static readonly #defaultDrawParams: BoardPanel.DrawParams =
    {
        checkHighlight: true,
        checkHighlightColor: Color.Check,
        selectedSquare: null,
        selectedColor: Color.Selected,
        showLegalMoves: true,
        legalMoveColor: Color.MoveIndicator,
        highlightedSquares: [],
        lineColor: Color.Line,
        pieceColor: Color.Piece,
        redColor: Color.Red,
        blackColor: Color.Black
    };

    public static getDefaultDrawParams(): BoardPanel.DrawParams
    {
        return structuredClone(this.#defaultDrawParams);
    }

    public drawParams: BoardPanel.DrawParams = BoardPanel.getDefaultDrawParams();

    /**
     * Draws the Chinese Chess board in its current state.
     * @param x X-position of center to draw
     * @param y Y-position of center to draw
     * @param size Height of board
     * @param params Draw settings
     */
    public draw(): void 
    {
        if (!this.#board)
            return;

        if (!this.drawParams)
            this.drawParams = BoardPanel.getDefaultDrawParams();

        // add 1 to account for margins, but minus 1 because it's the lines, not the squares
        let gridSpacing = this.height / Board.NumRanks;
        let margin = gridSpacing * 0.5;

        push();
        translate(this.position.x - this.width / 2, this.position.y - this.height / 2);

        // highlight king if in check
        if (this.drawParams.checkHighlight && this.#board.playerInCheck(this.#board.movingPlayer))
        {
            push();
            fill(this.drawParams.checkHighlightColor);
            noStroke();
            let king = this.#board.movingPlayer === PieceColor.Black ? this.#board.blackKing : this.#board.redKing;
            
            square(gridSpacing * king.file, gridSpacing * king.rank, gridSpacing);

            pop();
        }

        // highlight squares
        if (this.drawParams.highlightedSquares.length > 0)
        {
            push();
            noStroke();

            for (const it of this.drawParams.highlightedSquares) {
                fill(it[1]);
                square(gridSpacing * it[0][0], gridSpacing * it[0][1], gridSpacing);
            }

            pop();
        }

        // highlight selected square
        if (this.drawParams.selectedSquare)
        {
            push();
            noStroke();
            fill(this.drawParams.selectedColor);
            square(gridSpacing * this.drawParams.selectedSquare[0], gridSpacing * this.drawParams.selectedSquare[1], gridSpacing);

            pop();
        }

        // Draw the grid
        push();
        stroke(this.drawParams.lineColor);
        strokeWeight(2);
        
        // Horizontal lines
        for (let i = 0; i < Board.NumRanks; i++) {
            DrawUtils.line(margin, i * gridSpacing + margin, (Board.NumFiles - 1) * gridSpacing, 0);
        }

        // Vertical lines
        let riverStart = Board.RiverStart * gridSpacing;
        for (let i = 1; i < Board.NumFiles - 1; i++)
        {
            // split into two lines because of the river
            DrawUtils.line(i * gridSpacing + margin, margin,
                0, riverStart);
            DrawUtils.line(i * gridSpacing + margin, riverStart + gridSpacing + margin,
                0, riverStart);
        }
        // edges
        DrawUtils.line(margin, margin, 0, (Board.NumRanks - 1) * gridSpacing);
        DrawUtils.line(this.width - margin, margin, 0, (Board.NumRanks - 1) * gridSpacing);

        // Palace
        let palaceLeft = Math.ceil((Board.NumFiles - 1) / 2) - 1;
        let redPalaceTop = Board.NumRanks - 3;
        let blackPalaceBottom = 2;
        DrawUtils.line(palaceLeft * gridSpacing + margin, redPalaceTop * gridSpacing + margin,
            2 * gridSpacing, 2 * gridSpacing);
        DrawUtils.line(palaceLeft * gridSpacing + margin, this.height - margin,
            2 * gridSpacing, -2 * gridSpacing);

        DrawUtils.line(palaceLeft * gridSpacing + margin, margin,
            2 * gridSpacing, 2 * gridSpacing);
        DrawUtils.line(palaceLeft * gridSpacing + margin, blackPalaceBottom * gridSpacing + margin,
            2 * gridSpacing, -2 * gridSpacing);
        
        // Starting positions of cannons and pawns
        function positionMarker(file: number, rank: number)
        {
            // top left
            DrawUtils.line(
                file * gridSpacing + margin - 0.125 * gridSpacing,
                rank * gridSpacing + margin - 0.125 * gridSpacing,
                -0.25 * gridSpacing,
                -0.25 * gridSpacing
            );
            // top right
            DrawUtils.line(
                file * gridSpacing + margin + 0.125 * gridSpacing,
                rank * gridSpacing + margin - 0.125 * gridSpacing,
                0.25 * gridSpacing,
                -0.25 * gridSpacing
            );
            // bottom right
            DrawUtils.line(
                file * gridSpacing + margin + 0.125 * gridSpacing,
                rank * gridSpacing + margin + 0.125 * gridSpacing,
                0.25 * gridSpacing,
                0.25 * gridSpacing
            );
            // bottom left
            DrawUtils.line(
                file * gridSpacing + margin - 0.125 * gridSpacing,
                rank * gridSpacing + margin + 0.125 * gridSpacing,
                -0.25 * gridSpacing,
                0.25 * gridSpacing
            );
        }

        
        
        pop();
        
        // 楚河漢界 (river)
        push();
        noStroke();
        fill(this.drawParams.lineColor);
        DrawUtils.text(MainFont, "楚\n河",
            Math.floor(Board.NumFiles * 0.25) * gridSpacing + margin, 0.5 * this.height, 0.8 * gridSpacing, CENTER, CENTER, -Math.PI / 2);
        DrawUtils.text(MainFont, "漢\n界",
            Math.floor(Board.NumFiles * 0.75) * gridSpacing + margin, 0.5 * this.height, 0.8 * gridSpacing, CENTER, CENTER, Math.PI / 2);
        pop();

        // Draw the pieces
        for (const piece of this.#board.pieceIterator()) {
            piece.draw(
                margin + piece.file * gridSpacing,
                margin + piece.rank * gridSpacing,
                0.8 * gridSpacing,
                this.drawParams.pieceColor, this.drawParams.redColor, this.drawParams.blackColor
            );
        }


        let selectedPiece: Piece;
        // show legal moves
        if (this.drawParams.showLegalMoves
            && this.drawParams.selectedSquare
            && (selectedPiece = this.#board.getPiece(this.drawParams.selectedSquare[0], this.drawParams.selectedSquare[1]))
            && selectedPiece.color === this.#board.movingPlayer)
        {
            push();
            for (const move of this.#board.moves) {
                if (move.fromFile == this.drawParams.selectedSquare[0] &&
                    move.fromRank == this.drawParams.selectedSquare[1])
                {
                    if (this.#board.getPiece(move.toFile, move.toRank)) {
                        noFill();
                        stroke(this.drawParams.legalMoveColor);
                        strokeWeight(10);
                        circle(
                            (move.toFile + 0.5) * gridSpacing,
                            (move.toRank + 0.5) * gridSpacing, 
                            0.8 * gridSpacing
                        );
                    }
                    else {
                        fill(this.drawParams.legalMoveColor);
                        noStroke();
                        circle(
                            (move.toFile + 0.5) * gridSpacing,
                            (move.toRank + 0.5) * gridSpacing, 
                            0.4 * gridSpacing
                        );
                    }
                }
            }
            pop();
        }

        pop();
    }


    public positionInBounds(pos: Vec2): boolean
    {
        if (!this.#board)
            return false;

        return pos.x >= this.position.x - this.width / 2
            && pos.x <= this.position.x + this.width / 2
            && pos.y >= this.position.y - this.height / 2
            && pos.y <= this.position.y + this.height / 2;
    }
    
    public onMouseReleased(mousePos: Vec2): void
    {
        if (!this.#board)
            return;

        mousePos.x -= this.position.x - this.width / 2;
        mousePos.y -= this.position.y - this.height / 2;

        let gridSpacing = this.height / Board.NumRanks;
        let file = Math.floor(mousePos.x / gridSpacing);
        let rank = Math.floor(mousePos.y / gridSpacing);

        let pSelectedSquare: [number, number] = this.drawParams.selectedSquare ?
            [...this.drawParams.selectedSquare] : null;
        
        if (!Board.positionInBounds(file, rank))
            this.drawParams.selectedSquare = null;
        else if (file !== pSelectedSquare?.[0] ||
            rank !== pSelectedSquare?.[1])
            this.drawParams.selectedSquare = [ file, rank ];
        else
            this.drawParams.selectedSquare = null;

        if (pSelectedSquare && this.drawParams.selectedSquare &&
            this.#board.getPiece(pSelectedSquare[0], pSelectedSquare[1]).color === this.#board.movingPlayer)
        {
            let move = new Move(
                pSelectedSquare[0], pSelectedSquare[1],
                this.drawParams.selectedSquare[0], this.drawParams.selectedSquare[1]
            );
            
            if (this.settings.allowIllegalMoves || this.#board.moves.some(m => m.equals(move)))
            {
                this.#board.makeMove(move, true);
                this.#board.switchTurn();
                this.#board.updateMoves();

                this.drawParams.selectedSquare = null;
            }
        }

        if (this.drawParams.selectedSquare && !this.#board.getPiece(this.drawParams.selectedSquare[0], this.drawParams.selectedSquare[1]))
            this.drawParams.selectedSquare = null;
    }
}

namespace BoardPanel
{
    export type Settings =
    {
        /**
         * If set to true, players may move their pieces to any square and potentially capture their own pieces.
         * Defaults to false
         */
        allowIllegalMoves: boolean
    }

    export type DrawParams =
    {
        /**
         * If set to true, the moving player's king will be highlighted using `checkHighlightColor` if it is in check.
         * Defaults to true
         */
        checkHighlight: boolean,
        /**
         * The color a king in check should be highlighted in.
         * Defaults to `Color.Check`
         * @see {Color.Check}
         */
        checkHighlightColor: ColorLike,
        
        /**
         * A square that is selected by the user to make a move.
         */
        selectedSquare?: [number, number],

        /**
         * The color of the highlight for the selected square. Defaults to `Color.Selected`
         * @see {Color.Selected}
         */
        selectedColor: ColorLike,

        /**
         * Whether or not to indicate legal moves for the selected square, if there piece belongs to the currently moving player.
         * Defaults to true
         */
        showLegalMoves: boolean,

        /**
         * The color of legal move markers. Defaults to `Color.MoveIndicator`
         * @see {Color.MoveIndicator}
         */
        legalMoveColor: ColorLike,

        /**
         * Contains array of squares to be highlighted and the color in which each square is highlighted.
         * Each element should be an array of length 2. The first element should be an array of length two,
         * with two numbers representing the file and rank of the square, respectively. The second element should be
         * a ColorLike, representing the color the square should be highlighted in.
         */
        highlightedSquares: [[number, number], ColorLike][],
        
        /**
         * The color of the lines and river text on the board. Defaults to `Color.Line`
         * @see {Color.Line}
         */
        lineColor: ColorLike,
        /**
         * The color of pieces. Defaults to `Color.Piece`
         * @see {Color.Piece}
         */
        pieceColor: ColorLike,
        /**
         * The color of text on red pieces. Defaults to `Color.Red`
         * @see {Color.Red}
         */
        redColor: ColorLike,
        /**
         * The color of text on black pieces. Defaults to `Color.Black`
         * @see {Color.Black}
         */
        blackColor: ColorLike
    }
}