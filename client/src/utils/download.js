import api from "../api/axios";

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

// GET requests that return a file need the auth header the axios instance already attaches,
// which a plain <a href> download link can't send. This fetches the file as a blob instead
// and triggers the save through a throwaway anchor element.
export async function downloadExport(path, filename, options = {}) {
  const response = await api.get(path, { responseType: "blob", ...options });
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: response.headers?.["content-type"] || "",
        });
  downloadBlob(blob, filename);
}
