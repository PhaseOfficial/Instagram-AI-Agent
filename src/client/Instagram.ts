import { IgClient } from './IG-bot/IgClient';
import logger from '../config/logger';

type ClientEntry = {
    client: IgClient;
    creds: { username: string; password: string };
    lastInitError: string | null;
    lastInitAt: string | null;
};

const igClients = new Map<string, ClientEntry>();

export const getIgClientsSnapshot = () => {
    const out: Record<string, { initialized: boolean; lastInitAt: string | null; lastInitError: string | null }> = {};
    for (const [key, entry] of igClients.entries()) {
        out[key] = {
            initialized: !!entry,
            lastInitAt: entry.lastInitAt,
            lastInitError: entry.lastInitError,
        };
    }
    return out;
};

export const getIgClient = async (username?: string, password?: string, accountKey: string = 'default'): Promise<IgClient> => {
    const key = accountKey || 'default';
    const entry = igClients.get(key);
    
    logger.info(`getIgClient called for account: ${key}, username provided: ${username || 'none'}`);

    if (entry) {
        // Use cached credentials if not provided
        const effectiveUsername = username || entry.creds.username;
        const effectivePassword = password || entry.creds.password;

        // If username was provided, it must match the cached one
        const usernameMatch = !username || entry.creds.username === username;
        
        if (usernameMatch) {
            if (entry.client.isInitialized()) {
                logger.info(`Returning existing initialized client for ${key} (@${entry.creds.username})`);
                return entry.client;
            } else {
                logger.info(`Re-initializing existing client for ${key} (@${entry.creds.username})`);
                try {
                    // Update client credentials in case they were updated
                    if (username && password) {
                        // We might need a way to update IgClient's internal credentials if they change
                        // but for now we assume they are consistent with the entry.
                    }
                    await entry.client.init();
                    entry.lastInitAt = new Date().toISOString();
                    entry.lastInitError = null;
                    return entry.client;
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    logger.error(`Failed to re-initialize client for ${key}: ${msg}`);
                    entry.lastInitError = msg;
                    throw error;
                }
            }
        } else {
            logger.warn(`Username mismatch for existing account ${key}. Cached: @${entry.creds.username}, Provided: @${username}. Creating new client.`);
        }
    }

    // Otherwise create new client
    logger.info(`Creating new IgClient for ${key} (@${username || 'default'})`);
    const client = new IgClient(username, password);
    const creds = { username: username || '', password: password || '' };
    try {
        await client.init();
        igClients.set(key, { client, creds, lastInitError: null, lastInitAt: new Date().toISOString() });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to initialize new Instagram client for ${key}: ${msg}`);
        igClients.set(key, { client, creds, lastInitError: msg, lastInitAt: null });
        throw error;
    }
    return client;
};

export const getIgClientStatus = (accountKey: string = 'default') => {
    const entry = igClients.get(accountKey);
    return {
        initialized: !!entry,
        lastInitAt: entry?.lastInitAt || null,
        lastInitError: entry?.lastInitError || null,
    };
};

export const closeIgClient = async (accountKey: string = 'default') => {
    const entry = igClients.get(accountKey);
    if (entry) {
        await entry.client.close();
        igClients.delete(accountKey);
    }
};

export { scrapeFollowersHandler } from './IG-bot/IgClient'; 
