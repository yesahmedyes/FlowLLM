import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { chats } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { UIMessage } from "ai";

export const chatRouter = createTRPCRouter({
  getChatById: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const { user } = ctx;

    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, input.id), eq(chats.userId, user.id)),
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    return chat;
  }),
  getChats: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).default(10),
        cursor: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const { user } = ctx;

      const chatsList = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: [desc(chats.updatedAt)],
        limit: limit,
        offset: cursor,
      });

      const nextCursor = (cursor ?? 0) + chatsList.length;
      const hasMore = chatsList.length === limit;

      return {
        items: chatsList,
        nextCursor: hasMore ? nextCursor : null,
      };
    }),
  upsertChat: protectedProcedure
    .input(z.object({ id: z.string(), messages: z.array(z.custom<UIMessage>()) }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      return db
        .insert(chats)
        .values({
          id: input.id,
          userId: user.id,
          messages: input.messages,
        })
        .onConflictDoUpdate({
          target: chats.id,
          set: { messages: input.messages },
        });
    }),
  updateChatName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      await db
        .update(chats)
        .set({ name: input.name })
        .where(and(eq(chats.id, input.id), eq(chats.userId, user.id)));
    }),
  deleteChat: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const { user } = ctx;

    await db.delete(chats).where(and(eq(chats.id, input.id), eq(chats.userId, user.id)));
  }),
});
