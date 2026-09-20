import { z } from "zod";
const PointSchema = z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) });
const RegionSchema = z.array(PointSchema).max(100);
export const FaceSchema = z.object({
  box: z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), width: z.number().finite().positive().max(1), height: z.number().finite().positive().max(1) }),
  points: z.object({ contour: RegionSchema.min(5), leftEye: RegionSchema.min(3), rightEye: RegionSchema.min(3), leftEyebrow: RegionSchema.min(2), rightEyebrow: RegionSchema.min(2), nose: RegionSchema.min(3), noseCrest: RegionSchema, lips: RegionSchema.min(3) }),
  roll: z.number().finite(), yaw: z.number().finite(),
});
export const FaceAnalysisSchema = z.object({ width: z.number().int().min(160).max(2048), height: z.number().int().min(160).max(2048), face: FaceSchema });
export const FaceReportSchema = z.object({ analysis: FaceAnalysisSchema, photo: z.string().max(8_000_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/).optional() });
export type FaceAnalysis = z.infer<typeof FaceAnalysisSchema>;
export type FacePoint = z.infer<typeof PointSchema>;
export const FACE_CULTURE = [
  { title: "五官：先認識位置", text: "傳統面相常以眉、眼、耳、鼻、口組織觀察。本功能標示可見的眉眼、鼻與嘴部；耳部常受角度或頭髮遮擋，因此不自動分析。位置標示不代表個性或吉凶判斷。" },
  { title: "三停：髮際線不能憑空補上", text: "傳統「三停」以髮際、眉、鼻底與下巴分區。這張照片只標示模型實際找到的五官與可見輪廓，不估測髮際線，也不把臉部框頂端當成額頭界線。" },
  { title: "看見比例，不替人下定論", text: "這裡的比例是照片平面上的幾何量，會隨角度、表情、鏡頭與遮擋改變。民俗術語作為文化閱讀，不用來推論性格、誠信、智力、健康或未來命運。" },
] as const;
function center(points: FacePoint[]) {
  return { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
}
export function faceMeasurements(analysis: FaceAnalysis) {
  const { width, height, face } = FaceAnalysisSchema.parse(analysis);
  const left = center(face.points.leftEye), right = center(face.points.rightEye);
  const faceWidth = face.box.width * width;
  const eyeDistance = Math.hypot((left.x - right.x) * width, (left.y - right.y) * height);
  const span = (points: FacePoint[]) => (Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) * width;
  return [
    { label: "可見臉部框高／寬", value: (face.box.height * height / faceWidth).toFixed(2), note: "臉部框不包含完整髮際與頭形，不作臉型或三停判定。" },
    { label: "兩眼中心距／臉框寬", value: `${(eyeDistance / faceWidth * 100).toFixed(1)}%`, note: "模型眼部輪廓的幾何中心，並非瞳距測量。" },
    { label: "鼻部可見寬／臉框寬", value: `${(span(face.points.nose) / faceWidth * 100).toFixed(1)}%`, note: "僅記錄這張照片中標示輪廓的寬度。" },
    { label: "嘴部可見寬／臉框寬", value: `${(span(face.points.lips) / faceWidth * 100).toFixed(1)}%`, note: "表情與張口會改變此數值，沒有優劣評分。" },
  ];
}
export function faceQuality(analysis: FaceAnalysis): string | null {
  const { face, width, height } = analysis;
  if (face.box.width * width < 160 || face.box.height * height < 160) return "臉部在照片中太小，請改用較近、清晰的正面照。";
  if (Math.abs(face.yaw) > 0.3 || Math.abs(face.roll) > 0.25) return "臉部角度偏斜，請正面平視鏡頭後重新選擇照片。";
  if (face.box.x < 0.01 || face.box.y < 0.01 || face.box.x + face.box.width > 0.99 || face.box.y + face.box.height > 0.99) return "臉部接近照片邊緣，請保留完整輪廓後重試。";
  return null;
}
