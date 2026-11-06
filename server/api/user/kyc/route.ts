import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const VALID_DOC_TYPES = ['Aadhaar', 'PAN', 'GSTIN', 'Passport'];

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const doc = await userRepository.findLatestKycDocument(authContext.userId);
    return NextResponse.json({
      kycStatus: authContext.user.kycStatus,
      document: doc
        ? {
            id: doc.id,
            documentType: doc.documentType,
            documentNumber: doc.documentNumber,
            fileUrl: doc.fileUrl,
            status: doc.status,
            rejectionReason: doc.rejectionReason,
            submittedAt: doc.submittedAt.toISOString(),
            reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
          }
        : null,
    });
  } catch (error: any) {
    console.error('API /api/user/kyc GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch KYC document' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { documentType, documentNumber, fileUrl } = body;

    if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid document type. Allowed types: ${VALID_DOC_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const cleanDocNumber = String(documentNumber || '').trim();
    if (!cleanDocNumber || cleanDocNumber.length < 3 || cleanDocNumber.length > 64) {
      return NextResponse.json({ error: 'A valid document number is required' }, { status: 400 });
    }

    const last4 = cleanDocNumber.slice(-4);
    const maskedDocNumber = cleanDocNumber.length > 4 ? `****-****-${last4}` : cleanDocNumber;

    const cleanFileUrl = String(fileUrl || '').trim();
    if (!cleanFileUrl) {
      return NextResponse.json({ error: 'Document file scan is required' }, { status: 400 });
    }

    // Validate uploaded document file format and size server-side
    const ALLOWED_MIME_PREFIXES = [
      'data:image/jpeg;base64,',
      'data:image/jpg;base64,',
      'data:image/png;base64,',
      'data:image/webp;base64,',
      'data:application/pdf;base64,',
    ];

    const isAllowedFormat = ALLOWED_MIME_PREFIXES.some((prefix) => cleanFileUrl.startsWith(prefix));
    if (!isAllowedFormat) {
      return NextResponse.json(
        { error: 'Invalid document file format. Only JPG, PNG, WEBP, and PDF scans are accepted.' },
        { status: 400 }
      );
    }

    // Server-side file size check (max 5MB = ~6.8MB base64 encoded string)
    if (cleanFileUrl.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: 'Document scan file size exceeds maximum limit of 5MB.' }, { status: 400 });
    }

    const id = `kyc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const created = await userRepository.createKycDocument({
      id,
      userId: authContext.userId, // Authenticated user ID derived strictly from verified session
      documentType,
      documentNumber: maskedDocNumber,
      fileUrl: cleanFileUrl,
    });

    return NextResponse.json(
      {
        success: true,
        document: {
          id: created.id,
          documentType: created.documentType,
          documentNumber: created.documentNumber,
          fileUrl: created.fileUrl,
          status: created.status,
          submittedAt: created.submittedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API /api/user/kyc POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit KYC document' }, { status: 500 });
  }
}
