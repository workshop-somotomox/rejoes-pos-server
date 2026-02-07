import 'dotenv/config';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TestResult = {
  test: string;
  status: number;
  success: boolean;
  payload?: unknown;
  error?: string;
};

const API_BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
  'base64'
);

const results: TestResult[] = [];

async function recordResult(test: string, status: number, success: boolean, payload?: unknown, error?: string) {
  results.push({ test, status, success, payload, error });
  console.log(`${success ? '✅' : '❌'} ${test} - ${status}`);
  if (error) console.log(`   Error: ${error}`);
}

async function sendJson(test: string, url: string, options: RequestInit): Promise<{ res: Response; body: unknown }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : text;
    } catch {
      // keep raw text
    }
    
    const isSuccess = res.ok && (body as any)?.success === true;
    await recordResult(test, res.status, isSuccess, body as unknown);
    return { res, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordResult(test, 0, false, undefined, message);
    throw error;
  }
}

async function uploadPhoto(test: string, memberId: string, filename = 'photo.png'): Promise<string> {
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
    
    const isSuccess = res.ok && (body as any)?.success === true;
    await recordResult(test, res.status, isSuccess, body);
    
    const uploadId = (body as any)?.data?.uploadId;
    if (!uploadId) {
      throw new Error('No uploadId in response');
    }
    return uploadId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordResult(test, 0, false, undefined, message);
    throw error;
  }
}

async function testCreateMember(): Promise<{ memberId: string; cardToken: string }> {
  console.log('\n🧪 Testing member creation...');
  
  const cardToken = `E2E_MEMBER_${Date.now()}`;
  const { body } = await sendJson('Create new member', `${API_BASE}/api/members/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({
      cardToken,
      tier: 'PREMIUM',
      storeLocation: 'E2E Test Store'
    }),
  });
  
  const memberId = (body as any)?.data?.member?.id;
  if (!memberId) {
    throw new Error('No memberId in create response');
  }
  
  // Verify retrieval
  await sendJson('Get created member', `${API_BASE}/api/members/by-card/${cardToken}`, {
    method: 'GET',
  });
  
  return { memberId, cardToken };
}

async function testUploadPhoto(memberId: string): Promise<string> {
  console.log('\n🧪 Testing photo upload...');
  
  const uploadId = await uploadPhoto('Upload loan photo', memberId, 'test-photo.png');
  return uploadId;
}

async function testCheckoutLoan(memberId: string, uploadId: string): Promise<string> {
  console.log('\n🧪 Testing loan checkout...');
  
  const { body } = await sendJson('Checkout loan', `${API_BASE}/api/loans/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({
      memberId,
      storeLocation: 'E2E Store',
      uploadIds: [uploadId],
    }),
  });
  
  const loanId = (body as any)?.data?.id;
  if (!loanId) {
    throw new Error(`No loanId in checkout response. Response: ${JSON.stringify(body)}`);
  }
  
  return loanId;
}

async function testGetActiveLoans(memberId: string) {
  console.log('\n🧪 Testing get active loans...');
  
  await sendJson('Get active loans', `${API_BASE}/api/loans/active/${memberId}`, {
    method: 'GET',
  });
}

async function testReturnLoan(memberId: string, loanId: string) {
  console.log('\n🧪 Testing loan return...');
  
  await sendJson('Return loan', `${API_BASE}/api/loans/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({ memberId, loanId }),
  });
}

async function testSwapLoan(memberId: string): Promise<string> {
  console.log('\n🧪 Testing loan swap...');
  
  // Create base loan for swap
  const baseUploadId = await uploadPhoto('Upload base loan photo', memberId, 'base-photo.png');
  const baseLoanId = await testCheckoutLoan(memberId, baseUploadId);
  
  // Upload new photo for swap
  const swapUploadId = await uploadPhoto('Upload swap photo', memberId, 'swap-photo.png');
  
  // Perform swap
  const { body } = await sendJson('Swap loan', `${API_BASE}/api/loans/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({
      memberId,
      loanId: baseLoanId,
      storeLocation: 'E2E Swap Store',
      uploadIds: [swapUploadId],
    }),
  });
  
  const swapResult = (body as any)?.data;
  if (!swapResult?.newLoan?.id) {
    throw new Error('No new loan ID in swap response');
  }
  
  return swapResult.newLoan.id;
}

async function testLoanPhotoLinking(uploadId: string) {
  console.log('\n🧪 Testing loan photo linking...');
  
  const loanPhotoRecord = await prisma.loanPhoto.findUnique({ where: { id: uploadId } });
  await recordResult('LoanPhoto linked to loan', loanPhotoRecord ? 200 : 404, Boolean(loanPhotoRecord?.loanId), loanPhotoRecord);
}

async function runAllTests() {
  console.log(`🚀 Starting E2E tests against: ${API_BASE}`);
  
  try {
    // 1. Create a test member
    const { memberId, cardToken } = await testCreateMember();
    
    // 2. Upload photo and checkout loan
    const uploadId = await testUploadPhoto(memberId);
    const loanId = await testCheckoutLoan(memberId, uploadId);
    
    // 3. Get active loans
    await testGetActiveLoans(memberId);
    
    // 4. Return the loan
    await testReturnLoan(memberId, loanId);
    
    // 5. Test swap flow (creates its own photos internally)
    const newLoanId = await testSwapLoan(memberId);
    
    // 6. Get the most recent photo and verify it's linked to the new loan
    // Note: testSwapLoan creates its own photos, so we check one of those
    const photos = await prisma.loanPhoto.findMany({
      where: { loanId: newLoanId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (photos.length > 0) {
      await recordResult('LoanPhoto linked to loan', 200, true, photos[0]);
    } else {
      await recordResult('LoanPhoto linked to loan', 404, false, { error: 'No photos found for new loan' });
    }
    
    // 7. Final member check
    await sendJson('Final member check', `${API_BASE}/api/members/by-card/${cardToken}`, {
      method: 'GET',
    });
    
    // Write results
    await fs.mkdir('test', { recursive: true });
    await fs.writeFile('test/results.json', JSON.stringify({ results }, null, 2));
    
    console.log('\n📊 Test Summary:');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📄 Results written to: test/results.json`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
    
  } catch (error) {
    console.error('\n💥 Test run failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
