@echo off
echo ========================================
echo ReJoEs API Tester - Windows Script
echo ========================================
echo.
echo Testing API endpoints on: https://rejoes-pos-server-oyolloo.up.railway.app
echo.

set BASE_URL=https://rejoes-pos-server-oyolloo.up.railway.app
set RESULTS_DIR=test-results

if not exist "%RESULTS_DIR%" mkdir "%RESULTS_DIR%"

echo [%date% %time%] Starting API tests...
echo [%date% %time%] Starting API tests... > "%RESULTS_DIR%\test-log.txt"

echo.
echo [1/8] Testing GET /api/members/by-card/:cardToken
curl.exe -s -w "\nHTTP Status: %%{http_code}\n" "%BASE_URL%/api/members/by-card/CARD123456" > "%RESULTS_DIR%\1-member-by-card.txt" 2>&1
echo [%date% %time%] GET /api/members/by-card/:cardToken - Complete
echo [%date% %time%] GET /api/members/by-card/:cardToken - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [2/8] Testing POST /api/loans/checkout
curl.exe -s -X POST -H "Content-Type: application/json" -H "x-idempotency-key: test-123" -d "{\"memberId\":\"test\",\"storeLocation\":\"test\",\"uploadId\":\"test\"}" "%BASE_URL%/api/loans/checkout" > "%RESULTS_DIR%\2-loan-checkout.txt" 2>&1
echo [%date% %time%] POST /api/loans/checkout - Complete
echo [%date% %time%] POST /api/loans/checkout - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [3/8] Testing POST /api/loans/return
curl.exe -s -X POST -H "Content-Type: application/json" -H "x-idempotency-key: test-456" -d "{\"memberId\":\"test\",\"loanId\":\"test\"}" "%BASE_URL%/api/loans/return" > "%RESULTS_DIR%\3-loan-return.txt" 2>&1
echo [%date% %time%] POST /api/loans/return - Complete
echo [%date% %time%] POST /api/loans/return - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [4/8] Testing POST /api/loans/swap
curl.exe -s -X POST -H "Content-Type: application/json" -H "x-idempotency-key: test-789" -d "{\"memberId\":\"test\",\"loanId\":\"test\",\"storeLocation\":\"test\",\"uploadId\":\"test\"}" "%BASE_URL%/api/loans/swap" > "%RESULTS_DIR%\4-loan-swap.txt" 2>&1
echo [%date% %time%] POST /api/loans/swap - Complete
echo [%date% %time%] POST /api/loans/swap - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [5/8] Testing GET /api/loans/active/:memberId
curl.exe -s "%BASE_URL%/api/loans/active/test-member-id" > "%RESULTS_DIR%\5-active-loans.txt" 2>&1
echo [%date% %time%] GET /api/loans/active/:memberId - Complete
echo [%date% %time%] GET /api/loans/active/:memberId - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [6/8] Testing POST /api/webhooks/subscription
curl.exe -s -X POST -H "Content-Type: application/json" -d "{\"type\":\"subscription_created\",\"data\":{\"shopifyCustomerId\":\"test\",\"cardToken\":\"test\",\"planHandle\":\"basic\",\"status\":\"active\",\"cycleStart\":\"2024-01-01T00:00:00Z\",\"cycleEnd\":\"2024-02-01T00:00:00Z\"}}" "%BASE_URL%/api/webhooks/subscription" > "%RESULTS_DIR%\6-webhook-subscription.txt" 2>&1
echo [%date% %time%] POST /api/webhooks/subscription - Complete
echo [%date% %time%] POST /api/webhooks/subscription - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [7/8] Testing POST /api/webhooks/customers/delete
curl.exe -s -X POST -H "Content-Type: application/json" -d "{\"shopifyCustomerId\":\"test\"}" "%BASE_URL%/api/webhooks/customers/delete" > "%RESULTS_DIR%\7-webhook-customer-delete.txt" 2>&1
echo [%date% %time%] POST /api/webhooks/customers/delete - Complete
echo [%date% %time%] POST /api/webhooks/customers/delete - Complete >> "%RESULTS_DIR%\test-log.txt"

echo.
echo [8/8] Testing POST /api/uploads/loan-photo (skipped - requires file upload)
echo [%date% %time%] POST /api/uploads/loan-photo - Skipped
echo [%date% %time%] POST /api/uploads/loan-photo - Skipped >> "%RESULTS_DIR%\test-log.txt"

echo.
echo ========================================
echo Test Complete!
echo ========================================
echo.
echo Results saved to: %RESULTS_DIR%\
echo - test-log.txt (full log)
echo - 1-member-by-card.txt
echo - 2-loan-checkout.txt
echo - 3-loan-return.txt
echo - 4-loan-swap.txt
echo - 5-active-loans.txt
echo - 6-webhook-subscription.txt
echo - 7-webhook-customer-delete.txt
echo.
echo Press any key to open results folder...
pause > nul
explorer "%RESULTS_DIR%"

echo.
echo Press any key to exit...
pause > nul
