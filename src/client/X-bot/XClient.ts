import { twitterClient } from './client';
import logger from '../../config/logger';
import { runAgent, chooseCharacter } from '../../Agent';
import { getTweetSchema } from '../../Agent/schema';
import Tweet from '../../Agent/schema';
import moment from "moment";
import { setRunSummary } from '../../utils/runSummary';

export class XClient {
    async canSendTweet() {
        const twentyFourHoursAgo = moment().subtract(24, "hours").toDate();
        const tweetCount = await Tweet.countDocuments({
            timeTweeted: { $gte: twentyFourHoursAgo },
        });

        if (tweetCount >= 17) {
            logger.warn("Twitter rate limit reached (17 tweets/24h).");
            return false;
        }
        return true;
    }

    async postTweet(content: string) {
        try {
            if (!(await this.canSendTweet())) {
                throw new Error("Daily tweet limit reached.");
            }
            logger.info(`Posting tweet: ${content}`);
            const { data } = await twitterClient.v2.tweet(content);
            
            // Log to database
            await Tweet.create({
                tweetContent: content,
                imageUrl: '', // Optional for now
                timeTweeted: new Date()
            });

            logger.info(`Tweet posted successfully. ID: ${data.id}`);
            return data;
        } catch (error) {
            logger.error('Error posting tweet:', error);
            throw error;
        }
    }

    async generateAndPostTweet(prompt?: string) {
        const schema = getTweetSchema();
        const character = chooseCharacter();
        const defaultPrompt = `Generate a human-like tweet in the style of ${character.name || 'this character'}. 
        Character details: ${JSON.stringify(character)}.
        The tweet should be engaging, organic, and fit within 280 characters.
        ${prompt ? `Context: ${prompt}` : ''}`;

        try {
            const result = await runAgent(schema, defaultPrompt);
            const content = result.content;
            if (content) {
                return await this.postTweet(content);
            } else {
                throw new Error('AI failed to generate tweet content.');
            }
        } catch (error) {
            logger.error('Error in generateAndPostTweet:', error);
            throw error;
        }
    }

    async likeTweet(tweetId: string) {
        try {
            // Need user ID to like a tweet in v2
            const me = await twitterClient.v2.me();
            await twitterClient.v2.like(me.data.id, tweetId);
            logger.info(`Liked tweet: ${tweetId}`);
        } catch (error) {
            logger.error(`Error liking tweet ${tweetId}:`, error);
            throw error;
        }
    }

    async replyToTweet(tweetId: string, content: string) {
        try {
            const { data } = await twitterClient.v2.tweet(content, {
                reply: { in_reply_to_tweet_id: tweetId }
            });
            logger.info(`Replied to tweet ${tweetId} with content: ${content}`);
            return data;
        } catch (error) {
            logger.error(`Error replying to tweet ${tweetId}:`, error);
            throw error;
        }
    }

    async searchAndInteract(query: string, limit: number = 5) {
        const startedAt = new Date();
        const summary = {
            platform: 'twitter' as const,
            startedAt: startedAt.toISOString(),
            finishedAt: '',
            durationMs: 0,
            tweetsProcessed: 0,
            likes: 0,
            replies: 0,
            errors: 0,
        };

        try {
            logger.info(`Searching for tweets with query: ${query}`);
            const searchResult = await twitterClient.v2.search(query, {
                max_results: limit,
                "tweet.fields": ["author_id", "text"]
            });

            if (!searchResult.data || !searchResult.data.data) {
                logger.info("No tweets found for query.");
                summary.finishedAt = new Date().toISOString();
                setRunSummary(summary);
                return;
            }

            for (const tweet of searchResult.data.data) {
                try {
                    logger.info(`Interacting with tweet ${tweet.id} by ${tweet.author_id}`);

                    // Like the tweet
                    await this.likeTweet(tweet.id);
                    summary.likes++;

                    // Random delay
                    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));

                    // Reply
                    const character = chooseCharacter();
                    const prompt = `Reply to this tweet: "${tweet.text}" in the style of ${character.name}.`;
                    const replyData = await runAgent(getTweetSchema(), prompt);
                    if (replyData.content) {
                        await this.replyToTweet(tweet.id, replyData.content);
                        summary.replies++;
                    }

                    summary.tweetsProcessed++;
                    await new Promise(resolve => setTimeout(resolve, 10000 + Math.random() * 10000));
                } catch (tweetError) {
                    logger.error(`Error interacting with tweet ${tweet.id}:`, tweetError);
                    summary.errors++;
                }
            }
        } catch (error) {
            logger.error('Error in searchAndInteract:', error);
            summary.errors++;
            throw error;
        } finally {
            const finishedAt = new Date();
            summary.finishedAt = finishedAt.toISOString();
            summary.durationMs = finishedAt.getTime() - startedAt.getTime();
            setRunSummary(summary);
        }
    }
}
