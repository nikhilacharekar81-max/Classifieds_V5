import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, or, and, asc } from '@/src/db/pg-orm';

export interface ChatMessageItem {
  id: string;
  listingId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  readAt?: string;
  createdAt: string;
}

export class ChatRepository {
  public async findMessagesForConversation(
    listingId: string,
    participant1: string,
    participant2: string
  ): Promise<ChatMessageItem[]> {
    try {
      const rows = await db
        .select()
        .from(schema.chatMessages)
        .where(
          and(
            eq(schema.chatMessages.listingId, listingId),
            or(
              and(
                eq(schema.chatMessages.senderId, participant1),
                eq(schema.chatMessages.receiverId, participant2)
              ),
              and(
                eq(schema.chatMessages.senderId, participant2),
                eq(schema.chatMessages.receiverId, participant1)
              )
            )
          )
        )
        .orderBy(asc(schema.chatMessages.createdAt));

      return rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        senderId: r.senderId,
        receiverId: r.receiverId,
        messageText: r.messageText,
        readAt: r.readAt ? r.readAt.toISOString() : undefined,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error('ChatRepository.findMessagesForConversation error:', error);
      return [];
    }
  }

  public async findMessagesForListing(listingId: string): Promise<ChatMessageItem[]> {
    try {
      const rows = await db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.listingId, listingId))
        .orderBy(asc(schema.chatMessages.createdAt));

      return rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        senderId: r.senderId,
        receiverId: r.receiverId,
        messageText: r.messageText,
        readAt: r.readAt ? r.readAt.toISOString() : undefined,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error('ChatRepository.findMessagesForListing error:', error);
      return [];
    }
  }

  public async createMessage(data: {
    id: string;
    listingId: string;
    senderId: string;
    receiverId: string;
    messageText: string;
  }): Promise<ChatMessageItem> {
    try {
      const inserted = await db
        .insert(schema.chatMessages)
        .values({
          id: data.id,
          listingId: data.listingId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          messageText: data.messageText,
        })
        .returning();

      const r = inserted[0];
      return {
        id: r.id,
        listingId: r.listingId,
        senderId: r.senderId,
        receiverId: r.receiverId,
        messageText: r.messageText,
        readAt: r.readAt ? r.readAt.toISOString() : undefined,
        createdAt: r.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('ChatRepository.createMessage error:', error);
      throw new Error('Failed to create chat message in PostgreSQL', { cause: error });
    }
  }
}

export const chatRepository = new ChatRepository();
