import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const budgets = sqliteTable("request_budgets", {
  bucket: text("bucket").primaryKey(),
  window: integer("window").notNull(),
  count: integer("count").notNull(),
});
