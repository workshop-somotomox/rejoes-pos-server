import 'dotenv/config';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = process.env.E2E_LIVE_BASE_URL || 'https://www.rejoesserver.com';

async function debugGallery() {
  try {
    // Create a member
    const memberResponse = await fetch(`${API_BASE}/api/members/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'debug-gallery-' + Date.now()
      },
      body: JSON.stringify({
        cardToken: 'DEBUG_GALLERY_' + Date.now(),
        tier: 'PREMIUM',
        storeLocation: 'Debug Gallery Store',
        shopifyCustomerId: `gid://shopify/Customer/DEBUG_${Date.now()}`
      })
    });
    
    const memberData = await memberResponse.json();
    const memberId = memberData.data.member.id;
    console.log('Created member:', memberId);
    
    // Upload 3 photos
    const form = new FormData();
    form.append('memberId', memberId);
    
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
      'base64'
    );
    
    for (let i = 0; i < 3; i++) {
      form.append('photos', tinyPng, {
        filename: `debug-photo-${i + 1}.png`,
        contentType: 'image/png'
      });
    }
    
    const uploadResponse = await fetch(`${API_BASE}/api/uploads/loan-photos`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const uploadData = await uploadResponse.json();
    const uploadIds = uploadData.data.uploadIds;
    console.log('Uploaded photo IDs:', uploadIds);
    
    // Create loan with multiple photos
    const loanResponse = await fetch(`${API_BASE}/api/loans/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'debug-loan-' + Date.now()
      },
      body: JSON.stringify({
        memberId,
        storeLocation: 'Debug Gallery Store',
        uploadIds: uploadIds
      })
    });
    
    const loanData = await loanResponse.json();
    console.log('Loan created:', JSON.stringify(loanData.data, null, 2));
    
    // Wait a moment for the database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get active loans to check gallery
    const activeLoansResponse = await fetch(`${API_BASE}/api/loans/active/${memberId}`);
    const activeLoansData = await activeLoansResponse.json();
    
    console.log('\n=== DEBUG INFO ===');
    console.log('Active loans response:', JSON.stringify(activeLoansData, null, 2));
    
    console.log('\n=== GALLERY ANALYSIS ===');
    activeLoansData.data.forEach((loan, index) => {
      console.log(`\nLoan ${index + 1} (${loan.id}):`);
      console.log(`  Primary photo URL: ${loan.photoUrl}`);
      console.log(`  Gallery array:`, loan.gallery);
      console.log(`  Gallery length: ${loan.gallery ? loan.gallery.length : 'undefined/null'}`);
      
      // Check if loanPhotos exists (should be removed but let's see)
      if (loan.loanPhotos) {
        console.log(`  Raw loanPhotos count: ${loan.loanPhotos.length}`);
        loan.loanPhotos.forEach((photo, i) => {
          console.log(`    Photo ${i + 1}: ${photo.r2Key} (matches primary: ${photo.r2Key === loan.photoUrl})`);
        });
      }
    });
    
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}

debugGallery();
