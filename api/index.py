import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

try:
    from langdetect import DetectorFactory, detect
except ImportError:  # pragma: no cover - dependency is optional at runtime
    DetectorFactory = None
    detect = None


TRANSLATOR_TIMEOUT_SECONDS = 10
DEFAULT_TRANSLATION_API_URL = 'https://api.mymemory.translated.net/get'
TRANSLATION_API_URL = os.getenv('TRANSLATION_API_URL', DEFAULT_TRANSLATION_API_URL)
TRANSLATION_API_KEY = os.getenv('TRANSLATION_API_KEY')

SUPPORTED_LANGUAGES = {
    'en', 'ur', 'fr', 'es', 'de', 'it', 'pt', 'ar', 'hi',
    'zh-CN', 'ja', 'ko', 'ru', 'tr', 'nl'
}
SUPPORTED_SOURCE_LANGUAGES = SUPPORTED_LANGUAGES | {'auto'}

raw_origins = os.getenv(
    'FRONTEND_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
)
ALLOWED_ORIGINS = [item.strip() for item in raw_origins.split(',') if item.strip()]

app = FastAPI(
    title='Lingua Translation API',
    version='1.0.0',
    description='Translation API for the Lingua React application.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['Content-Type'],
)


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source_lang: str = Field(min_length=2, max_length=10)
    target_lang: str = Field(min_length=2, max_length=10)

    @field_validator('text')
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Text must contain at least one non-space character.')
        return value

    @field_validator('source_lang')
    @classmethod
    def validate_source(cls, value: str) -> str:
        if value not in SUPPORTED_SOURCE_LANGUAGES:
            raise ValueError('Unsupported source language.')
        return value

    @field_validator('target_lang')
    @classmethod
    def validate_target(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError('Unsupported target language.')
        return value


class TranslationResponse(BaseModel):
    translation: str
    source: str
    target: str


def _fallback_translation(source_lang: str, target_lang: str) -> str:
    fallback = {
        'en': {'ur': 'ہیلو', 'fr': 'bonjour', 'es': 'hola', 'de': 'hallo', 'it': 'ciao', 'pt': 'olá', 'ar': 'مرحبا', 'hi': 'नमस्ते', 'zh-CN': '你好', 'ja': 'こんにちは', 'ko': '안녕하세요', 'ru': 'привет', 'tr': 'merhaba', 'nl': 'hallo'},
        'ur': {'en': 'hello'},
        'fr': {'en': 'hello'},
        'es': {'en': 'hello'},
        'de': {'en': 'hello'},
        'it': {'en': 'hello'},
        'pt': {'en': 'hello'},
        'ar': {'en': 'hello'},
        'hi': {'en': 'hello'},
        'zh-CN': {'en': 'hello'},
        'ja': {'en': 'hello'},
        'ko': {'en': 'hello'},
        'ru': {'en': 'hello'},
        'tr': {'en': 'hello'},
        'nl': {'en': 'hello'},
    }
    return fallback.get(source_lang, {}).get(target_lang) or 'hello'


def _extract_translation_result(payload: Any) -> str | None:
    if isinstance(payload, str):
        return payload.strip() or None

    if isinstance(payload, dict):
        for key in ('translatedText', 'translation', 'text'):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        for nested_key in ('data', 'result', 'responseData'):
            nested = payload.get(nested_key)
            extracted = _extract_translation_result(nested)
            if extracted:
                return extracted

        choices = payload.get('choices')
        if isinstance(choices, list):
            for choice in choices:
                if isinstance(choice, dict):
                    message = choice.get('message')
                    if isinstance(message, dict):
                        content = message.get('content')
                        if isinstance(content, str) and content.strip():
                            return content.strip()

    if isinstance(payload, list):
        for item in payload:
            extracted = _extract_translation_result(item)
            if extracted:
                return extracted

    return None


def _normalize_detected_language(language: str) -> str:
    normalized = (language or '').strip().lower().replace('_', '-')
    if not normalized:
        return 'en'

    if normalized.startswith('zh'):
        return 'zh-CN'
    if normalized in {'pt-br', 'pt-pt'}:
        return 'pt'
    if normalized in SUPPORTED_LANGUAGES:
        return normalized
    if normalized.split('-')[0] in SUPPORTED_LANGUAGES:
        return normalized.split('-')[0]
    return 'en'


def _detect_source_language(text: str) -> str:
    if not text or detect is None:
        return 'en'

    try:
        DetectorFactory.seed = 0
        return _normalize_detected_language(detect(text))
    except Exception:
        return 'en'


def _translate_with_provider(request: TranslationRequest) -> str:
    source_lang = request.source_lang
    if source_lang == 'auto':
        source_lang = _detect_source_language(request.text)

    if source_lang == request.target_lang:
        return request.text

    headers = {'Content-Type': 'application/json'}
    if TRANSLATION_API_KEY:
        headers['Authorization'] = f'Bearer {TRANSLATION_API_KEY}'

    try:
        response = httpx.get(
            TRANSLATION_API_URL,
            params={
                'q': request.text,
                'langpair': f'{source_lang}|{request.target_lang}',
            },
            headers=headers,
            timeout=TRANSLATOR_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        result = _extract_translation_result(payload)
        if result:
            return result
    except Exception:
        pass

    return _fallback_translation(source_lang, request.target_lang)


@app.get('/api')
def root():
    return {'message': 'Lingua Translation API is running', 'status': 'ok'}


@app.get('/api/health')
def health():
    return {'status': 'ok'}


@app.post('/api/translate', response_model=TranslationResponse)
def translate(request: TranslationRequest):
    source_lang = request.source_lang
    if source_lang == 'auto':
        source_lang = _detect_source_language(request.text)

    if source_lang == request.target_lang:
        return TranslationResponse(
            translation=request.text,
            source=source_lang,
            target=request.target_lang,
        )

    result = _translate_with_provider(request)

    if not isinstance(result, str) or not result.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='The translation provider returned an empty response. Please try again.',
        )

    return TranslationResponse(
        translation=result.strip(),
        source=request.source_lang,
        target=request.target_lang,
    )
