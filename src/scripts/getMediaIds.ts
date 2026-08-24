import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const GRAPH_API_VERSION = 'v20.0'; 

async function getMedia() {
  if (!PAGE_ACCESS_TOKEN || !IG_ACCOUNT_ID) {
    console.error("Missing Meta Graph API credentials in environment variables.");
    process.exit(1);
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${IG_ACCOUNT_ID}/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=10&access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    console.log("Fetching your recent Instagram posts/reels...\n");
    const response = await axios.get(url);
    const mediaList = response.data.data;

    if (!mediaList || mediaList.length === 0) {
      console.log("No media found for this account.");
      return;
    }

    mediaList.forEach((media: any, index: number) => {
      // Truncate caption for cleaner output
      const shortCaption = media.caption ? media.caption.substring(0, 50).replace(/\n/g, ' ') + '...' : '(No caption)';
      
      console.log(`${index + 1}. [${media.media_type}] ID: ${media.id}`);
      console.log(`   Caption: ${shortCaption}`);
      console.log(`   Link: ${media.permalink}`);
      console.log(`--------------------------------------------------`);
    });

  } catch (error: any) {
    console.error("Error fetching media:", error.response?.data?.error?.message || error.message);
  }
}

getMedia();
