import { unlink } from "node:fs/promises";

const deleteImage = async (filePath: string) => {
  try {
    await unlink(filePath);
  } catch (error) {
    console.log(`Error deleting image, `, error);
  }
};

export { deleteImage };
