// WebP로 변환 (GIF 제외)
export const convertToWebP = async (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context is not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // 품질 설정 추가
      const webpDataUrl = canvas.toDataURL("image/webp", 1); // 품질 95%
      resolve(webpDataUrl);
    };

    img.onerror = (error: Event | string) => reject(error);
  });
};
