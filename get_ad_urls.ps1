param(
    [Parameter(Mandatory=$true)]
    [string]$AdId
)

# Function to extract URLs from the API response
function Extract-AdUrls {
    param($jsonResponse, $AdId)
    
    $urls = @{
        video_urls = @()
        image_urls = @()
        link_urls = @()
        profile_urls = @()
    }
    
    try {
        # Facebook returns multiple JSON objects separated by newlines
        # Split by newline and parse each JSON object
        $jsonLines = $jsonResponse -split "`n" | Where-Object { $_.Trim() -ne "" }
        
        $data = $null
        foreach ($line in $jsonLines) {
            try {
                $parsedLine = $line | ConvertFrom-Json
                # Look for the object that contains ad_library_main
                if ($parsedLine.data.ad_library_main.search_results_connection) {
                    $data = $parsedLine
                    break
                }
            } catch {
                # Skip invalid JSON lines
                continue
            }
        }
        
        if (-not $data) {
            Write-Error "Could not find ad data in response"
            return $urls
        }
        
        # Extract from search results
        if ($data.data.ad_library_main.search_results_connection.edges) {
            foreach ($edge in $data.data.ad_library_main.search_results_connection.edges) {
                foreach ($result in $edge.node.collated_results) {
                    # Only process the ad with matching archive ID
                    if ($result.ad_archive_id -ne $AdId) {
                        continue
                    }
                    
                    $snapshot = $result.snapshot
                    
                    # Extract page profile URLs
                    if ($snapshot.page_profile_uri) {
                        $urls.profile_urls += $snapshot.page_profile_uri
                    }
                    if ($snapshot.page_profile_picture_url) {
                        $urls.image_urls += $snapshot.page_profile_picture_url
                    }
                    
                    # Extract from cards
                    if ($snapshot.cards) {
                        foreach ($card in $snapshot.cards) {
                            # Video URLs
                            if ($card.video_hd_url) {
                                $urls.video_urls += $card.video_hd_url
                            }
                            if ($card.video_sd_url) {
                                $urls.video_urls += $card.video_sd_url
                            }
                            if ($card.watermarked_video_hd_url) {
                                $urls.video_urls += $card.watermarked_video_hd_url
                            }
                            if ($card.watermarked_video_sd_url) {
                                $urls.video_urls += $card.watermarked_video_sd_url
                            }
                            if ($card.video_preview_image_url) {
                                $urls.image_urls += $card.video_preview_image_url
                            }
                            
                            # Image URLs
                            if ($card.original_image_url) {
                                $urls.image_urls += $card.original_image_url
                            }
                            if ($card.resized_image_url) {
                                $urls.image_urls += $card.resized_image_url
                            }
                            if ($card.watermarked_resized_image_url) {
                                $urls.image_urls += $card.watermarked_resized_image_url
                            }
                            
                            # Link URLs
                            if ($card.link_url) {
                                $urls.link_urls += $card.link_url
                            }
                        }
                    }
                    
                    # Extract extra images
                    if ($snapshot.extra_images) {
                        foreach ($img in $snapshot.extra_images) {
                            if ($img.original_image_url) {
                                $urls.image_urls += $img.original_image_url
                            }
                            if ($img.resized_image_url) {
                                $urls.image_urls += $img.resized_image_url
                            }
                            if ($img.watermarked_resized_image_url) {
                                $urls.image_urls += $img.watermarked_resized_image_url
                            }
                        }
                    }
                    
                    # Extract extra links
                    if ($snapshot.extra_links) {
                        foreach ($link in $snapshot.extra_links) {
                            $urls.link_urls += $link
                        }
                    }
                }
            }
        }
        
        # Remove duplicates
        $urls.video_urls = $urls.video_urls | Select-Object -Unique
        $urls.image_urls = $urls.image_urls | Select-Object -Unique
        $urls.link_urls = $urls.link_urls | Select-Object -Unique
        $urls.profile_urls = $urls.profile_urls | Select-Object -Unique
        
    } catch {
        Write-Error "Error parsing JSON: $_"
    }
    
    return $urls
}

