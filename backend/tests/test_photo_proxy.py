"""Tests for Photo-Proxy, Thumbnail-Pipeline, and Media Management endpoints."""

import io
import os

import pytest
from httpx import AsyncClient

# Minimal 1x1 red JPEG bytes for testing
TINY_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.\' \",#\x1c\x1c(7),01444\x1f\'9=82<.342"
    b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
    b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
    b"\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04"
    b"\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"
    b"\x22q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16"
    b"\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz"
    b"\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99"
    b"\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7"
    b"\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5"
    b"\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1"
    b"\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa"
    b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00T\xdb\xce\xa8\xa0\x02\x80\x0f\xff\xd9"
)


@pytest.fixture
async def child_and_entry(async_client: AsyncClient):
    """Create a child + milestone category + milestone entry for testing."""
    # Create child
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": "Test Child", "birth_date": "2025-06-01"},
    )
    assert resp.status_code == 201
    child = resp.json()

    # Create category
    resp = await async_client.post(
        "/api/v1/milestone-categories/",
        json={"name": "Test Cat", "child_id": child["id"]},
    )
    assert resp.status_code == 201
    cat = resp.json()

    # Create milestone entry
    resp = await async_client.post(
        "/api/v1/milestones/",
        json={
            "child_id": child["id"],
            "title": "First Smile",
            "category_id": cat["id"],
        },
    )
    assert resp.status_code == 201
    entry = resp.json()

    return child, entry


@pytest.mark.asyncio
async def test_upload_photo_creates_thumbnail(async_client: AsyncClient, child_and_entry):
    """Upload should create both original and thumbnail file."""
    child, entry = child_and_entry

    # Create a proper image using PIL
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["mime_type"] == "image/jpeg"
    assert data["file_size"] > 0

    # Check that files exist on disk
    orig_path = os.path.join(os.getcwd(), "data", "uploads", data["file_path"])
    assert os.path.exists(orig_path)

    # Thumbnail path
    base = data["file_path"].rsplit(".", 1)[0]
    thumb_path = os.path.join(os.getcwd(), "data", "uploads", f"{base}_thumb.jpg")
    assert os.path.exists(thumb_path)

    # Cleanup
    os.remove(orig_path)
    os.remove(thumb_path)


@pytest.mark.asyncio
async def test_upload_photo_max_3(async_client: AsyncClient, child_and_entry):
    """Should reject 4th photo upload."""
    child, entry = child_and_entry

    from PIL import Image

    img = Image.new("RGB", (50, 50), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    uploaded_paths = []
    for i in range(3):
        resp = await async_client.post(
            f"/api/v1/milestones/{entry['id']}/photo",
            files={"file": (f"test{i}.jpg", jpeg_bytes, "image/jpeg")},
        )
        assert resp.status_code == 201
        uploaded_paths.append(resp.json()["file_path"])

    # 4th should fail
    resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("test4.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert resp.status_code == 400
    assert "Maximum 3" in resp.json()["detail"]

    # Cleanup
    for p in uploaded_paths:
        full = os.path.join(os.getcwd(), "data", "uploads", p)
        if os.path.exists(full):
            os.remove(full)
        base = p.rsplit(".", 1)[0]
        thumb = os.path.join(os.getcwd(), "data", "uploads", f"{base}_thumb.jpg")
        if os.path.exists(thumb):
            os.remove(thumb)


@pytest.mark.asyncio
async def test_photo_proxy_serves_file(async_client: AsyncClient, child_and_entry):
    """Auth-proxy endpoint should serve uploaded photo."""
    child, entry = child_and_entry

    from PIL import Image

    img = Image.new("RGB", (50, 50), color="green")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    upload_resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("photo.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload_resp.status_code == 201
    photo_data = upload_resp.json()

    # Extract child_id/filename from file_path (milestones/{child_id}/{filename})
    parts = photo_data["file_path"].split("/")
    proxy_path = f"{parts[1]}/{parts[2]}"

    # Serve original
    resp = await async_client.get(f"/api/v1/milestones/photos/{proxy_path}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"

    # Serve thumbnail
    resp_thumb = await async_client.get(f"/api/v1/milestones/photos/{proxy_path}?thumb=true")
    assert resp_thumb.status_code == 200

    # Cleanup
    orig = os.path.join(os.getcwd(), "data", "uploads", photo_data["file_path"])
    if os.path.exists(orig):
        os.remove(orig)
    base = photo_data["file_path"].rsplit(".", 1)[0]
    thumb = os.path.join(os.getcwd(), "data", "uploads", f"{base}_thumb.jpg")
    if os.path.exists(thumb):
        os.remove(thumb)


@pytest.mark.asyncio
async def test_media_list_and_storage(async_client: AsyncClient, child_and_entry):
    """Media endpoints should list photos and return storage info."""
    child, entry = child_and_entry

    from PIL import Image

    img = Image.new("RGB", (50, 50), color="yellow")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    upload_resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("media_test.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload_resp.status_code == 201

    # List media
    resp = await async_client.get(f"/api/v1/milestones/media/?child_id={child['id']}")
    assert resp.status_code == 200
    media = resp.json()
    assert len(media) >= 1
    assert media[0]["milestone_title"] == "First Smile"

    # Storage info
    resp = await async_client.get(f"/api/v1/milestones/media/storage?child_id={child['id']}")
    assert resp.status_code == 200
    storage = resp.json()
    assert storage["total_photos"] >= 1
    assert storage["total_size_bytes"] > 0

    # Cleanup
    path = upload_resp.json()["file_path"]
    orig = os.path.join(os.getcwd(), "data", "uploads", path)
    if os.path.exists(orig):
        os.remove(orig)
    base = path.rsplit(".", 1)[0]
    thumb = os.path.join(os.getcwd(), "data", "uploads", f"{base}_thumb.jpg")
    if os.path.exists(thumb):
        os.remove(thumb)


@pytest.mark.asyncio
async def test_replace_photo(async_client: AsyncClient, child_and_entry):
    """Replace endpoint should delete old files and save new ones."""
    child, entry = child_and_entry

    from PIL import Image

    img1 = Image.new("RGB", (50, 50), color="red")
    buf1 = io.BytesIO()
    img1.save(buf1, format="JPEG")

    # Upload original
    resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("old.jpg", buf1.getvalue(), "image/jpeg")},
    )
    assert resp.status_code == 201
    old_photo = resp.json()
    old_path = old_photo["file_path"]

    # Replace
    img2 = Image.new("RGB", (60, 60), color="blue")
    buf2 = io.BytesIO()
    img2.save(buf2, format="JPEG")

    resp = await async_client.patch(
        f"/api/v1/milestones/{entry['id']}/photos/{old_photo['id']}",
        files={"file": ("new.jpg", buf2.getvalue(), "image/jpeg")},
    )
    assert resp.status_code == 200
    new_photo = resp.json()
    assert new_photo["id"] == old_photo["id"]
    assert new_photo["file_path"] != old_path

    # Old files should be gone
    old_full = os.path.join(os.getcwd(), "data", "uploads", old_path)
    assert not os.path.exists(old_full)

    # New files should exist
    new_full = os.path.join(os.getcwd(), "data", "uploads", new_photo["file_path"])
    assert os.path.exists(new_full)

    # Cleanup
    if os.path.exists(new_full):
        os.remove(new_full)
    base = new_photo["file_path"].rsplit(".", 1)[0]
    thumb = os.path.join(os.getcwd(), "data", "uploads", f"{base}_thumb.jpg")
    if os.path.exists(thumb):
        os.remove(thumb)
