import { expect, test } from "@playwright/test";

test.describe("R0 workspace shell", () => {
  test("dashboard renders the local workspace", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("The board is the source of truth."),
    ).toBeVisible();
    await expect(page.getByText("No games imported yet")).toBeVisible();
  });

  test("primary navigation reaches real destinations", async ({ page }) => {
    await page.goto("/dashboard");
    const primary = page.locator('nav[aria-label="Primary"]');
    await primary.getByRole("link", { name: "Analysis" }).click();
    await expect(
      page.getByRole("heading", { name: "Analysis", level: 1 }),
    ).toBeVisible();

    await primary.getByRole("link", { name: "Studio" }).click();
    await expect(
      page.getByRole("heading", { name: "Studio", level: 1 }),
    ).toBeVisible();

    await primary.getByRole("link", { name: "Templates" }).click();
    await expect(
      page.getByRole("heading", { name: "Templates", level: 1 }),
    ).toBeVisible();
  });

  test("settings storage tab opens", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Storage" }).click();
    await expect(page.getByText("Storage controls")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Request persistent storage" }),
    ).toBeVisible();
  });

  test("PGN lab parses the standard fixture", async ({ page }) => {
    await page.goto("/labs/pgn");
    await page.getByRole("button", { name: "Parse PGN" }).click();
    await expect(page.getByText("Parsed result")).toBeVisible();
    await expect(page.getByText("White vs Black")).toBeVisible();
  });
});
