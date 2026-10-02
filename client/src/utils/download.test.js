import api from "../api/axios";
import { downloadExport } from "./download";

jest.mock("../api/axios", () => ({
  get: jest.fn(),
}));

describe("downloadExport", () => {
  let createObjectURL;
  let revokeObjectURL;
  let clickLink;

  beforeEach(() => {
    jest.useFakeTimers();
    createObjectURL = jest.fn(() => "blob:test-export");
    revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    clickLink = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    api.get.mockReset();
  });

  afterEach(() => {
    clickLink.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("downloads the response and keeps its object URL alive until cleanup", async () => {
    const file = new Blob(["report"], { type: "text/csv" });
    api.get.mockResolvedValue({ data: file });

    await downloadExport("/reports/export/csv", "report.csv");

    expect(api.get).toHaveBeenCalledWith("/reports/export/csv", {
      responseType: "blob",
    });
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(clickLink).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('a[download="report.csv"]'),
    ).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60000);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-export");
  });

  it("propagates failed export requests without creating a download", async () => {
    const error = new Error("Export failed");
    api.get.mockRejectedValue(error);

    await expect(
      downloadExport("/reports/export/csv", "report.csv"),
    ).rejects.toBe(error);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickLink).not.toHaveBeenCalled();
  });
});
