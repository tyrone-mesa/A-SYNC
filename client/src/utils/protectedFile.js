import api from "../api/axios";

export async function openProtectedFile(path) {
  const preview = window.open("", "_blank");
  try {
    const response = await api.get(path, { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
    if (preview) {
      preview.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}
