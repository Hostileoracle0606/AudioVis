export interface AppConfig {
    spotify?: {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
        callbackPort?: number;
    };
    audio?: {
        macosDeviceName?: string;
        macosRoutingConfirmed?: boolean;
    };
}
export declare function loadConfig(): AppConfig;
export declare function saveConfig(nextConfig: AppConfig): AppConfig;
//# sourceMappingURL=store.d.ts.map