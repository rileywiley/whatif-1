from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import batch, commentary, races, scenarios, simulate, solve, suggestions, tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="WhatIf-1",
    description="F1 What-If Simulation Engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(races.router)
app.include_router(simulate.router)
app.include_router(solve.router)
app.include_router(scenarios.router)
app.include_router(commentary.router)
app.include_router(suggestions.router)
app.include_router(batch.router)
app.include_router(tasks.router)


@app.get("/health")
def health():
    return {"status": "ok"}
