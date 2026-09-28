import api from "../api/axios";

// GET requests that return a file need the auth header the axios instance already attaches,
// which a plain <a href> download link can't send. This fetches the file as a blob instead
// and triggers the save through a throwaway anchor element.
export async function downloadExport(path, filename, options = {}) {
  const response = await api.get(path, { responseType: "blob", ...options });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
