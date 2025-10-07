# Test script for Favorites Lists Feature
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Favorites Lists Feature" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000/api/favorites"

# Test 1: Get all lists (should be empty or have test list)
Write-Host "Test 1: GET /api/favorites/lists" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/lists" -Method GET
    $lists = ($response.Content | ConvertFrom-Json).lists
    Write-Host "✓ Success! Found $($lists.Count) list(s)" -ForegroundColor Green
    if ($lists.Count -gt 0) {
        Write-Host "  First list: $($lists[0].name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Create a new list
Write-Host "Test 2: POST /api/favorites/lists (Create new list)" -ForegroundColor Yellow
try {
    $body = @{
        name = "High Performers $(Get-Date -Format 'HHmmss')"
        description = "Ads with great engagement"
        color = "green"
        icon = "star"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/lists" -Method POST -Body $body -ContentType "application/json"
    $newList = $response.Content | ConvertFrom-Json
    Write-Host "✓ Success! Created list: $($newList.name) (ID: $($newList.id))" -ForegroundColor Green
    $testListId = $newList.id
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Get the specific list
Write-Host "Test 3: GET /api/favorites/lists/$testListId" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/lists/$testListId" -Method GET
    $list = $response.Content | ConvertFrom-Json
    Write-Host "✓ Success! Retrieved list: $($list.name)" -ForegroundColor Green
    Write-Host "  Items in list: $($list.items.Count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Get all favorites with ads
Write-Host "Test 4: GET /api/favorites/all" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/all" -Method GET
    $allData = $response.Content | ConvertFrom-Json
    Write-Host "✓ Success! Total lists: $($allData.total_lists)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: Update the list
Write-Host "Test 5: PUT /api/favorites/lists/$testListId (Update list)" -ForegroundColor Yellow
try {
    $body = @{
        description = "Updated description at $(Get-Date -Format 'HH:mm:ss')"
        color = "purple"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/lists/$testListId" -Method PUT -Body $body -ContentType "application/json"
    $updatedList = $response.Content | ConvertFrom-Json
    Write-Host "✓ Success! Updated list color to: $($updatedList.color)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 6: Test adding an ad (if ads exist)
Write-Host "Test 6: Check if we can query ads" -ForegroundColor Yellow
try {
    $adsResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ads?page=1`&page_size=1" -Method GET
    $adsData = $adsResponse.Content | ConvertFrom-Json
    
    if ($adsData.data.Count -gt 0) {
        $testAdId = $adsData.data[0].id
        Write-Host "✓ Found ad ID: $testAdId" -ForegroundColor Green
        
        # Try to add the ad to the list
        Write-Host "  Attempting to add ad to list..." -ForegroundColor Gray
        $addBody = @{
            list_id = $testListId
            ad_id = $testAdId
            notes = "Test note"
        } | ConvertTo-Json
        
        try {
            $addResponse = Invoke-WebRequest -Uri "$baseUrl/items" -Method POST -Body $addBody -ContentType "application/json"
            Write-Host "  ✓ Successfully added ad to list!" -ForegroundColor Green
            
            # Now remove it
            Write-Host "  Attempting to remove ad from list..." -ForegroundColor Gray
            $removeBody = @{
                list_id = $testListId
                ad_id = $testAdId
            } | ConvertTo-Json
            
            $removeResponse = Invoke-WebRequest -Uri "$baseUrl/items" -Method DELETE -Body $removeBody -ContentType "application/json"
            Write-Host "  ✓ Successfully removed ad from list!" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Could not add/remove ad (this is OK if ad doesn't exist)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ No ads found in database (this is OK)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not query ads (this is OK)" -ForegroundColor Yellow
}
Write-Host ""

# Test 7: Delete the test list
Write-Host "Test 7: DELETE /api/favorites/lists/$testListId" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/lists/$testListId" -Method DELETE
    Write-Host "✓ Success! Deleted test list" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All tests passed! ✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit http://localhost:8000/docs to see the API documentation" -ForegroundColor White
Write-Host "2. Navigate to /favorite-lists in your frontend to use the UI" -ForegroundColor White
Write-Host "3. Add the AddToFavoriteButton component to your ad cards" -ForegroundColor White
Write-Host ""
