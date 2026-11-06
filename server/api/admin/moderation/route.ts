import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { moderationService } from '@/server/services/moderation.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canModerateListings')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const reports = await moderationService.getReports(status);
    const rules = await moderationService.getRules();
    const appeals = await moderationService.getBanAppeals(status);

    return NextResponse.json({ reports, rules, appeals });
  } catch (error: any) {
    console.error('API /api/admin/moderation GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canModerateListings')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const { action, reportId, note, actionType, targetListingId, ruleData, appealId, decision, reviewNotes, unbanUser } = await req.json();
    const actor = {
      id: authContext.userId,
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
    };

    if (action === 'action_report' && reportId) {
      const success = await moderationService.actionReport(
        reportId,
        note || 'Action taken by moderator',
        actionType || 'actioned',
        targetListingId,
        actor
      );
      return NextResponse.json({ success });
    }

    if (action === 'review_appeal' && appealId && decision) {
      const success = await moderationService.reviewBanAppeal({
        appealId,
        decision: decision === 'accepted' ? 'accepted' : 'rejected',
        reviewNotes: reviewNotes || note || 'Reviewed by moderator',
        unbanUser: Boolean(unbanUser),
        actor,
      });
      return NextResponse.json({ success });
    }

    if (action === 'add_rule' && ruleData) {
      const rule = await moderationService.addRule(ruleData, actor);
      return NextResponse.json(rule);
    }

    if (action === 'toggle_rule' && ruleData?.id) {
      const active = await moderationService.toggleRule(ruleData.id);
      return NextResponse.json({ active });
    }

    return NextResponse.json({ error: 'Unsupported moderation action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/admin/moderation POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
