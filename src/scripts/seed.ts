import { db } from "../db";
import { campaigns } from "../db/schema";

async function seed() {
  console.log("Seeding database...");

  try {
    await db.insert(campaigns).values([
      {
        keyword: "guide",
        replyMessage: "Hey! Thanks for commenting. Here is the link to your free guide: https://example.com/guide",
        isActive: true,
      },
      {
        keyword: "pdf",
        replyMessage: "Hi there! I just sent you a DM with the PDF you requested. Download it here: https://example.com/pdf",
        isActive: true,
      },
      {
        keyword: "link",
        replyMessage: "Hello! Here is the exclusive link: https://example.com/exclusive",
        // This could be specific to a certain reel:
        // mediaId: "1234567890_0987654321", 
        isActive: true,
      }
    ]);

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
