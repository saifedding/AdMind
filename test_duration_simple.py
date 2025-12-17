#!/usr/bin/env python3
"""
Simple test script to debug duration filtering logic without database dependencies
"""

from datetime import datetime, date

def convert_timestamp_to_date(ts):
    """Converts a UNIX timestamp to a 'YYYY-MM-DD' formatted string."""
    if not ts: 
        return None
    try:
        return datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return None

def calculate_duration_days(start_date_str, end_date_str, is_active=False):
    """Calculate duration in days between start_date and end_date (or current date if active)"""
    if not start_date_str:
        return None
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        
        if is_active or not end_date_str:
            # If ad is active or no end date, calculate up to today
            end_date = date.today()
        else:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        duration = (end_date - start_date).days
        return max(duration, 1)  # Ensure minimum of 1 day
        
    except (ValueError, TypeError) as e:
        print(f"Error calculating duration: start={start_date_str}, end={end_date_str}, error={e}")
        return None

def meets_duration_requirement(start_date_str, end_date_str, is_active=False, min_duration_days=None):
    """Check if an ad meets the minimum duration requirement"""
    if min_duration_days is None:
        return True  # No duration filter applied
    
    duration = calculate_duration_days(start_date_str, end_date_str, is_active)
    if duration is None:
        return False  # Can't calculate duration, exclude ad
    
    return duration >= min_duration_days

def test_duration_calculation():
    """Test the duration calculation logic"""
    
    print("=== DURATION FILTERING DEBUG TEST ===")
    print()
    
    # Test case 1: Active ad from 2025-11-29 to current date (should be ~18 days)
    start_date = '2025-11-29'
    end_date = '2025-12-17'
    is_active = True
    min_duration_days = 30
    
    print(f"Test Case 1:")
    print(f"  start_date: {start_date}")
    print(f"  end_date: {end_date}")
    print(f"  is_active: {is_active}")
    print(f"  min_duration_days: {min_duration_days}")
    
    # Test duration calculation
    duration = calculate_duration_days(start_date, end_date, is_active)
    print(f"  calculated duration: {duration} days")
    
    # Test meets requirement
    meets_req = meets_duration_requirement(start_date, end_date, is_active, min_duration_days)
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
    
    duration2 = calculate_duration_days(start_date2, end_date2, is_active2)
    meets_req2 = meets_duration_requirement(start_date2, end_date2, is_active2, min_duration_days)
    
    print(f"  calculated duration: {duration2} days")
    print(f"  meets requirement: {meets_req2}")
    print(f"  Expected: duration ~36 days, meets_req = True (since 36 >= 30)")
    print()
    
    # Test case 3: No min_duration_days filter
    meets_req3 = meets_duration_requirement(start_date, end_date, is_active, None)
    print(f"Test Case 3 (no filter):")
    print(f"  min_duration_days: None")
    print(f"  meets requirement: {meets_req3}")
    print(f"  Expected: meets_req = True (no filter applied)")
    print()
    
    # Test case 4: Test timestamp conversion
    print("Test Case 4 (timestamp conversion):")
    test_timestamps = [1732838400, 1734652800, None, "invalid"]
    for ts in test_timestamps:
        converted = convert_timestamp_to_date(ts)
        print(f"  {ts} -> {converted}")

if __name__ == "__main__":
    test_duration_calculation()