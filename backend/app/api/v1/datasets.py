from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.dataset import BenchmarkDataset, TestCase
from app.schemas.dataset import (
    DatasetCreate, DatasetUpdate, DatasetRead, DatasetDetailRead,
    TestCaseCreate, TestCaseUpdate, TestCaseRead
)
from app.services.seed_data import seed_database

router = APIRouter(prefix="/datasets", tags=["Datasets & Test Cases"])

@router.get("", response_model=List[DatasetRead])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(BenchmarkDataset).order_by(BenchmarkDataset.created_at.desc()).all()
    results = []
    for d in datasets:
        item = DatasetRead.model_validate(d)
        item.test_case_count = len(d.test_cases)
        results.append(item)
    return results

@router.post("", response_model=DatasetDetailRead, status_code=status.HTTP_201_CREATED)
def create_dataset(payload: DatasetCreate, db: Session = Depends(get_db)):
    dataset = BenchmarkDataset(
        name=payload.name,
        description=payload.description,
        version=payload.version,
        is_seeded=False
    )
    db.add(dataset)
    db.flush()

    if payload.test_cases:
        for tc_data in payload.test_cases:
            tc = TestCase(dataset_id=dataset.id, **tc_data.model_dump())
            db.add(tc)

    db.commit()
    db.refresh(dataset)
    read_item = DatasetDetailRead.model_validate(dataset)
    read_item.test_case_count = len(dataset.test_cases)
    return read_item

@router.get("/{dataset_id}", response_model=DatasetDetailRead)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    read_item = DatasetDetailRead.model_validate(dataset)
    read_item.test_case_count = len(dataset.test_cases)
    return read_item

@router.put("/{dataset_id}", response_model=DatasetRead)
def update_dataset(dataset_id: str, payload: DatasetUpdate, db: Session = Depends(get_db)):
    dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(dataset, field, val)

    db.commit()
    db.refresh(dataset)
    read_item = DatasetRead.model_validate(dataset)
    read_item.test_case_count = len(dataset.test_cases)
    return read_item

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    db.delete(dataset)
    db.commit()
    return None

@router.post("/{dataset_id}/test-cases", response_model=TestCaseRead, status_code=status.HTTP_201_CREATED)
def add_test_case(dataset_id: str, payload: TestCaseCreate, db: Session = Depends(get_db)):
    dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    tc = TestCase(dataset_id=dataset_id, **payload.model_dump())
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc

@router.put("/test-cases/{case_id}", response_model=TestCaseRead)
def update_test_case(case_id: str, payload: TestCaseUpdate, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(tc, field, val)

    db.commit()
    db.refresh(tc)
    return tc

@router.delete("/test-cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(case_id: str, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")

    db.delete(tc)
    db.commit()
    return None

@router.post("/seed", status_code=status.HTTP_200_OK)
def trigger_seed_data(db: Session = Depends(get_db)):
    result = seed_database(db)
    return result
