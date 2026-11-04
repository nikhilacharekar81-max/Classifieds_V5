import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { chatRepository } from '@/server/repositories/chat.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');
    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const messages = await chatRepository.findMessagesForListing(listingId);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('API /api/chat GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch chat messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required to send messages' }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, messageText, receiverId: explicitReceiverId } = body;

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const cleanText = String(messageText || '').trim();
    if (!cleanText) {
      return NextResponse.json({ error: 'messageText cannot be empty' }, { status: 400 });
    }

    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Determine receiver: if caller is seller, use explicitReceiverId; otherwise receiver is listing seller
    let receiverId = listing.sellerId;
    if (authContext.userId === listing.sellerId) {
      if (explicitReceiverId && typeof explicitReceiverId === 'string') {
        receiverId = explicitReceiverId;
      } else {
        // Find existing conversation buyer
        const existingMessages = await chatRepository.findMessagesForListing(listingId);
        const buyerMsg = existingMessages.find((m) => m.senderId !== listing.sellerId);
        receiverId = buyerMsg ? buyerMsg.senderId : listing.sellerId;
      }
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const created = await chatRepository.createMessage({
      id,
      listingId,
      senderId: authContext.userId,
      receiverId,
      messageText: cleanText,
    });

    return NextResponse.json({ success: true, message: created }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/chat POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send chat message' }, { status: 500 });
  }
}
