import { Router, Request, Response } from 'express';
import { db } from '../db';
import { campaigns, messageQueue } from '../db/schema';
import { ilike, or, isNull, eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();
const IG_VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || '';

/**
 * GET /instagram-webhook
 * Verification endpoint for Meta Webhook setup.
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === IG_VERIFY_TOKEN) {
    console.log('[Webhook] Webhook verified successfully.');
    res.status(200).send(challenge);
  } else {
    console.error('[Webhook] Verification failed. Token mismatch.');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /instagram-webhook
 * Listens for incoming events from Meta (Instagram comments).
 */
router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  // Make sure this is an event from the Instagram Graph API
  if (body.object === 'instagram') {
    // Return a '200 OK' response to all events to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');

    // Iterate over each entry
    for (const entry of body.entry || []) {
      // Iterate over each change in the entry
      for (const change of entry.changes || []) {
        // We only care about the 'comments' field
        if (change.field === 'comments') {
          const value = change.value;
          
          const commentId = value.id;
          const commentText = value.text || '';
          const mediaId = value.media?.id;

          if (!commentId || !commentText) continue;

          console.log(`[Webhook] Received comment ${commentId} on media ${mediaId}: "${commentText}"`);

          try {
            // Find active campaigns that match the keyword
            // Keyword match is implemented as a simple contains/ilike match
            
            // To be efficient, we can fetch all active campaigns that could match this post
            // (either specific to this media, or global) and check in memory, OR
            // we can try an SQL query. Since keywords might be embedded in sentences, 
            // a basic implementation fetches all relevant active campaigns and checks them in JS, 
            // or we can use SQL ILIKE.
            
            const activeCampaigns = await db
              .select()
              .from(campaigns)
              .where(
                and(
                  eq(campaigns.isActive, true),
                  or(
                    isNull(campaigns.mediaId),
                    eq(campaigns.mediaId, mediaId)
                  )
                )
              );

            // Find first matching campaign based on keyword in comment text (case-insensitive)
            const matchedCampaign = activeCampaigns.find(c => 
              commentText.toLowerCase().includes(c.keyword.toLowerCase())
            );

            if (matchedCampaign) {
              console.log(`[Webhook] Keyword match found for campaign: ${matchedCampaign.keyword}`);
              
              // Enqueue the DM task
              await db.insert(messageQueue).values({
                commentId: commentId,
                mediaId: mediaId,
                replyMessage: matchedCampaign.replyMessage,
                status: 'PENDING',
                attempts: 0
              });
              
              console.log(`[Webhook] Queued DM for comment ${commentId}`);
            }
          } catch (error) {
            console.error(`[Webhook] Error processing comment ${commentId}:`, error);
          }
        }
      }
    }
  } else {
    // Return a '404 Not Found' if event is not from an Instagram subscription
    res.sendStatus(404);
  }
});

export default router;
