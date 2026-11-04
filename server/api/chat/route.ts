import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { chatRepository } from '@/server/repositories/chat.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required to access chat' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');
    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const isSeller = authContext.userId === listing.sellerId;
    const isPrivilegedAdmin = Boolean(authContext.isAdmin || authContext.isSuperAdmin);

    if (isSeller || isPrivilegedAdmin) {
      const targetBuyerId = searchParams.get('buyerId');
      if (targetBuyerId) {
        // Fetch specific conversation with the requested buyer
        const messages = await chatRepository.findMessagesForConversation(
          listingId,
          listing.sellerId,
          targetBuyerId
        );
        return NextResponse.json({ messages });
      }
      // If seller or admin doesn't pass a specific buyerId, fetch all messages related to seller for this listing
      const allMessages = await chatRepository.findMessagesForListing(listingId);
      const filtered = allMessages.filter(
        (m) => m.senderId === listing.sellerId || m.receiverId === listing.sellerId
      );
      return NextResponse.json({ messages: filtered });
    }

    // Buyer accessing chat: strictly scoped to the conversation between this authenticated buyer and the seller
    const messages = await chatRepository.findMessagesForConversation(
      listingId,
      authContext.userId,
      listing.sellerId
    );
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

    let receiverId = listing.sellerId;
    if (authContext.userId === listing.sellerId) {
      // Seller sending message: require explicit recipient buyer ID
      if (!explicitReceiverId || typeof explicitReceiverId !== 'string') {
        return NextResponse.json(
          { error: 'receiverId is required when seller sends a message' },
          { status: 400 }
        );
      }
      receiverId = explicitReceiverId;
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
