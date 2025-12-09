# Este archivo vuelve a ser necesario para definir los tipos y modalidades.
from enum import Enum

class TipoProductoEnum(str, Enum):
    PILDORA_EDUCATIVA = "PILDORA_EDUCATIVA"
    INYECCION_EDUCATIVA = "INYECCION_EDUCATIVA"
    CURSO_EDUCATIVO = "CURSO_EDUCATIVO"

class ModalidadEnum(str, Enum):
    REMOTA = "REMOTA"
    PRESENCIAL = "PRESENCIAL"
    HIBRIDA = "HIBRIDA"
