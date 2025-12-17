#!/usr/bin/env python3
"""
Test script to debug duration filtering logic
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from datetime import datetime, date
from backend.app.services.enhanced_ad_extraction import EnhancedAdExtractionService

def test_duration_calculation():
    """Test the duration calculation logic"""
    
    # Create a mock service instance (we don't need DB for this test)
    service = EnhancedAdExtractionService(None, min_duration_days=30)
    
    # Test case 1: Active ad from 2025-11-29 to current date (should be ~18 days)
    start_date = '2025-11-29'
    end_date = '2025-12-17'
    is_active = True
    
    print(f"Test Case 1:")
    print(f"  start_date: {start_date}")
    print(f"  end_date: {end_date}")
    print(f"  is_active: {is_active}")
    print(f"  min_duration_days: {service.min_duration_days}")
    
    # Test duration calculation
    duration = service.calculate_duration_days(start_date, end_date, is_active)
    print(f"  calculated duration: {duration} days")
    
    # Test meets requirement
    meets_req = service.meets_duration_requirement(start_date, end_date, is_active)
    print(f"  meets requirement: {meets_req}")
    
    print(f"  Expected: duration ~18 days, meets_req = False (since 18 < 30)")
    print()
    
    # Test case 2: Ad with 35 days duration (should pass)
    start_date2 = '2025-10-15'
    end_date2 = '2025-11-20'
    is_active2 = False
    
    print(f"Test Case 2:")
    print(f"  start_date: {start_date2}")
    print(f"  end_date: {end_date2}")
    print(f"  is_active: {is_active2}")
    
    duration2 = service.calculate_duration_days(start_date2, end_date2, is_active2)
    meets_req2 = service.meets_duration_requirement(start_date2, end_date2, is_active2)
    
    print(f"  calculated duration: {duration2} days")
    print(f"  meets requirement: {meets_req2}")
    print(f"  Expected: duration ~36 days, meets_req = True (since 36 >= 30)")
    print()
    
    # Test case 3: No min_duration_days filter
    service_no_filter = EnhancedAdExtractionService(None, min_duration_days=None)
    meets_req3 = service_no_filter.meets_duration_requirement(start_date, end_date, is_active)
    print(f"Test Case 3 (no filter):")
    print(f"  min_duration_days: {service_no_filter.min_duration_days}")
    print(f"  meets requirement: {meets_req3}")
    print(f"  Expected: meets_req = True (no filter applied)")

if __name__ == "__main__":
    test_duration_calculation()