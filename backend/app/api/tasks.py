from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1", tags=["tasks"])

# In-memory task store (would use Celery AsyncResult in production)
_task_store: dict[str, dict] = {}


def create_task(task_id: str) -> None:
    _task_store[task_id] = {"task_id": task_id, "status": "processing", "result": None}


def complete_task(task_id: str, result: dict) -> None:
    if task_id in _task_store:
        _task_store[task_id]["status"] = "completed"
        _task_store[task_id]["result"] = result


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    task = _task_store.get(task_id)
    if not task:
        raise HTTPException(404, {"code": "TASK_NOT_FOUND", "message": f"Task {task_id} not found"})
    return task
