import 'dotenv/config';
import crypto from 'crypto';
import fs from 'node:fs/promises';

type TestResult = {
  test: string;
  status: number;
  success: boolean;
  payload?: unknown;
  error?: string;
};

const API_BASE = process.env.E2E_LIVE_BASE_URL || 'https://www.rejoesserver.com';
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

async function uploadPhotos(test: string, memberId: string, count = 1): Promise<string[]> {
  const form = new FormData();
  form.append('memberId', memberId);
  
  // Add multiple photos
  for (let i = 0; i < count; i++) {
    form.append('photos', new Blob([tinyPng], { type: 'image/png' }), `photo-${i + 1}.png`);
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/uploads/loan-photos`, {
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
    
    const uploadIds = (body as any)?.data?.uploadIds;
    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      throw new Error('No uploadIds in response');
    }
    return uploadIds;
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
      storeLocation: 'E2E Test Store',
      shopifyCustomerId: `gid://shopify/Customer/E2E_${Date.now()}`
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

async function testBulkUploadPhotos(memberId: string, count = 3): Promise<string[]> {
  console.log(`\n🧪 Testing bulk upload of ${count} photos...`);
  
  try {
    const uploadIds = await uploadPhotos(`Upload ${count} loan photos at once`, memberId, count);
    return uploadIds;
  } catch (error) {
    // If bulk upload is not available (404), fall back to individual uploads
    console.log('⚠️ Bulk upload not available, falling back to individual uploads...');
    const uploadIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = await uploadPhoto(`Upload photo ${i + 1} individually`, memberId, `photo-${i + 1}.png`);
      uploadIds.push(id);
    }
    return uploadIds;
  }
}

async function testCheckoutLoan(memberId: string, uploadIds: string | string[]): Promise<string> {
  console.log('\n🧪 Testing loan checkout...');
  
  const ids = Array.isArray(uploadIds) ? uploadIds : [uploadIds];
  
  const { body } = await sendJson('Checkout loan', `${API_BASE}/api/loans/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({
      memberId,
      storeLocation: 'E2E Store',
      uploadIds: ids,
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
  
  const { body } = await sendJson('Get active loans', `${API_BASE}/api/loans/active/${memberId}`, {
    method: 'GET',
  });
  
  // Test swap tracking fields in active loans
  const activeLoans = (body as any)?.data || [];
  if (activeLoans.length > 0) {
    const hasSwapFields = activeLoans.every((loan: any) => 
      (loan.swappedAt === null || typeof loan.swappedAt === 'string') &&
      (loan.swappedForId === null || typeof loan.swappedForId === 'string') &&
      (loan.swappedFromId === null || typeof loan.swappedFromId === 'string')
    );
    
    await recordResult('Active loans swap fields structure', hasSwapFields ? 200 : 400, hasSwapFields, {
      message: hasSwapFields ? 'All active loans have swap tracking fields' : 'Missing swap tracking fields',
      sampleLoan: activeLoans[0]
    });
    
    // Check for swapped-in loans
    const swappedInLoans = activeLoans.filter((loan: any) => loan.swappedFromId);
    if (swappedInLoans.length > 0) {
      await recordResult('Swapped-in loans detected', 200, true, {
        count: swappedInLoans.length,
        sample: swappedInLoans[0]
      });
    }
  }
}

async function testGetReturnedLoans(memberId: string) {
  console.log('\n🧪 Testing get returned loans...');
  
  const { body } = await sendJson('Get returned loans', `${API_BASE}/api/loans/returned/${memberId}`, {
    method: 'GET',
  });
  
  // Test swap tracking fields in returned loans
  const returnedLoans = (body as any)?.data || [];
  if (returnedLoans.length > 0) {
    const hasSwapFields = returnedLoans.every((loan: any) => 
      (loan.swappedAt === null || typeof loan.swappedAt === 'string') &&
      (loan.swappedForId === null || typeof loan.swappedForId === 'string') &&
      (loan.swappedFromId === null || typeof loan.swappedFromId === 'string')
    );
    
    await recordResult('Returned loans swap fields structure', hasSwapFields ? 200 : 400, hasSwapFields, {
      message: hasSwapFields ? 'All returned loans have swap tracking fields' : 'Missing swap tracking fields',
      sampleLoan: returnedLoans[0]
    });
    
    // Check for swapped-out loans
    const swappedOutLoans = returnedLoans.filter((loan: any) => loan.swappedForId);
    if (swappedOutLoans.length > 0) {
      await recordResult('Swapped-out loans detected', 200, true, {
        count: swappedOutLoans.length,
        sample: swappedOutLoans[0]
      });
    }
  }
}

async function testReturnLoan(memberId: string, loanId: string) {
  console.log('\n🧪 Testing loan return...');
  
  await sendJson('Return loan', `${API_BASE}/api/loans/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({ memberId, loanId }),
  });
}

