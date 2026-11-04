import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { cmsRepository } from '@/server/repositories/cms.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const isStaff = !!(authContext?.isAdmin || authContext?.isModerator);
    const allPages = await cmsRepository.findAllPages();
    const cmsPages = isStaff ? allPages : allPages.filter((p) => p.status === 'published');

    return NextResponse.json(cmsPages);
  } catch (error: any) {
    console.error('API /api/admin/cms GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch CMS pages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin && !authContext.isModerator) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = body.slug || body.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const id = body.id || `p_${Date.now().toString(36)}`;

    const created = await cmsRepository.createPage({
      id,
      slug,
      title: body.title,
      content: body.content,
      seoTitle: body.seoTitle || undefined,
      seoDescription: body.seoDescription || undefined,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/cms POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create CMS page' }, { status: 500 });
  }
}
