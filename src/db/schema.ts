import { pgTable, uuid, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyword: varchar("keyword", { length: 100 }).notNull().unique(), // Stored lowercase
  replyMessage: text("reply_message").notNull(),
  mediaId: varchar("media_id", { length: 100 }), // Nullable, if null applies to any post
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageQueue = pgTable("message_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  commentId: varchar("comment_id", { length: 100 }).notNull(),
  mediaId: varchar("media_id", { length: 100 }),
  replyMessage: text("reply_message").notNull(),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING, PROCESSING, SENT, FAILED
  attempts: integer("attempts").default(0).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
