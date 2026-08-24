import { db } from "../db";
import { messageQueue } from "../db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { instagramService } from "../services/instagram";

// Batch size per poll (e.g. 5 items)
const BATCH_SIZE = 5;
// Maximum attempts before marking as permanently FAILED
const MAX_ATTEMPTS = 3;

/**
 * Polls the queue for PENDING messages and processes them.
 */
async function processQueue() {
  try {
    // 1. Fetch a small batch of PENDING items
    // Using a transaction/FOR UPDATE isn't strictly necessary for a single-instance worker,
    // but we can just fetch and update status to PROCESSING.
    
    // Select batch
    const pendingItems = await db
      .select()
      .from(messageQueue)
      .where(eq(messageQueue.status, "PENDING"))
      .limit(BATCH_SIZE);

    if (pendingItems.length === 0) {
      return; // Queue is empty
    }

    const itemIds = pendingItems.map(item => item.id);

    // 2. Mark them as PROCESSING
    await db
      .update(messageQueue)
      .set({ 
        status: "PROCESSING", 
        updatedAt: new Date() 
      })
      .where(inArray(messageQueue.id, itemIds));

    // 3. Process each item sequentially to respect rate limits more gracefully
    for (const item of pendingItems) {
      try {
        await instagramService.sendDirectMessage(item.commentId, item.replyMessage);
        
        // Also post a public reply
        try {
          await instagramService.replyToComment(item.commentId, "I just sent you a DM! 🚀");
        } catch (replyError: any) {
          console.error(`[Worker] Could not post public reply for comment ${item.commentId}: ${replyError.message}`);
          // Don't fail the whole job if only the public reply fails
        }

        // 4a. On success
        await db
          .update(messageQueue)
          .set({ 
            status: "SENT", 
            updatedAt: new Date() 
          })
          .where(eq(messageQueue.id, item.id));
          
        console.log(`[Worker] Successfully sent DM for comment ${item.commentId}`);

      } catch (error: any) {
        // 4b. On failure
        const newAttempts = item.attempts + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING"; // Retry if below limit
        
        await db
          .update(messageQueue)
          .set({ 
            status: newStatus, 
            attempts: newAttempts,
            errorMessage: error.message,
            updatedAt: new Date() 
          })
          .where(eq(messageQueue.id, item.id));

        console.error(`[Worker] Failed to send DM for comment ${item.commentId} (Attempt ${newAttempts}/${MAX_ATTEMPTS}): ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`[Worker] Critical error in processQueue:`, error);
  }
}

/**
 * Starts the background worker.
 * Defaults to 20 seconds polling interval (~15 messages per minute max, well within 750/hour).
 */
export function startQueueWorker(intervalMs: number = 20000) {
  console.log(`[Worker] Starting queue worker. Polling every ${intervalMs / 1000} seconds...`);
  setInterval(processQueue, intervalMs);
}
