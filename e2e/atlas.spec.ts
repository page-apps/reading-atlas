import { expect, test } from "@playwright/test";

test("searches the public catalogue and follows an explained connection", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Find the next useful idea/ })).toBeVisible();
  await expect(page.locator("[data-records] .record-card")).toHaveCount(17);

  await page.locator("[data-search]").fill("feedback leverage");
  await expect(page.locator("[data-records] .record-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Open Thinking in Systems" }).click();
  await expect(page.locator("[data-detail]").getByRole("heading", { name: "Thinking in Systems", exact: true })).toBeVisible();
  await expect(page.locator("[data-detail]")).toContainText("deterministic, not AI recommendations");
  expect(errors).toEqual([]);
});

test("renders the relationship map and supports keyboard node navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The mobile project covers the bottom-sheet journey instead.");
  await page.goto("./?view=map");
  await expect(page.locator("[data-panel='map']")).toBeVisible();
  await expect(page.locator("[data-graph] .graph-node")).toHaveCount(17);
  await page.locator("[data-graph] [data-open-key='author:ursula-k-le-guin']").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-detail]").getByRole("heading", { name: "Ursula K. Le Guin" })).toBeVisible();
});

test("uses a mobile bottom sheet and exposes the install manifest", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "This journey is specific to a narrow viewport.");
  await page.goto("./");
  await page.getByRole("button", { name: "Open A Pattern Language" }).click();
  await expect(page.locator("[data-detail-rail]")).toHaveClass(/is-open/);
  await expect(page.locator("[data-detail]").getByRole("heading", { name: "A Pattern Language" })).toBeVisible();
  await page.locator("[data-detail-close]").click();
  await expect(page.locator("[data-detail-rail]")).not.toHaveClass(/is-open/);

  const manifest = await page.request.get("./manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  await expect(manifest.json()).resolves.toMatchObject({ name: "Reading Atlas", display: "standalone" });
});
