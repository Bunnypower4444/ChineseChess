
class DrawUtils
{
    private constructor()
    {
        throw new TypeError("Cannot make instance of DrawUtils");
    }

    /**
     * Draws a line using a point and sizes, rather than two points
     * @param x X-position of line starting point
     * @param y Y-position of line starting point
     * @param w The horizontal distance of the line
     * @param h The vertical distance of the line
     */
    public static line(x: number, y: number, w: number, h: number)
    {
        line(x, y, x + w, y + h);
    }

    public static text(font: string, textString: string, x: number, y: number, size?: number,
        justifyX: TextAlignHoriz = CENTER, justifyY: TextAlignVert = CENTER, rotation: number = 0)
    {
        if (size === undefined || size === null)
            size = textSize();

        push();
        textFont(font);
        textSize(size);
        textAlign(justifyX, justifyY);
        translate(x/*  - justifyX * DrawUtils.textWidth(textString, font, size, NORMAL) */, y/*  - justifyY * DrawUtils.textHeight(textString, font, size, NORMAL) */);
        rotate(rotation);
        text(textString, 0,
            0);
        pop();
    }

    public static textWidth(text: string, font: string, size: number, style: TextStyle) {
        push();
        textStyle(style);
        textSize(size);
        textFont(font);
        let lines = DrawUtils.textLines(text);
        let widths: number[] = [];
        for (let line of lines) {
            widths.push(textWidth(line));
        }
        pop();
        return Math.max(...widths);
    }

    /**
     * Gets each individual line of the text, width text wrapping taken into account.
     * @returns An array containing each line of text
     */
    public static textLines(text: string, w?: number): string[] {
        let lines = text.split("\n");
        let nlines: string[] = [];
        if (w === null || w === undefined) return lines;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            let line = '';
            let words = lines[lineIndex].split(' ');
            for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            let testLine = ''.concat(line + words[wordIndex]) + ' ';
            let testWidth = textWidth(testLine);
            if (testWidth > w && line.length > 0) {
                nlines.push(line);
                line = ''.concat(words[wordIndex]) + ' ';
            } else {
                line = testLine;
            }
            }
            nlines.push(line);
        }
        return nlines;
    }

    public static textHeight(text: string, font: string, size: number, style: TextStyle) {
        push();
        textStyle(style);
        textSize(size);
        textFont(font);
        let h = DrawUtils.textLines(text).length * textLeading();
        pop();
        return h;
    }
}

type TextStyle = typeof NORMAL | typeof BOLD | typeof ITALIC | typeof BOLDITALIC;
type TextAlignHoriz = typeof LEFT | typeof CENTER | typeof RIGHT;
type TextAlignVert = typeof TOP | typeof CENTER | typeof BOTTOM | typeof BASELINE;