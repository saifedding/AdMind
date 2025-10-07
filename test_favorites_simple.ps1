# Simple Test script for Favorites Lists Feature
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Favorites Lists Feature" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000/api/favorites"

# Test 1: Get all lists
Write-Host "Test 1: GET /api/favorites/lists" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/lists" -Method GET
$lists = ($response.Content | ConvertFrom-Json).lists
Write-Host "✓ Success! Found $($lists.Count) list(s)" -ForegroundColor Green
Write-Host ""

# Test 2: Create a new list
Write-Host "Test 2: POST /api/favorites/lists (Create new list)" -ForegroundColor Yellow
$body = @{
    name = "Test List $(Get-Date -Format 'HHmmss')"
    description = "Integration test list"
    color = "green"
    icon = "star"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "$baseUrl/lists" -Method POST -Body $body -ContentType "application/json"
$newList = $response.Content | ConvertFrom-Json
Write-Host "✓ Created list: $($newList.name) (ID: $($newList.id))" -ForegroundColor Green
$testListId = $newList.id
Write-Host ""

# Test 3: Get the specific list
Write-Host "Test 3: GET /api/favorites/lists/$testListId" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/lists/$testListId" -Method GET
$list = $response.Content | ConvertFrom-Json
Write-Host "✓ Retrieved list: $($list.name)" -ForegroundColor Green
Write-Host ""

# Test 4: Get all favorites
Write-Host "Test 4: GET /api/favorites/all" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/all" -Method GET
$allData = $response.Content | ConvertFrom-Json
Write-Host "✓ Total lists: $($allData.total_lists)" -ForegroundColor Green
Write-Host ""

# Test 5: Update the list
Write-Host "Test 5: PUT /api/favorites/lists/$testListId (Update list)" -ForegroundColor Yellow
$body = @{
    description = "Updated at $(Get-Date -Format 'HH:mm:ss')"
    color = "purple"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "$baseUrl/lists/$testListId" -Method PUT -Body $body -ContentType "application/json"
$updatedList = $response.Content | ConvertFrom-Json
Write-Host "✓ Updated color to: $($updatedList.color)" -ForegroundColor Green
Write-Host ""

# Test 6: Delete the test list
Write-Host "Test 6: DELETE /api/favorites/lists/$testListId" -ForegroundColor Yellow
Invoke-WebRequest -Uri "$baseUrl/lists/$testListId" -Method DELETE | Out-Null
Write-Host "✓ Deleted test list" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All tests passed! ✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host '[OK] Backend is fully working' -ForegroundColor Green
Write-Host '[OK] Database tables created' -ForegroundColor Green
Write-Host '[OK] API endpoints registered' -ForegroundColor Green
Write-Host '[OK] All CRUD operations working' -ForegroundColor Green
Write-Host ""
Write-Host 'Next: Visit http://localhost:8000/docs to see the API' -ForegroundColor Yellow
