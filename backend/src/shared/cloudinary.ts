import cloudinary from "cloudinary";

const getCloudinary = () => {
  const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_SECRET_KEY } = process.env;
  if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_SECRET_KEY) {
    throw new Error("Missing Cloudinary environment variables");
  }
  cloudinary.v2.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_SECRET_KEY,
  });
  return cloudinary.v2;
};

export const uploadImage = async (dataUri: string) => {
  if (!dataUri.startsWith("data:")) throw new Error("Invalid image data URI");
  const result = await getCloudinary().uploader.upload(dataUri, {
    resource_type: "image",
    folder: "quickdish",
  });
  return result.secure_url;
};
