// Run only against this project's Tauri started with its own local CDP port.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const targets = [];
  for (const page of pages)
    if ((await page.title()) === "PES 2021 Face Studio") targets.push(page);
  if (targets.length !== 1)
    throw new Error("Expected exactly one Face Studio WebView2 target");
  const page = targets[0];
  await page.reload();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Ruang kerja", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("File model GLB")
    .setInputFiles(resolve("tests/fixtures/calibration.glb"));
  await expect(page.getByLabel("Informasi model")).toContainText(
    "calibration.glb",
  );
  await expect(page.getByTestId("model-bounds")).toHaveText(
    "2.000 / 3.000 / 1.500",
  );
  const canvas = page.locator("canvas");
  const gpu = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl2");
    if (!gl) throw new Error("No WebGL2 context");
    return {
      version: gl.getParameter(gl.VERSION),
      renderer: gl.getParameter(gl.RENDERER),
    };
  });
  const camera = () =>
    page.getByTestId("camera-pose").getAttribute("data-position");
  const initial = await camera();
  await page.getByRole("button", { name: "Left View", exact: true }).click();
  expect(await camera()).not.toBe(initial);
  await page.getByRole("button", { name: "Reset Camera", exact: true }).click();
  expect(await camera()).toBe(initial);
  const rect = await canvas.boundingBox();
  const x = rect.x + rect.width * 0.6,
    y = rect.y + rect.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y + 25, { steps: 6 });
  await page.mouse.up();
  expect(await camera()).not.toBe(initial);
  const before = Number(
    await page.getByTestId("camera-pose").getAttribute("data-distance"),
  );
  await page.mouse.wheel(0, -150);
  await expect
    .poll(async () =>
      Number(
        await page.getByTestId("camera-pose").getAttribute("data-distance"),
      ),
    )
    .toBeLessThan(before);
  await page.getByRole("button", { name: "Reset Camera", exact: true }).click();
  const screenshots = [];
  await mkdir("docs/images", { recursive: true });
  for (const mode of ["Solid", "Wireframe", "Textured"]) {
    await page
      .getByRole("button", { name: `${mode} View`, exact: true })
      .click();
    await page.waitForTimeout(250);
    screenshots.push(
      await canvas.screenshot({
        path: `docs/images/task02-native-${mode.toLowerCase()}.png`,
      }),
    );
  }
  expect(screenshots[0].equals(screenshots[1])).toBe(false);
  expect(screenshots[1].equals(screenshots[2])).toBe(false);
  expect(screenshots[0].equals(screenshots[2])).toBe(false);
  await page.screenshot({
    path: "docs/images/task02-native-workspace.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const report = {
    target: "Tauri WebView2",
    browser: browser.version(),
    url: page.url(),
    gpu,
    import: "passed: original textured GLB fixture",
    bounds: "2 / 3 / 1.5",
    cameraPresetReset: "passed",
    orbit: "passed",
    zoom: "passed",
    renderModes: "three different canvas captures",
    pageErrors: errors,
  };
  await writeFile(
    "docs/task-02-native.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