# Main execution
try {
    # Set up session with cookies
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    $session.Cookies.Add((New-Object System.Net.Cookie("datr", "yAGbaCWPi6zOT7VQESkXSWuK", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("sb", "yAGbaJ_fQt16AW7XW_XmEvbO", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("ps_l", "1", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("ps_n", "1", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("dpr", "2.5", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("c_user", "100093971889068", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("b_user", "61563565160857", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("i_user", "61580814203263", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("presence", "EDvF3EtimeF1759477748EuserFA21B93971889068A2EstateFDutF0CEchF_7bCC", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("fr", "1p2qfDEgIcJZ9tNfY.AWeJTbTtvN6sBgH7qZcdyhLSTa-obOkMHeg9PHTvJuA6lFeKZf0.Bo34Xh..AAA.0.0.Bo34Xh.AWeA-BR_uhR6vkZ5Q-sftBZvb6s", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("xs", "15%3A95G58UMOGxRf8w%3A2%3A1754989240%3A-1%3A-1%3ATIYKeXaudJhjMw%3AAcVBpprRghTo2-6DLg6rXJwYjg7vZjpuNGUncnVq_a5S", "/", ".facebook.com")))
    $session.Cookies.Add((New-Object System.Net.Cookie("wd", "505x831", "/", ".facebook.com")))

    Write-Host "Fetching ad data for ID: $AdId" -ForegroundColor Cyan
    
    # Create the variables JSON with the ad ID
    $variables = @{
        adType = "ALL"
        activeStatus = "active"
        audienceTimeframe = "LAST_7_DAYS"
        bylines = @()
        collationToken = $null
        contentLanguages = @()
        countries = @("AE")
        country = "AE"
        deeplinkAdID = $AdId
        isAboutTab = $false
        isAudienceTab = $false
        isLandingPage = $false
        isTargetedCountry = $false
        hasDeeplinkAdID = $false
        location = $null
        mediaType = "all"
        multiCountryFilterMode = $null
        pageIDs = @()
        potentialReachInput = $null
        publisherPlatforms = @()
        queryString = ""
        regions = $null
        searchType = "page"
        sessionID = [guid]::NewGuid().ToString()
        source = $null
        sortData = $null
        startDate = $null
        fetchPageInfo = $true
        fetchSharedDisclaimers = $true
        viewAllPageID = "129923153845537"
        v = "50a00f"
    } | ConvertTo-Json -Compress -Depth 10

    # Prepare the request body
    $body = @{
        av = "61580814203263"
        __aaid = "0"
        __user = "61580814203263"
        __a = "1"
        __req = "1"
        __hs = "20364.HYP:comet_plat_default_pkg.2.1...0"
        dpr = "3"
        __ccg = "GOOD"
        __rev = "1027945430"
        __s = "jek5gm:xxczjj:bn7q6v"
        __hsi = "7556912769966221381"
        __dyn = "7xe6E5q9zo5ObwKBAg5S1Dxu13wqovzEeUaUco38wCwfW7oqx609vCyU4a0qa2O1Vwooa8462m0nS4oaEd86a3a0EA2C0iK1Axi2a7o2uK1LwPxe2GewbCXw8y0zEnwhE0Caazo11E2XU6-1FwLweq1Iwqo1iqwIwtU5K0UE620ui"
        __hsdp = "s88W82tzKUDx9F28rgGt10BSFp9A449yZ1m11xPDxC4EeUpwjt2o0K1waW0J85acyUy11wno8E1Wo2FxKbw1tRwAw2R81HoR0IwRg0jrw4Yw"
        __sjsp = "s88W82tzKUDx9F28rgGt10BSFp9A449yZ1m11xPDxC4EeUpwjt2o0K1waW0J85acwlE5S2a0uC0GoryU0nto980Ji0qSdgb8dk04SU1f8"
        __comet_req = "94"
        fb_dtsg = "NAfslA9GRm6jdMlcK3o28uSnuQjjve406jWFP2BpLgwwK3mnOmtwbxw:15:1754989240"
        jazoest = "25672"
        lsd = "Zsr1ngZWH9B_nGtAAx9D6A"
        __spin_r = "1027945430"
        __spin_b = "trunk"
        __spin_t = "1759480864"
        __jssesw = "1"
        fb_api_caller_class = "RelayModern"
        fb_api_req_friendly_name = "AdLibraryFoundationRootQuery"
        variables = $variables
        server_timestamps = "true"
        doc_id = "24886996877558880"
    }

    # Convert to form data
    $formData = ($body.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Uri]::EscapeDataString($_.Value))" }) -join "&"

    # Make the API request (let PowerShell handle decompression automatically)
    $response = Invoke-WebRequest -UseBasicParsing -Uri "https://www.facebook.com/api/graphql/" `
        -Method "POST" `
        -WebSession $session `
        -Headers @{
            "authority"="www.facebook.com"
            "method"="POST"
            "path"="/api/graphql/"
            "scheme"="https"
            "accept"="*/*"
            "accept-encoding"="gzip, deflate, br, zstd"
            "accept-language"="en-US,en;q=0.9"
            "origin"="https://www.facebook.com"
            "priority"="u=1, i"
            "referer"="https://www.facebook.com/ads/library/"
            "sec-ch-ua"="`"Chromium`";v=`"140`", `"Not=A?Brand`";v=`"24`", `"Google Chrome`";v=`"140`""
            "sec-ch-ua-full-version-list"="`"Chromium`";v=`"140.0.0.0`", `"Not=A?Brand`";v=`"24.0.0.0`", `"Google Chrome`";v=`"140.0.0.0`""
            "sec-ch-ua-mobile"="?0"
            "sec-ch-ua-model"="`"`""
            "sec-ch-ua-platform"="`"Windows`""
            "sec-ch-ua-platform-version"="`"19.0.0`""
            "sec-fetch-dest"="empty"
            "sec-fetch-mode"="cors"
            "sec-fetch-site"="same-origin"
            "sec-gpc"="1"
            "x-asbd-id"="359341"
            "x-fb-friendly-name"="AdLibraryFoundationRootQuery"
            "x-fb-lsd"="Zsr1ngZWH9B_nGtAAx9D6A"
        } `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $formData

    # Debug: Save raw response
    $response.Content | Out-File -FilePath "debug_response.json" -Encoding UTF8
    Write-Host "Debug: Raw response saved to debug_response.json" -ForegroundColor Cyan
    
    # Extract URLs from response
    $extractedUrls = Extract-AdUrls -jsonResponse $response.Content -AdId $AdId
    
    # Check if ad was found
    $totalUrls = $extractedUrls.video_urls.Count + $extractedUrls.image_urls.Count + $extractedUrls.link_urls.Count + $extractedUrls.profile_urls.Count
    
    if ($totalUrls -eq 0) {
        Write-Host "`nNo ad found with ID: $AdId" -ForegroundColor Red
        Write-Host "Please verify the ad ID is correct and the ad is active." -ForegroundColor Yellow
        return
    }
    
    # Display results
    Write-Host "`n=== AD URLS FOR ID: $AdId ===" -ForegroundColor Green
    
    if ($extractedUrls.video_urls.Count -gt 0) {
        Write-Host "`n--- VIDEO URLS ($($extractedUrls.video_urls.Count)) ---" -ForegroundColor Yellow
        $extractedUrls.video_urls | ForEach-Object { Write-Host $_ }
    }
    
    if ($extractedUrls.image_urls.Count -gt 0) {
        Write-Host "`n--- IMAGE URLS ($($extractedUrls.image_urls.Count)) ---" -ForegroundColor Yellow
        $extractedUrls.image_urls | ForEach-Object { Write-Host $_ }
    }
    
    if ($extractedUrls.link_urls.Count -gt 0) {
        Write-Host "`n--- LINK URLS ($($extractedUrls.link_urls.Count)) ---" -ForegroundColor Yellow
        $extractedUrls.link_urls | ForEach-Object { Write-Host $_ }
    }
    
    if ($extractedUrls.profile_urls.Count -gt 0) {
        Write-Host "`n--- PROFILE URLS ($($extractedUrls.profile_urls.Count)) ---" -ForegroundColor Yellow
        $extractedUrls.profile_urls | ForEach-Object { Write-Host $_ }
    }
    
    # Save to JSON file
    $outputFile = "ad_urls_$AdId.json"
    $extractedUrls | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "`nResults saved to: $outputFile" -ForegroundColor Green
    
    return $extractedUrls

} catch {
    Write-Error "Error fetching ad data: $_"
    Write-Error $_.Exception.Message
}
