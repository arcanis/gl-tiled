export type ExtrudeOptions = {
    tileWidth: number;
    tileHeight: number;
    marginSize: number;
};

export function extrudeImage(img: HTMLCanvasElement | HTMLImageElement, opts: ExtrudeOptions) {
    if (opts.marginSize === 0)
        return img;

    const spacingSize = 2;
    const marginSize = 1;

    const memCanvas = document.createElement(`canvas`);
    memCanvas.width = img.width;
    memCanvas.height = img.height;
    const memContext = memCanvas.getContext(`2d`)!;
    memContext.drawImage(img, 0, 0);

    const columns = img.width / opts.tileWidth;
    const rows = img.height / opts.tileHeight;

    const extrudedCanvas = document.createElement('canvas');
    extrudedCanvas.width = memCanvas.width + (columns - 1) * spacingSize + marginSize * 2;
    extrudedCanvas.height = memCanvas.height + (rows - 1) * spacingSize + marginSize * 2;
    const extrudedContext = extrudedCanvas.getContext('2d')!;

    // Copying the tiles in the target canvas, separated by empty lines

    for (let y = 0; y < rows; ++y) {
        for (let x = 0; x < columns; ++x) {
            const sx = x * opts.tileWidth;
            const sy = y * opts.tileHeight;

            const dx = x * (opts.tileWidth + spacingSize) + marginSize;
            const dy = y * (opts.tileHeight + spacingSize) + marginSize;

            extrudedContext.drawImage(memCanvas, sx, sy, opts.tileWidth, opts.tileHeight, dx, dy, opts.tileWidth, opts.tileHeight);
        }
    }

    if (true) {
        const memData = memContext.getImageData(0, 0, memCanvas.width, memCanvas.height);
        const extrudedData = extrudedContext.getImageData(0, 0, extrudedCanvas.width, extrudedCanvas.height);

        for (let y = 0; y < rows; ++y) {
            const pixelsAbove = (y * (opts.tileHeight + spacingSize) + marginSize) * extrudedData.width;

            for (let x = 0; x < columns; ++x) {
                const pixelsLeft = x * (opts.tileWidth + spacingSize) + marginSize;

                for (let pixel = 0; pixel < opts.tileWidth; ++pixel) {
                    const aboveLine = pixelsAbove + pixelsLeft + pixel - extrudedData.width;
                    const belowLine = aboveLine + (opts.tileHeight + spacingSize - 1) * extrudedData.width;

                    extrudedData.data[aboveLine * 4 + 0] = memData.data[((y * opts.tileHeight * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 0];
                    extrudedData.data[aboveLine * 4 + 1] = memData.data[((y * opts.tileHeight * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 1];
                    extrudedData.data[aboveLine * 4 + 2] = memData.data[((y * opts.tileHeight * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 2];
                    extrudedData.data[aboveLine * 4 + 3] = memData.data[((y * opts.tileHeight * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 3];

                    extrudedData.data[belowLine * 4 + 0] = memData.data[((((y + 1) * opts.tileHeight - 1) * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 0];
                    extrudedData.data[belowLine * 4 + 1] = memData.data[((((y + 1) * opts.tileHeight - 1) * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 1];
                    extrudedData.data[belowLine * 4 + 2] = memData.data[((((y + 1) * opts.tileHeight - 1) * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 2];
                    extrudedData.data[belowLine * 4 + 3] = memData.data[((((y + 1) * opts.tileHeight - 1) * memCanvas.width) + x * opts.tileWidth + pixel) * 4 + 3];
                }
            }
        }

        extrudedContext.putImageData(extrudedData, 0, 0);

        for (let x = 0; x < columns; ++x) {
            const sx1 = marginSize + (opts.tileWidth + spacingSize) * x;
            const sx2 = marginSize + (opts.tileWidth + spacingSize) * x + opts.tileWidth - 1;

            extrudedContext.drawImage(extrudedCanvas, sx1, 0, 1, extrudedCanvas.height, sx1 - 1, 0, 1, extrudedCanvas.height);
            extrudedContext.drawImage(extrudedCanvas, sx2, 0, 1, extrudedCanvas.height, sx2 + 1, 0, 1, extrudedCanvas.height);
        }
    }

    return extrudedCanvas;
}
