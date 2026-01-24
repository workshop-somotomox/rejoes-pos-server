import 'dotenv/config';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

type StepResult = {
  step: string;
  status: number;
  success: boolean;
  payload?: unknown;
  error?: string;
};

const prisma = new PrismaClient();
const API_BASE = 'https://rejoes-pos-server-oyolloo.up.railway.app';
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
  'base64'
);
const results: StepResult[] = [];

async function recordResult(step: string, status: number, success: boolean, payload?: unknown, error?: string) {
  results.push({ step, status, success, payload, error });
}

async function sendJson(step: string, url: string, options: RequestInit) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : text;
    } catch {
      // keep raw text
    }
    await recordResult(step, res.status, res.ok, body as unknown);
    return { res, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordResult(step, 0, false, undefined, message);
    throw error;
  }
}

async function uploadLoanPhoto(step: string, memberId: string, filename = 'photo.png') {
  const form = new FormData();
  form.append('memberId', memberId);
  form.append('photo', new Blob([tinyPng], { type: 'image/png' }), filename);
  try {
    const res = await fetch(`${API_BASE}/api/uploads/loan-photo`, {
      method: 'POST',
      body: form,
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : text;
    } catch {
      // ignore
    }
    await recordResult(step, res.status, res.ok, body);
    return { res, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordResult(step, 0, false, undefined, message);
    throw error;
  }
}

function computeHmac(payload: string) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

async function run() {
  try {
    const cardToken = `e2e-${Date.now()}`;

    // 1. Create member
    const createPayload = {
      cardToken,
      tier: 'PREMIUM',
      email: 'e2e@example.com',
      name: 'End To End',
      phone: '18005551111',
    };
    const { body: createBody } = await sendJson('Create member', `${API_BASE}/api/members/dev/seed-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });
    const memberId = (createBody as any)?.member?.id;

    // 2. Fetch member
    await sendJson('Get member after create', `${API_BASE}/api/members/by-card/${cardToken}`, {
      method: 'GET',
    });

    // 3. Upload loan photo for checkout
    const { body: uploadBody } = await uploadLoanPhoto('Upload loan photo (checkout)', memberId || '', 'checkout.png');
    const uploadId = (uploadBody as any)?.uploadId;

    // 3a. Checkout loan
    const { body: checkoutBody } = await sendJson('Checkout loan', `${API_BASE}/api/loans/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        memberId,
        uploadId,
        storeLocation: 'Test Store',
      }),
    });
    const loanId = (checkoutBody as any)?.id;

    // 4. Get member post-checkout for counters
    await sendJson('Get member after checkout', `${API_BASE}/api/members/by-card/${cardToken}`, {
      method: 'GET',
    });

    // 5. Return loan
    await sendJson('Return loan', `${API_BASE}/api/loans/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ memberId, loanId }),
    });

    await sendJson('Get member after return', `${API_BASE}/api/members/by-card/${cardToken}`, {
      method: 'GET',
    });

    // 6. Checkout new loan for swap scenario
    const { body: uploadBodyForSwap } = await uploadLoanPhoto('Upload loan photo (swap base)', memberId || '', 'swap-base.png');
    const swapBaseId = (uploadBodyForSwap as any)?.uploadId;
    const { body: checkoutSwapLoanBody } = await sendJson('Checkout loan for swap', `${API_BASE}/api/loans/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        memberId,
        uploadId: swapBaseId,
        storeLocation: 'Swap Store',
      }),
    });
    const swapLoanId = (checkoutSwapLoanBody as any)?.id;

    // 7. Upload new photo for swap action
    const { body: swapUploadBody } = await uploadLoanPhoto('Upload loan photo (swap new)', memberId || '', 'swap-new.png');
    const swapUploadId = (swapUploadBody as any)?.uploadId;

    await sendJson('Swap loan', `${API_BASE}/api/loans/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        memberId,
        loanId: swapLoanId,
        uploadId: swapUploadId,
        storeLocation: 'Swap Location',
      }),
    });

    await sendJson('Get member after swap', `${API_BASE}/api/members/by-card/${cardToken}`, {
      method: 'GET',
    });

    // 8. Verify loan photo linking via Prisma
    if (swapUploadId) {
      const loanPhotoRecord = await prisma.loanPhoto.findUnique({ where: { id: swapUploadId } });
      await recordResult('LoanPhoto linked to swapped loan', loanPhotoRecord ? 200 : 404, Boolean(loanPhotoRecord?.loanId), loanPhotoRecord);
    } else {
      await recordResult('LoanPhoto linked to swapped loan', 400, false, { error: 'Upload failed, no uploadId' });
    }

    await fs.writeFile('test/results.json', JSON.stringify({ results }, null, 2));
    console.log('E2E run complete. Results written to test/results.json');
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(async (error) => {
  console.error('E2E run failed:', error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
