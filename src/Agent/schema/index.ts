type JsonSchema = {
  description?: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  nullable?: boolean;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};
import mongoose, { Document, Schema, Model } from "mongoose";

export type InstagramCommentSchema = JsonSchema;

export const getInstagramCommentSchema = (): InstagramCommentSchema => {
    return {
        description: `Lists comments that are engaging and have the potential to attract more likes and go viral.`,
        type: "array",
        items: {
            type: "object",
            properties: {
                comment: {
                    type: "string",
                    description: "A comment between 20 and 50 characters.",
                    nullable: false,
                },
                viralRate: {
                    type: "number",
                    description: "The viral rate, measured on a scale of 0 to 100.",
                    nullable: false,
                },
                commentTokenCount: {
                    type: "number",
                    description: "The total number of tokens in the comment.",
                    nullable: false,
                },
            },
            required: [
                "comment",
                "viralRate",
                "commentTokenCount"
            ],
        },
    };
};

export const getTweetSchema = (): JsonSchema => {
    return {
        description: "A tweet that is engaging and fits the character's style.",
        type: "object",
        properties: {
            content: {
                type: "string",
                description: "The main text content of the tweet (max 280 characters).",
                nullable: false,
            },
            hashtags: {
                type: "array",
                items: { type: "string" },
                description: "Relevant hashtags for the tweet.",
            },
            viralPotential: {
                type: "number",
                description: "Predicted viral potential from 0 to 100.",
            }
        },
        required: ["content"]
    };
};



// Define the interface for the Tweet document
interface ITweet extends Document {
  tweetContent: string;
  imageUrl: string;
  timeTweeted: Date;
}

// Define the schema for the Tweet document
const tweetSchema: Schema<ITweet> = new Schema({
  tweetContent: { type: String, required: true },
  imageUrl: { type: String, required: true },
  timeTweeted: { type: Date, default: Date.now },
});

// Create the model for the Tweet document
const Tweet: Model<ITweet> = mongoose.model<ITweet>("Tweet", tweetSchema);

export default Tweet;
    