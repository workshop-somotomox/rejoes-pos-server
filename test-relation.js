import 'dotenv/config';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = process.env.E2E_LIVE_BASE_URL || 'https://www.rejoesserver.com';

async function testLoanPhotosRelation() {
  try {
    // Create a member
    const memberResponse = await fetch(`${API_BASE}/api/members/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'test-relation-' + Date.now()
      },
      body: JSON.stringify({
        cardToken: 'RELATION_TEST_' + Date.now(),
        tier: 'PREMIUM',
        storeLocation: 'Relation Test Store',
        shopifyCustomerId: `gid://shopify/Customer/RELATION_${Date.now()}`
      })
    });
    
    const memberData = await memberResponse.json();
    const memberId = memberData.data.member.id;
    
    // Upload 2 photos for simpler testing
    const form = new FormData();
    form.append('memberId', memberId);
    
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
      'base64'
    );
    
    for (let i = 0; i < 2; i++) {
      form.append('photos', tinyPng, {
        filename: `relation-photo-${i + 1}.png`,
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
    
    // Create loan with 2 photos
    const loanResponse = await fetch(`${API_BASE}/api/loans/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'relation-loan-' + Date.now()
      },
      body: JSON.stringify({
        memberId,
        storeLocation: 'Relation Test Store',
        uploadIds: uploadIds
      })
    });
    
    const loanData = await loanResponse.json();
    const loanId = loanData.data.id;
    console.log('Loan created:', loanId);
    console.log('Primary photo URL:', loanData.data.photoUrl);
    
    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get active loans
    const activeLoansResponse = await fetch(`${API_BASE}/api/loans/active/${memberId}`);
    const activeLoansData = await activeLoansResponse.json();
    
    console.log('\n=== RAW LOAN DATA ===');
    const loan = activeLoansData.data[0];
    console.log('Loan keys:', Object.keys(loan));
    console.log('Has loanPhotos key:', 'loanPhotos' in loan);
    console.log('loanPhotos value:', loan.loanPhotos);
    
    // Check if we can access the photos directly
    if (loan.loanPhotos && Array.isArray(loan.loanPhotos)) {
      console.log('\nPhoto analysis:');
      console.log('Total photos linked:', loan.loanPhotos.length);
      loan.loanPhotos.forEach((photo, i) => {
        const isPrimary = photo.r2Key === loan.photoUrl;
        console.log(`Photo ${i + 1}: ${photo.r2Key} (Primary: ${isPrimary})`);
      });
      
      // Manual gallery calculation
      const galleryPhotos = loan.loanPhotos.filter(photo => photo.r2Key !== loan.photoUrl);
      console.log('\nManual gallery calculation:');
      console.log('Gallery photos count:', galleryPhotos.length);
      galleryPhotos.forEach((photo, i) => {
        console.log(`Gallery ${i + 1}: ${photo.r2Key}`);
      });
    } else {
      console.log('ERROR: loanPhotos is not available or not an array');
      console.log('This suggests the live server has not been updated with the repository changes');
    }
    
  } catch (error) {
    console.error('Relation test failed:', error);
  }
}

testLoanPhotosRelation();
