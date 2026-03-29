import axios from "axios";

/**
 * Fetch a remote image URL and return its raw bytes as a Buffer.
 * Throws on network error or non-2xx response.
 */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 8000,
  });
  return Buffer.from(response.data);
}
