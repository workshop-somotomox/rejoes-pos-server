const fetch = require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/uploads/loan-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: 'demo-member',
        imageUrl: 'https://img.freepik.com/premium-vector/red-baseball-cap-with-red-cap-it-vector-illustration_1281446-1626.jpg'
      })
    });

    console.log('status', res.status);
    const text = await res.text();
    console.log('body', text);
  } catch (err) {
    console.error(err);
  }
})();
