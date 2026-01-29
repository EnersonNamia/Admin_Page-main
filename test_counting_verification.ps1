# Test the test counting API endpoints (PowerShell version for Windows)
# Run: .\test_counting_verification.ps1

Write-Host "🧪 TEST COUNTING API VERIFICATION" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$BaseUrl = "http://localhost:5000/api"

Write-Host "`n1. Creating a test..." -ForegroundColor Yellow

$TestPayload = @{
    test_name = "Counting Test"
    description = "Test for counting"
    test_type = "adaptive"
} | ConvertTo-Json

try {
    $TestResponse = Invoke-RestMethod -Uri "$BaseUrl/tests" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $TestPayload
    
    $TestId = $TestResponse.test_id
    Write-Host "✅ Test created with ID: $TestId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create test: $_" -ForegroundColor Red
    exit 1
}

$UserId = 1

Write-Host "`n2. Submitting test attempt..." -ForegroundColor Yellow

$SubmitPayload = @{
    user_id = $UserId
    test_id = $TestId
    score = 85
    total_questions = 100
    time_taken = 30
} | ConvertTo-Json

try {
    $SubmitResponse = Invoke-RestMethod -Uri "$BaseUrl/tests/$TestId/submit" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $SubmitPayload
    
    $AttemptId = $SubmitResponse.attempt_id
    Write-Host "✅ Test attempt recorded with ID: $AttemptId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to submit test: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Checking user tests_taken count..." -ForegroundColor Yellow

try {
    $UsersResponse = Invoke-RestMethod -Uri "$BaseUrl/users?limit=100" `
        -Method GET `
        -Headers @{"Accept" = "application/json"}
    
    $FirstUser = $UsersResponse.users[0]
    $TestsTaken = $FirstUser.tests_taken
    
    if ($TestsTaken -gt 0) {
        Write-Host "✅ User tests_taken count: $TestsTaken" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Tests taken might be 0 - checking details..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not check users: $_" -ForegroundColor Yellow
}

Write-Host "`n4. Getting test history for user..." -ForegroundColor Yellow

try {
    $HistoryResponse = Invoke-RestMethod -Uri "$BaseUrl/users/$UserId/test-history" `
        -Method GET
    
    $TestCount = $HistoryResponse.total_tests_taken
    Write-Host "✅ Test history shows: $TestCount tests" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get test history: $_" -ForegroundColor Red
}

Write-Host "`n5. Checking test attempts records..." -ForegroundColor Yellow

try {
    $AttemptsResponse = Invoke-RestMethod -Uri "$BaseUrl/tests/$TestId/attempts" `
        -Method GET
    
    $AttemptCount = $AttemptsResponse.total_attempts
    Write-Host "✅ Test attempts recorded: $AttemptCount" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not verify attempts: $_" -ForegroundColor Yellow
}

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "✅ TEST COMPLETE" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "- Created test: $TestId"
Write-Host "- Submitted attempt: $AttemptId"
Write-Host "- User tests_taken: $TestsTaken"
Write-Host "- Test history count: $TestCount"
Write-Host "- Attempts recorded: $AttemptCount"
Write-Host ""
Write-Host "If all values are > 0, the test counting is working correctly!" -ForegroundColor Green
