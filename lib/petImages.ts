import { supabase } from "@/lib/supabase";

const PET_IMAGE_BUCKET = "pet-images";
const BUCKET_PUBLIC_PATH_SEGMENT = `/storage/v1/object/public/${PET_IMAGE_BUCKET}/`;

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .flatMap((entry) => splitCsv(entry));
};

const extractBucketPath = (rawValue: string): string | null => {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    const segmentIndex = value.indexOf(BUCKET_PUBLIC_PATH_SEGMENT);
    if (segmentIndex === -1) {
      return null;
    }

    const encodedPath = value
      .slice(segmentIndex + BUCKET_PUBLIC_PATH_SEGMENT.length)
      .split("?")[0];

    return decodeURIComponent(encodedPath);
  }

  if (value.startsWith(`${PET_IMAGE_BUCKET}/`)) {
    return value.slice(PET_IMAGE_BUCKET.length + 1);
  }

  return value;
};

const toBucketPublicUrl = (path: string) => {
  const { data } = supabase.storage.from(PET_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const resolvePetImageUrl = (rawValue: string): string | null => {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const bucketPath = extractBucketPath(value);

  if (!bucketPath) {
    return /^https?:\/\//i.test(value) ? value : null;
  }

  return toBucketPublicUrl(bucketPath);
};

export const getPetImageUrls = (pet: any): string[] => {
  const directUrls =
    typeof pet?.image_url === "string" ? splitCsv(pet.image_url) : [];
  const legacyDirectUrls =
    typeof pet?.imageUrl === "string" ? splitCsv(pet.imageUrl) : [];
  const arrayUrls = asStringArray(pet?.image_urls);

  const uniqueUrls = new Set<string>();

  [...arrayUrls, ...directUrls, ...legacyDirectUrls].forEach((rawValue) => {
    const resolvedUrl = resolvePetImageUrl(rawValue);
    if (resolvedUrl) {
      uniqueUrls.add(resolvedUrl);
    }
  });

  return [...uniqueUrls];
};

export const getPrimaryPetImageUrl = (pet: any): string | null => {
  const [firstImage] = getPetImageUrls(pet);
  return firstImage ?? null;
};
