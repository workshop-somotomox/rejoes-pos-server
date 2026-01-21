# ReJoEs API Testing Tools

This folder contains tools to test all API endpoints with one click and view detailed logs/errors.

## 📁 Files

### 1. `api-tester.html` (Interactive Web Tester)
A beautiful, interactive web-based API tester.

**Features:**
- Test all 8 endpoints with one click
- View HTTP status codes and responses
- Color-coded results (green = success, yellow = warning, red = error)
- Modify base URL to test different environments
- Individual test buttons for each endpoint
- "Test All" button to run all tests sequentially

**How to use:**
1. Double-click `api-tester.html` to open in your browser
2. Modify the base URL if needed (default: Railway server)
3. Click "Test All" to test all endpoints
4. Or click individual "Test" buttons for specific endpoints
5. View results directly in the browser

**Tested endpoints:**
- GET /api/members/by-card/:cardToken
- POST /api/loans/checkout
- POST /api/loans/return
- POST /api/loans/swap
- GET /api/loans/active/:memberId
- POST /api/webhooks/subscription
- POST /api/webhooks/customers/delete

### 2. `run-tests.bat` (Windows Batch Script)
Automated command-line testing script for Windows.

**Features:**
- Tests all endpoints automatically
- Saves detailed logs to `test-results/` folder
- Timestamps all test runs
- Opens results folder automatically when done

**How to use:**
1. Double-click `run-tests.bat`
2. Wait for all tests to complete
3. Results folder opens automatically
4. Check individual test files for detailed responses

**Output:**
- `test-results/test-log.txt` - Full test log with timestamps
- `test-results/1-member-by-card.txt` - Member lookup response
- `test-results/2-loan-checkout.txt` - Checkout response
- `test-results/3-loan-return.txt` - Return response
- `test-results/4-loan-swap.txt` - Swap response
- `test-results/5-active-loans.txt` - Active loans response
- `test-results/6-webhook-subscription.txt` - Subscription webhook response
- `test-results/7-webhook-customer-delete.txt` - Customer delete webhook response

## 🎯 Quick Start

### Option 1: Web Tester (Recommended)
```bash
# Just double-click
test/api-tester.html
```

### Option 2: Batch Script
```bash
# Just double-click
test/run-tests.bat
```

## 📊 Understanding Results

### HTTP Status Codes
- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Authentication failed (webhooks)
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error
- **502 Bad Gateway** - Application not responding

### Common Error Responses

**Subscription Issues:**
```json
{
  "error": {
    "code": "SUBSCRIPTION_INACTIVE",
    "message": "Subscription is paused - no new loans allowed"
  }
}
```

**Monthly Limit Exceeded:**
```json
{
  "error": {
    "code": "MONTHLY_LIMIT_EXCEEDED",
    "message": "PLUS plan: 3 of 5 items remaining this month"
  }
}
```

**Invalid Upload:**
```json
{
  "error": {
    "code": "INVALID_UPLOAD",
    "message": "Invalid upload reference"
  }
}
```

## 🔧 Customization

### Change Base URL

**In api-tester.html:**
1. Open the file in a text editor
2. Find the input field with `id="baseUrl"`
3. Change the `value` attribute to your desired URL

**In run-tests.bat:**
1. Open the file in a text editor
2. Find `set BASE_URL=...`
3. Change the URL after `=`

### Add New Tests

**In api-tester.html:**
Add to the `tests` array:
```javascript
{
    name: 'Your Test Name',
    method: 'GET', // or POST
    endpoint: '/api/your-endpoint',
    description: 'What this test does',
    body: { /* optional for POST */ },
    headers: { /* optional headers */ }
}
```

**In run-tests.bat:**
Add a new section following the existing pattern:
```batch
echo.
echo [N/8] Testing Your Endpoint
curl.exe -s [your-curl-command] > "%RESULTS_DIR%\N-your-test.txt" 2>&1
```

## 🐛 Troubleshooting

### Issue: "curl.exe not found"
**Solution:** Ensure Git for Windows or Windows 10+ is installed. The batch script uses `curl.exe` (not PowerShell's `curl` alias).

### Issue: Tests timeout
**Solution:** Check if the server is running and accessible. Verify network connectivity.

### Issue: All tests return 502
**Solution:** The application is not responding. Check Railway logs for startup errors.

### Issue: Web tester shows "Network Error"
**Solution:** Check CORS settings or try from a different browser. Ensure the server is running.

## 📝 Test Data

The test endpoints use mock data:
- Card token: `CARD123456`
- Member ID: `test-member-id`
- Loan ID: `test-loan-id`
- Upload ID: `test-upload-id`
- Store location: `store_ny`

These are placeholder values and will return appropriate errors (404, 400, etc.) when the server is working correctly.

## 🚀 Production Testing

To test your production server:
1. Change the base URL in the tester
2. Run the tests
3. Review the results
4. Check Railway logs for any errors

## 📞 Support

For issues or questions:
1. Check Railway deployment logs
2. Verify environment variables are set
3. Ensure database is accessible
4. Review the main API guide: `../docs/api-guide.md`

---

**Note:** These tools are for development and testing purposes. Do not use in production environments without proper security measures.
