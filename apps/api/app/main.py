from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    settings.store_media_root.mkdir(parents=True, exist_ok=True)
    settings.cafe_media_root.mkdir(parents=True, exist_ok=True)
    settings.member_photo_root.mkdir(parents=True, exist_ok=True)
    settings.coaching_media_root.mkdir(parents=True, exist_ok=True)
    application = FastAPI(
        title=settings.app_name,
        version="0.2.0",
        description=(
            "Phase 2 du monolithe modulaire The Masterz Gym : authentification, membres, "
            "abonnements, paiements, présences et audit."
        ),
    )
    application.mount(
        "/media/cafe-menu",
        StaticFiles(directory=settings.cafe_media_root),
        name="cafe-menu-images",
    )
    application.mount(
        "/media/store-products",
        StaticFiles(directory=settings.store_media_root),
        name="store-product-images",
    )
    application.mount(
        "/media/member-photos",
        StaticFiles(directory=settings.member_photo_root),
        name="member-photos",
    )
    application.mount(
        "/media/coaching",
        StaticFiles(directory=settings.coaching_media_root),
        name="coaching-media",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()
