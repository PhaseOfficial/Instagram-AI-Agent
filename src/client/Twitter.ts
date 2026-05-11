import { XClient } from './X-bot/XClient';

let xClient: XClient | null = null;

export const getXClient = (): XClient => {
    if (!xClient) {
        xClient = new XClient();
    }
    return xClient;
};
