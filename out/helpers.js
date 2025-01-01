class DrawUtils {
    constructor() {
        throw new TypeError("Cannot make instance of DrawUtils");
    }
    /**
     * Draws a line using a point and sizes, rather than two points
     * @param x X-position of line starting point
     * @param y Y-position of line starting point
     * @param w The horizontal distance of the line
     * @param h The vertical distance of the line
     */
    static line(x, y, w, h) {
        line(x, y, x + w, y + h);
    }
    static text(font, textString, x, y, size, justifyX = CENTER, justifyY = CENTER, rotation = 0) {
        if (size === undefined || size === null)
            size = textSize();
        push();
        textFont(font);
        textSize(size);
        textAlign(justifyX, justifyY);
        translate(x /*  - justifyX * DrawUtils.textWidth(textString, font, size, NORMAL) */, y /*  - justifyY * DrawUtils.textHeight(textString, font, size, NORMAL) */);
        rotate(rotation);
        text(textString, 0, 0);
        pop();
    }
    static textWidth(text, font, size, style) {
        push();
        textStyle(style);
        textSize(size);
        textFont(font);
        let lines = DrawUtils.textLines(text);
        let widths = [];
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
    static textLines(text, w) {
        let lines = text.split("\n");
        let nlines = [];
        if (w === null || w === undefined)
            return lines;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            let line = '';
            let words = lines[lineIndex].split(' ');
            for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
                let testLine = ''.concat(line + words[wordIndex]) + ' ';
                let testWidth = textWidth(testLine);
                if (testWidth > w && line.length > 0) {
                    nlines.push(line);
                    line = ''.concat(words[wordIndex]) + ' ';
                }
                else {
                    line = testLine;
                }
            }
            nlines.push(line);
        }
        return nlines;
    }
    static textHeight(text, font, size, style) {
        push();
        textStyle(style);
        textSize(size);
        textFont(font);
        let h = DrawUtils.textLines(text).length * textLeading();
        pop();
        return h;
    }
}
