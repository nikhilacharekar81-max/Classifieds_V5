import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { moderationService } from '@/server/services/moderation.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Authentication required to submit a safety report. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { targetType, type: rawType, targetId, targetTitle, reason, notes, comments } = body;

    const reportType = (targetType || rawType || 'listing') as 'listing' | 'user' | 'message';
    if (!['listing', 'user', 'message'].includes(reportType)) {
      return NextResponse.json({ error: 'Invalid report target type' }, { status: 400 });
    }

    if (!targetId || typeof targetId !== 'string') {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    const cleanReason = String(reason || '').trim();
    if (!cleanReason) {
      return NextResponse.json({ error: 'Report reason is required' }, { status: 400 });
    }

    const reportNotes = String(notes || comments || 'User submitted report').trim();

    const created = await moderationService.submitReport({
      type: reportType,
      targetId: String(targetId).trim(),
      targetTitle: String(targetTitle || `${reportType} #${targetId}`).trim(),
      reportedBy: authContext.userId, // Derived strictly from verified session; never trust client-supplied ID
      reason: cleanReason,
      notes: reportNotes,
    });

    return NextResponse.json({ success: true, report: created }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/reports POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit report' }, { status: 500 });
  }
}
