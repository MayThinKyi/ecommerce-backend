import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + "_" + file.originalname);
  },
});

function fileFilter(req: any, file: Express.Multer.File, cb: any) {
  const allowedTypes = ["png", "jpg", "jpeg", "webp", "svg"];
  const type = file.mimetype.split("/")[1];
  if (allowedTypes.includes(type)) {
    return cb(null, true);
  }

  cb(new Error("File format not support!"));
}

export const upload = multer({
  storage: storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB so image optimization needed ,
  },
});
