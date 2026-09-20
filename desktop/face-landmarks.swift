import Foundation
import Vision
import ImageIO

// One image through stdin; no file writes, network, identity, or demographic inference.
struct Point: Codable { let x: Double; let y: Double }
struct Box: Codable { let x: Double; let y: Double; let width: Double; let height: Double }
struct Face: Codable { let box: Box; let points: [String: [Point]]; let roll: Double; let yaw: Double }
struct Output: Codable { let faces: [Face]; let error: String?; var width: Int? = nil; var height: Int? = nil; var photo: String? = nil }
func emit(_ value: Output) {
    if let data = try? JSONEncoder().encode(value) { FileHandle.standardOutput.write(data) }
}
let data = FileHandle.standardInput.readDataToEndOfFile()
guard data.count > 0, data.count <= 15_000_000,
      let source = CGImageSourceCreateWithData(data as CFData, nil),
      let kind = CGImageSourceGetType(source) as String?, ["public.jpeg", "public.png"].contains(kind),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let width = properties[kCGImagePropertyPixelWidth] as? Int,
      let height = properties[kCGImagePropertyPixelHeight] as? Int,
      width >= 160, height >= 160, width <= 12000, height <= 12000, width * height <= 32_000_000,
      let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: 1600,
        kCGImageSourceShouldCacheImmediately: true
      ] as CFDictionary) else {
    emit(Output(faces: [], error: "照片格式或尺寸不支援。請選擇 15 MB、3200 萬像素以下的清晰 JPG／PNG（至少 160 × 160）。")); exit(0)
}
do {
    let request = VNDetectFaceLandmarksRequest()
    request.revision = VNDetectFaceLandmarksRequestRevision3
    request.constellation = .constellation76Points
    request.usesCPUOnly = true
    try VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])
    let observations = request.results ?? []
    if observations.count > 1 {
        emit(Output(faces: [], error: "照片中有多張臉，請改用只有一人的正面照片。")); exit(0)
    }
    let faces = observations.map { face -> Face in
        let b = face.boundingBox
        let regions: [String: VNFaceLandmarkRegion2D?] = [
            "contour": face.landmarks?.faceContour,
            "leftEye": face.landmarks?.leftEye, "rightEye": face.landmarks?.rightEye,
            "leftEyebrow": face.landmarks?.leftEyebrow, "rightEyebrow": face.landmarks?.rightEyebrow,
            "nose": face.landmarks?.nose, "noseCrest": face.landmarks?.noseCrest,
            "lips": face.landmarks?.outerLips
        ]
        var points: [String: [Point]] = [:]
        for (name, region) in regions {
            points[name] = region?.normalizedPoints.map { p in
                Point(x: Double(b.origin.x + CGFloat(p.x) * b.width),
                      y: Double(1 - (b.origin.y + CGFloat(p.y) * b.height)))
            } ?? []
        }
        return Face(box: Box(x: Double(b.origin.x), y: Double(1 - b.origin.y - b.height), width: Double(b.width), height: Double(b.height)),
                    points: points, roll: face.roll?.doubleValue ?? 0, yaw: face.yaw?.doubleValue ?? 0)
    }
    let preview = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(preview, "public.jpeg" as CFString, 1, nil) else { throw NSError(domain: "preview", code: 1) }
    CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary)
    guard CGImageDestinationFinalize(destination) else { throw NSError(domain: "preview", code: 2) }
    emit(Output(faces: faces, error: nil, width: image.width, height: image.height, photo: "data:image/jpeg;base64," + (preview as Data).base64EncodedString()))
} catch {
    emit(Output(faces: [], error: "本機臉部辨識未完成，請更換照片後重試。"))
}
