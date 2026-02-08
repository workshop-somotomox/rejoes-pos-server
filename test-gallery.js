import 'dotenv/config';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = process.env.E2E_LIVE_BASE_URL || 'https://www.rejoesserver.com';

async function testGallery() {
  try {
    // Create a member
    const memberResponse = await fetch(`${API_BASE}/api/members/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'test-gallery-' + Date.now()
      },
      body: JSON.stringify({
        cardToken: 'GALLERY_TEST_' + Date.now(),
        tier: 'PREMIUM',
        storeLocation: 'Gallery Test Store',
        shopifyCustomerId: `gid://shopify/Customer/GALLERY_${Date.now()}`
      })
    });
    
    const memberData = await memberResponse.json();
    const memberId = memberData.data.member.id;
    
    // Upload multiple photos
    const form = new FormData();
    form.append('memberId', memberId);
    
    // Add 3 photos
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
      'base64'
    );
    
    for (let i = 0; i < 3; i++) {
      form.append('photos', tinyPng, {
        filename: `gallery-photo-${i + 1}.png`,
        contentType: 'image/png'
      });
    }
    
    const uploadResponse = await fetch(`${API_BASE}/api/uploads/loan-photos`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      throw new Error('Upload failed: ' + JSON.stringify(uploadData));
    }
    
    const uploadIds = uploadData.data.uploadIds;
    console.log('Uploaded photos:', uploadIds);
    
    // Create loan with multiple photos
    const loanResponse = await fetch(`${API_BASE}/api/loans/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'test-loan-' + Date.now()
      },
      body: JSON.stringify({
        memberId,
        storeLocation: 'Gallery Test Store',
        uploadIds: uploadIds
      })
    });
    
    const loanData = await loanResponse.json();
    console.log('Loan created:', JSON.stringify(loanData.data, null, 2));
    
    // Get active loans to check gallery
    const activeLoansResponse = await fetch(`${API_BASE}/api/loans/active/${memberId}`);
    const activeLoansData = await activeLoansResponse.json();
    
    console.log('\nActive loans with gallery:');
    activeLoansData.data.forEach((loan, index) => {
      console.log(`Loan ${index + 1}:`);
      console.log(`  Primary photo: ${loan.photoUrl}`);
      console.log(`  Gallery count: ${loan.gallery.length}`);
      loan.gallery.forEach((photo, i) => {
        console.log(`    Gallery ${i + 1}: ${photo.r2Key}`);
      });
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGallery();
