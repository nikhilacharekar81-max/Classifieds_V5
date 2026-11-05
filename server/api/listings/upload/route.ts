import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { uploadImage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const url = await uploadImage(file);
    
    return NextResponse.json({ url }, { status: 200 });
  } catch (err: any) {
    console.error('Upload failed:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}

