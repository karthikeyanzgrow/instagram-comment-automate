import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const GRAPH_API_VERSION = 'v20.0'; // You can update this based on current API version

export const instagramService = {
  /**
   * Send a Direct Message as a reply to a comment.
   * @param commentId The unique ID of the comment to reply to
   * @param text The message text to send
   */
  async sendDirectMessage(commentId: string, text: string): Promise<any> {
    if (!PAGE_ACCESS_TOKEN || !IG_ACCOUNT_ID) {
      throw new Error("Missing Meta Graph API credentials in environment variables.");
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;

    const payload = {
      recipient: {
        comment_id: commentId
      },
      message: {
        text: text
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      // Log the exact error from Meta for easier debugging
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to send DM: ${errorMessage}`);
    }
  },
  
  /**
   * Post a public reply to an Instagram comment.
   * @param commentId The ID of the comment to reply to
   * @param text The text of the reply (e.g. "Sent you a DM!")
   */
  async replyToComment(commentId: string, text: string): Promise<any> {
    if (!PAGE_ACCESS_TOKEN) {
      throw new Error("Missing PAGE_ACCESS_TOKEN.");
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${commentId}/replies`;

    const payload = {
      message: text
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to post public reply: ${errorMessage}`);
    }
  }
};
