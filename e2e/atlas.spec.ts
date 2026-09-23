import { expect, test } from "@playwright/test";

test("searches the public catalogue and follows an explained connection", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Find the next useful idea/ })).toBeVisible();

  await page.locator("[data-search]").fill("The Let Them Theory");
  await page.getByRole("button", { name: "Open The Let Them Theory" }).click();
  const detail = page.locator("[data-detail]");
  await expect(detail.getByRole("heading", { name: "The Let Them Theory", exact: true })).toBeVisible();
  await expect(detail).toContainText("I want to read the book too.");

  const related = detail.locator(".related-list button").first();
  const relatedTitle = await related.locator("strong").innerText();
  await related.click();
  await expect(detail.getByRole("heading", { name: relatedTitle, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("renders the relationship map and supports keyboard node navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The mobile project covers the bottom-sheet journey instead.");
  await page.goto("./?view=map");
  await expect(page.locator("[data-panel='map']")).toBeVisible();
  const authorNode = page.locator("[data-graph] [data-open-key='author:mel-robbins']");
  await expect(authorNode).toBeVisible();
  await authorNode.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-detail]").getByRole("heading", { name: "Mel Robbins" })).toBeVisible();
});

test("uses a mobile bottom sheet and exposes the install manifest", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "This journey is specific to a narrow viewport.");
  await page.goto("./");
  await page.getByRole("button", { name: "Open The Let Them Theory" }).click();
  await expect(page.locator("[data-detail-rail]")).toHaveClass(/is-open/);
  await expect(page.locator("[data-detail]").getByRole("heading", { name: "The Let Them Theory" })).toBeVisible();
  await page.locator("[data-detail-close]").click();
  await expect(page.locator("[data-detail-rail]")).not.toHaveClass(/is-open/);

  const manifest = await page.request.get("./manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  await expect(manifest.json()).resolves.toMatchObject({ name: "Reading Atlas", display: "standalone" });
});
