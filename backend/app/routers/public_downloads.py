# backend/app/routers/public_downloads.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter(
    prefix="/public",
    tags=["Public - Downloads"]
)

@router.get(
    "/plantilla-participantes",
    response_class=FileResponse,
    summary="Descargar plantilla de participantes (pública, sin autenticación)"
)
def download_participants_template():
    """
    Sirve el archivo plantilla_participantes.xlsx desde /app/static/.
    Este endpoint es 100% público y NO requiere autenticación.
    """
    
    file_path = Path("app/static/plantilla_participantes.xlsx")

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Plantilla no encontrada en el servidor. Ruta buscada: {file_path}"
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="plantilla_participantes.xlsx"
    )
