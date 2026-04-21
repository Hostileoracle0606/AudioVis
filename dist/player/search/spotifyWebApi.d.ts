import type { SearchResult } from "../state.js";
type HttpClient = {
    get: (url: string, config?: any) => Promise<{
        status: number;
        data: any;
    }>;
    post: (url: string, body?: any, config?: any) => Promise<{
        status: number;
        data: any;
    }>;
};
export declare function __setAxiosForTest(c: HttpClient): void;
export declare function __resetTokenCacheForTest(): void;
export declare function getAccessToken(): Promise<string>;
export declare function searchTracks(query: string, signal?: AbortSignal): Promise<SearchResult[]>;
export {};
//# sourceMappingURL=spotifyWebApi.d.ts.map