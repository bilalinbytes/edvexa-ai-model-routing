from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.provider import ProviderConfig
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderRead

router = APIRouter(prefix="/providers", tags=["Providers"])

@router.get("", response_model=List[ProviderRead])
def list_providers(db: Session = Depends(get_db)):
    return db.query(ProviderConfig).order_by(ProviderConfig.created_at.desc()).all()

@router.post("", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
def create_provider(payload: ProviderCreate, db: Session = Depends(get_db)):
    existing = db.query(ProviderConfig).filter(ProviderConfig.identifier == payload.identifier).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider identifier '{payload.identifier}' already exists."
        )

    provider = ProviderConfig(**payload.model_dump())
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider

@router.get("/{provider_id}", response_model=ProviderRead)
def get_provider(provider_id: str, db: Session = Depends(get_db)):
    prov = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not prov:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return prov

@router.put("/{provider_id}", response_model=ProviderRead)
def update_provider(provider_id: str, payload: ProviderUpdate, db: Session = Depends(get_db)):
    prov = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not prov:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prov, field, val)

    db.commit()
    db.refresh(prov)
    return prov

@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(provider_id: str, db: Session = Depends(get_db)):
    prov = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not prov:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    db.delete(prov)
    db.commit()
    return None

@router.post("/{provider_id}/toggle", response_model=ProviderRead)
def toggle_provider(provider_id: str, db: Session = Depends(get_db)):
    prov = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not prov:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    prov.is_enabled = not prov.is_enabled
    db.commit()
    db.refresh(prov)
    return prov
