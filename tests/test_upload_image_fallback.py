import os
import sys
import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.services.google_ai_service import GoogleAIService


class DummyResp:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def test_upload_falls_back_to_flow_media(monkeypatch):
    svc = GoogleAIService(api_key="dummy")

    monkeypatch.setattr(
        svc,
        "_veo_auth_headers",
        lambda: {"Authorization": "Bearer test", "Accept": "application/json", "Content-Type": "application/json"},
    )

    def fake_post(url, headers=None, data=None, timeout=None):
        if url.endswith(":uploadUserImage"):
            return DummyResp(404, {"error": {"code": 404}})
        if url.endswith("flowMedia:batchGenerateImages"):
            return DummyResp(
                200,
                {
                    "media": [
                        {
                            "mediaGenerationId": {"mediaGenerationId": "m123"},
                            "width": 100,
                            "height": 200,
                        }
                    ]
                },
            )
        return DummyResp(200, {})

    monkeypatch.setattr("app.services.google_ai_service.requests.post", fake_post)

    result = svc.upload_image_to_google("data:image/jpeg;base64,AAA")
    assert result["success"] is True
    assert result["mediaId"] == "m123"
    assert result["width"] == 100
    assert result["height"] == 200


def test_upload_user_image_happy_path(monkeypatch):
    svc = GoogleAIService(api_key="dummy")

    monkeypatch.setattr(
        svc,
        "_veo_auth_headers",
        lambda: {"Authorization": "Bearer test", "Accept": "application/json", "Content-Type": "application/json"},
    )

    def fake_post(url, headers=None, data=None, timeout=None):
        if url.endswith(":uploadUserImage"):
            return DummyResp(200, {"mediaGenerationId": {"mediaGenerationId": "mxYZ"}, "width": 64, "height": 64})
        # if flowMedia is called, fail to indicate wrong path
        if "flowMedia:batchGenerateImages" in url:
            return DummyResp(500, {"error": {"message": "should not be called"}})
        return DummyResp(200, {})

    monkeypatch.setattr("app.services.google_ai_service.requests.post", fake_post)

    result = svc.upload_image_to_google("data:image/jpeg;base64,BBB")
    assert result["success"] is True
    assert result["mediaId"] == "mxYZ"
    assert result["width"] == 64
    assert result["height"] == 64
