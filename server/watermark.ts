import sharp from "sharp";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { File } from "@google-cloud/storage";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WatermarkService {
  private objectStorageService: ObjectStorageService;

  constructor() {
    this.objectStorageService = new ObjectStorageService();
  }

  async applyWatermark(
    imageObjectPath: string,
    userHasPremium: boolean
  ): Promise<string> {
    // If user has premium, return original image path without watermark
    if (userHasPremium) {
      return imageObjectPath;
    }

    try {
      // Get the original image file from object storage
      const originalFile = await this.objectStorageService.getObjectEntityFile(imageObjectPath);
      
      // Download the image data
      const [imageBuffer] = await originalFile.download();
      
      // Load the watermark logo
      const watermarkPath = path.join(__dirname, "../attached_assets/soundwave-logo.png");
      
      // Get image metadata to determine size
      const metadata = await sharp(imageBuffer).metadata();
      const imageWidth = metadata.width || 500;
      
      // Resize watermark to 20% of image width
      const watermarkSize = Math.floor(imageWidth * 0.2);
      const watermarkBuffer = await sharp(watermarkPath)
        .resize(watermarkSize, watermarkSize, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();
      
      // Create watermarked image with logo in bottom-right corner
      const watermarkedBuffer = await sharp(imageBuffer)
        .composite([
          {
            input: watermarkBuffer,
            gravity: "southeast",
            blend: "over"
          }
        ])
        .toBuffer();
      
      // Generate upload URL and path for watermarked image using ObjectStorageService
      const uploadURL = await this.objectStorageService.getObjectEntityUploadURL();
      
      // Extract bucket and object name from signed URL
      const signedUrl = new URL(uploadURL);
      const bucketName = signedUrl.pathname.split("/")[1];
      const objectName = signedUrl.pathname.split("/").slice(2).join("/");
      
      // Upload watermarked image to object storage
      const bucket = objectStorageClient.bucket(bucketName);
      const newFile = bucket.file(objectName);
      
      await newFile.save(watermarkedBuffer, {
        metadata: {
          contentType: metadata.format === "png" ? "image/png" : "image/jpeg",
        },
      });
      
      // Return the normalized object path
      const fullGcsPath = `/${bucketName}/${objectName}`;
      return this.objectStorageService.normalizeObjectEntityPath(`https://storage.googleapis.com${fullGcsPath}`);
    } catch (error) {
      console.error("Error applying watermark:", error);
      // If watermarking fails, return original image
      return imageObjectPath;
    }
  }
}
