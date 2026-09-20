import { describe, it, expect } from "vitest";
import { FaceAnalysisSchema, faceMeasurements, faceQuality } from "../lib/face/schema";
import { makeFaceReport, analyzeFace } from "../desktop/face";
const points = [{ x: .35, y: .4 }, { x: .4, y: .4 }, { x: .45, y: .4 }, { x: .4, y: .45 }, { x: .35, y: .45 }];
const analysis = { width: 1000, height: 800, face: { box: { x: .2, y: .15, width: .6, height: .7 }, roll: 0, yaw: 0, points: { contour: points, leftEye: points, rightEye: points.map(p => ({ ...p, x: p.x + .2 })), leftEyebrow: points, rightEyebrow: points, nose: points, noseCrest: points, lips: points } } };
describe("offline face observation", () => {
  it("measures in image pixel space, including non-square aspect ratios", () => {
    expect(faceMeasurements(analysis)[0].value).toBe("0.93");
    expect(faceMeasurements(analysis)[1].value).toBe("33.3%");
    expect(faceQuality(analysis)).toBeNull();
  });
  it("rejects incomplete or non-finite geometry", () => {
    expect(() => FaceAnalysisSchema.parse({ ...analysis, width: Infinity })).toThrow();
    expect(() => FaceAnalysisSchema.parse({ ...analysis, face: { ...analysis.face, points: { ...analysis.face.points, leftEye: [] } } })).toThrow();
  });
  it("withholds observations for small, tilted, or clipped faces", () => {
    expect(faceQuality({ ...analysis, width: 200 })).toContain("太小");
    expect(faceQuality({ ...analysis, face: { ...analysis.face, yaw: .5 } })).toContain("偏斜");
    expect(faceQuality({ ...analysis, face: { ...analysis.face, box: { ...analysis.face.box, x: 0 } } })).toContain("邊緣");
  });
  it("exports no photo by default and strips arbitrary metadata", () => {
    const report = makeFaceReport({ analysis, name: "not retained", apiKey: "not retained" });
    expect(report).not.toHaveProperty("photo"); expect(report).not.toHaveProperty("name"); expect(report).not.toHaveProperty("apiKey");
    expect(report.culture).toHaveLength(3);
    const withPhoto = makeFaceReport({ analysis, photo: "data:image/jpeg;base64,/9j/" });
    expect(withPhoto.photo).toBeDefined();
    expect(() => makeFaceReport({ analysis, photo: "https://external.test/photo.jpg" })).toThrow();
  });
  it("rejects missing or oversized image bytes before launching a process", async () => {
    expect(await analyzeFace("unused", new Uint8Array())).toHaveProperty("error");
    expect(await analyzeFace("unused", new Uint8Array(15_000_001))).toHaveProperty("error");
    expect(await analyzeFace("unused", "/private/photo.jpg")).toHaveProperty("error");
  });
});
