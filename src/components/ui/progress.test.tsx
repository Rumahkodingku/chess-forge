import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./progress";

describe("Progress", () => {
  it("exposes the current value on the progressbar", () => {
    render(<Progress value={42} aria-label="Export progress" />);

    const bar = screen.getByRole("progressbar", { name: "Export progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });
});
