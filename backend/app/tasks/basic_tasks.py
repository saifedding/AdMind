from celery import shared_task
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)

@shared_task
def add_together(x: int, y: int) -> dict:
    """
    Simple test task that adds two numbers together.
    This is the test task requested in the prompt.
    """
    logger.info(f"Adding {x} + {y}")
    result = x + y
    
    return {
        "task_name": "add_together",
        "inputs": {"x": x, "y": y},
        "result": result,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    }

@shared_task(bind=True)
def test_task(self, message: str = "Hello from Celery!") -> dict:
    """
    Another simple test task to verify Celery is working properly.
    """
    task_id = self.request.id
    logger.info(f"Test task {task_id} started with message: {message}")
    
    # Simulate some work
    time.sleep(2)
    
    result = {
        "task_id": task_id,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    }
    
    logger.info(f"Test task {task_id} completed")
    return result

@shared_task(bind=True)
def long_running_task(self, duration: int = 10) -> dict:
    """
    A task that simulates long-running work.
    Useful for testing task monitoring and cancellation.
    """
    task_id = self.request.id
    logger.info(f"Long running task {task_id} started for {duration} seconds")
    
    for i in range(duration):
        time.sleep(1)
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta={
                'current': i + 1,
                'total': duration,
                'status': f'Processing... {i + 1}/{duration}'
            }
        )
    
    result = {
        "task_id": task_id,
        "duration": duration,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    }
    
    logger.info(f"Long running task {task_id} completed")
    return result 