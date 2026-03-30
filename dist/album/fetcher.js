"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchImageBuffer = fetchImageBuffer;
const axios_1 = __importDefault(require("axios"));
/**
 * Fetch a remote image URL and return its raw bytes as a Buffer.
 * Throws on network error or non-2xx response.
 */
async function fetchImageBuffer(url) {
    const response = await axios_1.default.get(url, {
        responseType: "arraybuffer",
        timeout: 8000,
    });
    return Buffer.from(response.data);
}
//# sourceMappingURL=fetcher.js.map