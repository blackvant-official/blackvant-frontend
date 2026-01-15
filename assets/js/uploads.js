async function requestUpload({ purpose, file, depositId, ticketId }) {
  const token = await window.Clerk.session.getToken({ template: "backend" });

  const res = await fetch(`${window.API_BASE_URL}/api/v1/uploads/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      purpose: "SUPPORT_MESSAGE",
      mimeType: file.type,
      fileSize: file.size,
      originalName: file.name,
      depositId,
      ticketId,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { uploadUrl, storageKey }
}

async function confirmUpload(payload) {
  const token = await window.Clerk.session.getToken({ template: "backend" });

  const res = await fetch(`${window.API_BASE_URL}/api/v1/uploads/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { attachmentId }
}

async function putToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}
