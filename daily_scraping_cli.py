#!/usr/bin/env python3
"""
Daily Ads Scraping CLI Tool

This script provides command-line access to daily ads scraping functionality.
"""

import requests
import json
import time
import argparse
from datetime import datetime
from typing import List, Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
SCRAPING_URL = f"{BASE_URL}/scraping"

class DailyScrapingCLI:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.scraping_url = f"{base_url}/scraping"
    
    def start_daily_scraping(
        self,
        countries: List[str] = None,
        max_pages: int = 3,
        delay: int = 2,
        hours_lookback: int = 24,
        active_status: str = "active"
    ) -> dict:
        """Start daily scraping for all active competitors"""
        
        payload = {
            "countries": countries or ["AE", "US", "UK"],
            "max_pages_per_competitor": max_pages,
            "delay_between_requests": delay,
            "hours_lookback": hours_lookback,
            "active_status": active_status
        }
        
        print("🚀 Starting daily scraping...")
        print(f"📊 Configuration: {json.dumps(payload, indent=2)}")
        
        try:
            response = requests.post(f"{self.scraping_url}/daily/start", json=payload)
            response.raise_for_status()
            result = response.json()
            
            print(f"✅ Task started successfully!")
            print(f"📝 Task ID: {result['task_id']}")
            print(f"💬 Message: {result['message']}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error starting daily scraping: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"🔍 Response: {e.response.text}")
            return {}
    
    def start_specific_competitors_scraping(
        self,
        competitor_ids: List[int],
        countries: List[str] = None,
        max_pages: int = 3,
        delay: int = 2,
        active_status: str = "active"
    ) -> dict:
        """Start scraping for specific competitors"""
        
        payload = {
            "competitor_ids": competitor_ids,
            "countries": countries or ["AE", "US", "UK"],
            "max_pages_per_competitor": max_pages,
            "delay_between_requests": delay,
            "active_status": active_status
        }
        
        print(f"🎯 Starting scraping for specific competitors: {competitor_ids}")
        print(f"📊 Configuration: {json.dumps(payload, indent=2)}")
        
        try:
            response = requests.post(f"{self.scraping_url}/competitors/scrape", json=payload)
            response.raise_for_status()
            result = response.json()
            
            print(f"✅ Task started successfully!")
            print(f"📝 Task ID: {result['task_id']}")
            print(f"💬 Message: {result['message']}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error starting specific competitors scraping: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"🔍 Response: {e.response.text}")
            return {}
    
    def get_task_status(self, task_id: str) -> dict:
        """Get status of a scraping task"""
        
        try:
            response = requests.get(f"{self.scraping_url}/tasks/{task_id}/status")
            response.raise_for_status()
            result = response.json()
            
            print(f"📋 Task Status for {task_id}:")
            print(f"🔄 State: {result['state']}")
            
            if result.get('result'):
                print("📊 Results:")
                res = result['result']
                print(f"   • Competitors processed: {res.get('competitors_processed', 0)}")
                print(f"   • Total new ads: {res.get('total_new_ads', 0)}")
                print(f"   • Total processed ads: {res.get('total_processed_ads', 0)}")
                if res.get('errors'):
                    print(f"   • Errors: {len(res['errors'])}")
                    for error in res['errors'][:3]:  # Show first 3 errors
                        print(f"     - {error.get('competitor_name')}: {error.get('error')[:100]}...")
            
            if result.get('info'):
                print(f"ℹ️  Info: {result['info']}")
            
            if result.get('error'):
                print(f"❌ Error: {result['error']}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting task status: {e}")
            return {}
    
    def monitor_task(self, task_id: str, check_interval: int = 10) -> dict:
        """Monitor a task until completion"""
        
        print(f"👁️  Monitoring task {task_id}...")
        print("Press Ctrl+C to stop monitoring (task will continue running)")
        
        try:
            while True:
                result = self.get_task_status(task_id)
                
                if not result:
                    break
                
                state = result.get('state', '').upper()
                
                if state in ['SUCCESS', 'FAILURE', 'REVOKED']:
                    print(f"🏁 Task completed with state: {state}")
                    break
                
                print(f"⏳ Task state: {state} - Checking again in {check_interval} seconds...")
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped (task continues in background)")
        
        return result
    
    def get_active_competitors(self) -> dict:
        """Get list of active competitors"""
        
        try:
            response = requests.get(f"{self.scraping_url}/active-competitors")
            response.raise_for_status()
            result = response.json()
            
            print(f"📋 Active Competitors ({result['total_active_competitors']}):")
            
            for comp in result['competitors']:
                latest_ad = comp['latest_ad_date']
                latest_str = f"Latest ad: {latest_ad[:10] if latest_ad else 'None'}"
                print(f"   • ID {comp['id']}: {comp['name']} (Page: {comp['page_id']}) - {latest_str}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting active competitors: {e}")
            return {}
    
    def get_active_tasks(self) -> dict:
        """Get list of active scraping tasks"""
        
        try:
            response = requests.get(f"{self.scraping_url}/tasks/active")
            response.raise_for_status()
            result = response.json()
            
            active_tasks = result.get('active_tasks', [])
            
            if not active_tasks:
                print("📋 No active scraping tasks found")
            else:
                print(f"📋 Active Scraping Tasks ({len(active_tasks)}):")
                for task in active_tasks:
                    print(f"   • {task['task_id']}: {task['task_name']} on {task['worker']}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting active tasks: {e}")
            return {}

def main():
    parser = argparse.ArgumentParser(description="Daily Ads Scraping CLI Tool")
    parser.add_argument("--base-url", default=BASE_URL, help="Base API URL")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Start daily scraping command
    daily_parser = subparsers.add_parser("daily", help="Start daily scraping for all competitors")
    daily_parser.add_argument("--countries", nargs="+", default=["AE", "US", "UK"], help="Country codes")
    daily_parser.add_argument("--max-pages", type=int, default=3, help="Max pages per competitor")
    daily_parser.add_argument("--delay", type=int, default=2, help="Delay between requests")
    daily_parser.add_argument("--hours-lookback", type=int, default=24, help="Hours to look back for new ads")
    daily_parser.add_argument("--active-status", default="active", help="Ad status filter")
    daily_parser.add_argument("--monitor", action="store_true", help="Monitor task until completion")
    
    # Start specific competitors scraping command
    specific_parser = subparsers.add_parser("specific", help="Start scraping for specific competitors")
    specific_parser.add_argument("competitor_ids", nargs="+", type=int, help="Competitor IDs to scrape")
    specific_parser.add_argument("--countries", nargs="+", default=["AE", "US", "UK"], help="Country codes")
    specific_parser.add_argument("--max-pages", type=int, default=3, help="Max pages per competitor")
    specific_parser.add_argument("--delay", type=int, default=2, help="Delay between requests")
    specific_parser.add_argument("--active-status", default="active", help="Ad status filter")
    specific_parser.add_argument("--monitor", action="store_true", help="Monitor task until completion")
    
    # Task status command
    status_parser = subparsers.add_parser("status", help="Get task status")
    status_parser.add_argument("task_id", help="Task ID to check")
    
    # Monitor task command
    monitor_parser = subparsers.add_parser("monitor", help="Monitor task until completion")
    monitor_parser.add_argument("task_id", help="Task ID to monitor")
    monitor_parser.add_argument("--interval", type=int, default=10, help="Check interval in seconds")
    
    # List competitors command
    list_parser = subparsers.add_parser("competitors", help="List active competitors")
    
    # List active tasks command
    tasks_parser = subparsers.add_parser("tasks", help="List active scraping tasks")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = DailyScrapingCLI(args.base_url)
    
    if args.command == "daily":
        result = cli.start_daily_scraping(
            countries=args.countries,
            max_pages=args.max_pages,
            delay=args.delay,
            hours_lookback=args.hours_lookback,
            active_status=args.active_status
        )
        
        if args.monitor and result.get('task_id'):
            cli.monitor_task(result['task_id'])
    
    elif args.command == "specific":
        result = cli.start_specific_competitors_scraping(
            competitor_ids=args.competitor_ids,
            countries=args.countries,
            max_pages=args.max_pages,
            delay=args.delay,
            active_status=args.active_status
        )
        
        if args.monitor and result.get('task_id'):
            cli.monitor_task(result['task_id'])
    
    elif args.command == "status":
        cli.get_task_status(args.task_id)
    
    elif args.command == "monitor":
        cli.monitor_task(args.task_id, args.interval)
    
    elif args.command == "competitors":
        cli.get_active_competitors()
    
    elif args.command == "tasks":
        cli.get_active_tasks()

if __name__ == "__main__":
    main()