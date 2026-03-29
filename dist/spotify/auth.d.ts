import type { TokenPayload } from "./types.js";
export declare function buildAuthUrl(): string;
export declare function exchangeCode(code: string): Promise<TokenPayload>;
export declare function refreshAccessToken(refreshToken: string): Promise<TokenPayload>;
/**
 * Full login flow: open browser, start callback server, exchange code.
 * Returns the saved TokenPayload.
 */
export declare function login(): Promise<TokenPayload>;
//# sourceMappingURL=auth.d.ts.map