export const fileTypeFromBuffer = jest.fn().mockResolvedValue({
    ext: "png",
    mime: "image/png",
});

export const fileTypeFromStream = jest.fn().mockResolvedValue({
    ext: "png",
    mime: "image/png",
});

export default {
    fileTypeFromBuffer,
    fileTypeFromStream,
};
