import { Router, Request, Response } from 'express';
import { db } from '../db';
import { campaigns } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const GRAPH_API_VERSION = 'v20.0';

// GET all campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    res.json(allCampaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new campaign
router.post('/campaigns', async (req: Request, res: Response) => {
  const { keyword, replyMessage, mediaId } = req.body;
  
  if (!keyword || !replyMessage) {
    return res.status(400).json({ error: 'Keyword and reply message are required.' });
  }

  try {
    const newCampaign = await db.insert(campaigns).values({
      keyword: keyword.toLowerCase().trim(),
      replyMessage: replyMessage.trim(),
      mediaId: mediaId || null,
      isActive: true
    }).returning();
    
    res.json(newCampaign[0]);
  } catch (error: any) {
    // Check for unique constraint violation (duplicate keyword)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This keyword already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE a campaign
router.delete('/campaigns/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.delete(campaigns).where(eq(campaigns.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET recent Instagram media for the picker
router.get('/media', async (req: Request, res: Response) => {
  if (!PAGE_ACCESS_TOKEN || !IG_ACCOUNT_ID) {
    return res.status(500).json({ error: "Missing Meta Graph API credentials in server environment." });
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${IG_ACCOUNT_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24&access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const response = await axios.get(url);
    res.json(response.data.data);
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
