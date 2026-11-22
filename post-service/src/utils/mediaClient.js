// Uploads one file (from multer) to media-service and returns its mediaId.
async function uploadToMediaService(file, userId) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([file.buffer], { type: file.mimetype }),
    file.originalname,
  );

  const res = await fetch(
    `${process.env.MEDIA_SERVICE_URL}/api/media/upload`,
    { method: "POST", headers: { "x-user-id": userId }, body: form },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.mediaId) {
    const error = new Error(data.message || `Media upload failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data.mediaId.toString();
}

module.exports = { uploadToMediaService };
