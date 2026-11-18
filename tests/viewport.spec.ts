import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
const fixture = (name: string) => resolve("tests/fixtures", name);
async function importSample(page: Page, name = "calibration.glb") {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import 3D Model" }).click();
  await (await chooserPromise).setFiles(fixture(name));
  await expect(
    page.getByLabel("Informasi model").getByText(name, { exact: true }),
  ).toBeVisible();
  const expected = name === "calibration.glb" ? [2, 1, -1] : [200, 100, -50];
  await expect
    .poll(async () =>
      (await pose(page)).target.map((n) => Math.round(n * 1e6) / 1e6),
    )
    .toEqual(expected);
}
async function pose(page: Page) {
  const element = page.getByTestId("camera-pose");
  return {
    position: JSON.parse(
      (await element.getAttribute("data-position"))!,
    ) as number[],
    target: JSON.parse(
      (await element.getAttribute("data-target"))!,
    ) as number[],
    distance: Number(await element.getAttribute("data-distance")),
  };
}

test("real GLB import, camera presets, orbit/zoom/pan and rendered material modes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await importSample(page);
  await expect(page.getByTestId("model-bounds")).toHaveText(
    "2.000 / 3.000 / 1.500",
  );
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const initial = await pose(page);
  for (const [view, expected] of [
    ["Front", [0, 0, 1]],
    ["Left", [-1, 0, 0]],
    ["Right", [1, 0, 0]],
    ["Back", [0, 0, -1]],
  ] as const) {
    await page
      .getByRole("button", { name: `${view} View`, exact: true })
      .click();
    const current = await pose(page);
    current.position.forEach((value, i) =>
      expect((value - current.target[i]) / current.distance).toBeCloseTo(
        expected[i],
        5,
      ),
    );
    expect(current.target).toEqual([2, 1, -1]);
  }
  await page.getByRole("button", { name: "Reset Camera", exact: true }).click();
  expect((await pose(page)).position).toEqual(initial.position);
  const rect = (await canvas.boundingBox())!;
  const x = rect.x + rect.width * 0.6,
    y = rect.y + rect.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y + 35, { steps: 8 });
  await page.mouse.up();
  expect((await pose(page)).position).not.toEqual(initial.position);
  expect((await pose(page)).target).toEqual(initial.target);
  const beforeZoom = (await pose(page)).distance;
  await page.mouse.wheel(0, -220);
  await expect
    .poll(async () => (await pose(page)).distance)
    .toBeLessThan(beforeZoom);
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x + 40, y + 20, { steps: 6 });
  await page.mouse.up({ button: "right" });
  expect((await pose(page)).target).not.toEqual(initial.target);
  await page.getByRole("button", { name: "Reset Camera", exact: true }).click();
  expect((await pose(page)).position).toEqual(initial.position);
  const images: Buffer[] = [];
  for (const mode of ["Textured", "Solid", "Wireframe"]) {
    await page
      .getByRole("button", { name: `${mode} View`, exact: true })
      .click();
    await page.waitForTimeout(200); // Allow the demand-rendered frame to reach the compositor.
    images.push(
      await canvas.screenshot({
        path: `test-results/viewport-${mode.toLowerCase()}.png`,
      }),
    );
    expect((await pose(page)).position).toEqual(initial.position);
  }
  expect(images[0].equals(images[1])).toBe(false);
  expect(images[1].equals(images[2])).toBe(false);
  expect(images[0].equals(images[2])).toBe(false);
  await page.screenshot({
    path: "test-results/task02-workspace.png",
    fullPage: true,
  });
  await expect(page.getByTestId("model-bounds")).toHaveText(
    "2.000 / 3.000 / 1.500",
  );
  expect(errors).toEqual([]);
});

test("invalid imports preserve the current model; external resources never fetched; replacement reframes", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("example.invalid")) external.push(request.url());
  });
  await page.goto("/");
  await importSample(page);
  await page.getByLabel("File model GLB").setInputFiles({
    name: "broken.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByRole("alert")).toContainText("terpotong");
  await expect(page.getByLabel("Informasi model")).toContainText(
    "calibration.glb",
  );
  await page
    .getByLabel("File model GLB")
    .setInputFiles(fixture("external-resource.glb"));
  await expect(page.getByRole("alert")).toContainText(
    "referensi file/URL eksternal",
  );
  expect(external).toEqual([]);
  await page
    .getByLabel("File model GLB")
    .setInputFiles(fixture("broken-texture.glb"));
  await expect(page.getByRole("alert")).toContainText(
    "Tekstur atau resource GLB gagal dimuat",
  );
  await expect(page.getByLabel("Informasi model")).toContainText(
    "calibration.glb",
  );
  await importSample(page, "large-transformed.glb");
  await expect(page.getByTestId("model-bounds")).toHaveText(
    "20.000 / 60.000 / 40.000",
  );
  expect((await pose(page)).distance).toBeGreaterThan(100);
  await expect(page.getByRole("alert")).toHaveCount(0);
  // Same file may be selected again; input is reset after each selection.
  await importSample(page);
});

test("WebGL context loss has a recoverable error and retains imported model", async ({
  page,
}) => {
  await page.goto("/");
  await importSample(page);
  await page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension)
      throw new Error(
        "Context-loss extension unavailable for this verification",
      );
    extension.loseContext();
  });
  await expect(page.getByRole("alert")).toContainText("Koneksi WebGL terputus");
  await page.getByRole("button", { name: "Muat ulang viewport" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Informasi model")).toContainText(
    "calibration.glb",
  );
  await page.screenshot({ path: "test-results/viewport-recovered.png" });
});
