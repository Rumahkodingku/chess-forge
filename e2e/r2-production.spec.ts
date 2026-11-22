import { expect, type Page, test } from "@playwright/test";

const PGN = `[Event "R2 production"]
[Site "local"]
[Date "2026.11.22"]
[White "Production White"]
[Black "Production Black"]
[Result "*"]

1. e4 d5 2. exd5 $1 {production comment} Qxd5 3. Nc3 *`;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.use({ viewport: { width: 390, height: 844 } });

test("R2 production import and replay works at 390 px", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(PGN);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);

  await expect(
    page.getByRole("heading", { name: "Production White vs Production Black" }),
  ).toBeVisible();
  await expect(page.locator("cg-board piece")).toHaveCount(32);
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press("End");
  await expect(page.getByRole("button", { name: /3\. Nc3/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(
    page.getByRole("img", { name: "Production White captured pawn" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Production Black captured pawn" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: /2\. exd5/ }).click();
  await expect(
    page.locator("dd").filter({ hasText: "production comment" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Flip board" }).click();
  await expect(page.locator(".cg-wrap")).toHaveClass(/orientation-black/);
  await expectNoHorizontalOverflow(page);

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Recent games" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Production White vs Production Black/ }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
