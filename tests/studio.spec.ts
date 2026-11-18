import { test, expect } from "@playwright/test";

test("shell renders without errors and navigation is functional", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ruang kerja", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Proyek baru" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Import 3D Model" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Tentang studio" }).click();
  await expect(
    page.getByRole("heading", { name: "PES 2021 Face Studio" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ruang kerja" }).click();
  await expect(
    page.getByRole("heading", { name: "Ruang kerja", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("narrow layout stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ruang kerja", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
});
