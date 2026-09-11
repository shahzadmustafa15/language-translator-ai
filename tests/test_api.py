import inspect
from unittest.mock import patch

from fastapi.testclient import TestClient

import api.index
from api.index import app

client = TestClient(app)


def test_backend_avoids_unofficial_translation_provider():
    source = inspect.getsource(api.index)

    assert 'deep_translator' not in source
    assert 'GoogleTranslator' not in source


def test_same_language_request_returns_200():
    response = client.post(
        '/api/translate',
        json={'text': 'hello', 'source_lang': 'en', 'target_lang': 'en'},
    )

    assert response.status_code == 200
    assert response.json()['translation'] == 'hello'


def test_invalid_language_request_returns_422():
    response = client.post(
        '/api/translate',
        json={'text': 'hello', 'source_lang': 'xx', 'target_lang': 'en'},
    )

    assert response.status_code == 422


def test_fallback_when_translator_is_unavailable():
    with patch('api.index.httpx.get', side_effect=Exception('provider unavailable')):
        response = client.post(
            '/api/translate',
            json={'text': 'hello', 'source_lang': 'en', 'target_lang': 'ur'},
        )

    assert response.status_code == 200
    assert response.json()['translation']


def test_auto_source_language_uses_detected_source_for_provider_call():
    with patch('api.index.httpx.get') as mock_get:
        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = {
            'responseData': {'translatedText': 'سلام دنیا'},
        }

        response = client.post(
            '/api/translate',
            json={'text': 'hello world', 'source_lang': 'auto', 'target_lang': 'ur'},
        )

    assert response.status_code == 200
    assert response.json()['translation'] == 'سلام دنیا'
    assert mock_get.call_args.kwargs['params']['langpair'] == 'en|ur'