async function testSwapLoan(memberId: string): Promise<{ returnedLoanId: string; newLoanId: string }> {
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
  console.log('Swap response:', JSON.stringify(swapResult, null, 2));
  
  if (!swapResult) {
    throw new Error('No data in swap response');
  }
  
  // Handle both possible response structures
  const returnedLoan = swapResult.returnedLoan || swapResult;
  const newLoan = swapResult.newLoan || swapResult;
  
  if (!returnedLoan?.id || !newLoan?.id) {
    throw new Error('Invalid swap response structure');
  }
  
  // Verify returned loan (swapped-out) has correct swap fields
  const returnedLoanValid = 
    returnedLoan.swappedAt !== null &&
    returnedLoan.swappedForId !== null &&
    returnedLoan.swappedForId === newLoan.id &&
    returnedLoan.swappedFromId === null;
  
  await recordResult('Returned loan swap tracking fields', returnedLoanValid ? 200 : 400, returnedLoanValid, {
    swappedAt: returnedLoan.swappedAt,
    swappedForId: returnedLoan.swappedForId,
    swappedFromId: returnedLoan.swappedFromId
  });
  
  // Verify new loan (swapped-in) has correct swap fields
  const newLoanValid = 
    newLoan.swappedAt === null &&
    newLoan.swappedForId === null &&
    newLoan.swappedFromId !== null &&
    newLoan.swappedFromId === baseLoanId;
  
  await recordResult('New loan swap tracking fields', newLoanValid ? 200 : 400, newLoanValid, {
    swappedAt: newLoan.swappedAt,
    swappedForId: newLoan.swappedForId,
    swappedFromId: newLoan.swappedFromId
  });
  
  return { returnedLoanId: returnedLoan.id, newLoanId: newLoan.id };
}

async function testSwapTrackingFlow(memberId: string) {
  console.log('\n🧪 Testing complete swap tracking flow...');
  
  // 1. Perform swap
  const { returnedLoanId, newLoanId } = await testSwapLoan(memberId);
  
  // 2. Get active loans - should show swapped-in loan with swappedFrom
  const { body: activeBody } = await sendJson('Get active loans after swap', `${API_BASE}/api/loans/active/${memberId}`, {
    method: 'GET',
  });
  
  const activeLoans = (activeBody as any)?.data || [];
  const swappedInLoan = activeLoans.find((loan: any) => loan.id === newLoanId);
  
  if (swappedInLoan) {
    const swappedInValid = 
      swappedInLoan.swappedFromId === returnedLoanId &&
      swappedInLoan.swappedForId === null &&
      swappedInLoan.swappedAt === null;
    
    await recordResult('Swapped-in loan in active loans', swappedInValid ? 200 : 400, swappedInValid, {
      loanId: swappedInLoan.id,
      swappedFromId: swappedInLoan.swappedFromId,
      swappedForId: swappedInLoan.swappedForId
    });
  } else {
    await recordResult('Swapped-in loan in active loans', 404, false, { error: 'Swapped-in loan not found in active loans' });
  }
  
  // 3. Get returned loans - should show swapped-out loan with swappedFor
  const { body: returnedBody } = await sendJson('Get returned loans after swap', `${API_BASE}/api/loans/returned/${memberId}`, {
    method: 'GET',
  });
  
  const returnedLoans = (returnedBody as any)?.data || [];
  const swappedOutLoan = returnedLoans.find((loan: any) => loan.id === returnedLoanId);
  
  if (swappedOutLoan) {
    const swappedOutValid = 
      swappedOutLoan.swappedForId === newLoanId &&
      swappedOutLoan.swappedFromId === null &&
      swappedOutLoan.swappedAt !== null;
    
    await recordResult('Swapped-out loan in returned loans', swappedOutValid ? 200 : 400, swappedOutValid, {
      loanId: swappedOutLoan.id,
      swappedForId: swappedOutLoan.swappedForId,
      swappedFromId: swappedOutLoan.swappedFromId,
      swappedAt: swappedOutLoan.swappedAt
    });
  } else {
    await recordResult('Swapped-out loan in returned loans', 404, false, { error: 'Swapped-out loan not found in returned loans' });
  }
  
  // 4. Verify swap chain integrity
  const swapChainValid = 
    swappedInLoan?.swappedFromId === returnedLoanId &&
    swappedOutLoan?.swappedForId === newLoanId;
  
  await recordResult('Swap chain integrity', swapChainValid ? 200 : 400, swapChainValid, {
    message: swapChainValid ? 'Swap references are correctly linked' : 'Swap chain is broken',
    swappedInFromId: swappedInLoan?.swappedFromId,
    swappedOutForId: swappedOutLoan?.swappedForId
  });
}

async function runAllTests() {
  console.log(`🚀 Starting E2E tests against: ${API_BASE}`);
  
  try {
    // 1. Create a test member
    const { memberId, cardToken } = await testCreateMember();
    
    // 2. Test single photo upload and checkout
    const uploadId = await testUploadPhoto(memberId);
    const loanId = await testCheckoutLoan(memberId, uploadId);
    
    // 3. Test bulk upload with multiple photos
    const bulkUploadIds = await testBulkUploadPhotos(memberId, 3);
    const bulkLoanId = await testCheckoutLoan(memberId, bulkUploadIds);
    
    // 4. Get active loans (initial)
    await testGetActiveLoans(memberId);
    
    // 5. Get returned loans (initial - should be empty)
    await testGetReturnedLoans(memberId);
    
    // 6. Test swap flow and comprehensive swap tracking
    await testSwapTrackingFlow(memberId);
    
    // 7. Return the loans
    await testReturnLoan(memberId, loanId);
    await testReturnLoan(memberId, bulkLoanId);
    
    // 8. Get active loans (after returns)
    await testGetActiveLoans(memberId);
    
    // 9. Get returned loans (after returns)
    await testGetReturnedLoans(memberId);
    
    // 10. Final member check
    await sendJson('Final member check', `${API_BASE}/api/members/by-card/${cardToken}`, {
      method: 'GET',
    });
    
    // Write results
    await fs.mkdir('test', { recursive: true });
    await fs.writeFile('test/results-live.json', JSON.stringify({ results }, null, 2));
    
    console.log('\n📊 Test Summary:');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📄 Results written to: test/results-live.json`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      console.log('\n🔍 Failed tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.test} (${r.status}): ${r.error || 'Unknown error'}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      console.log('\n🔄 Swap tracking is fully functional on LIVE server!');
    }
    
  } catch (error) {
    console.error('\n💥 Test run failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runAllTests();
