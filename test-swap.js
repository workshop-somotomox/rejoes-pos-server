const fs = require('fs');
const FormData = require('form-data');

// Create a simple test image buffer (1x1 pixel PNG)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
  0xAE, 0x42, 0x60, 0x82
]);

async function testSwapWithGallery() {
  const memberId = 'cmkye36ar000011yg9wl28xrl';
  const loanId = 'cmkyectr8000bv3cqu2rc8x6s'; // From the previous checkout
  const uploadIds = [];
  
  // Upload 2 new images for swap
  for (let i = 1; i <= 2; i++) {
    const form = new FormData();
    form.append('memberId', memberId);
    form.append('photo', testImageBuffer, {
      filename: `swap-image-${i}.png`,
      contentType: 'image/png'
    });

    try {
      const response = await fetch('http://localhost:3000/api/uploads/loan-photo', {
        method: 'POST',
        headers: {
          ...form.getHeaders()
        },
        body: form.getBuffer()
      });

      const result = await response.json();
      console.log(`Swap image ${i} upload response:`, response.status, result);
      
      if (response.ok && result.uploadId) {
        uploadIds.push(result.uploadId);
      }
    } catch (error) {
      console.error(`Error uploading swap image ${i}:`, error);
    }
  }

  console.log('Swap uploadIds:', uploadIds);
  
  // Test swap with multiple images
  if (uploadIds.length > 0) {
    try {
      const swapResponse = await fetch('http://localhost:3000/api/loans/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': `test-swap-${Date.now()}`
        },
        body: JSON.stringify({
          memberId: memberId,
          loanId: loanId,
          uploadIds: uploadIds,
          storeLocation: 'Swap Store'
        })
      });

      const swapResult = await swapResponse.json();
      console.log('Swap response:', swapResponse.status, JSON.stringify(swapResult, null, 2));
    } catch (error) {
      console.error('Error during swap:', error);
    }
  }
}

testSwapWithGallery().catch(console.error);
